const db = require('../config/db');

const initializeCouponSchema = async () => {
  await db.query(`
    CREATE TABLE IF NOT EXISTS coupons (
      id INT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
      code VARCHAR(64) NOT NULL UNIQUE,
      name VARCHAR(150) NOT NULL,
      description TEXT NULL,
      discount_type VARCHAR(20) NOT NULL,
      discount_value DECIMAL(10,2) NOT NULL,
      min_order_value DECIMAL(10,2) NOT NULL DEFAULT 0,
      start_date DATETIME NOT NULL,
      expiry_date DATETIME NOT NULL,
      usage_limit_global INT UNSIGNED NULL,
      usage_limit_per_customer INT UNSIGNED NOT NULL DEFAULT 1,
      usage_count INT UNSIGNED NOT NULL DEFAULT 0,
      status VARCHAR(20) NOT NULL DEFAULT 'active',
      coupon_scope VARCHAR(40) NOT NULL DEFAULT 'all',
      applicable_product_ids LONGTEXT NOT NULL,
      applicable_category_ids LONGTEXT NOT NULL,
      applicable_subcategory_ids LONGTEXT NOT NULL,
      created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      INDEX coupons_status_idx (status),
      INDEX coupons_expiry_idx (expiry_date)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);
};

const parseJsonArray = (value) => {
  if (Array.isArray(value)) return value;
  try {
    const parsed = JSON.parse(value || '[]');
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
};

const parseCoupon = (coupon) => coupon && ({
  ...coupon,
  applicable_product_ids: parseJsonArray(coupon.applicable_product_ids),
  applicable_category_ids: parseJsonArray(coupon.applicable_category_ids),
  applicable_subcategory_ids: parseJsonArray(coupon.applicable_subcategory_ids),
});

const couponValues = (coupon) => [
  coupon.code,
  coupon.name,
  coupon.description || null,
  coupon.discount_type,
  coupon.discount_value,
  coupon.min_order_value,
  coupon.start_date,
  coupon.expiry_date,
  coupon.usage_limit_global,
  coupon.usage_limit_per_customer,
  coupon.status,
  coupon.coupon_scope,
  JSON.stringify(coupon.applicable_product_ids),
  JSON.stringify(coupon.applicable_category_ids),
  JSON.stringify(coupon.applicable_subcategory_ids),
];

const listCoupons = async () => {
  const [rows] = await db.query('SELECT * FROM coupons ORDER BY created_at DESC, id DESC');
  return rows.map(parseCoupon);
};

const findCouponById = async (id) => {
  const [rows] = await db.execute('SELECT * FROM coupons WHERE id = ? LIMIT 1', [id]);
  return parseCoupon(rows[0]);
};

const createCoupon = async (coupon) => {
  const [result] = await db.execute(
    `INSERT INTO coupons (
      code, name, description, discount_type, discount_value, min_order_value,
      start_date, expiry_date, usage_limit_global, usage_limit_per_customer,
      status, coupon_scope, applicable_product_ids, applicable_category_ids, applicable_subcategory_ids
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    couponValues(coupon)
  );
  return findCouponById(result.insertId);
};

const updateCoupon = async (id, coupon) => {
  await db.execute(
    `UPDATE coupons SET
      code = ?, name = ?, description = ?, discount_type = ?, discount_value = ?, min_order_value = ?,
      start_date = ?, expiry_date = ?, usage_limit_global = ?, usage_limit_per_customer = ?,
      status = ?, coupon_scope = ?, applicable_product_ids = ?, applicable_category_ids = ?, applicable_subcategory_ids = ?
     WHERE id = ?`,
    [...couponValues(coupon), id]
  );
  return findCouponById(id);
};

const deleteCoupon = async (id) => {
  const [result] = await db.execute('DELETE FROM coupons WHERE id = ?', [id]);
  return result.affectedRows > 0;
};

module.exports = { createCoupon, deleteCoupon, findCouponById, initializeCouponSchema, listCoupons, updateCoupon };