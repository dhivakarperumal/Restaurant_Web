const express = require('express');
const { findUserByToken } = require('../modules/auth');
const controller = require('../controllers/bannerController');

const router = express.Router();
const isAdminRole = (role) => ['admin', 'super admin', 'superadmin'].includes(String(role || '').trim().toLowerCase());

const requireAdmin = async (req, res, next) => {
  const token = req.get('authorization')?.replace(/^Bearer\s+/i, '');
  if (!token) return res.status(401).json({ success: false, message: 'Administrator login is required.' });

  try {
    const user = await findUserByToken(token);
    if (!user) return res.status(401).json({ success: false, message: 'Your session is invalid or expired.' });
    if (!isAdminRole(user.role)) return res.status(403).json({ success: false, message: 'Administrator access is required.' });
    req.auth = user;
    return next();
  } catch (error) {
    console.error('Failed to authorize banner request:', error.message);
    return res.status(500).json({ success: false, message: 'Unable to verify administrator access.' });
  }
};

router.get('/public', controller.publicList);
router.use(requireAdmin);
router.get('/', controller.list);
router.get('/:bannerId', controller.getById);
router.post('/', controller.create);
router.put('/:bannerId', controller.update);
router.delete('/:bannerId', controller.remove);

module.exports = router;