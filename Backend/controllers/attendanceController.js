const {
  adminDeleteAttendance: deleteAttendanceRecord,
  adminSaveAttendance: saveAttendanceRecord,
  clockInEmployee,
  clockOutEmployee,
  getAdminAttendanceList: fetchAdminAttendanceList,
  getAdminAttendanceSummary: fetchAdminAttendanceSummary,
  getStaffAttendanceHistory: fetchStaffAttendanceHistory,
  getTodayAttendance: fetchTodayAttendance,
} = require('../modules/attendance');
const db = require('../config/db');

async function resolveEmployeeId(req) {
  if (req.auth?.employee_id) return req.auth.employee_id;
  if (!req.auth?.user_id) return null;
  const [rows] = await db.execute('SELECT employee_id FROM employees WHERE user_id = ? LIMIT 1', [req.auth.user_id]);
  return rows[0]?.employee_id || null;
}

async function getTodayAttendance(req, res) {
  try {
    const employeeId = await resolveEmployeeId(req);
    if (!employeeId) {
      return res.status(404).json({ success: false, message: 'No employee record linked to this account.' });
    }

    const attendance = await fetchTodayAttendance(employeeId);
    const [empRows] = await db.execute(
      'SELECT employee_id, full_name, employee_type, phone_number, email, start_time, end_time, profile_photo FROM employees WHERE employee_id = ? LIMIT 1',
      [employeeId]
    );

    return res.json({
      success: true,
      data: attendance,
      employee: empRows[0] || null,
      shift: empRows[0] ? { start_time: empRows[0].start_time, end_time: empRows[0].end_time } : null,
    });
  } catch (error) {
    console.error('Failed to get today attendance:', error.message);
    return res.status(500).json({ success: false, message: 'Unable to retrieve today attendance.' });
  }
}

async function clockIn(req, res) {
  try {
    const employeeId = await resolveEmployeeId(req);
    if (!employeeId) {
      return res.status(404).json({ success: false, message: 'No employee record linked to this account.' });
    }

    const attendance = await clockInEmployee(employeeId, req.auth.user_id);
    return res.json({ success: true, message: 'Clocked in successfully.', data: attendance });
  } catch (error) {
    console.error('Failed to clock in:', error.message);
    return res.status(500).json({ success: false, message: error.message || 'Unable to clock in.' });
  }
}

async function clockOut(req, res) {
  try {
    const employeeId = await resolveEmployeeId(req);
    if (!employeeId) {
      return res.status(404).json({ success: false, message: 'No employee record linked to this account.' });
    }

    const attendance = await clockOutEmployee(employeeId);
    return res.json({ success: true, message: 'Clocked out successfully.', data: attendance });
  } catch (error) {
    console.error('Failed to clock out:', error.message);
    return res.status(400).json({ success: false, message: error.message || 'Unable to clock out.' });
  }
}

async function getMyAttendanceHistory(req, res) {
  try {
    const employeeId = await resolveEmployeeId(req);
    if (!employeeId) {
      return res.status(404).json({ success: false, message: 'No employee record linked to this account.' });
    }

    const limit = Number(req.query.limit) || 30;
    const records = await fetchStaffAttendanceHistory(employeeId, limit);
    return res.json({ success: true, data: records });
  } catch (error) {
    console.error('Failed to fetch attendance history:', error.message);
    return res.status(500).json({ success: false, message: 'Unable to retrieve attendance history.' });
  }
}

async function getAdminAttendanceList(req, res) {
  try {
    const { date, employeeType, status, search } = req.query;
    const records = await fetchAdminAttendanceList({ date, employeeType, status, search });
    return res.json({ success: true, data: records });
  } catch (error) {
    console.error('Failed to fetch admin attendance list:', error);
    return res.status(500).json({ success: false, message: 'Unable to retrieve attendance records.' });
  }
}

async function getAdminAttendanceSummary(req, res) {
  try {
    const { date } = req.query;
    const summary = await fetchAdminAttendanceSummary(date);
    return res.json({ success: true, data: summary });
  } catch (error) {
    console.error('Failed to fetch attendance summary:', error.message);
    return res.status(500).json({ success: false, message: 'Unable to retrieve attendance summary.' });
  }
}

async function adminSaveAttendance(req, res) {
  try {
    const { employeeId, date, checkIn, checkOut, status, notes } = req.body || {};
    if (!employeeId || !date) {
      return res.status(400).json({ success: false, message: 'Employee ID and date are required.' });
    }

    const saved = await saveAttendanceRecord({ employeeId, date, checkIn, checkOut, status, notes });
    return res.json({ success: true, message: 'Attendance record saved successfully.', data: saved });
  } catch (error) {
    console.error('Failed to save attendance record:', error.message);
    return res.status(500).json({ success: false, message: error.message || 'Unable to save attendance record.' });
  }
}

async function adminDeleteAttendance(req, res) {
  try {
    const { id } = req.params;
    const success = await deleteAttendanceRecord(id);
    if (!success) {
      return res.status(404).json({ success: false, message: 'Attendance record not found.' });
    }
    return res.json({ success: true, message: 'Attendance record removed.' });
  } catch (error) {
    console.error('Failed to delete attendance record:', error.message);
    return res.status(500).json({ success: false, message: 'Unable to delete attendance record.' });
  }
}

module.exports = {
  adminDeleteAttendance,
  adminSaveAttendance,
  clockIn,
  clockOut,
  getAdminAttendanceList,
  getAdminAttendanceSummary,
  getMyAttendanceHistory,
  getTodayAttendance,
};
