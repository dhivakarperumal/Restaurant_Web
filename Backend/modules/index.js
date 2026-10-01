const db = require('../config/db');
const { initializeAuthSchema } = require('./auth');

module.exports = {
  db,
  initializeAuthSchema,
  testConnection: db.testConnection,
};