const express = require('express');
const controller = require('../controllers/orderController');

const router = express.Router();

router.get('/addresses', controller.listAddresses);
router.post('/', controller.create);
router.post('/verify-payment', controller.verifyPayment);

module.exports = router;
