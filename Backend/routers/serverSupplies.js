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
  listServerSupplyRequests,
  createServerSupplyRequest,
  decideServerSupplyRequest,
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

const requireAdmin = (req, res, next) => {
  const role = String(req.auth?.role || '').trim().toLowerCase();
  if (!adminRoles.includes(role)) {
    return res.status(403).json({ success: false, message: 'Administrator approval is required.' });
  }
  return next();
};

const requireServer = (req, res, next) => {
  if (String(req.auth?.role || '').trim().toLowerCase() !== 'server') {
    return res.status(403).json({ success: false, message: 'Only Server staff can submit supply requests.' });
  }
  return next();
};

const getActorName = (user) => String(
  user?.username || user?.name || user?.email || user?.user_id || 'Unknown user'
);

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

router.get('/requests', withErrorHandler(async (req, res) => {
  const isAdmin = adminRoles.includes(String(req.auth.role || '').trim().toLowerCase());
  const requests = await listServerSupplyRequests(isAdmin ? null : getActorName(req.auth));
  res.json({ success: true, data: requests });
}));

router.post('/requests', requireServer, withErrorHandler(async (req, res) => {
  const request = await createServerSupplyRequest(req.body, getActorName(req.auth));
  res.status(201).json({ success: true, message: 'Supply request sent to Admin for approval.', data: request });
}));

router.patch('/requests/:requestId/approve', requireAdmin, withErrorHandler(async (req, res) => {
  const request = await decideServerSupplyRequest(
    parseId(req.params.requestId),
    'approved',
    getActorName(req.auth),
    req.body?.reason
  );
  res.json({ success: true, message: 'Supply request approved and stock updated.', data: request });
}));

router.patch('/requests/:requestId/reject', requireAdmin, withErrorHandler(async (req, res) => {
  const request = await decideServerSupplyRequest(
    parseId(req.params.requestId),
    'rejected',
    getActorName(req.auth),
    req.body?.reason
  );
  res.json({ success: true, message: 'Supply request rejected.', data: request });
}));

router.post('/', requireAdmin, withErrorHandler(async (req, res) => {
  const item = await createServerSupplyItem(req.body);
  res.status(201).json({ success: true, message: 'Server supply item created.', data: item });
}));

router.put('/:id', requireAdmin, withErrorHandler(async (req, res) => {
  const item = await updateServerSupplyItem(parseId(req.params.id), req.body);
  res.json({ success: true, message: 'Server supply item updated.', data: item });
}));

router.delete('/:id', requireAdmin, withErrorHandler(async (req, res) => {
  await deleteServerSupplyItem(parseId(req.params.id));
  res.json({ success: true, message: 'Server supply item deleted.' });
}));

router.get('/:id/movements', withErrorHandler(async (req, res) => {
  const movements = await listServerSupplyMovements(parseId(req.params.id));
  res.json({ success: true, data: movements });
}));

router.post('/:id/stock-in', requireAdmin, withErrorHandler(async (req, res) => {
  const item = await createServerSupplyMovement(
    parseId(req.params.id), req.body, 'stock-in', getActorName(req.auth)
  );
  res.json({ success: true, message: 'Stock added successfully.', data: item });
}));

router.post('/:id/stock-out', requireAdmin, withErrorHandler(async (req, res) => {
  const item = await createServerSupplyMovement(
    parseId(req.params.id), req.body, 'stock-out', getActorName(req.auth)
  );
  res.json({ success: true, message: 'Stock issued successfully.', data: item });
}));

module.exports = router;
