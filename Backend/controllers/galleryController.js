const {
  createAlbum,
  deleteAlbum,
  findAlbumById,
  getNextAlbumId,
  listAlbums,
  updateAlbum,
} = require('../modules/gallery');

const normalizeAlbum = (body = {}) => ({
  title: String(body.title || '').trim(),
  category: String(body.category || '').trim(),
  status: String(body.status || 'Active').trim(),
  sort_order: Number(body.sort_order) || 1,
  cover_image: String(body.cover_image || '').trim(),
  photos: Array.isArray(body.photos) ? body.photos.map((p) => String(p).trim()).filter(Boolean) : [],
  short_description: String(body.short_description || '').trim(),
  description: String(body.description || '').trim(),
  meta_title: String(body.meta_title || '').trim(),
  meta_description: String(body.meta_description || '').trim(),
});

const list = async (_req, res) => {
  try {
    return res.json({ success: true, data: await listAlbums() });
  } catch (error) {
    console.error('Failed to list gallery albums:', error.message);
    return res.status(500).json({ success: false, message: 'Unable to load gallery albums.' });
  }
};

const getNextId = async (_req, res) => {
  try {
    return res.json({ success: true, data: await getNextAlbumId() });
  } catch (error) {
    console.error('Failed to generate gallery album ID:', error.message);
    return res.status(500).json({ success: false, message: 'Unable to generate a gallery album ID.' });
  }
};

const getById = async (req, res) => {
  try {
    const album = await findAlbumById(req.params.albumId);
    if (!album) return res.status(404).json({ success: false, message: 'Gallery album not found.' });
    return res.json({ success: true, data: album });
  } catch (error) {
    console.error('Failed to load gallery album:', error.message);
    return res.status(500).json({ success: false, message: 'Unable to load gallery album.' });
  }
};

const create = async (req, res) => {
  const album = normalizeAlbum(req.body);
  if (!album.title) {
    return res.status(400).json({ success: false, message: 'Album title is required.' });
  }

  try {
    const albumId = req.body.gallery_id || req.body.album_id || (await getNextAlbumId());
    const saved = await createAlbum({ ...album, album_id: albumId });
    return res.status(201).json({ success: true, data: saved });
  } catch (error) {
    if (error.code === 'ER_DUP_ENTRY') {
      return res.status(409).json({ success: false, message: 'That album ID already exists.' });
    }
    console.error('Failed to create gallery album:', error.message);
    return res.status(500).json({ success: false, message: 'Unable to create gallery album.' });
  }
};

const update = async (req, res) => {
  const album = normalizeAlbum(req.body);
  if (!album.title) {
    return res.status(400).json({ success: false, message: 'Album title is required.' });
  }

  try {
    const saved = await updateAlbum(req.params.albumId, album);
    if (!saved) return res.status(404).json({ success: false, message: 'Gallery album not found.' });
    return res.json({ success: true, data: saved });
  } catch (error) {
    console.error('Failed to update gallery album:', error.message);
    return res.status(500).json({ success: false, message: 'Unable to update gallery album.' });
  }
};

const remove = async (req, res) => {
  try {
    const deleted = await deleteAlbum(req.params.albumId);
    if (!deleted) return res.status(404).json({ success: false, message: 'Gallery album not found.' });
    return res.json({ success: true, message: 'Gallery album deleted.' });
  } catch (error) {
    console.error('Failed to delete gallery album:', error.message);
    return res.status(500).json({ success: false, message: 'Unable to delete gallery album.' });
  }
};

module.exports = { list, getNextId, getById, create, update, remove };
