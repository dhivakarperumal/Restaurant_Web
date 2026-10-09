const db = require('../config/db');

const initializeExpenseSchema = async () => {
  await db.query(`
    CREATE TABLE IF NOT EXISTS restaurant_fund (
      id TINYINT UNSIGNED NOT NULL PRIMARY KEY,
      available_fund DECIMAL(14,2) NOT NULL DEFAULT 0,
      updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);
  await db.query(`
    INSERT INTO restaurant_fund (id, available_fund)
    VALUES (1, 0)
    ON DUPLICATE KEY UPDATE id = VALUES(id)
  `);
  await db.query(`
    CREATE TABLE IF NOT EXISTS expenses (
      id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
      expense_type VARCHAR(180) NOT NULL,
      date_of_payment DATE NOT NULL,
      amount DECIMAL(14,2) NOT NULL,
      payment_type VARCHAR(50) NOT NULL,
      paid_to VARCHAR(180) NOT NULL DEFAULT '',
      description TEXT NULL,
      invoice_number VARCHAR(120) NOT NULL DEFAULT '',
      upload_bill VARCHAR(255) NULL,
      from_name VARCHAR(180) NOT NULL DEFAULT 'Restaurant Operations',
      created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      INDEX expenses_payment_date_idx (date_of_payment, id),
      INDEX expenses_type_idx (expense_type)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);
};

const isCreditEntry = (expenseType) =>
  ['income', 'project payment', 'internship payment'].includes(
    String(expenseType || '').trim().toLowerCase()
  );

const getExpenseImpact = (expense) =>
  (isCreditEntry(expense.expense_type) ? 1 : -1) * Number(expense.amount);

const getRestaurantFund = async () => {
  const [rows] = await db.execute(
    'SELECT available_fund FROM restaurant_fund WHERE id = 1'
  );
  return Number(rows[0]?.available_fund || 0);
};

const setRestaurantFund = async (amount) => {
  await db.execute(
    `INSERT INTO restaurant_fund (id, available_fund)
     VALUES (1, ?)
     ON DUPLICATE KEY UPDATE available_fund = VALUES(available_fund)`,
    [amount]
  );
  return Number(amount);
};

const listExpenses = async () => {
  const [rows] = await db.query(`
    SELECT id, id AS expense_id, expense_type,
           DATE_FORMAT(date_of_payment, '%Y-%m-%d') AS date_of_payment,
           amount, payment_type, paid_to, description, invoice_number,
           upload_bill, from_name, created_at, updated_at
    FROM expenses
    ORDER BY date_of_payment DESC, id DESC
  `);
  return rows;
};

const createExpense = async (expense) => {
  const connection = await db.getConnection();
  try {
    await connection.beginTransaction();
    await connection.execute('SELECT id FROM restaurant_fund WHERE id = 1 FOR UPDATE');
    const [result] = await connection.execute(
      `INSERT INTO expenses
        (expense_type, date_of_payment, amount, payment_type, paid_to,
         description, invoice_number, upload_bill, from_name)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        expense.expense_type,
        expense.date_of_payment,
        expense.amount,
        expense.payment_type,
        expense.paid_to,
        expense.description,
        expense.invoice_number,
        expense.upload_bill,
        expense.from_name,
      ]
    );
    await connection.execute(
      'UPDATE restaurant_fund SET available_fund = available_fund + ? WHERE id = 1',
      [getExpenseImpact(expense)]
    );
    await connection.commit();
    return result.insertId;
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
};

const updateExpense = async (expenseId, expense) => {
  const connection = await db.getConnection();
  try {
    await connection.beginTransaction();
    await connection.execute('SELECT id FROM restaurant_fund WHERE id = 1 FOR UPDATE');
    const [rows] = await connection.execute(
      'SELECT expense_type, amount, upload_bill FROM expenses WHERE id = ? FOR UPDATE',
      [expenseId]
    );
    const existing = rows[0];
    if (!existing) {
      await connection.rollback();
      return null;
    }

    const uploadBill = expense.upload_bill || existing.upload_bill;
    const nextExpense = { ...expense, upload_bill: uploadBill };
    await connection.execute(
      `UPDATE expenses
       SET expense_type = ?, date_of_payment = ?, amount = ?, payment_type = ?,
           paid_to = ?, description = ?, invoice_number = ?, upload_bill = ?
       WHERE id = ?`,
      [
        nextExpense.expense_type,
        nextExpense.date_of_payment,
        nextExpense.amount,
        nextExpense.payment_type,
        nextExpense.paid_to,
        nextExpense.description,
        nextExpense.invoice_number,
        nextExpense.upload_bill,
        expenseId,
      ]
    );
    await connection.execute(
      'UPDATE restaurant_fund SET available_fund = available_fund + ? WHERE id = 1',
      [getExpenseImpact(nextExpense) - getExpenseImpact(existing)]
    );
    await connection.commit();
    return { oldUploadBill: existing.upload_bill };
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
};

const deleteExpense = async (expenseId) => {
  const connection = await db.getConnection();
  try {
    await connection.beginTransaction();
    await connection.execute('SELECT id FROM restaurant_fund WHERE id = 1 FOR UPDATE');
    const [rows] = await connection.execute(
      'SELECT expense_type, amount, upload_bill FROM expenses WHERE id = ? FOR UPDATE',
      [expenseId]
    );
    const existing = rows[0];
    if (!existing) {
      await connection.rollback();
      return null;
    }

    await connection.execute('DELETE FROM expenses WHERE id = ?', [expenseId]);
    await connection.execute(
      'UPDATE restaurant_fund SET available_fund = available_fund - ? WHERE id = 1',
      [getExpenseImpact(existing)]
    );
    await connection.commit();
    return { uploadBill: existing.upload_bill };
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
};

module.exports = {
  createExpense,
  deleteExpense,
  getRestaurantFund,
  initializeExpenseSchema,
  listExpenses,
  setRestaurantFund,
  updateExpense,
};
