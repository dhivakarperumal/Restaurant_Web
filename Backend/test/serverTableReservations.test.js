const assert = require('node:assert/strict');
const { test } = require('node:test');

const db = require('../config/db');
const { findServerTables } = require('../modules/serverTable');
const { createKitchenOrder } = require('../modules/kitchenOrders');
const {
  createReservationRequest,
  findAvailableReservationTables,
} = require('../modules/reservations');

test('returns active reservation details and checks the current reservation interval', async () => {
  const originalExecute = db.execute;
  let executedSql = '';
  db.execute = async (sql) => {
    executedSql = sql;
    return [[{
      table_id: 'table-a2',
      table_number: 'A2',
      status: 'Available',
      next_reservation_id: 'reservation-123',
      next_reservation_date: '2026-10-30',
      next_reservation_start_time: '12:00:00',
      next_reservation_end_time: '13:00:00',
      next_reservation_status: 'Confirmed',
      next_reservation_customer_name: 'Guest',
      next_reservation_guests: 4,
      reservation_is_active: 1,
    }]];
  };

  try {
    const [table] = await findServerTables();

    assert.match(executedSql, /r\.status IN \('Pending', 'Confirmed'\)/);
    assert.match(executedSql, /r\.reservation_id AS next_reservation_id/);
    assert.match(executedSql, /r\.reservation_date = CURDATE\(\)/);
    assert.match(executedSql, /r\.start_time <= CURTIME\(\)/);
    assert.match(executedSql, /r\.end_time > CURTIME\(\)/);
    assert.equal(table.next_reservation_id, 'reservation-123');
    assert.equal(table.next_reservation_customer_name, 'Guest');
    assert.equal(table.next_reservation_guests, 4);
    assert.equal(Number(table.reservation_is_active), 1);
  } finally {
    db.execute = originalExecute;
  }
});

test('allows future reservation slots on tables reserved at another time', async () => {
  const originalExecute = db.execute;
  let executedSql = '';
  db.execute = async (sql) => {
    executedSql = sql;
    return [[]];
  };

  try {
    await findAvailableReservationTables({
      date: '2026-10-30',
      time: '12:00',
      guests: 2,
    });

    assert.match(executedSql, /LOWER\(TRIM\(st\.status\)\) IN \('available', 'reserved'\)/);
    assert.match(executedSql, /r\.status IN \('Pending', 'Confirmed'\)/);
    assert.match(executedSql, /r\.start_time < \?/);
    assert.match(executedSql, /r\.end_time > \?/);
  } finally {
    db.execute = originalExecute;
  }
});

test('creates a future reservation when the table has no overlapping booking', async () => {
  const originalGetConnection = db.getConnection;
  const statements = [];
  const connection = {
    async beginTransaction() {},
    async commit() { statements.push('commit'); },
    async rollback() { statements.push('rollback'); },
    release() {},
    async execute(sql, params = []) {
      if (sql.includes('FROM server_table WHERE table_id')) {
        return [[{
          table_id: 'table-a2',
          table_number: 'A2',
          no_of_seats: 4,
          status: 'Reserved',
        }]];
      }
      if (sql.includes('SELECT (? < CURDATE()')) {
        return [[{ is_past_date: 0, is_past_time: 0 }]];
      }
      if (sql.includes('FROM reservations') && sql.includes('SELECT reservation_id')) {
        return [[]];
      }
      if (sql.includes('INSERT INTO reservations')) {
        statements.push({ type: 'insert', params, sql });
        return [{ affectedRows: 1 }];
      }
      throw new Error(`Unexpected SQL in reservation test: ${sql}`);
    },
  };
  db.getConnection = async () => connection;

  try {
    const reservation = await createReservationRequest({
      userId: 'customer-1',
      tableId: 'table-a2',
      name: 'Guest',
      email: 'guest@example.com',
      phone: '1234567890',
      date: '2099-01-02',
      startTime: '12:00:00',
      endTime: '13:00:00',
      guests: 2,
      notes: '',
    });

    assert.equal(reservation.table_number, 'A2');
    assert.equal(reservation.status, 'Pending');
    assert.equal(statements.at(-1), 'commit');
    assert.match(statements.find((item) => item?.type === 'insert').sql, /'Pending'/);
  } finally {
    db.getConnection = originalGetConnection;
  }
});

test('rejects dine-in assignment when a reservation is active at assignment time', async () => {
  const originalGetConnection = db.getConnection;
  const statements = [];
  const connection = {
    async beginTransaction() {},
    async commit() { statements.push('commit'); },
    async rollback() { statements.push('rollback'); },
    release() {},
    async execute(sql) {
      if (sql.includes('FROM kitchen_orders WHERE user_id')) return [[]];
      if (sql.includes('SELECT employee_id FROM employees WHERE user_id')) return [[]];
      if (sql.includes('SELECT st.table_id, st.table_number, st.status')) {
        return [[{
          table_id: 'table-a2',
          table_number: 'A2',
          status: 'Available',
          reservation_is_active: 1,
        }]];
      }
      throw new Error(`Unexpected SQL in assignment test: ${sql}`);
    },
  };
  db.getConnection = async () => connection;

  try {
    await assert.rejects(
      createKitchenOrder({
        orderType: 'dine-in',
        tableId: 'table-a2',
        userId: 'admin-1',
        isAdmin: true,
        idempotencyKey: 'request-1',
        items: [],
        localMinutes: 720,
      }),
      { statusCode: 409, message: 'This table is reserved or unavailable. Choose another table.' },
    );
    assert.equal(statements.at(-1), 'rollback');
  } finally {
    db.getConnection = originalGetConnection;
  }
});
