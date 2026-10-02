const db = require('../config/db');
const { initializeAuthSchema } = require('./auth');
const { initializeCategorySchema } = require('./categories');
const { initializeCuisineSchema } = require('./cuisines');
const { initializeFoodSchema } = require('./foods');
const { initializeBannerSchema } = require('./banners');
const { initializeCouponSchema } = require('./coupons');

module.exports = {
  db,
  initializeAuthSchema,
  initializeCategorySchema,
  initializeCuisineSchema,
  initializeFoodSchema,
  initializeBannerSchema,
  initializeCouponSchema,
  testConnection: db.testConnection,
};