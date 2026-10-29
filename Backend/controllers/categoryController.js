const {
  createCategory,
  deleteCategory,
  findCategoryById,
  getNextCategoryId,
  hasCategoryName,
  listCategories,
  updateCategory,
} = require('../modules/categories');

const getField = (body, snakeCase, camelCase, fallback) =>
  body[snakeCase] ?? body[camelCase] ?? fallback;

const normalizeCategory = (body = {}, actor = '') => {
  const rawSubCategories =
    body.sub_categories ?? body.subCategories ?? body.subcategories;
  const statusValue = String(body.status ?? 'Active').trim().toLowerCase();
  const subcategoriesAreValid =
    Array.isArray(rawSubCategories) &&
    rawSubCategories.every((item) => typeof item === 'string');

  return {
    category_id: String(getField(body, 'category_id', 'categoryId', '')).trim(),
    category_name: String(getField(body, 'category_name', 'categoryName', '')).trim(),
    description: String(body.description ?? '').trim(),
    sub_categories: subcategoriesAreValid
      ? rawSubCategories.map((item) => item.trim()).filter(Boolean)
      : null,
    category_image: String(
      getField(body, 'category_image', 'image', '') ?? '',
    ).trim(),
    status:
      statusValue === 'inactive'
        ? 'Inactive'
        : statusValue === 'active'
          ? 'Active'
          : '',
    created_by: actor,
    updated_by: actor,
  };
};

const validateCategory = (category) => {
  if (!category.category_name) return 'Category name is required.';
  if (category.category_name.length > 150) {
    return 'Category name must be 150 characters or fewer.';
  }
  if (category.category_id && !/^CAT[0-9]{1,28}$/i.test(category.category_id)) {
    return 'Category ID must use the CAT prefix followed by digits.';
  }
  if (!Array.isArray(category.sub_categories)) {
    return 'Subcategories must be an array of names.';
  }
  if (category.sub_categories.some((name) => name.length > 150)) {
    return 'Subcategory names must be 150 characters or fewer.';
  }
  if (!['active', 'inactive'].includes(category.status.toLowerCase())) {
    return 'Status must be Active or Inactive.';
  }
  return '';
};

const list = async (_req, res) => {
  try {
    return res.json({
      success: true,
      message: 'Categories fetched successfully.',
      data: await listCategories(),
    });
  } catch (error) {
    console.error('Failed to list categories:', error.message);
    return res.status(500).json({
      success: false,
      message: 'Unable to load categories.',
    });
  }
};

const getNextId = async (_req, res) => {
  try {
    return res.json({
      success: true,
      message: 'Category ID generated successfully.',
      data: await getNextCategoryId(),
    });
  } catch (error) {
    console.error('Failed to generate category ID:', error.message);
    return res.status(500).json({
      success: false,
      message: 'Unable to generate a category ID.',
    });
  }
};

const getById = async (req, res) => {
  try {
    const category = await findCategoryById(req.params.categoryId);
    if (!category) {
      return res.status(404).json({
        success: false,
        message: 'Category not found.',
      });
    }
    return res.json({
      success: true,
      message: 'Category fetched successfully.',
      data: category,
    });
  } catch (error) {
    console.error('Failed to load category:', error.message);
    return res.status(500).json({
      success: false,
      message: 'Unable to load category.',
    });
  }
};

const create = async (req, res) => {
  const actor = String(req.auth?.username || req.auth?.email || 'Admin');
  const category = normalizeCategory(req.body, actor);
  const validationMessage = validateCategory(category);
  if (validationMessage) {
    return res.status(400).json({ success: false, message: validationMessage });
  }

  try {
    if (category.category_id && await findCategoryById(category.category_id)) {
      return res.status(409).json({
        success: false,
        message: 'That category ID already exists.',
      });
    }
    if (await hasCategoryName(category.category_name)) {
      return res.status(409).json({
        success: false,
        message: 'A category with this name already exists.',
      });
    }
    if (!category.category_id) {
      category.category_id = await getNextCategoryId();
    }
    const savedCategory = await createCategory(category);
    return res.status(201).json({
      success: true,
      message: 'Category created successfully.',
      data: savedCategory,
    });
  } catch (error) {
    if (error.code === 'ER_DUP_ENTRY') {
      return res.status(409).json({
        success: false,
        message: 'That category ID or name already exists.',
      });
    }
    if (error.code === 'CATEGORY_NAME_EXISTS') {
      return res.status(409).json({ success: false, message: error.message });
    }
    if (error.code === 'CATEGORY_ID_LOCK_TIMEOUT') {
      return res.status(503).json({ success: false, message: error.message });
    }
    console.error('Failed to create category:', error.message);
    return res.status(500).json({
      success: false,
      message: 'Unable to create category.',
    });
  }
};

const update = async (req, res) => {
  const actor = String(req.auth?.username || req.auth?.email || 'Admin');
  const category = normalizeCategory(req.body, actor);
  const validationMessage = validateCategory(category);
  if (validationMessage) {
    return res.status(400).json({ success: false, message: validationMessage });
  }

  try {
    const existing = await findCategoryById(req.params.categoryId);
    if (!existing) {
      return res.status(404).json({
        success: false,
        message: 'Category not found.',
      });
    }
    if (await hasCategoryName(category.category_name, req.params.categoryId)) {
      return res.status(409).json({
        success: false,
        message: 'A category with this name already exists.',
      });
    }
    const savedCategory = await updateCategory(
      req.params.categoryId,
      category,
    );
    if (!savedCategory) {
      return res.status(404).json({
        success: false,
        message: 'Category not found.',
      });
    }
    return res.json({
      success: true,
      message: 'Category updated successfully.',
      data: savedCategory,
    });
  } catch (error) {
    if (error.code === 'ER_DUP_ENTRY') {
      return res.status(409).json({
        success: false,
        message: 'A category with this name already exists.',
      });
    }
    if (error.code === 'CATEGORY_NAME_EXISTS') {
      return res.status(409).json({ success: false, message: error.message });
    }
    if (error.code === 'CATEGORY_ID_LOCK_TIMEOUT') {
      return res.status(503).json({ success: false, message: error.message });
    }
    console.error('Failed to update category:', error.message);
    return res.status(500).json({
      success: false,
      message: 'Unable to update category.',
    });
  }
};

const remove = async (req, res) => {
  try {
    const result = await deleteCategory(req.params.categoryId);
    if (result.inUse) {
      return res.status(409).json({
        success: false,
        message: 'This category cannot be deleted while products still use it.',
      });
    }
    if (!result.deleted) {
      return res.status(404).json({
        success: false,
        message: 'Category not found.',
      });
    }
    return res.json({
      success: true,
      message: 'Category deleted successfully.',
    });
  } catch (error) {
    console.error('Failed to delete category:', error.message);
    return res.status(500).json({
      success: false,
      message: 'Unable to delete category.',
    });
  }
};

module.exports = { create, getById, getNextId, list, remove, update };
