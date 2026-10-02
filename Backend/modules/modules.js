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
  initializeBannerSchema,
  initializeCouponSchema,
  initializeReviewSchema,
  initializeVideoSchema,
  initializeEmployeeSchema,
  initializeServerTableSchema,
  createServerTable,
  findServerTables,
  findServerTableById,
  findServerTableByNumber,
  updateServerTable,
  deleteServerTable,
  testConnection: db.testConnection,
};