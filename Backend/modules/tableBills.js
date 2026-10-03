const { randomUUID } = require('crypto');
const db = require('../config/db');

async function initializeTableBillsSchema() {
  await db.query(`
    CREATE TABLE IF NOT EXISTS table_bills (
      id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
      bill_id VARCHAR(36) NOT NULL UNIQUE,
      bill_number VARCHAR(50) NOT NULL UNIQUE,
      table_id VARCHAR(255) NOT NULL,
      table_number VARCHAR(100) NOT NULL,
      server_id VARCHAR(255) NOT NULL,
      server_name VARCHAR(150),
      status VARCHAR(30) NOT NULL DEFAULT 'Active',
      subtotal DECIMAL(10,2) NOT NULL DEFAULT 0.00,
      tax_rate DECIMAL(5,2) NOT NULL DEFAULT 5.00,
      tax_amount DECIMAL(10,2) NOT NULL DEFAULT 0.00,
      discount DECIMAL(10,2) NOT NULL DEFAULT 0.00,
      grand_total DECIMAL(10,2) NOT NULL DEFAULT 0.00,
      payment_method VARCHAR(50) DEFAULT NULL,
      settled_at TIMESTAMP NULL DEFAULT NULL,
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP NULL DEFAULT NULL ON UPDATE CURRENT_TIMESTAMP,
      INDEX table_bills_status_idx (status),
      INDEX table_bills_table_idx (table_id),
      INDEX table_bills_created_idx (created_at)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);

  // Ensure bill_id and round_number exist on kitchen_orders
  try {
    const [cols] = await db.query(`SHOW COLUMNS FROM kitchen_orders LIKE 'bill_id'`);
    if (!cols.length) {
      await db.query(`ALTER TABLE kitchen_orders ADD COLUMN bill_id VARCHAR(36) NULL, ADD INDEX kitchen_orders_bill_idx (bill_id)`);
    }
  } catch (err) {
    console.error('Error verifying bill_id column in kitchen_orders:', err.message);
  }

  try {
    const [cols] = await db.query(`SHOW COLUMNS FROM kitchen_orders LIKE 'round_number'`);
    if (!cols.length) {
      await db.query(`ALTER TABLE kitchen_orders ADD COLUMN round_number INT NOT NULL DEFAULT 1`);
    }
  } catch (err) {
    console.error('Error verifying round_number column in kitchen_orders:', err.message);
  }
}

/**
 * Generates the next sequential bill number for today: e.g. BILL-20261003-001
 */
async function generateNextBillNumber(connection = db) {
  const today = new Date();
  const yyyy = today.getFullYear();
  const mm = String(today.getMonth() + 1).padStart(2, '0');
  const dd = String(today.getDate()).padStart(2, '0');
  const prefix = `BILL-${yyyy}${mm}${dd}-`;

  const [lastBill] = await connection.execute(
    `SELECT bill_number FROM table_bills WHERE bill_number LIKE ? ORDER BY id DESC LIMIT 1`,
    [`${prefix}%`]
  );

  let nextSeq = 1;
  if (lastBill.length > 0 && lastBill[0].bill_number) {
    const parts = lastBill[0].bill_number.split('-');
    const lastSeq = parseInt(parts[parts.length - 1], 10);
    if (!isNaN(lastSeq)) nextSeq = lastSeq + 1;
  }

  return `${prefix}${String(nextSeq).padStart(3, '0')}`;
}

/**
 * Finds the currently active bill for a table or creates a new one.
 */
async function findOrCreateActiveBill(connection, { tableId, tableNumber, serverId, serverName }) {
  const [existingBills] = await connection.execute(
    `SELECT * FROM table_bills WHERE table_id = ? AND status = 'Active' ORDER BY id DESC LIMIT 1 FOR UPDATE`,
    [tableId]
  );

  if (existingBills.length > 0) {
    return existingBills[0];
  }

  const billId = randomUUID();
  const billNumber = await generateNextBillNumber(connection);

  await connection.execute(
    `INSERT INTO table_bills (bill_id, bill_number, table_id, table_number, server_id, server_name, status)
     VALUES (?, ?, ?, ?, ?, ?, 'Active')`,
    [billId, billNumber, tableId, tableNumber, serverId, serverName || 'Server']
  );

  const [newBillRows] = await connection.execute(
    `SELECT * FROM table_bills WHERE bill_id = ? LIMIT 1`,
    [billId]
  );

  return newBillRows[0];
}

/**
 * Recalculates subtotal, tax (5%), and grand total for a bill based on all kitchen orders under it.
 */
async function recalculateBillTotals(connection, billId) {
  const [sumRows] = await connection.execute(
    `SELECT COALESCE(SUM(koi.quantity * koi.unit_price), 0) AS subtotal
     FROM kitchen_orders ko
     JOIN kitchen_order_items koi ON ko.order_id = koi.order_id
     WHERE ko.bill_id = ? AND ko.status != 'Cancelled'`,
    [billId]
  );

  const subtotal = Number(sumRows[0]?.subtotal || 0);
  const taxRate = 5.00; // 5% standard restaurant GST (2.5% CGST + 2.5% SGST)
  const taxAmount = Number((subtotal * 0.05).toFixed(2));

  const [billRows] = await connection.execute(
    `SELECT discount FROM table_bills WHERE bill_id = ? LIMIT 1`,
    [billId]
  );
  const discount = Number(billRows[0]?.discount || 0);
  const grandTotal = Math.max(0, Number((subtotal + taxAmount - discount).toFixed(2)));

  await connection.execute(
    `UPDATE table_bills
     SET subtotal = ?, tax_rate = ?, tax_amount = ?, grand_total = ?
     WHERE bill_id = ?`,
    [subtotal, taxRate, taxAmount, grandTotal, billId]
  );

  return { subtotal, taxRate, taxAmount, discount, grandTotal };
}

/**
 * Retrieves the full bill details including all rounds (kitchen orders) and items.
 */
async function getTableBillDetails(billId) {
  const [bills] = await db.execute(
    `SELECT * FROM table_bills WHERE bill_id = ? LIMIT 1`,
    [billId]
  );
  if (!bills.length) return null;

  const bill = bills[0];

  // Fetch all kitchen orders for this bill
  const [kitchenOrders] = await db.execute(
    `SELECT order_id, bill_id, round_number, table_id, table_number, status, created_by, created_at, updated_at
     FROM kitchen_orders
     WHERE bill_id = ?
     ORDER BY round_number ASC, created_at ASC`,
    [billId]
  );

  if (!kitchenOrders.length) {
    return {
      ...bill,
      rounds: [],
      items: [],
      total_items_count: 0,
    };
  }

  const orderIds = kitchenOrders.map((o) => o.order_id);
  const placeholders = orderIds.map(() => '?').join(', ');
  const [items] = await db.execute(
    `SELECT koi.id, koi.order_id, koi.food_id, koi.food_name, koi.quantity, koi.unit_price, koi.created_at,
            f.food_type, f.food_images
     FROM kitchen_order_items koi
     LEFT JOIN foods f ON koi.food_id = f.food_id
     WHERE koi.order_id IN (${placeholders})
     ORDER BY koi.id ASC`,
    orderIds
  );

  const itemsByOrder = new Map();
  const consolidatedMap = new Map();
  let totalItemsCount = 0;

  for (const item of items) {
    const list = itemsByOrder.get(item.order_id) || [];
    const itemData = {
      id: item.id,
      food_id: item.food_id,
      food_name: item.food_name,
      quantity: Number(item.quantity),
      unit_price: Number(item.unit_price),
      total_price: Number((Number(item.quantity) * Number(item.unit_price)).toFixed(2)),
      food_type: item.food_type || 'Veg',
      created_at: item.created_at,
    };
    list.push(itemData);
    itemsByOrder.set(item.order_id, list);

    totalItemsCount += Number(item.quantity);

    // Consolidate for a unified invoice view
    if (consolidatedMap.has(item.food_id)) {
      const existing = consolidatedMap.get(item.food_id);
      existing.quantity += Number(item.quantity);
      existing.total_price = Number((existing.quantity * existing.unit_price).toFixed(2));
    } else {
      consolidatedMap.set(item.food_id, { ...itemData });
    }
  }

  const rounds = kitchenOrders.map((order) => ({
    order_id: order.order_id,
    round_number: order.round_number || 1,
    status: order.status,
    created_at: order.created_at,
    updated_at: order.updated_at,
    items: itemsByOrder.get(order.order_id) || [],
  }));

  return {
    ...bill,
    subtotal: Number(bill.subtotal || 0),
    tax_rate: Number(bill.tax_rate || 5.0),
    tax_amount: Number(bill.tax_amount || 0),
    discount: Number(bill.discount || 0),
    grand_total: Number(bill.grand_total || 0),
    total_items_count: totalItemsCount,
    rounds,
    consolidated_items: Array.from(consolidatedMap.values()),
  };
}

/**
 * Gets the active bill for a table (if any) with full details.
 */
async function getActiveBillForTable(tableId) {
  const [bills] = await db.execute(
    `SELECT bill_id FROM table_bills WHERE table_id = ? AND status = 'Active' ORDER BY id DESC LIMIT 1`,
    [tableId]
  );
  if (!bills.length) return null;
  return getTableBillDetails(bills[0].bill_id);
}

/**
 * Settles a bill (Marks as Paid), frees up the table to Available.
 */
async function settleTableBill({ billId, paymentMethod = 'Cash', discount = 0 }) {
  const connection = await db.getConnection();
  try {
    await connection.beginTransaction();

    const [bills] = await connection.execute(
      `SELECT * FROM table_bills WHERE bill_id = ? LIMIT 1 FOR UPDATE`,
      [billId]
    );

    if (!bills.length) {
      const err = new Error('Bill not found.');
      err.statusCode = 404;
      throw err;
    }

    const bill = bills[0];
    if (bill.status === 'Paid') {
      const err = new Error('This bill has already been settled and paid.');
      err.statusCode = 400;
      throw err;
    }

    const subtotal = Number(bill.subtotal || 0);
    const taxRate = Number(bill.tax_rate || 5.0);
    const taxAmount = Number(bill.tax_amount || 0);
    const finalDiscount = Math.max(0, Math.min(subtotal, Number(discount) || 0));
    const grandTotal = Math.max(0, Number((subtotal + taxAmount - finalDiscount).toFixed(2)));

    // Mark bill as Paid
    await connection.execute(
      `UPDATE table_bills
       SET status = 'Paid',
           payment_method = ?,
           discount = ?,
           grand_total = ?,
           settled_at = CURRENT_TIMESTAMP
       WHERE bill_id = ?`,
      [paymentMethod, finalDiscount, grandTotal, billId]
    );

    // Free up table back to 'Available'
    await connection.execute(
      `UPDATE server_table SET status = 'Available' WHERE table_id = ?`,
      [bill.table_id]
    );

    // Any remaining active kitchen orders for this bill marked Served
    await connection.execute(
      `UPDATE kitchen_orders
       SET status = 'Served', updated_at = CURRENT_TIMESTAMP
       WHERE bill_id = ? AND status IN ('Pending', 'Preparing', 'Ready to Serve')`,
      [billId]
    );

    await connection.commit();

    return getTableBillDetails(billId);
  } catch (err) {
    await connection.rollback();
    throw err;
  } finally {
    connection.release();
  }
}

/**
 * List all bills (history / admin / pos).
 */
async function listTableBills(filters = {}) {
  let query = `SELECT * FROM table_bills`;
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

  if (conditions.length) {
    query += ` WHERE ${conditions.join(' AND ')}`;
  }
  query += ` ORDER BY created_at DESC LIMIT 100`;

  const [rows] = await db.execute(query, params);
  return rows.map((r) => ({
    ...r,
    subtotal: Number(r.subtotal || 0),
    tax_rate: Number(r.tax_rate || 5.0),
    tax_amount: Number(r.tax_amount || 0),
    discount: Number(r.discount || 0),
    grand_total: Number(r.grand_total || 0),
  }));
}

module.exports = {
  findOrCreateActiveBill,
  generateNextBillNumber,
  getActiveBillForTable,
  getTableBillDetails,
  initializeTableBillsSchema,
  listTableBills,
  recalculateBillTotals,
  settleTableBill,
};
