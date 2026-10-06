const db = require('../config/db');
const { initializeAuthSchema } = require('./auth');
const { initializeCategorySchema } = require('./categories');
const { initializeCuisineSchema } = require('./cuisines');
const { initializeFoodSchema } = require('./foods');
const { initializeBannerSchema } = require('./banners');
const { initializeCouponSchema } = require('./coupons');
const { initializeReviewSchema } = require('./reviews');
const { initializeVideoSchema } = require('./videos');
const { initializeEmployeeSchema } = require('./employees');
const { initializeSettingsSchema } = require('./settings');
const { initializeKitchenOrderSchema } = require('./kitchenOrders');
const { initializeInventorySchema } = require('./inventory');
const { initializeOrderSchema } = require('./orders');
const { initializeWishlistSchema } = require('./wishlist');
const {
  initializeServerTableSchema,
  createServerTable,
  findServerTables,
  findServerTableById,
  findServerTableByNumber,
  updateServerTable,
  deleteServerTable,
} = require('./serverTable');

module.exports = {
  db,
  initializeAuthSchema,
  initializeCategorySchema,
  initializeCuisineSchema,
  initializeFoodSchema,
  initializeKitchenOrderSchema,
  initializeOrderSchema,
  initializeWishlistSchema,
  initializeBannerSchema,
  initializeCouponSchema,
  initializeReviewSchema,
  initializeVideoSchema,
  initializeSettingsSchema,
  initializeEmployeeSchema,
  initializeInventorySchema,
  initializeServerTableSchema,
  createServerTable,
  findServerTables,
  findServerTableById,
  findServerTableByNumber,
  updateServerTable,
  deleteServerTable,
  testConnection: db.testConnection,
};