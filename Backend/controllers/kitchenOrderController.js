const { createKitchenOrder, listKitchenOrders } = require('../modules/kitchenOrders');

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
  const itemIds = new Set();
  for (const rawItem of rawItems) {
    const foodId = String(rawItem?.food_id || '').trim();
    const quantity = Number(rawItem?.quantity);
    if (!foodId || !Number.isInteger(quantity) || quantity < 1 || quantity > 99 || itemIds.has(foodId)) {
      return res.status(400).json({ success: false, message: 'Each menu item must have a unique food ID and a quantity from 1 to 99.' });
    }
    itemIds.add(foodId);
    items.push({ food_id: foodId, quantity });
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

async function getKitchenOrders(_req, res) {
  try {
    const orders = await listKitchenOrders();
    return res.json({ success: true, orders });
  } catch (error) {
    console.error('Failed to load kitchen orders:', error.message);
    return res.status(500).json({ success: false, message: 'Could not load kitchen orders.' });
  }
}

module.exports = { getKitchenOrders, submitKitchenOrder };
