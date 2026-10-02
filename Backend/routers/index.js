const express = require('express');
const { randomUUID } = require('crypto');
const fs = require('fs');
const multer = require('multer');
const path = require('path');
const { googleLogin, login, register } = require('../controllers/authController');
const {
  createEmployee,
  deleteEmployee,
  getEmployee,
  listEmployees,
  updateEmployee,
} = require('../controllers/employeeController');
const { findUserByToken } = require('../modules/auth');

const router = express.Router();
const uploadDirectory = path.join(__dirname, '..', 'upload');
const employeeUploadDirectory = path.join(uploadDirectory, 'employee_documents');
const legacyEmployeeUploadDirectories = [
  uploadDirectory,
  path.join(__dirname, '..', 'employee_documents'),
];

fs.mkdirSync(uploadDirectory, { recursive: true });
fs.mkdirSync(employeeUploadDirectory, { recursive: true });

const createUploadFilename = (req, file, callback) => {
  const extension = path.extname(file.originalname).toLowerCase().replace(/[^.a-z0-9]/g, '');
  const basename = path.basename(file.originalname, path.extname(file.originalname))
    .replace(/[^a-z0-9-_]/gi, '-')
    .toLowerCase() || 'document';
  const fieldName = String(file.fieldname || 'document').replace(/[^a-z0-9-_]/gi, '-').toLowerCase();
  callback(null, `${fieldName}-${Date.now()}-${randomUUID()}-${basename}${extension}`);
};

const storage = multer.diskStorage({
  destination: uploadDirectory,
  filename: createUploadFilename,
});

const employeeStorage = multer.diskStorage({
  destination: employeeUploadDirectory,
  filename: createUploadFilename,
});

const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024, files: 20 },
});
const employeeUpload = multer({
  storage: employeeStorage,
  limits: { fileSize: 5 * 1024 * 1024, files: 20 },
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

const requireAdmin = (req, res, next) => {
  if (!req.auth) {
    return res.status(401).json({ success: false, message: 'Administrator login is required' });
  }

  const role = String(req.auth.role || '').trim().toLowerCase();
  if (!['admin', 'super admin', 'superadmin'].includes(role)) {
    return res.status(403).json({ success: false, message: 'Only an administrator can manage employees' });
  }

  return next();
};

router.get('/health', (req, res) => {
  res.json({ success: true, message: 'API is healthy' });
});

router.post('/users/register', optionalAuth, register);
router.post('/users/login', login);
router.post('/users/google-login', googleLogin);
router.get('/employees', optionalAuth, requireAdmin, listEmployees);
router.get('/employees/documents/:filename', optionalAuth, requireAdmin, (req, res) => {
  const filename = req.params.filename;
  if (path.basename(filename) !== filename || filename === '.' || filename === '..') {
    return res.status(400).json({ success: false, message: 'Invalid document name' });
  }
  const downloadFromDirectory = (directory, fallbackIndex = 0) => res.download(
    path.join(directory, filename),
    (error) => {
      if (!error || res.headersSent) return;
      if (error.code === 'ENOENT' && fallbackIndex < legacyEmployeeUploadDirectories.length) {
        return downloadFromDirectory(legacyEmployeeUploadDirectories[fallbackIndex], fallbackIndex + 1);
      }
      console.error('Employee document download failed:', error.message);
      res.status(error.code === 'ENOENT' ? 404 : 500).json({
        success: false,
        message: error.code === 'ENOENT' ? 'Document was not found' : 'Document could not be downloaded',
      });
    }
  );
  return downloadFromDirectory(employeeUploadDirectory);
});
router.get('/employees/:employeeId', optionalAuth, requireAdmin, getEmployee);
router.put('/employees/:employeeId', optionalAuth, requireAdmin, employeeUpload.any(), updateEmployee);
router.delete('/employees/:employeeId', optionalAuth, requireAdmin, deleteEmployee);
router.post('/employees', optionalAuth, requireAdmin, employeeUpload.any(), createEmployee);

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