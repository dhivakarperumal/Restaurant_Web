const express = require('express');
const fs = require('fs');
const multer = require('multer');
const path = require('path');
const { googleLogin, listUsers, login, register, removeUser, updateUser } = require('../controllers/authController');
const { findUserByToken } = require('../modules/auth');
const categoriesRouter = require('./categories');
const cuisinesRouter = require('./cuisines');
const foodsRouter = require('./foods');
const bannersRouter = require('./banners');

const router = express.Router();
const uploadDirectory = path.join(__dirname, '..', 'upload');

fs.mkdirSync(uploadDirectory, { recursive: true });

const uploadFolders = new Set(['categories', 'cuisines', 'foods', 'banners']);

const storage = multer.diskStorage({
  destination: (req, _file, callback) => {
    const folder = String(req.body?.folder || '').toLowerCase();
    const destination = uploadFolders.has(folder) ? path.join(uploadDirectory, folder) : uploadDirectory;
    fs.mkdirSync(destination, { recursive: true });
    callback(null, destination);
  },
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
    console.error('Failed to authorize user management request:', error.message);
    return res.status(500).json({ success: false, message: 'Unable to verify administrator access.' });
  }
};

router.get('/health', (req, res) => {
  res.json({ success: true, message: 'API is healthy' });
});

router.post('/users/register', optionalAuth, register);
router.post('/users/login', login);
router.post('/users/google-login', googleLogin);
router.get('/users', requireAdmin, listUsers);
router.put('/users/:userId', requireAdmin, updateUser);
router.delete('/users/:userId', requireAdmin, removeUser);
router.use('/categories', categoriesRouter);
router.use('/cuisines', cuisinesRouter);
router.use('/foods', foodsRouter);
router.use('/banners', bannersRouter);

router.post('/upload', upload.single('file'), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ success: false, message: 'A file is required' });
  }

  const relativePath = path.relative(uploadDirectory, req.file.path)
    .split(path.sep)
    .map(encodeURIComponent)
    .join('/');
  const backendUrl = (process.env.BACKEND_URL || `http://localhost:${process.env.PORT || 5000}`).replace(/\/+$/, '');

  return res.status(201).json({
    success: true,
    filename: req.file.filename,
    url: `${backendUrl}/uploads/${relativePath}`,
  });
});

module.exports = router;