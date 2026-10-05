const db = require('../config/db');

const initializeWishlistSchema = async () => {
  await db.query(`
    CREATE TABLE IF NOT EXISTS wishlists (
      id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
      user_id VARCHAR(255) NOT NULL,
      food_id VARCHAR(32) NOT NULL,
      created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      UNIQUE KEY wishlists_user_food_unique (user_id, food_id),
      INDEX wishlists_user_id_idx (user_id),
      INDEX wishlists_food_id_idx (food_id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);
};

const getWishlistByUserId = async (userId) => {
  const [rows] = await db.execute(
    `SELECT w.id, w.user_id, w.food_id, w.created_at,
            f.food_name, f.category_name, f.cuisine_name, f.food_images,
            f.food_type, f.mrp, f.discount, f.final_price, f.portion_size
     FROM wishlists w
     INNER JOIN foods f ON f.food_id = w.food_id
     WHERE w.user_id = ?
     ORDER BY w.created_at DESC, w.id DESC`,
    [userId]
  );

  return rows.map((row) => {
    let images = [];
    try {
      images = Array.isArray(row.food_images) ? row.food_images : JSON.parse(row.food_images || '[]');
    } catch (error) {
      console.error(`Failed to parse wishlist food images for ${row.food_id}:`, error.message);
    }
    const image = images[0] || '';
    return {
      ...row,
      id: row.id,
      product_id: row.food_id,
      item_name: row.food_name,
      product_name: row.food_name,
      image,
      product_image: image,
      mrp: Number(row.mrp || 0),
      discount: Number(row.discount || 0),
      final_price: Number(row.final_price || 0),
    };
  });
};

const addFoodToWishlist = async (userId, foodId) => {
  await db.execute(
    'INSERT IGNORE INTO wishlists (user_id, food_id) VALUES (?, ?)',
    [userId, foodId]
  );
  const [rows] = await db.execute(
    'SELECT id FROM wishlists WHERE user_id = ? AND food_id = ? LIMIT 1',
    [userId, foodId]
  );
  return rows[0] || null;
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
