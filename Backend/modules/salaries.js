const db = require('../config/db');

const initializeSalarySchema = async () => {
  await db.query(`
    CREATE TABLE IF NOT EXISTS employee_salary_payments (
      id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
      employee_id VARCHAR(255) NOT NULL,
      salary_month TINYINT UNSIGNED NOT NULL,
      salary_year SMALLINT UNSIGNED NOT NULL,
      basic_salary DECIMAL(14,2) NOT NULL DEFAULT 0,
      present_days TINYINT UNSIGNED NOT NULL DEFAULT 0,
      leave_days TINYINT UNSIGNED NOT NULL DEFAULT 0,
      leave_deduction DECIMAL(14,2) NOT NULL DEFAULT 0,
      incentive_percentage DECIMAL(6,2) NOT NULL DEFAULT 0,
      incentive_amount DECIMAL(14,2) NOT NULL DEFAULT 0,
      additional_deduction DECIMAL(14,2) NOT NULL DEFAULT 0,
      total_salary DECIMAL(14,2) NOT NULL,
      updated_by VARCHAR(255) NULL,
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP NULL DEFAULT NULL ON UPDATE CURRENT_TIMESTAMP,
      UNIQUE KEY employee_salary_period_unique (employee_id, salary_month, salary_year),
      INDEX employee_salary_year_month_idx (salary_year, salary_month),
      CONSTRAINT employee_salary_employee_fk FOREIGN KEY (employee_id)
        REFERENCES employees (employee_id) ON DELETE CASCADE,
      CONSTRAINT employee_salary_updated_by_fk FOREIGN KEY (updated_by)
        REFERENCES users (user_id) ON DELETE SET NULL
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);
};

const salaryFields = [
  'basic_salary',
  'present_days',
  'leave_days',
  'leave_deduction',
  'incentive_percentage',
  'incentive_amount',
  'additional_deduction',
  'total_salary',
];

const createSalaryPayment = async (payment) => {
  const connection = await db.getConnection();
  try {
    await connection.beginTransaction();
    await connection.execute('SELECT id FROM restaurant_fund WHERE id = 1 FOR UPDATE');
    const [employeeRows] = await connection.execute(
      'SELECT employee_id FROM employees WHERE employee_id = ? LIMIT 1',
      [payment.employee_id]
    );
    if (!employeeRows[0]) {
      await connection.rollback();
      return { notFound: true };
    }

    const [result] = await connection.execute(
      `INSERT INTO employee_salary_payments
        (employee_id, salary_month, salary_year, basic_salary, present_days, leave_days,
         leave_deduction, incentive_percentage, incentive_amount, additional_deduction,
         total_salary, updated_by)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        payment.employee_id,
        payment.month,
        payment.year,
        ...salaryFields.map((field) => payment[field]),
        payment.updated_by,
      ]
    );
    await connection.execute(
      'UPDATE restaurant_fund SET available_fund = available_fund - ? WHERE id = 1',
      [payment.total_salary]
    );
    await connection.commit();
    return { id: result.insertId };
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
};

const updateSalaryPayment = async (paymentId, payment) => {
  const connection = await db.getConnection();
  try {
    await connection.beginTransaction();
    await connection.execute('SELECT id FROM restaurant_fund WHERE id = 1 FOR UPDATE');
    const [rows] = await connection.execute(
      'SELECT total_salary FROM employee_salary_payments WHERE id = ? FOR UPDATE',
      [paymentId]
    );
    if (!rows[0]) {
      await connection.rollback();
      return false;
    }

    await connection.execute(
      `UPDATE employee_salary_payments
       SET basic_salary = ?, present_days = ?, leave_days = ?, leave_deduction = ?,
           incentive_percentage = ?, incentive_amount = ?, additional_deduction = ?,
           total_salary = ?, updated_by = ?
       WHERE id = ?`,
      [
        ...salaryFields.map((field) => payment[field]),
        payment.updated_by,
        paymentId,
      ]
    );
    await connection.execute(
      'UPDATE restaurant_fund SET available_fund = available_fund + ? WHERE id = 1',
      [Number(rows[0].total_salary) - payment.total_salary]
    );
    await connection.commit();
    return true;
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
};

const deleteSalaryPayment = async (paymentId) => {
  const connection = await db.getConnection();
  try {
    await connection.beginTransaction();
    await connection.execute('SELECT id FROM restaurant_fund WHERE id = 1 FOR UPDATE');
    const [rows] = await connection.execute(
      'SELECT total_salary FROM employee_salary_payments WHERE id = ? FOR UPDATE',
      [paymentId]
    );
    if (!rows[0]) {
      await connection.rollback();
      return false;
    }

    await connection.execute('DELETE FROM employee_salary_payments WHERE id = ?', [paymentId]);
    await connection.execute(
      'UPDATE restaurant_fund SET available_fund = available_fund + ? WHERE id = 1',
      [rows[0].total_salary]
    );
    await connection.commit();
    return true;
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
};

const getSalaryDetails = async (employeeId, month, year) => {
  const [employeeRows] = await db.execute(
    `SELECT e.employee_id, e.basic_salary, e.bank_name, e.account_number, e.ifsc_code, e.upi_id,
            COALESCE(a.present_days, 0) AS present_days,
            COALESCE(a.leave_days, 0) AS leave_days,
            EXISTS (
              SELECT 1 FROM employee_salary_payments p
              WHERE p.employee_id = e.employee_id
                AND p.salary_month = ? AND p.salary_year = ?
            ) AS alreadyPaid
     FROM employees e
     LEFT JOIN (
       SELECT employee_id,
              SUM(CASE WHEN status IN ('Present', 'Late', 'Half Day') THEN 1 ELSE 0 END) AS present_days,
              SUM(CASE WHEN status IN ('Leave', 'Absent') THEN 1 ELSE 0 END) AS leave_days
       FROM employee_attendance
       WHERE date >= ? AND date < DATE_ADD(?, INTERVAL 1 MONTH)
       GROUP BY employee_id
     ) a ON a.employee_id = e.employee_id
     WHERE e.employee_id = ? LIMIT 1`,
    [
      month,
      year,
      `${year}-${String(month).padStart(2, '0')}-01`,
      `${year}-${String(month).padStart(2, '0')}-01`,
      employeeId,
    ]
  );
  return employeeRows[0] || null;
};

const listSalaryPayments = async () => {
  const [rows] = await db.query(`
    SELECT p.*,
           TRIM(SUBSTRING_INDEX(e.full_name, ' ', 1)) AS first_name,
           TRIM(CASE
             WHEN LOCATE(' ', e.full_name) > 0
             THEN SUBSTRING(e.full_name, LOCATE(' ', e.full_name) + 1)
             ELSE ''
           END) AS last_name,
           e.employee_id AS employee_code
    FROM employee_salary_payments p
    INNER JOIN employees e ON e.employee_id = p.employee_id
    ORDER BY p.salary_year DESC, p.salary_month DESC, p.created_at DESC, p.id DESC
  `);
  return rows;
};

module.exports = {
  createSalaryPayment,
  deleteSalaryPayment,
  getSalaryDetails,
  initializeSalarySchema,
  listSalaryPayments,
  updateSalaryPayment,
};
