const db = require('../config/db');

const initializeReviewSchema = async () => {
  await db.query(`
    CREATE TABLE IF NOT EXISTS reviews (
      id            INT UNSIGNED    NOT NULL AUTO_INCREMENT PRIMARY KEY,
      uuid          VARCHAR(255)    NULL,
      review_id     VARCHAR(50)     NOT NULL UNIQUE,
      product_id    INT UNSIGNED    NULL,
      product_code  VARCHAR(255)    NULL,
      product_name  VARCHAR(500)    NULL,
      product_image TEXT            NULL,
      product_type  VARCHAR(50)     NOT NULL DEFAULT 'product',
      reviewer_name VARCHAR(255)    NOT NULL,
      reviewer_email VARCHAR(255)   NULL,
      rating        TINYINT UNSIGNED NOT NULL DEFAULT 5,
      title         VARCHAR(500)    NULL,
      comment       TEXT            NOT NULL,
      review_photo  TEXT            NULL,
      status        VARCHAR(30)     NOT NULL DEFAULT 'Published',
      created_by    VARCHAR(255)    NULL,
      updated_by    VARCHAR(255)    NULL,
      created_at    DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at    DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      INDEX reviews_product_id_idx   (product_id),
      INDEX reviews_product_code_idx (product_code(50)),
      INDEX reviews_rating_idx       (rating),
      INDEX reviews_status_idx       (status)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);
};

// ── helpers ─────────────────────────────────────────────────────────────────

const parseReview = (row) => {
  if (!row) return null;
  return { ...row, rating: Number(row.rating) };
};

// ── next sequential review ID (REV001, REV002 …) ────────────────────────────

const getNextReviewId = async () => {
  const [rows] = await db.query(
    `SELECT review_id FROM reviews ORDER BY id DESC LIMIT 1`
  );
  if (!rows.length) return 'REV001';
  const last = rows[0].review_id || '';
  const match = last.match(/(\d+)$/);
  if (!match) return 'REV001';
  const next = String(Number(match[1]) + 1).padStart(3, '0');
  return `REV${next}`;
};

// ── CRUD ─────────────────────────────────────────────────────────────────────

const listReviews = async (productId = null) => {
  let sql = 'SELECT * FROM reviews';
  const params = [];
  if (productId) {
    sql += ' WHERE product_id = ?';
    params.push(productId);
  }
  sql += ' ORDER BY created_at DESC, id DESC';
  const [rows] = await db.query(sql, params);
  return rows.map(parseReview);
};

const listPublishedReviews = async () => {
  const [rows] = await db.query(
    `SELECT reviewer_name, rating, title, comment, review_photo, product_name, created_at
     FROM reviews
     WHERE status = 'Published'
     ORDER BY created_at DESC, id DESC
     LIMIT 12`
  );
  return rows.map(parseReview);
};

const findReviewById = async (id) => {
  const [rows] = await db.execute('SELECT * FROM reviews WHERE id = ? LIMIT 1', [id]);
  return parseReview(rows[0]);
};

const createReview = async (data) => {
  const [result] = await db.execute(
    `INSERT INTO reviews
       (uuid, review_id, product_id, product_code, product_name, product_image,
        product_type, reviewer_name, reviewer_email, rating, title, comment,
        review_photo, status, created_by, updated_by, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      data.uuid        || null,
      data.review_id,
      data.product_id  || null,
      data.product_code || null,
      data.product_name || null,
      data.product_image || null,
      data.product_type  || 'product',
      data.reviewer_name,
      data.reviewer_email || null,
      Number(data.rating) || 5,
      data.title   || null,
      data.comment,
      data.review_photo || null,
      data.status  || 'Published',
      data.created_by || null,
      data.updated_by || null,
      data.created_at ? new Date(data.created_at) : new Date(),
      data.updated_at ? new Date(data.updated_at) : new Date(),
    ]
  );
  return findReviewById(result.insertId);
};

const updateReview = async (id, data) => {
  await db.execute(
    `UPDATE reviews
     SET uuid = ?, product_id = ?, product_code = ?, product_name = ?,
         product_image = ?, product_type = ?, reviewer_name = ?,
         reviewer_email = ?, rating = ?, title = ?, comment = ?,
         review_photo = ?, status = ?, updated_by = ?, updated_at = NOW()
     WHERE id = ?`,
    [
      data.uuid         || null,
      data.product_id   || null,
      data.product_code || null,
      data.product_name || null,
      data.product_image || null,
      data.product_type  || 'product',
      data.reviewer_name,
      data.reviewer_email || null,
      Number(data.rating)  || 5,
      data.title    || null,
      data.comment,
      data.review_photo || null,
      data.status   || 'Published',
      data.updated_by || null,
      id,
    ]
  );
  return findReviewById(id);
};

const deleteReview = async (id) => {
  const [result] = await db.execute('DELETE FROM reviews WHERE id = ?', [id]);
  return result.affectedRows > 0;
};

// ── Stats ────────────────────────────────────────────────────────────────────

const getReviewStats = async () => {
  const [[row]] = await db.query(`
    SELECT
      COUNT(*)                                          AS total_reviews,
      COALESCE(ROUND(AVG(rating), 1), 0)                AS avg_rating,
      SUM(rating = 5)                                   AS five_star_count,
      SUM(review_photo IS NOT NULL AND review_photo <> '') AS photo_reviews_count,
      SUM(status = 'Published')                         AS published_count
    FROM reviews
  `);
  return {
    total_reviews:      Number(row.total_reviews),
    avg_rating:         Number(row.avg_rating),
    five_star_count:    Number(row.five_star_count),
    photo_reviews_count: Number(row.photo_reviews_count),
    published_count:    Number(row.published_count),
  };
};

module.exports = {
  initializeReviewSchema,
  getNextReviewId,
  listReviews,
  listPublishedReviews,
  findReviewById,
  createReview,
  updateReview,
  deleteReview,
  getReviewStats,
};
