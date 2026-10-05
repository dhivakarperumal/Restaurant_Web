const db = require('../config/db');

const initializeBannerSchema = async () => {
  await db.query(`
    CREATE TABLE IF NOT EXISTS banners (
      id INT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
      title VARCHAR(255) NOT NULL DEFAULT '',
      subtitle VARCHAR(255) NULL,
      description TEXT NULL,
      image TEXT NOT NULL,
      mobile_image TEXT NULL,
      link TEXT NULL,
      type VARCHAR(20) NOT NULL DEFAULT 'hero',
      active TINYINT(1) NOT NULL DEFAULT 1,
      user_id VARCHAR(255) NULL,
      created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      INDEX banners_type_idx (type),
      INDEX banners_active_idx (active)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);
};

const parseBanner = (banner) => banner && ({ ...banner, active: Boolean(Number(banner.active)) });

const listBanners = async () => {
  const [rows] = await db.query('SELECT * FROM banners ORDER BY created_at DESC, id DESC');
  return rows.map(parseBanner);
};

const listActiveHeroBanners = async () => {
  const [rows] = await db.execute(
    `SELECT * FROM banners
     WHERE active = 1 AND LOWER(type) = 'hero'
     ORDER BY created_at DESC, id DESC`
  );
  return rows.map(parseBanner);
};

const findBannerById = async (id) => {
  const [rows] = await db.execute('SELECT * FROM banners WHERE id = ? LIMIT 1', [id]);
  return parseBanner(rows[0]);
};

const createBanner = async (banner) => {
  const [result] = await db.execute(
    `INSERT INTO banners (title, subtitle, description, image, mobile_image, link, type, active, user_id)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [banner.title, banner.subtitle, banner.description, banner.image, banner.mobile_image, banner.link, banner.type, banner.active, banner.user_id]
  );
  return findBannerById(result.insertId);
};

const updateBanner = async (id, banner) => {
  await db.execute(
    `UPDATE banners
     SET title = ?, subtitle = ?, description = ?, image = ?, mobile_image = ?, link = ?, type = ?, active = ?
     WHERE id = ?`,
    [banner.title, banner.subtitle, banner.description, banner.image, banner.mobile_image, banner.link, banner.type, banner.active, id]
  );
  return findBannerById(id);
};

const deleteBanner = async (id) => {
  const [result] = await db.execute('DELETE FROM banners WHERE id = ?', [id]);
  return result.affectedRows > 0;
};

module.exports = {
  createBanner,
  deleteBanner,
  findBannerById,
  initializeBannerSchema,
  listActiveHeroBanners,
  listBanners,
  updateBanner,
};