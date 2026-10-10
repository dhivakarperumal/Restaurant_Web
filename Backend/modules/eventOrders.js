const db = require('../config/db');

const initializeEventOrderSchema = async () => {
  await db.query(`
    CREATE TABLE IF NOT EXISTS event_orders (
      id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
      event_order_number VARCHAR(36) NOT NULL UNIQUE,
      user_id VARCHAR(255) NULL,
      customer_name VARCHAR(150) NOT NULL,
      customer_email VARCHAR(255) NULL,
      customer_phone VARCHAR(32) NOT NULL,
      event_type VARCHAR(100) NOT NULL,
      event_date DATE NOT NULL,
      event_time VARCHAR(30) NOT NULL,
      guest_count INT UNSIGNED NOT NULL,
      venue_address TEXT NOT NULL,
      dietary_preference VARCHAR(50) NOT NULL DEFAULT 'Mixed',
      total_estimated_amount DECIMAL(10,2) NOT NULL DEFAULT 0.00,
      advance_amount DECIMAL(10,2) NOT NULL DEFAULT 0.00,
      payment_status VARCHAR(30) NOT NULL DEFAULT 'pending',
      payment_method VARCHAR(30) NOT NULL DEFAULT 'cod',
      status VARCHAR(30) NOT NULL DEFAULT 'Pending',
      special_requests TEXT NULL,
      admin_notes TEXT NULL,
      created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      INDEX event_orders_user_created_idx (user_id, created_at),
      INDEX event_orders_status_date_idx (status, event_date)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);

  await db.query(`
    CREATE TABLE IF NOT EXISTS event_order_items (
      id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
      event_order_id BIGINT UNSIGNED NOT NULL,
      food_id VARCHAR(32) NOT NULL,
      product_name VARCHAR(180) NOT NULL,
      product_image TEXT NULL,
      category_name VARCHAR(150) NULL,
      portion_size VARCHAR(50) NOT NULL DEFAULT 'Standard',
      unit_price DECIMAL(10,2) NOT NULL DEFAULT 0.00,
      quantity INT UNSIGNED NOT NULL DEFAULT 1,
      total_price DECIMAL(10,2) NOT NULL DEFAULT 0.00,
      notes VARCHAR(255) NULL,
      created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      INDEX event_order_items_order_id_idx (event_order_id),
      CONSTRAINT event_order_items_order_id_fk FOREIGN KEY (event_order_id)
        REFERENCES event_orders (id) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);

  const ensureColumn = async (table, col, def) => {
    const [rows] = await db.execute(
      `SELECT COLUMN_NAME FROM information_schema.COLUMNS
       WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ? AND COLUMN_NAME = ?`,
      [table, col]
    );
    if (!rows.length) {
      await db.query(`ALTER TABLE \`${table}\` ADD COLUMN \`${col}\` ${def}`);
    }
  };

  await ensureColumn('event_orders', 'discount_type', "VARCHAR(20) DEFAULT 'fixed'");
  await ensureColumn('event_orders', 'discount_value', "DECIMAL(10,2) DEFAULT 0.00");
  await ensureColumn('event_orders', 'discount_amount', "DECIMAL(10,2) DEFAULT 0.00");
  await ensureColumn('event_orders', 'delivery_fee', "DECIMAL(10,2) DEFAULT 0.00");
  await ensureColumn('event_orders', 'quoted_amount', "DECIMAL(10,2) DEFAULT 0.00");
  await ensureColumn('event_orders', 'customer_action', "VARCHAR(30) NULL");
  await ensureColumn('event_orders', 'customer_action_reason', "TEXT NULL");

  await ensureColumn('event_order_items', 'discounted_unit_price', "DECIMAL(10,2) NULL");
  await ensureColumn('event_order_items', 'discount_amount', "DECIMAL(10,2) DEFAULT 0.00");
};

const generateEventOrderNumber = async (connection) => {
  const [rows] = await connection.query(
    "SELECT MAX(id) AS max_id FROM event_orders"
  );
  const nextId = (rows[0]?.max_id || 0) + 1;
  return `EVT-${String(nextId).padStart(4, '0')}`;
};

const createEventOrder = async ({
  userId,
  customerName,
  customerEmail,
  customerPhone,
  eventType,
  eventDate,
  eventTime,
  guestCount,
  venueAddress,
  dietaryPreference = 'Mixed',
  totalEstimatedAmount = 0,
  advanceAmount = 0,
  paymentMethod = 'cod',
  specialRequests = '',
  items = [],
}) => {
  const connection = await db.getConnection();
  try {
    await connection.beginTransaction();

    const orderNumber = await generateEventOrderNumber(connection);

    const [result] = await connection.execute(
      `INSERT INTO event_orders (
        event_order_number, user_id, customer_name, customer_email, customer_phone,
        event_type, event_date, event_time, guest_count, venue_address,
        dietary_preference, total_estimated_amount, advance_amount, payment_method,
        payment_status, status, special_requests
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending', 'Pending', ?)`,
      [
        orderNumber,
        userId || null,
        customerName,
        customerEmail || null,
        customerPhone,
        eventType,
        eventDate,
        eventTime,
        Number(guestCount) || 1,
        venueAddress,
        dietaryPreference,
        Number(totalEstimatedAmount) || 0,
        Number(advanceAmount) || 0,
        paymentMethod,
        specialRequests || null,
      ]
    );

    const eventOrderId = result.insertId;

    if (Array.isArray(items) && items.length > 0) {
      for (const item of items) {
        await connection.execute(
          `INSERT INTO event_order_items (
            event_order_id, food_id, product_name, product_image, category_name,
            portion_size, unit_price, quantity, total_price, notes
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            eventOrderId,
            String(item.food_id || item.foodId || ''),
            String(item.product_name || item.food_name || item.name || 'Food Item'),
            item.product_image || item.image || null,
            item.category_name || item.category || null,
            item.portion_size || 'Standard',
            Number(item.unit_price || item.price || 0),
            Number(item.quantity) || 1,
            Number(item.total_price || (Number(item.unit_price || item.price || 0) * (Number(item.quantity) || 1))),
            item.notes || null,
          ]
        );
      }
    }

    await connection.commit();

    return {
      id: eventOrderId,
      eventOrderNumber: orderNumber,
    };
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
};

const listEventOrders = async ({
  userId = null,
  status = null,
  search = null,
  limit = 100,
  offset = 0,
} = {}) => {
  const conditions = [];
  const params = [];

  if (userId) {
    conditions.push('eo.user_id = ?');
    params.push(userId);
  }

  if (status && status !== 'All') {
    conditions.push('eo.status = ?');
    params.push(status);
  }

  if (search && search.trim()) {
    conditions.push(
      '(eo.event_order_number LIKE ? OR eo.customer_name LIKE ? OR eo.customer_phone LIKE ? OR eo.event_type LIKE ?)'
    );
    const searchTerm = `%${search.trim()}%`;
    params.push(searchTerm, searchTerm, searchTerm, searchTerm);
  }

  const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

  const [orders] = await db.query(
    `SELECT eo.*,
      COUNT(eoi.id) AS total_items,
      SUM(eoi.quantity) AS total_quantity
     FROM event_orders eo
     LEFT JOIN event_order_items eoi ON eo.id = eoi.event_order_id
     ${whereClause}
     GROUP BY eo.id
     ORDER BY eo.created_at DESC
     LIMIT ? OFFSET ?`,
    [...params, Number(limit) || 100, Number(offset) || 0]
  );

  if (!orders.length) return [];

  const orderIds = orders.map((o) => o.id);
  const [items] = await db.query(
    `SELECT * FROM event_order_items WHERE event_order_id IN (${orderIds.map(() => '?').join(', ')}) ORDER BY id ASC`,
    orderIds
  );

  const itemsByOrderId = new Map();
  for (const item of items) {
    if (!itemsByOrderId.has(item.event_order_id)) {
      itemsByOrderId.set(item.event_order_id, []);
    }
    itemsByOrderId.get(item.event_order_id).push(item);
  }

  return orders.map((order) => ({
    ...order,
    items: itemsByOrderId.get(order.id) || [],
  }));
};

const getEventOrderById = async (id) => {
  const [orderRows] = await db.execute(
    'SELECT * FROM event_orders WHERE id = ? OR event_order_number = ? LIMIT 1',
    [id, id]
  );

  if (!orderRows.length) return null;
  const order = orderRows[0];

  const [items] = await db.execute(
    'SELECT * FROM event_order_items WHERE event_order_id = ? ORDER BY id ASC',
    [order.id]
  );

  return {
    ...order,
    items,
  };
};

const updateEventOrderStatus = async (id, status, adminNotes = null) => {
  const params = [status];
  let query = 'UPDATE event_orders SET status = ?';
  if (adminNotes !== null && adminNotes !== undefined) {
    query += ', admin_notes = ?';
    params.push(adminNotes);
  }
  query += ' WHERE id = ? OR event_order_number = ?';
  params.push(id, id);

  const [result] = await db.execute(query, params);
  return result.affectedRows > 0;
};

const updateEventOrderDetails = async (id, fields = {}) => {
  const allowed = [
    'customer_name', 'customer_phone', 'customer_email', 'event_type',
    'event_date', 'event_time', 'guest_count', 'venue_address',
    'dietary_preference', 'total_estimated_amount', 'advance_amount',
    'payment_status', 'payment_method', 'status', 'special_requests', 'admin_notes'
  ];

  const updates = [];
  const params = [];

  for (const [key, value] of Object.entries(fields)) {
    if (allowed.includes(key) && value !== undefined) {
      updates.push(`${key} = ?`);
      params.push(value);
    }
  }

  if (!updates.length) return false;

  params.push(id, id);
  const [result] = await db.execute(
    `UPDATE event_orders SET ${updates.join(', ')} WHERE id = ? OR event_order_number = ?`,
    params
  );

  return result.affectedRows > 0;
};

const deleteEventOrder = async (id) => {
  const [result] = await db.execute(
    'DELETE FROM event_orders WHERE id = ? OR event_order_number = ?',
    [id, id]
  );
  return result.affectedRows > 0;
};

const sendEventOrderQuotation = async (id, {
  discountType = 'fixed',
  discountValue = 0,
  discountAmount = 0,
  deliveryFee = 0,
  quotedAmount = 0,
  adminNotes = '',
  itemDiscounts = [],
}) => {
  const connection = await db.getConnection();
  try {
    await connection.beginTransaction();

    const [orders] = await connection.execute(
      'SELECT id, event_order_number, user_id FROM event_orders WHERE id = ? OR event_order_number = ? LIMIT 1 FOR UPDATE',
      [id, id]
    );
    if (!orders.length) {
      const err = new Error('Event order not found');
      err.statusCode = 404;
      throw err;
    }
    const orderId = orders[0].id;

    if (Array.isArray(itemDiscounts) && itemDiscounts.length > 0) {
      for (const it of itemDiscounts) {
        if (it.id) {
          await connection.execute(
            `UPDATE event_order_items
             SET discounted_unit_price = ?, discount_amount = ?
             WHERE id = ? AND event_order_id = ?`,
            [
              it.discounted_unit_price !== undefined && it.discounted_unit_price !== null ? Number(it.discounted_unit_price) : null,
              Number(it.discount_amount || 0),
              it.id,
              orderId,
            ]
          );
        }
      }
    }

    await connection.execute(
      `UPDATE event_orders
       SET status = 'Quotation Sent',
           discount_type = ?,
           discount_value = ?,
           discount_amount = ?,
           delivery_fee = ?,
           quoted_amount = ?,
           admin_notes = ?,
           customer_action = NULL,
           customer_action_reason = NULL
       WHERE id = ?`,
      [
        discountType,
        Number(discountValue || 0),
        Number(discountAmount || 0),
        Number(deliveryFee || 0),
        Number(quotedAmount || 0),
        adminNotes || null,
        orderId,
      ]
    );

    await connection.commit();
    return {
      id: orderId,
      eventOrderNumber: orders[0].event_order_number,
      userId: orders[0].user_id,
      quotedAmount: Number(quotedAmount || 0),
    };
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
};

const customerRespondToQuotation = async (id, userId, { action, reason = '' }) => {
  const connection = await db.getConnection();
  try {
    await connection.beginTransaction();

    const [orders] = await connection.execute(
      'SELECT id, event_order_number, user_id, status FROM event_orders WHERE id = ? OR event_order_number = ? LIMIT 1 FOR UPDATE',
      [id, id]
    );
    if (!orders.length) {
      const err = new Error('Event order not found');
      err.statusCode = 404;
      throw err;
    }
    const order = orders[0];
    if (order.user_id && (!userId || String(order.user_id) !== String(userId))) {
      const err = new Error('Unauthorized to respond to this order');
      err.statusCode = 403;
      throw err;
    }

    const nextStatus = action === 'accept' ? 'Confirmed' : 'Cancelled';
    const customerAction = action === 'accept' ? 'accepted' : 'rejected';

    await connection.execute(
      `UPDATE event_orders
       SET status = ?,
           customer_action = ?,
           customer_action_reason = ?
       WHERE id = ?`,
      [
        nextStatus,
        customerAction,
        reason || null,
        order.id,
      ]
    );

    await connection.commit();
    return {
      id: order.id,
      eventOrderNumber: order.event_order_number,
      status: nextStatus,
      customerAction,
    };
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
};

module.exports = {
  initializeEventOrderSchema,
  createEventOrder,
  listEventOrders,
  getEventOrderById,
  updateEventOrderStatus,
  updateEventOrderDetails,
  deleteEventOrder,
  sendEventOrderQuotation,
  customerRespondToQuotation,
};
