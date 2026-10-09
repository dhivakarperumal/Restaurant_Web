const express = require('express');
const { notifyAdmins } = require('../utils/notificationSocket');
const {
  listInventoryCategories,
  listInventorySubcategories,
  listInventoryUnits,
  listInventoryLocations,
  listSuppliers,
  listProducts,
  getInventorySummary,
  createProduct,
  updateProduct,
  deleteProduct,
  createCategory,
  updateCategory,
  deleteCategory,
  createSubcategory,
  createUnit,
  createSupplier,
  createLocation,
  createPurchase,
  createStockIn,
  createStockOut,
  createTransfer,
  createAdjustment,
  createKitchenRequest,
  issueKitchenRequest,
  createWastage,
  createRecipe,
  getExpiryItems,
  getLowStockItems,
  getReports,
} = require('../modules/inventory');

const router = express.Router();

const withErrorHandler = (handler) => async (req, res) => {
  try {
    await handler(req, res);
  } catch (error) {
    const message = error?.message || 'Inventory request failed';
    res.status(400).json({ success: false, message });
  }
};

router.get('/dashboard', withErrorHandler(async (req, res) => {
  const summary = await getInventorySummary();
  res.json({ success: true, data: summary });
}));

router.get('/products', withErrorHandler(async (req, res) => {
  const products = await listProducts();
  res.json({ success: true, data: products });
}));

router.get('/products/options', withErrorHandler(async (req, res) => {
  const [products] = await require('../config/db').query(
    'SELECT id, product_name FROM inventory_products WHERE deleted_at IS NULL ORDER BY product_name ASC'
  );
  res.json({ success: true, data: products });
}));

router.post('/products', withErrorHandler(async (req, res) => {
  const result = await createProduct({ ...req.body, created_by: req.auth?.name || 'admin' });
  res.status(201).json({ success: true, message: 'Product added successfully.', data: result });
}));

router.put('/products/:id', withErrorHandler(async (req, res) => {
  const result = await updateProduct(Number(req.params.id), { ...req.body, created_by: req.auth?.name || 'admin' });
  res.json({ success: true, message: 'Product updated successfully.', data: result });
}));

router.delete('/products/:id', withErrorHandler(async (req, res) => {
  await deleteProduct(Number(req.params.id));
  res.json({ success: true, message: 'Product deleted successfully.' });
}));

router.get('/categories', withErrorHandler(async (req, res) => {
  res.json({ success: true, data: await listInventoryCategories() });
}));

router.post('/categories', withErrorHandler(async (req, res) => {
  const result = await createCategory(req.body);
  res.status(201).json({ success: true, message: 'Category added successfully.', data: result });
}));

router.put('/categories/:id', withErrorHandler(async (req, res) => {
  await updateCategory(Number(req.params.id), req.body);
  res.json({ success: true, message: 'Category updated successfully.' });
}));

router.delete('/categories/:id', withErrorHandler(async (req, res) => {
  await deleteCategory(Number(req.params.id));
  res.json({ success: true, message: 'Category deleted successfully.' });
}));

router.get('/subcategories', withErrorHandler(async (req, res) => {
  res.json({ success: true, data: await listInventorySubcategories() });
}));

router.post('/subcategories', withErrorHandler(async (req, res) => {
  const result = await createSubcategory(req.body);
  res.status(201).json({ success: true, message: 'Sub category added successfully.', data: result });
}));

router.get('/units', withErrorHandler(async (req, res) => {
  res.json({ success: true, data: await listInventoryUnits() });
}));

router.post('/units', withErrorHandler(async (req, res) => {
  const result = await createUnit(req.body);
  res.status(201).json({ success: true, message: 'Unit added successfully.', data: result });
}));

router.get('/locations', withErrorHandler(async (req, res) => {
  res.json({ success: true, data: await listInventoryLocations() });
}));

router.post('/locations', withErrorHandler(async (req, res) => {
  const result = await createLocation(req.body);
  res.status(201).json({ success: true, message: 'Location added successfully.', data: result });
}));

router.get('/suppliers', withErrorHandler(async (req, res) => {
  res.json({ success: true, data: await listSuppliers() });
}));

router.post('/suppliers', withErrorHandler(async (req, res) => {
  const result = await createSupplier(req.body);
  res.status(201).json({ success: true, message: 'Supplier added successfully.', data: result });
}));

router.get('/purchases', withErrorHandler(async (req, res) => {
  const [rows] = await require('../config/db').query('SELECT * FROM purchases ORDER BY purchase_date DESC');
  res.json({ success: true, data: rows });
}));

router.post('/purchases', withErrorHandler(async (req, res) => {
  const result = await createPurchase(req.body);
  res.status(201).json({ success: true, message: 'Purchase completed successfully.', data: result });
}));

router.get('/stock/history', withErrorHandler(async (req, res) => {
  const [rows] = await require('../config/db').query('SELECT * FROM stock_transactions ORDER BY created_at DESC LIMIT 200');
  res.json({ success: true, data: rows });
}));

router.post('/stock-in', withErrorHandler(async (req, res) => {
  const result = await createStockIn(req.body);
  res.status(201).json({ success: true, message: 'Stock updated successfully.', data: result });
}));

router.post('/stock-out', withErrorHandler(async (req, res) => {
  const result = await createStockOut(req.body);
  res.status(201).json({ success: true, message: 'Stock updated successfully.', data: result });
}));

router.post('/transfers', withErrorHandler(async (req, res) => {
  const result = await createTransfer(req.body);
  res.status(201).json({ success: true, message: 'Stock transfer completed successfully.', data: result });
}));

router.post('/adjustments', withErrorHandler(async (req, res) => {
  const result = await createAdjustment(req.body);
  res.status(201).json({ success: true, message: 'Stock adjusted successfully.', data: result });
}));

router.get('/kitchen-requests', withErrorHandler(async (req, res) => {
  const db = require('../config/db');
  const [rows] = await db.query('SELECT * FROM kitchen_requests ORDER BY request_date DESC, id DESC');
  if (rows.length) {
    const requestIds = rows.map((request) => request.id);
    const [items] = await db.query(
      "SELECT request_items.*, COALESCE(NULLIF(request_items.product_name, ''), products.product_name) AS item_name FROM kitchen_request_items request_items LEFT JOIN inventory_products products ON products.id = request_items.product_id WHERE request_items.request_id IN (?) ORDER BY request_items.id",
      [requestIds]
    );
    const itemsByRequest = items.reduce((grouped, item) => {
      grouped[item.request_id] = grouped[item.request_id] || [];
      grouped[item.request_id].push(item);
      return grouped;
    }, {});
    rows.forEach((request) => {
      request.items = itemsByRequest[request.id] || [];
    });
  }
  res.json({ success: true, data: rows });
}));

router.post('/kitchen-requests', withErrorHandler(async (req, res) => {
  const result = await createKitchenRequest(req.body);
  notifyAdmins({
    type: 'kitchen',
    title: 'New kitchen inventory request',
    message: `${req.body?.requested_by || req.auth?.username || 'Kitchen staff'} submitted request ${result.request_number}.`,
    link: '/admin/inventory/kitchen-requests',
    data: { request_id: result.id, request_number: result.request_number },
  });
  res.status(201).json({ success: true, message: 'Kitchen request created successfully.', data: result });
}));

router.put('/kitchen-requests/:id/approve', withErrorHandler(async (req, res) => {
  await require('../config/db').query('UPDATE kitchen_requests SET status = ? WHERE id = ?', ['Approved', Number(req.params.id)]);
  res.json({ success: true, message: 'Kitchen request approved.' });
}));

router.put('/kitchen-requests/:id/reject', withErrorHandler(async (req, res) => {
  await require('../config/db').query('UPDATE kitchen_requests SET status = ? WHERE id = ?', ['Rejected', Number(req.params.id)]);
  res.json({ success: true, message: 'Kitchen request rejected.' });
}));

router.put('/kitchen-requests/:id/issue', withErrorHandler(async (req, res) => {
  await issueKitchenRequest(Number(req.params.id), req.body);
  res.json({ success: true, message: 'Stock issued successfully.' });
}));

router.put('/kitchen-requests/:id/complete', withErrorHandler(async (req, res) => {
  await require('../config/db').query('UPDATE kitchen_requests SET status = ? WHERE id = ?', ['Completed', Number(req.params.id)]);
  res.json({ success: true, message: 'Kitchen request completed.' });
}));

router.get('/recipes', withErrorHandler(async (req, res) => {
  const [rows] = await require('../config/db').query('SELECT * FROM recipes ORDER BY created_at DESC');
  res.json({ success: true, data: rows });
}));

router.post('/recipes', withErrorHandler(async (req, res) => {
  const result = await createRecipe(req.body);
  res.status(201).json({ success: true, message: 'Recipe saved successfully.', data: result });
}));

router.get('/wastage', withErrorHandler(async (req, res) => {
  const [rows] = await require('../config/db').query('SELECT * FROM wastages ORDER BY wastage_date DESC');
  res.json({ success: true, data: rows });
}));

router.post('/wastage', withErrorHandler(async (req, res) => {
  const result = await createWastage(req.body);
  res.status(201).json({ success: true, message: 'Wastage recorded successfully.', data: result });
}));

router.get('/expiry', withErrorHandler(async (req, res) => {
  res.json({ success: true, data: await getExpiryItems() });
}));

router.get('/low-stock', withErrorHandler(async (req, res) => {
  res.json({ success: true, data: await getLowStockItems() });
}));

router.get('/reports', withErrorHandler(async (req, res) => {
  res.json({ success: true, data: await getReports() });
}));

module.exports = router;
