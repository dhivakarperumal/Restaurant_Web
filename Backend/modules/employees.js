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
  'whatsapp_number', 'email', 'status', 'cuisine_type', 'specialization', 'experience_years',
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
      specialization VARCHAR(150) NULL,
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
      updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      INDEX employees_type_idx (employee_type),
      INDEX employees_status_idx (status),
      CONSTRAINT employees_user_id_fk FOREIGN KEY (user_id)
        REFERENCES users (user_id) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);
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
      createdBy || null,
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

async function findEmployees() {
  const [rows] = await db.execute(
    `SELECT employee_id, employee_type, full_name, phone_number, email, status, created_at
     FROM employees ORDER BY created_at DESC`
  );
  return rows;
}

module.exports = {
  createEmployeeWithUser,
  employeeTypeConfig,
  findEmployees,
  initializeEmployeeSchema,
};