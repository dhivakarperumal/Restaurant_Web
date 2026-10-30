const { createHash } = require('crypto');
const db = require('../config/db');
const { isFoodScheduledNow } = require('./foodAvailability');
const {
  findOrCreateActiveBill,
  initializeTableBillsSchema,
  recalculateBillTotals,
} = require('./tableBills');

const formatKotNumber = (number) => `KOT${String(number).padStart(3, '0')}`;

async function migrateKitchenOrderIdsToKot() {
  const connection = await db.getConnection();
  try {
    await connection.query(`
      CREATE TABLE IF NOT EXISTS kitchen_order_kot_sequence (
        id TINYINT UNSIGNED NOT NULL PRIMARY KEY,
        last_number BIGINT UNSIGNED NOT NULL DEFAULT 0
      ) ENGINE=InnoDB
    `);
    const [sequenceInsert] = await connection.execute(
      'INSERT IGNORE INTO kitchen_order_kot_sequence (id, last_number) VALUES (1, 0)'
    );

    await connection.query('SET FOREIGN_KEY_CHECKS = 0');
    await connection.beginTransaction();
    const [orders] = await connection.execute(
      'SELECT id, order_id FROM kitchen_orders ORDER BY id'
    );
    const [[sequence]] = await connection.execute(
      'SELECT last_number FROM kitchen_order_kot_sequence WHERE id = 1 FOR UPDATE'
    );
    let lastNumber = Number(sequence.last_number);

    if (sequenceInsert.affectedRows > 0) {
      lastNumber = 0;
      for (const order of orders) {
        lastNumber += 1;
        const kotNumber = formatKotNumber(lastNumber);
        await connection.execute(
          'UPDATE kitchen_order_items SET order_id = ? WHERE order_id = ?',
          [kotNumber, order.order_id]
        );
        await connection.execute(
          'UPDATE kitchen_orders SET order_id = ? WHERE id = ?',
          [kotNumber, order.id]
        );
      }
    } else {
      for (const order of orders) {
        const currentNumber = /^KOT(\d+)$/i.exec(String(order.order_id || ''));
        if (currentNumber) {
          lastNumber = Math.max(lastNumber, Number(currentNumber[1]));
          continue;
        }
        lastNumber += 1;
        const kotNumber = formatKotNumber(lastNumber);
        await connection.execute(
          'UPDATE kitchen_order_items SET order_id = ? WHERE order_id = ?',
          [kotNumber, order.order_id]
        );
        await connection.execute(
          'UPDATE kitchen_orders SET order_id = ? WHERE id = ?',
          [kotNumber, order.id]
        );
      }
    }

    await connection.execute(
      'UPDATE kitchen_order_kot_sequence SET last_number = ? WHERE id = 1',
      [lastNumber]
    );
    await connection.commit();
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    try {
      await connection.query('SET FOREIGN_KEY_CHECKS = 1');
    } finally {
      connection.release();
    }
  }
}

async function initializeKitchenOrderSchema() {
  await db.query(`
    CREATE TABLE IF NOT EXISTS kitchen_orders (
      id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
      order_id VARCHAR(36) NOT NULL UNIQUE,
      table_id VARCHAR(255) NULL,
      table_number VARCHAR(100) NOT NULL,
      order_type VARCHAR(30) NOT NULL DEFAULT 'dine-in',
      customer_name VARCHAR(150) NULL,
      customer_phone VARCHAR(32) NULL,
      delivery_address VARCHAR(1000) NULL,
      idempotency_key VARCHAR(36) NULL,
      request_hash CHAR(64) NULL,
      status VARCHAR(30) NOT NULL DEFAULT 'Pending',
      created_by VARCHAR(255) NOT NULL,
      user_id VARCHAR(255) NULL,
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP NULL DEFAULT NULL ON UPDATE CURRENT_TIMESTAMP,
      INDEX kitchen_orders_status_idx (status),
      INDEX kitchen_orders_table_idx (table_id),
      INDEX kitchen_orders_created_idx (created_at),
      UNIQUE INDEX kitchen_orders_user_request_unique (user_id, idempotency_key)
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
      selected_addons LONGTEXT NULL,
      selected_customizations LONGTEXT NULL,
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      INDEX kitchen_order_items_order_idx (order_id),
      CONSTRAINT kitchen_order_items_order_fk FOREIGN KEY (order_id)
        REFERENCES kitchen_orders (order_id) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);

  const [orderUserIdColumn] = await db.query("SHOW COLUMNS FROM kitchen_orders LIKE 'user_id'");
  if (!orderUserIdColumn.length) {
    await db.query('ALTER TABLE kitchen_orders ADD COLUMN user_id VARCHAR(255) NULL AFTER created_by');
    await db.query('UPDATE kitchen_orders SET user_id = created_by WHERE user_id IS NULL');
  }

  const [orderTypeColumn] = await db.query("SHOW COLUMNS FROM kitchen_orders LIKE 'order_type'");
  if (!orderTypeColumn.length) {
    await db.query(
      "ALTER TABLE kitchen_orders ADD COLUMN order_type VARCHAR(30) NOT NULL DEFAULT 'dine-in' AFTER table_number"
    );
  }

  const [tableIdColumn] = await db.query("SHOW COLUMNS FROM kitchen_orders LIKE 'table_id'");
  if (tableIdColumn[0]?.Null === 'NO') {
    await db.query('ALTER TABLE kitchen_orders MODIFY COLUMN table_id VARCHAR(255) NULL');
  }

  const orderColumns = [
    ['customer_name', 'VARCHAR(150) NULL AFTER order_type'],
    ['customer_phone', 'VARCHAR(32) NULL AFTER customer_name'],
    ['delivery_address', 'VARCHAR(1000) NULL AFTER customer_phone'],
    ['idempotency_key', 'VARCHAR(36) NULL AFTER delivery_address'],
    ['request_hash', 'CHAR(64) NULL AFTER idempotency_key'],
  ];
  for (const [column, definition] of orderColumns) {
    const [existingColumn] = await db.query(`SHOW COLUMNS FROM kitchen_orders LIKE '${column}'`);
    if (!existingColumn.length) {
      await db.query(`ALTER TABLE kitchen_orders ADD COLUMN ${column} ${definition}`);
    }
  }

  const [requestIndex] = await db.query("SHOW INDEX FROM kitchen_orders WHERE Key_name = 'kitchen_orders_user_request_unique'");
  if (!requestIndex.length) {
    await db.query('CREATE UNIQUE INDEX kitchen_orders_user_request_unique ON kitchen_orders (user_id, idempotency_key)');
  }

  const [selectedAddonsColumn] = await db.query("SHOW COLUMNS FROM kitchen_order_items LIKE 'selected_addons'");
  if (!selectedAddonsColumn.length) {
    await db.query('ALTER TABLE kitchen_order_items ADD COLUMN selected_addons LONGTEXT NULL AFTER unit_price');
  }

  const [selectedCustomizationsColumn] = await db.query("SHOW COLUMNS FROM kitchen_order_items LIKE 'selected_customizations'");
  if (!selectedCustomizationsColumn.length) {
    await db.query('ALTER TABLE kitchen_order_items ADD COLUMN selected_customizations LONGTEXT NULL AFTER selected_addons');
  }

  await migrateKitchenOrderIdsToKot();
  await initializeTableBillsSchema();
}

async function createKitchenOrder({
  orderType = 'dine-in',
  tableId,
  customer = {},
  userId,
  isAdmin = false,
  idempotencyKey,
  items,
  localMinutes,
}) {
  const connection = await db.getConnection();
  const requestHash = createHash('sha256').update(JSON.stringify({
    orderType,
    tableId: tableId || null,
    customer,
    items: items.map((item) => ({
      food_id: item.food_id,
      quantity: item.quantity,
      selected_addons: item.selected_addons,
      selected_customizations: item.selected_customizations,
    })),
  })).digest('hex');

  try {
    await connection.beginTransaction();

    const [existingRequests] = await connection.execute(
      `SELECT order_id, bill_id, round_number, table_id, table_number, order_type,
              customer_name, customer_phone, delivery_address, request_hash, status, created_at
       FROM kitchen_orders WHERE user_id = ? AND idempotency_key = ? LIMIT 1 FOR UPDATE`,
      [userId, idempotencyKey]
    );
    if (existingRequests.length) {
      const existing = existingRequests[0];
      if (existing.request_hash !== requestHash) {
        const error = new Error('This order request key was already used for different order details.');
        error.statusCode = 409;
        throw error;
      }
      await connection.commit();
      return {
        ...existing,
        kot_number: existing.order_id,
        existing: true,
        items: [],
      };
    }

    let table = null;
    let serverName = 'Server';
    let activeBill = null;
    let roundNumber = 1;
    if (orderType === 'dine-in') {
      const [employeeRows] = await connection.execute(
        'SELECT employee_id FROM employees WHERE user_id = ? AND employee_type = ? LIMIT 1',
        [userId, 'Server']
      );
      const assignedIds = [userId, employeeRows[0]?.employee_id].filter(Boolean);
      const assignedPlaceholders = assignedIds.map(() => '?').join(', ');
      const assignmentClause = isAdmin
        ? ''
        : `AND st.assigned_server_id IN (${assignedPlaceholders})`;
      const [tableRows] = await connection.execute(
        `SELECT st.table_id, st.table_number, st.status,
                EXISTS (
                  SELECT 1 FROM reservations r
                  WHERE r.table_id = st.table_id
                    AND r.status IN ('Pending', 'Confirmed')
                    AND r.reservation_date = CURDATE()
                    AND r.start_time <= CURTIME()
                    AND r.end_time > CURTIME()
                ) AS reservation_is_active
         FROM server_table st
         WHERE st.table_id = ? ${assignmentClause}
         LIMIT 1 FOR UPDATE`,
        isAdmin ? [tableId] : [tableId, ...assignedIds]
      );
      if (!tableRows.length) {
        const error = new Error(isAdmin
          ? 'The selected table no longer exists.'
          : 'The selected table is not assigned to your server account.');
        error.statusCode = isAdmin ? 404 : 403;
        throw error;
      }
      table = tableRows[0];
      if (!['available', 'occupied', 'reserved'].includes(String(table.status || '').trim().toLowerCase())
        || Number(table.reservation_is_active) === 1) {
        const error = new Error('This table is reserved or unavailable. Choose another table.');
        error.statusCode = 409;
        throw error;
      }
      const [employeeNameRows] = await connection.execute(
        'SELECT full_name FROM employees WHERE user_id = ? LIMIT 1',
        [userId]
      );
      if (employeeNameRows[0]?.full_name) {
        serverName = employeeNameRows[0].full_name;
      } else {
        const [userRows] = await connection.execute(
          'SELECT username FROM users WHERE user_id = ? LIMIT 1',
          [userId]
        );
        if (userRows[0]?.username) serverName = userRows[0].username;
      }
      activeBill = await findOrCreateActiveBill(connection, {
        tableId: table.table_id,
        tableNumber: table.table_number,
        serverId: userId,
        serverName,
      });
      const [existingOrders] = await connection.execute(
        'SELECT COUNT(*) AS count FROM kitchen_orders WHERE bill_id = ?',
        [activeBill.bill_id]
      );
      roundNumber = Number(existingOrders[0]?.count || 0) + 1;
    }

    const foodIds = items.map((item) => item.food_id);
    const placeholders = [...new Set(foodIds)].map(() => '?').join(', ');
    const [foodRows] = await connection.execute(
      `SELECT food_id, food_name, final_price, is_available, is_menu_visible, meal_type, dining_available,
              takeaway_available, delivery_available, stock_quantity, status,
              addons, customizations
       FROM foods WHERE food_id IN (${placeholders}) FOR UPDATE`,
      [...new Set(foodIds)]
    );
    const foodsById = new Map(foodRows.map((food) => [food.food_id, food]));
    if (foodRows.length !== new Set(foodIds).size) {
      const error = new Error('One or more selected menu items no longer exist.');
      error.statusCode = 400;
      throw error;
    }

    for (const item of items) {
      const food = foodsById.get(item.food_id);
      const orderTypeAvailable = orderType === 'dine-in'
        ? food.dining_available
        : orderType === 'pickup'
          ? food.takeaway_available
          : food.delivery_available;
      if (!food.is_available || !food.is_menu_visible || !orderTypeAvailable
        || Number(food.stock_quantity || 0) < item.quantity
        || String(food.status).toLowerCase() !== 'active'
        || !isFoodScheduledNow(food.meal_type, localMinutes)) {
        const orderLabel = orderType === 'dine-in' ? 'dine-in' : orderType === 'pickup' ? 'pickup' : 'home delivery';
        const error = new Error(`${food.food_name} is no longer available for ${orderLabel} orders.`);
        error.statusCode = 409;
        throw error;
      }

      let availableAddons;
      let availableCustomizations;
      try {
        availableAddons = JSON.parse(food.addons || '[]');
        availableCustomizations = JSON.parse(food.customizations || '[]');
      } catch {
        const error = new Error(`${food.food_name} has invalid menu options. Please contact an administrator.`);
        error.statusCode = 500;
        throw error;
      }
      if (!Array.isArray(availableAddons) || !Array.isArray(availableCustomizations)) {
        const error = new Error(`${food.food_name} has invalid menu options. Please contact an administrator.`);
        error.statusCode = 500;
        throw error;
      }

      const selectedAddons = item.selected_addons || [];
      const selectedCustomizations = item.selected_customizations || {};
      if (!Array.isArray(selectedAddons) || selectedAddons.some((name) => typeof name !== 'string')
        || selectedAddons.some((name) => !name.trim() || name.length > 180)
        || new Set(selectedAddons).size !== selectedAddons.length) {
        const error = new Error(`Choose valid add-ons for ${food.food_name}.`);
        error.statusCode = 400;
        throw error;
      }
      const customRequest = selectedCustomizations.__custom_request__;
      if (!selectedCustomizations || typeof selectedCustomizations !== 'object'
        || Array.isArray(selectedCustomizations)
        || (customRequest !== undefined
          && (typeof customRequest !== 'string' || !customRequest.trim() || customRequest.length > 500))) {
        const error = new Error(`Choose valid customizations for ${food.food_name}.`);
        error.statusCode = 400;
        throw error;
      }

      let optionPrice = 0;
      for (const addonName of selectedAddons) {
        const addon = availableAddons.find((candidate) => candidate.addon_name === addonName);
        if (!addon) {
          const error = new Error(`An add-on for ${food.food_name} is no longer available.`);
          error.statusCode = 409;
          throw error;
        }
        if (String(addon.status || 'Active').toLowerCase() !== 'active') {
          const error = new Error(`An add-on for ${food.food_name} is no longer available.`);
          error.statusCode = 409;
          throw error;
        }
        if (addon) optionPrice += Number(addon.price || 0);
      }

      const groupNames = new Set(availableCustomizations.map((group) => group.name));
      if (Object.keys(selectedCustomizations).some((name) => !groupNames.has(name) && name !== '__custom_request__')) {
        const error = new Error(`A customization for ${food.food_name} is no longer available.`);
        error.statusCode = 409;
        throw error;
      }
      for (const group of availableCustomizations) {
        if (group.name === '__custom_request__' && customRequest !== undefined) continue;
        const selected = selectedCustomizations[group.name];
        const selectedNames = Array.isArray(selected) ? selected : selected ? [selected] : [];
        const required = group.required === true || Number(group.required) === 1;
        if (required && selectedNames.length === 0) {
          const error = new Error(`Choose ${group.name} for ${food.food_name}.`);
          error.statusCode = 400;
          throw error;
        }
        if ((group.selection_type !== 'Multiple' && selectedNames.length > 1)
          || new Set(selectedNames).size !== selectedNames.length
          || selectedNames.some((name) => typeof name !== 'string')) {
          const error = new Error(`Choose valid options for ${group.name}.`);
          error.statusCode = 400;
          throw error;
        }
        for (const optionName of selectedNames) {
          const option = (group.options || []).find((candidate) => candidate.name === optionName);
          if (!option) {
            const error = new Error(`A customization for ${food.food_name} is no longer available.`);
            error.statusCode = 409;
            throw error;
          }
          optionPrice += Number(option.price || 0);
        }
      }
      item.selected_addons = selectedAddons;
      item.selected_customizations = selectedCustomizations;
      item.unit_price = Number((Number(food.final_price) + optionPrice).toFixed(2));
    }

    const [[kotSequence]] = await connection.execute(
      'SELECT last_number FROM kitchen_order_kot_sequence WHERE id = 1 FOR UPDATE'
    );
    const kotNumberValue = Number(kotSequence.last_number) + 1;
    const orderId = formatKotNumber(kotNumberValue);
    await connection.execute(
      'UPDATE kitchen_order_kot_sequence SET last_number = ? WHERE id = 1',
      [kotNumberValue]
    );

    await connection.execute(
      `INSERT INTO kitchen_orders
         (order_id, bill_id, round_number, table_id, table_number, order_type,
          customer_name, customer_phone, delivery_address, idempotency_key, request_hash,
          status, created_by, user_id)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'Pending', ?, ?)`,
      [
        orderId,
        activeBill?.bill_id || null,
        roundNumber,
        table?.table_id || null,
        table?.table_number || (orderType === 'pickup' ? 'Pickup' : 'Delivery'),
        orderType,
        orderType === 'dine-in' ? null : customer.name,
        orderType === 'dine-in' ? null : customer.phone,
        orderType === 'home_delivery' ? customer.address : null,
        idempotencyKey,
        requestHash,
        userId,
        userId,
      ]
    );

    for (const item of items) {
      const food = foodsById.get(item.food_id);
      await connection.execute(
        `INSERT INTO kitchen_order_items
           (order_id, food_id, food_name, quantity, unit_price, selected_addons, selected_customizations)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [
          orderId,
          food.food_id,
          food.food_name,
          item.quantity,
          item.unit_price,
          JSON.stringify(item.selected_addons),
          JSON.stringify(item.selected_customizations),
        ]
      );
    }

    // Ensure table status is set to Occupied
    if (table) {
      await connection.execute(
        `UPDATE server_table SET status = 'Occupied' WHERE table_id = ?`,
        [table.table_id]
      );
    }
    const billTotals = activeBill ? await recalculateBillTotals(connection, activeBill.bill_id) : null;

    await connection.commit();
    const orderItems = items.map((item) => {
      const food = foodsById.get(item.food_id);
      return {
        food_id: food.food_id,
        food_name: food.food_name,
        quantity: item.quantity,
        unit_price: item.unit_price,
        selected_addons: item.selected_addons,
        selected_customizations: item.selected_customizations,
      };
    });
    return {
      kot_number: orderId,
      order_id: orderId,
      bill_id: activeBill?.bill_id || null,
      bill_number: activeBill?.bill_number || null,
      round_number: roundNumber,
      table_id: table?.table_id || null,
      table_number: table?.table_number || (orderType === 'pickup' ? 'Pickup' : 'Delivery'),
      order_type: orderType,
      customer_name: orderType === 'dine-in' ? null : customer.name,
      customer_phone: orderType === 'dine-in' ? null : customer.phone,
      delivery_address: orderType === 'home_delivery' ? customer.address : null,
      status: 'Pending',
      created_by: userId,
      user_id: userId,
      created_at: new Date(),
      existing: false,
      items: orderItems,
      bill: activeBill ? {
        bill_id: activeBill.bill_id,
        bill_number: activeBill.bill_number,
        round_number: roundNumber,
        ...billTotals,
      } : null,
    };
  } catch (error) {
    await connection.rollback();
    if (error.code === 'ER_DUP_ENTRY' && String(error.message).includes('kitchen_orders_user_request_unique')) {
      const [existingRequests] = await db.execute(
        `SELECT order_id, bill_id, round_number, table_id, table_number, order_type,
                customer_name, customer_phone, delivery_address, request_hash, status, created_at
         FROM kitchen_orders WHERE user_id = ? AND idempotency_key = ? LIMIT 1`,
        [userId, idempotencyKey]
      );
      const existing = existingRequests[0];
      if (existing?.request_hash === requestHash) {
        return { ...existing, kot_number: existing.order_id, existing: true, items: [] };
      }
      if (existing) {
        const conflict = new Error('This order request key was already used for different order details.');
        conflict.statusCode = 409;
        throw conflict;
      }
    }
    throw error;
  } finally {
    connection.release();
  }
}

async function updateKitchenOrderStatus({ orderId, status, serverUserId = null }) {
  const conditions = ['order_id = ?'];
  const params = [status, orderId];
  if (serverUserId) {
    conditions.push('(user_id = ? OR created_by = ?)');
    params.push(serverUserId, serverUserId);
    conditions.push("status = 'Ready to Serve'");
  }
  const [result] = await db.execute(
    `UPDATE kitchen_orders
     SET status = ?, updated_at = CURRENT_TIMESTAMP
     WHERE ${conditions.join(' AND ')}`,
    params
  );
  if (result.affectedRows === 0) return null;

  const [orders] = await db.execute(
    `SELECT order_id, bill_id, round_number, table_id, table_number, order_type,
            customer_name, customer_phone, delivery_address, status, created_by, user_id,
            created_at, updated_at
     FROM kitchen_orders WHERE order_id = ? LIMIT 1`,
    [orderId]
  );
  return orders[0] || null;
}

async function listKitchenOrders(filters = {}) {
  let query = `SELECT ko.id, ko.order_id, ko.bill_id, ko.round_number, ko.table_id, ko.table_number,
                      ko.order_type, ko.customer_name, ko.customer_phone, ko.delivery_address,
                      ko.status, ko.created_by, ko.user_id, ko.created_at, ko.updated_at,
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
  if (filters.order_type) {
    conditions.push('ko.order_type = ?');
    params.push(filters.order_type);
  }
  if (filters.order_id) {
    conditions.push('ko.order_id = ?');
    params.push(filters.order_id);
  }
  if (filters.createdByUserId) {
    conditions.push('(ko.user_id = ? OR ko.created_by = ?)');
    params.push(filters.createdByUserId, filters.createdByUserId);
  }
  if (conditions.length > 0) {
    query += ` WHERE ${conditions.join(' AND ')}`;
  }
  query += ` ORDER BY ko.created_at DESC${filters.includeAll ? '' : ' LIMIT 100'}`;

  const [orders] = await db.execute(query, params);
  if (!orders.length) return [];

  const orderIds = orders.map((order) => order.order_id);
  const placeholders = orderIds.map(() => '?').join(', ');
  const [items] = await db.execute(
    `SELECT order_id, food_id, food_name, quantity, unit_price, selected_addons, selected_customizations
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
      selected_addons: parseStoredJson(item.selected_addons, []),
      selected_customizations: parseStoredJson(item.selected_customizations, {}),
    });
    itemsByOrder.set(item.order_id, orderItems);
  }

  return orders.map((order) => ({
    ...order,
    kot_number: order.order_id,
    round_number: order.round_number || 1,
    items: itemsByOrder.get(order.order_id) || [],
  }));
}

function parseStoredJson(value, fallback) {
  if (!value) return fallback;
  if (typeof value === 'object') return value;
  try {
    return JSON.parse(value);
  } catch {
    return fallback;
  }
}

module.exports = { createKitchenOrder, initializeKitchenOrderSchema, listKitchenOrders, updateKitchenOrderStatus };
