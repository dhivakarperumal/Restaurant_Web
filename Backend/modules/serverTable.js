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
    SELECT id, table_id, table_number, no_of_seats, status, created_by, updated_by, created_at, updated_at
    FROM server_table
  `;
  const conditions = [];
  const params = [];

  if (filters.status) {
    conditions.push('status = ?');
    params.push(String(filters.status).trim());
  }

  if (filters.search) {
    conditions.push('(table_number LIKE ? OR created_by LIKE ?)');
    params.push(`%${filters.search}%`, `%${filters.search}%`);
  }

  if (conditions.length > 0) {
    query += ` WHERE ${conditions.join(' AND ')}`;
  }

  query += ' ORDER BY id ASC';

  const [rows] = await db.execute(query, params);
  return rows;
}

/**
 * Finds a server table by normal id or table_id (UUID).
 */
async function findServerTableById(idOrTableId) {
  const identifier = String(idOrTableId || '').trim();
  const isNumeric = /^\d+$/.test(identifier);

  const query = isNumeric
    ? `SELECT id, table_id, table_number, no_of_seats, status, created_by, updated_by, created_at, updated_at
       FROM server_table WHERE id = ? LIMIT 1`
    : `SELECT id, table_id, table_number, no_of_seats, status, created_by, updated_by, created_at, updated_at
       FROM server_table WHERE table_id = ? LIMIT 1`;

  const [rows] = await db.execute(query, [identifier]);
  return rows[0] || null;
}

/**
 * Finds a server table by table_number.
 */
async function findServerTableByNumber(table_number) {
  const normalizedNumber = String(table_number || '').trim();
  const [rows] = await db.execute(
    `SELECT id, table_id, table_number, no_of_seats, status, created_by, updated_by, created_at, updated_at
     FROM server_table WHERE table_number = ? LIMIT 1`,
    [normalizedNumber]
  );
  return rows[0] || null;
}

/**
 * Updates a server table by normal id or table_id (UUID).
 */
async function updateServerTable(idOrTableId, { table_number, no_of_seats, status, updated_by = null }) {
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
 * Deletes a server table by normal id or table_id (UUID).
 */
async function deleteServerTable(idOrTableId) {
  const existingTable = await findServerTableById(idOrTableId);
  if (!existingTable) return null;

  await db.execute('DELETE FROM server_table WHERE id = ?', [existingTable.id]);
  return existingTable;
}

module.exports = {
  createServerTable,
  deleteServerTable,
  findServerTableById,
  findServerTableByNumber,
  findServerTables,
  initializeServerTableSchema,
  updateServerTable,
};
