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
} = require('../controllers/eventOrderController');

const router = express.Router();

// Public / Guest accessible:
router.get('/menu', getBulkOrderMenu);
router.post('/', createBulkOrder);

// Authenticated customer routes:
router.get('/mine', getCustomerEventOrders);

// Admin & detail routes:
router.get('/', getAllEventOrders);
router.get('/:id', getEventOrder);
router.patch('/:id/status', updateStatus);
router.put('/:id', updateDetails);
router.delete('/:id', removeEventOrder);

module.exports = router;
