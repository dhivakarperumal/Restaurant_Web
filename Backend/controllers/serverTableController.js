const db = require('../config/db');
const {
  assignTablesToEmployee,
  createServerTable,
  deleteServerTable,
  findServerTableById,
  findServerTables,
  unassignTableById,
  updateServerTable,
} = require('../modules/serverTable');
const { findEmployeeById } = require('../modules/employees');

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
 * Expected input fields: table_number, no_of_seats, image_url (optional), status (optional), user_id / created_by (optional)
 * created_by will store the user_id (not name).
 */
async function createTable(req, res) {
  try {
    const { table_number, no_of_seats, status, image_url } = req.body || {};
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
      image_url: image_url || null,
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
    const { table_number, no_of_seats, status, image_url } = req.body || {};

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

    if (image_url !== undefined) {
      payload.image_url = getValue(image_url) || null;
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

/**
 * Validates capacity limits for assigned tables:
 * - If 2 seats: maximum 3 tables
 * - If 4 seats: maximum 2 tables
 * - If 6 or 8 seats: maximum 1 table only
 * - Workload budget: 6 points maximum
 *   - 2 seats (<= 2): 2 pts each (max 3)
 *   - 4 seats (3-4): 3 pts each (max 2)
 *   - 6 or 8 seats (>= 5): 6 pts each (max 1)
 */
function validateTableCapacity(tables) {
  if (!tables || tables.length === 0) {
    return {
      valid: true,
      pointsUsed: 0,
      totalTables: 0,
      breakdown: { count2Seats: 0, count4Seats: 0, countLargeSeats: 0 },
    };
  }

  let count2Seats = 0;
  let count4Seats = 0;
  let countLargeSeats = 0;
  let pointsUsed = 0;

  for (const table of tables) {
    const seats = Number(table.no_of_seats || 0);
    if (seats <= 2) {
      count2Seats += 1;
      pointsUsed += 2;
    } else if (seats <= 4) {
      count4Seats += 1;
      pointsUsed += 3;
    } else {
      countLargeSeats += 1;
      pointsUsed += 6;
    }
  }

  // Large tables (6 or 8 seats) rule: strictly 1 table only
  if (countLargeSeats > 0) {
    if (tables.length > 1) {
      return {
        valid: false,
        message: 'A server can only be assigned 1 table when it has 6 or 8 seats. No other tables can be combined with it.',
        pointsUsed,
        totalTables: tables.length,
        breakdown: { count2Seats, count4Seats, countLargeSeats },
      };
    }
  }

  // 4-seat tables rule: maximum 2 tables
  if (count4Seats > 2) {
    return {
      valid: false,
      message: 'A server can be assigned a maximum of 2 tables with 4 seats.',
      pointsUsed,
      totalTables: tables.length,
      breakdown: { count2Seats, count4Seats, countLargeSeats },
    };
  }

  // 2-seat tables rule: maximum 3 tables
  if (count2Seats > 3) {
    return {
      valid: false,
      message: 'A server can be assigned a maximum of 3 tables with 2 seats.',
      pointsUsed,
      totalTables: tables.length,
      breakdown: { count2Seats, count4Seats, countLargeSeats },
    };
  }

  // Workload budget: maximum 6 points
  if (pointsUsed > 6) {
    return {
      valid: false,
      message: `Capacity limit exceeded: This combination requires ${pointsUsed} workload points, but maximum capacity is 6 points (e.g. 3 of 2-seats, 2 of 4-seats, or 1 of 6/8-seats).`,
      pointsUsed,
      totalTables: tables.length,
      breakdown: { count2Seats, count4Seats, countLargeSeats },
    };
  }

  return {
    valid: true,
    pointsUsed,
    totalTables: tables.length,
    breakdown: { count2Seats, count4Seats, countLargeSeats },
  };
}

/**
 * Assigns a set of tables to a server employee.
 * Body: { employee_id, table_ids, user_id }
 */
async function assignTables(req, res) {
  try {
    const employeeId = getValue(req.body?.employee_id);
    const tableIds = Array.isArray(req.body?.table_ids)
      ? req.body.table_ids.map((id) => getValue(id)).filter(Boolean)
      : [];

    if (!employeeId) {
      return res.status(400).json({
        success: false,
        message: 'Employee ID is required',
      });
    }

    // 1. Verify employee exists and is a Server
    const employee = await findEmployeeById(employeeId);
    if (!employee) {
      return res.status(404).json({
        success: false,
        message: 'Employee record not found',
      });
    }

    if (employee.employee_type !== 'Server') {
      return res.status(400).json({
        success: false,
        message: 'Tables can only be assigned to employees with the "Server" role',
      });
    }

    // 2. Fetch the requested tables
    const requestedTables = [];
    for (const tableId of tableIds) {
      const table = await findServerTableById(tableId);
      if (!table) {
        return res.status(404).json({
          success: false,
          message: `Table not found for ID "${tableId}"`,
        });
      }
      requestedTables.push(table);
    }

    // 3. Exclusivity Check: Ensure none of the tables are assigned to another server
    for (const table of requestedTables) {
      if (table.assigned_server_id && table.assigned_server_id !== employeeId) {
        return res.status(409).json({
          success: false,
          message: `Table "${table.table_number}" is already assigned to ${table.assigned_server_name || table.assigned_server_id}. Already assigned tables cannot be assigned to another server.`,
        });
      }
    }

    // 4. Capacity Limit Check
    const capacityValidation = validateTableCapacity(requestedTables);
    if (!capacityValidation.valid) {
      return res.status(400).json({
        success: false,
        message: capacityValidation.message,
      });
    }

    // 5. Perform assignment in atomic transaction
    const updatedBy = await resolveUserId(req.body?.user_id || req.body?.updated_by, req.auth);
    await assignTablesToEmployee({
      employeeId,
      tableIds,
      updatedBy,
    });

    // 6. Fetch updated tables for this server
    const serverTables = await findServerTables({ assigned_server_id: employeeId });

    return res.json({
      success: true,
      message: `Successfully assigned ${serverTables.length} table(s) to ${employee.full_name}`,
      server: {
        employee_id: employee.employee_id,
        full_name: employee.full_name,
      },
      tables: serverTables,
      capacity: capacityValidation,
    });
  } catch (error) {
    console.error('Error assigning tables:', error.message);
    return res.status(500).json({
      success: false,
      message: 'Failed to assign tables. Please try again.',
      error: error.message,
    });
  }
}

/**
 * Unassigns a table from its server.
 * Param: :id or Body: { table_id }
 */
async function unassignTable(req, res) {
  try {
    const tableIdentifier = getValue(req.params?.id || req.body?.table_id);
    if (!tableIdentifier) {
      return res.status(400).json({
        success: false,
        message: 'Table identifier is required',
      });
    }

    const table = await findServerTableById(tableIdentifier);
    if (!table) {
      return res.status(404).json({
        success: false,
        message: 'Server table not found',
      });
    }

    const updatedBy = await resolveUserId(req.body?.user_id || req.body?.updated_by, req.auth);
    const updatedTable = await unassignTableById(table.id, updatedBy);

    return res.json({
      success: true,
      message: `Table "${table.table_number}" unassigned successfully`,
      table: updatedTable,
    });
  } catch (error) {
    console.error('Error unassigning table:', error.message);
    return res.status(500).json({
      success: false,
      message: 'Failed to unassign table',
      error: error.message,
    });
  }
}

/**
 * Retrieves all tables assigned to a specific server with capacity breakdown.
 * Param: :employeeId
 */
async function getServerAssignedTables(req, res) {
  try {
    const employeeId = getValue(req.params?.employeeId);
    if (!employeeId) {
      return res.status(400).json({
        success: false,
        message: 'Employee ID is required',
      });
    }

    const employee = await findEmployeeById(employeeId);
    if (!employee) {
      return res.status(404).json({
        success: false,
        message: 'Server employee not found',
      });
    }

    const tables = await findServerTables({ assigned_server_id: employeeId });
    const capacityInfo = validateTableCapacity(tables);

    return res.json({
      success: true,
      server: {
        employee_id: employee.employee_id,
        full_name: employee.full_name,
        email: employee.email,
        phone_number: employee.phone_number,
      },
      tables,
      capacity: capacityInfo,
    });
  } catch (error) {
    console.error('Error getting server assigned tables:', error.message);
    return res.status(500).json({
      success: false,
      message: 'Could not retrieve server assigned tables',
      error: error.message,
    });
  }
}

module.exports = {
  assignTables,
  createTable,
  deleteTable,
  getServerAssignedTables,
  getTable,
  listTables,
  unassignTable,
  updateTable,
  validateTableCapacity,
};
