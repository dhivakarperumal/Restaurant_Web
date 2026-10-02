const {
  createFood,
  deleteFood,
  findFoodById,
  getNextFoodId,
  listFoods,
  updateFood,
} = require('../modules/foods');

const getField = (body, snakeCase, camelCase, fallback) => body[snakeCase] ?? body[camelCase] ?? fallback;
const asBoolean = (value, fallback = false) => {
  if (value === undefined || value === null || value === '') return fallback;
  return [true, 1, '1', 'true', 'yes'].includes(typeof value === 'string' ? value.toLowerCase() : value);
};
const nonNegativeNumber = (value, fallback = 0) => {
  const number = Number(value ?? fallback);
  return Number.isFinite(number) ? Math.max(0, number) : fallback;
};

const normalizeFood = (body = {}, actor = '') => {
  const mrp = nonNegativeNumber(body.mrp);
  const discount = Number(body.discount || 0);
  const addons = Array.isArray(body.addons) ? body.addons.map((item) => ({
    addon_name: String(item.addon_name ?? item.name ?? '').trim(),
    price: nonNegativeNumber(item.price),
    status: String(item.status || 'Active').toLowerCase() === 'inactive' ? 'Inactive' : 'Active',
  })).filter((item) => item.addon_name) : [];
  const customizations = Array.isArray(body.customizations) ? body.customizations.map((group) => ({
    name: String(group.name ?? group.customization_name ?? '').trim(),
    selection_type: String(group.selection_type || 'Single').toLowerCase() === 'multiple' ? 'Multiple' : 'Single',
    required: asBoolean(group.required),
    options: Array.isArray(group.options) ? group.options.map((option) => ({
      name: String(option.name ?? option.option_name ?? '').trim(),
      price: nonNegativeNumber(option.price),
    })).filter((option) => option.name) : [],
  })).filter((group) => group.name) : [];
  const images = Array.isArray(body.food_images) ? body.food_images : body.images;

  return {
    food_id: String(getField(body, 'food_id', 'foodId', '')).trim(),
    food_name: String(getField(body, 'food_name', 'foodName', '')).trim(),
    cuisine_id: String(getField(body, 'cuisine_id', 'cuisineId', '')).trim(),
    cuisine_name: String(getField(body, 'cuisine_name', 'cuisineName', '')).trim(),
    category_id: String(getField(body, 'category_id', 'categoryId', '')).trim(),
    category_name: String(getField(body, 'category_name', 'categoryName', '')).trim(),
    subcategory_name: String(getField(body, 'subcategory_name', 'subcategoryName', '')).trim(),
    description: String(body.description || '').trim(),
    food_images: Array.isArray(images) ? images.map((image) => String(image).trim()).filter(Boolean) : [],
    mrp,
    discount: Number.isFinite(discount) ? discount : 0,
    final_price: Number((mrp - (mrp * (Number.isFinite(discount) ? discount : 0) / 100)).toFixed(2)),
    rating: Number(body.rating ?? 0),
    serving_size: String(getField(body, 'serving_size', 'servingSize', '') || '').trim(),
    portion_size: String(getField(body, 'portion_size', 'portionSize', 'Full')).trim(),
    preparation_time: Math.floor(nonNegativeNumber(getField(body, 'preparation_time', 'preparationTime', 0))),
    food_type: String(getField(body, 'food_type', 'foodType', 'Veg')).trim(),
    is_spicy: asBoolean(getField(body, 'is_spicy', 'isSpicy', false)),
    is_available: asBoolean(getField(body, 'is_available', 'isAvailable', true), true),
    dining_available: asBoolean(getField(body, 'dining_available', 'diningAvailable', true), true),
    takeaway_available: asBoolean(getField(body, 'takeaway_available', 'takeawayAvailable', true), true),
    delivery_available: asBoolean(getField(body, 'delivery_available', 'deliveryAvailable', true), true),
    featured: asBoolean(body.featured),
    status: String(body.status || 'Active').toLowerCase() === 'inactive' ? 'Inactive' : 'Active',
    addons,
    customizations,
    created_by: actor,
    updated_by: actor,
  };
};

const validateFood = (food) => {
  if (!food.food_name) return 'Food name is required.';
  if (!food.cuisine_id || !food.cuisine_name) return 'Choose a cuisine.';
  if (!food.category_id || !food.category_name) return 'Choose a category.';
  if (!food.subcategory_name) return 'Choose a subcategory.';
  if (food.mrp < 0) return 'MRP cannot be negative.';
  if (food.discount < 0 || food.discount > 100) return 'Discount must be between 0 and 100.';
  if (!Number.isFinite(food.rating) || food.rating < 0 || food.rating > 5) return 'Food rating must be between 0 and 5.';
  if (!['Half', 'Full', 'Your Choice'].includes(food.portion_size)) return 'Choose a valid portion size.';
  if (!['Veg', 'Non-Veg'].includes(food.food_type)) return 'Choose a valid food type.';
  if (food.addons.some((item) => item.price < 0)) return 'Add-on prices cannot be negative.';
  if (food.customizations.some((group) => group.options.some((option) => option.price < 0))) return 'Option prices cannot be negative.';
  return '';
};

const list = async (_req, res) => {
  try {
    return res.json({ success: true, data: await listFoods() });
  } catch (error) {
    console.error('Failed to list foods:', error.message);
    return res.status(500).json({ success: false, message: 'Unable to load foods.' });
  }
};

const getNextId = async (_req, res) => {
  try {
    return res.json({ success: true, data: await getNextFoodId() });
  } catch (error) {
    console.error('Failed to generate food ID:', error.message);
    return res.status(500).json({ success: false, message: 'Unable to generate a food ID.' });
  }
};

const getById = async (req, res) => {
  try {
    const food = await findFoodById(req.params.foodId);
    if (!food) return res.status(404).json({ success: false, message: 'Food not found.' });
    return res.json({ success: true, data: food });
  } catch (error) {
    console.error('Failed to load food:', error.message);
    return res.status(500).json({ success: false, message: 'Unable to load food.' });
  }
};

const create = async (req, res) => {
  const food = normalizeFood(req.body, req.auth?.username || 'Admin');
  const validationMessage = validateFood(food);
  if (validationMessage) return res.status(400).json({ success: false, message: validationMessage });

  try {
    if (!food.food_id) food.food_id = await getNextFoodId();
    return res.status(201).json({ success: true, data: await createFood(food) });
  } catch (error) {
    if (error.code === 'ER_DUP_ENTRY') return res.status(409).json({ success: false, message: 'That food ID already exists.' });
    console.error('Failed to create food:', error.message);
    return res.status(500).json({ success: false, message: 'Unable to save food.' });
  }
};

const update = async (req, res) => {
  const food = normalizeFood(req.body, req.auth?.username || 'Admin');
  const validationMessage = validateFood(food);
  if (validationMessage) return res.status(400).json({ success: false, message: validationMessage });

  try {
    const savedFood = await updateFood(req.params.foodId, food);
    if (!savedFood) return res.status(404).json({ success: false, message: 'Food not found.' });
    return res.json({ success: true, data: savedFood });
  } catch (error) {
    console.error('Failed to update food:', error.message);
    return res.status(500).json({ success: false, message: 'Unable to update food.' });
  }
};

const remove = async (req, res) => {
  try {
    if (!await deleteFood(req.params.foodId)) return res.status(404).json({ success: false, message: 'Food not found.' });
    return res.json({ success: true, message: 'Food deleted.' });
  } catch (error) {
    console.error('Failed to delete food:', error.message);
    return res.status(500).json({ success: false, message: 'Unable to delete food.' });
  }
};

module.exports = { create, getById, getNextId, list, remove, update };
