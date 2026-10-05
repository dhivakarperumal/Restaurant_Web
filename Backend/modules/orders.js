const { createHash, randomUUID } = require('crypto');
const db = require('../config/db');

const initializeOrderSchema = async () => {
  await db.query(`
    CREATE TABLE IF NOT EXISTS user_addresses (
      id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
      user_id VARCHAR(255) NOT NULL,
      address_line VARCHAR(255) NOT NULL,
      area_locality VARCHAR(180) NOT NULL,
      city VARCHAR(120) NOT NULL,
      state VARCHAR(120) NOT NULL,
      pincode VARCHAR(16) NOT NULL,
      landmark VARCHAR(180) NULL,
      address_hash CHAR(64) NOT NULL,
      created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      UNIQUE KEY user_addresses_user_hash_unique (user_id, address_hash),
      INDEX user_addresses_user_id_idx (user_id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);

  await db.query(`
    CREATE TABLE IF NOT EXISTS orders (
      id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
      order_number CHAR(36) NOT NULL UNIQUE,
      user_id VARCHAR(255) NOT NULL,
      customer_name VARCHAR(150) NOT NULL,
      customer_email VARCHAR(255) NULL,
      customer_phone VARCHAR(32) NOT NULL,
      fulfillment_type ENUM('delivery', 'pickup') NOT NULL,
      address_id BIGINT UNSIGNED NULL,
      subtotal DECIMAL(10,2) NOT NULL,
      total_amount DECIMAL(10,2) NOT NULL,
      payment_method ENUM('cod', 'online') NOT NULL,
      payment_status VARCHAR(24) NOT NULL DEFAULT 'pending',
      order_status VARCHAR(32) NOT NULL DEFAULT 'placed',
      razorpay_order_id VARCHAR(64) NULL,
      razorpay_payment_id VARCHAR(64) NULL,
      created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      INDEX orders_user_created_idx (user_id, created_at),
      INDEX orders_status_idx (order_status)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);

  await db.query(`
    CREATE TABLE IF NOT EXISTS order_items (
      id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
      order_id BIGINT UNSIGNED NOT NULL,
      food_id VARCHAR(32) NOT NULL,
      product_name VARCHAR(180) NOT NULL,
      product_image TEXT NULL,
      portion_size VARCHAR(50) NOT NULL DEFAULT 'Standard',
      unit_price DECIMAL(10,2) NOT NULL,
      quantity INT UNSIGNED NOT NULL,
      total_price DECIMAL(10,2) NOT NULL,
      selected_addons LONGTEXT NULL,
      selected_customizations LONGTEXT NULL,
      cooking_notes TEXT NULL,
      created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      INDEX order_items_order_id_idx (order_id),
      CONSTRAINT order_items_order_id_fk FOREIGN KEY (order_id)
        REFERENCES orders (id) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);
};

const normalizeAddress = (address) => {
  const fields = ['address_line', 'area_locality', 'city', 'state', 'pincode', 'landmark'];
  return Object.fromEntries(fields.map((field) => [
    field,
    String(address?.[field] || '').trim(),
  ]));
};

const addressHash = (address) => createHash('sha256')
  .update(JSON.stringify(Object.values(address).map((value) => value.toLowerCase())))
  .digest('hex');

const parseJson = (value, fallback) => {
  if (value && typeof value === 'object') return value;
  try {
    return JSON.parse(value || '');
  } catch {
    return fallback;
  }
};

const invalidCartError = (message) => {
  const error = new Error(message);
  error.statusCode = 409;
  return error;
};

const getUserAddresses = async (userId) => {
  const [rows] = await db.execute(
    `SELECT id, address_line, area_locality, city, state, pincode, landmark
     FROM user_addresses WHERE user_id = ? ORDER BY created_at DESC, id DESC`,
    [userId]
  );
  return rows;
};

const createOrderFromCart = async ({ userId, customer, fulfillmentType, address, paymentMethod }) => {
  const connection = await db.getConnection();
  try {
    await connection.beginTransaction();
    const [cartRows] = await connection.execute(
      'SELECT * FROM cart WHERE user_id = ? ORDER BY id FOR UPDATE',
      [userId]
    );
    if (!cartRows.length) {
      const error = new Error('Your cart is empty.');
      error.statusCode = 400;
      throw error;
    }

    const foodIds = [...new Set(cartRows.map((row) => String(row.food_id)))];
    const [foodRows] = await connection.execute(
      `SELECT food_id, food_name, food_images, final_price, mrp, portion_size, addons, customizations,
              is_available, status, delivery_available, takeaway_available
       FROM foods WHERE food_id IN (${foodIds.map(() => '?').join(', ')}) FOR UPDATE`,
      foodIds
    );
    const foodsById = new Map(foodRows.map((food) => [String(food.food_id), food]));

    const items = cartRows.map((row) => {
      const quantity = Number(row.quantity);
      const food = foodsById.get(String(row.food_id));
      if (!food || !food.is_available || String(food.status).toLowerCase() !== 'active') {
        throw invalidCartError(`${row.product_name || 'An item'} is no longer available.`);
      }
      if (fulfillmentType === 'delivery' && !food.delivery_available) {
        throw invalidCartError(`${food.food_name} is not available for delivery.`);
      }
      if (fulfillmentType === 'pickup' && !food.takeaway_available) {
        throw invalidCartError(`${food.food_name} is not available for pickup.`);
      }
      if (!Number.isInteger(quantity) || quantity < 1) {
        const error = new Error('Your cart contains an invalid item. Please refresh it and try again.');
        error.statusCode = 400;
        throw error;
      }
      const addons = parseJson(food.addons, []);
      const selectedAddons = parseJson(row.selected_addons, []);
      const customizations = parseJson(food.customizations, []);
      const selectedCustomizations = parseJson(row.selected_customizations, {});
      if (!Array.isArray(addons) || !Array.isArray(selectedAddons) || !Array.isArray(customizations)
        || !selectedCustomizations || Array.isArray(selectedCustomizations) || typeof selectedCustomizations !== 'object') {
        throw invalidCartError(`${food.food_name} has invalid options. Please remove it and add it again.`);
      }
      let addonsPrice = 0;
      const uniqueAddonNames = new Set();
      for (const selectedName of selectedAddons) {
        if (uniqueAddonNames.has(selectedName)) {
          throw invalidCartError(`An add-on for ${food.food_name} was selected more than once.`);
        }
        uniqueAddonNames.add(selectedName);
        const addon = addons.find((item) => item.addon_name === selectedName);
        if (!addon) throw invalidCartError(`An add-on for ${food.food_name} is no longer available.`);
        addonsPrice += Number(addon.price || 0);
      }

      let customizationsPrice = 0;
      const groupNames = new Set(customizations.map((group) => group.name));
      if (Object.keys(selectedCustomizations).some((name) => !groupNames.has(name))) {
        throw invalidCartError(`An option for ${food.food_name} is no longer available.`);
      }
      for (const group of customizations) {
        const selected = selectedCustomizations[group.name];
        if ((group.required === true || group.required === 1) && (
          selected === undefined || selected === null || selected === '' || (Array.isArray(selected) && !selected.length)
        )) {
          throw invalidCartError(`Choose an option for ${food.food_name} before ordering.`);
        }
        const selectedNames = Array.isArray(selected) ? selected : selected ? [selected] : [];
        if ((group.selection_type !== 'Multiple' && selectedNames.length > 1)
          || new Set(selectedNames).size !== selectedNames.length) {
          throw invalidCartError(`Choose a valid option for ${food.food_name}.`);
        }
        for (const selectedName of selectedNames) {
          const option = (group.options || []).find((item) => item.name === selectedName);
          if (!option) throw invalidCartError(`An option for ${food.food_name} is no longer available.`);
          customizationsPrice += Number(option.price || 0);
        }
      }

      const unitPrice = Number((Number(food.final_price || food.mrp || 0) + addonsPrice + customizationsPrice).toFixed(2));
      if (!Number.isFinite(unitPrice) || unitPrice <= 0) {
        throw invalidCartError(`${food.food_name} has an invalid price. Please contact the restaurant.`);
      }
      const images = parseJson(food.food_images, []);
      return {
        foodId: String(food.food_id),
        productName: food.food_name,
        productImage: Array.isArray(images) && typeof images[0] === 'string' ? images[0] : null,
        portionSize: food.portion_size || row.portion_size || 'Standard',
        unitPrice,
        quantity,
        totalPrice: Number((unitPrice * quantity).toFixed(2)),
        selectedAddons: JSON.stringify(selectedAddons),
        selectedCustomizations: JSON.stringify(selectedCustomizations),
        cookingNotes: row.cooking_notes,
      };
    });
    const subtotal = Number(items.reduce((sum, item) => sum + item.totalPrice, 0).toFixed(2));
    const orderNumber = randomUUID();
    let addressId = null;

    if (fulfillmentType === 'delivery') {
      const normalizedAddress = normalizeAddress(address);
      const hash = addressHash(normalizedAddress);
      const [insertResult] = await connection.execute(
        `INSERT INTO user_addresses
          (user_id, address_line, area_locality, city, state, pincode, landmark, address_hash)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)
         ON DUPLICATE KEY UPDATE id = LAST_INSERT_ID(id)`,
        [
          userId,
          normalizedAddress.address_line,
          normalizedAddress.area_locality,
          normalizedAddress.city,
          normalizedAddress.state,
          normalizedAddress.pincode,
          normalizedAddress.landmark || null,
          hash,
        ]
      );
      addressId = insertResult.insertId;
    }

    const [orderResult] = await connection.execute(
      `INSERT INTO orders
        (order_number, user_id, customer_name, customer_email, customer_phone,
         fulfillment_type, address_id, subtotal, total_amount, payment_method,
         payment_status, order_status)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending', 'placed')`,
      [
        orderNumber,
        userId,
        customer.name,
        customer.email || null,
        customer.phone,
        fulfillmentType,
        addressId,
        subtotal,
        subtotal,
        paymentMethod,
      ]
    );
    for (const item of items) {
      await connection.execute(
        `INSERT INTO order_items
          (order_id, food_id, product_name, product_image, portion_size, unit_price,
           quantity, total_price, selected_addons, selected_customizations, cooking_notes)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          orderResult.insertId,
          item.foodId,
          item.productName,
          item.productImage,
          item.portionSize,
          item.unitPrice,
          item.quantity,
          item.totalPrice,
          item.selectedAddons,
          item.selectedCustomizations,
          item.cookingNotes,
        ]
      );
    }

    if (paymentMethod === 'cod') {
      await connection.execute('DELETE FROM cart WHERE user_id = ?', [userId]);
    }
    await connection.commit();
    return { orderNumber, subtotal, items };
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
};

const attachRazorpayOrder = async (orderNumber, userId, razorpayOrderId) => {
  await db.execute(
    `UPDATE orders SET razorpay_order_id = ?
     WHERE order_number = ? AND user_id = ? AND payment_method = 'online'`,
    [razorpayOrderId, orderNumber, userId]
  );
};

const failOnlineOrder = async (orderNumber, userId) => {
  await db.execute(
    `UPDATE orders SET payment_status = 'failed', order_status = 'payment_failed'
     WHERE order_number = ? AND user_id = ? AND payment_status = 'pending'`,
    [orderNumber, userId]
  );
};

const findOrderForPayment = async (orderNumber, userId) => {
  const [rows] = await db.execute(
    `SELECT order_number, total_amount, payment_method, payment_status, razorpay_order_id, razorpay_payment_id
     FROM orders WHERE order_number = ? AND user_id = ? LIMIT 1`,
    [orderNumber, userId]
  );
  return rows[0] || null;
};

const completeOnlinePayment = async ({ orderNumber, userId, paymentId }) => {
  const [result] = await db.execute(
    `UPDATE orders
     SET payment_status = 'paid', order_status = 'placed', razorpay_payment_id = ?
     WHERE order_number = ? AND user_id = ? AND payment_method = 'online'
       AND payment_status = 'pending'`,
    [paymentId, orderNumber, userId]
  );
  return result.affectedRows === 1;
};

const clearUserCart = async (userId) => {
  await db.execute('DELETE FROM cart WHERE user_id = ?', [userId]);
};

module.exports = {
  attachRazorpayOrder,
  clearUserCart,
  completeOnlinePayment,
  createOrderFromCart,
  failOnlineOrder,
  findOrderForPayment,
  getUserAddresses,
  initializeOrderSchema,
};
