const db = require('../config/db');

const initializeCartSchema = async () => {
  await db.query(`
    CREATE TABLE IF NOT EXISTS cart (
      id INT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
      user_id VARCHAR(255) NOT NULL,
      customer_name VARCHAR(150) NULL,
      customer_email VARCHAR(255) NULL,
      customer_phone VARCHAR(32) NULL,
      food_id VARCHAR(32) NOT NULL,
      product_name VARCHAR(180) NOT NULL,
      category_name VARCHAR(150) NULL,
      cuisine_name VARCHAR(150) NULL,
      product_image TEXT NULL,
      food_type VARCHAR(20) NOT NULL DEFAULT 'Veg',
      portion_size VARCHAR(50) NOT NULL DEFAULT 'Standard',
      mrp DECIMAL(10,2) NOT NULL DEFAULT 0.00,
      discount DECIMAL(5,2) NOT NULL DEFAULT 0.00,
      price DECIMAL(10,2) NOT NULL DEFAULT 0.00,
      quantity INT UNSIGNED NOT NULL DEFAULT 1,
      total_price DECIMAL(10,2) NOT NULL DEFAULT 0.00,
      selected_addons LONGTEXT NULL,
      selected_customizations LONGTEXT NULL,
      cooking_notes TEXT NULL,
      created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      INDEX cart_user_id_idx (user_id),
      INDEX cart_food_id_idx (food_id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);
};

let schemaInitialized = false;
const ensureSchema = async () => {
  if (!schemaInitialized) {
    await initializeCartSchema();
    schemaInitialized = true;
  }
};

const parseJson = (val, fallback = null) => {
  if (!val) return fallback;
  if (typeof val === 'object') return val;
  try {
    return JSON.parse(val);
  } catch {
    return fallback;
  }
};

const stringifyJson = (val) => {
  if (val === null || val === undefined) return null;
  if (typeof val === 'string') return val;
  try {
    return JSON.stringify(val);
  } catch {
    return null;
  }
};

const parseCartItem = (row) => {
  if (!row) return null;
  return {
    id: row.id,
    user_id: row.user_id,
    customer_name: row.customer_name,
    customer_email: row.customer_email,
    customer_phone: row.customer_phone,
    food_id: row.food_id,
    product_id: row.food_id, // Compatibility alias
    product_name: row.product_name,
    name: row.product_name, // Compatibility alias
    category_name: row.category_name,
    cuisine_name: row.cuisine_name,
    product_image: row.product_image,
    image: row.product_image, // Compatibility alias
    food_type: row.food_type,
    portion_size: row.portion_size,
    size: row.portion_size, // Compatibility alias
    mrp: Number(row.mrp || 0),
    discount: Number(row.discount || 0),
    price: Number(row.price || 0),
    quantity: Number(row.quantity || 1),
    total_price: Number(row.total_price || 0),
    selected_addons: parseJson(row.selected_addons, []),
    selected_customizations: parseJson(row.selected_customizations, {}),
    cooking_notes: row.cooking_notes || '',
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
};

const findUserById = async (userId) => {
  if (!userId) return null;
  try {
    const [rows] = await db.execute(
      'SELECT user_id, username, email, mobile_number FROM users WHERE user_id = ? LIMIT 1',
      [userId]
    );
    return rows[0] || null;
  } catch (err) {
    console.error('Error fetching user for cart:', err.message);
    return null;
  }
};

const addItemToCart = async (itemData) => {
  await ensureSchema();

  const userId = String(itemData.user_id || '').trim();
  const foodId = String(itemData.food_id || itemData.product_id || '').trim();
  const productName = String(itemData.product_name || itemData.name || '').trim();

  if (!userId) throw new Error('user_id is required to add an item to the cart');
  if (!foodId) throw new Error('food_id or product_id is required');
  if (!productName) throw new Error('product_name is required');

  // Lookup user details from DB if not passed
  let customerName = itemData.customer_name || null;
  let customerEmail = itemData.customer_email || null;
  let customerPhone = itemData.customer_phone || null;

  if (!customerName || !customerEmail || !customerPhone) {
    const user = await findUserById(userId);
    if (user) {
      customerName = customerName || user.username || null;
      customerEmail = customerEmail || user.email || null;
      customerPhone = customerPhone || user.mobile_number || null;
    }
  }

  const categoryName = itemData.category_name || null;
  const cuisineName = itemData.cuisine_name || null;
  const productImage = itemData.product_image || itemData.image || null;
  const foodType = itemData.food_type || 'Veg';
  const portionSize = itemData.portion_size || itemData.size || 'Standard';

  const mrp = Number(itemData.mrp || itemData.price || 0);
  const discount = Number(itemData.discount || 0);
  const price = Number(itemData.price || itemData.final_price || mrp || 0);
  const quantity = Math.max(1, parseInt(itemData.quantity || 1, 10));
  const totalPrice = Number((price * quantity).toFixed(2));

  const selectedAddonsStr = stringifyJson(itemData.selected_addons || itemData.selectedAddons || []);
  const selectedCustomizationsStr = stringifyJson(itemData.selected_customizations || itemData.selectedCustomizations || {});
  const cookingNotes = itemData.cooking_notes || itemData.cookingNotes || null;

  // Check if identical item already exists in user's cart (same food, portion, addons, customizations)
  const [existingRows] = await db.execute(
    `SELECT id, quantity, price FROM cart
     WHERE user_id = ?
       AND food_id = ?
       AND portion_size = ?
       AND COALESCE(selected_addons, '') = COALESCE(?, '')
       AND COALESCE(selected_customizations, '') = COALESCE(?, '')
     LIMIT 1`,
    [userId, foodId, portionSize, selectedAddonsStr, selectedCustomizationsStr]
  );

  if (existingRows.length > 0) {
    const existing = existingRows[0];
    const newQty = existing.quantity + quantity;
    const newTotalPrice = Number((newQty * price).toFixed(2));

    await db.execute(
      `UPDATE cart
       SET quantity = ?, total_price = ?, price = ?, customer_name = COALESCE(?, customer_name),
           customer_email = COALESCE(?, customer_email), customer_phone = COALESCE(?, customer_phone),
           cooking_notes = COALESCE(?, cooking_notes), updated_at = NOW()
       WHERE id = ?`,
      [newQty, newTotalPrice, price, customerName, customerEmail, customerPhone, cookingNotes, existing.id]
    );

    const [updatedRow] = await db.execute('SELECT * FROM cart WHERE id = ?', [existing.id]);
    return parseCartItem(updatedRow[0]);
  }

  // Insert new cart item
  const [result] = await db.execute(
    `INSERT INTO cart (
       user_id, customer_name, customer_email, customer_phone,
       food_id, product_name, category_name, cuisine_name, product_image,
       food_type, portion_size, mrp, discount, price, quantity, total_price,
       selected_addons, selected_customizations, cooking_notes
     ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      userId,
      customerName,
      customerEmail,
      customerPhone,
      foodId,
      productName,
      categoryName,
      cuisineName,
      productImage,
      foodType,
      portionSize,
      mrp,
      discount,
      price,
      quantity,
      totalPrice,
      selectedAddonsStr,
      selectedCustomizationsStr,
      cookingNotes,
    ]
  );

  const [insertedRow] = await db.execute('SELECT * FROM cart WHERE id = ?', [result.insertId]);
  return parseCartItem(insertedRow[0]);
};

const getCartByUserId = async (userId) => {
  await ensureSchema();
  if (!userId) return { items: [], total_amount: 0, total_items: 0 };

  const [rows] = await db.execute(
    'SELECT * FROM cart WHERE user_id = ? ORDER BY created_at DESC, id DESC',
    [userId]
  );

  const items = rows.map(parseCartItem);
  const totalAmount = Number(items.reduce((sum, item) => sum + (item.total_price || 0), 0).toFixed(2));
  const totalQuantity = items.reduce((sum, item) => sum + (item.quantity || 0), 0);

  return {
    items,
    total_amount: totalAmount,
    total_items: items.length,
    total_quantity: totalQuantity,
  };
};

const updateCartItemQuantity = async (cartItemId, quantity, priceOverride = null) => {
  await ensureSchema();
  const id = parseInt(cartItemId, 10);
  if (!id) throw new Error('Invalid cart item id');

  const [rows] = await db.execute('SELECT * FROM cart WHERE id = ? LIMIT 1', [id]);
  if (rows.length === 0) throw new Error('Cart item not found');

  const current = rows[0];
  const qty = Math.max(1, parseInt(quantity, 10));
  const unitPrice = priceOverride !== null ? Number(priceOverride) : Number(current.price);
  const totalPrice = Number((qty * unitPrice).toFixed(2));

  await db.execute(
    'UPDATE cart SET quantity = ?, price = ?, total_price = ?, updated_at = NOW() WHERE id = ?',
    [qty, unitPrice, totalPrice, id]
  );

  const [updatedRows] = await db.execute('SELECT * FROM cart WHERE id = ?', [id]);
  return parseCartItem(updatedRows[0]);
};

const deleteCartItem = async (cartItemId) => {
  await ensureSchema();
  const id = parseInt(cartItemId, 10);
  if (!id) throw new Error('Invalid cart item id');

  const [result] = await db.execute('DELETE FROM cart WHERE id = ?', [id]);
  return result.affectedRows > 0;
};

const clearCartByUserId = async (userId) => {
  await ensureSchema();
  if (!userId) throw new Error('user_id is required');

  const [result] = await db.execute('DELETE FROM cart WHERE user_id = ?', [userId]);
  return result.affectedRows >= 0;
};

module.exports = {
  initializeCartSchema,
  addItemToCart,
  getCartByUserId,
  updateCartItemQuantity,
  deleteCartItem,
  clearCartByUserId,
  findUserById,
};
