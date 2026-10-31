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
const galleryRouter = require('./gallery');
const settingsRouter = require('./settings');
const cartRouter = require('./cartRouter');
const wishlistRouter = require('./wishlistRouter');
const inventoryRouter = require('./inventory');
const serverSuppliesRouter = require('./serverSupplies');
const { changeKitchenOrderStatus, getKitchenOrders, submitKitchenOrder } = require('../controllers/kitchenOrderController');
const {
  getDeliveryPartnerDashboard,
  getDeliveryPartnerEarnings,
  getDeliveryPartnerHistory,
  listAssignedDeliveryOrders,
  listDeliveryPartners,
  updateAssignedDeliveryOrderStatus,
  updateDeliveryPartnerAvailability,
} = require('../controllers/customerOrderController');
const { getActiveBill, getAllBills, getBill, mergeBills, settleBill } = require('../controllers/tableBillController');
const ordersRouter = require('./orders');
const revenueRouter = require('./revenue');
const reservationsRouter = require('./reservations');
const expensesRouter = require('./expenses');
const salariesRouter = require('./salaries');
const eventOrdersRouter = require('./eventOrdersRouter');
const { getFund, updateFund } = require('../controllers/expenseController');
const attendanceRouter = require('./attendance');

const router = express.Router();
const uploadDirectory = path.join(__dirname, '..', 'upload');
const employeeUploadDirectory = path.join(uploadDirectory, 'employee_documents');
const legacyEmployeeUploadDirectories = [
  uploadDirectory,
  path.join(__dirname, '..', 'employee_documents'),
];

fs.mkdirSync(uploadDirectory, { recursive: true });

const uploadFolders = new Set(['categories', 'cuisines', 'foods', 'inventory', 'banners', 'review', 'settings', 'tables', 'server_supplies', 'gallery']);
fs.mkdirSync(employeeUploadDirectory, { recursive: true });

const createUploadFilename = (req, file, callback) => {
  const extension = path.extname(file.originalname).toLowerCase().replace(/[^.a-z0-9]/g, '');
  const basename = path.basename(file.originalname, path.extname(file.originalname))
    .replace(/[^a-z0-9-_]/gi, '-')
    .toLowerCase() || 'document';
  const fieldName = String(file.fieldname || 'document').replace(/[^a-z0-9-_]/gi, '-').toLowerCase();
  callback(null, `${fieldName}-${Date.now()}-${randomUUID()}-${basename}${extension}`);
};

const categoryImageTypes = new Map([
  ['.jpg', 'image/jpeg'],
  ['.jpeg', 'image/jpeg'],
  ['.png', 'image/png'],
  ['.webp', 'image/webp'],
]);

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
  fileFilter: (req, file, callback) => {
    if (String(req.body?.folder || '').toLowerCase() !== 'categories') {
      return callback(null, true);
    }

    const extension = path.extname(file.originalname).toLowerCase();
    if (categoryImageTypes.get(extension) !== file.mimetype.toLowerCase()) {
      return callback(new Error('Category images must be JPG, PNG, or WEBP files.'));
    }
    return callback(null, true);
  },
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
    const originalPath = req.originalUrl.split('?')[0].replace(/\/+$/, '') || '/';
    const inventoryPath = originalPath.replace(/^.*\/inventory(?=\/|$)/, '') || '/';
    const isChefRequestAccess = role === 'chef' && (
      (req.method === 'GET' && ['/products', '/products/options', '/kitchen-requests'].includes(inventoryPath)) ||
      (req.method === 'POST' && ['/kitchen-requests', '/chef-usage'].includes(inventoryPath))
    );

    if (!isAdmin && !isChefRequestAccess) {
      return res.status(403).json({ success: false, message: 'Administrator access is required.' });
    }

    req.auth = user;
    return next();
  } catch (error) {
    console.error('Failed to authorize inventory request:', error);
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
    console.error('Failed to authorize profile request:', error);
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

const requireDeliveryPricingAccess = async (req, res, next) => {
  const token = req.get('authorization')?.replace(/^Bearer\s+/i, '');
  if (!token) return res.status(401).json({ success: false, message: 'Login is required.' });

  try {
    const user = await findUserByToken(token);
    if (!user) return res.status(401).json({ success: false, message: 'Your session is invalid or expired.' });

    const role = String(user.role || '').trim().toLowerCase();
    const isAdmin = ['admin', 'super admin', 'superadmin'].includes(role);
    const isDeliveryPartner = ['delivery', 'delivery partner'].includes(role) && Boolean(user.employee_id);
    if (!isAdmin && !isDeliveryPartner) {
      return res.status(403).json({ success: false, message: 'Administrator or delivery partner access is required.' });
    }

    req.auth = user;
    return next();
  } catch (error) {
    console.error('Failed to authorize delivery pricing request:', error);
    return res.status(500).json({ success: false, message: 'Unable to verify delivery pricing access.' });
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
router.get('/delivery-partners', requireKitchenRole(['chef', 'super admin', 'admin']), listDeliveryPartners);
router.get('/delivery-partner/dashboard', requireDeliveryPartner, getDeliveryPartnerDashboard);
router.get('/delivery-partner/earnings', requireDeliveryPartner, getDeliveryPartnerEarnings);
router.get('/delivery-partner/history', requireDeliveryPartner, getDeliveryPartnerHistory);
router.patch('/delivery-partner/availability', requireDeliveryPartner, updateDeliveryPartnerAvailability);
router.get('/delivery-partner/orders', requireDeliveryPartner, listAssignedDeliveryOrders);
router.patch('/delivery-partner/orders/:orderId/status', requireDeliveryPartner, updateAssignedDeliveryOrderStatus);
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
router.get('/fund', requireAdmin, getFund);
router.post('/fund', requireAdmin, updateFund);
router.use('/expenses', requireAdmin, expensesRouter);
router.use('/salary', requireAdmin, salariesRouter);
router.use('/categories', categoriesRouter);
router.use('/cuisines', cuisinesRouter);
router.use('/foods', foodsRouter);
router.use('/banners', bannersRouter);
router.use('/coupons', couponsRouter);
router.use('/reviews', reviewsRouter);
router.use('/videos', videosRouter);
router.use('/settings', (req, res, next) => {
  if (req.method === 'GET' && req.path === '/delivery') {
    return requireDeliveryPricingAccess(req, res, next);
  }
  return requireAdmin(req, res, next);
}, settingsRouter);
router.use('/cart', optionalAuth, cartRouter);
router.use('/wishlist', requireAuthenticatedUser, wishlistRouter);
router.use('/reservations', (req, res, next) => {
  if (req.path === '/available-tables') return next();
  if (req.path === '/mine' || req.method === 'POST' && req.path === '/') {
    return requireAuthenticatedUser(req, res, () => {
      const role = String(req.auth?.role || '').trim().toLowerCase();
      if (!['user', 'customer', 'admin', 'super admin', 'superadmin'].includes(role)) {
        return res.status(403).json({ success: false, message: 'Customer or administrator access is required to manage your reservations.' });
      }
      return next();
    });
  }
  return requireAdmin(req, res, next);
}, reservationsRouter);
const requireEventOrderAccess = async (req, res, next) => {
  const token = req.get('authorization')?.replace(/^Bearer\s+/i, '');
  if (!token) return res.status(401).json({ success: false, message: 'Login is required.' });

  try {
    const user = await findUserByToken(token);
    if (!user) return res.status(401).json({ success: false, message: 'Your session is invalid or expired.' });

    const role = String(user.role || '').trim().toLowerCase();
    const isAdmin = ['admin', 'super admin', 'superadmin'].includes(role);
    const isChef = role === 'chef';

    if (isAdmin) {
      req.auth = user;
      return next();
    }

    if (isChef) {
      const isAllowedChefMethod = (req.method === 'GET') || (req.method === 'PATCH' && req.path.endsWith('/status'));
      if (isAllowedChefMethod) {
        req.auth = user;
        return next();
      }
      return res.status(403).json({ success: false, message: 'Administrator access is required for this action.' });
    }

    return res.status(403).json({ success: false, message: 'Administrator access is required.' });
  } catch (error) {
    console.error('Failed to authorize event order request:', error);
    return res.status(500).json({ success: false, message: 'Unable to verify access.' });
  }
};

router.use('/event-orders', (req, res, next) => {
  if (req.path === '/menu') return next();
  if (req.method === 'POST' && req.path === '/') return optionalAuth(req, res, next);
  if (req.path === '/mine') return requireAuthenticatedUser(req, res, next);
  if (req.method === 'POST' && req.path.endsWith('/respond')) return requireAuthenticatedUser(req, res, next);
  return requireEventOrderAccess(req, res, next);
}, eventOrdersRouter);
router.use('/inventory', requireInventoryAccess, inventoryRouter);
router.use('/server-supplies', serverSuppliesRouter);
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
router.use('/attendance', attendanceRouter);

router.use('/server-tables', optionalAuth, serverTableRouter);
router.post('/kitchen-orders', requireKitchenRole(['server', 'admin', 'super admin', 'superadmin']), submitKitchenOrder);
router.get('/kitchen-orders', requireKitchenRole(['chef', 'server', 'super admin', 'admin']), getKitchenOrders);
router.patch('/kitchen-orders/:orderId/status', requireKitchenRole(['chef', 'server', 'super admin', 'admin']), changeKitchenOrderStatus);

router.get('/table-bills/active/:tableId', requireKitchenRole(['server', 'super admin', 'admin']), getActiveBill);
router.post('/table-bills/merge', requireKitchenRole(['server', 'super admin', 'admin']), mergeBills);
router.get('/table-bills/:billId', requireKitchenRole(['server', 'super admin', 'admin']), getBill);
router.post('/table-bills/:billId/settle', requireKitchenRole(['server', 'super admin', 'admin']), settleBill);
router.get('/table-bills', requireKitchenRole(['server', 'super admin', 'admin']), getAllBills);

const handleSingleUpload = (req, res, next) => {
  upload.single('file')(req, res, (error) => {
    if (!error) return next();
    const isFileTooLarge =
      error instanceof multer.MulterError && error.code === 'LIMIT_FILE_SIZE';
    const message = isFileTooLarge
      ? 'Uploaded files must be 5 MB or smaller.'
      : error.message || 'File upload failed.';
    return res.status(isFileTooLarge ? 413 : 400).json({
      success: false,
      message,
    });
  });
};

const isValidCategoryImageContent = async (filePath) => {
  const file = await fs.promises.open(filePath, 'r');
  try {
    const header = Buffer.alloc(12);
    const { bytesRead } = await file.read(header, 0, header.length, 0);
    if (bytesRead < header.length) return false;
    const isJpeg = header[0] === 0xff && header[1] === 0xd8 && header[2] === 0xff;
    const isPng = header.subarray(0, 8).equals(
      Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    );
    const isWebp =
      header.toString('ascii', 0, 4) === 'RIFF' &&
      header.toString('ascii', 8, 12) === 'WEBP';
    return isJpeg || isPng || isWebp;
  } finally {
    await file.close();
  }
};

router.post('/upload', optionalAuth, handleSingleUpload, async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ success: false, message: 'A file is required' });
  }

  if (String(req.body?.folder || '').toLowerCase() === 'categories') {
    let isValidImage = false;
    try {
      isValidImage = await isValidCategoryImageContent(req.file.path);
    } catch (error) {
      console.error('Unable to validate category image upload:', error.message);
    }
    if (!isValidImage) {
      await fs.promises.unlink(req.file.path);
      return res.status(400).json({
        success: false,
        message: 'Uploaded file is not a valid JPG, PNG, or WEBP image.',
      });
    }

    const role = String(req.auth?.role || '').trim().toLowerCase();
    if (!['admin', 'super admin', 'superadmin'].includes(role)) {
      await fs.promises.unlink(req.file.path);
      return res.status(req.auth ? 403 : 401).json({
        success: false,
        message: req.auth
          ? 'Administrator access is required to upload category images.'
          : 'Administrator login is required to upload category images.',
      });
    }
  }

  const relativePath = path.relative(uploadDirectory, req.file.path)
    .split(path.sep)
    .map(encodeURIComponent)
    .join('/');
  return res.status(201).json({
    success: true,
    filename: req.file.filename,
    url: `/uploads/${relativePath}`,
  });
});

router.post('/upload/multiple', upload.array('files', 50), (req, res) => {
  if (!req.files || req.files.length === 0) {
    return res.status(400).json({ success: false, message: 'At least one file is required' });
  }

  const urls = req.files.map((f) => {
    const rel = path.relative(uploadDirectory, f.path)
      .split(path.sep)
      .map(encodeURIComponent)
      .join('/');
    return `/uploads/${rel}`;
  });

  return res.status(201).json({
    success: true,
    urls,
  });
});

router.use('/gallery', galleryRouter);

module.exports = router;