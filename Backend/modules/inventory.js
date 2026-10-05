const db = require('../config/db');

const inventoryDefaultCategories = [
  'Vegetables', 'Fruits', 'Chicken', 'Meat', 'Fish', 'Rice & Grains', 'Pulses', 'Spices', 'Oil', 'Dairy', 'Bakery', 'Beverages', 'Frozen Foods', 'Grocery', 'Cleaning Materials', 'Kitchen Supplies', 'Packaging Materials'
];

const inventoryDefaultUnits = [
  { unit_name: 'Kilogram', short_name: 'Kg' },
  { unit_name: 'Gram', short_name: 'g' },
  { unit_name: 'Liter', short_name: 'L' },
  { unit_name: 'Milliliter', short_name: 'ml' },
  { unit_name: 'Piece', short_name: 'pcs' },
  { unit_name: 'Packet', short_name: 'pk' },
  { unit_name: 'Box', short_name: 'box' },
  { unit_name: 'Bottle', short_name: 'btl' },
  { unit_name: 'Dozen', short_name: 'dz' },
  { unit_name: 'Plate', short_name: 'plate' },
  { unit_name: 'Pack', short_name: 'pack' },
];

const inventoryDefaultLocations = [
  'Main Store', 'Kitchen', 'Bakery', 'Bar', 'Cold Storage', 'Freezer', 'Vegetable Store', 'Dry Store'
];

const toNumber = (value, fallback = 0) => {
  const parsed = Number(value ?? fallback);
  return Number.isFinite(parsed) ? parsed : fallback;
};

const safeJson = (value) => {
  if (value === undefined || value === null || value === '') return JSON.stringify([]);
  if (typeof value === 'string') {
    try { return JSON.stringify(JSON.parse(value)); } catch { return JSON.stringify(value); }
  }
  return JSON.stringify(value);
};

const ensureTable = async (tableName, sql) => {
  await db.query(sql);
};

const initializeInventorySchema = async () => {
  await ensureTable('inventory_categories', `
    CREATE TABLE IF NOT EXISTS inventory_categories (
      id INT AUTO_INCREMENT PRIMARY KEY,
      category_name VARCHAR(150) NOT NULL,
      description TEXT NULL,
      status VARCHAR(20) NOT NULL DEFAULT 'Active',
      image_url TEXT NULL,
      created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);

  await ensureTable('inventory_subcategories', `
    CREATE TABLE IF NOT EXISTS inventory_subcategories (
      id INT AUTO_INCREMENT PRIMARY KEY,
      category_id INT NULL,
      subcategory_name VARCHAR(150) NOT NULL,
      description TEXT NULL,
      status VARCHAR(20) NOT NULL DEFAULT 'Active',
      created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      INDEX idx_inventory_subcategory_category (category_id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);

  await ensureTable('inventory_units', `
    CREATE TABLE IF NOT EXISTS inventory_units (
      id INT AUTO_INCREMENT PRIMARY KEY,
      unit_name VARCHAR(100) NOT NULL,
      short_name VARCHAR(50) NOT NULL,
      status VARCHAR(20) NOT NULL DEFAULT 'Active',
      created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);

  await ensureTable('inventory_locations', `
    CREATE TABLE IF NOT EXISTS inventory_locations (
      id INT AUTO_INCREMENT PRIMARY KEY,
      location_name VARCHAR(150) NOT NULL,
      description TEXT NULL,
      rack VARCHAR(100) NULL,
      shelf VARCHAR(100) NULL,
      bin VARCHAR(100) NULL,
      status VARCHAR(20) NOT NULL DEFAULT 'Active',
      created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);

  await ensureTable('inventory_products', `
    CREATE TABLE IF NOT EXISTS inventory_products (
      id INT AUTO_INCREMENT PRIMARY KEY,
      product_name VARCHAR(200) NOT NULL,
      sku VARCHAR(100) NULL,
      barcode VARCHAR(120) NULL,
      category_id INT NULL,
      subcategory_id INT NULL,
      unit_id INT NULL,
      supplier_id INT NULL,
      brand VARCHAR(150) NULL,
      description TEXT NULL,
      image_url TEXT NULL,
      current_stock DECIMAL(12,2) NOT NULL DEFAULT 0,
      minimum_stock DECIMAL(12,2) NOT NULL DEFAULT 0,
      maximum_stock DECIMAL(12,2) NOT NULL DEFAULT 0,
      reorder_level DECIMAL(12,2) NOT NULL DEFAULT 0,
      purchase_price DECIMAL(12,2) NOT NULL DEFAULT 0,
      selling_price DECIMAL(12,2) NOT NULL DEFAULT 0,
      storage_location_id INT NULL,
      rack VARCHAR(100) NULL,
      shelf VARCHAR(100) NULL,
      batch_number VARCHAR(100) NULL,
      manufacturing_date DATE NULL,
      expiry_date DATE NULL,
      status VARCHAR(20) NOT NULL DEFAULT 'Active',
      deleted_at DATETIME NULL,
      created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      INDEX idx_inventory_products_category (category_id),
      INDEX idx_inventory_products_supplier (supplier_id),
      INDEX idx_inventory_products_status (status)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);

  await ensureTable('product_batches', `
    CREATE TABLE IF NOT EXISTS product_batches (
      id INT AUTO_INCREMENT PRIMARY KEY,
      product_id INT NOT NULL,
      batch_number VARCHAR(100) NULL,
      quantity DECIMAL(12,2) NOT NULL DEFAULT 0,
      purchase_price DECIMAL(12,2) NOT NULL DEFAULT 0,
      manufacturing_date DATE NULL,
      expiry_date DATE NULL,
      supplier_id INT NULL,
      created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      INDEX idx_inventory_batches_product (product_id),
      INDEX idx_inventory_batches_expiry (expiry_date)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);

  await ensureTable('suppliers', `
    CREATE TABLE IF NOT EXISTS suppliers (
      id INT AUTO_INCREMENT PRIMARY KEY,
      supplier_name VARCHAR(200) NOT NULL,
      company_name VARCHAR(200) NULL,
      phone VARCHAR(50) NULL,
      email VARCHAR(150) NULL,
      address TEXT NULL,
      gst_number VARCHAR(100) NULL,
      payment_terms VARCHAR(100) NULL,
      opening_balance DECIMAL(12,2) NOT NULL DEFAULT 0,
      status VARCHAR(20) NOT NULL DEFAULT 'Active',
      created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);

  await ensureTable('supplier_products', `
    CREATE TABLE IF NOT EXISTS supplier_products (
      id INT AUTO_INCREMENT PRIMARY KEY,
      supplier_id INT NOT NULL,
      product_id INT NOT NULL,
      created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      UNIQUE KEY unique_supplier_product (supplier_id, product_id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);

  await ensureTable('supplier_payments', `
    CREATE TABLE IF NOT EXISTS supplier_payments (
      id INT AUTO_INCREMENT PRIMARY KEY,
      supplier_id INT NOT NULL,
      purchase_id INT NULL,
      payment_method VARCHAR(50) NULL,
      amount DECIMAL(12,2) NOT NULL DEFAULT 0,
      payment_date DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      notes TEXT NULL,
      created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);

  await ensureTable('purchases', `
    CREATE TABLE IF NOT EXISTS purchases (
      id INT AUTO_INCREMENT PRIMARY KEY,
      purchase_number VARCHAR(100) NOT NULL UNIQUE,
      invoice_number VARCHAR(120) NULL,
      supplier_id INT NULL,
      purchase_date DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      subtotal DECIMAL(12,2) NOT NULL DEFAULT 0,
      discount DECIMAL(12,2) NOT NULL DEFAULT 0,
      tax DECIMAL(12,2) NOT NULL DEFAULT 0,
      grand_total DECIMAL(12,2) NOT NULL DEFAULT 0,
      paid_amount DECIMAL(12,2) NOT NULL DEFAULT 0,
      pending_amount DECIMAL(12,2) NOT NULL DEFAULT 0,
      payment_status VARCHAR(30) NOT NULL DEFAULT 'Pending',
      status VARCHAR(30) NOT NULL DEFAULT 'Completed',
      notes TEXT NULL,
      created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);

  await ensureTable('purchase_items', `
    CREATE TABLE IF NOT EXISTS purchase_items (
      id INT AUTO_INCREMENT PRIMARY KEY,
      purchase_id INT NOT NULL,
      product_id INT NOT NULL,
      batch_number VARCHAR(100) NULL,
      expiry_date DATE NULL,
      quantity DECIMAL(12,2) NOT NULL DEFAULT 0,
      unit VARCHAR(50) NULL,
      purchase_price DECIMAL(12,2) NOT NULL DEFAULT 0,
      discount DECIMAL(12,2) NOT NULL DEFAULT 0,
      tax DECIMAL(12,2) NOT NULL DEFAULT 0,
      total DECIMAL(12,2) NOT NULL DEFAULT 0,
      created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      INDEX idx_purchase_items_purchase (purchase_id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);

  await ensureTable('stock_transactions', `
    CREATE TABLE IF NOT EXISTS stock_transactions (
      id INT AUTO_INCREMENT PRIMARY KEY,
      product_id INT NOT NULL,
      batch_id INT NULL,
      transaction_type VARCHAR(50) NOT NULL,
      reference_type VARCHAR(80) NULL,
      reference_id INT NULL,
      quantity DECIMAL(12,2) NOT NULL DEFAULT 0,
      unit VARCHAR(50) NULL,
      previous_stock DECIMAL(12,2) NOT NULL DEFAULT 0,
      new_stock DECIMAL(12,2) NOT NULL DEFAULT 0,
      from_location_id INT NULL,
      to_location_id INT NULL,
      reason VARCHAR(150) NULL,
      notes TEXT NULL,
      created_by VARCHAR(150) NULL,
      created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      INDEX idx_inventory_transactions_product (product_id),
      INDEX idx_inventory_transactions_type (transaction_type)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);

  await ensureTable('stock_adjustments', `
    CREATE TABLE IF NOT EXISTS stock_adjustments (
      id INT AUTO_INCREMENT PRIMARY KEY,
      product_id INT NOT NULL,
      adjustment_type VARCHAR(30) NOT NULL,
      quantity DECIMAL(12,2) NOT NULL DEFAULT 0,
      current_stock DECIMAL(12,2) NOT NULL DEFAULT 0,
      new_stock DECIMAL(12,2) NOT NULL DEFAULT 0,
      reason VARCHAR(150) NULL,
      notes TEXT NULL,
      date DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      created_by VARCHAR(150) NULL,
      created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);

  await ensureTable('stock_transfers', `
    CREATE TABLE IF NOT EXISTS stock_transfers (
      id INT AUTO_INCREMENT PRIMARY KEY,
      transfer_number VARCHAR(80) NOT NULL UNIQUE,
      from_location_id INT NOT NULL,
      to_location_id INT NOT NULL,
      product_id INT NOT NULL,
      quantity DECIMAL(12,2) NOT NULL DEFAULT 0,
      unit VARCHAR(50) NULL,
      transfer_date DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      reason VARCHAR(150) NULL,
      notes TEXT NULL,
      status VARCHAR(30) NOT NULL DEFAULT 'Completed',
      created_by VARCHAR(150) NULL,
      created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);

  await ensureTable('kitchen_requests', `
    CREATE TABLE IF NOT EXISTS kitchen_requests (
      id INT AUTO_INCREMENT PRIMARY KEY,
      request_number VARCHAR(80) NOT NULL UNIQUE,
      requested_by VARCHAR(150) NULL,
      department VARCHAR(120) NULL,
      request_date DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      priority VARCHAR(30) NOT NULL DEFAULT 'Normal',
      status VARCHAR(30) NOT NULL DEFAULT 'Pending',
      notes TEXT NULL,
      created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);

  await ensureTable('kitchen_request_items', `
    CREATE TABLE IF NOT EXISTS kitchen_request_items (
      id INT AUTO_INCREMENT PRIMARY KEY,
      request_id INT NOT NULL,
      product_id INT NOT NULL,
      quantity DECIMAL(12,2) NOT NULL DEFAULT 0,
      unit VARCHAR(50) NULL,
      created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      INDEX idx_kitchen_request_items_request (request_id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);

  await ensureTable('recipes', `
    CREATE TABLE IF NOT EXISTS recipes (
      id INT AUTO_INCREMENT PRIMARY KEY,
      food_name VARCHAR(200) NOT NULL,
      food_category VARCHAR(150) NULL,
      selling_price DECIMAL(12,2) NOT NULL DEFAULT 0,
      preparation_time VARCHAR(100) NULL,
      notes TEXT NULL,
      status VARCHAR(20) NOT NULL DEFAULT 'Active',
      created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);

  await ensureTable('recipe_ingredients', `
    CREATE TABLE IF NOT EXISTS recipe_ingredients (
      id INT AUTO_INCREMENT PRIMARY KEY,
      recipe_id INT NOT NULL,
      product_id INT NULL,
      ingredient_name VARCHAR(200) NULL,
      quantity DECIMAL(12,2) NOT NULL DEFAULT 0,
      unit VARCHAR(50) NULL,
      created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      INDEX idx_recipe_ingredients_recipe (recipe_id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);

  await ensureTable('wastages', `
    CREATE TABLE IF NOT EXISTS wastages (
      id INT AUTO_INCREMENT PRIMARY KEY,
      product_id INT NOT NULL,
      batch_number VARCHAR(100) NULL,
      quantity DECIMAL(12,2) NOT NULL DEFAULT 0,
      unit VARCHAR(50) NULL,
      reason VARCHAR(100) NULL,
      wastage_date DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      estimated_loss DECIMAL(12,2) NOT NULL DEFAULT 0,
      notes TEXT NULL,
      created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);

  await ensureTable('inventory_logs', `
    CREATE TABLE IF NOT EXISTS inventory_logs (
      id INT AUTO_INCREMENT PRIMARY KEY,
      module VARCHAR(100) NULL,
      action VARCHAR(150) NULL,
      details JSON NULL,
      created_by VARCHAR(150) NULL,
      created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);

  const [categoryRows] = await db.query('SELECT COUNT(*) as total FROM inventory_categories');
  if ((categoryRows[0]?.total || 0) === 0) {
    const rows = inventoryDefaultCategories.map((label) => [label, `${label} inventory category`, 'Active', null]);
    await db.query(
      'INSERT INTO inventory_categories (category_name, description, status, image_url) VALUES ?',
      [rows]
    );
  }

  const [unitRows] = await db.query('SELECT COUNT(*) as total FROM inventory_units');
  if ((unitRows[0]?.total || 0) === 0) {
    await db.query(
      'INSERT INTO inventory_units (unit_name, short_name, status) VALUES ?',
      [inventoryDefaultUnits.map((item) => [item.unit_name, item.short_name, 'Active'])]
    );
  }

  const [locationRows] = await db.query('SELECT COUNT(*) as total FROM inventory_locations');
  if ((locationRows[0]?.total || 0) === 0) {
    await db.query(
      'INSERT INTO inventory_locations (location_name, description, status) VALUES ?',
      [inventoryDefaultLocations.map((name) => [name, `${name} storage location`, 'Active'])]
    );
  }
};

const listInventoryCategories = async () => {
  const [rows] = await db.query('SELECT * FROM inventory_categories ORDER BY category_name ASC');
  return rows;
};

const listInventorySubcategories = async () => {
  const [rows] = await db.query('SELECT * FROM inventory_subcategories ORDER BY subcategory_name ASC');
  return rows;
};

const listInventoryUnits = async () => {
  const [rows] = await db.query('SELECT * FROM inventory_units ORDER BY unit_name ASC');
  return rows;
};

const listInventoryLocations = async () => {
  const [rows] = await db.query('SELECT * FROM inventory_locations ORDER BY location_name ASC');
  return rows;
};

const listSuppliers = async () => {
  const [rows] = await db.query('SELECT * FROM suppliers ORDER BY supplier_name ASC');
  return rows;
};

const listProducts = async () => {
  const [rows] = await db.query(`
    SELECT p.*, c.category_name, u.unit_name, s.supplier_name, l.location_name
    FROM inventory_products p
    LEFT JOIN inventory_categories c ON c.id = p.category_id
    LEFT JOIN inventory_units u ON u.id = p.unit_id
    LEFT JOIN suppliers s ON s.id = p.supplier_id
    LEFT JOIN inventory_locations l ON l.id = p.storage_location_id
    WHERE p.deleted_at IS NULL
    ORDER BY p.created_at DESC
  `);
  return rows.map((product) => ({
    ...product,
    current_stock: toNumber(product.current_stock),
    minimum_stock: toNumber(product.minimum_stock),
    reorder_level: toNumber(product.reorder_level),
    purchase_price: toNumber(product.purchase_price),
    selling_price: toNumber(product.selling_price),
    stock_value: toNumber(product.current_stock) * toNumber(product.purchase_price),
  }));
};

const getInventorySummary = async () => {
  const [products] = await db.query('SELECT COUNT(*) total_products, SUM(current_stock) total_stock_quantity, SUM(current_stock * purchase_price) total_stock_value FROM inventory_products WHERE deleted_at IS NULL');
  const [lowStock] = await db.query('SELECT COUNT(*) low_stock FROM inventory_products WHERE deleted_at IS NULL AND current_stock <= reorder_level');
  const [outOfStock] = await db.query('SELECT COUNT(*) out_of_stock FROM inventory_products WHERE deleted_at IS NULL AND current_stock = 0');
  const [expiringSoon] = await db.query('SELECT COUNT(*) expiring_soon FROM inventory_products WHERE deleted_at IS NULL AND expiry_date IS NOT NULL AND expiry_date BETWEEN CURDATE() AND DATE_ADD(CURDATE(), INTERVAL 7 DAY)');
  const [todayPurchase] = await db.query('SELECT COALESCE(SUM(grand_total),0) today_purchase FROM purchases WHERE DATE(purchase_date) = CURDATE()');
  const [todayUsage] = await db.query('SELECT COALESCE(SUM(quantity),0) today_usage FROM stock_transactions WHERE transaction_type = "STOCK_OUT" AND DATE(created_at) = CURDATE()');
  const [todayWastage] = await db.query('SELECT COALESCE(SUM(estimated_loss),0) today_wastage FROM wastages WHERE DATE(wastage_date) = CURDATE()');
  const [pendingKitchen] = await db.query('SELECT COUNT(*) pending_kitchen_requests FROM kitchen_requests WHERE status IN ("Pending","Approved")');

  return {
    totalProducts: Number(products[0]?.total_products || 0),
    totalStockQuantity: Number(products[0]?.total_stock_quantity || 0),
    totalStockValue: Number(products[0]?.total_stock_value || 0),
    lowStock: Number(lowStock[0]?.low_stock || 0),
    outOfStock: Number(outOfStock[0]?.out_of_stock || 0),
    expiringSoon: Number(expiringSoon[0]?.expiring_soon || 0),
    todaysPurchase: Number(todayPurchase[0]?.today_purchase || 0),
    todaysStockUsage: Number(todayUsage[0]?.today_usage || 0),
    todaysWastage: Number(todayWastage[0]?.today_wastage || 0),
    pendingKitchenRequests: Number(pendingKitchen[0]?.pending_kitchen_requests || 0),
  };
};

const addInventoryLog = async (moduleName, action, details, createdBy = 'system') => {
  await db.query(
    'INSERT INTO inventory_logs (module, action, details, created_by) VALUES (?, ?, ?, ?)',
    [moduleName, action, JSON.stringify(details), createdBy]
  );
};

const createProduct = async (payload = {}) => {
  const currentStock = toNumber(payload.current_stock || payload.opening_stock || 0);
  const purchasePrice = toNumber(payload.purchase_price || 0);
  const sellingPrice = toNumber(payload.selling_price || 0);

  const [result] = await db.query(
    `INSERT INTO inventory_products (
      product_name, sku, barcode, category_id, subcategory_id, unit_id, supplier_id, brand,
      description, image_url, current_stock, minimum_stock, maximum_stock, reorder_level,
      purchase_price, selling_price, storage_location_id, rack, shelf, batch_number,
      manufacturing_date, expiry_date, status
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ? )`,
    [
      payload.product_name || payload.name,
      payload.sku || null,
      payload.barcode || null,
      payload.category_id || null,
      payload.subcategory_id || null,
      payload.unit_id || null,
      payload.supplier_id || null,
      payload.brand || null,
      payload.description || null,
      payload.image_url || null,
      currentStock,
      toNumber(payload.minimum_stock || 0),
      toNumber(payload.maximum_stock || 0),
      toNumber(payload.reorder_level || 0),
      purchasePrice,
      sellingPrice,
      payload.storage_location_id || null,
      payload.rack || null,
      payload.shelf || null,
      payload.batch_number || null,
      payload.manufacturing_date || null,
      payload.expiry_date || null,
      payload.status || 'Active',
    ]
  );

  const productId = result.insertId;
  if (payload.batch_number || payload.batch) {
    await db.query(
      'INSERT INTO product_batches (product_id, batch_number, quantity, purchase_price, manufacturing_date, expiry_date, supplier_id) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [productId, payload.batch_number || payload.batch, currentStock, purchasePrice, payload.manufacturing_date || null, payload.expiry_date || null, payload.supplier_id || null]
    );
  }

  if (currentStock > 0) {
    await db.query(
      'INSERT INTO stock_transactions (product_id, transaction_type, reference_type, reference_id, quantity, unit, previous_stock, new_stock, reason, notes, created_by) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
      [productId, 'PURCHASE', 'PRODUCT', productId, currentStock, payload.unit || 'pcs', 0, currentStock, 'Opening stock', 'Initial inventory load', payload.created_by || 'system']
    );
  }

  await addInventoryLog('products', 'create_product', { product_id: productId, product_name: payload.product_name }, payload.created_by || 'system');
  return { id: productId };
};

const updateProduct = async (productId, payload = {}) => {
  const current = await db.query('SELECT * FROM inventory_products WHERE id = ? AND deleted_at IS NULL', [productId]);
  if (!current[0].length) return null;

  await db.query(
    `UPDATE inventory_products SET
      product_name = ?, sku = ?, barcode = ?, category_id = ?, subcategory_id = ?, unit_id = ?, supplier_id = ?, brand = ?,
      description = ?, image_url = ?, current_stock = ?, minimum_stock = ?, maximum_stock = ?, reorder_level = ?, purchase_price = ?, selling_price = ?,
      storage_location_id = ?, rack = ?, shelf = ?, batch_number = ?, manufacturing_date = ?, expiry_date = ?, status = ?
      WHERE id = ?`,
    [
      payload.product_name || payload.name || current[0][0].product_name,
      payload.sku || current[0][0].sku,
      payload.barcode || current[0][0].barcode,
      payload.category_id || current[0][0].category_id,
      payload.subcategory_id || current[0][0].subcategory_id,
      payload.unit_id || current[0][0].unit_id,
      payload.supplier_id || current[0][0].supplier_id,
      payload.brand || current[0][0].brand,
      payload.description || current[0][0].description,
      payload.image_url || current[0][0].image_url,
      toNumber(payload.current_stock ?? current[0][0].current_stock),
      toNumber(payload.minimum_stock ?? current[0][0].minimum_stock),
      toNumber(payload.maximum_stock ?? current[0][0].maximum_stock),
      toNumber(payload.reorder_level ?? current[0][0].reorder_level),
      toNumber(payload.purchase_price ?? current[0][0].purchase_price),
      toNumber(payload.selling_price ?? current[0][0].selling_price),
      payload.storage_location_id || current[0][0].storage_location_id,
      payload.rack || current[0][0].rack,
      payload.shelf || current[0][0].shelf,
      payload.batch_number || current[0][0].batch_number,
      payload.manufacturing_date || current[0][0].manufacturing_date,
      payload.expiry_date || current[0][0].expiry_date,
      payload.status || current[0][0].status,
      productId,
    ]
  );

  await addInventoryLog('products', 'update_product', { product_id: productId }, payload.created_by || 'system');
  return { id: productId };
};

const deleteProduct = async (productId) => {
  await db.query('UPDATE inventory_products SET deleted_at = NOW() WHERE id = ?', [productId]);
  await addInventoryLog('products', 'delete_product', { product_id: productId }, 'system');
  return true;
};

const createCategory = async (payload = {}) => {
  const [result] = await db.query(
    'INSERT INTO inventory_categories (category_name, description, status, image_url) VALUES (?, ?, ?, ?)',
    [payload.category_name || payload.name, payload.description || '', payload.status || 'Active', payload.image_url || null]
  );
  return { id: result.insertId };
};

const updateCategory = async (categoryId, payload = {}) => {
  await db.query('UPDATE inventory_categories SET category_name = ?, description = ?, status = ?, image_url = ? WHERE id = ?', [payload.category_name || payload.name, payload.description || '', payload.status || 'Active', payload.image_url || null, categoryId]);
  return true;
};

const deleteCategory = async (categoryId) => {
  await db.query('DELETE FROM inventory_categories WHERE id = ?', [categoryId]);
  return true;
};

const createSubcategory = async (payload = {}) => {
  const [result] = await db.query('INSERT INTO inventory_subcategories (category_id, subcategory_name, description, status) VALUES (?, ?, ?, ?)', [payload.category_id, payload.subcategory_name || payload.name, payload.description || '', payload.status || 'Active']);
  return { id: result.insertId };
};

const createUnit = async (payload = {}) => {
  const [result] = await db.query('INSERT INTO inventory_units (unit_name, short_name, status) VALUES (?, ?, ?)', [payload.unit_name || payload.name, payload.short_name || payload.unit || '', payload.status || 'Active']);
  return { id: result.insertId };
};

const createSupplier = async (payload = {}) => {
  const [result] = await db.query(
    'INSERT INTO suppliers (supplier_name, company_name, phone, email, address, gst_number, payment_terms, opening_balance, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
    [payload.supplier_name || payload.name, payload.company_name || '', payload.phone || '', payload.email || '', payload.address || '', payload.gst_number || '', payload.payment_terms || '', toNumber(payload.opening_balance || 0), payload.status || 'Active']
  );
  return { id: result.insertId };
};

const createLocation = async (payload = {}) => {
  const [result] = await db.query('INSERT INTO inventory_locations (location_name, description, rack, shelf, bin, status) VALUES (?, ?, ?, ?, ?, ?)', [payload.location_name || payload.name, payload.description || '', payload.rack || '', payload.shelf || '', payload.bin || '', payload.status || 'Active']);
  return { id: result.insertId };
};

const createPurchase = async (payload = {}) => {
  const purchaseNumber = payload.purchase_number || `PUR-${Date.now()}`;
  const supplierId = payload.supplier_id || null;
  const [purchaseResult] = await db.query(
    'INSERT INTO purchases (purchase_number, invoice_number, supplier_id, purchase_date, subtotal, discount, tax, grand_total, paid_amount, pending_amount, payment_status, status, notes) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
    [
      purchaseNumber,
      payload.invoice_number || '',
      supplierId,
      payload.purchase_date || new Date(),
      toNumber(payload.subtotal || 0),
      toNumber(payload.discount || 0),
      toNumber(payload.tax || 0),
      toNumber(payload.grand_total || 0),
      toNumber(payload.paid_amount || 0),
      toNumber(payload.pending_amount || 0),
      payload.payment_status || 'Pending',
      payload.status || 'Completed',
      payload.notes || '',
    ]
  );

  const purchaseId = purchaseResult.insertId;
  const items = Array.isArray(payload.items) ? payload.items : [];
  for (const item of items) {
    const quantity = toNumber(item.quantity || 0);
    const price = toNumber(item.purchase_price || 0);
    const total = quantity * price;
    await db.query(
      'INSERT INTO purchase_items (purchase_id, product_id, batch_number, expiry_date, quantity, unit, purchase_price, discount, tax, total) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
      [purchaseId, item.product_id, item.batch_number || '', item.expiry_date || null, quantity, item.unit || 'pcs', price, toNumber(item.discount || 0), toNumber(item.tax || 0), total]
    );

    await db.query(
      'UPDATE inventory_products SET current_stock = current_stock + ?, purchase_price = ?, selling_price = COALESCE(selling_price, 0) + 0 WHERE id = ?',
      [quantity, price, item.product_id]
    );

    await db.query(
      'INSERT INTO stock_transactions (product_id, transaction_type, reference_type, reference_id, quantity, unit, previous_stock, new_stock, reason, notes, created_by) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
      [item.product_id, 'PURCHASE', 'PURCHASE', purchaseId, quantity, item.unit || 'pcs', 0, 0, 'Purchase order', `Purchase ${purchaseNumber}`, payload.created_by || 'system']
    );
  }

  return { id: purchaseId, purchase_number: purchaseNumber };
};

const createStockIn = async (payload = {}) => {
  const productId = payload.product_id;
  const quantity = toNumber(payload.quantity || 0);
  const [productRows] = await db.query('SELECT * FROM inventory_products WHERE id = ? AND deleted_at IS NULL', [productId]);
  const previousStock = toNumber(productRows[0]?.current_stock || 0);
  const newStock = previousStock + quantity;

  await db.query('UPDATE inventory_products SET current_stock = ? WHERE id = ?', [newStock, productId]);
  await db.query(
    'INSERT INTO stock_transactions (product_id, batch_id, transaction_type, reference_type, reference_id, quantity, unit, previous_stock, new_stock, reason, notes, created_by) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
    [productId, payload.batch_id || null, 'STOCK_IN', 'STOCK_IN', payload.reference_id || null, quantity, payload.unit || 'pcs', previousStock, newStock, payload.reason || 'Stock in', payload.notes || '', payload.created_by || 'system']
  );
  return { previousStock, newStock };
};

const createStockOut = async (payload = {}) => {
  const productId = payload.product_id;
  const quantity = toNumber(payload.quantity || 0);
  const [productRows] = await db.query('SELECT * FROM inventory_products WHERE id = ? AND deleted_at IS NULL', [productId]);
  const previousStock = toNumber(productRows[0]?.current_stock || 0);
  if (quantity > previousStock) {
    throw new Error(`Insufficient stock. Available stock: ${previousStock}`);
  }

  const newStock = previousStock - quantity;
  await db.query('UPDATE inventory_products SET current_stock = ? WHERE id = ?', [newStock, productId]);
  await db.query(
    'INSERT INTO stock_transactions (product_id, batch_id, transaction_type, reference_type, reference_id, quantity, unit, previous_stock, new_stock, reason, notes, created_by) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
    [productId, payload.batch_id || null, 'STOCK_OUT', 'STOCK_OUT', payload.reference_id || null, quantity, payload.unit || 'pcs', previousStock, newStock, payload.reason || 'Stock out', payload.notes || '', payload.created_by || 'system']
  );
  return { previousStock, newStock };
};

const createTransfer = async (payload = {}) => {
  const quantity = toNumber(payload.quantity || 0);
  const fromRows = await db.query('SELECT * FROM inventory_products WHERE id = ?', [payload.from_product_id || payload.product_id]);
  const previousFrom = toNumber(fromRows[0][0]?.current_stock || 0);
  if (quantity > previousFrom) {
    throw new Error(`Insufficient stock. Available stock: ${previousFrom}`);
  }

  const newSource = previousFrom - quantity;
  await db.query('UPDATE inventory_products SET current_stock = ? WHERE id = ?', [newSource, payload.from_product_id || payload.product_id]);
  await db.query('INSERT INTO stock_transactions (product_id, transaction_type, reference_type, reference_id, quantity, unit, previous_stock, new_stock, from_location_id, to_location_id, reason, notes, created_by) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)', [payload.from_product_id || payload.product_id, 'TRANSFER_OUT', 'TRANSFER', payload.reference_id || null, quantity, payload.unit || 'pcs', previousFrom, newSource, payload.from_location_id || null, payload.to_location_id || null, payload.reason || 'Transfer', payload.notes || '', payload.created_by || 'system']);

  const toProductId = payload.to_product_id || payload.product_id;
  const [toRows] = await db.query('SELECT * FROM inventory_products WHERE id = ?', [toProductId]);
  const previousTo = toNumber(toRows[0]?.current_stock || 0);
  const newTarget = previousTo + quantity;
  await db.query('UPDATE inventory_products SET current_stock = ? WHERE id = ?', [newTarget, toProductId]);
  await db.query('INSERT INTO stock_transactions (product_id, transaction_type, reference_type, reference_id, quantity, unit, previous_stock, new_stock, from_location_id, to_location_id, reason, notes, created_by) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)', [toProductId, 'TRANSFER_IN', 'TRANSFER', payload.reference_id || null, quantity, payload.unit || 'pcs', previousTo, newTarget, payload.from_location_id || null, payload.to_location_id || null, payload.reason || 'Transfer', payload.notes || '', payload.created_by || 'system']);

  return { source_new_stock: newSource, destination_new_stock: newTarget };
};

const createAdjustment = async (payload = {}) => {
  const productId = payload.product_id;
  const adjustedQuantity = toNumber(payload.quantity || 0);
  const [productRows] = await db.query('SELECT * FROM inventory_products WHERE id = ? AND deleted_at IS NULL', [productId]);
  const currentStock = toNumber(productRows[0]?.current_stock || 0);
  const newStock = payload.adjustment_type === 'Reduce Stock' ? currentStock - adjustedQuantity : currentStock + adjustedQuantity;
  if (newStock < 0) {
    throw new Error('Cannot reduce stock below zero.');
  }

  await db.query('UPDATE inventory_products SET current_stock = ? WHERE id = ?', [newStock, productId]);
  await db.query(
    'INSERT INTO stock_adjustments (product_id, adjustment_type, quantity, current_stock, new_stock, reason, notes, date, created_by) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
    [productId, payload.adjustment_type || 'Add Stock', adjustedQuantity, currentStock, newStock, payload.reason || 'Adjustment', payload.notes || '', payload.date || new Date(), payload.created_by || 'system']
  );
  await db.query(
    'INSERT INTO stock_transactions (product_id, transaction_type, reference_type, reference_id, quantity, unit, previous_stock, new_stock, reason, notes, created_by) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
    [productId, payload.adjustment_type === 'Reduce Stock' ? 'ADJUSTMENT_OUT' : 'ADJUSTMENT_IN', 'ADJUSTMENT', null, adjustedQuantity, payload.unit || 'pcs', currentStock, newStock, payload.reason || 'Adjustment', payload.notes || '', payload.created_by || 'system']
  );

  return { currentStock, newStock };
};

const createKitchenRequest = async (payload = {}) => {
  const requestNumber = payload.request_number || `KR-${Date.now()}`;
  const [requestResult] = await db.query('INSERT INTO kitchen_requests (request_number, requested_by, department, request_date, priority, status, notes) VALUES (?, ?, ?, ?, ?, ?, ?)', [requestNumber, payload.requested_by || '', payload.department || 'Kitchen', payload.request_date || new Date(), payload.priority || 'Normal', payload.status || 'Pending', payload.notes || '']);
  const requestId = requestResult.insertId;
  for (const item of payload.items || []) {
    await db.query('INSERT INTO kitchen_request_items (request_id, product_id, quantity, unit) VALUES (?, ?, ?, ?)', [requestId, item.product_id, toNumber(item.quantity || 0), item.unit || 'pcs']);
  }
  return { id: requestId, request_number: requestNumber };
};

const issueKitchenRequest = async (requestId, payload = {}) => {
  const [items] = await db.query('SELECT * FROM kitchen_request_items WHERE request_id = ?', [requestId]);
  for (const item of items) {
    const [productRows] = await db.query('SELECT current_stock FROM inventory_products WHERE id = ?', [item.product_id]);
    const available = toNumber(productRows[0]?.current_stock || 0);
    if (toNumber(item.quantity) > available) {
      throw new Error(`Insufficient stock for product ${item.product_id}. Available stock: ${available}`);
    }
    const newStock = available - toNumber(item.quantity);
    await db.query('UPDATE inventory_products SET current_stock = ? WHERE id = ?', [newStock, item.product_id]);
    await db.query('INSERT INTO stock_transactions (product_id, transaction_type, reference_type, reference_id, quantity, unit, previous_stock, new_stock, reason, notes, created_by) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)', [item.product_id, 'KITCHEN_USAGE', 'KITCHEN_REQUEST', requestId, toNumber(item.quantity), item.unit || 'pcs', available, newStock, 'Kitchen issue', 'Issued from kitchen request', payload.created_by || 'system']);
  }
  await db.query('UPDATE kitchen_requests SET status = ? WHERE id = ?', ['Issued', requestId]);
  return true;
};

const createWastage = async (payload = {}) => {
  const quantity = toNumber(payload.quantity || 0);
  const [productRows] = await db.query('SELECT * FROM inventory_products WHERE id = ? AND deleted_at IS NULL', [payload.product_id]);
  const previousStock = toNumber(productRows[0]?.current_stock || 0);
  const newStock = previousStock - quantity;
  if (newStock < 0) throw new Error('Cannot reduce stock below zero.');

  const [result] = await db.query('INSERT INTO wastages (product_id, batch_number, quantity, unit, reason, wastage_date, estimated_loss, notes) VALUES (?, ?, ?, ?, ?, ?, ?, ?)', [payload.product_id, payload.batch_number || '', quantity, payload.unit || 'pcs', payload.reason || 'Other', payload.wastage_date || new Date(), toNumber(payload.estimated_loss || 0), payload.notes || '']);
  await db.query('UPDATE inventory_products SET current_stock = ? WHERE id = ?', [newStock, payload.product_id]);
  await db.query('INSERT INTO stock_transactions (product_id, transaction_type, reference_type, reference_id, quantity, unit, previous_stock, new_stock, reason, notes, created_by) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)', [payload.product_id, 'WASTAGE', 'WASTAGE', result.insertId, quantity, payload.unit || 'pcs', previousStock, newStock, payload.reason || 'Wastage', payload.notes || '', payload.created_by || 'system']);
  return { previousStock, newStock };
};

const createRecipe = async (payload = {}) => {
  const [result] = await db.query('INSERT INTO recipes (food_name, food_category, selling_price, preparation_time, notes, status) VALUES (?, ?, ?, ?, ?, ?)', [payload.food_name, payload.food_category || '', toNumber(payload.selling_price || 0), payload.preparation_time || '', payload.notes || '', payload.status || 'Active']);
  const recipeId = result.insertId;
  for (const item of payload.ingredients || []) {
    await db.query('INSERT INTO recipe_ingredients (recipe_id, product_id, ingredient_name, quantity, unit) VALUES (?, ?, ?, ?, ?)', [recipeId, item.product_id || null, item.ingredient_name || '', toNumber(item.quantity || 0), item.unit || 'pcs']);
  }
  return { id: recipeId };
};

const getExpiryItems = async () => {
  const [rows] = await db.query('SELECT * FROM inventory_products WHERE deleted_at IS NULL AND expiry_date IS NOT NULL ORDER BY expiry_date ASC');
  return rows.map((item) => ({
    ...item,
    days_remaining: Math.ceil((new Date(item.expiry_date) - new Date()) / (1000 * 60 * 60 * 24)),
  }));
};

const getLowStockItems = async () => {
  const [rows] = await db.query('SELECT * FROM inventory_products WHERE deleted_at IS NULL AND current_stock <= reorder_level ORDER BY current_stock ASC');
  return rows;
};

const getReports = async () => {
  const [stock] = await db.query('SELECT p.product_name, p.current_stock, p.purchase_price, (p.current_stock * p.purchase_price) AS stock_value FROM inventory_products p WHERE p.deleted_at IS NULL ORDER BY p.product_name ASC');
  const [transactions] = await db.query('SELECT * FROM stock_transactions ORDER BY created_at DESC LIMIT 50');
  return { stock, transactions };
};

module.exports = {
  initializeInventorySchema,
  listInventoryCategories,
  listInventorySubcategories,
  listInventoryUnits,
  listInventoryLocations,
  listSuppliers,
  listProducts,
  getInventorySummary,
  createProduct,
  updateProduct,
  deleteProduct,
  createCategory,
  updateCategory,
  deleteCategory,
  createSubcategory,
  createUnit,
  createSupplier,
  createLocation,
  createPurchase,
  createStockIn,
  createStockOut,
  createTransfer,
  createAdjustment,
  createKitchenRequest,
  issueKitchenRequest,
  createWastage,
  createRecipe,
  getExpiryItems,
  getLowStockItems,
  getReports,
};
