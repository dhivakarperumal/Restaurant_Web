const express = require('express');
const {
  adminDeleteAttendance,
  adminSaveAttendance,
  clockIn,
  clockOut,
  getAdminAttendanceList,
  getAdminAttendanceSummary,
  getMyAttendanceHistory,
  getTodayAttendance,
} = require('../controllers/attendanceController');
const { findUserByToken } = require('../modules/auth');

const router = express.Router();

const requireAuthenticatedUser = async (req, res, next) => {
  const token = req.get('authorization')?.replace(/^Bearer\s+/i, '');
  if (!token) return res.status(401).json({ success: false, message: 'Login is required.' });
  try {
    const user = await findUserByToken(token);
    if (!user) return res.status(401).json({ success: false, message: 'Your session is invalid or expired.' });
    req.auth = user;
    return next();
  } catch (error) {
    console.error('Failed to authorize attendance request:', error);
    return res.status(500).json({ success: false, message: 'Unable to verify your session.' });
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
    console.error('Failed to authorize admin attendance request:', error.message);
    return res.status(500).json({ success: false, message: 'Unable to verify administrator access.' });
  }
};

// Staff self-service routes (Chef, Server, Delivery Partner, etc.)
router.get('/today', requireAuthenticatedUser, getTodayAttendance);
router.post('/clock-in', requireAuthenticatedUser, clockIn);
router.post('/clock-out', requireAuthenticatedUser, clockOut);
router.get('/my-history', requireAuthenticatedUser, getMyAttendanceHistory);

// Admin management routes
router.get('/admin/records', requireAdmin, getAdminAttendanceList);
router.get('/admin/summary', requireAdmin, getAdminAttendanceSummary);
router.post('/admin/mark', requireAdmin, adminSaveAttendance);
router.put('/admin/:id', requireAdmin, adminSaveAttendance);
router.delete('/admin/:id', requireAdmin, adminDeleteAttendance);

module.exports = router;
