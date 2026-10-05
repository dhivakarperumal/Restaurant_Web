const fs = require('fs/promises');
const path = require('path');
const {
  checkEmployeeUniqueness,
  checkSingleFieldUniqueness,
  createEmployeeWithUser,
  deleteEmployeeWithUser,
  employeeTypeConfig,
  findEmployeeById,
  findEmployees,
  updateEmployeeQuickStatus,
  updateEmployeeWithUser,
} = require('../modules/employees');

const uploadColumnByFieldName = {
  profile_photo: 'profile_photo',
  rc_document_upload: 'rc_document_upload',
  driving_license_upload: 'driving_license_upload',
  vehicle_photo: 'vehicle_photo',
  bank_passbook: 'bank_proof_upload',
  cancelled_cheque_bank_proof: 'bank_proof_upload',
  aadhaar_id_proof: 'aadhaar_id_proof',
  pan_card: 'pan_card',
  fssai_certificate: 'fssai_certificate',
  driving_license: 'driving_license',
  rc_book: 'rc_book',
  insurance_certificate: 'insurance_certificate',
  address_proof: 'address_proof',
  chef_photo: 'chef_photo',
  other_documents: 'other_documents',
};

const getValue = (value) => {
  if (Array.isArray(value)) return String(value[value.length - 1] || '').trim();
  return String(value || '').trim();
};

const nullableValue = (value) => getValue(value) || null;

const nullableNumber = (value) => {
  const normalized = getValue(value);
  if (!normalized) return null;
  const number = Number(normalized);
  return Number.isFinite(number) ? number : NaN;
};

const parseWorkingDays = (value) => {
  if (!value) return null;
  const values = Array.isArray(value) ? value : [value];
  return JSON.stringify(values.map((day) => String(day).trim()).filter(Boolean));
};

const parseStringList = (value) => {
  const values = Array.isArray(value) ? value : value ? [value] : [];
  const items = values.flatMap((item) => {
    const normalized = String(item || '').trim();
    if (!normalized) return [];
    try {
      const parsed = JSON.parse(normalized);
      return Array.isArray(parsed) ? parsed : [normalized];
    } catch {
      return [normalized];
    }
  }).map((item) => String(item).trim()).filter(Boolean);
  return items.length ? JSON.stringify(items) : null;
};

const removeUploadedFiles = async (files) => {
  await Promise.all((files || []).map(async (file) => {
    try {
      await fs.unlink(file.path);
    } catch (error) {
      if (error.code !== 'ENOENT') console.error('Uploaded file cleanup failed:', error.message);
    }
  }));
};

const removeEmployeeDocuments = async (employee) => {
  const documentDirectories = [
    path.join(__dirname, '..', 'upload', 'employee_documents'),
    path.join(__dirname, '..', 'upload'),
    path.join(__dirname, '..', 'employee_documents'),
  ];
  const filenames = new Set(Object.values(uploadColumnByFieldName)
    .map((column) => employee[column])
    .filter((filename) => filename && path.basename(filename) === filename));
  await Promise.all([...filenames].flatMap((filename) => documentDirectories.map(async (directory) => {
    try {
      await fs.unlink(path.join(directory, filename));
    } catch (error) {
      if (error.code !== 'ENOENT') console.error('Employee document cleanup failed:', error.message);
    }
  })));
};

const cleanPhone = (val) => {
  const raw = getValue(val);
  return raw ? raw.replace(/^\+91/, '').replace(/[\s\-()]/g, '') : '';
};
const cleanPan = (val) => {
  const raw = getValue(val);
  return raw ? raw.replace(/[\s\-]/g, '').toUpperCase() : null;
};
const cleanAadhaar = (val) => {
  const raw = getValue(val);
  return raw ? raw.replace(/[\s\-]/g, '') : null;
};
const cleanAlphaNum = (val) => {
  const raw = getValue(val);
  return raw ? raw.replace(/[\s\-]/g, '').toUpperCase() : null;
};

const buildEmployeeData = (body, employeeType) => {
  const panValue = cleanPan(body.pan_number || body.pan_card_number);

  return {
    employee_type: employeeType,
    full_name: getValue(body.full_name || body.chef_name),
    gender: nullableValue(body.gender),
    date_of_birth: nullableValue(body.date_of_birth),
    phone_number: cleanPhone(body.phone_number),
    whatsapp_number: cleanPhone(body.whatsapp_number) || null,
    email: getValue(body.email).toLowerCase(),
    status: ['Active', 'Inactive'].includes(getValue(body.status)) ? getValue(body.status) : 'Active',
    cuisine_type: nullableValue(body.cuisine_type),
    experience_years: nullableNumber(body.experience_years),
    description: nullableValue(body.description || body.description_about_chef),
    special_dishes: parseStringList(body.special_dishes),
    food_preference: nullableValue(body.food_preference),
    address: getValue(body.address),
    area_locality: getValue(body.area_locality),
    city: getValue(body.city),
    district: getValue(body.district),
    state: getValue(body.state),
    pincode: getValue(body.pincode).replace(/[\s\-]/g, ''),
    latitude: nullableNumber(body.latitude),
    longitude: nullableNumber(body.longitude),
    vehicle_type: nullableValue(body.vehicle_type),
    vehicle_number: cleanAlphaNum(body.vehicle_number),
    vehicle_model: nullableValue(body.vehicle_model),
    vehicle_color: nullableValue(body.vehicle_color),
    driving_license_number: cleanAlphaNum(body.driving_license_number),
    driving_license_expiry_date: nullableValue(body.driving_license_expiry_date),
    rc_number: cleanAlphaNum(body.rc_number),
    working_days: parseWorkingDays(body.working_days),
    start_time: nullableValue(body.start_time),
    end_time: nullableValue(body.end_time),
    available_for_delivery: nullableValue(body.available_for_delivery),
    current_status: nullableValue(body.current_status),
    account_holder_name: nullableValue(body.account_holder_name),
    bank_name: nullableValue(body.bank_name),
    account_number: getValue(body.account_number).replace(/[\s\-]/g, '') || null,
    ifsc_code: getValue(body.ifsc_code).replace(/\s/g, '').toUpperCase() || null,
    upi_id: getValue(body.upi_id).trim().toLowerCase() || null,
    pan_number: panValue,
    aadhaar_number: cleanAadhaar(body.aadhaar_number),
    pan_card_number: panValue,
    salary_type: employeeType === 'Delivery Partner' ? getValue(body.salary_type) : 'Monthly Basis',
    basic_salary: nullableNumber(body.basic_salary),
    allowances: nullableNumber(body.allowances),
    deductions: nullableNumber(body.deductions),
    net_salary: nullableNumber(body.net_salary),
    payroll_notes: nullableValue(body.payroll_notes),
    verification_status: nullableValue(body.verification_status),
    background_verification: nullableValue(body.background_verification),
    joining_date: nullableValue(body.joining_date),
    commission_percent: nullableNumber(body.commission_percent),
    admin_notes: nullableValue(body.admin_notes),
    app_access: nullableValue(body.app_access),
    login_status: nullableValue(body.login_status),
  };
};

const validateEmployeeData = (employeeData, password, confirmPassword, isUpdate = false) => {
  const typeConfig = employeeTypeConfig.get(employeeData.employee_type);
  if (!typeConfig) return { field: 'employee_type', message: 'Select a valid employee type' };
  if (!employeeData.full_name || employeeData.full_name.length > 150) {
    return { field: 'full_name', message: 'Employee name is required and must be 150 characters or fewer' };
  }

  // Phone number: exactly 10 digits starting with 6, 7, 8, 9
  if (!employeeData.phone_number || !/^[6-9]\d{9}$/.test(employeeData.phone_number)) {
    return { field: 'phone_number', message: 'Phone number must be a 10-digit number starting with 6, 7, 8, or 9' };
  }

  // WhatsApp number (optional): 10 digits starting with 6, 7, 8, 9
  if (employeeData.whatsapp_number && !/^[6-9]\d{9}$/.test(employeeData.whatsapp_number)) {
    return { field: 'whatsapp_number', message: 'WhatsApp number must be a 10-digit number starting with 6, 7, 8, or 9' };
  }

  // Email validation
  if (!employeeData.email || !/^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/.test(employeeData.email)) {
    return { field: 'email', message: 'A valid employee email address is required (e.g. employee@restaurant.com)' };
  }

  // Password validation
  if ((!isUpdate || password) && password.length < 6) {
    return { field: 'password', message: 'Password must be at least 6 characters' };
  }
  if (password !== confirmPassword) {
    return { field: 'confirm_password', message: 'Password and confirm password do not match' };
  }

  // Address fields
  if (!employeeData.address || !employeeData.area_locality || !employeeData.city
    || !employeeData.district || !employeeData.state || !employeeData.pincode) {
    return { field: 'address', message: 'Address, area, city, district, state and pincode are required' };
  }

  // Pincode validation: 6 digits
  if (!/^\d{6}$/.test(employeeData.pincode)) {
    return { field: 'pincode', message: 'Pincode must be a 6-digit number (e.g. 600001)' };
  }

  if (employeeData.employee_type === 'Chef' && !employeeData.cuisine_type) {
    return { field: 'cuisine_type', message: 'Cuisine type is required for a Chef' };
  }

  if (employeeData.employee_type === 'Delivery Partner') {
    if (!employeeData.vehicle_type) {
      return { field: 'vehicle_type', message: 'Vehicle type is required for a Delivery Partner' };
    }
    if (!employeeData.vehicle_number) {
      return { field: 'vehicle_number', message: 'Vehicle number is required for a Delivery Partner' };
    }
    if (!employeeData.driving_license_number) {
      return { field: 'driving_license_number', message: 'Driving license number is required for a Delivery Partner' };
    }
    if (!['Monthly Basis', 'Order Basis'].includes(employeeData.salary_type)) {
      return { field: 'salary_type', message: 'Select a valid Delivery Partner salary type' };
    }
  }

  // Vehicle number format (if provided)
  if (employeeData.vehicle_number && !/^[A-Z]{2}[0-9]{1,2}[A-Z]{0,3}[0-9]{4}$/.test(employeeData.vehicle_number)) {
    return { field: 'vehicle_number', message: 'Vehicle number must be a valid format (e.g. TN01AB1234 or TN 01 AB 1234)' };
  }

  // Driving license format (if provided)
  if (employeeData.driving_license_number && !/^[A-Z]{2}[0-9]{2}[0-9A-Z]{7,12}$/.test(employeeData.driving_license_number)) {
    return { field: 'driving_license_number', message: 'Driving license number must be a valid format (e.g. TN0120200001234)' };
  }

  // Account number format (if provided, 9-18 digits)
  if (employeeData.account_number && !/^\d{9,18}$/.test(employeeData.account_number)) {
    return { field: 'account_number', message: 'Account number must be 9 to 18 digits (e.g. 123456789012)' };
  }

  // IFSC code format (if provided, 11 chars: 4 letters, 0, 6 alphanumeric)
  if (employeeData.ifsc_code && !/^[A-Z]{4}0[A-Z0-9]{6}$/.test(employeeData.ifsc_code)) {
    return { field: 'ifsc_code', message: 'IFSC code must be 11 characters: 4 letters, 0, then 6 alphanumeric characters (e.g. SBIN0001234)' };
  }

  // UPI ID format (if provided)
  if (employeeData.upi_id && !/^[a-zA-Z0-9.\-_]{2,256}@[a-zA-Z]{2,64}$/.test(employeeData.upi_id)) {
    return { field: 'upi_id', message: 'UPI ID must be a valid format (e.g. employee@okaxis or 9876543210@upi)' };
  }

  // Aadhaar number format (if provided, 12 digits)
  if (employeeData.aadhaar_number && !/^\d{12}$/.test(employeeData.aadhaar_number)) {
    return { field: 'aadhaar_number', message: 'Aadhaar number must be a 12-digit number (e.g. 1234 5678 9012)' };
  }

  // PAN number format (if provided, 10 chars: 5 letters, 4 numbers, 1 letter)
  const pan = employeeData.pan_number || employeeData.pan_card_number;
  if (pan && !/^[A-Z]{5}[0-9]{4}[A-Z]{1}$/.test(pan)) {
    return { field: 'pan_number', message: 'PAN number must be 10 characters: 5 letters, 4 numbers, 1 letter (e.g. ABCDE1234F)' };
  }

  if ((employeeData.employee_type !== 'Delivery Partner' || employeeData.salary_type === 'Monthly Basis')
    && employeeData.basic_salary === null) {
    return { field: 'basic_salary', message: 'Basic salary is required for monthly pay' };
  }

  const numericColumns = [
    'experience_years', 'latitude', 'longitude', 'basic_salary', 'allowances', 'deductions',
    'net_salary', 'commission_percent',
  ];
  for (const column of numericColumns) {
    if (Number.isNaN(employeeData[column])) {
      return { field: column, message: `${column.replaceAll('_', ' ')} must be a valid number` };
    }
  }

  return null;
};

const applyUploadedFiles = (employeeData, files, existingEmployee = {}) => {
  for (const column of Object.values(uploadColumnByFieldName)) {
    employeeData[column] = existingEmployee[column] || null;
  }
  for (const file of files) {
    const column = uploadColumnByFieldName[file.fieldname];
    if (column) employeeData[column] = file.filename;
  }
};

const hasUnsupportedUpload = (files) => files.some((file) => !uploadColumnByFieldName[file.fieldname]);

const removeUnreferencedUploads = async (files, employeeData) => {
  const referencedFiles = new Set(Object.values(uploadColumnByFieldName)
    .map((column) => employeeData[column])
    .filter(Boolean));
  await removeUploadedFiles(files.filter((file) => !referencedFiles.has(file.filename)));
};

async function createEmployee(req, res) {
  const files = req.files || [];
  const body = req.body || {};
  const employeeType = getValue(body.employee_type);
  const password = String(body.password || '');
  const confirmPassword = String(body.confirm_password || '');
  const employeeData = buildEmployeeData(body, employeeType);
  const validationError = validateEmployeeData(employeeData, password, confirmPassword);

  if (hasUnsupportedUpload(files)) {
    await removeUploadedFiles(files);
    return res.status(400).json({ success: false, message: 'One or more uploaded document fields are not supported' });
  }
  if (validationError) {
    await removeUploadedFiles(files);
    return res.status(400).json({
      success: false,
      field: validationError.field,
      message: validationError.message,
    });
  }

  const uniquenessError = await checkEmployeeUniqueness(employeeData);
  if (uniquenessError) {
    await removeUploadedFiles(files);
    return res.status(409).json({
      success: false,
      field: uniquenessError.field,
      message: uniquenessError.message,
    });
  }

  applyUploadedFiles(employeeData, files);

  try {
    const createdBy = req.auth.user_id || req.auth.username || null;
    const created = await createEmployeeWithUser({
      employeeData,
      createdBy,
      password,
    });
    await removeUnreferencedUploads(files, employeeData);

    return res.status(201).json({
      success: true,
      employee: {
        ...created,
        employee_type: employeeType,
        full_name: employeeData.full_name,
        email: employeeData.email,
        status: employeeData.status,
      },
    });
  } catch (error) {
    await removeUploadedFiles(files);
    if (error.code === 'ER_DUP_ENTRY') {
      return res.status(409).json({ success: false, message: 'An account with this email already exists' });
    }
    console.error('Employee creation failed:', error.message);
    return res.status(500).json({ success: false, message: 'Employee could not be created. Please try again.' });
  }
}

async function getEmployee(req, res) {
  try {
    const employee = await findEmployeeById(req.params.employeeId);
    if (!employee) return res.status(404).json({ success: false, message: 'Employee was not found' });
    return res.json({ success: true, employee });
  } catch (error) {
    console.error('Employee details failed:', error.message);
    return res.status(500).json({ success: false, message: 'Employee details could not be loaded. Please try again.' });
  }
}

async function getDeliveryPartnerProfile(req, res) {
  try {
    if (!req.auth.employee_id) {
      return res.status(404).json({ success: false, message: 'Delivery partner profile was not found.' });
    }

    const employee = await findEmployeeById(req.auth.employee_id);
    if (
      !employee ||
      employee.employee_type !== 'Delivery Partner' ||
      String(employee.user_id) !== String(req.auth.user_id)
    ) {
      return res.status(404).json({ success: false, message: 'Delivery partner profile was not found.' });
    }

    const address = [
      employee.address,
      employee.area_locality,
      employee.city,
      employee.district,
      employee.state,
      employee.pincode,
    ].filter(Boolean).join(', ');

    return res.json({
      success: true,
      data: {
        employee_id: employee.employee_id,
        employee_type: employee.employee_type,
        full_name: employee.full_name,
        phone_number: employee.phone_number,
        email: employee.email,
        address,
        vehicle_type: employee.vehicle_type,
        vehicle_number: employee.vehicle_number,
        account_status: employee.status,
        verification_status: employee.verification_status,
        bank_account_last4: employee.account_number ? employee.account_number.slice(-4) : null,
      },
    });
  } catch (error) {
    console.error('Delivery partner profile failed:', error.message);
    return res.status(500).json({ success: false, message: 'Delivery partner profile could not be loaded.' });
  }
}

async function updateEmployee(req, res) {
  const files = req.files || [];
  let existingEmployee;
  try {
    existingEmployee = await findEmployeeById(req.params.employeeId);
  } catch (error) {
    await removeUploadedFiles(files);
    console.error('Employee lookup before update failed:', error.message);
    return res.status(500).json({ success: false, message: 'Employee could not be loaded for editing.' });
  }
  if (!existingEmployee) {
    await removeUploadedFiles(files);
    return res.status(404).json({ success: false, message: 'Employee was not found' });
  }

  const body = req.body || {};
  const employeeData = buildEmployeeData(body, getValue(body.employee_type));
  const password = String(body.password || '');
  const confirmPassword = String(body.confirm_password || '');
  const validationError = validateEmployeeData(employeeData, password, confirmPassword, true);
  if (hasUnsupportedUpload(files)) {
    await removeUploadedFiles(files);
    return res.status(400).json({ success: false, message: 'One or more uploaded document fields are not supported' });
  }
  if (validationError) {
    await removeUploadedFiles(files);
    return res.status(400).json({
      success: false,
      field: validationError.field,
      message: validationError.message,
    });
  }

  const uniquenessError = await checkEmployeeUniqueness(
    employeeData,
    req.params.employeeId,
    existingEmployee.user_id
  );
  if (uniquenessError) {
    await removeUploadedFiles(files);
    return res.status(409).json({
      success: false,
      field: uniquenessError.field,
      message: uniquenessError.message,
    });
  }

  applyUploadedFiles(employeeData, files, existingEmployee);

  try {
    const updated = await updateEmployeeWithUser({
      employeeId: req.params.employeeId,
      employeeData,
      updatedBy: req.auth.user_id || req.auth.username || null,
      password,
    });
    if (!updated) {
      await removeUploadedFiles(files);
      return res.status(404).json({ success: false, message: 'Employee was not found' });
    }
    await removeUnreferencedUploads(files, employeeData);
    const replacedFiles = new Set(files.map((file) => existingEmployee[uploadColumnByFieldName[file.fieldname]]).filter(Boolean));
    await removeEmployeeDocuments(Object.fromEntries(
      Object.entries(existingEmployee).map(([key, value]) => [key, replacedFiles.has(value) ? value : null])
    ));
    return res.json({ success: true, employee: { ...updated, ...employeeData } });
  } catch (error) {
    await removeUploadedFiles(files);
    if (error.code === 'ER_DUP_ENTRY') {
      return res.status(409).json({ success: false, message: 'An account with this email already exists' });
    }
    console.error('Employee update failed:', error.message);
    return res.status(500).json({ success: false, message: 'Employee could not be updated. Please try again.' });
  }
}

async function deleteEmployee(req, res) {
  try {
    const employee = await findEmployeeById(req.params.employeeId);
    if (!employee) return res.status(404).json({ success: false, message: 'Employee was not found' });
    const deletedUserId = await deleteEmployeeWithUser(req.params.employeeId);
    if (!deletedUserId) return res.status(404).json({ success: false, message: 'Employee was not found' });
    await removeEmployeeDocuments(employee);
    return res.json({ success: true, message: 'Employee deleted successfully' });
  } catch (error) {
    console.error('Employee deletion failed:', error.message);
    return res.status(500).json({ success: false, message: 'Employee could not be deleted. Please try again.' });
  }
}

async function listEmployees(req, res) {
  try {
    const { type } = req.query;
    const employees = await findEmployees(type);
    return res.json({ success: true, employees });
  } catch (error) {
    console.error('Employee list failed:', error.message);
    return res.status(500).json({ success: false, message: 'Employees could not be loaded. Please try again.' });
  }
}

async function updateEmployeeStatus(req, res) {
  try {
    const { employeeId } = req.params;
    const { status, available_for_delivery, current_status } = req.body || {};
    const success = await updateEmployeeQuickStatus(employeeId, { status, available_for_delivery, current_status });
    if (!success) {
      return res.status(404).json({ success: false, message: 'Employee not found or no valid fields to update' });
    }
    return res.json({ success: true, message: 'Status updated successfully' });
  } catch (error) {
    console.error('Update employee status failed:', error.message);
    return res.status(500).json({ success: false, message: 'Failed to update employee status' });
  }
}

async function checkEmployeeFieldUniqueness(req, res) {
  try {
    const { field, value, excludeEmployeeId } = req.query;
    if (!field || !value) {
      return res.json({ success: true, isUnique: true });
    }
    const result = await checkSingleFieldUniqueness(field, value, excludeEmployeeId);
    return res.json({ success: true, ...result });
  } catch (error) {
    console.error('Check field uniqueness failed:', error.message);
    return res.status(500).json({ success: false, message: 'Uniqueness check failed' });
  }
}

module.exports = {
  buildEmployeeData,
  checkEmployeeFieldUniqueness,
  createEmployee,
  deleteEmployee,
  getDeliveryPartnerProfile,
  getEmployee,
  listEmployees,
  updateEmployee,
  updateEmployeeStatus,
  validateEmployeeData,
};
