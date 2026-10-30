const assert = require('node:assert/strict');
const { test } = require('node:test');

const db = require('../config/db');
const { listKitchenOrders, updateKitchenOrderStatus } = require('../modules/kitchenOrders');

test('filters server orders to the authenticated creator identity', async () => {
  const originalExecute = db.execute;
  let executedQuery = '';
  let executedParams = [];
  db.execute = async (query, params) => {
    executedQuery = query;
    executedParams = params;
    return [[]];
  };

  try {
    const orders = await listKitchenOrders({ createdByUserId: 'server-user-1' });
    assert.deepEqual(orders, []);
    assert.match(executedQuery, /\(ko\.user_id = \? OR ko\.created_by = \?\)/);
    assert.deepEqual(executedParams, ['server-user-1', 'server-user-1']);
  } finally {
    db.execute = originalExecute;
  }
});

test('limits a server status update to its own ready orders', async () => {
  const originalExecute = db.execute;
  const statements = [];
  db.execute = async (query, params) => {
    statements.push({ query, params });
    if (query.includes('UPDATE kitchen_orders')) return [{ affectedRows: 1 }];
    return [[{
      order_id: 'KOT-001',
      status: 'Served',
      user_id: 'server-user-1',
    }]];
  };

  try {
    const order = await updateKitchenOrderStatus({
      orderId: 'KOT-001',
      status: 'Served',
      serverUserId: 'server-user-1',
    });
    assert.equal(order.status, 'Served');
    assert.match(statements[0].query, /\(user_id = \? OR created_by = \?\)/);
    assert.match(statements[0].query, /status = 'Ready to Serve'/);
    assert.deepEqual(statements[0].params, ['Served', 'KOT-001', 'server-user-1', 'server-user-1']);
  } finally {
    db.execute = originalExecute;
  }
});
