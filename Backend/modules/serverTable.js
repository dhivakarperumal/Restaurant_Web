const { randomUUID } = require('crypto');
const db = require('../config/db');

/**
 * Initializes the server_table schema in MySQL if it doesn't already exist.
 */
async function initializeServerTableSchema() {
  await db.query(`
    CREATE TABLE IF NOT EXISTS server_table (
      id INT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
      table_id VARCHAR(255) NOT NULL UNIQUE,
      table_number VARCHAR(100) NOT NULL UNIQUE,
      no_of_seats INT NOT NULL,
      status VARCHAR(50) NOT NULL DEFAULT 'Available',
      created_by VARCHAR(255) NULL,
      updated_by VARCHAR(255) NULL,
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP NULL DEFAULT NULL ON UPDATE CURRENT_TIMESTAMP,
      INDEX server_table_status_idx (status),
      INDEX server_table_number_idx (table_number)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);

  // Ensure updated_at trigger is active
  await db.query(
    'ALTER TABLE server_table MODIFY updated_at TIMESTAMP NULL DEFAULT NULL ON UPDATE CURRENT_TIMESTAMP'
  );

  // Migrate any legacy names stored in created_by or updated_by to user_id
  try {
    await db.query(`
      UPDATE server_table st
      JOIN users u ON (st.created_by = u.username OR st.created_by = u.role)
      SET st.created_by = u.user_id
      WHERE st.created_by IS NOT NULL AND st.created_by NOT LIKE '%-%'
    `);
    await db.query(`
      UPDATE server_table st
      JOIN users u ON (st.updated_by = u.username OR st.updated_by = u.role)
      SET st.updated_by = u.user_id
      WHERE st.updated_by IS NOT NULL AND st.updated_by NOT LIKE '%-%'
    `);
  } catch (error) {
    // If users table is not yet created or column is missing, skip migration
  }

  // Ensure assigned_server_id and assigned_at columns exist
  try {
    const [assignedCols] = await db.query("SHOW COLUMNS FROM server_table LIKE 'assigned_server_id'");
    if (assignedCols.length === 0) {
      await db.query("ALTER TABLE server_table ADD COLUMN assigned_server_id VARCHAR(255) NULL AFTER status");
      await db.query("ALTER TABLE server_table ADD COLUMN assigned_at TIMESTAMP NULL AFTER assigned_server_id");
      await db.query("ALTER TABLE server_table ADD INDEX server_table_assigned_server_idx (assigned_server_id)");
    }
  } catch (error) {
    console.error('Error adding assigned_server_id column:', error.message);
  }
}

/**
 * Creates a new record in server_table with an auto-generated UUID for table_id.
 */
async function createServerTable({ table_number, no_of_seats, status = 'Available', created_by = null }) {
  const tableId = randomUUID();
  const normalizedTableNumber = String(table_number || '').trim();
  const seats = Number(no_of_seats);

  const [result] = await db.execute(
    `INSERT INTO server_table (table_id, table_number, no_of_seats, status, created_by, updated_by)
     VALUES (?, ?, ?, ?, ?, NULL)`,
    [
      tableId,
      normalizedTableNumber,
      seats,
      status || 'Available',
      created_by || null,
    ]
  );

  return {
    id: result.insertId,
    table_id: tableId,
    table_number: normalizedTableNumber,
    no_of_seats: seats,
    status: status || 'Available',
    assigned_server_id: null,
    assigned_at: null,
    assigned_server_name: null,
    created_by: created_by || null,
    updated_by: null,
    created_at: new Date(),
    updated_at: null,
  };
}

/**
 * Retrieves all server tables, ordered by ID ascending.
 */
async function findServerTables(filters = {}) {
  let query = `
    SELECT 
      st.id, 
      st.table_id, 
      st.table_number, 
      st.no_of_seats, 
      st.status, 
      st.assigned_server_id, 
      st.assigned_at,
      e.full_name AS assigned_server_name,
      e.employee_type AS assigned_server_type,
      e.email AS assigned_server_email,
      e.phone_number AS assigned_server_phone,
      DATE_FORMAT(r.reservation_date, '%Y-%m-%d') AS next_reservation_date,
      r.start_time AS next_reservation_start_time,
      r.end_time AS next_reservation_end_time,
      r.guests AS next_reservation_guests,
      r.customer_name AS next_reservation_customer_name,
      r.status AS next_reservation_status,
      CASE
        WHEN r.reservation_date = CURDATE()
          AND r.start_time <= CURTIME()
          AND r.end_time > CURTIME() THEN 1
        ELSE 0
      END AS reservation_is_active,
      st.created_by, 
      st.updated_by, 
      st.created_at, 
      st.updated_at
    FROM server_table st
    LEFT JOIN employees e ON (st.assigned_server_id = e.employee_id OR st.assigned_server_id = e.user_id)
    LEFT JOIN reservations r
      ON r.table_id = st.table_id
      AND r.status IN ('Pending', 'Confirmed')
      AND (
        r.reservation_date > CURDATE()
        OR (r.reservation_date = CURDATE() AND r.end_time > CURTIME())
      )
      AND NOT EXISTS (
        SELECT 1
        FROM reservations earlier
        WHERE earlier.table_id = st.table_id
          AND earlier.status IN ('Pending', 'Confirmed')
          AND (
            earlier.reservation_date > CURDATE()
            OR (earlier.reservation_date = CURDATE() AND earlier.end_time > CURTIME())
          )
          AND (
            earlier.reservation_date < r.reservation_date
            OR (
              earlier.reservation_date = r.reservation_date
              AND (
                earlier.start_time < r.start_time
                OR (earlier.start_time = r.start_time AND earlier.id < r.id)
              )
            )
          )
      )
  `;
  const conditions = [];
  const params = [];

  if (filters.status) {
    conditions.push('st.status = ?');
    params.push(String(filters.status).trim());
  }

  if (filters.assigned_server_id) {
    conditions.push('(st.assigned_server_id = ? OR e.user_id = ? OR e.employee_id = ?)');
    params.push(String(filters.assigned_server_id).trim(), String(filters.assigned_server_id).trim(), String(filters.assigned_server_id).trim());
  }

  if (filters.assignment_status === 'assigned') {
    conditions.push('st.assigned_server_id IS NOT NULL');
  } else if (filters.assignment_status === 'unassigned') {
    conditions.push('st.assigned_server_id IS NULL');
  }

  if (filters.search) {
    conditions.push('(st.table_number LIKE ? OR st.created_by LIKE ? OR e.full_name LIKE ?)');
    params.push(`%${filters.search}%`, `%${filters.search}%`, `%${filters.search}%`);
  }

  if (conditions.length > 0) {
    query += ` WHERE ${conditions.join(' AND ')}`;
  }

  query += ' ORDER BY st.id ASC';

  const [rows] = await db.execute(query, params);
  return rows;
}

/**
 * Finds a server table by normal id or table_id (UUID).
 */
async function findServerTableById(idOrTableId) {
  const identifier = String(idOrTableId || '').trim();
  const isNumeric = /^\d+$/.test(identifier);

  const query = `
    SELECT 
      st.id, 
      st.table_id, 
      st.table_number, 
      st.no_of_seats, 
      st.status, 
      st.assigned_server_id, 
      st.assigned_at,
      e.full_name AS assigned_server_name,
      e.employee_type AS assigned_server_type,
      e.email AS assigned_server_email,
      e.phone_number AS assigned_server_phone,
      st.created_by, 
      st.updated_by, 
      st.created_at, 
      st.updated_at
    FROM server_table st
    LEFT JOIN employees e ON st.assigned_server_id = e.employee_id
    WHERE ${isNumeric ? 'st.id = ?' : 'st.table_id = ?'}
    LIMIT 1
  `;

  const [rows] = await db.execute(query, [identifier]);
  return rows[0] || null;
}

/**
 * Finds a server table by table_number.
 */
async function findServerTableByNumber(table_number) {
  const normalizedNumber = String(table_number || '').trim();
  const [rows] = await db.execute(
    `SELECT 
      st.id, 
      st.table_id, 
      st.table_number, 
      st.no_of_seats, 
      st.status, 
      st.assigned_server_id, 
      st.assigned_at,
      e.full_name AS assigned_server_name,
      e.employee_type AS assigned_server_type,
      e.email AS assigned_server_email,
      e.phone_number AS assigned_server_phone,
      st.created_by, 
      st.updated_by, 
      st.created_at, 
      st.updated_at
     FROM server_table st
     LEFT JOIN employees e ON st.assigned_server_id = e.employee_id
     WHERE st.table_number = ? LIMIT 1`,
    [normalizedNumber]
  );
  return rows[0] || null;
}

/**
 * Updates a server table by normal id or table_id (UUID).
 */
async function updateServerTable(idOrTableId, { table_number, no_of_seats, status, assigned_server_id, updated_by = null }) {
  const existingTable = await findServerTableById(idOrTableId);
  if (!existingTable) return null;

  const updates = [];
  const values = [];

  if (table_number !== undefined) {
    updates.push('table_number = ?');
    values.push(String(table_number).trim());
  }

  if (no_of_seats !== undefined) {
    updates.push('no_of_seats = ?');
    values.push(Number(no_of_seats));
  }

  if (status !== undefined) {
    updates.push('status = ?');
    values.push(String(status).trim());
  }

  if (assigned_server_id !== undefined) {
    updates.push('assigned_server_id = ?');
    values.push(assigned_server_id || null);
    if (assigned_server_id) {
      updates.push('assigned_at = CURRENT_TIMESTAMP');
    } else {
      updates.push('assigned_at = NULL');
    }
  }

  updates.push('updated_by = ?');
  values.push(updated_by || null);

  updates.push('updated_at = CURRENT_TIMESTAMP');

  values.push(existingTable.id);

  await db.execute(
    `UPDATE server_table SET ${updates.join(', ')} WHERE id = ?`,
    values
  );

  return findServerTableById(existingTable.id);
}

/**
 * Assigns multiple tables to an employee in an atomic transaction.
 * Also unassigns any tables previously assigned to this employee that are not in tableIds.
 */
async function assignTablesToEmployee({ employeeId, tableIds = [], updatedBy = null }) {
  const connection = await db.getConnection();
  try {
    await connection.beginTransaction();

    // 1. Unassign all tables currently assigned to this employee
    await connection.execute(
      `UPDATE server_table 
       SET assigned_server_id = NULL, assigned_at = NULL, updated_by = ? 
       WHERE assigned_server_id = ?`,
      [updatedBy || null, employeeId]
    );

    // 2. If tableIds is provided and non-empty, assign them to this employee
    if (Array.isArray(tableIds) && tableIds.length > 0) {
      const placeholders = tableIds.map(() => '?').join(', ');
      await connection.execute(
        `UPDATE server_table 
         SET assigned_server_id = ?, assigned_at = CURRENT_TIMESTAMP, updated_by = ? 
         WHERE table_id IN (${placeholders}) OR id IN (${placeholders})`,
        [employeeId, updatedBy || null, ...tableIds, ...tableIds]
      );
    }

    await connection.commit();
    return true;
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}

/**
 * Unassigns a single table by table ID or table_id.
 */
async function unassignTableById(idOrTableId, updatedBy = null) {
  const table = await findServerTableById(idOrTableId);
  if (!table) return null;

  await db.execute(
    `UPDATE server_table 
     SET assigned_server_id = NULL, assigned_at = NULL, updated_by = ? 
     WHERE id = ?`,
    [updatedBy || null, table.id]
  );

  return findServerTableById(table.id);
}

/**
 * Unassigns all tables for an employee.
 */
async function unassignAllTablesForEmployee(employeeId) {
  await db.execute(
    'UPDATE server_table SET assigned_server_id = NULL, assigned_at = NULL WHERE assigned_server_id = ?',
    [employeeId]
  );
}

/**
 * Deletes a server table by normal id or table_id (UUID).
 */
async function deleteServerTable(idOrTableId) {
  const existingTable = await findServerTableById(idOrTableId);
  if (!existingTable) return null;

  await db.execute('DELETE FROM server_table WHERE id = ?', [existingTable.id]);
  return existingTable;
}

module.exports = {
  assignTablesToEmployee,
  createServerTable,
  deleteServerTable,
  findServerTableById,
  findServerTableByNumber,
  findServerTables,
  initializeServerTableSchema,
  unassignAllTablesForEmployee,
  unassignTableById,
  updateServerTable,
};
