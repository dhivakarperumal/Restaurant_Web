const express = require('express');
const {
  createTable,
  deleteTable,
  getTable,
  listTables,
  updateTable,
} = require('../controllers/serverTableController');

const router = express.Router();

// GET all tables or POST a new table
router.route('/')
  .get(listTables)
  .post(createTable);

// GET, PUT (update), DELETE table by ID or table_id
router.route('/:id')
  .get(getTable)
  .put(updateTable)
  .delete(deleteTable);

module.exports = router;
