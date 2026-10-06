const express = require('express');
const controller = require('../controllers/revenueController');

const router = express.Router();

router.get('/summary', controller.summary);
router.get('/trend', controller.trend);
router.get('/status', controller.status);
router.get('/orders', controller.orders);
router.get('/export', controller.exportOrders);
router.get('/order/:source/:id', controller.orderDetails);

module.exports = router;