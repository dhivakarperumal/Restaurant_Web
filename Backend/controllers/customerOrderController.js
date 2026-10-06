const db = require('../config/db');

const orderStatuses = ['placed', 'preparing', 'ready', 'completed', 'delivered', 'cancelled'];
const parseJson = (value, fallback) => {
  if (value && typeof value === 'object') return value;
  try {
    return JSON.parse(value || '');
  } catch {
    return fallback;
  }
};

const getOrders = async (req, res, customerOnly) => {
  const { status } = req.query || {};
  const orderType = req.query?.order_type ?? req.query?.fulfillment;
  if ((status && !orderStatuses.includes(status)) || (orderType && !['delivery', 'pickup'].includes(orderType))) {
    return res.status(400).json({ success: false, message: 'Invalid order filter.' });
  }

  const conditions = [];
  const params = [];
  if (customerOnly) {
    conditions.push('o.user_id = ?');
    params.push(req.auth.user_id);
  }
  if (status === 'placed') {
    conditions.push("o.order_status = 'placed'");
  } else if (status) {
    conditions.push('o.order_status = ?');
    params.push(status);
  }
  if (orderType) {
    conditions.push('o.order_type = ?');
    params.push(orderType);
  }
  if (String(req.auth?.role || '').trim().toLowerCase() === 'chef') {
    conditions.push("(o.payment_method != 'online' OR o.payment_status = 'paid')");
  }

  try {
    const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
    const [orders] = await db.execute(
      `SELECT o.id, o.order_number, o.user_id, o.customer_name, o.customer_email,
              o.customer_phone, o.order_type, o.address_id, o.subtotal, o.total_amount,
              o.payment_method, o.payment_status, o.order_status, o.created_at, o.updated_at,
              a.address_line, a.area_locality, a.city, a.state, a.pincode, a.landmark
       FROM orders o
       LEFT JOIN \`address\` a ON a.id = o.address_id AND a.user_id = o.user_id
       ${where}
       ORDER BY o.created_at DESC, o.id DESC
       LIMIT 250`,
      params
    );

    if (orders.length) {
      const orderIds = orders.map((order) => order.id);
      const [items] = await db.execute(
        `SELECT order_id, food_id, product_name, product_image, portion_size, unit_price,
                quantity, total_price, selected_addons, selected_customizations, cooking_notes
         FROM order_items WHERE order_id IN (${orderIds.map(() => '?').join(', ')})
         ORDER BY id`,
        orderIds
      );
      const itemsByOrder = new Map();
      for (const item of items) {
        const orderItems = itemsByOrder.get(item.order_id) || [];
        orderItems.push({
          ...item,
          unit_price: Number(item.unit_price),
          quantity: Number(item.quantity),
          total_price: Number(item.total_price),
          selected_addons: parseJson(item.selected_addons, []),
          selected_customizations: parseJson(item.selected_customizations, {}),
        });
        itemsByOrder.set(item.order_id, orderItems);
      }
      for (const order of orders) {
        order.subtotal = Number(order.subtotal);
        order.total_amount = Number(order.total_amount);
        order.address = order.address_id ? {
          address_line: order.address_line,
          area_locality: order.area_locality,
          city: order.city,
          state: order.state,
          pincode: order.pincode,
          landmark: order.landmark,
        } : null;
        delete order.address_id;
        delete order.address_line;
        delete order.area_locality;
        delete order.city;
        delete order.state;
        delete order.pincode;
        delete order.landmark;
        order.items = itemsByOrder.get(order.id) || [];
        delete order.id;
      }
    }
    return res.json({ success: true, data: orders });
  } catch (error) {
    console.error('Failed to load customer orders:', error.message);
    return res.status(500).json({ success: false, message: 'Customer orders could not be loaded.' });
  }
};

const updateCustomerOrderStatus = async (req, res) => {
  const { orderNumber } = req.params;
  const status = String(req.body?.status || '').trim().toLowerCase();
  if (!orderStatuses.includes(status)) {
    return res.status(400).json({ success: false, message: 'Choose a valid customer order status.' });
  }

  try {
    const [result] = await db.execute(
      `UPDATE orders SET order_status = ?
       WHERE order_number = ? AND payment_status != 'failed'`,
      [status, orderNumber]
    );
    if (!result.affectedRows) {
      const [rows] = await db.execute(
        'SELECT order_number FROM orders WHERE order_number = ? LIMIT 1',
        [orderNumber]
      );
      if (!rows.length) return res.status(404).json({ success: false, message: 'Customer order was not found.' });
      return res.status(409).json({ success: false, message: 'Payment-failed orders cannot be updated.' });
    }
    return res.json({ success: true, data: { order_number: orderNumber, order_status: status } });
  } catch (error) {
    console.error('Failed to update customer order status:', error.message);
    return res.status(500).json({ success: false, message: 'Customer order status could not be updated.' });
  }
};

module.exports = {
  listCustomerOrders: (req, res) => getOrders(req, res, false),
  listMyOrders: (req, res) => getOrders(req, res, true),
  updateCustomerOrderStatus,
};
