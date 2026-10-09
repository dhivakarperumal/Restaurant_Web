const { randomUUID } = require('crypto');
const db = require('../config/db');

async function initializeAttendanceSchema() {
  await db.query(`
    CREATE TABLE IF NOT EXISTS employee_attendance (
      id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
      attendance_id VARCHAR(255) NOT NULL UNIQUE,
      employee_id VARCHAR(255) NOT NULL,
      user_id VARCHAR(255) NOT NULL,
      date DATE NOT NULL,
      check_in DATETIME NOT NULL,
      check_out DATETIME NULL,
      total_hours DECIMAL(6, 2) NULL DEFAULT 0.00,
      status VARCHAR(30) NOT NULL DEFAULT 'Present',
      notes TEXT NULL,
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP NULL DEFAULT NULL ON UPDATE CURRENT_TIMESTAMP,
      UNIQUE KEY unique_employee_daily_attendance (employee_id, date),
      INDEX attendance_date_idx (date),
      INDEX attendance_employee_idx (employee_id),
      INDEX attendance_status_idx (status),
      CONSTRAINT fk_att_employee FOREIGN KEY (employee_id)
        REFERENCES employees (employee_id) ON DELETE CASCADE,
      CONSTRAINT fk_att_user FOREIGN KEY (user_id)
        REFERENCES users (user_id) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);
}

async function recordLoginAttendance(userId, employeeId) {
  if (!userId) return null;
  let empId = employeeId;
  if (!empId) {
    try {
      const [empRows] = await db.execute('SELECT employee_id FROM employees WHERE user_id = ? LIMIT 1', [userId]);
      empId = empRows[0]?.employee_id;
    } catch {
      return null;
    }
  }
  if (!empId) return null;

  try {
    // 1. Check if record already exists for today
    const [existing] = await db.execute(
      'SELECT * FROM employee_attendance WHERE employee_id = ? AND date = CURDATE() LIMIT 1',
      [empId]
    );

    if (existing.length > 0) {
      return existing[0];
    }

    // 2. Check if employee has a start_time to check for late arrival (>15 mins after shift start)
    const [empRows] = await db.execute(
      'SELECT start_time FROM employees WHERE employee_id = ? LIMIT 1',
      [empId]
    );

    let initialStatus = 'Present';
    if (empRows.length > 0 && empRows[0].start_time) {
      const [timeCheck] = await db.execute(
        "SELECT IF(CURTIME() > ADDTIME(?, '00:15:00'), 'Late', 'Present') AS check_status",
        [empRows[0].start_time]
      );
      if (timeCheck.length > 0 && timeCheck[0].check_status === 'Late') {
        initialStatus = 'Late';
      }
    }

    const attendanceId = `ATT-${randomUUID()}`;
    await db.execute(
      `INSERT INTO employee_attendance (attendance_id, employee_id, user_id, date, check_in, status)
       VALUES (?, ?, ?, CURDATE(), NOW(), ?)`,
      [attendanceId, empId, userId, initialStatus]
    );

    const [created] = await db.execute(
      'SELECT * FROM employee_attendance WHERE attendance_id = ? LIMIT 1',
      [attendanceId]
    );

    // Auto set delivery partner online upon checkin
    try {
      await db.execute(
        "UPDATE employees SET available_for_delivery = 'Yes', current_status = 'Available', updated_at = CURRENT_TIMESTAMP WHERE employee_id = ? AND employee_type = 'Delivery Partner'",
        [empId]
      );
    } catch (ignore) {}

    return created[0] || null;
  } catch (error) {
    console.error('Error recording login attendance:', error);
    // Don't throw to avoid failing login, but return null
    return null;
  }
}

async function clockInEmployee(employeeId, userId) {
  if (!employeeId) throw new Error('Employee ID is required');

  const [existing] = await db.execute(
    'SELECT * FROM employee_attendance WHERE employee_id = ? AND date = CURDATE() LIMIT 1',
    [employeeId]
  );

  if (existing.length > 0) {
    // If they were clocked out, resume/reopen
    if (existing[0].check_out) {
      await db.execute(
        'UPDATE employee_attendance SET check_out = NULL, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
        [existing[0].id]
      );
      try {
        await db.execute(
          "UPDATE employees SET available_for_delivery = 'Yes', current_status = 'Available', updated_at = CURRENT_TIMESTAMP WHERE employee_id = ? AND employee_type = 'Delivery Partner'",
          [employeeId]
        );
      } catch (ignore) {}
      const [updated] = await db.execute(
        'SELECT * FROM employee_attendance WHERE id = ? LIMIT 1',
        [existing[0].id]
      );
      return updated[0];
    }
    try {
      await db.execute(
        "UPDATE employees SET available_for_delivery = 'Yes', current_status = 'Available', updated_at = CURRENT_TIMESTAMP WHERE employee_id = ? AND employee_type = 'Delivery Partner'",
        [employeeId]
      );
    } catch (ignore) {}
    return existing[0];
  }

  // Not yet clocked in today
  let uid = userId;
  if (!uid) {
    const [emp] = await db.execute('SELECT user_id FROM employees WHERE employee_id = ? LIMIT 1', [employeeId]);
    uid = emp[0]?.user_id;
  }

  return recordLoginAttendance(uid, employeeId);
}

async function clockOutEmployee(employeeId) {
  if (!employeeId) throw new Error('Employee ID is required');

  const [existing] = await db.execute(
    'SELECT * FROM employee_attendance WHERE employee_id = ? AND date = CURDATE() LIMIT 1',
    [employeeId]
  );

  if (existing.length === 0) {
    throw new Error('No attendance check-in found for today. Please clock in first.');
  }

  await db.execute(
    `UPDATE employee_attendance
     SET check_out = NOW(),
         total_hours = ROUND(TIMESTAMPDIFF(SECOND, check_in, NOW()) / 3600, 2),
         updated_at = CURRENT_TIMESTAMP
     WHERE id = ?`,
    [existing[0].id]
  );

  // When clocking out, set delivery partner offline
  try {
    await db.execute(
      "UPDATE employees SET available_for_delivery = 'No', current_status = 'Offline', updated_at = CURRENT_TIMESTAMP WHERE employee_id = ? AND employee_type = 'Delivery Partner'",
      [employeeId]
    );
  } catch (ignore) {}

  const [updated] = await db.execute(
    'SELECT * FROM employee_attendance WHERE id = ? LIMIT 1',
    [existing[0].id]
  );
  return updated[0];
}

async function getTodayAttendance(employeeId) {
  if (!employeeId) return null;

  const [rows] = await db.execute(
    `SELECT a.*, 
            TIMESTAMPDIFF(SECOND, a.check_in, COALESCE(a.check_out, NOW())) AS duration_seconds,
            e.full_name,
            e.employee_type,
            e.start_time,
            e.end_time
     FROM employee_attendance a
     LEFT JOIN employees e ON a.employee_id = e.employee_id
     WHERE a.employee_id = ? AND a.date = CURDATE()
     LIMIT 1`,
    [employeeId]
  );
  return rows[0] || null;
}

async function getStaffAttendanceHistory(employeeId, limit = 60) {
  if (!employeeId) return [];

  const [rows] = await db.execute(
    `SELECT a.*,
            TIMESTAMPDIFF(SECOND, a.check_in, COALESCE(a.check_out, NOW())) AS duration_seconds,
            e.full_name,
            e.employee_type,
            e.start_time,
            e.end_time
     FROM employee_attendance a
     LEFT JOIN employees e ON a.employee_id = e.employee_id
     WHERE a.employee_id = ?
     ORDER BY a.date DESC, a.check_in DESC
     LIMIT ?`,
    [employeeId, Number(limit) || 60]
  );
  return rows;
}

async function getAdminAttendanceList({ date, employeeType, status, search }) {
  const targetDate = date ? String(date).slice(0, 10) : null;
  const params = [];

  let query = `
    SELECT 
      e.employee_id,
      e.user_id,
      e.full_name,
      e.employee_type,
      e.phone_number,
      e.email,
      e.profile_photo,
      e.status AS employment_status,
      e.start_time,
      e.end_time,
      a.id AS attendance_record_id,
      a.attendance_id,
      COALESCE(a.date, ${targetDate ? '?' : 'CURDATE()'}) AS attendance_date,
      a.check_in,
      a.check_out,
      a.total_hours,
      CASE
        WHEN a.id IS NOT NULL THEN a.status
        ELSE 'Absent'
      END AS attendance_status,
      a.notes,
      CASE
        WHEN a.check_in IS NOT NULL AND a.check_out IS NULL THEN 'Working'
        WHEN a.check_in IS NOT NULL AND a.check_out IS NOT NULL THEN 'Completed'
        ELSE 'Absent'
      END AS shift_state,
      CASE
        WHEN a.check_in IS NOT NULL THEN TIMESTAMPDIFF(SECOND, a.check_in, COALESCE(a.check_out, NOW()))
        ELSE 0
      END AS duration_seconds
    FROM employees e
    LEFT JOIN employee_attendance a 
      ON a.employee_id = e.employee_id AND a.date = ${targetDate ? '?' : 'CURDATE()'}
    WHERE e.status = 'Active'
  `;

  if (targetDate) {
    params.push(targetDate, targetDate);
  }

  if (employeeType && employeeType !== 'All') {
    query += ' AND e.employee_type = ?';
    params.push(employeeType);
  }

  if (status && status !== 'All') {
    if (status === 'Present') {
      query += " AND a.status IN ('Present', 'Late', 'Half Day')";
    } else if (status === 'Late') {
      query += " AND a.status = 'Late'";
    } else if (status === 'Absent') {
      query += " AND (a.id IS NULL OR a.status = 'Absent')";
    } else if (status === 'Working') {
      query += ' AND a.check_in IS NOT NULL AND a.check_out IS NULL';
    } else if (status === 'Completed') {
      query += ' AND a.check_in IS NOT NULL AND a.check_out IS NOT NULL';
    } else {
      query += ' AND a.status = ?';
      params.push(status);
    }
  }

  if (search && search.trim()) {
    const term = `%${search.trim()}%`;
    query += ' AND (e.full_name LIKE ? OR e.employee_id LIKE ? OR e.phone_number LIKE ? OR e.email LIKE ?)';
    params.push(term, term, term, term);
  }

  query += ' ORDER BY a.check_in DESC, e.full_name ASC';

  const [rows] = await db.execute(query, params);
  return rows;
}

async function getAdminAttendanceSummary(date) {
  const targetDate = date ? String(date).slice(0, 10) : null;
  const datePlaceholder = targetDate ? '?' : 'CURDATE()';
  const params = targetDate ? [targetDate, targetDate] : [];

  const [summaryRows] = await db.execute(
    `SELECT 
      COUNT(DISTINCT e.employee_id) AS total_active_staff,
      COUNT(DISTINCT CASE WHEN a.check_in IS NOT NULL THEN e.employee_id END) AS present_count,
      COUNT(DISTINCT CASE WHEN a.check_in IS NOT NULL AND a.check_out IS NULL THEN e.employee_id END) AS working_now_count,
      COUNT(DISTINCT CASE WHEN a.check_in IS NOT NULL AND a.check_out IS NOT NULL THEN e.employee_id END) AS completed_count,
      COUNT(DISTINCT CASE WHEN a.status = 'Late' THEN e.employee_id END) AS late_count,
      COUNT(DISTINCT CASE WHEN a.id IS NULL OR a.status = 'Absent' THEN e.employee_id END) AS absent_count
    FROM employees e
    LEFT JOIN employee_attendance a 
      ON a.employee_id = e.employee_id AND a.date = ${datePlaceholder}
    WHERE e.status = 'Active'`,
    params
  );

  return summaryRows[0] || {
    total_active_staff: 0,
    present_count: 0,
    working_now_count: 0,
    completed_count: 0,
    late_count: 0,
    absent_count: 0,
  };
}

async function adminSaveAttendance({ employeeId, date, checkIn, checkOut, status, notes }) {
  if (!employeeId || !date) throw new Error('Employee ID and date are required');

  const [emp] = await db.execute('SELECT user_id FROM employees WHERE employee_id = ? LIMIT 1', [employeeId]);
  if (emp.length === 0) throw new Error('Employee not found');
  const userId = emp[0].user_id;

  const targetDate = String(date).slice(0, 10);
  const [existing] = await db.execute(
    'SELECT * FROM employee_attendance WHERE employee_id = ? AND date = ? LIMIT 1',
    [employeeId, targetDate]
  );

  let checkInVal = checkIn ? new Date(checkIn) : null;
  let checkOutVal = checkOut ? new Date(checkOut) : null;
  let totalHours = 0;

  if (checkInVal && checkOutVal) {
    const diffMs = checkOutVal.getTime() - checkInVal.getTime();
    totalHours = Math.max(0, Math.round((diffMs / 3600000) * 100) / 100);
  }

  if (existing.length > 0) {
    await db.execute(
      `UPDATE employee_attendance
       SET check_in = COALESCE(?, check_in),
           check_out = ?,
           total_hours = ?,
           status = COALESCE(?, status),
           notes = ?,
           updated_at = CURRENT_TIMESTAMP
       WHERE id = ?`,
      [checkInVal, checkOutVal, totalHours, status || 'Present', notes || null, existing[0].id]
    );

    const [updated] = await db.execute('SELECT * FROM employee_attendance WHERE id = ? LIMIT 1', [existing[0].id]);
    return updated[0];
  } else {
    const attendanceId = `ATT-${randomUUID()}`;
    await db.execute(
      `INSERT INTO employee_attendance (attendance_id, employee_id, user_id, date, check_in, check_out, total_hours, status, notes)
       VALUES (?, ?, ?, ?, COALESCE(?, NOW()), ?, ?, ?, ?)`,
      [attendanceId, employeeId, userId, targetDate, checkInVal, checkOutVal, totalHours, status || 'Present', notes || null]
    );

    const [created] = await db.execute('SELECT * FROM employee_attendance WHERE attendance_id = ? LIMIT 1', [attendanceId]);
    return created[0];
  }
}

async function adminDeleteAttendance(recordId) {
  if (!recordId) throw new Error('Attendance record ID is required');
  const [result] = await db.execute(
    'DELETE FROM employee_attendance WHERE id = ? OR attendance_id = ?',
    [recordId, recordId]
  );
  return result.affectedRows > 0;
}

module.exports = {
  adminDeleteAttendance,
  adminSaveAttendance,
  clockInEmployee,
  clockOutEmployee,
  getAdminAttendanceList,
  getAdminAttendanceSummary,
  getStaffAttendanceHistory,
  getTodayAttendance,
  initializeAttendanceSchema,
  recordLoginAttendance,
};
