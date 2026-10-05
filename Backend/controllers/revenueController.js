const {
  getDeliveredOrderDetails,
  getDeliveredOrders,
  getStatusCounts,
  getSummary,
  getTrend,
} = require('../modules/revenue');

const filtersFromQuery = (query = {}) => ({
  range: query.range || 'all',
  startDate: query.startDate,
  endDate: query.endDate,
  type: query.type || 'all',
  paymentMethod: query.paymentMethod || '',
});

const handle = (action) => async (req, res) => {
  try {
    return await action(req, res);
  } catch (error) {
    if (error.statusCode) return res.status(error.statusCode).json({ success: false, message: error.message });
    console.error('Revenue request failed:', error.message);
    return res.status(500).json({ success: false, message: 'Revenue data could not be loaded.' });
  }
};

const summary = handle(async (req, res) => res.json({
  success: true,
  data: await getSummary(filtersFromQuery(req.query)),
}));

const trend = handle(async (req, res) => res.json({
  success: true,
  data: await getTrend({ ...filtersFromQuery(req.query), trend: req.query.trend || 'month' }),
}));

const status = handle(async (req, res) => res.json({
  success: true,
  data: await getStatusCounts(filtersFromQuery(req.query)),
}));

const orders = handle(async (req, res) => res.json({
  success: true,
  data: await getDeliveredOrders({
    ...filtersFromQuery(req.query),
    search: req.query.search,
    payment: req.query.payment,
    page: req.query.page,
    pageSize: req.query.pageSize,
  }),
}));

const orderDetails = handle(async (req, res) => {
  const recordId = `${req.params.source}:${req.params.id}`;
  const data = await getDeliveredOrderDetails(recordId);
  if (!data) return res.status(404).json({ success: false, message: 'Delivered order was not found.' });
  return res.json({ success: true, data });
});

const escapeCsv = (value) => {
  const text = value === null || value === undefined ? '' : String(value);
  const protectedText = /^[\s]*[=+@-]/.test(text) ? `'${text}` : text;
  return `"${protectedText.replaceAll('"', '""')}"`;
};

const exportOrders = handle(async (req, res) => {
  const filters = filtersFromQuery(req.query);
  const rows = [];
  let page = 1;
  let result;
  do {
    result = await getDeliveredOrders({ ...filters, page, pageSize: 100 });
    rows.push(...result.rows);
    page += 1;
  } while (rows.length < result.total && result.rows.length);

  const columns = [
    ['Order ID', 'order_id'], ['Order Date', 'order_date'], ['Customer Name', 'customer_name'],
    ['Customer Phone', 'customer_phone'], ['Order Type', 'order_type'], ['Items', 'items'],
    ['Quantity', 'quantity'], ['Subtotal', 'subtotal'], ['Discount', 'discount'],
    ['Delivery Charge', 'delivery_charge'], ['Tax', 'tax'], ['Total Amount', 'total_amount'],
    ['Payment Method', 'payment_method'], ['Payment Status', 'payment_status'],
    ['Delivery Partner', 'delivery_partner'], ['Delivery Address', 'delivery_address'],
    ['Delivered Date/Time', 'delivered_at'], ['Order Status', 'status'],
  ];
  const csv = [
    columns.map(([label]) => escapeCsv(label)).join(','),
    ...rows.map((row) => columns.map(([, key]) => escapeCsv(row[key])).join(',')),
  ].join('\r\n');
  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader('Content-Disposition', 'attachment; filename="delivered-revenue.csv"');
  return res.send(`\uFEFF${csv}`);
});

module.exports = { exportOrders, orderDetails, orders, status, summary, trend };