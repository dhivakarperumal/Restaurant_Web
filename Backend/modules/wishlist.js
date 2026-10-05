const db = require('../config/db');

const foodSnapshotColumns = {
  food_name: "VARCHAR(180) NOT NULL DEFAULT ''",
  cuisine_id: "VARCHAR(32) NOT NULL DEFAULT ''",
  cuisine_name: "VARCHAR(150) NOT NULL DEFAULT ''",
  category_id: "VARCHAR(32) NOT NULL DEFAULT ''",
  category_name: "VARCHAR(150) NOT NULL DEFAULT ''",
  subcategory_name: "VARCHAR(150) NOT NULL DEFAULT ''",
  description: 'TEXT NULL',
  food_images: 'LONGTEXT NULL',
  mrp: 'DECIMAL(10,2) NOT NULL DEFAULT 0',
  discount: 'DECIMAL(5,2) NOT NULL DEFAULT 0',
  final_price: 'DECIMAL(10,2) NOT NULL DEFAULT 0',
  rating: 'DECIMAL(2,1) NOT NULL DEFAULT 0',
  stock_quantity: 'INT UNSIGNED NOT NULL DEFAULT 0',
  serving_size: 'VARCHAR(100) NULL',
  portion_size: "VARCHAR(30) NOT NULL DEFAULT 'Standard'",
  preparation_time: 'SMALLINT UNSIGNED NOT NULL DEFAULT 0',
  food_type: "VARCHAR(20) NOT NULL DEFAULT 'Veg'",
  is_spicy: 'TINYINT(1) NOT NULL DEFAULT 0',
  is_available: 'TINYINT(1) NOT NULL DEFAULT 1',
  dining_available: 'TINYINT(1) NOT NULL DEFAULT 1',
  takeaway_available: 'TINYINT(1) NOT NULL DEFAULT 1',
  delivery_available: 'TINYINT(1) NOT NULL DEFAULT 1',
  featured: 'TINYINT(1) NOT NULL DEFAULT 0',
  status: "VARCHAR(20) NOT NULL DEFAULT 'Active'",
  addons: 'LONGTEXT NULL',
  customizations: 'LONGTEXT NULL',
  food_created_at: 'DATETIME NULL',
  food_updated_at: 'DATETIME NULL',
  created_by: 'VARCHAR(100) NULL',
  updated_by: 'VARCHAR(100) NULL',
  food_snapshot: 'LONGTEXT NULL',
};

const initializeWishlistSchema = async () => {
  const snapshotDefinition = Object.entries(foodSnapshotColumns)
    .map(([column, definition]) => `\`${column}\` ${definition}`)
    .join(',\n      ');
  await db.query(`
    CREATE TABLE IF NOT EXISTS wishlists (
      id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
      user_id VARCHAR(255) NOT NULL,
      food_id VARCHAR(32) NOT NULL,
      ${snapshotDefinition},
      created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      UNIQUE KEY wishlists_user_food_unique (user_id, food_id),
      INDEX wishlists_user_id_idx (user_id),
      INDEX wishlists_food_id_idx (food_id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);

  const [existingColumns] = await db.query('SHOW COLUMNS FROM wishlists');
  const existingColumnNames = new Set(existingColumns.map((column) => column.Field));
  for (const [column, definition] of Object.entries(foodSnapshotColumns)) {
    if (!existingColumnNames.has(column)) {
      await db.query(`ALTER TABLE wishlists ADD COLUMN \`${column}\` ${definition}`);
    }
  }

  const snapshotFieldNames = Object.keys(foodSnapshotColumns);
  const copyFoodFields = snapshotFieldNames
    .filter((column) => column !== 'food_snapshot' && column !== 'food_created_at' && column !== 'food_updated_at')
    .map((column) => `w.\`${column}\` = f.\`${column}\``)
    .concat([
      'w.food_created_at = f.created_at',
      'w.food_updated_at = f.updated_at',
    ]);
  await db.query(`
    UPDATE wishlists w
    INNER JOIN foods f ON f.food_id = w.food_id
    SET ${copyFoodFields.join(', ')}
    WHERE w.food_name = '' OR w.food_name IS NULL
  `);
};

const parseJson = (value, fallback) => {
  if (Array.isArray(value) || (value && typeof value === 'object')) return value;
  try {
    return JSON.parse(value || '');
  } catch {
    return fallback;
  }
};

const parseWishlistItem = (row) => {
  const foodSnapshot = parseJson(row.food_snapshot, null);
  const images = parseJson(row.food_images, []);
  const image = images[0] || '';
  return {
    ...row,
    ...(foodSnapshot && typeof foodSnapshot === 'object' ? foodSnapshot : {}),
    id: row.id,
    user_id: row.user_id,
    food_id: row.food_id,
    created_at: row.created_at,
    saved_at: row.created_at,
    product_id: row.food_id,
    item_name: row.food_name,
    product_name: row.food_name,
    food_images: images,
    image,
    product_image: image,
    addons: parseJson(row.addons, []),
    customizations: parseJson(row.customizations, []),
    mrp: Number(row.mrp || 0),
    discount: Number(row.discount || 0),
    final_price: Number(row.final_price || 0),
    rating: Number(row.rating || 0),
    stock_quantity: Number(row.stock_quantity || 0),
    preparation_time: Number(row.preparation_time || 0),
    is_spicy: Boolean(row.is_spicy),
    is_available: Boolean(row.is_available),
    dining_available: Boolean(row.dining_available),
    takeaway_available: Boolean(row.takeaway_available),
    delivery_available: Boolean(row.delivery_available),
    featured: Boolean(row.featured),
  };
};

const getWishlistByUserId = async (userId) => {
  const [rows] = await db.execute(
    `SELECT *
     FROM wishlists
     WHERE user_id = ?
     ORDER BY created_at DESC, id DESC`,
    [userId]
  );
  return rows.map(parseWishlistItem);
};

const addFoodToWishlist = async (userId, food) => {
  const foodId = food.food_id;
  const columns = [
    'user_id',
    'food_id',
    ...Object.keys(foodSnapshotColumns),
  ];
  const values = [
    userId,
    foodId,
    food.food_name,
    food.cuisine_id,
    food.cuisine_name,
    food.category_id,
    food.category_name,
    food.subcategory_name,
    food.description || null,
    JSON.stringify(food.food_images || []),
    Number(food.mrp || 0),
    Number(food.discount || 0),
    Number(food.final_price || 0),
    Number(food.rating || 0),
    Number(food.stock_quantity || 0),
    food.serving_size || null,
    food.portion_size || 'Standard',
    Number(food.preparation_time || 0),
    food.food_type || 'Veg',
    Number(Boolean(food.is_spicy)),
    Number(Boolean(food.is_available)),
    Number(Boolean(food.dining_available)),
    Number(Boolean(food.takeaway_available)),
    Number(Boolean(food.delivery_available)),
    Number(Boolean(food.featured)),
    food.status || 'Active',
    JSON.stringify(food.addons || []),
    JSON.stringify(food.customizations || []),
    food.created_at || null,
    food.updated_at || null,
    food.created_by || null,
    food.updated_by || null,
    JSON.stringify(food),
  ];
  const updateColumns = columns.slice(2).map((column) => `\`${column}\` = VALUES(\`${column}\`)`);
  await db.execute(
    `INSERT INTO wishlists (${columns.map((column) => `\`${column}\``).join(', ')})
     VALUES (${columns.map(() => '?').join(', ')})
     ON DUPLICATE KEY UPDATE ${updateColumns.join(', ')}`,
    values
  );
};

const removeFoodFromWishlist = async (userId, foodId) => {
  const [result] = await db.execute(
    'DELETE FROM wishlists WHERE user_id = ? AND food_id = ?',
    [userId, foodId]
  );
  return result.affectedRows > 0;
};

module.exports = {
  addFoodToWishlist,
  getWishlistByUserId,
  initializeWishlistSchema,
  removeFoodFromWishlist,
};
