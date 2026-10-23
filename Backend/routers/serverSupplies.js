const express = require('express');
const { findUserByToken } = require('../modules/auth');
const {
  SuppliesError,
  listServerSupplyCategories,
  listServerSupplyItems,
  createServerSupplyItem,
  updateServerSupplyItem,
  deleteServerSupplyItem,
  listServerSupplyMovements,
  createServerSupplyMovement,
} = require('../modules/serverSupplies');

const router = express.Router();
const adminRoles = ['admin', 'super admin', 'superadmin'];

const requireSuppliesAccess = async (req, res, next) => {
  const token = req.get('authorization')?.replace(/^Bearer\s+/i, '');
  if (!token) return res.status(401).json({ success: false, message: 'Login is required.' });
  try {
    const user = await findUserByToken(token);
    if (!user) return res.status(401).json({ success: false, message: 'Your session is invalid or expired.' });
    const role = String(user.role || '').trim().toLowerCase();
    const isAdmin = adminRoles.includes(role);
    if (!isAdmin && role !== 'server') {
      return res.status(403).json({ success: false, message: 'Server Supplies access is required.' });
    }
    req.auth = user;
    return next();
  } catch (error) {
    console.error('Failed to authorize server supplies request:', error.message);
    return res.status(500).json({ success: false, message: 'Unable to verify access.' });
  }
};

const withErrorHandler = (handler) => async (req, res) => {
  try {
    await handler(req, res);
  } catch (error) {
    const status = error instanceof SuppliesError ? error.statusCode : 500;
    if (status >= 500) console.error('Server supplies request failed:', error.message);
    res.status(status).json({
      success: false,
      message: status >= 500 ? 'Server Supplies request failed.' : error.message,
    });
  }
};

const parseId = (value) => {
  if (!/^\d+$/.test(value) || Number(value) < 1) throw new SuppliesError('A valid item id is required.');
  return Number(value);
};

router.use(requireSuppliesAccess);

router.get('/', withErrorHandler(async (_req, res) => {
  res.json({ success: true, data: await listServerSupplyItems() });
}));

router.get('/categories', withErrorHandler(async (_req, res) => {
  res.json({ success: true, data: await listServerSupplyCategories() });
}));

router.post('/', withErrorHandler(async (req, res) => {
  const item = await createServerSupplyItem(req.body);
  res.status(201).json({ success: true, message: 'Server supply item created.', data: item });
}));

router.put('/:id', withErrorHandler(async (req, res) => {
  const item = await updateServerSupplyItem(parseId(req.params.id), req.body);
  res.json({ success: true, message: 'Server supply item updated.', data: item });
}));

router.delete('/:id', withErrorHandler(async (req, res) => {
  await deleteServerSupplyItem(parseId(req.params.id));
  res.json({ success: true, message: 'Server supply item deleted.' });
}));

router.get('/:id/movements', withErrorHandler(async (req, res) => {
  const movements = await listServerSupplyMovements(parseId(req.params.id));
  res.json({ success: true, data: movements });
}));

router.post('/:id/stock-in', withErrorHandler(async (req, res) => {
  const item = await createServerSupplyMovement(
    parseId(req.params.id), req.body, 'stock-in', req.auth.user_id || req.auth.username
  );
  res.json({ success: true, message: 'Stock added successfully.', data: item });
}));

router.post('/:id/stock-out', withErrorHandler(async (req, res) => {
  const item = await createServerSupplyMovement(
    parseId(req.params.id), req.body, 'stock-out', req.auth.user_id || req.auth.username
  );
  res.json({ success: true, message: 'Stock issued successfully.', data: item });
}));

module.exports = router;
