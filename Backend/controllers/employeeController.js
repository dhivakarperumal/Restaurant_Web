const fs = require('fs/promises');
const { createEmployeeWithUser, employeeTypeConfig, findEmployees } = require('../modules/employees');

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

const removeUploadedFiles = async (files) => {
  await Promise.all((files || []).map((file) => fs.unlink(file.path).catch(() => {})));
};

async function createEmployee(req, res) {
  const files = req.files || [];
  const body = req.body || {};
  const employeeType = getValue(body.employee_type);
  const fullName = getValue(body.full_name || body.chef_name);
  const email = getValue(body.email).toLowerCase();
  const phoneNumber = getValue(body.phone_number);
  const password = String(body.password || '');
  const confirmPassword = String(body.confirm_password || '');
  const typeConfig = employeeTypeConfig.get(employeeType);

  let validationMessage = '';
  if (!typeConfig) validationMessage = 'Select a valid employee type';
  else if (!fullName || fullName.length > 150) validationMessage = 'Employee name is required and must be 150 characters or fewer';
  else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) validationMessage = 'A valid employee email address is required';
  else if (!phoneNumber || phoneNumber.length > 32) validationMessage = 'A valid phone number is required';
  else if (password.length < 6) validationMessage = 'Password must be at least 6 characters';
  else if (password !== confirmPassword) validationMessage = 'Password and confirm password do not match';
  else if (!getValue(body.address) || !getValue(body.area_locality) || !getValue(body.city)
    || !getValue(body.district) || !getValue(body.state) || !getValue(body.pincode)) {
    validationMessage = 'Address, area, city, district, state and pincode are required';
  } else if (employeeType === 'Chef' && !getValue(body.cuisine_type)) {
    validationMessage = 'Cuisine type is required for a Chef';
  } else if (employeeType === 'Delivery Partner'
    && (!getValue(body.vehicle_type) || !getValue(body.vehicle_number) || !getValue(body.driving_license_number))) {
    validationMessage = 'Vehicle type, vehicle number and driving license number are required for a Delivery Partner';
  }

  if (validationMessage) {
    await removeUploadedFiles(files);
    return res.status(400).json({ success: false, message: validationMessage });
  }

  if (employeeType === 'Delivery Partner'
    && !['Monthly Basis', 'Order Basis'].includes(getValue(body.salary_type))) {
    await removeUploadedFiles(files);
    return res.status(400).json({ success: false, message: 'Select a valid Delivery Partner salary type' });
  }
  if ((employeeType !== 'Delivery Partner' || getValue(body.salary_type) === 'Monthly Basis')
    && !getValue(body.basic_salary)) {
    await removeUploadedFiles(files);
    return res.status(400).json({ success: false, message: 'Basic salary is required for monthly pay' });
  }

  const numericColumns = [
    'experience_years', 'latitude', 'longitude', 'basic_salary', 'allowances', 'deductions',
    'net_salary', 'commission_percent',
  ];
  const employeeData = {
    employee_type: employeeType,
    full_name: fullName,
    gender: nullableValue(body.gender),
    date_of_birth: nullableValue(body.date_of_birth),
    phone_number: phoneNumber,
    whatsapp_number: nullableValue(body.whatsapp_number),
    email,
    status: ['Active', 'Inactive'].includes(getValue(body.status)) ? getValue(body.status) : 'Active',
    cuisine_type: nullableValue(body.cuisine_type),
    specialization: nullableValue(body.specialization),
    experience_years: nullableNumber(body.experience_years),
    description: nullableValue(body.description || body.description_about_chef),
    special_dishes: nullableValue(body.special_dishes),
    food_preference: nullableValue(body.food_preference),
    address: getValue(body.address),
    area_locality: getValue(body.area_locality),
    city: getValue(body.city),
    district: getValue(body.district),
    state: getValue(body.state),
    pincode: getValue(body.pincode),
    latitude: nullableNumber(body.latitude),
    longitude: nullableNumber(body.longitude),
    vehicle_type: nullableValue(body.vehicle_type),
    vehicle_number: nullableValue(body.vehicle_number),
    vehicle_model: nullableValue(body.vehicle_model),
    vehicle_color: nullableValue(body.vehicle_color),
    driving_license_number: nullableValue(body.driving_license_number),
    driving_license_expiry_date: nullableValue(body.driving_license_expiry_date),
    rc_number: nullableValue(body.rc_number),
    working_days: parseWorkingDays(body.working_days),
    start_time: nullableValue(body.start_time),
    end_time: nullableValue(body.end_time),
    available_for_delivery: nullableValue(body.available_for_delivery),
    current_status: nullableValue(body.current_status),
    account_holder_name: nullableValue(body.account_holder_name),
    bank_name: nullableValue(body.bank_name),
    account_number: nullableValue(body.account_number),
    ifsc_code: nullableValue(body.ifsc_code),
    upi_id: nullableValue(body.upi_id),
    pan_number: nullableValue(body.pan_number),
    aadhaar_number: nullableValue(body.aadhaar_number),
    pan_card_number: nullableValue(body.pan_card_number),
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

  for (const column of numericColumns) {
    if (Number.isNaN(employeeData[column])) {
      await removeUploadedFiles(files);
      return res.status(400).json({ success: false, message: `${column.replaceAll('_', ' ')} must be a valid number` });
    }
  }

  for (const file of files) {
    const column = uploadColumnByFieldName[file.fieldname];
    if (column && !employeeData[column]) employeeData[column] = file.filename;
  }

  try {
    const createdBy = req.auth.user_id || req.auth.username || null;
    const created = await createEmployeeWithUser({
      employeeData,
      createdBy,
      password,
    });

    return res.status(201).json({
      success: true,
      employee: {
        ...created,
        employee_type: employeeType,
        full_name: fullName,
        email,
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

async function listEmployees(req, res) {
  try {
    const employees = await findEmployees();
    return res.json({ success: true, employees });
  } catch (error) {
    console.error('Employee list failed:', error.message);
    return res.status(500).json({ success: false, message: 'Employees could not be loaded. Please try again.' });
  }
}

module.exports = { createEmployee, listEmployees };