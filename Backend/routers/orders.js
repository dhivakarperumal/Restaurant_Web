const express = require('express');
const controller = require('../controllers/orderController');
const customerOrderController = require('../controllers/customerOrderController');

const router = express.Router();

router.get('/addresses', controller.listAddresses);
router.post('/addresses', controller.createAddress);
router.put('/addresses/:addressId', controller.updateAddress);
router.delete('/addresses/:addressId', controller.removeAddress);
router.post('/', controller.create);
router.post('/verify-payment', controller.verifyPayment);
router.get('/mine', customerOrderController.listMyOrders);
router.get('/management', customerOrderController.listCustomerOrders);
router.patch('/management/:orderNumber/status', customerOrderController.updateCustomerOrderStatus);

module.exports = router;
