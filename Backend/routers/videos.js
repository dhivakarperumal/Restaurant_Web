const express = require('express');
const fs = require('fs');
const multer = require('multer');
const path = require('path');
const { findUserByToken } = require('../modules/auth');
const controller = require('../controllers/videoController');

const router = express.Router();
const videoDirectory = path.join(__dirname, '..', 'upload', 'videos');
fs.mkdirSync(videoDirectory, { recursive: true });

const storage = multer.diskStorage({
  destination: (_req, _file, callback) => callback(null, videoDirectory),
  filename: (_req, file, callback) => {
    const extension = path.extname(file.originalname).toLowerCase();
    const basename = path.basename(file.originalname, extension).replace(/[^a-z0-9-_]/gi, '-').toLowerCase();
    callback(null, `${Date.now()}-${basename}${extension}`);
  },
});

const videoUpload = multer({
  storage,
  limits: { fileSize: 50 * 1024 * 1024 },
  fileFilter: (_req, file, callback) => callback(null, file.mimetype.startsWith('video/')),
});
const thumbnailUpload = multer({
  storage,
  limits: { fileSize: 2 * 1024 * 1024 },
  fileFilter: (_req, file, callback) => callback(null, file.mimetype.startsWith('image/')),
});

const requireAdmin = async (req, res, next) => {
  const token = req.get('authorization')?.replace(/^Bearer\s+/i, '');
  if (!token) return res.status(401).json({ success: false, message: 'Administrator login is required.' });
  try {
    const user = await findUserByToken(token);
    if (!user) return res.status(401).json({ success: false, message: 'Your session is invalid or expired.' });
    if (!['admin', 'super admin', 'superadmin'].includes(String(user.role || '').trim().toLowerCase())) {
      return res.status(403).json({ success: false, message: 'Administrator access is required.' });
    }
    req.auth = user;
    return next();
  } catch (error) {
    console.error('Failed to authorize video request:', error.message);
    return res.status(500).json({ success: false, message: 'Unable to verify administrator access.' });
  }
};

router.use(requireAdmin);
router.post('/upload', videoUpload.single('video'), controller.uploadResponse);
router.post('/upload-thumbnail', thumbnailUpload.single('image'), controller.uploadResponse);
router.get('/', controller.list);
router.post('/', controller.create);
router.put('/:videoId', controller.update);
router.delete('/:videoId', controller.remove);

module.exports = router;