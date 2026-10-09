const fs = require('fs/promises');
const path = require('path');
const {
  createExpense,
  deleteExpense,
  getRestaurantFund,
  listExpenses,
  setRestaurantFund,
  updateExpense,
} = require('../modules/expenses');

const uploadDirectory = path.resolve(__dirname, '..', 'upload', 'expenses');
const maximumAmount = 999999999999.99;

const normalizeText = (value) => String(value || '').trim();

const isValidDate = (value) => {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value || '')) return false;
  const date = new Date(`${value}T00:00:00Z`);
  return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value;
};

const parseAmount = (value) => {
  const amount = Number(value);
  return Number.isFinite(amount) && Math.abs(amount) <= maximumAmount
    ? Math.round(amount * 100) / 100
    : null;
};

const removeUploadedFile = async (filename) => {
  if (!filename || path.basename(filename) !== filename) return;
  try {
    await fs.unlink(path.join(uploadDirectory, filename));
  } catch (error) {
    if (error.code !== 'ENOENT') {
      console.error('Expense receipt cleanup failed:', error);
    }
  }
};

const expenseFields = (body, filename, fromName) => ({
  expense_type: normalizeText(body.expense_type),
  date_of_payment: normalizeText(body.date_of_payment),
  amount: parseAmount(body.amount),
  payment_type: normalizeText(body.payment_type),
  paid_to: normalizeText(body.paid_to),
  description: normalizeText(body.description),
  invoice_number: normalizeText(body.invoice_number),
  upload_bill: filename || null,
  from_name: fromName,
});

const validateExpense = (expense) => {
  if (!expense.expense_type || expense.expense_type.length > 180) {
    return 'Choose or enter a valid restaurant expense category.';
  }
  if (!isValidDate(expense.date_of_payment)) return 'Choose a valid payment date.';
  if (expense.amount === null || expense.amount <= 0) return 'Enter an expense amount greater than zero.';
  if (!expense.payment_type || expense.payment_type.length > 50) return 'Choose a valid payment method.';
  if (expense.paid_to.length > 180) return 'Supplier name must be 180 characters or fewer.';
  if (expense.invoice_number.length > 120) return 'Receipt or invoice number must be 120 characters or fewer.';
  if (expense.description.length > 5000) return 'Expense notes must be 5000 characters or fewer.';
  return null;
};

const reportServerError = (res, error, message) => {
  console.error(message, error);
  return res.status(500).json({ success: false, message });
};

async function getFund(_req, res) {
  try {
    return res.json({ success: true, available_fund: await getRestaurantFund() });
  } catch (error) {
    return reportServerError(res, error, 'Could not retrieve restaurant fund.');
  }
}

async function updateFund(req, res) {
  const amount = parseAmount(req.body?.available_fund);
  if (amount === null) {
    return res.status(400).json({ success: false, message: 'Enter a valid restaurant fund amount.' });
  }
  try {
    return res.json({
      success: true,
      available_fund: await setRestaurantFund(amount),
    });
  } catch (error) {
    return reportServerError(res, error, 'Could not update restaurant fund.');
  }
}

async function getExpenses(_req, res) {
  try {
    return res.json({ success: true, expenses: await listExpenses() });
  } catch (error) {
    return reportServerError(res, error, 'Could not retrieve restaurant expenses.');
  }
}

async function addExpense(req, res) {
  const expense = expenseFields(
    req.body,
    req.file?.filename,
    normalizeText(req.auth?.username || req.auth?.name || req.auth?.email) || 'Restaurant Operations'
  );
  const validationError = validateExpense(expense);
  if (validationError) {
    await removeUploadedFile(expense.upload_bill);
    return res.status(400).json({ success: false, message: validationError });
  }

  try {
    const expenseId = await createExpense(expense);
    return res.status(201).json({ success: true, expense_id: expenseId });
  } catch (error) {
    await removeUploadedFile(expense.upload_bill);
    return reportServerError(res, error, 'Could not save restaurant expense.');
  }
}

async function editExpense(req, res) {
  const expenseId = Number(req.params.expenseId);
  if (!Number.isSafeInteger(expenseId) || expenseId <= 0) {
    await removeUploadedFile(req.file?.filename);
    return res.status(400).json({ success: false, message: 'Invalid expense record.' });
  }

  const expense = expenseFields(
    req.body,
    req.file?.filename,
    normalizeText(req.auth?.username || req.auth?.name || req.auth?.email) || 'Restaurant Operations'
  );
  const validationError = validateExpense(expense);
  if (validationError) {
    await removeUploadedFile(expense.upload_bill);
    return res.status(400).json({ success: false, message: validationError });
  }

  try {
    const result = await updateExpense(expenseId, expense);
    if (!result) {
      await removeUploadedFile(expense.upload_bill);
      return res.status(404).json({ success: false, message: 'Restaurant expense was not found.' });
    }
    if (req.file && result.oldUploadBill !== req.file.filename) {
      await removeUploadedFile(result.oldUploadBill);
    }
    return res.json({ success: true });
  } catch (error) {
    await removeUploadedFile(expense.upload_bill);
    return reportServerError(res, error, 'Could not update restaurant expense.');
  }
}

async function removeExpense(req, res) {
  const expenseId = Number(req.params.expenseId);
  if (!Number.isSafeInteger(expenseId) || expenseId <= 0) {
    return res.status(400).json({ success: false, message: 'Invalid expense record.' });
  }

  try {
    const result = await deleteExpense(expenseId);
    if (!result) {
      return res.status(404).json({ success: false, message: 'Restaurant expense was not found.' });
    }
    await removeUploadedFile(result.uploadBill);
    return res.json({ success: true });
  } catch (error) {
    return reportServerError(res, error, 'Could not delete restaurant expense.');
  }
}

module.exports = { addExpense, editExpense, getExpenses, getFund, removeExpense, updateFund };
