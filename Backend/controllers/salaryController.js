const {
  createSalaryPayment,
  deleteSalaryPayment,
  getSalaryDetails,
  listSalaryPayments,
  updateSalaryPayment,
} = require('../modules/salaries');

const maximumAmount = 999999999999.99;
const decimalFields = [
  'basic_salary',
  'leave_deduction',
  'incentive_percentage',
  'incentive_amount',
  'additional_deduction',
  'total_salary',
];
const integerFields = ['present_days', 'leave_days'];

const parseAmount = (value) => {
  const amount = Number(value);
  return Number.isFinite(amount) && amount >= 0 && amount <= maximumAmount
    ? Math.round(amount * 100) / 100
    : null;
};

const parsePayment = (body, updatedBy) => {
  const employeeId = String(body?.employee_id || '').trim();
  const month = Number(body?.month);
  const year = Number(body?.year);
  if (!employeeId || employeeId.length > 255) return { error: 'Choose a valid employee.' };
  if (!Number.isInteger(month) || month < 1 || month > 12) return { error: 'Choose a valid salary month.' };
  if (!Number.isInteger(year) || year < 2000 || year > 9999) return { error: 'Choose a valid salary year.' };

  const payment = { employee_id: employeeId, month, year, updated_by: updatedBy };
  for (const field of decimalFields) {
    const amount = parseAmount(body[field]);
    if (amount === null) return { error: `Enter a valid ${field.replaceAll('_', ' ')} amount.` };
    payment[field] = amount;
  }
  for (const field of integerFields) {
    const days = Number(body[field]);
    if (!Number.isInteger(days) || days < 0 || days > 31) return { error: `Enter valid ${field.replaceAll('_', ' ')}.` };
    payment[field] = days;
  }
  if (payment.total_salary <= 0) return { error: 'Total salary must be greater than zero.' };
  if (payment.incentive_percentage > 100) return { error: 'Incentive percentage cannot exceed 100.' };
  return { payment };
};

const serverError = (res, message, error) => {
  console.error(message, error);
  return res.status(500).json({ success: false, message });
};

async function getDetails(req, res) {
  const employeeId = String(req.query.employee_id || '').trim();
  const month = Number(req.query.month);
  const year = Number(req.query.year);
  if (!employeeId || !Number.isInteger(month) || month < 1 || month > 12
    || !Number.isInteger(year) || year < 2000 || year > 9999) {
    return res.status(400).json({ success: false, message: 'Employee, month, and year are required.' });
  }
  try {
    const details = await getSalaryDetails(employeeId, month, year);
    if (!details) return res.status(404).json({ success: false, message: 'Employee was not found.' });
    return res.json({ success: true, data: details });
  } catch (error) {
    return serverError(res, 'Could not retrieve employee salary details.', error);
  }
}

async function getHistory(_req, res) {
  try {
    return res.json({ success: true, data: await listSalaryPayments() });
  } catch (error) {
    return serverError(res, 'Could not retrieve salary history.', error);
  }
}

async function addPayment(req, res) {
  const parsed = parsePayment(req.body, req.auth?.user_id || null);
  if (parsed.error) return res.status(400).json({ success: false, message: parsed.error });
  try {
    const result = await createSalaryPayment(parsed.payment);
    if (result.notFound) return res.status(404).json({ success: false, message: 'Employee was not found.' });
    return res.status(201).json({ success: true, id: result.id });
  } catch (error) {
    if (error.code === 'ER_DUP_ENTRY') {
      return res.status(409).json({ success: false, message: 'Salary has already been paid for this employee and period.' });
    }
    return serverError(res, 'Could not record salary payment.', error);
  }
}

async function editPayment(req, res) {
  const paymentId = Number(req.params.paymentId);
  if (!Number.isSafeInteger(paymentId) || paymentId <= 0) {
    return res.status(400).json({ success: false, message: 'Invalid salary payment record.' });
  }
  const parsed = parsePayment(req.body, req.auth?.user_id || null);
  if (parsed.error) return res.status(400).json({ success: false, message: parsed.error });
  try {
    const updated = await updateSalaryPayment(paymentId, parsed.payment);
    if (!updated) return res.status(404).json({ success: false, message: 'Salary payment record was not found.' });
    return res.json({ success: true });
  } catch (error) {
    return serverError(res, 'Could not update salary payment.', error);
  }
}

async function removePayment(req, res) {
  const paymentId = Number(req.params.paymentId);
  if (!Number.isSafeInteger(paymentId) || paymentId <= 0) {
    return res.status(400).json({ success: false, message: 'Invalid salary payment record.' });
  }
  try {
    const deleted = await deleteSalaryPayment(paymentId);
    if (!deleted) return res.status(404).json({ success: false, message: 'Salary payment record was not found.' });
    return res.json({ success: true });
  } catch (error) {
    return serverError(res, 'Could not delete salary payment.', error);
  }
}

module.exports = { addPayment, editPayment, getDetails, getHistory, removePayment };
