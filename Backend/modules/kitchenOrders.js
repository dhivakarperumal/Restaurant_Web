const { randomUUID } = require('crypto');
const db = require('../config/db');
const {
  findOrCreateActiveBill,
  initializeTableBillsSchema,
  recalculateBillTotals,
} = require('./tableBills');

async function initializeKitchenOrderSchema() {
  await db.query(`
    CREATE TABLE IF NOT EXISTS kitchen_orders (
      id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
      order_id VARCHAR(36) NOT NULL UNIQUE,
      table_id VARCHAR(255) NOT NULL,
      table_number VARCHAR(100) NOT NULL,
      status VARCHAR(30) NOT NULL DEFAULT 'Pending',
      created_by VARCHAR(255) NOT NULL,
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP NULL DEFAULT NULL ON UPDATE CURRENT_TIMESTAMP,
      INDEX kitchen_orders_status_idx (status),
      INDEX kitchen_orders_table_idx (table_id),
      INDEX kitchen_orders_created_idx (created_at)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);

  await db.query(`
    CREATE TABLE IF NOT EXISTS kitchen_order_items (
      id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
      order_id VARCHAR(36) NOT NULL,
      food_id VARCHAR(32) NOT NULL,
      food_name VARCHAR(180) NOT NULL,
      quantity SMALLINT UNSIGNED NOT NULL,
      unit_price DECIMAL(10,2) NOT NULL,
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      INDEX kitchen_order_items_order_idx (order_id),
      CONSTRAINT kitchen_order_items_order_fk FOREIGN KEY (order_id)
        REFERENCES kitchen_orders (order_id) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);

  await initializeTableBillsSchema();
}

async function createKitchenOrder({ tableId, userId, items }) {
  const connection = await db.getConnection();
  const orderId = randomUUID();

  try {
    await connection.beginTransaction();

    const [employeeRows] = await connection.execute(
      'SELECT employee_id FROM employees WHERE user_id = ? AND employee_type = ? LIMIT 1',
      [userId, 'Server']
    );
    const assignedIds = [userId, employeeRows[0]?.employee_id].filter(Boolean);
    const assignedPlaceholders = assignedIds.map(() => '?').join(', ');
    const [tableRows] = await connection.execute(
      `SELECT table_id, table_number FROM server_table
       WHERE table_id = ? AND assigned_server_id IN (${assignedPlaceholders})
       LIMIT 1 FOR UPDATE`,
      [tableId, ...assignedIds]
    );
    if (!tableRows.length) {
      const error = new Error('The selected table is not assigned to your server account.');
      error.statusCode = 403;
      throw error;
    }

    const foodIds = items.map((item) => item.food_id);
    const placeholders = foodIds.map(() => '?').join(', ');
    const [foodRows] = await connection.execute(
      `SELECT food_id, food_name, final_price, is_available, dining_available, status
       FROM foods WHERE food_id IN (${placeholders}) FOR UPDATE`,
      foodIds
    );
    const foodsById = new Map(foodRows.map((food) => [food.food_id, food]));
    if (foodRows.length !== foodIds.length) {
      const error = new Error('One or more selected menu items no longer exist.');
      error.statusCode = 400;
      throw error;
    }

    for (const item of items) {
      const food = foodsById.get(item.food_id);
      if (!food.is_available || !food.dining_available || String(food.status).toLowerCase() !== 'active') {
        const error = new Error(`${food.food_name} is no longer available for dine-in orders.`);
        error.statusCode = 409;
        throw error;
      }
    }

    const table = tableRows[0];

    // Resolve server name for billing
    let serverName = 'Server';
    const [employeeNameRows] = await connection.execute(
      'SELECT full_name FROM employees WHERE user_id = ? LIMIT 1',
      [userId]
    );
    if (employeeNameRows.length > 0 && employeeNameRows[0].full_name) {
      serverName = employeeNameRows[0].full_name;
    } else {
      const [userRows] = await connection.execute(
        'SELECT username FROM users WHERE user_id = ? LIMIT 1',
        [userId]
      );
      if (userRows.length > 0 && userRows[0].username) {
        serverName = userRows[0].username;
      }
    }

    // Find or create active table bill (consolidates multiple rounds for this table session)
    const activeBill = await findOrCreateActiveBill(connection, {
      tableId: table.table_id,
      tableNumber: table.table_number,
      serverId: userId,
      serverName,
    });

    // Determine round number for this bill
    const [existingOrders] = await connection.execute(
      `SELECT COUNT(*) AS count FROM kitchen_orders WHERE bill_id = ?`,
      [activeBill.bill_id]
    );
    const roundNumber = Number(existingOrders[0]?.count || 0) + 1;

    await connection.execute(
      `INSERT INTO kitchen_orders (order_id, bill_id, round_number, table_id, table_number, status, created_by)
       VALUES (?, ?, ?, ?, ?, 'Pending', ?)`,
      [orderId, activeBill.bill_id, roundNumber, table.table_id, table.table_number, userId]
    );

    for (const item of items) {
      const food = foodsById.get(item.food_id);
      await connection.execute(
        `INSERT INTO kitchen_order_items (order_id, food_id, food_name, quantity, unit_price)
         VALUES (?, ?, ?, ?, ?)`,
        [orderId, food.food_id, food.food_name, item.quantity, food.final_price]
      );
    }

    // Ensure table status is set to Occupied
    await connection.execute(
      `UPDATE server_table SET status = 'Occupied' WHERE table_id = ? AND status = 'Available'`,
      [table.table_id]
    );

    // Recalculate bill totals
    const billTotals = await recalculateBillTotals(connection, activeBill.bill_id);

    await connection.commit();
    const orderItems = items.map((item) => {
      const food = foodsById.get(item.food_id);
      return {
        food_id: food.food_id,
        food_name: food.food_name,
        quantity: item.quantity,
        unit_price: Number(food.final_price),
      };
    });
    return {
      order_id: orderId,
      bill_id: activeBill.bill_id,
      bill_number: activeBill.bill_number,
      round_number: roundNumber,
      table_id: table.table_id,
      table_number: table.table_number,
      status: 'Pending',
      created_by: userId,
      created_at: new Date(),
      items: orderItems,
      bill: {
        bill_id: activeBill.bill_id,
        bill_number: activeBill.bill_number,
        round_number: roundNumber,
        ...billTotals,
      },
    };
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}

async function updateKitchenOrderStatus({ orderId, status }) {
  const [result] = await db.execute(
    `UPDATE kitchen_orders SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE order_id = ?`,
    [status, orderId]
  );
  if (result.affectedRows === 0) return null;

  const [orders] = await db.execute(
    `SELECT order_id, bill_id, round_number, table_id, table_number, status, created_by, created_at, updated_at
     FROM kitchen_orders WHERE order_id = ? LIMIT 1`,
    [orderId]
  );
  return orders[0] || null;
}

async function listKitchenOrders(filters = {}) {
  let query = `SELECT ko.order_id, ko.bill_id, ko.round_number, ko.table_id, ko.table_number,
                      ko.status, ko.created_by, ko.created_at, ko.updated_at,
                      tb.bill_number, tb.status AS bill_status
               FROM kitchen_orders ko
               LEFT JOIN table_bills tb ON ko.bill_id = tb.bill_id`;
  const conditions = [];
  const params = [];

  if (filters.status) {
    conditions.push('ko.status = ?');
    params.push(filters.status);
  }
  if (filters.table_id) {
    conditions.push('ko.table_id = ?');
    params.push(filters.table_id);
  }
  if (conditions.length > 0) {
    query += ` WHERE ${conditions.join(' AND ')}`;
  }
  query += ` ORDER BY ko.created_at DESC LIMIT 100`;

  const [orders] = await db.execute(query, params);
  if (!orders.length) return [];

  const orderIds = orders.map((order) => order.order_id);
  const placeholders = orderIds.map(() => '?').join(', ');
  const [items] = await db.execute(
    `SELECT order_id, food_id, food_name, quantity, unit_price
     FROM kitchen_order_items WHERE order_id IN (${placeholders}) ORDER BY id`,
    orderIds
  );
  const itemsByOrder = new Map();
  for (const item of items) {
    const orderItems = itemsByOrder.get(item.order_id) || [];
    orderItems.push({
      food_id: item.food_id,
      food_name: item.food_name,
      quantity: Number(item.quantity),
      unit_price: Number(item.unit_price),
    });
    itemsByOrder.set(item.order_id, orderItems);
  }

  return orders.map((order) => ({
    ...order,
    round_number: order.round_number || 1,
    items: itemsByOrder.get(order.order_id) || [],
  }));
}

module.exports = { createKitchenOrder, initializeKitchenOrderSchema, listKitchenOrders, updateKitchenOrderStatus };

