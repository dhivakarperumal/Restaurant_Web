const {
  createCategory,
  deleteCategory,
  findCategoryById,
  getNextCategoryId,
  listCategories,
  updateCategory,
} = require('../modules/categories');

const getField = (body, snakeCase, camelCase, fallback) =>
  body[snakeCase] ?? body[camelCase] ?? fallback;

const normalizeCategory = (body = {}) => {
  const rawSubCategories = body.sub_categories ?? body.subCategories ?? body.subcategories;
  const statusValue = body.status;

  return {
    category_id: String(getField(body, 'category_id', 'categoryId', '')).trim(),
    category_name: String(getField(body, 'category_name', 'categoryName', '')).trim(),
    description: String(body.description || '').trim(),
    sub_categories: Array.isArray(rawSubCategories)
      ? rawSubCategories.map((item) => String(item).trim()).filter(Boolean)
      : [],
    category_image: String(getField(body, 'category_image', 'image', '') || '').trim(),
    status: statusValue === false || String(statusValue).toLowerCase() === 'inactive' ? 'Inactive' : 'Active',
    created_by: String(getField(body, 'created_by', 'createdBy', '') || '').trim(),
    updated_by: String(getField(body, 'updated_by', 'updatedBy', '') || '').trim(),
  };
};

const list = async (_req, res) => {
  try {
    return res.json({ success: true, data: await listCategories() });
  } catch (error) {
    console.error('Failed to list categories:', error.message);
    return res.status(500).json({ success: false, message: 'Unable to load categories.' });
  }
};

const getNextId = async (_req, res) => {
  try {
    return res.json({ success: true, data: await getNextCategoryId() });
  } catch (error) {
    console.error('Failed to generate category ID:', error.message);
    return res.status(500).json({ success: false, message: 'Unable to generate a category ID.' });
  }
};

const getById = async (req, res) => {
  try {
    const category = await findCategoryById(req.params.categoryId);
    if (!category) return res.status(404).json({ success: false, message: 'Category not found.' });
    return res.json({ success: true, data: category });
  } catch (error) {
    console.error('Failed to load category:', error.message);
    return res.status(500).json({ success: false, message: 'Unable to load category.' });
  }
};

const create = async (req, res) => {
  const category = normalizeCategory(req.body);
  if (!category.category_name) {
    return res.status(400).json({ success: false, message: 'Category name is required.' });
  }

  try {
    if (!category.category_id) category.category_id = await getNextCategoryId();
    const savedCategory = await createCategory(category);
    return res.status(201).json({ success: true, data: savedCategory });
  } catch (error) {
    if (error.code === 'ER_DUP_ENTRY') {
      return res.status(409).json({ success: false, message: 'That category ID already exists.' });
    }
    console.error('Failed to create category:', error.message);
    return res.status(500).json({ success: false, message: 'Unable to create category.' });
  }
};

const update = async (req, res) => {
  const category = normalizeCategory(req.body);
  if (!category.category_name) {
    return res.status(400).json({ success: false, message: 'Category name is required.' });
  }

  try {
    const savedCategory = await updateCategory(req.params.categoryId, category);
    if (!savedCategory) return res.status(404).json({ success: false, message: 'Category not found.' });
    return res.json({ success: true, data: savedCategory });
  } catch (error) {
    console.error('Failed to update category:', error.message);
    return res.status(500).json({ success: false, message: 'Unable to update category.' });
  }
};

const remove = async (req, res) => {
  try {
    const deleted = await deleteCategory(req.params.categoryId);
    if (!deleted) return res.status(404).json({ success: false, message: 'Category not found.' });
    return res.json({ success: true, message: 'Category deleted.' });
  } catch (error) {
    console.error('Failed to delete category:', error.message);
    return res.status(500).json({ success: false, message: 'Unable to delete category.' });
  }
};

module.exports = { create, getById, getNextId, list, remove, update };