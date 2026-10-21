const express = require('express');
const {
  createBulkOrder,
  getCustomerEventOrders,
  getAllEventOrders,
  getEventOrder,
  updateStatus,
  updateDetails,
  removeEventOrder,
  getBulkOrderMenu,
  sendQuotation,
  respondToQuotation,
} = require('../controllers/eventOrderController');

const router = express.Router();

// Public / Guest accessible:
router.get('/menu', getBulkOrderMenu);
router.post('/', createBulkOrder);

// Authenticated customer routes:
router.get('/mine', getCustomerEventOrders);
router.post('/:id/respond', respondToQuotation);

// Admin & detail routes:
router.get('/', getAllEventOrders);
router.get('/:id', getEventOrder);
router.post('/:id/quote', sendQuotation);
router.patch('/:id/status', updateStatus);
router.put('/:id', updateDetails);
router.delete('/:id', removeEventOrder);

module.exports = router;
