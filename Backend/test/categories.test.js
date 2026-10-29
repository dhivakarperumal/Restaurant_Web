const assert = require('node:assert/strict');
const { test } = require('node:test');

const categoryStore = require('../modules/categories');
const handlers = {
  createCategory: async (category) => ({ ...category, id: 1 }),
  deleteCategory: async () => ({ deleted: true, inUse: false }),
  findCategoryById: async () => null,
  getNextCategoryId: async () => 'CAT001',
  hasCategoryName: async () => false,
  listCategories: async () => [],
  updateCategory: async (_id, category) => ({ ...category, id: 1 }),
};
Object.assign(categoryStore, {
  createCategory: (...args) => handlers.createCategory(...args),
  deleteCategory: (...args) => handlers.deleteCategory(...args),
  findCategoryById: (...args) => handlers.findCategoryById(...args),
  getNextCategoryId: (...args) => handlers.getNextCategoryId(...args),
  hasCategoryName: (...args) => handlers.hasCategoryName(...args),
  listCategories: (...args) => handlers.listCategories(...args),
  updateCategory: (...args) => handlers.updateCategory(...args),
});

const controller = require('../controllers/categoryController');

function createResponse() {
  return {
    statusCode: 200,
    body: null,
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(body) {
      this.body = body;
      return this;
    },
  };
}

test('lists categories in the standard response envelope', async () => {
  handlers.listCategories = async () => [
    { category_id: 'CAT001', category_name: 'Breakfast' },
  ];
  const response = createResponse();

  await controller.list({}, response);

  assert.equal(response.statusCode, 200);
  assert.equal(response.body.success, true);
  assert.equal(response.body.message, 'Categories fetched successfully.');
  assert.equal(response.body.data[0].category_id, 'CAT001');
});

test('returns the next category ID and looks up missing category IDs', async () => {
  const nextIdResponse = createResponse();
  await controller.getNextId({}, nextIdResponse);
  assert.equal(nextIdResponse.body.data, 'CAT001');

  handlers.findCategoryById = async () => null;
  const missingResponse = createResponse();
  await controller.getById({ params: { categoryId: 'CAT999' } }, missingResponse);
  assert.equal(missingResponse.statusCode, 404);
});

test('validates required names and reports duplicate names', async () => {
  const missingNameResponse = createResponse();
  await controller.create({ body: {}, auth: { username: 'Admin' } }, missingNameResponse);
  assert.equal(missingNameResponse.statusCode, 400);

  handlers.hasCategoryName = async () => true;
  const duplicateResponse = createResponse();
  await controller.create(
    {
      body: {
        categoryId: 'CAT001',
        categoryName: 'Breakfast',
        subcategories: [],
      },
      auth: {},
    },
    duplicateResponse,
  );
  assert.equal(duplicateResponse.statusCode, 409);
  assert.match(duplicateResponse.body.message, /already exists/i);
  handlers.hasCategoryName = async () => false;
});

test('creates and updates categories using camel-case app payloads', async () => {
  let created;
  handlers.createCategory = async (category) => {
    created = category;
    return { ...category, id: 1 };
  };
  const createRes = createResponse();
  await controller.create(
    {
      body: {
        categoryId: 'CAT001',
        categoryName: 'Breakfast',
        description: 'Morning meals',
        subcategories: ['Idli', 'Dosa'],
        image: '/uploads/categories/breakfast.jpg',
        status: 'Active',
      },
      auth: { username: 'admin-user' },
    },
    createRes,
  );
  assert.equal(createRes.statusCode, 201);
  assert.equal(created.category_id, 'CAT001');
  assert.deepEqual(created.sub_categories, ['Idli', 'Dosa']);
  assert.equal(created.category_image, '/uploads/categories/breakfast.jpg');
  assert.equal(created.created_by, 'admin-user');

  handlers.findCategoryById = async () => ({
    category_id: 'CAT001',
    category_name: 'Breakfast',
  });
  let updatedId;
  handlers.updateCategory = async (categoryId, category) => {
    updatedId = categoryId;
    return { ...category, category_id: categoryId };
  };
  const updateResponse = createResponse();
  await controller.update(
    {
      params: { categoryId: 'CAT001' },
      body: { categoryName: 'Brunch', status: 'Inactive', subcategories: [] },
      auth: { username: 'admin-user' },
    },
    updateResponse,
  );
  assert.equal(updateResponse.statusCode, 200);
  assert.equal(updatedId, 'CAT001');
  assert.equal(updateResponse.body.data.status, 'Inactive');
});

test('prevents deleting categories used by products', async () => {
  handlers.deleteCategory = async () => ({ deleted: false, inUse: true });
  const response = createResponse();

  await controller.remove({ params: { categoryId: 'CAT001' } }, response);

  assert.equal(response.statusCode, 409);
  assert.match(response.body.message, /products still use it/i);
});
