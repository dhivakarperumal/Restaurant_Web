const { randomUUID } = require('crypto');
const db = require('../config/db');

async function initializeReservationSchema() {
  await db.query(`
    CREATE TABLE IF NOT EXISTS reservations (
      id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
      reservation_id CHAR(36) NOT NULL UNIQUE,
      user_id VARCHAR(255) NOT NULL,
      table_id VARCHAR(255) NOT NULL,
      table_number VARCHAR(100) NOT NULL,
      customer_name VARCHAR(150) NOT NULL,
      customer_email VARCHAR(255) NOT NULL,
      customer_phone VARCHAR(32) NOT NULL,
      reservation_date DATE NOT NULL,
      start_time TIME NOT NULL,
      end_time TIME NOT NULL,
      guests INT NOT NULL,
      notes VARCHAR(1000) NULL,
      status VARCHAR(24) NOT NULL DEFAULT 'Pending',
      created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      INDEX reservations_table_slot_idx (table_id, reservation_date, status, start_time, end_time),
      INDEX reservations_user_created_idx (user_id, created_at),
      INDEX reservations_status_date_idx (status, reservation_date)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);
}

async function findAvailableReservationTables({ date, time, guests }) {
  const params = [];
  let availabilityCondition = '';

  if (date && time && guests) {
    const [hour, minute] = time.split(':').map(Number);
    const endTime = `${String(hour + 1).padStart(2, '0')}:${String(minute).padStart(2, '0')}:00`;
    const startTime = `${time}:00`;
    availabilityCondition = `
      AND NOT EXISTS (
        SELECT 1 FROM reservations r
        WHERE r.table_id = st.table_id
          AND r.reservation_date = ?
          AND r.status IN ('Pending', 'Confirmed')
          AND r.start_time < ?
          AND r.end_time > ?
      )
    `;
    params.push(date, endTime, startTime);
  }

  const [rows] = await db.execute(
    `SELECT st.table_id, st.table_number, st.no_of_seats, st.image_url
     FROM server_table st
     WHERE LOWER(TRIM(st.status)) = 'available'
       ${guests ? 'AND st.no_of_seats >= ?' : ''}
       ${availabilityCondition}
     ORDER BY st.id ASC`,
    [...(guests ? [guests] : []), ...params]
  );
  return rows;
}

async function createReservationRequest(input) {
  const connection = await db.getConnection();
  try {
    await connection.beginTransaction();

    const [tableRows] = await connection.execute(
      `SELECT id, table_id, table_number, no_of_seats, status
       FROM server_table WHERE table_id = ? FOR UPDATE`,
      [input.tableId]
    );
    const table = tableRows[0];
    if (!table || String(table.status).trim().toLowerCase() !== 'available') {
      const error = new Error('This table is no longer available.');
      error.statusCode = 409;
      throw error;
    }
    if (Number(table.no_of_seats) < input.guests) {
      const error = new Error('This table does not have enough seats for your group.');
      error.statusCode = 400;
      throw error;
    }

    const [dateRows] = await connection.execute(
      `SELECT (? < CURDATE()) AS is_past_date,
              (? = CURDATE() AND ? <= CURTIME()) AS is_past_time`,
      [input.date, input.date, input.startTime]
    );
    if (dateRows[0].is_past_date || dateRows[0].is_past_time) {
      const error = new Error('Choose a future reservation date and time.');
      error.statusCode = 400;
      throw error;
    }

    const [conflicts] = await connection.execute(
      `SELECT reservation_id FROM reservations
       WHERE table_id = ? AND reservation_date = ?
         AND status IN ('Pending', 'Confirmed')
         AND start_time < ? AND end_time > ?
       LIMIT 1`,
      [table.table_id, input.date, input.endTime, input.startTime]
    );
    if (conflicts.length > 0) {
      const error = new Error('That table has just been requested for this time. Please choose another table or time.');
      error.statusCode = 409;
      throw error;
    }

    const reservationId = randomUUID();
    await connection.execute(
      `INSERT INTO reservations
        (reservation_id, user_id, table_id, table_number, customer_name, customer_email,
         customer_phone, reservation_date, start_time, end_time, guests, notes, status)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'Pending')`,
      [
        reservationId,
        input.userId,
        table.table_id,
        table.table_number,
        input.name,
        input.email,
        input.phone,
        input.date,
        input.startTime,
        input.endTime,
        input.guests,
        input.notes || null,
      ]
    );

    await connection.commit();
    return {
      reservation_id: reservationId,
      table_id: table.table_id,
      table_number: table.table_number,
      reservation_date: input.date,
      start_time: input.startTime,
      end_time: input.endTime,
      guests: input.guests,
      status: 'Pending',
    };
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}

async function findReservationsForUser(userId) {
  const [rows] = await db.execute(
    `SELECT r.reservation_id, r.table_number, st.image_url, r.customer_name, r.customer_email, r.customer_phone,
            DATE_FORMAT(r.reservation_date, '%Y-%m-%d') AS reservation_date,
            r.start_time, r.end_time, r.guests, r.notes, r.status, r.created_at
     FROM reservations r
     LEFT JOIN server_table st ON st.table_id = r.table_id
     WHERE r.user_id = ?
     ORDER BY r.reservation_date DESC, r.start_time DESC, r.created_at DESC`,
    [userId]
  );
  return rows;
}

async function findAllReservations(status) {
  const params = [];
  let condition = '';
  if (status && status !== 'All') {
    condition = 'WHERE r.status = ?';
    params.push(status);
  }
  const [rows] = await db.execute(
    `SELECT r.reservation_id, r.user_id, r.table_id, r.table_number,
            r.customer_name, r.customer_email, r.customer_phone,
            DATE_FORMAT(r.reservation_date, '%Y-%m-%d') AS reservation_date,
            r.start_time, r.end_time, r.guests, r.notes,
            r.status, r.created_at
     FROM reservations r
     ${condition}
     ORDER BY FIELD(r.status, 'Pending', 'Confirmed', 'Declined', 'Cancelled'),
              r.reservation_date ASC, r.start_time ASC`,
    params
  );
  return rows;
}

async function updateReservationStatus(reservationId, status) {
  const connection = await db.getConnection();
  try {
    await connection.beginTransaction();
    const [reservationRows] = await connection.execute(
      `SELECT reservation_id, user_id, table_id, table_number,
              DATE_FORMAT(reservation_date, '%Y-%m-%d') AS reservation_date,
              start_time, end_time, status
       FROM reservations WHERE reservation_id = ? FOR UPDATE`,
      [reservationId]
    );
    const reservation = reservationRows[0];
    if (!reservation) {
      const error = new Error('Reservation not found.');
      error.statusCode = 404;
      throw error;
    }

    if (status === 'Confirmed') {
      const [tableRows] = await connection.execute(
        'SELECT table_id FROM server_table WHERE table_id = ? FOR UPDATE',
        [reservation.table_id]
      );
      if (!tableRows.length) {
        const error = new Error('The reserved table no longer exists.');
        error.statusCode = 409;
        throw error;
      }
      const [conflicts] = await connection.execute(
        `SELECT reservation_id FROM reservations
         WHERE table_id = ? AND reservation_date = ?
           AND status IN ('Pending', 'Confirmed')
           AND reservation_id <> ? AND start_time < ? AND end_time > ?
         LIMIT 1`,
        [
          reservation.table_id,
          reservation.reservation_date,
          reservation.reservation_id,
          reservation.end_time,
          reservation.start_time,
        ]
      );
      if (conflicts.length) {
        const error = new Error('Another pending or confirmed request already uses this table and time.');
        error.statusCode = 409;
        throw error;
      }
    }

    await connection.execute(
      'UPDATE reservations SET status = ? WHERE reservation_id = ?',
      [status, reservationId]
    );
    await connection.commit();
    return { ...reservation, status };
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}

module.exports = {
  createReservationRequest,
  findAllReservations,
  findAvailableReservationTables,
  findReservationsForUser,
  initializeReservationSchema,
  updateReservationStatus,
};
