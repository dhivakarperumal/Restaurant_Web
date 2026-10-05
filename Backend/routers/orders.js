const express = require('express');
const controller = require('../controllers/orderController');
const customerOrderController = require('../controllers/customerOrderController');

const router = express.Router();

router.get('/addresses', controller.listAddresses);
router.post('/', controller.create);
router.post('/verify-payment', controller.verifyPayment);
router.get('/management', customerOrderController.listCustomerOrders);
router.patch('/management/:orderNumber/status', customerOrderController.updateCustomerOrderStatus);

module.exports = router;
