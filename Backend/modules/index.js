const db = require('../config/db');
const { initializeAuthSchema } = require('./auth');
const { initializeCategorySchema } = require('./categories');
const { initializeCuisineSchema } = require('./cuisines');
const { initializeFoodSchema } = require('./foods');

module.exports = {
  db,
  initializeAuthSchema,
  initializeCategorySchema,
  initializeCuisineSchema,
  initializeFoodSchema,
  testConnection: db.testConnection,
};