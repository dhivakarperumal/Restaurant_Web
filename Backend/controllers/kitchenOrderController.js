const { createKitchenOrder, listKitchenOrders, updateKitchenOrderStatus } = require('../modules/kitchenOrders');
const db = require('../config/db');
const { notifyChefs, notifyServer } = require('../utils/notificationSocket');

const ALLOWED_STATUSES = ['Pending', 'Preparing', 'Ready to Serve', 'Served', 'Cancelled'];

async function submitKitchenOrder(req, res) {
  const tableId = String(req.body?.table_id || '').trim();
  const rawItems = req.body?.items;
  if (!tableId) {
    return res.status(400).json({ success: false, message: 'Select a table before sending an order.' });
  }
  if (!Array.isArray(rawItems) || rawItems.length === 0 || rawItems.length > 50) {
    return res.status(400).json({ success: false, message: 'Choose between 1 and 50 menu items.' });
  }

  const items = [];
  for (const rawItem of rawItems) {
    const foodId = String(rawItem?.food_id || '').trim();
    const quantity = Number(rawItem?.quantity);
    const selectedAddons = rawItem?.selected_addons ?? [];
    const selectedCustomizations = rawItem?.selected_customizations ?? {};
    if (!foodId || !Number.isInteger(quantity) || quantity < 1 || quantity > 99
      || !Array.isArray(selectedAddons) || selectedAddons.length > 50
      || !selectedCustomizations || typeof selectedCustomizations !== 'object'
      || Array.isArray(selectedCustomizations)) {
      return res.status(400).json({ success: false, message: 'Each menu item must have a valid food ID, quantity, and option selection.' });
    }
    items.push({
      food_id: foodId,
      quantity,
      selected_addons: selectedAddons,
      selected_customizations: selectedCustomizations,
    });
  }

  try {
    const order = await createKitchenOrder({ tableId, userId: req.auth.user_id, items });
    notifyChefs({
      type: 'kitchen',
      title: 'New dining order',
      message: `Table ${order.table_number} sent a new order to the kitchen.`,
      link: '/chef/orders',
      data: { order_id: order.order_id, table_number: order.table_number },
    });
    return res.status(201).json({ success: true, order });
  } catch (error) {
    if (error.statusCode) {
      return res.status(error.statusCode).json({ success: false, message: error.message });
    }
    console.error('Failed to submit kitchen order:', error.message);
    return res.status(500).json({ success: false, message: 'Could not send the order to the kitchen.' });
  }
}

async function getKitchenOrders(req, res) {
  try {
    const { status, table_id, order_type } = req.query || {};
    const orders = await listKitchenOrders({ status, table_id, order_type });
    return res.json({ success: true, orders });
  } catch (error) {
    console.error('Failed to load kitchen orders:', error.message);
    return res.status(500).json({ success: false, message: 'Could not load kitchen orders.' });
  }
}

async function changeKitchenOrderStatus(req, res) {
  const { orderId } = req.params;
  const rawStatus = String(req.body?.status || '').trim();

  const matchedStatus = ALLOWED_STATUSES.find(
    (s) => s.toLowerCase() === rawStatus.toLowerCase()
  );

  if (!matchedStatus) {
    return res.status(400).json({
      success: false,
      message: `Invalid status. Allowed statuses are: ${ALLOWED_STATUSES.join(', ')}`,
    });
  }

  try {
    const [previousOrders] = await db.execute(
      'SELECT status, table_id, table_number FROM kitchen_orders WHERE order_id = ? LIMIT 1',
      [orderId]
    );
    const updatedOrder = await updateKitchenOrderStatus({
      orderId,
      status: matchedStatus,
    });

    if (!updatedOrder) {
      return res.status(404).json({ success: false, message: 'Kitchen order not found.' });
    }

    if (matchedStatus === 'Ready to Serve' && previousOrders[0]?.status !== matchedStatus) {
      if (updatedOrder.user_id) {
        notifyServer(updatedOrder.user_id, {
          type: 'kitchen',
          title: 'Dining order ready',
          message: `Order for Table ${updatedOrder.table_number} is ready for pickup.`,
          link: '/server/tables',
          data: { order_id: updatedOrder.order_id, table_number: updatedOrder.table_number },
        });
      }
    }

    return res.json({ success: true, message: `Order status updated to ${matchedStatus}`, order: updatedOrder });
  } catch (error) {
    console.error('Failed to update kitchen order status:', error.message);
    return res.status(500).json({ success: false, message: 'Could not update kitchen order status.' });
  }
}

module.exports = { changeKitchenOrderStatus, getKitchenOrders, submitKitchenOrder };
