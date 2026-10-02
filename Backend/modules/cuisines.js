const db = require('../config/db');

const initializeCuisineSchema = async () => {
  await db.query(`
    CREATE TABLE IF NOT EXISTS cuisines (
      id INT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
      cuisine_id VARCHAR(32) NOT NULL UNIQUE,
      cuisine_name VARCHAR(150) NOT NULL,
      description TEXT NULL,
      image TEXT NULL,
      status VARCHAR(20) NOT NULL DEFAULT 'Active',
      featured TINYINT(1) NOT NULL DEFAULT 0,
      created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      created_by VARCHAR(100) NULL,
      updated_by VARCHAR(100) NULL
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);

  const [columns] = await db.query('SHOW COLUMNS FROM cuisines');
  if (columns.some((column) => column.Field === 'display_order')) {
    await db.query('ALTER TABLE cuisines DROP COLUMN display_order');
  }
};

const listCuisines = async () => {
  const [rows] = await db.query('SELECT * FROM cuisines ORDER BY created_at DESC, id DESC');
  return rows.map((cuisine) => ({ ...cuisine, featured: Boolean(cuisine.featured) }));
};

const findCuisineById = async (cuisineId) => {
  const [rows] = await db.execute('SELECT * FROM cuisines WHERE cuisine_id = ? LIMIT 1', [cuisineId]);
  return rows[0] ? { ...rows[0], featured: Boolean(rows[0].featured) } : null;
};

const getNextCuisineId = async () => {
  const [rows] = await db.query(
    "SELECT MAX(CAST(SUBSTRING(cuisine_id, 4) AS UNSIGNED)) AS last_id FROM cuisines WHERE cuisine_id REGEXP '^CUS[0-9]+$'"
  );
  return `CUS${String(Number(rows[0]?.last_id || 0) + 1).padStart(3, '0')}`;
};

const createCuisine = async (cuisine) => {
  await db.execute(
    `INSERT INTO cuisines
      (cuisine_id, cuisine_name, description, image, status, featured, created_by, updated_by)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      cuisine.cuisine_id,
      cuisine.cuisine_name,
      cuisine.description || null,
      cuisine.image || null,
      cuisine.status,
      cuisine.featured ? 1 : 0,
      cuisine.created_by || null,
      cuisine.updated_by || null,
    ]
  );
  return findCuisineById(cuisine.cuisine_id);
};

const updateCuisine = async (cuisineId, cuisine) => {
  await db.execute(
    `UPDATE cuisines
    SET cuisine_name = ?, description = ?, image = ?, status = ?, featured = ?, updated_by = ?
     WHERE cuisine_id = ?`,
    [
      cuisine.cuisine_name,
      cuisine.description || null,
      cuisine.image || null,
      cuisine.status,
      cuisine.featured ? 1 : 0,
      cuisine.updated_by || null,
      cuisineId,
    ]
  );
  return findCuisineById(cuisineId);
};

const deleteCuisine = async (cuisineId) => {
  const [result] = await db.execute('DELETE FROM cuisines WHERE cuisine_id = ?', [cuisineId]);
  return result.affectedRows > 0;
};

module.exports = {
  createCuisine,
  deleteCuisine,
  findCuisineById,
  getNextCuisineId,
  initializeCuisineSchema,
  listCuisines,
  updateCuisine,
};