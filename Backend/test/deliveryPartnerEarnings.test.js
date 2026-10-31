const assert = require('node:assert/strict');
const { test } = require('node:test');

const db = require('../config/db');
const { getDeliveryPartnerEarnings } = require('../controllers/customerOrderController');

test('returns completed order delivery charges and distances for partner earnings', async () => {
  const originalExecute = db.execute;
  const statements = [];
  db.execute = async (query, params) => {
    statements.push({ query, params });
    if (query.includes('COUNT(*) AS completed_deliveries')) {
      return [[{
        completed_deliveries: 1,
        total_earnings: '50.06',
        today_earnings: '50.06',
        week_earnings: '50.06',
        month_earnings: '50.06',
        cash_collected: '117.54',
      }]];
    }
    return [[{
      order_id: 'ORD024',
      customer_name: 'Customer',
      date: '2026-10-31T12:00:00.000Z',
      order_status: 'delivered',
      subtotal: '67.50',
      delivery_charge: '50.06',
      distance_km: '0.01',
      total_earnings: '50.06',
      order_total: '117.54',
      payment_method: 'cod',
      payment_status: 'pending',
    }]];
  };

  try {
    const response = {
      statusCode: 200,
      status(code) {
        this.statusCode = code;
        return this;
      },
      json(body) {
        this.body = body;
        return this;
      },
    };

    await getDeliveryPartnerEarnings({
      auth: { employee_id: 'delivery-partner-1' },
      query: { range: 'custom', from: '2026-10-31', to: '2026-10-31' },
    }, response);

    assert.equal(response.statusCode, 200);
    assert.equal(response.body.data.summary.total_earnings, '50.06');
    assert.deepEqual(response.body.data.entries[0], {
      order_id: 'ORD024',
      customer_name: 'Customer',
      date: '2026-10-31T12:00:00.000Z',
      order_status: 'delivered',
      subtotal: '67.50',
      delivery_charge: '50.06',
      distance_km: '0.01',
      total_earnings: '50.06',
      order_total: '117.54',
      payment_method: 'cod',
      payment_status: 'pending',
    });
    assert.equal(statements.length, 2);
    for (const { query, params } of statements) {
      assert.match(query, /assigned_delivery_partner_id = \?/);
      assert.match(query, /order_status IN \('delivered', 'completed'\)/);
      assert.match(query, /updated_at >= \? AND updated_at < \?/);
      assert.deepEqual(params, ['delivery-partner-1', '2026-10-31', '2026-11-01']);
    }
    assert.match(statements[0].query, /SUM\(delivery_charge\).*AS total_earnings/);
    assert.match(statements[1].query, /delivery_distance_km AS distance_km/);
    assert.match(statements[1].query, /order_status, subtotal/);
    assert.match(statements[1].query, /total_amount AS order_total/);
  } finally {
    db.execute = originalExecute;
  }
});
