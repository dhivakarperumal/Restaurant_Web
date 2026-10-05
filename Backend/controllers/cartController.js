const {
  addItemToCart,
  getCartByUserId,
  updateCartItemQuantity,
  deleteCartItem,
  clearCartByUserId,
} = require('../modules/cart');

const addToCart = async (req, res) => {
  try {
    const itemData = req.body || {};
    const userId = itemData.user_id || req.auth?.user_id;

    if (!userId) {
      return res.status(400).json({
        success: false,
        message: 'user_id is required to add items to the cart. Please login first.',
      });
    }

    const cartItem = await addItemToCart({
      ...itemData,
      user_id: userId,
      customer_name: itemData.customer_name || req.auth?.username,
      customer_email: itemData.customer_email || req.auth?.email,
      customer_phone: itemData.customer_phone || req.auth?.mobile_number,
    });

    return res.status(201).json({
      success: true,
      message: 'Item added to cart successfully',
      data: cartItem,
    });
  } catch (error) {
    console.error('Error adding to cart:', error.message);
    return res.status(400).json({
      success: false,
      message: error.message || 'Unable to add item to cart',
    });
  }
};

const getCart = async (req, res) => {
  try {
    const userId = req.params.userId || req.auth?.user_id;
    if (!userId) {
      return res.status(400).json({
        success: false,
        message: 'user_id is required',
      });
    }

    const cartData = await getCartByUserId(userId);
    return res.status(200).json({
      success: true,
      data: cartData.items,
      total_amount: cartData.total_amount,
      total_items: cartData.total_items,
      total_quantity: cartData.total_quantity,
    });
  } catch (error) {
    console.error('Error fetching cart:', error.message);
    return res.status(500).json({
      success: false,
      message: 'Unable to retrieve cart items',
    });
  }
};

const updateItem = async (req, res) => {
  try {
    const { cartItemId } = req.params;
    const { quantity, price } = req.body;

    if (!cartItemId) {
      return res.status(400).json({
        success: false,
        message: 'cartItemId is required',
      });
    }

    const updated = await updateCartItemQuantity(cartItemId, quantity, price);
    return res.status(200).json({
      success: true,
      message: 'Cart item updated successfully',
      data: updated,
    });
  } catch (error) {
    console.error('Error updating cart item:', error.message);
    return res.status(400).json({
      success: false,
      message: error.message || 'Unable to update cart item',
    });
  }
};

const removeItem = async (req, res) => {
  try {
    const { cartItemId } = req.params;
    if (!cartItemId) {
      return res.status(400).json({
        success: false,
        message: 'cartItemId is required',
      });
    }

    const deleted = await deleteCartItem(cartItemId);
    if (!deleted) {
      return res.status(404).json({
        success: false,
        message: 'Cart item not found',
      });
    }

    return res.status(200).json({
      success: true,
      message: 'Cart item removed successfully',
    });
  } catch (error) {
    console.error('Error deleting cart item:', error.message);
    return res.status(500).json({
      success: false,
      message: 'Unable to delete cart item',
    });
  }
};

const clearCart = async (req, res) => {
  try {
    const userId = req.params.userId || req.body?.user_id || req.auth?.user_id;
    if (!userId) {
      return res.status(400).json({
        success: false,
        message: 'user_id is required',
      });
    }

    await clearCartByUserId(userId);
    return res.status(200).json({
      success: true,
      message: 'Cart cleared successfully',
    });
  } catch (error) {
    console.error('Error clearing cart:', error.message);
    return res.status(500).json({
      success: false,
      message: 'Unable to clear cart',
    });
  }
};

module.exports = {
  addToCart,
  getCart,
  updateItem,
  removeItem,
  clearCart,
};
