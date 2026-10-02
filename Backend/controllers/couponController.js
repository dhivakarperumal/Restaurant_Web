const {
  createCoupon,
  deleteCoupon,
  findCouponById,
  listCoupons,
  updateCoupon,
} = require('../modules/coupons');

const scopes = new Set(['all', 'first_order_only', 'new_customers_only', 'specific_products', 'specific_categories']);
const toSqlDateTime = (value) => String(value || '').trim().replace('T', ' ').slice(0, 19);
const toIdList = (value) => Array.isArray(value) ? value.map((id) => String(id).trim()).filter(Boolean) : [];
const optionalPositiveInteger = (value) => {
  if (value === '' || value === null || value === undefined) return null;
  const number = Number(value);
  return Number.isInteger(number) && number > 0 ? number : Number.NaN;
};

const normalizeCoupon = (body = {}) => ({
  code: String(body.code || '').trim().toUpperCase(),
  name: String(body.name || '').trim(),
  description: String(body.description || '').trim(),
  discount_type: String(body.discount_type || '').trim().toLowerCase(),
  discount_value: Number(body.discount_value),
  min_order_value: Number(body.min_order_value || 0),
  start_date: toSqlDateTime(body.start_date),
  expiry_date: toSqlDateTime(body.expiry_date),
  usage_limit_global: optionalPositiveInteger(body.usage_limit_global),
  usage_limit_per_customer: Number(body.usage_limit_per_customer || 1),
  status: String(body.status || 'active').trim().toLowerCase(),
  coupon_scope: String(body.coupon_scope || 'all').trim().toLowerCase(),
  applicable_product_ids: toIdList(body.applicable_product_ids),
  applicable_category_ids: toIdList(body.applicable_category_ids),
  applicable_subcategory_ids: toIdList(body.applicable_subcategory_ids),
});

const validateCoupon = (coupon) => {
  if (!coupon.code || coupon.code.length > 64) return 'A coupon code of 1 to 64 characters is required.';
  if (!coupon.name || coupon.name.length > 150) return 'A coupon name of 1 to 150 characters is required.';
  if (!['percentage', 'fixed'].includes(coupon.discount_type)) return 'Choose a valid discount type.';
  if (!Number.isFinite(coupon.discount_value) || coupon.discount_value <= 0) return 'Discount value must be greater than zero.';
  if (coupon.discount_type === 'percentage' && coupon.discount_value > 100) return 'Percentage discount cannot exceed 100.';
  if (!Number.isFinite(coupon.min_order_value) || coupon.min_order_value < 0) return 'Minimum order value cannot be negative.';
  if (!coupon.start_date || !coupon.expiry_date || Number.isNaN(Date.parse(coupon.start_date.replace(' ', 'T'))) || Number.isNaN(Date.parse(coupon.expiry_date.replace(' ', 'T')))) {
    return 'Valid start and expiry dates are required.';
  }
  if (Date.parse(coupon.expiry_date.replace(' ', 'T')) <= Date.parse(coupon.start_date.replace(' ', 'T'))) return 'Expiry date must be after the start date.';
  if (Number.isNaN(coupon.usage_limit_global) || !Number.isInteger(coupon.usage_limit_per_customer) || coupon.usage_limit_per_customer < 1) {
    return 'Usage limits must be positive whole numbers.';
  }
  if (!['active', 'inactive'].includes(coupon.status)) return 'Choose a valid coupon status.';
  if (!scopes.has(coupon.coupon_scope)) return 'Choose a valid coupon scope.';
  return '';
};

const list = async (_req, res) => {
  try {
    return res.json({ success: true, coupons: await listCoupons() });
  } catch (error) {
    console.error('Failed to list coupons:', error.message);
    return res.status(500).json({ success: false, message: 'Unable to load coupons.' });
  }
};

const create = async (req, res) => {
  const coupon = normalizeCoupon(req.body);
  const validationMessage = validateCoupon(coupon);
  if (validationMessage) return res.status(400).json({ success: false, message: validationMessage });

  try {
    return res.status(201).json({ success: true, coupon: await createCoupon(coupon) });
  } catch (error) {
    if (error.code === 'ER_DUP_ENTRY') return res.status(409).json({ success: false, message: 'That coupon code already exists.' });
    console.error('Failed to create coupon:', error.message);
    return res.status(500).json({ success: false, message: 'Unable to save coupon.' });
  }
};

const update = async (req, res) => {
  if (!/^\d+$/.test(req.params.couponId)) return res.status(400).json({ success: false, message: 'A valid coupon ID is required.' });
  const coupon = normalizeCoupon(req.body);
  const validationMessage = validateCoupon(coupon);
  if (validationMessage) return res.status(400).json({ success: false, message: validationMessage });

  try {
    const savedCoupon = await updateCoupon(req.params.couponId, coupon);
    if (!savedCoupon) return res.status(404).json({ success: false, message: 'Coupon not found.' });
    return res.json({ success: true, coupon: savedCoupon });
  } catch (error) {
    if (error.code === 'ER_DUP_ENTRY') return res.status(409).json({ success: false, message: 'That coupon code already exists.' });
    console.error('Failed to update coupon:', error.message);
    return res.status(500).json({ success: false, message: 'Unable to update coupon.' });
  }
};

const remove = async (req, res) => {
  if (!/^\d+$/.test(req.params.couponId)) return res.status(400).json({ success: false, message: 'A valid coupon ID is required.' });
  try {
    if (!await deleteCoupon(req.params.couponId)) return res.status(404).json({ success: false, message: 'Coupon not found.' });
    return res.json({ success: true, message: 'Coupon deleted.' });
  } catch (error) {
    console.error('Failed to delete coupon:', error.message);
    return res.status(500).json({ success: false, message: 'Unable to delete coupon.' });
  }
};

module.exports = { create, list, remove, update };