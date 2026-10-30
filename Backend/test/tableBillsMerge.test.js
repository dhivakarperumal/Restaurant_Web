const assert = require('node:assert/strict');
const { test } = require('node:test');

const db = require('../config/db');
const { listTableBills, mergeActiveTableBills } = require('../modules/tableBills');

function createMergeDatabase({ sourcePaymentMethod = null } = {}) {
  const tables = [
    { table_id: 'table-a1', table_number: 'A1', status: 'Occupied', assigned_server_id: 'server-1', reservation_is_active: 0 },
    { table_id: 'table-a2', table_number: 'A2', status: 'Occupied', assigned_server_id: 'server-1', reservation_is_active: 0 },
  ];
  const bills = [
    { bill_id: 'bill-a1', bill_number: 'BILL-001', table_id: 'table-a1', table_number: 'A1', status: 'Active', server_id: 'server-1', server_name: 'Sam', tax_rate: 5, discount: 1, payment_method: null, settled_at: null, merged_table_numbers: null },
    { bill_id: 'bill-a2', bill_number: 'BILL-002', table_id: 'table-a2', table_number: 'A2', status: 'Active', server_id: 'server-1', server_name: 'Sam', tax_rate: 5, discount: 2, payment_method: sourcePaymentMethod, settled_at: null, merged_table_numbers: null },
  ];
  const operations = [];
  const connection = {
    async beginTransaction() {},
    async commit() { operations.push({ type: 'commit' }); },
    async rollback() { operations.push({ type: 'rollback' }); },
    release() {},
    async execute(sql, params = []) {
      if (sql.includes('FROM server_table st')) {
        return [tables.filter((table) => params.includes(table.table_id))];
      }
      if (sql.includes('FROM table_bills') && sql.includes("status = 'Active'")) {
        return [bills.filter((bill) => params.includes(bill.table_id) && bill.status === 'Active')];
      }
      if (sql.includes('UPDATE kitchen_orders SET bill_id')) {
        operations.push({ type: 'transfer-orders', billId: params[0], sourceBillId: params[1] });
        return [{ affectedRows: 1 }];
      }
      if (sql.includes("SET status = 'Merged'")) {
        const source = bills.find((bill) => bill.bill_id === params[1]);
        source.status = 'Merged';
        source.merged_into_bill_id = params[0];
        operations.push({ type: 'merge-source-bill', billId: source.bill_id });
        return [{ affectedRows: 1 }];
      }
      if (sql.includes('UPDATE server_table SET status')) {
        const table = tables.find((row) => row.table_id === params[0]);
        table.status = sql.includes("'Available'") ? 'Available' : 'Occupied';
        return [{ affectedRows: 1 }];
      }
      if (sql.includes('SET merged_table_numbers = ?')) {
        const primary = bills.find((bill) => bill.bill_id === params[2]);
        primary.merged_table_numbers = params[0];
        primary.discount = params[1];
        return [{ affectedRows: 1 }];
      }
      if (sql.includes('SELECT COALESCE(SUM(koi.quantity')) {
        return [[{ subtotal: 30 }]];
      }
      if (sql.includes('SELECT discount, tax_rate FROM table_bills')) {
        const primary = bills.find((bill) => bill.bill_id === params[0]);
        return [[{ discount: primary.discount, tax_rate: primary.tax_rate }]];
      }
      if (sql.includes('SET subtotal = ?, tax_rate = ?, tax_amount = ?, grand_total = ?')) {
        const primary = bills.find((bill) => bill.bill_id === params[4]);
        [primary.subtotal, primary.tax_rate, primary.tax_amount, primary.grand_total] = params;
        return [{ affectedRows: 1 }];
      }
      throw new Error(`Unexpected SQL in merge test: ${sql}`);
    },
  };
  return { bills, tables, operations, connection };
}

test('merges active bills transactionally and preserves matching item variants', async () => {
  const mock = createMergeDatabase();
  const originalGetConnection = db.getConnection;
  const originalExecute = db.execute;
  db.getConnection = async () => mock.connection;
  db.execute = async (sql, params = []) => {
    if (sql.includes('SELECT * FROM table_bills WHERE bill_id')) {
      return [[mock.bills.find((bill) => bill.bill_id === params[0])]];
    }
    if (sql.includes('FROM kitchen_orders') && sql.includes('WHERE bill_id')) {
      return [[
        { order_id: 'KOT001', bill_id: 'bill-a1', round_number: 1, status: 'Served', created_at: new Date() },
        { order_id: 'KOT002', bill_id: 'bill-a1', round_number: 1, status: 'Served', created_at: new Date() },
      ]];
    }
    if (sql.includes('FROM kitchen_order_items koi')) {
      return [[
        { id: 1, order_id: 'KOT001', food_id: 'FOOD1', food_name: 'Noodles', quantity: 1, unit_price: 10, selected_addons: '[]', selected_customizations: '{}' },
        { id: 2, order_id: 'KOT002', food_id: 'FOOD1', food_name: 'Noodles', quantity: 2, unit_price: 10, selected_addons: '[]', selected_customizations: '{}' },
      ]];
    }
    throw new Error(`Unexpected detail SQL in merge test: ${sql}`);
  };

  try {
    const bill = await mergeActiveTableBills({
      primaryTableId: 'table-a1',
      mergeTableIds: ['table-a2'],
      allowedServerIds: ['server-1'],
    });

    assert.equal(bill.bill_id, 'bill-a1');
    assert.deepEqual(bill.merged_table_numbers, ['A1', 'A2']);
    assert.equal(bill.discount, 3);
    assert.equal(bill.subtotal, 30);
    assert.equal(bill.tax_amount, 1.5);
    assert.equal(bill.grand_total, 28.5);
    assert.equal(bill.consolidated_items[0].quantity, 3);
    assert.equal(bill.consolidated_items[0].total_price, 30);
    assert.equal(mock.bills[1].status, 'Merged');
    assert.equal(mock.bills[1].merged_into_bill_id, 'bill-a1');
    assert.equal(mock.tables[0].status, 'Occupied');
    assert.equal(mock.tables[1].status, 'Available');
    assert.equal(mock.operations.at(-1).type, 'commit');
  } finally {
    db.getConnection = originalGetConnection;
    db.execute = originalExecute;
  }
});

test('rejects merging bills with recorded payments and rolls back', async () => {
  const mock = createMergeDatabase({ sourcePaymentMethod: 'Cash' });
  const originalGetConnection = db.getConnection;
  db.getConnection = async () => mock.connection;

  try {
    await assert.rejects(
      mergeActiveTableBills({
        primaryTableId: 'table-a1',
        mergeTableIds: ['table-a2'],
        allowedServerIds: ['server-1'],
      }),
      { statusCode: 409, message: 'Bills with recorded payment information cannot be merged.' },
    );
    assert.equal(mock.operations.at(-1).type, 'rollback');
  } finally {
    db.getConnection = originalGetConnection;
  }
});

test('rejects self-merges before opening a database transaction', async () => {
  const originalGetConnection = db.getConnection;
  db.getConnection = async () => {
    throw new Error('Invalid merge must not open a database connection.');
  };

  try {
    await assert.rejects(
      mergeActiveTableBills({ primaryTableId: 'table-a1', mergeTableIds: ['table-a1'] }),
      { statusCode: 400 },
    );
  } finally {
    db.getConnection = originalGetConnection;
  }
});

test('prevents a server from merging tables assigned to another server', async () => {
  const mock = createMergeDatabase();
  const originalGetConnection = db.getConnection;
  db.getConnection = async () => mock.connection;

  try {
    await assert.rejects(
      mergeActiveTableBills({
        primaryTableId: 'table-a1',
        mergeTableIds: ['table-a2'],
        allowedServerIds: ['server-2'],
      }),
      { statusCode: 403 },
    );
    assert.equal(mock.operations.at(-1).type, 'rollback');
  } finally {
    db.getConnection = originalGetConnection;
  }
});

test('returns merged table numbers as an array in the active bill list', async () => {
  const originalExecute = db.execute;
  db.execute = async () => [[
    {
      bill_id: 'bill-a1',
      merged_table_numbers: '["A1","A2"]',
      subtotal: '30.00',
      tax_rate: '5.00',
      tax_amount: '1.50',
      discount: '0.00',
      grand_total: '31.50',
    },
  ]];

  try {
    const [bill] = await listTableBills({ status: 'Active' });
    assert.deepEqual(bill.merged_table_numbers, ['A1', 'A2']);
  } finally {
    db.execute = originalExecute;
  }
});
