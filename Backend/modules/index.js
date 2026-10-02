const db = require('../config/db');
const { initializeAuthSchema } = require('./auth');
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