const express = require('express');
const {
  assignTables,
  createTable,
  deleteTable,
  getServerAssignedTables,
  getTable,
  listTables,
  unassignTable,
  updateTable,
} = require('../controllers/serverTableController');

const router = express.Router();

// Assign and unassign endpoints (placed before /:id)
router.post('/assign', assignTables);
router.post('/unassign', unassignTable);
router.get('/server/:employeeId', getServerAssignedTables);
router.put('/:id/unassign', unassignTable);

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
