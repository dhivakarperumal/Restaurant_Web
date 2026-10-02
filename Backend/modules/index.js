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
  testConnection: db.testConnection,
};