const db = require('../config/db');

const CATEGORY_ID_LOCK = 'restaurant_categories_id';

const initializeCategorySchema = async () => {
  await db.query(`
    CREATE TABLE IF NOT EXISTS categories (
      id INT AUTO_INCREMENT PRIMARY KEY,
      category_id VARCHAR(32) NOT NULL UNIQUE,
      category_name VARCHAR(150) NOT NULL,
      description TEXT NULL,
      sub_categories LONGTEXT NOT NULL,
      category_image TEXT NULL,
      status VARCHAR(20) NOT NULL DEFAULT 'Active',
      sort_order INT NOT NULL DEFAULT 0,
      created_by VARCHAR(100) NULL,
      updated_by VARCHAR(100) NULL,
      created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);

  const [columnRows] = await db.query('SHOW COLUMNS FROM categories');
  const columns = new Set(columnRows.map((column) => column.Field));
  const [existingIndexes] = await db.query('SHOW INDEX FROM categories');
  const changes = [];

  if (columns.has('cate_id') && !columns.has('category_id')) {
    changes.push('CHANGE COLUMN cate_id category_id VARCHAR(32) NOT NULL');
    columns.delete('cate_id');
    columns.add('category_id');
  } else if (!columns.has('category_id')) {
    changes.push(
      columns.has('id')
        ? 'ADD COLUMN category_id VARCHAR(32) NULL AFTER id'
        : 'ADD COLUMN category_id VARCHAR(32) NULL FIRST',
    );
    columns.add('category_id');
  }

  if (!columns.has('id')) {
    if (existingIndexes.some((index) => index.Key_name === 'PRIMARY')) {
      changes.push('DROP PRIMARY KEY');
    }
    changes.push('ADD COLUMN id INT NOT NULL AUTO_INCREMENT PRIMARY KEY FIRST');
    columns.add('id');
  }
  if (!columns.has('description')) {
    changes.push('ADD COLUMN description TEXT NULL');
  }
  if (!columns.has('category_name')) {
    changes.push("ADD COLUMN category_name VARCHAR(150) NOT NULL DEFAULT ''");
  }
  if (!columns.has('sub_categories')) {
    changes.push("ADD COLUMN sub_categories LONGTEXT NOT NULL DEFAULT '[]'");
  }
  if (!columns.has('category_image')) {
    changes.push('ADD COLUMN category_image TEXT NULL');
  }
  if (!columns.has('status')) {
    changes.push("ADD COLUMN status VARCHAR(20) NOT NULL DEFAULT 'Active'");
  }
  if (!columns.has('sort_order')) {
    changes.push('ADD COLUMN sort_order INT NOT NULL DEFAULT 0');
  }
  if (!columns.has('created_at') && columns.has('created_date')) {
    changes.push('CHANGE COLUMN created_date created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP');
  } else if (!columns.has('created_at')) {
    changes.push('ADD COLUMN created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP');
  }
  if (!columns.has('updated_at') && columns.has('updated_date')) {
    changes.push('CHANGE COLUMN updated_date updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP');
  } else if (!columns.has('updated_at')) {
    changes.push('ADD COLUMN updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP');
  }
  if (!columns.has('created_by')) {
    changes.push('ADD COLUMN created_by VARCHAR(100) NULL');
  }
  if (!columns.has('updated_by')) {
    changes.push('ADD COLUMN updated_by VARCHAR(100) NULL');
  }

  if (changes.length) {
    await db.query(`ALTER TABLE categories ${changes.join(', ')}`);
  }

  const [indexRows] = await db.query('SHOW INDEX FROM categories');
  const hasUniqueCategoryId = indexRows.some(
    (index) => index.Column_name === 'category_id' && Number(index.Non_unique) === 0,
  );
  if (!hasUniqueCategoryId) {
    await db.query(
      'ALTER TABLE categories ADD UNIQUE KEY categories_category_id_unique (category_id)',
    );
  }

  const [duplicateNames] = await db.query(`
    SELECT LOWER(TRIM(category_name)) AS normalized_name
    FROM categories
    GROUP BY LOWER(TRIM(category_name))
    HAVING COUNT(*) > 1
    LIMIT 1
  `);
  const [indexes] = await db.query('SHOW INDEX FROM categories');
  const hasNameUniqueIndex = indexes.some(
    (index) => index.Column_name === 'category_name' && Number(index.Non_unique) === 0,
  );
  if (!duplicateNames.length && !hasNameUniqueIndex) {
    await db.query(
      'ALTER TABLE categories ADD UNIQUE KEY categories_category_name_unique (category_name)',
    );
  } else if (duplicateNames.length && !hasNameUniqueIndex) {
    console.warn(
      'Category names are not unique in existing data; duplicate names will be checked by the API.',
    );
  }

  await db.query(`
    CREATE TABLE IF NOT EXISTS category_id_sequence (
      id INT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
      reserved_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
    ) ENGINE=InnoDB
  `);
  const [categoryIds] = await db.query(`
    SELECT MAX(CAST(SUBSTRING(category_id, 4) AS UNSIGNED)) AS last_id
    FROM categories
    WHERE category_id REGEXP '^CAT[0-9]+$'
  `);
  const [sequenceIds] = await db.query(
    'SELECT COALESCE(MAX(id), 0) AS last_id FROM category_id_sequence',
  );
  const nextId =
    Math.max(
      Number(categoryIds[0]?.last_id || 0),
      Number(sequenceIds[0]?.last_id || 0),
    ) + 1;
  await db.query(`ALTER TABLE category_id_sequence AUTO_INCREMENT = ${nextId}`);
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

  return {
    ...category,
    sub_categories: Array.isArray(subCategories) ? subCategories : [],
  };
};

const listCategories = async () => {
  const [rows] = await db.query(`
    SELECT id, category_id, category_name, description, sub_categories,
           category_image, status, sort_order, created_by, updated_by,
           created_at, updated_at
    FROM categories
    ORDER BY created_at DESC, id DESC
  `);
  return rows.map(parseCategory);
};

const findCategoryById = async (categoryId) => {
  const [rows] = await db.execute(
    `SELECT id, category_id, category_name, description, sub_categories,
            category_image, status, sort_order, created_by, updated_by,
            created_at, updated_at
     FROM categories WHERE category_id = ? LIMIT 1`,
    [categoryId],
  );
  return parseCategory(rows[0]);
};

const getNextCategoryId = async () => {
  const connection = await db.getConnection();
  try {
    const [result] = await connection.execute(
      'INSERT INTO category_id_sequence () VALUES ()',
    );
    return `CAT${String(result.insertId).padStart(3, '0')}`;
  } finally {
    connection.release();
  }
};

const hasCategoryName = async (categoryName, excludeCategoryId = '') => {
  const [rows] = await db.execute(
    `SELECT id
     FROM categories
     WHERE LOWER(TRIM(category_name)) = LOWER(TRIM(?))
       AND (? = '' OR category_id <> ?)
     LIMIT 1`,
    [categoryName, excludeCategoryId, excludeCategoryId],
  );
  return rows.length > 0;
};

const createCategory = async (category) => {
  const connection = await db.getConnection();
  let lockAcquired = false;
  try {
    const [lockRows] = await connection.execute(
      'SELECT GET_LOCK(?, 10) AS acquired',
      [CATEGORY_ID_LOCK],
    );
    if (Number(lockRows[0]?.acquired) !== 1) {
      const error = new Error('Unable to reserve a category ID. Please try again.');
      error.code = 'CATEGORY_ID_LOCK_TIMEOUT';
      throw error;
    }
    lockAcquired = true;

    await connection.beginTransaction();
    const [duplicates] = await connection.execute(
      `SELECT category_id
       FROM categories
       WHERE LOWER(TRIM(category_name)) = LOWER(TRIM(?))
          OR category_id = ?
       LIMIT 1
       FOR UPDATE`,
      [category.category_name, category.category_id],
    );
    if (duplicates.length) {
      const error = new Error(
        duplicates[0].category_id === category.category_id
          ? 'That category ID already exists.'
          : 'A category with this name already exists.',
      );
      error.code =
        duplicates[0].category_id === category.category_id
          ? 'ER_DUP_ENTRY'
          : 'CATEGORY_NAME_EXISTS';
      throw error;
    }

    const [orderRows] = await connection.execute(
      'SELECT COALESCE(MAX(sort_order), 0) + 1 AS next_order FROM categories',
    );
    await connection.execute(
      `INSERT INTO categories
        (category_id, category_name, description, sub_categories, category_image,
         status, sort_order, created_by, updated_by)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        category.category_id,
        category.category_name,
        category.description || null,
        JSON.stringify(category.sub_categories),
        category.category_image || null,
        category.status,
        Number(orderRows[0]?.next_order || 1),
        category.created_by || null,
        category.updated_by || null,
      ],
    );
    await connection.commit();
    return findCategoryById(category.category_id);
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    if (lockAcquired) {
      await connection.execute('SELECT RELEASE_LOCK(?)', [CATEGORY_ID_LOCK]);
    }
    connection.release();
  }
};

const updateCategory = async (categoryId, category) => {
  const connection = await db.getConnection();
  let lockAcquired = false;
  try {
    const [lockRows] = await connection.execute(
      'SELECT GET_LOCK(?, 10) AS acquired',
      [CATEGORY_ID_LOCK],
    );
    if (Number(lockRows[0]?.acquired) !== 1) {
      const error = new Error('Unable to update category. Please try again.');
      error.code = 'CATEGORY_ID_LOCK_TIMEOUT';
      throw error;
    }
    lockAcquired = true;
    await connection.beginTransaction();

    const [duplicates] = await connection.execute(
      `SELECT category_id
       FROM categories
       WHERE LOWER(TRIM(category_name)) = LOWER(TRIM(?))
         AND category_id <> ?
       LIMIT 1
       FOR UPDATE`,
      [category.category_name, categoryId],
    );
    if (duplicates.length) {
      const error = new Error('A category with this name already exists.');
      error.code = 'CATEGORY_NAME_EXISTS';
      throw error;
    }

    const [result] = await connection.execute(
      `UPDATE categories
       SET category_name = ?, description = ?, sub_categories = ?,
           category_image = ?, status = ?, updated_by = ?
       WHERE category_id = ?`,
      [
        category.category_name,
        category.description || null,
        JSON.stringify(category.sub_categories),
        category.category_image || null,
        category.status,
        category.updated_by || null,
        categoryId,
      ],
    );
    const [rows] = await connection.execute(
      `SELECT id, category_id, category_name, description, sub_categories,
              category_image, status, sort_order, created_by, updated_by,
              created_at, updated_at
       FROM categories WHERE category_id = ? LIMIT 1`,
      [categoryId],
    );
    await connection.commit();
    return result.affectedRows || rows.length ? parseCategory(rows[0]) : null;
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    if (lockAcquired) {
      await connection.execute('SELECT RELEASE_LOCK(?)', [CATEGORY_ID_LOCK]);
    }
    connection.release();
  }
};

const deleteCategory = async (categoryId) => {
  const connection = await db.getConnection();
  try {
    await connection.beginTransaction();
    const [categoryRows] = await connection.execute(
      'SELECT category_id, category_name FROM categories WHERE category_id = ? FOR UPDATE',
      [categoryId],
    );
    const category = categoryRows[0];
    if (!category) {
      await connection.commit();
      return { deleted: false, inUse: false };
    }

    const [foodRows] = await connection.execute(
      `SELECT food_id
       FROM foods
       WHERE category_id = ?
          OR (category_id = '' AND LOWER(TRIM(category_name)) = LOWER(TRIM(?)))
       LIMIT 1`,
      [category.category_id, category.category_name],
    );
    if (foodRows.length) {
      await connection.commit();
      return { deleted: false, inUse: true };
    }

    const [result] = await connection.execute(
      'DELETE FROM categories WHERE category_id = ?',
      [categoryId],
    );
    await connection.commit();
    return { deleted: result.affectedRows > 0, inUse: false };
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
};

module.exports = {
  createCategory,
  deleteCategory,
  findCategoryById,
  getNextCategoryId,
  hasCategoryName,
  initializeCategorySchema,
  listCategories,
  updateCategory,
};
