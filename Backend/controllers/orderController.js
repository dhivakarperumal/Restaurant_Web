const { createHmac, timingSafeEqual } = require('crypto');
const { getSettings } = require('../modules/settings');
const {
  attachRazorpayOrder,
  clearUserCart,
  completeOnlinePayment,
  createOrderFromCart,
  createUserAddress,
  deleteUserAddress,
  failOnlineOrder,
  findOrderForPayment,
  getUserAddresses,
  updateUserAddress,
} = require('../modules/orders');

// Paste the Razorpay Key ID (public key) here if it is not set in the environment or payment settings.
const RAZORPAY_KEY_ID = 'rzp_test_SGj8n5SyKSE10b';
const getUserId = (req) => req.auth?.user_id;

const validateCheckout = (body) => {
  const customer = {
    name: String(body.customer?.name || '').trim(),
    email: String(body.customer?.email || '').trim(),
    phone: String(body.customer?.phone || '').trim(),
  };
  const requestedOrderType = body.order_type ?? body.fulfillment_type;
  const orderType = requestedOrderType === 'delivery' ? 'home_delivery' : requestedOrderType;
  const paymentMethod = body.payment_method;
  if (!customer.name || customer.name.length > 150) return 'Enter a valid customer name.';
  if (!/^[+()\d\s-]{7,32}$/.test(customer.phone)) return 'Enter a valid phone number.';
  if (customer.email && (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(customer.email) || customer.email.length > 255)) {
    return 'Enter a valid email address.';
  }
  if (!['home_delivery', 'pickup'].includes(orderType)) return 'Choose home delivery or pickup.';
  if (!['cod', 'online'].includes(paymentMethod)) return 'Choose cash on delivery or online payment.';
  if (orderType === 'home_delivery') {
    const requiredAddressFields = ['address_line', 'area_locality', 'city', 'state', 'pincode'];
    if (requiredAddressFields.some((field) => !String(body.address?.[field] || '').trim())) {
      return 'Complete all required delivery address fields.';
    }
    if (!/^\d{6}$/.test(String(body.address.pincode).trim())) return 'Enter a valid 6-digit pincode.';
    if (Object.entries(body.address).some(([field, value]) => {
      const maxLength = field === 'address_line' ? 255 : field === 'area_locality' || field === 'landmark' ? 180 : 120;
      return String(value || '').trim().length > maxLength;
    })) {
      return 'One or more address fields are too long.';
    }
  }
  return null;
};

const paymentConfig = async () => {
  const settings = await getSettings('payment');
  const disabled = [0, '0', false].includes(settings.online_payment_support)
    || [0, '0', false].includes(settings.razorpay_enabled);
  return {
    disabled,
    keyId: process.env.RAZORPAY_KEY_ID || settings.razorpay_key || RAZORPAY_KEY_ID,
    keySecret: process.env.RAZORPAY_KEY_SECRET || '',
  };
};

const listAddresses = async (req, res) => {
  try {
    return res.json({ success: true, data: await getUserAddresses(getUserId(req)) });
  } catch (error) {
    console.error('Failed to load checkout addresses:', error.message);
    return res.status(500).json({ success: false, message: 'Saved addresses could not be loaded.' });
  }
};

const validateAddress = (body) => {
  const address = {
    address_line: String(body.address_line || '').trim(),
    area_locality: String(body.area_locality || '').trim(),
    city: String(body.city || '').trim(),
    state: String(body.state || '').trim(),
    pincode: String(body.pincode || '').trim(),
    landmark: String(body.landmark || '').trim(),
  };
  if (Object.entries(address).some(([field, value]) => (
    value.length > (field === 'address_line' ? 255 : field === 'area_locality' || field === 'landmark' ? 180 : 120)
  ))) {
    return { error: 'One or more address fields are too long.' };
  }
  if (!address.address_line || !address.area_locality || !address.city || !address.state) {
    return { error: 'Complete all required address fields.' };
  }
  if (!/^\d{6}$/.test(address.pincode)) {
    return { error: 'Enter a valid 6-digit pincode.' };
  }
  return { address };
};

const createAddress = async (req, res) => {
  const validation = validateAddress(req.body || {});
  if (validation.error) return res.status(400).json({ success: false, message: validation.error });
  try {
    const result = await createUserAddress(getUserId(req), validation.address);
    return res.status(result.created ? 201 : 200).json({
      success: true,
      data: result.address,
      created: result.created,
    });
  } catch (error) {
    console.error('Failed to save customer address:', error.message);
    return res.status(500).json({ success: false, message: 'The address could not be saved.' });
  }
};

const updateAddress = async (req, res) => {
  if (!/^\d+$/.test(req.params.addressId)) {
    return res.status(400).json({ success: false, message: 'A valid address ID is required.' });
  }
  const validation = validateAddress(req.body || {});
  if (validation.error) return res.status(400).json({ success: false, message: validation.error });
  try {
    const address = await updateUserAddress(getUserId(req), req.params.addressId, validation.address);
    if (!address) return res.status(404).json({ success: false, message: 'Saved address was not found.' });
    return res.json({ success: true, data: address });
  } catch (error) {
    if (error.code === 'ER_DUP_ENTRY') {
      return res.status(409).json({ success: false, message: 'This address is already saved.' });
    }
    console.error('Failed to update customer address:', error.message);
    return res.status(500).json({ success: false, message: 'The address could not be updated.' });
  }
};

const removeAddress = async (req, res) => {
  if (!/^\d+$/.test(req.params.addressId)) {
    return res.status(400).json({ success: false, message: 'A valid address ID is required.' });
  }
  try {
    const deleted = await deleteUserAddress(getUserId(req), req.params.addressId);
    if (!deleted) return res.status(404).json({ success: false, message: 'Saved address was not found.' });
    return res.json({ success: true, message: 'Saved address deleted.' });
  } catch (error) {
    console.error('Failed to delete customer address:', error.message);
    return res.status(500).json({ success: false, message: 'The address could not be deleted.' });
  }
};

const create = async (req, res) => {
  const validationError = validateCheckout(req.body || {});
  if (validationError) {
    return res.status(400).json({ success: false, message: validationError });
  }
  const idempotencyKey = req.get('Idempotency-Key') || '';
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(idempotencyKey)) {
    return res.status(400).json({ success: false, message: 'A valid order request key is required. Please refresh checkout and try again.' });
  }

  let createdOrder;
  try {
    const {
      customer,
      order_type: requestedOrderType,
      fulfillment_type: legacyFulfillmentType,
      address,
      payment_method: paymentMethod,
    } = req.body;
    const requestedFulfillmentType = requestedOrderType ?? legacyFulfillmentType;
    const orderType = requestedFulfillmentType === 'delivery' ? 'home_delivery' : requestedFulfillmentType;
    const fulfillmentType = orderType === 'home_delivery' ? 'delivery' : orderType;
    createdOrder = await createOrderFromCart({
      userId: getUserId(req),
      customer,
      fulfillmentType,
      orderType,
      address,
      paymentMethod,
      idempotencyKey,
    });
    const orderPaymentMethod = createdOrder.paymentMethod || paymentMethod;

    if (orderPaymentMethod === 'cod') {
      return res.status(201).json({
        success: true,
        data: {
          order_number: createdOrder.orderNumber,
          total_amount: createdOrder.subtotal,
          payment_method: orderPaymentMethod,
        },
      });
    }

    if (createdOrder.paymentStatus === 'paid') {
      return res.json({
        success: true,
        data: {
          order_number: createdOrder.orderNumber,
          total_amount: createdOrder.subtotal,
          payment_method: orderPaymentMethod,
          completed: true,
        },
      });
    }

    const config = await paymentConfig();
    if (createdOrder.razorpayOrderId) {
      if (!config.keyId) {
        return res.status(503).json({
          success: false,
          message: 'Razorpay Key ID is missing. Set RAZORPAY_KEY_ID in Backend/.env or restaurant payment settings.',
        });
      }
      return res.status(201).json({
        success: true,
        data: {
          order_number: createdOrder.orderNumber,
          total_amount: createdOrder.subtotal,
          payment_method: orderPaymentMethod,
          razorpay: {
            key_id: config.keyId,
            order_id: createdOrder.razorpayOrderId,
            amount: Math.round(createdOrder.subtotal * 100),
            currency: 'INR',
          },
        },
      });
    }

    if (config.disabled) {
      await failOnlineOrder(createdOrder.orderNumber, getUserId(req));
      return res.status(503).json({
        success: false,
        message: 'Online payment is disabled in restaurant payment settings. Please choose cash on delivery or contact the restaurant.',
      });
    }
    if (!config.keyId || !config.keySecret) {
      await failOnlineOrder(createdOrder.orderNumber, getUserId(req));
      return res.status(503).json({
        success: false,
        message: !config.keySecret
          ? 'Razorpay server configuration is incomplete. Set RAZORPAY_KEY_SECRET in Backend/.env, then restart the backend.'
          : 'Razorpay Key ID is missing. Set RAZORPAY_KEY_ID in Backend/.env or restaurant payment settings.',
      });
    }

    const razorpayResponse = await fetch('https://api.razorpay.com/v1/orders', {
      method: 'POST',
      headers: {
        Authorization: `Basic ${Buffer.from(`${config.keyId}:${config.keySecret}`).toString('base64')}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        amount: Math.round(createdOrder.subtotal * 100),
        currency: 'INR',
        receipt: createdOrder.orderNumber,
      }),
    });
    if (!razorpayResponse.ok) {
      const error = await razorpayResponse.json().catch(() => ({}));
      throw new Error(error.error?.description || 'Razorpay could not create a payment order.');
    }
    const razorpayOrder = await razorpayResponse.json();
    await attachRazorpayOrder(createdOrder.orderNumber, getUserId(req), razorpayOrder.id);
    return res.status(201).json({
      success: true,
      data: {
        order_number: createdOrder.orderNumber,
        total_amount: createdOrder.subtotal,
        payment_method: orderPaymentMethod,
        razorpay: {
          key_id: config.keyId,
          order_id: razorpayOrder.id,
          amount: razorpayOrder.amount,
          currency: razorpayOrder.currency,
        },
      },
    });
  } catch (error) {
    if (createdOrder?.orderNumber) {
      try {
        await failOnlineOrder(createdOrder.orderNumber, getUserId(req));
      } catch (updateError) {
        console.error('Failed to update online order after payment setup error:', updateError.message);
      }
    }
    if (error.statusCode) {
      return res.status(error.statusCode).json({ success: false, message: error.message });
    }
    console.error('Checkout order creation failed:', error.message);
    return res.status(502).json({ success: false, message: 'Your order could not be prepared for payment. Please try again.' });
  }
};

const verifyPayment = async (req, res) => {
  const {
    order_number: orderNumber,
    razorpay_order_id: razorpayOrderId,
    razorpay_payment_id: paymentId,
    razorpay_signature: signature,
  } = req.body || {};
  if (![orderNumber, razorpayOrderId, paymentId, signature].every((value) => typeof value === 'string' && value)) {
    return res.status(400).json({ success: false, message: 'Payment verification details are incomplete.' });
  }

  try {
    const order = await findOrderForPayment(orderNumber, getUserId(req));
    if (!order || order.payment_method !== 'online' || order.razorpay_order_id !== razorpayOrderId) {
      return res.status(404).json({ success: false, message: 'Payment order was not found.' });
    }
    if (order.payment_status === 'paid' && order.razorpay_payment_id === paymentId) {
      await clearUserCart(getUserId(req));
      return res.json({ success: true, data: { order_number: orderNumber } });
    }

    const { keySecret } = await paymentConfig();
    if (!keySecret) {
      return res.status(503).json({ success: false, message: 'Online payment verification is not configured.' });
    }
    const expected = createHmac('sha256', keySecret)
      .update(`${razorpayOrderId}|${paymentId}`)
      .digest();
    const received = Buffer.from(signature, 'hex');
    if (received.length !== expected.length || !timingSafeEqual(received, expected)) {
      return res.status(400).json({ success: false, message: 'Payment verification failed.' });
    }

    const updated = await completeOnlinePayment({
      orderNumber,
      userId: getUserId(req),
      paymentId,
    });
    if (!updated) {
      return res.status(409).json({ success: false, message: 'This payment order is no longer awaiting payment.' });
    }
    await clearUserCart(getUserId(req));
    return res.json({ success: true, data: { order_number: orderNumber } });
  } catch (error) {
    console.error('Razorpay payment verification failed:', error.message);
    return res.status(500).json({ success: false, message: 'Payment could not be verified. Contact the restaurant before retrying.' });
  }
};

module.exports = {
  create,
  createAddress,
  listAddresses,
  removeAddress,
  updateAddress,
  verifyPayment,
};
