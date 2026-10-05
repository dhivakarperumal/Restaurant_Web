const express = require('express');
const cartController = require('../controllers/cartController');

const router = express.Router();

// Add item to cart
router.post('/', cartController.addToCart);

// Get cart for a specific user
router.get('/:userId', cartController.getCart);

// Update quantity for a cart item
router.put('/:cartItemId', cartController.updateItem);

// Clear entire cart for a user (must precede /:cartItemId)
router.delete('/clear/:userId', cartController.clearCart);

// Remove specific cart item
router.delete('/:cartItemId', cartController.removeItem);

module.exports = router;
