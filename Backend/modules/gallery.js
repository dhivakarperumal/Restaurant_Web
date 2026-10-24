const db = require('../config/db');

const initializeGallerySchema = async () => {
  await db.query(`
    CREATE TABLE IF NOT EXISTS gallery_albums (
      id                INT AUTO_INCREMENT PRIMARY KEY,
      album_id          VARCHAR(32) NOT NULL UNIQUE,
      title             VARCHAR(255) NOT NULL,
      category          VARCHAR(150) NULL,
      status            VARCHAR(20) NOT NULL DEFAULT 'Active',
      sort_order        INT NOT NULL DEFAULT 1,
      cover_image       TEXT NULL,
      photos            LONGTEXT NULL,
      short_description TEXT NULL,
      description       TEXT NULL,
      meta_title        VARCHAR(255) NULL,
      meta_description  TEXT NULL,
      photo_count       INT NOT NULL DEFAULT 0,
      created_at        DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at        DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);
};

const parsePhotos = (photosValue) => {
  if (Array.isArray(photosValue)) return photosValue;
  if (!photosValue) return [];
  try {
    const parsed = JSON.parse(photosValue);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
};

const parseAlbum = (row) => {
  if (!row) return null;
  return {
    ...row,
    photos: parsePhotos(row.photos),
  };
};

const listAlbums = async () => {
  const [rows] = await db.query(
    `SELECT id, album_id, title, category, status, sort_order,
            cover_image, photos, short_description, description,
            meta_title, meta_description, photo_count, created_at, updated_at
     FROM gallery_albums
     ORDER BY sort_order ASC, created_at DESC`
  );
  return rows.map(parseAlbum);
};

const findAlbumById = async (albumId) => {
  const [rows] = await db.execute(
    `SELECT id, album_id, title, category, status, sort_order,
            cover_image, photos, short_description, description,
            meta_title, meta_description, photo_count, created_at, updated_at
     FROM gallery_albums WHERE album_id = ? LIMIT 1`,
    [albumId]
  );
  return parseAlbum(rows[0]);
};

const getNextAlbumId = async () => {
  const [rows] = await db.query(
    "SELECT MAX(CAST(SUBSTRING(album_id, 4) AS UNSIGNED)) AS last_id FROM gallery_albums WHERE album_id REGEXP '^GAL[0-9]+$'"
  );
  return `GAL${String(Number(rows[0]?.last_id || 0) + 1).padStart(3, '0')}`;
};

const createAlbum = async (album) => {
  const photosArray = Array.isArray(album.photos) ? album.photos : [];
  await db.execute(
    `INSERT INTO gallery_albums
      (album_id, title, category, status, sort_order, cover_image, photos,
       short_description, description, meta_title, meta_description, photo_count)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      album.album_id,
      album.title,
      album.category || null,
      album.status || 'Active',
      Number(album.sort_order) || 1,
      album.cover_image || null,
      JSON.stringify(photosArray),
      album.short_description || null,
      album.description || null,
      album.meta_title || null,
      album.meta_description || null,
      photosArray.length,
    ]
  );
  return findAlbumById(album.album_id);
};

const updateAlbum = async (albumId, album) => {
  const photosArray = Array.isArray(album.photos) ? album.photos : [];
  const [result] = await db.execute(
    `UPDATE gallery_albums
     SET title = ?, category = ?, status = ?, sort_order = ?,
         cover_image = ?, photos = ?, short_description = ?,
         description = ?, meta_title = ?, meta_description = ?, photo_count = ?
     WHERE album_id = ?`,
    [
      album.title,
      album.category || null,
      album.status || 'Active',
      Number(album.sort_order) || 1,
      album.cover_image || null,
      JSON.stringify(photosArray),
      album.short_description || null,
      album.description || null,
      album.meta_title || null,
      album.meta_description || null,
      photosArray.length,
      albumId,
    ]
  );
  return result.affectedRows ? findAlbumById(albumId) : null;
};

const deleteAlbum = async (albumId) => {
  const [result] = await db.execute('DELETE FROM gallery_albums WHERE album_id = ?', [albumId]);
  return result.affectedRows > 0;
};

module.exports = {
  initializeGallerySchema,
  listAlbums,
  findAlbumById,
  getNextAlbumId,
  createAlbum,
  updateAlbum,
  deleteAlbum,
};
