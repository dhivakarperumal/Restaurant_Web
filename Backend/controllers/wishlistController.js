const { findFoodById } = require('../modules/foods');
const {
  addFoodToWishlist,
  getWishlistByUserId,
  removeFoodFromWishlist,
} = require('../modules/wishlist');

const list = async (req, res) => {
  try {
    const data = await getWishlistByUserId(req.auth.user_id);
    return res.json({ success: true, data });
  } catch (error) {
    console.error('Failed to load wishlist:', error.message);
    return res.status(500).json({ success: false, message: 'Unable to load your favorites.' });
  }
};

const add = async (req, res) => {
  const foodId = String(req.body?.food_id || req.body?.product_id || '').trim();
  if (!foodId || foodId.length > 32) {
    return res.status(400).json({ success: false, message: 'A valid food_id is required.' });
  }

  try {
    const food = await findFoodById(foodId);
    if (!food || String(food.status || '').toLowerCase() !== 'active' || !food.is_available) {
      return res.status(404).json({ success: false, message: 'This food is not currently available.' });
    }
    await addFoodToWishlist(req.auth.user_id, food);
    const data = await getWishlistByUserId(req.auth.user_id);
    const savedFood = data.find((item) => item.food_id === foodId);
    return res.status(201).json({ success: true, data: savedFood });
  } catch (error) {
    console.error('Failed to add food to wishlist:', error.message);
    return res.status(500).json({ success: false, message: 'Unable to save this favorite.' });
  }
};

const remove = async (req, res) => {
  const foodId = String(req.params.foodId || '').trim();
  if (!foodId || foodId.length > 32) {
    return res.status(400).json({ success: false, message: 'A valid food_id is required.' });
  }

  try {
    const removed = await removeFoodFromWishlist(req.auth.user_id, foodId);
    if (!removed) return res.status(404).json({ success: false, message: 'Favorite food not found.' });
    return res.json({ success: true, message: 'Favorite removed.' });
  } catch (error) {
    console.error('Failed to remove food from wishlist:', error.message);
    return res.status(500).json({ success: false, message: 'Unable to remove this favorite.' });
  }
};

module.exports = { add, list, remove };
