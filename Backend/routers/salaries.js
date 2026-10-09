const express = require('express');
const { addPayment, editPayment, getDetails, getHistory, removePayment } = require('../controllers/salaryController');

const router = express.Router();

router.get('/details', getDetails);
router.get('/history', getHistory);
router.post('/pay', addPayment);
router.put('/pay/:paymentId', editPayment);
router.delete('/pay/:paymentId', removePayment);

module.exports = router;
