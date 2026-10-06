const express = require('express');
const { randomUUID } = require('crypto');
const fs = require('fs');
const multer = require('multer');
const path = require('path');
const { changePassword, getProfile, googleLogin, listUsers, login, register, removeUser, updateProfile, updateUser } = require('../controllers/authController');
const {
  checkEmployeeFieldUniqueness,
  createEmployee,
  deleteEmployee,
  getDeliveryPartnerProfile,
  getEmployee,
  listEmployees,
  updateEmployee,
  updateEmployeeStatus,
} = require('../controllers/employeeController');
const { findUserByToken } = require('../modules/auth');
const serverTableRouter = require('./serverTableRouter');
const categoriesRouter = require('./categories');
const cuisinesRouter = require('./cuisines');
const foodsRouter = require('./foods');
const bannersRouter = require('./banners');
const couponsRouter = require('./coupons');
const reviewsRouter = require('./reviews');
const videosRouter = require('./videos');
const settingsRouter = require('./settings');
const cartRouter = require('./cartRouter');
const wishlistRouter = require('./wishlistRouter');
const inventoryRouter = require('./inventory');
const { changeKitchenOrderStatus, getKitchenOrders, submitKitchenOrder } = require('../controllers/kitchenOrderController');
const { getActiveBill, getAllBills, getBill, settleBill } = require('../controllers/tableBillController');
const ordersRouter = require('./orders');
const revenueRouter = require('./revenue');

const router = express.Router();
const uploadDirectory = path.join(__dirname, '..', 'upload');
const employeeUploadDirectory = path.join(uploadDirectory, 'employee_documents');
const legacyEmployeeUploadDirectories = [
  uploadDirectory,
  path.join(__dirname, '..', 'employee_documents'),
];

fs.mkdirSync(uploadDirectory, { recursive: true });

const uploadFolders = new Set(['categories', 'cuisines', 'foods', 'banners', 'review', 'settings']);
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
  destination: (req, _file, callback) => {
    const folder = String(req.body?.folder || '').toLowerCase();
    const destination = uploadFolders.has(folder) ? path.join(uploadDirectory, folder) : uploadDirectory;
    fs.mkdirSync(destination, { recursive: true });
    callback(null, destination);
  },
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

const requireInventoryAccess = async (req, res, next) => {
  const token = req.get('authorization')?.replace(/^Bearer\s+/i, '');
  if (!token) return res.status(401).json({ success: false, message: 'Login is required.' });

  try {
    const user = await findUserByToken(token);
    if (!user) return res.status(401).json({ success: false, message: 'Your session is invalid or expired.' });

    const role = String(user.role || '').trim().toLowerCase();
    const isAdmin = ['admin', 'super admin', 'superadmin'].includes(role);
    const requestPath = req.path.replace(/\/+$/, '') || '/';
    const originalPath = req.originalUrl.split('?')[0].replace(/\/+$/, '');
    const matchesInventoryPath = (path) => requestPath === path || originalPath.endsWith(`/inventory${path}`);
    const isChefRequestAccess = role === 'chef' && (
      (req.method === 'GET' && ['/products/options', '/kitchen-requests'].some(matchesInventoryPath)) ||
      (req.method === 'POST' && matchesInventoryPath('/kitchen-requests'))
    );

    if (!isAdmin && !isChefRequestAccess) {
      return res.status(403).json({ success: false, message: 'Administrator access is required.' });
    }

    req.auth = user;
    return next();
  } catch (error) {
    console.error('Failed to authorize inventory request:', error.message);
    return res.status(500).json({ success: false, message: 'Unable to verify inventory access.' });
  }
};

const requireAuthenticatedUser = async (req, res, next) => {
  const token = req.get('authorization')?.replace(/^Bearer\s+/i, '');
  if (!token) return res.status(401).json({ success: false, message: 'Login is required.' });
  try {
    const user = await findUserByToken(token);
    if (!user) return res.status(401).json({ success: false, message: 'Your session is invalid or expired.' });
    req.auth = user;
    return next();
  } catch (error) {
    console.error('Failed to authorize profile request:', error.message);
    return res.status(500).json({ success: false, message: 'Unable to verify your session.' });
  }
};

const requireDeliveryPartner = async (req, res, next) => {
  const token = req.get('authorization')?.replace(/^Bearer\s+/i, '');
  if (!token) return res.status(401).json({ success: false, message: 'Delivery partner login is required.' });

  try {
    const user = await findUserByToken(token);
    if (!user) return res.status(401).json({ success: false, message: 'Your session is invalid or expired.' });
    const role = String(user.role || '').trim().toLowerCase();
    if (!['delivery', 'delivery partner'].includes(role) || !user.employee_id) {
      return res.status(403).json({ success: false, message: 'Delivery partner access is required.' });
    }
    req.auth = user;
    return next();
  } catch (error) {
    console.error('Failed to authorize delivery partner request:', error.message);
    return res.status(500).json({ success: false, message: 'Unable to verify your session.' });
  }
};

const requireKitchenRole = (allowedRoles) => async (req, res, next) => {
  const token = req.get('authorization')?.replace(/^Bearer\s+/i, '');
  if (!token) return res.status(401).json({ success: false, message: 'Login is required.' });

  try {
    const user = await findUserByToken(token);
    if (!user) return res.status(401).json({ success: false, message: 'Your session is invalid or expired.' });
    const role = String(user.role || '').trim().toLowerCase();
    if (!allowedRoles.includes(role)) {
      return res.status(403).json({ success: false, message: 'You are not allowed to access kitchen orders.' });
    }
    req.auth = user;
    return next();
  } catch (error) {
    console.error('Failed to authorize kitchen order request:', error.message);
    return res.status(500).json({ success: false, message: 'Unable to verify your session.' });
  }
};

const requireEmployeeAdmin = (req, res, next) => {
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
router.get('/users/profile/:profileId', requireAuthenticatedUser, getProfile);
router.put('/users/profile/:profileId', requireAuthenticatedUser, updateProfile);
router.put('/users/password', requireAuthenticatedUser, changePassword);
router.get('/users', requireAdmin, listUsers);
router.put('/users/:userId', requireAdmin, updateUser);
router.delete('/users/:userId', requireAdmin, removeUser);
router.get('/delivery-partner/profile', requireDeliveryPartner, getDeliveryPartnerProfile);
router.use(
  '/orders',
  requireAuthenticatedUser,
  (req, res, next) => {
    if (req.path === '/management' || req.path.startsWith('/management/')) {
      return requireKitchenRole(['chef', 'super admin', 'admin'])(req, res, next);
    }
    return next();
  },
  ordersRouter
);
router.use('/revenue', requireAdmin, revenueRouter);
router.use('/categories', categoriesRouter);
router.use('/cuisines', cuisinesRouter);
router.use('/foods', foodsRouter);
router.use('/banners', bannersRouter);
router.use('/coupons', couponsRouter);
router.use('/reviews', reviewsRouter);
router.use('/videos', videosRouter);
router.use('/settings', requireAdmin, settingsRouter);
router.use('/cart', optionalAuth, cartRouter);
router.use('/wishlist', requireAuthenticatedUser, wishlistRouter);
router.use('/inventory', requireInventoryAccess, inventoryRouter);
router.get('/employees', optionalAuth, requireEmployeeAdmin, listEmployees);
router.get('/employees/documents/:filename', optionalAuth, requireEmployeeAdmin, (req, res) => {
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
router.get('/employees/check-unique', optionalAuth, requireEmployeeAdmin, checkEmployeeFieldUniqueness);
router.get('/employees/:employeeId', optionalAuth, requireEmployeeAdmin, getEmployee);
router.patch('/employees/:employeeId/status', optionalAuth, requireEmployeeAdmin, updateEmployeeStatus);
router.put('/employees/:employeeId/status', optionalAuth, requireEmployeeAdmin, updateEmployeeStatus);
router.put('/employees/:employeeId', optionalAuth, requireEmployeeAdmin, employeeUpload.any(), updateEmployee);
router.delete('/employees/:employeeId', optionalAuth, requireEmployeeAdmin, deleteEmployee);
router.post('/employees', optionalAuth, requireEmployeeAdmin, employeeUpload.any(), createEmployee);

router.use('/server-tables', optionalAuth, serverTableRouter);
router.use('/tables', optionalAuth, serverTableRouter);
router.post('/kitchen-orders', requireKitchenRole(['server']), submitKitchenOrder);
router.get('/kitchen-orders', requireKitchenRole(['chef', 'server', 'super admin', 'admin']), getKitchenOrders);
router.patch('/kitchen-orders/:orderId/status', requireKitchenRole(['chef', 'server', 'super admin', 'admin']), changeKitchenOrderStatus);
router.put('/kitchen-orders/:orderId/status', requireKitchenRole(['chef', 'server', 'super admin', 'admin']), changeKitchenOrderStatus);

router.get('/table-bills/active/:tableId', requireKitchenRole(['server', 'super admin', 'admin']), getActiveBill);
router.get('/table-bills/:billId', requireKitchenRole(['server', 'super admin', 'admin']), getBill);
router.post('/table-bills/:billId/settle', requireKitchenRole(['server', 'super admin', 'admin']), settleBill);
router.get('/table-bills', requireKitchenRole(['server', 'super admin', 'admin']), getAllBills);

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