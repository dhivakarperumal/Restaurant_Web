const express = require('express');
const fs = require('fs');
const multer = require('multer');
const path = require('path');
const { googleLogin, login, register } = require('../controllers/authController');
const { findUserByToken } = require('../modules/auth');

const router = express.Router();
const uploadDirectory = path.join(__dirname, '..', 'upload');

fs.mkdirSync(uploadDirectory, { recursive: true });

const storage = multer.diskStorage({
  destination: uploadDirectory,
  filename: (req, file, callback) => {
    const extension = path.extname(file.originalname);
    const basename = path.basename(file.originalname, extension)
      .replace(/[^a-z0-9-_]/gi, '-')
      .toLowerCase();
    callback(null, `${Date.now()}-${basename}${extension}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 },
});

const optionalAuth = async (req, res, next) => {
  const token = req.get('authorization')?.replace(/^Bearer\s+/i, '');
  if (!token) return next();

  try {
    req.auth = await findUserByToken(token);
    return next();
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Unable to validate account session' });
  }
};

router.get('/health', (req, res) => {
  res.json({ success: true, message: 'API is healthy' });
});

router.post('/users/register', optionalAuth, register);
router.post('/users/login', login);
router.post('/users/google-login', googleLogin);

router.post('/upload', upload.single('file'), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ success: false, message: 'A file is required' });
  }

  return res.status(201).json({
    success: true,
    filename: req.file.filename,
    url: `${process.env.BACKEND_URL || `http://localhost:${process.env.PORT || 5000}`}/uploads/${req.file.filename}`,
  });
});

module.exports = router;