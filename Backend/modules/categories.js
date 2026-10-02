const db = require('../config/db');

const initializeCategorySchema = async () => {
  await db.query(`
    CREATE TABLE IF NOT EXISTS categories (
      id INT AUTO_INCREMENT PRIMARY KEY,
      cate_id VARCHAR(32) NOT NULL UNIQUE,
      category_name VARCHAR(150) NOT NULL,
      description TEXT NULL,
      sub_categories LONGTEXT NOT NULL,
      category_image TEXT NULL,
      status VARCHAR(20) NOT NULL DEFAULT 'Active',
      created_by VARCHAR(100) NULL,
      updated_by VARCHAR(100) NULL,
      created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);

  const [columnRows] = await db.query('SHOW COLUMNS FROM categories');
  const columns = new Set(columnRows.map((column) => column.Field));
  const [indexRows] = await db.query('SHOW INDEX FROM categories');
  const indexes = new Set(indexRows.map((index) => index.Key_name));
  const changes = [];

  for (const indexName of ['categories_sort_order_idx', 'categories_name_idx']) {
    if (indexes.has(indexName)) changes.push(`DROP INDEX ${indexName}`);
  }

  if (columns.has('category_id') && !columns.has('cate_id')) {
    if (!columns.has('id')) {
      changes.push('DROP PRIMARY KEY');
      changes.push('CHANGE COLUMN category_id cate_id VARCHAR(32) NOT NULL');
      changes.push('ADD COLUMN id INT NOT NULL AUTO_INCREMENT PRIMARY KEY FIRST');
      changes.push('ADD UNIQUE KEY categories_cate_id_unique (cate_id)');
    } else {
      changes.push('CHANGE COLUMN category_id cate_id VARCHAR(32) NOT NULL');
    }
  } else if (!columns.has('id') && columns.has('cate_id')) {
    changes.push('DROP PRIMARY KEY');
    changes.push('ADD COLUMN id INT NOT NULL AUTO_INCREMENT PRIMARY KEY FIRST');
    changes.push('ADD UNIQUE KEY categories_cate_id_unique (cate_id)');
  }

  for (const columnName of ['category_type', 'sort_order']) {
    if (columns.has(columnName)) changes.push(`DROP COLUMN ${columnName}`);
  }

  if (columns.has('created_date') && !columns.has('created_at')) {
    changes.push('CHANGE COLUMN created_date created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP');
  } else if (!columns.has('created_at')) {
    changes.push('ADD COLUMN created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP');
  }

  if (columns.has('updated_date') && !columns.has('updated_at')) {
    changes.push('CHANGE COLUMN updated_date updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP');
  } else if (!columns.has('updated_at')) {
    changes.push('ADD COLUMN updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP');
  }

  if (changes.length) await db.query(`ALTER TABLE categories ${changes.join(', ')}`);
};

const parseCategory = (category) => {
  if (!category) return null;

  let subCategories = category.sub_categories;
  if (typeof subCategories === 'string') {
    try {
      subCategories = JSON.parse(subCategories);
    } catch {
      subCategories = [];
    }
  }

  return { ...category, sub_categories: Array.isArray(subCategories) ? subCategories : [] };
};

const listCategories = async () => {
  const [rows] = await db.query(`
    SELECT id, cate_id AS category_id, category_name, description, sub_categories,
              category_image, status, created_by, updated_by, created_at, updated_at
            FROM categories ORDER BY created_at DESC, id DESC
  `);
  return rows.map(parseCategory);
};

const findCategoryById = async (categoryId) => {
  const [rows] = await db.execute(
    `SELECT id, cate_id AS category_id, category_name, description, sub_categories,
            category_image, status, created_by, updated_by, created_at, updated_at
     FROM categories WHERE cate_id = ? LIMIT 1`,
    [categoryId]
  );
  return parseCategory(rows[0]);
};

const getNextCategoryId = async () => {
  const [rows] = await db.query(
    "SELECT MAX(CAST(SUBSTRING(cate_id, 4) AS UNSIGNED)) AS last_id FROM categories WHERE cate_id REGEXP '^CAT[0-9]+$'"
  );
  return `CAT${String(Number(rows[0]?.last_id || 0) + 1).padStart(3, '0')}`;
};

const createCategory = async (category) => {
  await db.execute(
    `INSERT INTO categories
      (cate_id, category_name, description, sub_categories, category_image, status, created_by, updated_by)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      category.category_id,
      category.category_name,
      category.description || null,
      JSON.stringify(category.sub_categories),
      category.category_image || null,
      category.status,
      category.created_by || null,
      category.updated_by || null,
    ]
  );
  return findCategoryById(category.category_id);
};

const updateCategory = async (categoryId, category) => {
  const [result] = await db.execute(
    `UPDATE categories
    SET category_name = ?, description = ?, sub_categories = ?, category_image = ?, status = ?, updated_by = ?
     WHERE cate_id = ?`,
    [
      category.category_name,
      category.description || null,
      JSON.stringify(category.sub_categories),
      category.category_image || null,
      category.status,
      category.updated_by || null,
      categoryId,
    ]
  );

  return result.affectedRows ? findCategoryById(categoryId) : null;
};

const deleteCategory = async (categoryId) => {
  const [result] = await db.execute('DELETE FROM categories WHERE cate_id = ?', [categoryId]);
  return result.affectedRows > 0;
};

module.exports = {
  createCategory,
  deleteCategory,
  findCategoryById,
  getNextCategoryId,
  initializeCategorySchema,
  listCategories,
  updateCategory,
};