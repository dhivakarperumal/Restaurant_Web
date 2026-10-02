const {
  createCuisine,
  deleteCuisine,
  findCuisineById,
  getNextCuisineId,
  listCuisines,
  updateCuisine,
} = require('../modules/cuisines');

const getField = (body, snakeCase, camelCase, fallback) =>
  body[snakeCase] ?? body[camelCase] ?? fallback;

const normalizeCuisine = (body = {}) => ({
  cuisine_id: String(getField(body, 'cuisine_id', 'cuisineId', '')).trim(),
  cuisine_name: String(getField(body, 'cuisine_name', 'cuisineName', '')).trim(),
  description: String(body.description || '').trim(),
  image: String(body.image || '').trim(),
  status: String(body.status || 'Active').toLowerCase() === 'inactive' ? 'Inactive' : 'Active',
  featured: [true, 1, '1', 'true', 'yes'].includes(
    typeof body.featured === 'string' ? body.featured.toLowerCase() : body.featured
  ),
  created_by: String(getField(body, 'created_by', 'createdBy', '') || '').trim(),
  updated_by: String(getField(body, 'updated_by', 'updatedBy', '') || '').trim(),
});

const list = async (_req, res) => {
  try {
    return res.json({ success: true, data: await listCuisines() });
  } catch (error) {
    console.error('Failed to list cuisines:', error.message);
    return res.status(500).json({ success: false, message: 'Unable to load cuisines.' });
  }
};

const getNextId = async (_req, res) => {
  try {
    return res.json({ success: true, data: await getNextCuisineId() });
  } catch (error) {
    console.error('Failed to generate cuisine ID:', error.message);
    return res.status(500).json({ success: false, message: 'Unable to generate a cuisine ID.' });
  }
};

const getById = async (req, res) => {
  try {
    const cuisine = await findCuisineById(req.params.cuisineId);
    if (!cuisine) return res.status(404).json({ success: false, message: 'Cuisine not found.' });
    return res.json({ success: true, data: cuisine });
  } catch (error) {
    console.error('Failed to load cuisine:', error.message);
    return res.status(500).json({ success: false, message: 'Unable to load cuisine.' });
  }
};

const create = async (req, res) => {
  const cuisine = normalizeCuisine(req.body);
  if (!cuisine.cuisine_name) {
    return res.status(400).json({ success: false, message: 'Cuisine name is required.' });
  }

  try {
    if (!cuisine.cuisine_id) cuisine.cuisine_id = await getNextCuisineId();
    return res.status(201).json({ success: true, data: await createCuisine(cuisine) });
  } catch (error) {
    if (error.code === 'ER_DUP_ENTRY') {
      return res.status(409).json({ success: false, message: 'That cuisine ID already exists.' });
    }
    console.error('Failed to create cuisine:', error.message);
    return res.status(500).json({ success: false, message: 'Unable to create cuisine.' });
  }
};

const update = async (req, res) => {
  const cuisine = normalizeCuisine(req.body);
  if (!cuisine.cuisine_name) {
    return res.status(400).json({ success: false, message: 'Cuisine name is required.' });
  }

  try {
    const savedCuisine = await updateCuisine(req.params.cuisineId, cuisine);
    if (!savedCuisine) return res.status(404).json({ success: false, message: 'Cuisine not found.' });
    return res.json({ success: true, data: savedCuisine });
  } catch (error) {
    console.error('Failed to update cuisine:', error.message);
    return res.status(500).json({ success: false, message: 'Unable to update cuisine.' });
  }
};

const remove = async (req, res) => {
  try {
    if (!await deleteCuisine(req.params.cuisineId)) {
      return res.status(404).json({ success: false, message: 'Cuisine not found.' });
    }
    return res.json({ success: true, message: 'Cuisine deleted.' });
  } catch (error) {
    console.error('Failed to delete cuisine:', error.message);
    return res.status(500).json({ success: false, message: 'Unable to delete cuisine.' });
  }
};

module.exports = { create, getById, getNextId, list, remove, update };