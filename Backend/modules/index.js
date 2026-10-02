const db = require('../config/db');
const { initializeAuthSchema } = require('./auth');
const { initializeEmployeeSchema } = require('./employees');

module.exports = {
  db,
  initializeAuthSchema,
  initializeEmployeeSchema,
  testConnection: db.testConnection,
};