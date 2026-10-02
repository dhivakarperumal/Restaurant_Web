const db = require('../config/db');

const initializeVideoSchema = async () => {
  await db.query(`
    CREATE TABLE IF NOT EXISTS videos (
      id INT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
      title VARCHAR(255) NOT NULL,
      video_id TEXT NOT NULL,
      thumbnail TEXT NULL,
      type VARCHAR(20) NOT NULL DEFAULT 'youtube',
      active TINYINT(1) NOT NULL DEFAULT 1,
      user_id VARCHAR(255) NULL,
      created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      INDEX videos_active_idx (active)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);
};

const parseVideo = (video) => video && ({
  id: video.id,
  title: video.title,
  videoId: video.video_id,
  thumbnail: video.thumbnail || '',
  type: video.type,
  active: Boolean(video.active),
  user_id: video.user_id,
  created_at: video.created_at,
  updated_at: video.updated_at,
});

const listVideos = async () => {
  const [rows] = await db.query('SELECT * FROM videos ORDER BY created_at DESC, id DESC');
  return rows.map(parseVideo);
};

const findVideoById = async (id) => {
  const [rows] = await db.execute('SELECT * FROM videos WHERE id = ? LIMIT 1', [id]);
  return parseVideo(rows[0]);
};

const createVideo = async (video) => {
  const [result] = await db.execute(
    'INSERT INTO videos (title, video_id, thumbnail, type, active, user_id) VALUES (?, ?, ?, ?, ?, ?)',
    [video.title, video.videoId, video.thumbnail || null, video.type, Number(video.active), video.user_id || null]
  );
  return findVideoById(result.insertId);
};

const updateVideo = async (id, video) => {
  await db.execute(
    'UPDATE videos SET title = ?, video_id = ?, thumbnail = ?, type = ?, active = ? WHERE id = ?',
    [video.title, video.videoId, video.thumbnail || null, video.type, Number(video.active), id]
  );
  return findVideoById(id);
};

const deleteVideo = async (id) => {
  const [result] = await db.execute('DELETE FROM videos WHERE id = ?', [id]);
  return result.affectedRows > 0;
};

module.exports = { createVideo, deleteVideo, findVideoById, initializeVideoSchema, listVideos, updateVideo };