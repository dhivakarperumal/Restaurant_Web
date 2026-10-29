const db = require('../config/db');
const { MEAL_TYPES, getFoodAvailability } = require('./foodAvailability');

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
      meal_type VARCHAR(20) NOT NULL DEFAULT 'Evening Snacks',
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
      available_time VARCHAR(100) NOT NULL DEFAULT '10:00 AM - 1:00 PM',
      food_type VARCHAR(20) NOT NULL,
      is_spicy TINYINT(1) NOT NULL DEFAULT 0,
      is_available TINYINT(1) NOT NULL DEFAULT 1,
      is_menu_visible TINYINT(1) NOT NULL DEFAULT 1,
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

  const [menuVisibilityColumns] = await db.query("SHOW COLUMNS FROM foods LIKE 'is_menu_visible'");
  if (!menuVisibilityColumns.length) {
    await db.query('ALTER TABLE foods ADD COLUMN is_menu_visible TINYINT(1) NOT NULL DEFAULT 1 AFTER is_available');
  }

  const [availableTimeColumns] = await db.query("SHOW COLUMNS FROM foods LIKE 'available_time'");
  if (!availableTimeColumns.length) {
    await db.query("ALTER TABLE foods ADD COLUMN available_time VARCHAR(100) NOT NULL DEFAULT '10:00 AM - 1:00 PM' AFTER preparation_time");
  }

  const [mealTypeColumns] = await db.query("SHOW COLUMNS FROM foods LIKE 'meal_type'");
  if (!mealTypeColumns.length) {
    await db.query("ALTER TABLE foods ADD COLUMN meal_type VARCHAR(20) NOT NULL DEFAULT 'Evening Snacks' AFTER category_name");
  } else if (mealTypeColumns[0].Default !== 'Evening Snacks') {
    await db.query("ALTER TABLE foods MODIFY COLUMN meal_type VARCHAR(20) NOT NULL DEFAULT 'Evening Snacks'");
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

const parseFood = (food, localMinutes) => {
  if (!food) return null;
  const now = new Date();
  const currentLocalMinutes = localMinutes ?? now.getHours() * 60 + now.getMinutes();
  const parsedFood = {
    ...food,
    food_images: parseJson(food.food_images, []),
    addons: parseJson(food.addons, []),
    customizations: parseJson(food.customizations, []),
    is_spicy: Boolean(food.is_spicy),
    is_available: Boolean(food.is_available),
    is_menu_visible: Boolean(food.is_menu_visible),
    dining_available: Boolean(food.dining_available),
    takeaway_available: Boolean(food.takeaway_available),
    delivery_available: Boolean(food.delivery_available),
    featured: Boolean(food.featured),
  };
  return { ...parsedFood, ...getFoodAvailability(parsedFood, currentLocalMinutes) };
};

const listFoods = async (localMinutes) => {
  const [rows] = await db.query('SELECT * FROM foods ORDER BY created_at DESC, id DESC');
  return rows.map((food) => parseFood(food, localMinutes));
};

const findFoodById = async (foodId, localMinutes) => {
  const [rows] = await db.execute('SELECT * FROM foods WHERE food_id = ? LIMIT 1', [foodId]);
  return parseFood(rows[0], localMinutes);
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
  food.meal_type,
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
  food.available_time,
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
      food_id, food_name, cuisine_id, cuisine_name, category_id, category_name, meal_type, subcategory_name,
      description, food_images, mrp, discount, final_price, rating, stock_quantity, serving_size, portion_size,
      preparation_time, available_time, food_type, is_spicy, is_available, dining_available, takeaway_available,
      delivery_available, featured, status, addons, customizations, created_by, updated_by
    ) VALUES (${Array(31).fill('?').join(', ')})`,
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
      food_name = ?, cuisine_id = ?, cuisine_name = ?, category_id = ?, category_name = ?, meal_type = ?, subcategory_name = ?,
      description = ?, food_images = ?, mrp = ?, discount = ?, final_price = ?, rating = ?, stock_quantity = ?, serving_size = ?, portion_size = ?,
      preparation_time = ?, available_time = ?, food_type = ?, is_spicy = ?, is_available = ?, dining_available = ?, takeaway_available = ?,
      delivery_available = ?, featured = ?, status = ?, addons = ?, customizations = ?, updated_by = ?
     WHERE food_id = ?`,
    [...values.slice(0, -2), food.updated_by, foodId]
  );
  return findFoodById(foodId);
};

const setFoodMenuVisibility = async (foodId, visible, updatedBy = 'system') => {
  const [result] = await db.execute(
    'UPDATE foods SET is_menu_visible = ?, updated_by = ? WHERE food_id = ?',
    [Number(visible), updatedBy, foodId]
  );
  if (!result.affectedRows) return null;
  return findFoodById(foodId);
};


const setFoodAvailability = async (foodId, updates = {}, updatedBy = 'system') => {
  const fields = [];
  const values = [];

  if (typeof updates.is_available === 'boolean') {
    fields.push('is_available = ?');
    values.push(Number(updates.is_available));
    if (updates.is_available && updates.stock_quantity === undefined) {
      fields.push('stock_quantity = CASE WHEN stock_quantity <= 0 THEN 50 ELSE stock_quantity END');
    }
  }

  if (typeof updates.meal_type === 'string' && MEAL_TYPES.includes(updates.meal_type.trim())) {
    fields.push('meal_type = ?');
    values.push(updates.meal_type.trim());
  }

  if (typeof updates.available_time === 'string' && updates.available_time.trim().length > 0 && updates.available_time.trim().length <= 100) {
    fields.push('available_time = ?');
    values.push(updates.available_time.trim());
  }

  if (Number.isInteger(updates.stock_quantity) && updates.stock_quantity >= 0) {
    fields.push('stock_quantity = ?');
    values.push(updates.stock_quantity);
  }

  if (!fields.length) return null;

  fields.push('updated_by = ?');
  values.push(updatedBy);
  values.push(foodId);

  const [result] = await db.execute(
    `UPDATE foods SET ${fields.join(', ')} WHERE food_id = ?`,
    values
  );
  if (!result.affectedRows) return null;
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
  setFoodAvailability,
  setFoodMenuVisibility,
  updateFood,
};
