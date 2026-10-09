const db = require('../config/db');
const { clockInEmployee, clockOutEmployee, getTodayAttendance } = require('../modules/attendance');

const orderStatuses = ['placed', 'preparing', 'ready', 'assigned', 'completed', 'delivered', 'cancelled'];
const deliveryPartnerNextStatus = {
  assigned: 'accepted',
  accepted: 'reached_pickup',
  reached_pickup: 'picked_up',
  picked_up: 'out_for_delivery',
  out_for_delivery: 'reached_customer',
  reached_customer: 'delivered',
};
const parseJson = (value, fallback) => {
  if (value && typeof value === 'object') return value;
  try {
    return JSON.parse(value || '');
  } catch {
    return fallback;
  }
};

const getOrders = async (req, res, customerOnly, orderNumber = null) => {
  const { status } = req.query || {};
  const requestedOrderType = req.query?.order_type ?? req.query?.fulfillment;
  const orderType = requestedOrderType === 'delivery' ? 'home_delivery' : requestedOrderType;
  if ((status && !orderStatuses.includes(status)) || (orderType && !['home_delivery', 'pickup'].includes(orderType))) {
    return res.status(400).json({ success: false, message: 'Invalid order filter.' });
  }

  const conditions = [];
  const params = [];
  if (customerOnly) {
    conditions.push('o.user_id = ?');
    params.push(req.auth.user_id);
  }
  if (orderNumber) {
    conditions.push('o.order_number = ?');
    params.push(orderNumber);
  }
  if (status === 'placed') {
    conditions.push("o.order_status = 'placed'");
  } else if (status === 'delivered') {
    conditions.push("o.order_status IN ('delivered', 'completed')");
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
              o.payment_method, o.payment_status, o.assigned_delivery_partner_id,
              assigned_partner.full_name AS assigned_partner_name,
              CASE WHEN o.order_status = 'completed' THEN 'delivered' ELSE o.order_status END AS order_status,
              o.created_at, o.updated_at,
              a.address_line, a.area_locality, a.city, a.state, a.pincode, a.landmark
       FROM orders o
       LEFT JOIN \`address\` a ON a.id = o.address_id AND a.user_id = o.user_id
       LEFT JOIN employees assigned_partner ON assigned_partner.employee_id = o.assigned_delivery_partner_id
       ${where}
       ORDER BY o.created_at DESC, o.id DESC
       LIMIT 250`,
      params
    );

    if (orderNumber && orders.length === 0) {
      return res.status(404).json({ success: false, message: 'Customer order was not found.' });
    }

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
    if (orderNumber) {
      return res.json({
        success: true,
        data: { ...orders[0], order_id: orders[0].order_number },
      });
    }
    return res.json({ success: true, data: orders });
  } catch (error) {
    console.error('Failed to load customer orders:', error.message);
    return res.status(500).json({ success: false, message: 'Customer orders could not be loaded.' });
  }
};

const updateCustomerOrderStatus = async (req, res) => {
  const { orderNumber } = req.params;
  let status = String(req.body?.status || '').trim().toLowerCase();
  if (status === 'completed') status = 'delivered';
  if (!orderStatuses.includes(status)) {
    return res.status(400).json({ success: false, message: 'Choose a valid customer order status.' });
  }

  const partnerId = String(req.body?.delivery_partner_id || '').trim();
  if (status === 'assigned' && !partnerId) {
    return res.status(400).json({ success: false, message: 'Choose a delivery partner before assigning this order.' });
  }

  try {
    let result;
    let assignedPartnerName = null;
    if (status === 'assigned') {
      const [partners] = await db.execute(
        `SELECT e.employee_id, e.full_name
         FROM employees e
         INNER JOIN users u ON u.user_id = e.user_id
         INNER JOIN employee_attendance a ON a.employee_id = e.employee_id 
           AND a.date = CURDATE() 
           AND a.check_in IS NOT NULL 
           AND a.check_out IS NULL
         WHERE e.employee_id = ? AND e.employee_type = 'Delivery Partner'
           AND e.status = 'Active' AND u.status = 'Active'
           AND COALESCE(e.available_for_delivery, 'Yes') != 'No'
           AND COALESCE(e.current_status, 'Available') != 'Offline'
         LIMIT 1`,
        [partnerId]
      );
      if (!partners.length) {
        return res.status(400).json({
          success: false,
          message: 'The selected delivery partner is not currently logged in or available for deliveries.',
        });
      }
      const [updateResult] = await db.execute(
        `UPDATE orders
         SET order_status = ?, assigned_delivery_partner_id = ?
         WHERE order_number = ? AND order_type = 'home_delivery'
           AND payment_status != 'failed'`,
        [status, partnerId, orderNumber]
      );
      result = updateResult;
      assignedPartnerName = partners[0].full_name;
    } else {
      const [updateResult] = await db.execute(
        `UPDATE orders SET order_status = ?
         WHERE order_number = ? AND payment_status != 'failed'`,
        [status, orderNumber]
      );
      result = updateResult;
    }
    if (!result.affectedRows) {
      const [rows] = await db.execute(
        'SELECT order_number, order_type FROM orders WHERE order_number = ? LIMIT 1',
        [orderNumber]
      );
      if (!rows.length) return res.status(404).json({ success: false, message: 'Customer order was not found.' });
      if (status === 'assigned' && rows[0].order_type !== 'home_delivery') {
        return res.status(400).json({ success: false, message: 'Only home delivery orders can be assigned to a delivery partner.' });
      }
      return res.status(409).json({ success: false, message: 'Payment-failed orders cannot be updated.' });
    }
    return res.json({
      success: true,
      data: {
        order_number: orderNumber,
        order_status: status,
        ...(status === 'assigned' ? {
          assigned_delivery_partner_id: partnerId,
          assigned_partner_name: assignedPartnerName,
        } : {}),
      },
    });
  } catch (error) {
    console.error('Failed to update customer order status:', error.message);
    return res.status(500).json({ success: false, message: 'Customer order status could not be updated.' });
  }
};

const listDeliveryPartners = async (req, res) => {
  try {
    const includeAll = String(req.query?.all || '').toLowerCase() === 'true';

    let query = `
      SELECT e.employee_id, e.full_name, e.phone_number, e.current_status,
             e.available_for_delivery,
             a.check_in, a.check_out, a.status AS attendance_status
      FROM employees e
      INNER JOIN users u ON u.user_id = e.user_id
    `;

    if (includeAll) {
      query += `
        LEFT JOIN employee_attendance a ON a.employee_id = e.employee_id AND a.date = CURDATE()
        WHERE e.employee_type = 'Delivery Partner'
          AND e.status = 'Active' AND u.status = 'Active'
        ORDER BY e.full_name
      `;
    } else {
      query += `
        INNER JOIN employee_attendance a ON a.employee_id = e.employee_id 
          AND a.date = CURDATE() 
          AND a.check_in IS NOT NULL 
          AND a.check_out IS NULL
        WHERE e.employee_type = 'Delivery Partner'
          AND e.status = 'Active' 
          AND u.status = 'Active'
          AND COALESCE(e.available_for_delivery, 'Yes') != 'No'
          AND COALESCE(e.current_status, 'Available') != 'Offline'
        ORDER BY e.full_name
      `;
    }

    const [partners] = await db.execute(query);
    return res.json({ success: true, data: partners });
  } catch (error) {
    console.error('Failed to load delivery partners:', error.message);
    return res.status(500).json({ success: false, message: 'Delivery partners could not be loaded.' });
  }
};

const listAssignedDeliveryOrders = async (req, res) => {
  try {
    const [orders] = await db.execute(
      `SELECT o.id, o.order_number, o.customer_name, o.customer_phone, o.total_amount,
              o.order_status, o.created_at, a.address_line, a.area_locality, a.city,
              a.state, a.pincode, a.landmark
       FROM orders o
       LEFT JOIN \`address\` a ON a.id = o.address_id AND a.user_id = o.user_id
       WHERE o.assigned_delivery_partner_id = ? AND o.order_type = 'home_delivery'
       ORDER BY o.created_at DESC, o.id DESC
       LIMIT 250`,
      [req.auth.employee_id]
    );
    if (orders.length) {
      const orderIds = orders.map((order) => order.id);
      const [items] = await db.execute(
        `SELECT order_id, food_id, product_name, product_image, quantity, total_price
         FROM order_items WHERE order_id IN (${orderIds.map(() => '?').join(', ')})
         ORDER BY id`,
        orderIds
      );
      const itemsByOrder = new Map();
      for (const item of items) {
        const orderItems = itemsByOrder.get(item.order_id) || [];
        orderItems.push({
          ...item,
          quantity: Number(item.quantity),
          total_price: Number(item.total_price),
        });
        itemsByOrder.set(item.order_id, orderItems);
      }
      for (const order of orders) {
        order.order_id = order.order_number;
        order.order_date = order.created_at;
        order.delivery_address = [
          order.address_line,
          order.area_locality,
          order.landmark,
          order.city,
          order.state,
          order.pincode,
        ].filter(Boolean).join(', ');
        order.items = itemsByOrder.get(order.id) || [];
        delete order.id;
        delete order.order_number;
        delete order.address_line;
        delete order.area_locality;
        delete order.landmark;
        delete order.city;
        delete order.state;
        delete order.pincode;
      }
    }
    return res.json({ success: true, orders });
  } catch (error) {
    console.error('Failed to load assigned delivery orders:', error.message);
    return res.status(500).json({ success: false, message: 'Assigned delivery orders could not be loaded.' });
  }
};

const updateAssignedDeliveryOrderStatus = async (req, res) => {
  const status = String(req.body?.status || '').trim().toLowerCase();
  if (status !== 'assigned' && !Object.values(deliveryPartnerNextStatus).includes(status)) {
    return res.status(400).json({ success: false, message: 'Choose a valid delivery status.' });
  }

  try {
    const [orders] = await db.execute(
      `SELECT order_status FROM orders
       WHERE order_number = ? AND assigned_delivery_partner_id = ?
         AND order_type = 'home_delivery'
       LIMIT 1`,
      [req.params.orderId, req.auth.employee_id]
    );
    if (!orders.length) {
      return res.status(404).json({ success: false, message: 'Assigned order was not found.' });
    }
    const currentStatus = String(orders[0].order_status || '').toLowerCase();
    if (currentStatus === status) {
      return res.json({ success: true, order: { order_id: req.params.orderId, order_status: status } });
    }
    if (deliveryPartnerNextStatus[currentStatus] !== status) {
      return res.status(409).json({ success: false, message: 'Complete delivery steps in order before changing the status.' });
    }

    const [result] = await db.execute(
      `UPDATE orders SET order_status = ?
       WHERE order_number = ? AND assigned_delivery_partner_id = ?
         AND order_type = 'home_delivery' AND order_status = ?`,
      [status, req.params.orderId, req.auth.employee_id, currentStatus]
    );
    if (!result.affectedRows) {
      return res.status(409).json({ success: false, message: 'This delivery was updated by another session. Refresh and try again.' });
    }
    return res.json({ success: true, order: { order_id: req.params.orderId, order_status: status } });
  } catch (error) {
    console.error('Failed to update assigned delivery order:', error.message);
    return res.status(500).json({ success: false, message: 'Delivery order status could not be updated.' });
  }
};

const getDeliveryPartnerDashboard = async (req, res) => {
  const employeeId = req.auth.employee_id;
  if (!employeeId) {
    return res.status(404).json({ success: false, message: 'Delivery partner record was not found.' });
  }

  try {
    const [empRows] = await db.execute(
      'SELECT available_for_delivery, current_status FROM employees WHERE employee_id = ? LIMIT 1',
      [employeeId]
    );
    const emp = empRows[0] || {};

    const attendance = await getTodayAttendance(employeeId);
    const isCheckedIn = Boolean(attendance && attendance.check_in && !attendance.check_out);
    const isOnline = isCheckedIn && (emp.available_for_delivery === 'Yes' || emp.current_status === 'Available');

    const [counts] = await db.execute(
      `SELECT
        COUNT(CASE WHEN DATE(created_at) = CURDATE() AND order_status IN ('delivered', 'completed') THEN 1 END) AS todayDeliveries,
        COUNT(CASE WHEN order_status = 'assigned' THEN 1 END) AS newOrders,
        COUNT(CASE WHEN order_status IN ('assigned', 'accepted') THEN 1 END) AS assignedOrders,
        COUNT(CASE WHEN order_status = 'reached_pickup' THEN 1 END) AS pickupPending,
        COUNT(CASE WHEN order_status IN ('picked_up', 'out_for_delivery', 'reached_customer') THEN 1 END) AS outForDelivery,
        COUNT(CASE WHEN order_status IN ('delivered', 'completed') THEN 1 END) AS deliveredOrders,
        COUNT(CASE WHEN order_status = 'cancelled' THEN 1 END) AS cancelledOrders,
        COALESCE(SUM(CASE WHEN DATE(created_at) = CURDATE() AND order_status IN ('delivered', 'completed') THEN total_amount END), 0) AS todayEarnings,
        COALESCE(SUM(CASE WHEN order_status IN ('delivered', 'completed') THEN total_amount END), 0) AS totalEarnings
       FROM orders
       WHERE assigned_delivery_partner_id = ? AND order_type = 'home_delivery'`,
      [employeeId]
    );

    const [activeOrders] = await db.execute(
      `SELECT o.id, o.order_number, o.customer_name, o.customer_phone, o.total_amount,
              o.order_status, o.created_at, a.address_line, a.area_locality, a.city
       FROM orders o
       LEFT JOIN \`address\` a ON a.id = o.address_id AND a.user_id = o.user_id
       WHERE o.assigned_delivery_partner_id = ?
         AND o.order_type = 'home_delivery'
         AND o.order_status IN ('assigned', 'accepted', 'reached_pickup', 'picked_up', 'out_for_delivery', 'reached_customer')
       ORDER BY o.created_at DESC LIMIT 1`,
      [employeeId]
    );

    return res.json({
      success: true,
      dashboard: {
        is_online: isOnline,
        isCheckedIn,
        attendance,
        summary: counts[0] || {},
        active_order: activeOrders[0] || null,
      },
    });
  } catch (error) {
    console.error('Failed to load delivery partner dashboard:', error);
    return res.status(500).json({ success: false, message: 'Delivery partner dashboard could not be loaded.' });
  }
};

const updateDeliveryPartnerAvailability = async (req, res) => {
  const employeeId = req.auth.employee_id;
  const isOnlineRequested = Boolean(req.body?.is_online);
  const shouldClockOut = Boolean(req.body?.clock_out);

  try {
    if (isOnlineRequested) {
      await clockInEmployee(employeeId, req.auth.user_id);
      await db.execute(
        "UPDATE employees SET available_for_delivery = 'Yes', current_status = 'Available', updated_at = CURRENT_TIMESTAMP WHERE employee_id = ?",
        [employeeId]
      );
    } else {
      if (shouldClockOut) {
        await clockOutEmployee(employeeId);
      }
      await db.execute(
        "UPDATE employees SET available_for_delivery = 'No', current_status = 'Offline', updated_at = CURRENT_TIMESTAMP WHERE employee_id = ?",
        [employeeId]
      );
    }

    const attendance = await getTodayAttendance(employeeId);
    const isCheckedIn = Boolean(attendance && attendance.check_in && !attendance.check_out);

    return res.json({
      success: true,
      message: isOnlineRequested
        ? 'You are now online and checked in for deliveries.'
        : shouldClockOut
        ? 'Shift clocked out and you are now offline.'
        : 'You are now offline.',
      data: {
        is_online: isOnlineRequested,
        isCheckedIn,
        attendance,
      },
    });
  } catch (error) {
    console.error('Failed to update delivery partner availability:', error);
    return res.status(500).json({ success: false, message: error.message || 'Availability could not be updated.' });
  }
};

module.exports = {
  getDeliveryPartnerDashboard,
  listCustomerOrders: (req, res) => getOrders(req, res, false),
  listMyOrders: (req, res) => getOrders(req, res, true),
  getMyOrder: (req, res) => getOrders(req, res, true, req.params.orderNumber),
  listAssignedDeliveryOrders,
  listDeliveryPartners,
  updateAssignedDeliveryOrderStatus,
  updateCustomerOrderStatus,
  updateDeliveryPartnerAvailability,
};
