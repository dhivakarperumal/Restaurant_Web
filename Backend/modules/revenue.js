const db = require('../config/db');

const revenueSourcesSql = `
  SELECT
    CONCAT('delivery:', o.id) AS record_id,
    o.order_number AS order_id,
    o.created_at AS order_date,
    o.customer_name,
    o.customer_phone,
    CASE WHEN o.order_type = 'delivery' THEN 'Delivery' ELSE 'Pickup' END AS order_type,
    'delivery' AS source,
    COALESCE(items.item_summary, '') AS items,
    COALESCE(items.quantity, 0) AS quantity,
    o.subtotal,
    NULL AS discount,
    NULL AS delivery_charge,
    NULL AS tax,
    o.total_amount AS total_amount,
    o.payment_method,
    o.payment_status,
    NULL AS delivery_partner,
    CASE WHEN LOWER(o.order_status) = 'delivered' THEN o.updated_at ELSE NULL END AS delivered_at,
    o.order_status AS status,
    CONCAT_WS(', ', a.address_line, a.area_locality, a.city, a.state, a.pincode) AS delivery_address
  FROM orders o
  LEFT JOIN \`address\` a ON a.id = o.address_id AND a.user_id = o.user_id
  LEFT JOIN (
    SELECT order_id, SUM(quantity) AS quantity,
           GROUP_CONCAT(CONCAT(product_name, ' x', quantity) ORDER BY id SEPARATOR ', ') AS item_summary
    FROM order_items GROUP BY order_id
  ) items ON items.order_id = o.id

  UNION ALL

  SELECT
    CONCAT('dining:', tb.id) AS record_id,
    tb.bill_number AS order_id,
    tb.created_at AS order_date,
    'Dine-in customer' AS customer_name,
    NULL AS customer_phone,
    'Dining' AS order_type,
    'dining' AS source,
    COALESCE(items.item_summary, '') AS items,
    COALESCE(items.quantity, 0) AS quantity,
    tb.subtotal,
    tb.discount,
    NULL AS delivery_charge,
    tb.tax_amount AS tax,
    tb.grand_total AS total_amount,
    tb.payment_method,
    CASE WHEN LOWER(tb.status) = 'paid' THEN 'Paid' ELSE tb.status END AS payment_status,
    NULL AS delivery_partner,
    CASE WHEN LOWER(tb.status) = 'paid'
      AND EXISTS (SELECT 1 FROM kitchen_orders served_order WHERE served_order.bill_id = tb.bill_id)
      AND NOT EXISTS (
        SELECT 1 FROM kitchen_orders unfinished_order
        WHERE unfinished_order.bill_id = tb.bill_id
          AND LOWER(unfinished_order.status) NOT IN ('served', 'delivered')
      )
      THEN COALESCE(latest_order.updated_at, latest_order.created_at) ELSE NULL END AS delivered_at,
    CASE WHEN LOWER(tb.status) = 'paid'
      AND EXISTS (SELECT 1 FROM kitchen_orders served_order WHERE served_order.bill_id = tb.bill_id)
      AND NOT EXISTS (
        SELECT 1 FROM kitchen_orders unfinished_order
        WHERE unfinished_order.bill_id = tb.bill_id
          AND LOWER(unfinished_order.status) NOT IN ('served', 'delivered')
      )
      THEN 'Delivered' ELSE COALESCE(latest_order.status, tb.status) END AS status,
    CONCAT('Table ', tb.table_number) AS delivery_address
  FROM table_bills tb
  LEFT JOIN (
    SELECT bill_items.bill_id, SUM(bill_items.quantity) AS quantity,
           GROUP_CONCAT(CONCAT(bill_items.food_name, ' x', bill_items.quantity) ORDER BY bill_items.first_item_id SEPARATOR ', ') AS item_summary
    FROM (
      SELECT ko.bill_id, koi.food_name, koi.unit_price, SUM(koi.quantity) AS quantity, MIN(koi.id) AS first_item_id
      FROM kitchen_orders ko
      JOIN kitchen_order_items koi ON koi.order_id = ko.order_id
      WHERE ko.bill_id IS NOT NULL
      GROUP BY ko.bill_id, koi.food_name, koi.unit_price
    ) bill_items
    GROUP BY bill_items.bill_id
  ) items ON items.bill_id = tb.bill_id
  LEFT JOIN kitchen_orders latest_order ON latest_order.id = (
    SELECT ko2.id FROM kitchen_orders ko2
    WHERE ko2.bill_id = tb.bill_id
    ORDER BY COALESCE(ko2.updated_at, ko2.created_at) DESC, ko2.id DESC LIMIT 1
  )
`;

const dateString = (date) => [
  date.getFullYear(),
  String(date.getMonth() + 1).padStart(2, '0'),
  String(date.getDate()).padStart(2, '0'),
].join('-');

const shiftDays = (date, count) => {
  const shifted = new Date(date);
  shifted.setDate(shifted.getDate() + count);
  return shifted;
};

const getDateBounds = ({ range, startDate, endDate }) => {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  let start;
  let end;

  switch (range) {
    case 'today':
      start = today;
      end = shiftDays(today, 1);
      break;
    case 'yesterday':
      start = shiftDays(today, -1);
      end = today;
      break;
    case 'week': {
      start = shiftDays(today, -((today.getDay() + 6) % 7));
      end = shiftDays(start, 7);
      break;
    }
    case 'lastWeek': {
      end = shiftDays(today, -((today.getDay() + 6) % 7));
      start = shiftDays(end, -7);
      break;
    }
    case 'month':
      start = new Date(today.getFullYear(), today.getMonth(), 1);
      end = new Date(today.getFullYear(), today.getMonth() + 1, 1);
      break;
    case 'lastMonth':
      start = new Date(today.getFullYear(), today.getMonth() - 1, 1);
      end = new Date(today.getFullYear(), today.getMonth(), 1);
      break;
    case 'year':
      start = new Date(today.getFullYear(), 0, 1);
      end = new Date(today.getFullYear() + 1, 0, 1);
      break;
    case 'lastYear':
      start = new Date(today.getFullYear() - 1, 0, 1);
      end = new Date(today.getFullYear(), 0, 1);
      break;
    case 'custom': {
      const validDate = (value) => /^\d{4}-\d{2}-\d{2}$/.test(value || '')
        && dateString(new Date(`${value}T00:00:00`)) === value;
      if (!validDate(startDate) || !validDate(endDate) || startDate > endDate) {
        const error = new Error('Choose a valid custom date range.');
        error.statusCode = 400;
        throw error;
      }
      start = new Date(`${startDate}T00:00:00`);
      end = shiftDays(new Date(`${endDate}T00:00:00`), 1);
      break;
    }
    case 'all':
      return null;
    default: {
      const error = new Error('Choose a valid date filter.');
      error.statusCode = 400;
      throw error;
    }
  }

  return { start: dateString(start), end: dateString(end) };
};

const buildFilters = (filters = {}) => {
  const clauses = [];
  const params = [];
  const bounds = getDateBounds(filters);
  if (bounds) {
    clauses.push('revenue_order.order_date >= ? AND revenue_order.order_date < ?');
    params.push(bounds.start, bounds.end);
  }
  if (filters.type === 'dining') clauses.push("revenue_order.source = 'dining'");
  if (filters.type === 'delivery') clauses.push("revenue_order.source = 'delivery' AND revenue_order.order_type = 'Delivery'");
  if (filters.paymentMethod) {
    clauses.push('LOWER(revenue_order.payment_method) = LOWER(?)');
    params.push(filters.paymentMethod);
  }
  return { where: clauses.length ? `WHERE ${clauses.join(' AND ')}` : '', params };
};

const queryRevenue = (sql, params = []) => db.execute(sql, params);

const deliveredOnly = (where) => `${where ? `${where} AND` : 'WHERE'} LOWER(revenue_order.status) = 'delivered'`;

const getSummary = async (filters = {}) => {
  const { where, params } = buildFilters(filters);
  const totalsFilters = buildFilters({ ...filters, range: 'all' });
  const selectedBounds = getDateBounds(filters);
  const selectedDateClause = selectedBounds
    ? '(revenue_order.order_date >= ? AND revenue_order.order_date < ?)'
    : '1 = 1';
  const selectedDateParams = selectedBounds ? [selectedBounds.start, selectedBounds.end] : [];
  const [rows] = await queryRevenue(
    `SELECT COUNT(CASE WHEN LOWER(revenue_order.status) = 'delivered' AND ${selectedDateClause} THEN 1 END) AS delivered_orders,
            COALESCE(SUM(CASE WHEN LOWER(revenue_order.status) = 'delivered' AND ${selectedDateClause} THEN revenue_order.total_amount ELSE 0 END), 0) AS total_revenue,
            COALESCE(SUM(CASE WHEN LOWER(revenue_order.status) = 'delivered' AND DATE(revenue_order.order_date) = CURDATE() THEN revenue_order.total_amount ELSE 0 END), 0) AS today_revenue,
            COALESCE(SUM(CASE WHEN LOWER(revenue_order.status) = 'delivered' AND YEARWEEK(revenue_order.order_date, 3) = YEARWEEK(CURDATE(), 3) THEN revenue_order.total_amount ELSE 0 END), 0) AS week_revenue,
            COALESCE(SUM(CASE WHEN LOWER(revenue_order.status) = 'delivered' AND YEAR(revenue_order.order_date) = YEAR(CURDATE()) AND MONTH(revenue_order.order_date) = MONTH(CURDATE()) THEN revenue_order.total_amount ELSE 0 END), 0) AS month_revenue
     FROM (${revenueSourcesSql}) revenue_order ${totalsFilters.where}`,
    [...selectedDateParams, ...selectedDateParams, ...totalsFilters.params]
  );
  const [sourceRows] = await queryRevenue(
    `SELECT revenue_order.order_type, COUNT(*) AS order_count,
            COALESCE(SUM(revenue_order.total_amount), 0) AS revenue
     FROM (${revenueSourcesSql}) revenue_order ${deliveredOnly(where)}
     GROUP BY revenue_order.order_type ORDER BY revenue DESC`,
    params
  );
  const summary = rows[0] || {};
  const totalRevenue = Number(summary.total_revenue || 0);
  const deliveredOrders = Number(summary.delivered_orders || 0);
  return {
    totalRevenue,
    todayRevenue: Number(summary.today_revenue || 0),
    weekRevenue: Number(summary.week_revenue || 0),
    monthRevenue: Number(summary.month_revenue || 0),
    deliveredOrders,
    averageOrderValue: deliveredOrders ? totalRevenue / deliveredOrders : 0,
    sources: sourceRows.map((row) => ({
      name: row.order_type,
      orders: Number(row.order_count),
      revenue: Number(row.revenue),
    })),
  };
};

const getTrend = async (filters = {}) => {
  const { where, params } = buildFilters(filters);
  const group = filters.trend === 'year' ? 'month'
    : ['today', 'week', 'month'].includes(filters.trend) ? 'day' : 'month';
  const bucket = group === 'day'
    ? 'DATE_FORMAT(revenue_order.order_date, \'%Y-%m-%d\')'
    : 'DATE_FORMAT(revenue_order.order_date, \'%Y-%m\')';
  const [rows] = await queryRevenue(
    `SELECT ${bucket} AS date, COALESCE(SUM(revenue_order.total_amount), 0) AS revenue,
            COUNT(*) AS orders
     FROM (${revenueSourcesSql}) revenue_order ${deliveredOnly(where)}
     GROUP BY date ORDER BY date`,
    params
  );
  return rows.map((row) => ({ date: row.date, revenue: Number(row.revenue), orders: Number(row.orders) }));
};

const getStatusCounts = async (filters = {}) => {
  const { where, params } = buildFilters(filters);
  const [rows] = await queryRevenue(
    `SELECT LOWER(revenue_order.status) AS status, COUNT(*) AS count
     FROM (${revenueSourcesSql}) revenue_order ${where}
     GROUP BY LOWER(revenue_order.status)`,
    params
  );
  const counts = new Map();
  for (const row of rows) {
    const raw = String(row.status || 'unknown').trim().toLowerCase();
    const status = ['placed', 'pending'].includes(raw) ? 'Pending'
      : raw === 'confirmed' ? 'Confirmed'
        : raw === 'preparing' ? 'Preparing'
          : ['ready', 'ready to serve'].includes(raw) ? 'Ready'
            : ['out for delivery', 'out_for_delivery'].includes(raw) ? 'Out for Delivery'
              : raw === 'delivered' ? 'Delivered'
                : ['cancelled', 'canceled'].includes(raw) ? 'Cancelled'
                  : raw ? raw.split(/[ _]+/).map((word) => word.charAt(0).toUpperCase() + word.slice(1)).join(' ') : 'Unknown';
    counts.set(status, (counts.get(status) || 0) + Number(row.count));
  }
  return Array.from(counts, ([status, count]) => ({ status, count }));
};

const getDeliveredOrders = async (filters = {}) => {
  const { where, params } = buildFilters(filters);
  const clauses = [where ? where.slice(6) : null, "LOWER(revenue_order.status) = 'delivered'"]
    .filter(Boolean);
  const queryParams = [...params];
  const search = String(filters.search || '').trim();
  if (search) {
    clauses.push('(revenue_order.order_id LIKE ? OR revenue_order.customer_name LIKE ? OR revenue_order.customer_phone LIKE ?)');
    queryParams.push(`%${search}%`, `%${search}%`, `%${search}%`);
  }
  if (filters.payment) {
    clauses.push('LOWER(revenue_order.payment_method) = LOWER(?)');
    queryParams.push(filters.payment);
  }
  const filterSql = clauses.join(' AND ');
  const page = Math.max(1, Number.parseInt(filters.page, 10) || 1);
  const pageSize = Math.min(100, Math.max(1, Number.parseInt(filters.pageSize, 10) || 10));
  const [countRows] = await queryRevenue(
    `SELECT COUNT(*) AS total FROM (${revenueSourcesSql}) revenue_order WHERE ${filterSql}`,
    queryParams
  );
  const [rows] = await queryRevenue(
    `SELECT revenue_order.* FROM (${revenueSourcesSql}) revenue_order WHERE ${filterSql}
     ORDER BY revenue_order.order_date DESC, revenue_order.record_id DESC LIMIT ? OFFSET ?`,
    [...queryParams, pageSize, (page - 1) * pageSize]
  );
  return { rows, total: Number(countRows[0]?.total || 0), page, pageSize };
};

const getDeliveredOrderDetails = async (recordId) => {
  const { where } = buildFilters({ range: 'all' });
  const [rows] = await queryRevenue(
    `SELECT revenue_order.* FROM (${revenueSourcesSql}) revenue_order
     ${deliveredOnly(where)} AND revenue_order.record_id = ? LIMIT 1`,
    [recordId]
  );
  if (!rows.length) return null;
  const order = rows[0];
  let items;
  if (String(recordId).startsWith('dining:')) {
    const billNumberId = Number(String(recordId).slice('dining:'.length));
    if (!Number.isSafeInteger(billNumberId)) return null;
    const [billRows] = await db.execute('SELECT bill_id FROM table_bills WHERE id = ? LIMIT 1', [billNumberId]);
    if (!billRows.length) return null;
    const [itemRows] = await db.execute(
      `SELECT koi.food_id, koi.food_name, f.food_images AS product_image,
          SUM(koi.quantity) AS quantity, koi.unit_price AS price,
          0 AS discount, SUM(koi.quantity * koi.unit_price) AS item_total
       FROM kitchen_orders ko
       JOIN kitchen_order_items koi ON koi.order_id = ko.order_id
       LEFT JOIN foods f ON f.food_id = koi.food_id
        WHERE ko.bill_id = ?
        GROUP BY koi.food_id, koi.food_name, f.food_images, koi.unit_price ORDER BY MIN(koi.id)`,
      [billRows[0].bill_id]
    );
    items = itemRows.map((item) => ({ ...item, quantity: Number(item.quantity), price: Number(item.price), discount: 0, item_total: Number(item.item_total) }));
  } else {
    const orderId = Number(String(recordId).slice('delivery:'.length));
    if (!Number.isSafeInteger(orderId)) return null;
    const [itemRows] = await db.execute(
      `SELECT food_id, product_name AS food_name, product_image, quantity,
              unit_price AS price, NULL AS discount, total_price AS item_total
       FROM order_items WHERE order_id = ? ORDER BY id`,
      [orderId]
    );
    items = itemRows.map((item) => ({ ...item, quantity: Number(item.quantity), price: Number(item.price), item_total: Number(item.item_total) }));
  }
  return { ...order, items };
};

const initializeRevenueIndexes = async () => {
  const indexes = [
    ['orders', 'orders_status_created_idx', '(order_status, created_at)'],
    ['kitchen_orders', 'kitchen_orders_bill_status_idx', '(bill_id, status)'],
    ['table_bills', 'table_bills_status_created_idx', '(status, created_at)'],
  ];
  for (const [table, name, columns] of indexes) {
    const [existing] = await db.query(`SHOW INDEX FROM \`${table}\` WHERE Key_name = ?`, [name]);
    if (!existing.length) await db.query(`ALTER TABLE \`${table}\` ADD INDEX \`${name}\` ${columns}`);
  }
};

module.exports = {
  getDeliveredOrderDetails,
  getDeliveredOrders,
  getStatusCounts,
  getSummary,
  getTrend,
  initializeRevenueIndexes,
};