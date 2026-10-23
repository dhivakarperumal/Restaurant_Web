const db = require('../config/db');

const defaultCategories = [
  'Plates & Crockery',
  'Cutlery',
  'Glassware',
  'Serving Equipment',
  'Table Accessories',
  'Disposable Supplies',
  'Cleaning & Storage',
];

class SuppliesError extends Error {
  constructor(message, statusCode = 400) {
    super(message);
    this.statusCode = statusCode;
  }
}

const formatItemCode = (id) => `SS-${String(id).padStart(6, '0')}`;

const toItem = (row) => {
  const currentStock = Number(row.current_stock);
  const minimumStock = Number(row.minimum_stock);
  return {
    id: row.id,
    item_name: row.item_name,
    item_code: row.item_code,
    category: row.category,
    image_url: row.image_url,
    material: row.material,
    unit: row.unit,
    current_stock: currentStock,
    minimum_stock: minimumStock,
    purchase_price: Number(row.purchase_price),
    supplier_name: row.supplier_name,
    storage_location: row.storage_location,
    description: row.description,
    status: currentStock <= 0 ? 'Out of Stock' : currentStock <= minimumStock ? 'Low Stock' : 'Available',
  };
};

const validateText = (value, label, { required = false, maxLength = 255 } = {}) => {
  if (value === undefined || value === null) {
    if (required) throw new SuppliesError(`${label} is required.`);
    return null;
  }
  const text = String(value).trim();
  if (required && !text) throw new SuppliesError(`${label} is required.`);
  if (text.length > maxLength) throw new SuppliesError(`${label} must be ${maxLength} characters or fewer.`);
  return text || null;
};

const validateAmount = (value, label, { required = false, allowZero = true } = {}) => {
  if (value === undefined || value === null || value === '') {
    if (required) throw new SuppliesError(`${label} is required.`);
    return null;
  }
  const text = String(value).trim();
  if (!/^\d+(?:\.\d{1,2})?$/.test(text)) throw new SuppliesError(`${label} must be a non-negative number with at most 2 decimal places.`);
  const amount = Number(text);
  if (!Number.isFinite(amount) || amount > 9999999999.99 || (!allowZero && amount <= 0)) {
    throw new SuppliesError(`${label} must be ${allowZero ? 'a non-negative' : 'greater than zero'} number.`);
  }
  return text;
};

const validateDate = (value) => {
  if (value === undefined || value === null || value === '') {
    return new Date().toISOString().slice(0, 10);
  }
  const date = String(value);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)
    || !Number.isFinite(Date.parse(`${date}T00:00:00.000Z`))
    || new Date(`${date}T00:00:00.000Z`).toISOString().slice(0, 10) !== date) {
    throw new SuppliesError('date must be a valid date in YYYY-MM-DD format.');
  }
  return date;
};

const initializeServerSuppliesSchema = async () => {
  await db.query(`
    CREATE TABLE IF NOT EXISTS server_supply_categories (
      id INT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
      category_name VARCHAR(150) NOT NULL UNIQUE,
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);
  await db.query(`
    CREATE TABLE IF NOT EXISTS server_supply_items (
      id INT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
      item_name VARCHAR(200) NOT NULL,
      item_code VARCHAR(32) NULL UNIQUE,
      category_id INT UNSIGNED NOT NULL,
      image_url TEXT NULL,
      material VARCHAR(150) NULL,
      unit VARCHAR(50) NOT NULL,
      current_stock DECIMAL(12,2) NOT NULL DEFAULT 0,
      minimum_stock DECIMAL(12,2) NOT NULL DEFAULT 1,
      purchase_price DECIMAL(12,2) NOT NULL DEFAULT 0,
      supplier_name VARCHAR(200) NULL,
      storage_location VARCHAR(200) NULL,
      description TEXT NULL,
      deleted_at TIMESTAMP NULL DEFAULT NULL,
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      UNIQUE KEY server_supply_item_category_name_unique (category_id, item_name),
      INDEX server_supply_items_category_idx (category_id),
      CONSTRAINT server_supply_items_category_fk FOREIGN KEY (category_id)
        REFERENCES server_supply_categories (id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);
  await db.query(`
    CREATE TABLE IF NOT EXISTS server_supply_movements (
      id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
      item_id INT UNSIGNED NULL,
      movement_type ENUM('stock-in', 'stock-out') NOT NULL,
      quantity DECIMAL(12,2) NOT NULL,
      movement_date DATE NOT NULL,
      remarks TEXT NULL,
      created_by VARCHAR(255) NULL,
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      INDEX server_supply_movements_item_date_idx (item_id, movement_date, id),
      CONSTRAINT server_supply_movements_item_fk FOREIGN KEY (item_id)
        REFERENCES server_supply_items (id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);
  await db.query(`
    CREATE TABLE IF NOT EXISTS server_supply_requests (
      id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
      item_id INT UNSIGNED NOT NULL,
      requested_quantity DECIMAL(12,2) NOT NULL,
      items_json LONGTEXT NULL,
      remarks TEXT NULL,
      status ENUM('pending', 'approved', 'rejected') NOT NULL DEFAULT 'pending',
      requested_by VARCHAR(255) NOT NULL,
      decided_by VARCHAR(255) NULL,
      decision_reason TEXT NULL,
      requested_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      decided_at TIMESTAMP NULL DEFAULT NULL,
      INDEX server_supply_requests_status_date_idx (status, requested_at),
      INDEX server_supply_requests_requester_idx (requested_by, requested_at),
      CONSTRAINT server_supply_requests_item_fk FOREIGN KEY (item_id)
        REFERENCES server_supply_items (id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);
  const [requestColumns] = await db.query("SHOW COLUMNS FROM server_supply_requests LIKE 'items_json'");
  if (!requestColumns.length) {
    await db.query('ALTER TABLE server_supply_requests ADD COLUMN items_json LONGTEXT NULL AFTER requested_quantity');
  }
  const [itemIdColumns] = await db.query("SHOW COLUMNS FROM server_supply_requests LIKE 'item_id'");
  if (itemIdColumns[0]?.Null === 'NO') {
    await db.query('ALTER TABLE server_supply_requests MODIFY item_id INT UNSIGNED NULL');
  }

  for (const category of defaultCategories) {
    await db.execute('INSERT IGNORE INTO server_supply_categories (category_name) VALUES (?)', [category]);
  }
  const [itemsWithoutCodes] = await db.query(
    'SELECT id FROM server_supply_items WHERE item_code IS NULL'
  );
  for (const item of itemsWithoutCodes) {
    await db.execute('UPDATE server_supply_items SET item_code = ? WHERE id = ?', [formatItemCode(item.id), item.id]);
  }
};

const listServerSupplyCategories = async () => {
  const [rows] = await db.query(
    'SELECT id, category_name FROM server_supply_categories ORDER BY category_name ASC'
  );
  return rows;
};

const listServerSupplyItems = async () => {
  const [rows] = await db.query(
    `SELECT i.id, i.item_name, i.item_code, c.category_name AS category, i.image_url,
       i.material, i.unit, i.current_stock, i.minimum_stock, i.purchase_price,
       i.supplier_name, i.storage_location, i.description
     FROM server_supply_items i
     JOIN server_supply_categories c ON c.id = i.category_id
     WHERE i.deleted_at IS NULL
     ORDER BY i.item_name ASC`
  );
  return rows.map(toItem);
};

const getCategoryId = async (category) => {
  const value = validateText(category, 'category', { required: true, maxLength: 150 });
  const [rows] = /^\d+$/.test(value)
    ? await db.execute('SELECT id FROM server_supply_categories WHERE id = ?', [Number(value)])
    : await db.execute('SELECT id FROM server_supply_categories WHERE category_name = ?', [value]);
  if (!rows.length) throw new SuppliesError('Selected category does not exist.');
  return rows[0].id;
};

const getItemById = async (id, connection = db, { includeDeleted = false } = {}) => {
  const [rows] = await connection.execute(
    `SELECT i.id, i.item_name, i.item_code, c.category_name AS category, i.image_url,
       i.material, i.unit, i.current_stock, i.minimum_stock, i.purchase_price,
       i.supplier_name, i.storage_location, i.description
     FROM server_supply_items i
     JOIN server_supply_categories c ON c.id = i.category_id
     WHERE i.id = ? ${includeDeleted ? '' : 'AND i.deleted_at IS NULL'}`,
    [id]
  );
  if (!rows.length) throw new SuppliesError('Server supply item was not found.', 404);
  return toItem(rows[0]);
};

const createServerSupplyItem = async (payload = {}) => {
  const itemName = validateText(payload.item_name, 'item_name', { required: true, maxLength: 200 });
  const suppliedItemCode = validateText(payload.item_code, 'item_code', { maxLength: 32 });
  const categoryId = await getCategoryId(payload.category);
  const unit = validateText(payload.unit, 'unit', { required: true, maxLength: 50 });
  const minimumStock = validateAmount(
    payload.minimum_stock === '' || payload.minimum_stock === undefined || payload.minimum_stock === null
      ? 1
      : payload.minimum_stock,
    'minimum_stock'
  );
  const purchasePrice = validateAmount(payload.purchase_price === '' ? 0 : payload.purchase_price ?? 0, 'purchase_price');
  const currentStock = validateAmount(payload.current_stock === '' ? 0 : payload.current_stock ?? 0, 'current_stock');
  const connection = await db.getConnection();
  try {
    await connection.beginTransaction();
    const [result] = await connection.execute(
      `INSERT INTO server_supply_items
        (item_name, item_code, category_id, image_url, material, unit, current_stock, minimum_stock,
         purchase_price, supplier_name, storage_location, description)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        itemName,
        suppliedItemCode,
        categoryId,
        validateText(payload.image_url, 'image_url', { maxLength: 2000 }),
        validateText(payload.material, 'material', { maxLength: 150 }),
        unit,
        currentStock,
        minimumStock,
        purchasePrice,
        validateText(payload.supplier_name, 'supplier_name', { maxLength: 200 }),
        validateText(payload.storage_location, 'storage_location', { maxLength: 200 }),
        validateText(payload.description, 'description', { maxLength: 10000 }),
      ]
    );
    if (!suppliedItemCode) {
      const code = formatItemCode(result.insertId);
      await connection.execute('UPDATE server_supply_items SET item_code = ? WHERE id = ?', [code, result.insertId]);
    }
    const item = await getItemById(result.insertId, connection);
    await connection.commit();
    return item;
  } catch (error) {
    await connection.rollback();
    if (error.code === 'ER_DUP_ENTRY') throw new SuppliesError('Item code or item name already exists.');
    throw error;
  } finally {
    connection.release();
  }
};

const updateServerSupplyItem = async (id, payload = {}) => {
  const current = await getItemById(id);
  const categoryId = payload.category === undefined ? null : await getCategoryId(payload.category);
  const itemName = payload.item_name === undefined
    ? current.item_name
    : validateText(payload.item_name, 'item_name', { required: true, maxLength: 200 });
  const unit = payload.unit === undefined ? current.unit : validateText(payload.unit, 'unit', { required: true, maxLength: 50 });
  const itemCode = payload.item_code === undefined || !String(payload.item_code).trim()
    ? current.item_code
    : validateText(payload.item_code, 'item_code', { maxLength: 32 });
  const fields = {
    item_name: itemName,
    item_code: itemCode,
    category_id: categoryId,
    image_url: payload.image_url === undefined ? current.image_url : validateText(payload.image_url, 'image_url', { maxLength: 2000 }),
    material: payload.material === undefined ? current.material : validateText(payload.material, 'material', { maxLength: 150 }),
    unit,
    current_stock: payload.current_stock === undefined ? null : validateAmount(payload.current_stock, 'current_stock'),
    minimum_stock: payload.minimum_stock === undefined ? null : validateAmount(payload.minimum_stock, 'minimum_stock'),
    purchase_price: payload.purchase_price === undefined ? null : validateAmount(payload.purchase_price, 'purchase_price'),
    supplier_name: payload.supplier_name === undefined ? current.supplier_name : validateText(payload.supplier_name, 'supplier_name', { maxLength: 200 }),
    storage_location: payload.storage_location === undefined ? current.storage_location : validateText(payload.storage_location, 'storage_location', { maxLength: 200 }),
    description: payload.description === undefined ? current.description : validateText(payload.description, 'description', { maxLength: 10000 }),
  };
  let result;
  try {
    [result] = await db.execute(
      `UPDATE server_supply_items
       SET item_name = ?, item_code = ?, category_id = COALESCE(?, category_id), image_url = ?, material = ?, unit = ?,
           current_stock = COALESCE(?, current_stock),
           minimum_stock = COALESCE(?, minimum_stock), purchase_price = COALESCE(?, purchase_price),
           supplier_name = ?, storage_location = ?, description = ?
       WHERE id = ? AND deleted_at IS NULL`,
      [
        fields.item_name, fields.item_code, fields.category_id, fields.image_url, fields.material, fields.unit,
        fields.current_stock,
        fields.minimum_stock, fields.purchase_price, fields.supplier_name, fields.storage_location,
        fields.description, id,
      ]
    );
  } catch (error) {
    if (error.code === 'ER_DUP_ENTRY') throw new SuppliesError('Item code or item name already exists.');
    throw error;
  }
  if (!result.affectedRows) throw new SuppliesError('Server supply item was not found.', 404);
  return getItemById(id);
};

const deleteServerSupplyItem = async (id) => {
  const [result] = await db.execute(
    'UPDATE server_supply_items SET deleted_at = CURRENT_TIMESTAMP WHERE id = ? AND deleted_at IS NULL',
    [id]
  );
  if (!result.affectedRows) throw new SuppliesError('Server supply item was not found.', 404);
};

const listServerSupplyMovements = async (id) => {
  await getItemById(id);
  const [rows] = await db.execute(
    `SELECT id, item_id,
       CASE movement_type WHEN 'stock-in' THEN 'IN' ELSE 'OUT' END AS movement_type,
       quantity, movement_date AS movement_date, remarks, created_by, created_at
     FROM server_supply_movements WHERE item_id = ? ORDER BY movement_date DESC, id DESC`,
    [id]
  );
  return rows.map((row) => ({ ...row, quantity: Number(row.quantity) }));
};

const parseRequestItems = (row) => {
  let items = row.items_json;
  if (typeof items === 'string') {
    try {
      items = JSON.parse(items);
    } catch {
      throw new SuppliesError('A supply request contains invalid item data.', 500);
    }
  }
  if (Array.isArray(items) && items.length) {
    return items.map((item) => ({
      item_id: item.item_id == null ? null : Number(item.item_id),
      item_name: item.item_name,
      item_code: item.item_code,
      unit: item.unit,
      quantity: Number(item.quantity),
      is_custom: Boolean(item.is_custom),
    }));
  }
  return [{
    item_id: row.item_id == null ? null : Number(row.item_id),
    item_name: row.item_name,
    item_code: row.item_code,
    unit: row.unit,
    quantity: Number(row.requested_quantity),
    is_custom: row.item_id == null,
  }];
};

const listServerSupplyRequests = async (requester = null) => {
  const requesterFilter = requester ? 'AND r.requested_by = ?' : '';
  const params = requester ? [requester] : [];
  const [rows] = await db.execute(
    `SELECT r.id, r.item_id, i.item_name, i.item_code, i.unit, r.requested_quantity,
       r.items_json, r.remarks, r.status, r.requested_by, r.decided_by, r.decision_reason,
       r.requested_at, r.decided_at
     FROM server_supply_requests r
     LEFT JOIN server_supply_items i ON i.id = r.item_id
     WHERE 1 = 1 ${requesterFilter}
     ORDER BY CASE r.status WHEN 'pending' THEN 0 ELSE 1 END, r.requested_at DESC, r.id DESC`,
    params
  );
  return rows.map((row) => {
    const items = parseRequestItems(row);
    return {
      ...row,
      items,
      item_name: items.map((item) => item.item_name).join(', '),
      requested_quantity: items.reduce((total, item) => total + item.quantity, 0),
      unit: items.length === 1 ? items[0].unit : 'Multiple',
    };
  });
};

const createServerSupplyRequest = async (payload = {}, requestedBy) => {
  const submittedItems = Array.isArray(payload.items)
    ? payload.items
    : [{ item_id: payload.item_id, quantity: payload.quantity }];
  if (!submittedItems.length || submittedItems.length > 50) {
    throw new SuppliesError('Add between 1 and 50 supply items to a request.');
  }
  const items = [];
  const seenItemIds = new Set();
  const seenCustomNames = new Set();
  for (const submittedItem of submittedItems) {
    const quantity = Number(validateAmount(submittedItem.quantity, 'quantity', { required: true, allowZero: false }));
    if (submittedItem.is_custom) {
      const itemName = validateText(submittedItem.item_name, 'custom item name', { required: true, maxLength: 200 });
      const nameKey = itemName.toLowerCase();
      if (seenCustomNames.has(nameKey)) throw new SuppliesError('Each custom item can only be added once per request.');
      seenCustomNames.add(nameKey);
      items.push({
        item_id: null,
        item_name: itemName,
        item_code: null,
        unit: validateText(submittedItem.unit, 'unit/type', { required: true, maxLength: 50 }),
        quantity,
        is_custom: true,
      });
    } else {
      const itemId = Number(submittedItem?.item_id);
      if (!Number.isSafeInteger(itemId) || itemId < 1) throw new SuppliesError('A valid item id is required.');
      if (seenItemIds.has(itemId)) throw new SuppliesError('Each supply item can only be added once per request.');
      seenItemIds.add(itemId);
      const item = await getItemById(itemId);
      items.push({
        item_id: item.id,
        item_name: item.item_name,
        item_code: item.item_code,
        unit: item.unit,
        quantity,
        is_custom: false,
      });
    }
  }
  const remarks = validateText(payload.remarks, 'remarks', { maxLength: 5000 });
  const firstCatalogItem = items.find((item) => !item.is_custom);
  const [result] = await db.execute(
    `INSERT INTO server_supply_requests (item_id, requested_quantity, items_json, remarks, requested_by)
     VALUES (?, ?, ?, ?, ?)`,
    [firstCatalogItem?.item_id || null, firstCatalogItem?.quantity || items[0].quantity, JSON.stringify(items), remarks, requestedBy]
  );
  return { id: result.insertId, items, remarks, status: 'pending' };
};

const decideServerSupplyRequest = async (requestId, decision, decidedBy, reason = null) => {
  const decisionReason = decision === 'rejected'
    ? validateText(reason, 'rejection reason', { required: true, maxLength: 5000 })
    : validateText(reason, 'decision reason', { maxLength: 5000 });
  const connection = await db.getConnection();
  try {
    await connection.beginTransaction();
    const [requests] = await connection.execute(
      'SELECT id, item_id, requested_quantity, items_json, remarks, status FROM server_supply_requests WHERE id = ? FOR UPDATE',
      [requestId]
    );
    if (!requests.length) throw new SuppliesError('Supply request was not found.', 404);
    const request = requests[0];
    if (request.status !== 'pending') throw new SuppliesError('This supply request has already been processed.', 409);
    let hasCustomItems = false;
    if (decision === 'approved') {
      const requestItems = parseRequestItems(request).sort((a, b) => (a.item_id || Number.MAX_SAFE_INTEGER) - (b.item_id || Number.MAX_SAFE_INTEGER));
      for (const item of requestItems) {
        if (item.is_custom || item.item_id == null) {
          hasCustomItems = true;
          continue;
        }
        const [availableItems] = await connection.execute(
          'SELECT id FROM server_supply_items WHERE id = ? AND deleted_at IS NULL FOR UPDATE',
          [item.item_id]
        );
        if (!availableItems.length) throw new SuppliesError(`The requested supply item ${item.item_name || ''} is no longer available.`, 404);
        await connection.execute(
          'UPDATE server_supply_items SET current_stock = current_stock + ? WHERE id = ?',
          [item.quantity, item.item_id]
        );
        const movementRemarks = [`Approved request #${request.id}`, request.remarks].filter(Boolean).join(' — ');
        await connection.execute(
          `INSERT INTO server_supply_movements (item_id, movement_type, quantity, movement_date, remarks, created_by)
           VALUES (?, 'stock-in', ?, CURRENT_DATE, ?, ?)`,
          [item.item_id, item.quantity, movementRemarks, decidedBy]
        );
      }
    }
    await connection.execute(
      `UPDATE server_supply_requests
       SET status = ?, decided_by = ?, decision_reason = ?, decided_at = CURRENT_TIMESTAMP
       WHERE id = ?`,
      [decision, decidedBy, decisionReason, requestId]
    );
    await connection.commit();
    return { id: Number(requestId), status: decision, hasCustomItems };
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
};

const createServerSupplyMovement = async (id, payload = {}, movementType, createdBy) => {
  const quantity = validateAmount(payload.quantity, 'quantity', { required: true, allowZero: false });
  const date = validateDate(payload.date);
  const remarks = validateText(payload.remarks, 'remarks', { maxLength: 5000 });
  const connection = await db.getConnection();
  try {
    await connection.beginTransaction();
    const [items] = await connection.execute(
      'SELECT id, current_stock FROM server_supply_items WHERE id = ? AND deleted_at IS NULL FOR UPDATE',
      [id]
    );
    if (!items.length) throw new SuppliesError('Server supply item was not found.', 404);
    if (movementType === 'stock-out' && Number(items[0].current_stock) < Number(quantity)) {
      throw new SuppliesError('Stock-out quantity exceeds the available stock.');
    }
    const operator = movementType === 'stock-in' ? '+' : '-';
    await connection.execute(
      `UPDATE server_supply_items SET current_stock = current_stock ${operator} ? WHERE id = ?`,
      [quantity, id]
    );
    await connection.execute(
      `INSERT INTO server_supply_movements (item_id, movement_type, quantity, movement_date, remarks, created_by)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [id, movementType, quantity, date, remarks, createdBy || null]
    );
    const item = await getItemById(id, connection);
    await connection.commit();
    return item;
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
};

module.exports = {
  SuppliesError,
  initializeServerSuppliesSchema,
  listServerSupplyCategories,
  listServerSupplyItems,
  createServerSupplyItem,
  updateServerSupplyItem,
  deleteServerSupplyItem,
  listServerSupplyMovements,
  listServerSupplyRequests,
  createServerSupplyRequest,
  decideServerSupplyRequest,
  createServerSupplyMovement,
};
