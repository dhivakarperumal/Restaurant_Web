const { randomUUID } = require('crypto');
const db = require('../config/db');

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
    await connection.execute(
      `INSERT INTO kitchen_orders (order_id, table_id, table_number, status, created_by)
       VALUES (?, ?, ?, 'Pending', ?)`,
      [orderId, table.table_id, table.table_number, userId]
    );

    for (const item of items) {
      const food = foodsById.get(item.food_id);
      await connection.execute(
        `INSERT INTO kitchen_order_items (order_id, food_id, food_name, quantity, unit_price)
         VALUES (?, ?, ?, ?, ?)`,
        [orderId, food.food_id, food.food_name, item.quantity, food.final_price]
      );
    }

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
      table_id: table.table_id,
      table_number: table.table_number,
      status: 'Pending',
      created_by: userId,
      created_at: new Date(),
      items: orderItems,
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
    `SELECT order_id, table_id, table_number, status, created_by, created_at, updated_at
     FROM kitchen_orders WHERE order_id = ? LIMIT 1`,
    [orderId]
  );
  return orders[0] || null;
}

async function listKitchenOrders(filters = {}) {
  let query = `SELECT order_id, table_id, table_number, status, created_by, created_at, updated_at
               FROM kitchen_orders`;
  const conditions = [];
  const params = [];

  if (filters.status) {
    conditions.push('status = ?');
    params.push(filters.status);
  }
  if (filters.table_id) {
    conditions.push('table_id = ?');
    params.push(filters.table_id);
  }
  if (conditions.length > 0) {
    query += ` WHERE ${conditions.join(' AND ')}`;
  }
  query += ` ORDER BY created_at DESC LIMIT 100`;

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
    items: itemsByOrder.get(order.order_id) || [],
  }));
}

module.exports = { createKitchenOrder, initializeKitchenOrderSchema, listKitchenOrders, updateKitchenOrderStatus };

