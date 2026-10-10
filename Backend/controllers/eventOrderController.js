const {
  createEventOrder,
  listEventOrders,
  getEventOrderById,
  updateEventOrderStatus,
  updateEventOrderDetails,
  deleteEventOrder,
} = require('../modules/eventOrders');
const { listFoods } = require('../modules/foods');
const { notifyAdmins, notifyUser } = require('../utils/notificationSocket');

const validateEventOrderInput = (body) => {
  const customerName = String(body.customer_name || body.customerName || '').trim();
  const customerPhone = String(body.customer_phone || body.customerPhone || '').trim();
  const customerEmail = String(body.customer_email || body.customerEmail || '').trim();
  const eventType = String(body.event_type || body.eventType || '').trim();
  const eventDate = String(body.event_date || body.eventDate || '').trim();
  const eventTime = String(body.event_time || body.eventTime || '').trim();
  const guestCount = Number(body.guest_count || body.guestCount);
  const venueAddress = String(body.venue_address || body.venueAddress || '').trim();

  if (!customerName || customerName.length > 150) {
    return 'Please enter a valid contact person name.';
  }
  if (!customerPhone || !/^[+()\d\s-]{7,32}$/.test(customerPhone)) {
    return 'Please enter a valid phone number.';
  }
  if (customerEmail && (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(customerEmail) || customerEmail.length > 255)) {
    return 'Please enter a valid email address.';
  }
  if (!eventType) {
    return 'Please select an event occasion/type.';
  }
  if (!eventDate) {
    return 'Please select the event date.';
  }
  if (!eventTime) {
    return 'Please select the event serving time.';
  }
  if (!Number.isInteger(guestCount) || guestCount < 5) {
    return 'Guest count for bulk/event orders must be at least 5 guests.';
  }
  if (!venueAddress || venueAddress.length < 5) {
    return 'Please enter the delivery or event venue address.';
  }

  return null;
};

const createBulkOrder = async (req, res) => {
  try {
    const error = validateEventOrderInput(req.body);
    if (error) {
      return res.status(400).json({ success: false, message: error });
    }

    const userId = req.auth?.user_id || req.body.user_id || null;
    const body = req.body;

    const items = Array.isArray(body.items) ? body.items : [];
    let calculatedSubtotal = 0;

    const formattedItems = items.map((item) => {
      const unitPrice = Number(item.unit_price || item.final_price || item.price || 0);
      const quantity = Math.max(1, Number(item.quantity) || 1);
      const totalPrice = Number((unitPrice * quantity).toFixed(2));
      calculatedSubtotal += totalPrice;

      return {
        food_id: item.food_id || item.id,
        product_name: item.product_name || item.food_name || item.name,
        product_image: item.product_image || (Array.isArray(item.food_images) ? item.food_images[0] : item.image) || null,
        category_name: item.category_name || item.category || null,
        portion_size: item.portion_size || 'Standard',
        unit_price: unitPrice,
        quantity,
        total_price: totalPrice,
        notes: item.notes || '',
      };
    });

    const totalEstimatedAmount = body.total_estimated_amount !== undefined
      ? Number(body.total_estimated_amount)
      : Number(calculatedSubtotal.toFixed(2));

    const result = await createEventOrder({
      userId,
      customerName: String(body.customer_name || body.customerName).trim(),
      customerEmail: String(body.customer_email || body.customerEmail || '').trim() || null,
      customerPhone: String(body.customer_phone || body.customerPhone).trim(),
      eventType: String(body.event_type || body.eventType).trim(),
      eventDate: String(body.event_date || body.eventDate).trim(),
      eventTime: String(body.event_time || body.eventTime).trim(),
      guestCount: Number(body.guest_count || body.guestCount),
      venueAddress: String(body.venue_address || body.venueAddress).trim(),
      dietaryPreference: body.dietary_preference || body.dietaryPreference || 'Mixed',
      totalEstimatedAmount,
      advanceAmount: Number(body.advance_amount || 0),
      paymentMethod: body.payment_method || 'cod',
      specialRequests: body.special_requests || body.specialRequests || '',
      items: formattedItems,
    });

    // Notify admins in real-time
    notifyAdmins({
      type: 'event_order',
      title: 'New Bulk / Event Order Received',
      message: `Order #${result.eventOrderNumber} for ${body.event_type || 'Event'} (${body.guest_count} guests) from ${body.customer_name || 'Customer'}.`,
      link: '/admin/event-orders',
      data: {
        order_number: result.eventOrderNumber,
        event_date: body.event_date,
        guest_count: body.guest_count,
      },
    });

    return res.status(201).json({
      success: true,
      message: 'Bulk order request submitted successfully. Our team will review and confirm your booking!',
      data: result,
    });
  } catch (err) {
    console.error('Failed to create bulk/event order:', err);
    return res.status(500).json({
      success: false,
      message: err.message || 'Unable to submit event order. Please try again.',
    });
  }
};

const getCustomerEventOrders = async (req, res) => {
  try {
    const userId = req.auth?.user_id;
    if (!userId) {
      return res.status(401).json({ success: false, message: 'Authentication required' });
    }

    const orders = await listEventOrders({ userId });
    return res.json({ success: true, data: orders });
  } catch (err) {
    console.error('Failed to list user event orders:', err);
    return res.status(500).json({ success: false, message: 'Unable to retrieve your event orders.' });
  }
};

const getAllEventOrders = async (req, res) => {
  try {
    const { status, search, limit, offset } = req.query;
    const orders = await listEventOrders({
      status,
      search,
      limit: Number(limit) || 100,
      offset: Number(offset) || 0,
    });
    return res.json({ success: true, data: orders });
  } catch (err) {
    console.error('Failed to list all event orders:', err);
    return res.status(500).json({ success: false, message: 'Unable to load event orders.' });
  }
};

const getEventOrder = async (req, res) => {
  try {
    const { id } = req.params;
    const order = await getEventOrderById(id);
    if (!order) {
      return res.status(404).json({ success: false, message: 'Event order not found.' });
    }

    // Check customer authorization
    const role = String(req.auth?.role || '').trim().toLowerCase();
    const isAdmin = ['admin', 'super admin', 'superadmin', 'chef'].includes(role);
    if (!isAdmin && order.user_id && order.user_id !== req.auth?.user_id) {
      return res.status(403).json({ success: false, message: 'Access denied.' });
    }

    return res.json({ success: true, data: order });
  } catch (err) {
    console.error('Failed to get event order:', err);
    return res.status(500).json({ success: false, message: 'Unable to load event order details.' });
  }
};

const updateStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status, admin_notes } = req.body;

    const validStatuses = ['Pending', 'Confirmed', 'Preparing', 'Ready', 'Completed', 'Cancelled'];
    if (!status || !validStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        message: `Status must be one of: ${validStatuses.join(', ')}`,
      });
    }

    const existing = await getEventOrderById(id);
    if (!existing) {
      return res.status(404).json({ success: false, message: 'Event order not found.' });
    }

    await updateEventOrderStatus(id, status, admin_notes);

    // Notify user if linked
    if (existing.user_id) {
      notifyUser(existing.user_id, {
        type: 'event_order_status',
        title: `Event Order #${existing.event_order_number} ${status}`,
        message: `Your bulk order for ${existing.event_type} on ${existing.event_date} is now ${status}.`,
        link: '/account?tab=event-orders',
        data: {
          order_number: existing.event_order_number,
          status,
        },
      });
    }

    return res.json({
      success: true,
      message: `Event order status updated to ${status}.`,
    });
  } catch (err) {
    console.error('Failed to update event order status:', err);
    return res.status(500).json({ success: false, message: 'Unable to update status.' });
  }
};

const updateDetails = async (req, res) => {
  try {
    const { id } = req.params;
    const updated = await updateEventOrderDetails(id, req.body);
    if (!updated) {
      return res.status(400).json({ success: false, message: 'Nothing updated or order not found.' });
    }
    return res.json({ success: true, message: 'Event order details updated.' });
  } catch (err) {
    console.error('Failed to update event order details:', err);
    return res.status(500).json({ success: false, message: 'Unable to update order details.' });
  }
};

const removeEventOrder = async (req, res) => {
  try {
    const { id } = req.params;
    const deleted = await deleteEventOrder(id);
    if (!deleted) {
      return res.status(404).json({ success: false, message: 'Event order not found.' });
    }
    return res.json({ success: true, message: 'Event order removed successfully.' });
  } catch (err) {
    console.error('Failed to delete event order:', err);
    return res.status(500).json({ success: false, message: 'Unable to delete event order.' });
  }
};

/**
 * Returns all food items added by the admin for bulk ordering.
 * Chef unchecked items (is_menu_visible = false or is_available = false) are STILL included here
 * so users can select any food item for their future bulk/catering orders!
 */
const getBulkOrderMenu = async (_req, res) => {
  try {
    const foods = await listFoods();
    // For bulk orders, include ALL foods (active status), regardless of daily is_menu_visible/is_available toggle
    const availableForBulk = foods.filter((food) => String(food.status || 'Active').toLowerCase() !== 'inactive');
    return res.json({ success: true, data: availableForBulk });
  } catch (err) {
    console.error('Failed to load bulk order menu:', err);
    return res.status(500).json({ success: false, message: 'Unable to load foods for bulk orders.' });
  }
};

module.exports = {
  createBulkOrder,
  getCustomerEventOrders,
  getAllEventOrders,
  getEventOrder,
  updateStatus,
  updateDetails,
  removeEventOrder,
  getBulkOrderMenu,
};
