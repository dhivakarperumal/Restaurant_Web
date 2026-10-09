const { randomUUID } = require('crypto');
const db = require('../config/db');
const { hashPassword } = require('./auth');

const employeeTypeConfig = new Map([
  ['Chef', { prefix: 'CHEF', role: 'Chef' }],
  ['Delivery Partner', { prefix: 'DEL', role: 'Delivery' }],
  ['Server', { prefix: 'SER', role: 'Server' }],
  ['Cashier', { prefix: 'CASH', role: 'Cashier' }],
  ['Manager', { prefix: 'MAN', role: 'Manager' }],
  ['Cleaner', { prefix: 'CLEAN', role: 'Cleaner' }],
]);

const employeeColumns = [
  'employee_type', 'full_name', 'profile_photo', 'gender', 'date_of_birth', 'phone_number',
  'whatsapp_number', 'email', 'status', 'cuisine_type', 'experience_years',
  'description', 'special_dishes', 'food_preference', 'address', 'area_locality', 'city',
  'district', 'state', 'pincode', 'latitude', 'longitude', 'vehicle_type', 'vehicle_number',
  'vehicle_model', 'vehicle_color', 'driving_license_number', 'driving_license_expiry_date',
  'rc_number', 'rc_document_upload', 'driving_license_upload', 'vehicle_photo', 'working_days',
  'start_time', 'end_time', 'available_for_delivery', 'current_status', 'account_holder_name',
  'bank_name', 'account_number', 'ifsc_code', 'upi_id', 'pan_number', 'bank_proof_upload',
  'aadhaar_number', 'aadhaar_id_proof', 'pan_card_number', 'pan_card', 'fssai_certificate',
  'driving_license', 'rc_book', 'insurance_certificate', 'address_proof', 'chef_photo',
  'other_documents', 'salary_type', 'basic_salary', 'allowances', 'deductions', 'net_salary',
  'payroll_notes', 'verification_status', 'background_verification', 'joining_date',
  'commission_percent', 'admin_notes', 'app_access', 'login_status',
];

async function initializeEmployeeSchema() {
  await db.query(`
    CREATE TABLE IF NOT EXISTS employees (
      id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT UNIQUE,
      employee_id VARCHAR(255) NOT NULL PRIMARY KEY,
      user_id VARCHAR(255) NOT NULL UNIQUE,
      employee_type VARCHAR(50) NOT NULL,
      full_name VARCHAR(150) NOT NULL,
      profile_photo VARCHAR(512) NULL,
      gender VARCHAR(30) NULL,
      date_of_birth DATE NULL,
      phone_number VARCHAR(32) NOT NULL,
      whatsapp_number VARCHAR(32) NULL,
      email VARCHAR(255) NOT NULL UNIQUE,
      status VARCHAR(20) NOT NULL DEFAULT 'Active',
      cuisine_type VARCHAR(100) NULL,
      experience_years DECIMAL(6,2) NULL,
      description TEXT NULL,
      special_dishes TEXT NULL,
      food_preference VARCHAR(20) NULL,
      address TEXT NOT NULL,
      area_locality VARCHAR(150) NOT NULL,
      city VARCHAR(100) NOT NULL,
      district VARCHAR(100) NOT NULL,
      state VARCHAR(100) NOT NULL,
      pincode VARCHAR(20) NOT NULL,
      latitude DECIMAL(10,7) NULL,
      longitude DECIMAL(10,7) NULL,
      vehicle_type VARCHAR(50) NULL,
      vehicle_number VARCHAR(50) NULL,
      vehicle_model VARCHAR(100) NULL,
      vehicle_color VARCHAR(50) NULL,
      driving_license_number VARCHAR(100) NULL,
      driving_license_expiry_date DATE NULL,
      rc_number VARCHAR(100) NULL,
      rc_document_upload VARCHAR(512) NULL,
      driving_license_upload VARCHAR(512) NULL,
      vehicle_photo VARCHAR(512) NULL,
      working_days JSON NULL,
      start_time TIME NULL,
      end_time TIME NULL,
      available_for_delivery VARCHAR(10) NULL,
      current_status VARCHAR(20) NULL,
      account_holder_name VARCHAR(150) NULL,
      bank_name VARCHAR(150) NULL,
      account_number VARCHAR(100) NULL,
      ifsc_code VARCHAR(20) NULL,
      upi_id VARCHAR(150) NULL,
      pan_number VARCHAR(20) NULL,
      bank_proof_upload VARCHAR(512) NULL,
      aadhaar_number VARCHAR(20) NULL,
      aadhaar_id_proof VARCHAR(512) NULL,
      pan_card_number VARCHAR(20) NULL,
      pan_card VARCHAR(512) NULL,
      fssai_certificate VARCHAR(512) NULL,
      driving_license VARCHAR(512) NULL,
      rc_book VARCHAR(512) NULL,
      insurance_certificate VARCHAR(512) NULL,
      address_proof VARCHAR(512) NULL,
      chef_photo VARCHAR(512) NULL,
      other_documents VARCHAR(512) NULL,
      salary_type VARCHAR(30) NULL,
      basic_salary DECIMAL(12,2) NULL,
      allowances DECIMAL(12,2) NULL,
      deductions DECIMAL(12,2) NULL,
      net_salary DECIMAL(12,2) NULL,
      payroll_notes TEXT NULL,
      verification_status VARCHAR(30) NULL,
      background_verification VARCHAR(30) NULL,
      joining_date DATE NULL,
      commission_percent DECIMAL(6,2) NULL,
      admin_notes TEXT NULL,
      app_access VARCHAR(20) NULL,
      login_status VARCHAR(30) NULL,
      created_by VARCHAR(255) NULL,
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_by VARCHAR(255) NULL,
      updated_at TIMESTAMP NULL DEFAULT NULL ON UPDATE CURRENT_TIMESTAMP,
      INDEX employees_type_idx (employee_type),
      INDEX employees_status_idx (status),
      CONSTRAINT employees_user_id_fk FOREIGN KEY (user_id)
        REFERENCES users (user_id) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);

  const [idColumns] = await db.query("SHOW COLUMNS FROM employees LIKE 'id'");
  if (idColumns.length === 0) {
    await db.query(
      'ALTER TABLE employees ADD COLUMN id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT UNIQUE FIRST'
    );
  }

  const [specializationColumns] = await db.query("SHOW COLUMNS FROM employees LIKE 'specialization'");
  if (specializationColumns.length > 0) {
    await db.query('ALTER TABLE employees DROP COLUMN specialization');
  }

  await db.query(
    'ALTER TABLE employees MODIFY updated_at TIMESTAMP NULL DEFAULT NULL ON UPDATE CURRENT_TIMESTAMP'
  );
}

async function createEmployeeWithUser({ employeeData, createdBy, password }) {
  const employeeTypeConfigForRecord = employeeTypeConfig.get(employeeData.employee_type);
  if (!employeeTypeConfigForRecord) throw new Error('Unsupported employee type');

  const userId = randomUUID();
  const employeeId = `${employeeTypeConfigForRecord.prefix}-${userId}`;
  const passwordHash = await hashPassword(password);
  const connection = await db.getConnection();

  try {
    await connection.beginTransaction();
    await connection.execute(
      `INSERT INTO users (user_id, username, email, mobile_number, password_hash, role, status)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [userId, employeeData.full_name, employeeData.email, employeeData.phone_number,
        passwordHash, employeeTypeConfigForRecord.role, employeeData.status]
    );

    const columns = ['employee_id', 'user_id', ...employeeColumns, 'created_by', 'updated_by'];
    const values = [
      employeeId,
      userId,
      ...employeeColumns.map((column) => employeeData[column] ?? null),
      createdBy || null,
      null,
    ];
    const columnSql = columns.map((column) => `\`${column}\``).join(', ');
    const placeholders = columns.map(() => '?').join(', ');

    await connection.execute(
      `INSERT INTO employees (${columnSql}) VALUES (${placeholders})`,
      values
    );
    await connection.commit();

    return { employee_id: employeeId, user_id: userId };
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}

async function findEmployees(employeeType) {
  const selectSql = `
    SELECT employees.*,
           a.check_in AS today_check_in,
           a.check_out AS today_check_out,
           a.status AS today_attendance_status,
           a.total_hours AS today_total_hours,
           CASE
             WHEN a.check_in IS NOT NULL AND a.check_out IS NULL THEN 'Working'
             WHEN a.check_in IS NOT NULL AND a.check_out IS NOT NULL THEN 'Completed'
             ELSE 'Absent'
           END AS today_shift_state
    FROM employees
    LEFT JOIN employee_attendance a 
      ON a.employee_id = employees.employee_id AND a.date = CURDATE()
  `;
  if (employeeType) {
    const [rows] = await db.execute(
      `${selectSql} WHERE employees.employee_type = ? ORDER BY employees.created_at DESC`,
      [employeeType]
    );
    return rows;
  }
  const [rows] = await db.execute(
    `${selectSql} ORDER BY employees.created_at DESC`
  );
  return rows;
}

async function updateEmployeeQuickStatus(employeeId, { status, available_for_delivery, current_status }) {
  const updates = [];
  const params = [];
  if (status !== undefined && ['Active', 'Inactive'].includes(status)) {
    updates.push('`status` = ?');
    params.push(status);
  }
  if (available_for_delivery !== undefined) {
    updates.push('`available_for_delivery` = ?');
    params.push(available_for_delivery);
  }
  if (current_status !== undefined) {
    updates.push('`current_status` = ?');
    params.push(current_status);
  }
  if (updates.length === 0) return null;

  const connection = await db.getConnection();
  try {
    await connection.beginTransaction();
    const [rows] = await connection.execute('SELECT user_id FROM employees WHERE employee_id = ? LIMIT 1', [employeeId]);
    if (rows.length === 0) {
      await connection.rollback();
      return null;
    }
    const userId = rows[0].user_id;

    params.push(employeeId);
    await connection.execute(`UPDATE employees SET ${updates.join(', ')}, updated_at = CURRENT_TIMESTAMP WHERE employee_id = ?`, params);

    if (status) {
      await connection.execute('UPDATE users SET status = ? WHERE user_id = ?', [status, userId]);
    }
    await connection.commit();
    return true;
  } catch (err) {
    await connection.rollback();
    throw err;
  } finally {
    connection.release();
  }
}

async function findEmployeeById(employeeId) {
  const [rows] = await db.execute(
    `SELECT employees.*,
            a.check_in AS today_check_in,
            a.check_out AS today_check_out,
            a.status AS today_attendance_status,
            a.total_hours AS today_total_hours
     FROM employees
     LEFT JOIN employee_attendance a 
       ON a.employee_id = employees.employee_id AND a.date = CURDATE()
     WHERE employees.employee_id = ? LIMIT 1`,
    [employeeId]
  );
  return rows[0] || null;
}

async function updateEmployeeWithUser({ employeeId, employeeData, updatedBy, password }) {
  const employeeTypeConfigForRecord = employeeTypeConfig.get(employeeData.employee_type);
  if (!employeeTypeConfigForRecord) throw new Error('Unsupported employee type');

  const connection = await db.getConnection();
  try {
    await connection.beginTransaction();
    const [rows] = await connection.execute(
      'SELECT user_id FROM employees WHERE employee_id = ? LIMIT 1 FOR UPDATE',
      [employeeId]
    );
    if (rows.length === 0) {
      await connection.rollback();
      return null;
    }

    const userId = rows[0].user_id;
    const employeeValues = employeeColumns.map((column) => employeeData[column] ?? null);
    const employeeAssignments = employeeColumns.map((column) => `\`${column}\` = ?`).join(', ');
    await connection.execute(
      `UPDATE employees SET ${employeeAssignments}, updated_by = ?, updated_at = CURRENT_TIMESTAMP WHERE employee_id = ?`,
      [...employeeValues, updatedBy || null, employeeId]
    );

    const userValues = [
      employeeData.full_name,
      employeeData.email,
      employeeData.phone_number,
      employeeTypeConfigForRecord.role,
      employeeData.status,
    ];
    let userQuery = `UPDATE users SET username = ?, email = ?, mobile_number = ?, role = ?, status = ?`;
    if (password) {
      userQuery += ', password_hash = ?';
      userValues.push(await hashPassword(password));
    }
    userQuery += ' WHERE user_id = ?';
    userValues.push(userId);
    await connection.execute(userQuery, userValues);

    await connection.commit();
    return { employee_id: employeeId, user_id: userId };
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}

async function deleteEmployeeWithUser(employeeId) {
  const connection = await db.getConnection();
  try {
    await connection.beginTransaction();
    const [rows] = await connection.execute(
      'SELECT user_id FROM employees WHERE employee_id = ? LIMIT 1 FOR UPDATE',
      [employeeId]
    );
    if (rows.length === 0) {
      await connection.rollback();
      return null;
    }

    try {
      await connection.execute('UPDATE server_table SET assigned_server_id = NULL, assigned_at = NULL WHERE assigned_server_id = ?', [employeeId]);
    } catch (ignoreTableError) {
      // If server_table doesn't exist yet, ignore
    }
    await connection.execute('DELETE FROM employees WHERE employee_id = ?', [employeeId]);
    await connection.execute('DELETE FROM users WHERE user_id = ?', [rows[0].user_id]);
    await connection.commit();
    return rows[0].user_id;
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}

async function checkEmployeeUniqueness(employeeData, excludeEmployeeId = null, excludeUserId = null) {
  let userIdToExclude = excludeUserId;
  if (excludeEmployeeId && !userIdToExclude) {
    const [empRows] = await db.execute('SELECT user_id FROM employees WHERE employee_id = ? LIMIT 1', [excludeEmployeeId]);
    if (empRows.length > 0) {
      userIdToExclude = empRows[0].user_id;
    }
  }

  // 1. Phone number
  if (employeeData.phone_number) {
    const cleanPhone = String(employeeData.phone_number).replace(/^\+91/, '').replace(/[\s\-()]/g, '');
    let empQuery = 'SELECT employee_id FROM employees WHERE phone_number = ?';
    const empParams = [cleanPhone];
    if (excludeEmployeeId) {
      empQuery += ' AND employee_id != ?';
      empParams.push(excludeEmployeeId);
    }
    const [empRows] = await db.execute(empQuery, empParams);
    if (empRows.length > 0) {
      return { field: 'phone_number', message: 'This phone number is already registered to another employee' };
    }

    let userQuery = 'SELECT user_id FROM users WHERE mobile_number = ?';
    const userParams = [cleanPhone];
    if (userIdToExclude) {
      userQuery += ' AND user_id != ?';
      userParams.push(userIdToExclude);
    }
    const [userRows] = await db.execute(userQuery, userParams);
    if (userRows.length > 0) {
      return { field: 'phone_number', message: 'This phone number is already registered to another user account' };
    }
  }

  // 2. Email ID
  if (employeeData.email) {
    const cleanEmail = String(employeeData.email).trim().toLowerCase();
    let empQuery = 'SELECT employee_id FROM employees WHERE LOWER(email) = ?';
    const empParams = [cleanEmail];
    if (excludeEmployeeId) {
      empQuery += ' AND employee_id != ?';
      empParams.push(excludeEmployeeId);
    }
    const [empRows] = await db.execute(empQuery, empParams);
    if (empRows.length > 0) {
      return { field: 'email', message: 'This email is already registered to another employee' };
    }

    let userQuery = 'SELECT user_id FROM users WHERE LOWER(email) = ?';
    const userParams = [cleanEmail];
    if (userIdToExclude) {
      userQuery += ' AND user_id != ?';
      userParams.push(userIdToExclude);
    }
    const [userRows] = await db.execute(userQuery, userParams);
    if (userRows.length > 0) {
      return { field: 'email', message: 'This email is already registered to another user account' };
    }
  }

  // 3. Account Number
  if (employeeData.account_number) {
    const cleanAcc = String(employeeData.account_number).replace(/[\s\-]/g, '');
    let query = "SELECT employee_id FROM employees WHERE REPLACE(REPLACE(account_number, ' ', ''), '-', '') = ?";
    const params = [cleanAcc];
    if (excludeEmployeeId) {
      query += ' AND employee_id != ?';
      params.push(excludeEmployeeId);
    }
    const [rows] = await db.execute(query, params);
    if (rows.length > 0) {
      return { field: 'account_number', message: 'This account number is already registered to another employee' };
    }
  }

  // 4. IFSC Code
  if (employeeData.ifsc_code) {
    const cleanIfsc = String(employeeData.ifsc_code).replace(/\s/g, '').toUpperCase();
    let query = "SELECT employee_id FROM employees WHERE UPPER(REPLACE(ifsc_code, ' ', '')) = ?";
    const params = [cleanIfsc];
    if (excludeEmployeeId) {
      query += ' AND employee_id != ?';
      params.push(excludeEmployeeId);
    }
    const [rows] = await db.execute(query, params);
    if (rows.length > 0) {
      return { field: 'ifsc_code', message: 'This IFSC code is already registered to another employee' };
    }
  }

  // 5. UPI ID
  if (employeeData.upi_id) {
    const cleanUpi = String(employeeData.upi_id).trim().toLowerCase();
    let query = 'SELECT employee_id FROM employees WHERE LOWER(upi_id) = ?';
    const params = [cleanUpi];
    if (excludeEmployeeId) {
      query += ' AND employee_id != ?';
      params.push(excludeEmployeeId);
    }
    const [rows] = await db.execute(query, params);
    if (rows.length > 0) {
      return { field: 'upi_id', message: 'This UPI ID is already registered to another employee' };
    }
  }

  // 6. Aadhaar Number
  if (employeeData.aadhaar_number) {
    const cleanAadhaar = String(employeeData.aadhaar_number).replace(/[\s\-]/g, '');
    let query = "SELECT employee_id FROM employees WHERE REPLACE(REPLACE(aadhaar_number, ' ', ''), '-', '') = ?";
    const params = [cleanAadhaar];
    if (excludeEmployeeId) {
      query += ' AND employee_id != ?';
      params.push(excludeEmployeeId);
    }
    const [rows] = await db.execute(query, params);
    if (rows.length > 0) {
      return { field: 'aadhaar_number', message: 'This Aadhaar number is already registered to another employee' };
    }
  }

  // 7. PAN Number
  const pan = employeeData.pan_number || employeeData.pan_card_number;
  if (pan) {
    const cleanPan = String(pan).replace(/[\s\-]/g, '').toUpperCase();
    let query = "SELECT employee_id FROM employees WHERE (UPPER(REPLACE(REPLACE(pan_number, ' ', ''), '-', '')) = ? OR UPPER(REPLACE(REPLACE(pan_card_number, ' ', ''), '-', '')) = ?)";
    const params = [cleanPan, cleanPan];
    if (excludeEmployeeId) {
      query += ' AND employee_id != ?';
      params.push(excludeEmployeeId);
    }
    const [rows] = await db.execute(query, params);
    if (rows.length > 0) {
      return { field: 'pan_number', message: 'This PAN number is already registered to another employee' };
    }
  }

  // 8. Vehicle Number
  if (employeeData.vehicle_number) {
    const cleanVeh = String(employeeData.vehicle_number).replace(/[\s\-]/g, '').toUpperCase();
    let query = "SELECT employee_id FROM employees WHERE UPPER(REPLACE(REPLACE(vehicle_number, ' ', ''), '-', '')) = ?";
    const params = [cleanVeh];
    if (excludeEmployeeId) {
      query += ' AND employee_id != ?';
      params.push(excludeEmployeeId);
    }
    const [rows] = await db.execute(query, params);
    if (rows.length > 0) {
      return { field: 'vehicle_number', message: 'This vehicle number is already registered to another employee' };
    }
  }

  // 9. Driving License Number
  if (employeeData.driving_license_number) {
    const cleanDl = String(employeeData.driving_license_number).replace(/[\s\-]/g, '').toUpperCase();
    let query = "SELECT employee_id FROM employees WHERE UPPER(REPLACE(REPLACE(driving_license_number, ' ', ''), '-', '')) = ?";
    const params = [cleanDl];
    if (excludeEmployeeId) {
      query += ' AND employee_id != ?';
      params.push(excludeEmployeeId);
    }
    const [rows] = await db.execute(query, params);
    if (rows.length > 0) {
      return { field: 'driving_license_number', message: 'This driving license number is already registered to another employee' };
    }
  }

  return null;
}

async function checkSingleFieldUniqueness(field, value, excludeEmployeeId = null) {
  if (!field || !value) return { isUnique: true };
  const mock = {};
  if (field === 'pan_card_number') {
    mock.pan_number = value;
    mock.pan_card_number = value;
  } else {
    mock[field] = value;
  }
  const conflict = await checkEmployeeUniqueness(mock, excludeEmployeeId);
  if (conflict) {
    return { isUnique: false, message: conflict.message };
  }
  return { isUnique: true };
}

module.exports = {
  checkEmployeeUniqueness,
  checkSingleFieldUniqueness,
  createEmployeeWithUser,
  deleteEmployeeWithUser,
  employeeTypeConfig,
  findEmployeeById,
  findEmployees,
  initializeEmployeeSchema,
  updateEmployeeQuickStatus,
  updateEmployeeWithUser,
};