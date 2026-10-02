const db = require('../config/db');
const {
  createServerTable,
  deleteServerTable,
  findServerTableById,
  findServerTables,
  updateServerTable,
} = require('../modules/serverTable');

const getValue = (val) => String(val || '').trim();

/**
 * Resolves user_id strictly.
 * 1. If auth user is attached (req.auth?.user_id), returns that user_id.
 * 2. If a value is provided in body, checks if it's already a valid user_id or resolves username/email to user_id.
 */
async function resolveUserId(val, authUser) {
  if (authUser?.user_id) {
    return authUser.user_id;
  }
  const input = getValue(val);
  if (!input) return null;

  try {
    const [rows] = await db.execute(
      'SELECT user_id FROM users WHERE user_id = ? OR username = ? OR email = ? LIMIT 1',
      [input, input, input]
    );
    if (rows.length > 0) {
      return rows[0].user_id;
    }
  } catch (err) {
    console.error('Error resolving user_id:', err.message);
  }

  return input;
}

/**
 * Creates a new server table.
 * Expected input fields: table_number, no_of_seats, status (optional), user_id / created_by (optional)
 * created_by will store the user_id (not name).
 */
async function createTable(req, res) {
  try {
    const { table_number, no_of_seats, status } = req.body || {};
    const normalizedTableNumber = getValue(table_number);

    if (!normalizedTableNumber) {
      return res.status(400).json({
        success: false,
        message: 'Table number is required',
      });
    }

    const seatsNumber = Number(no_of_seats);
    if (!no_of_seats || Number.isNaN(seatsNumber) || seatsNumber <= 0 || !Number.isInteger(seatsNumber)) {
      return res.status(400).json({
        success: false,
        message: 'Number of seats must be a valid positive whole number',
      });
    }

    const createdBy = await resolveUserId(req.body?.user_id || req.body?.created_by, req.auth);

    const newTable = await createServerTable({
      table_number: normalizedTableNumber,
      no_of_seats: seatsNumber,
      status: getValue(status) || 'Available',
      created_by: createdBy,
    });

    return res.status(201).json({
      success: true,
      message: 'Server table created successfully',
      table: newTable,
    });
  } catch (error) {
    if (error.code === 'ER_DUP_ENTRY') {
      return res.status(409).json({
        success: false,
        message: 'A table with this table number already exists',
      });
    }
    console.error('Error creating server table:', error.message);
    return res.status(500).json({
      success: false,
      message: 'Could not create server table. Please try again.',
      error: error.message,
    });
  }
}

/**
 * Lists all server tables with optional filters.
 */
async function listTables(req, res) {
  try {
    const { status, search } = req.query || {};
    const tables = await findServerTables({ status, search });

    return res.json({
      success: true,
      count: tables.length,
      tables,
    });
  } catch (error) {
    console.error('Error listing server tables:', error.message);
    return res.status(500).json({
      success: false,
      message: 'Could not retrieve server tables',
      error: error.message,
    });
  }
}

/**
 * Gets a single server table by normal id or UUID table_id.
 */
async function getTable(req, res) {
  try {
    const { id } = req.params;
    const table = await findServerTableById(id);

    if (!table) {
      return res.status(404).json({
        success: false,
        message: 'Server table not found',
      });
    }

    return res.json({
      success: true,
      table,
    });
  } catch (error) {
    console.error('Error getting server table:', error.message);
    return res.status(500).json({
      success: false,
      message: 'Could not retrieve server table',
      error: error.message,
    });
  }
}

/**
 * Updates an existing server table.
 * updated_by will store the user_id (not name).
 */
async function updateTable(req, res) {
  try {
    const { id } = req.params;
    const { table_number, no_of_seats, status } = req.body || {};

    const existingTable = await findServerTableById(id);
    if (!existingTable) {
      return res.status(404).json({
        success: false,
        message: 'Server table not found',
      });
    }

    const payload = {};

    if (table_number !== undefined) {
      const normalizedTableNumber = getValue(table_number);
      if (!normalizedTableNumber) {
        return res.status(400).json({
          success: false,
          message: 'Table number cannot be empty',
        });
      }
      payload.table_number = normalizedTableNumber;
    }

    if (no_of_seats !== undefined) {
      const seatsNumber = Number(no_of_seats);
      if (Number.isNaN(seatsNumber) || seatsNumber <= 0 || !Number.isInteger(seatsNumber)) {
        return res.status(400).json({
          success: false,
          message: 'Number of seats must be a valid positive whole number',
        });
      }
      payload.no_of_seats = seatsNumber;
    }

    if (status !== undefined) {
      payload.status = getValue(status) || existingTable.status;
    }

    payload.updated_by = await resolveUserId(req.body?.user_id || req.body?.updated_by, req.auth);

    const updatedTable = await updateServerTable(id, payload);

    return res.json({
      success: true,
      message: 'Server table updated successfully',
      table: updatedTable,
    });
  } catch (error) {
    if (error.code === 'ER_DUP_ENTRY') {
      return res.status(409).json({
        success: false,
        message: 'A table with this table number already exists',
      });
    }
    console.error('Error updating server table:', error.message);
    return res.status(500).json({
      success: false,
      message: 'Could not update server table',
      error: error.message,
    });
  }
}

/**
 * Deletes a server table by normal id or UUID table_id.
 */
async function deleteTable(req, res) {
  try {
    const { id } = req.params;
    const deleted = await deleteServerTable(id);

    if (!deleted) {
      return res.status(404).json({
        success: false,
        message: 'Server table not found',
      });
    }

    return res.json({
      success: true,
      message: 'Server table deleted successfully',
      table: deleted,
    });
  } catch (error) {
    console.error('Error deleting server table:', error.message);
    return res.status(500).json({
      success: false,
      message: 'Could not delete server table',
      error: error.message,
    });
  }
}

module.exports = {
  createTable,
  deleteTable,
  getTable,
  listTables,
  updateTable,
};
