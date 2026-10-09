const express = require('express');
const { findUserByToken } = require('../modules/auth');
const controller = require('../controllers/reviewController');

const router = express.Router();
const isAdminRole = (role) =>
  ['admin', 'super admin', 'superadmin'].includes(String(role || '').trim().toLowerCase());

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
    console.error('Failed to authorize review request:', error.message);
    return res.status(500).json({ success: false, message: 'Unable to verify administrator access.' });
  }
};

// Static routes MUST come before /:reviewId to avoid being swallowed by the param
router.get('/published', controller.listPublished);
router.get('/stats',   requireAdmin, controller.stats);
router.get('/next-id', requireAdmin, controller.nextId);

router.get('/',                requireAdmin, controller.list);
router.get('/:reviewId',       requireAdmin, controller.getById);
router.post('/',               requireAdmin, controller.create);
router.put('/:reviewId',       requireAdmin, controller.update);
router.delete('/:reviewId',    requireAdmin, controller.remove);

module.exports = router;
