const { createKitchenOrder, listKitchenOrders, updateKitchenOrderStatus } = require('../modules/kitchenOrders');

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
    const cookingNotes = String(rawItem?.cooking_notes || '').trim();
    if (!foodId || !Number.isInteger(quantity) || quantity < 1 || quantity > 99
      || !Array.isArray(selectedAddons) || selectedAddons.length > 50
      || !selectedCustomizations || typeof selectedCustomizations !== 'object'
      || Array.isArray(selectedCustomizations) || cookingNotes.length > 500) {
      return res.status(400).json({ success: false, message: 'Each menu item must have a valid food ID, quantity, and option selection.' });
    }
    items.push({
      food_id: foodId,
      quantity,
      selected_addons: selectedAddons,
      selected_customizations: selectedCustomizations,
      cooking_notes: cookingNotes,
    });
  }

  try {
    const order = await createKitchenOrder({ tableId, userId: req.auth.user_id, items });
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
    const { status, table_id } = req.query || {};
    const orders = await listKitchenOrders({ status, table_id });
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
    const updatedOrder = await updateKitchenOrderStatus({
      orderId,
      status: matchedStatus,
    });

    if (!updatedOrder) {
      return res.status(404).json({ success: false, message: 'Kitchen order not found.' });
    }

    return res.json({ success: true, message: `Order status updated to ${matchedStatus}`, order: updatedOrder });
  } catch (error) {
    console.error('Failed to update kitchen order status:', error.message);
    return res.status(500).json({ success: false, message: 'Could not update kitchen order status.' });
  }
}

module.exports = { changeKitchenOrderStatus, getKitchenOrders, submitKitchenOrder };
