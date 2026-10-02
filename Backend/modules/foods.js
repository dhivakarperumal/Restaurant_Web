const db = require('../config/db');

const initializeFoodSchema = async () => {
  await db.query(`
    CREATE TABLE IF NOT EXISTS foods (
      id INT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
      food_id VARCHAR(32) NOT NULL UNIQUE,
      food_name VARCHAR(180) NOT NULL,
      cuisine_id VARCHAR(32) NOT NULL,
      cuisine_name VARCHAR(150) NOT NULL,
      category_id VARCHAR(32) NOT NULL,
      category_name VARCHAR(150) NOT NULL,
      subcategory_name VARCHAR(150) NOT NULL,
      description TEXT NULL,
      food_images LONGTEXT NOT NULL,
      mrp DECIMAL(10,2) NOT NULL DEFAULT 0,
      discount DECIMAL(5,2) NOT NULL DEFAULT 0,
      final_price DECIMAL(10,2) NOT NULL DEFAULT 0,
      rating DECIMAL(2,1) NOT NULL DEFAULT 0,
      stock_quantity INT UNSIGNED NOT NULL DEFAULT 0,
      serving_size VARCHAR(100) NULL,
      portion_size VARCHAR(30) NOT NULL,
      preparation_time SMALLINT UNSIGNED NOT NULL DEFAULT 0,
      food_type VARCHAR(20) NOT NULL,
      is_spicy TINYINT(1) NOT NULL DEFAULT 0,
      is_available TINYINT(1) NOT NULL DEFAULT 1,
      dining_available TINYINT(1) NOT NULL DEFAULT 1,
      takeaway_available TINYINT(1) NOT NULL DEFAULT 1,
      delivery_available TINYINT(1) NOT NULL DEFAULT 1,
      featured TINYINT(1) NOT NULL DEFAULT 0,
      status VARCHAR(20) NOT NULL DEFAULT 'Active',
      addons LONGTEXT NOT NULL,
      customizations LONGTEXT NOT NULL,
      created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      created_by VARCHAR(100) NOT NULL,
      updated_by VARCHAR(100) NOT NULL,
      INDEX foods_category_idx (category_id),
      INDEX foods_cuisine_idx (cuisine_id),
      INDEX foods_status_idx (status)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);

  const [ratingColumns] = await db.query("SHOW COLUMNS FROM foods LIKE 'rating'");
  if (!ratingColumns.length) {
    await db.query('ALTER TABLE foods ADD COLUMN rating DECIMAL(2,1) NOT NULL DEFAULT 0 AFTER final_price');
  }

  const [stockColumns] = await db.query("SHOW COLUMNS FROM foods LIKE 'stock_quantity'");
  if (!stockColumns.length) {
    await db.query('ALTER TABLE foods ADD COLUMN stock_quantity INT UNSIGNED NOT NULL DEFAULT 0 AFTER rating');
  }
};

const parseJson = (value, fallback) => {
  if (Array.isArray(value)) return value;
  if (value && typeof value === 'object') return value;
  try {
    return JSON.parse(value || '');
  } catch {
    return fallback;
  }
};

const parseFood = (food) => {
  if (!food) return null;
  return {
    ...food,
    food_images: parseJson(food.food_images, []),
    addons: parseJson(food.addons, []),
    customizations: parseJson(food.customizations, []),
    is_spicy: Boolean(food.is_spicy),
    is_available: Boolean(food.is_available),
    dining_available: Boolean(food.dining_available),
    takeaway_available: Boolean(food.takeaway_available),
    delivery_available: Boolean(food.delivery_available),
    featured: Boolean(food.featured),
  };
};

const listFoods = async () => {
  const [rows] = await db.query('SELECT * FROM foods ORDER BY created_at DESC, id DESC');
  return rows.map(parseFood);
};

const findFoodById = async (foodId) => {
  const [rows] = await db.execute('SELECT * FROM foods WHERE food_id = ? LIMIT 1', [foodId]);
  return parseFood(rows[0]);
};

const getNextFoodId = async () => {
  const [rows] = await db.query(
    "SELECT MAX(CAST(SUBSTRING(food_id, 5) AS UNSIGNED)) AS last_id FROM foods WHERE food_id REGEXP '^FOOD[0-9]+$'"
  );
  return `FOOD${String(Number(rows[0]?.last_id || 0) + 1).padStart(3, '0')}`;
};

const foodValues = (food) => [
  food.food_id,
  food.food_name,
  food.cuisine_id,
  food.cuisine_name,
  food.category_id,
  food.category_name,
  food.subcategory_name,
  food.description || null,
  JSON.stringify(food.food_images),
  food.mrp,
  food.discount,
  food.final_price,
  food.rating,
  food.stock_quantity,
  food.serving_size || null,
  food.portion_size,
  food.preparation_time,
  food.food_type,
  Number(food.is_spicy),
  Number(food.is_available),
  Number(food.dining_available),
  Number(food.takeaway_available),
  Number(food.delivery_available),
  Number(food.featured),
  food.status,
  JSON.stringify(food.addons),
  JSON.stringify(food.customizations),
  food.created_by,
  food.updated_by,
];

const createFood = async (food) => {
  await db.execute(
    `INSERT INTO foods (
      food_id, food_name, cuisine_id, cuisine_name, category_id, category_name, subcategory_name,
      description, food_images, mrp, discount, final_price, rating, stock_quantity, serving_size, portion_size,
      preparation_time, food_type, is_spicy, is_available, dining_available, takeaway_available,
      delivery_available, featured, status, addons, customizations, created_by, updated_by
    ) VALUES (${Array(29).fill('?').join(', ')})`,
    foodValues(food)
  );
  return findFoodById(food.food_id);
};

const updateFood = async (foodId, food) => {
  if (!await findFoodById(foodId)) return null;
  const values = foodValues({ ...food, food_id: foodId });
  values.shift();
  await db.execute(
    `UPDATE foods SET
      food_name = ?, cuisine_id = ?, cuisine_name = ?, category_id = ?, category_name = ?, subcategory_name = ?,
      description = ?, food_images = ?, mrp = ?, discount = ?, final_price = ?, rating = ?, stock_quantity = ?, serving_size = ?, portion_size = ?,
      preparation_time = ?, food_type = ?, is_spicy = ?, is_available = ?, dining_available = ?, takeaway_available = ?,
      delivery_available = ?, featured = ?, status = ?, addons = ?, customizations = ?, updated_by = ?
     WHERE food_id = ?`,
    [...values.slice(0, -2), food.updated_by, foodId]
  );
  return findFoodById(foodId);
};

const deleteFood = async (foodId) => {
  const [result] = await db.execute('DELETE FROM foods WHERE food_id = ?', [foodId]);
  return result.affectedRows > 0;
};

module.exports = {
  createFood,
  deleteFood,
  findFoodById,
  getNextFoodId,
  initializeFoodSchema,
  listFoods,
  updateFood,
};
