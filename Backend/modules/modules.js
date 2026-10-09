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
const { initializeReservationSchema } = require('./reservations');
const { initializeAttendanceSchema } = require('./attendance');
const { initializeExpenseSchema } = require('./expenses');
const { initializeSalarySchema } = require('./salaries');
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
  initializeReservationSchema,
  initializeAttendanceSchema,
  initializeExpenseSchema,
  initializeSalarySchema,
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