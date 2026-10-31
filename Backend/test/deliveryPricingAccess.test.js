const assert = require('node:assert/strict');
const { once } = require('node:events');
const express = require('express');
const { test } = require('node:test');

const auth = require('../modules/auth');
const db = require('../config/db');

test('allows delivery partners to read pricing but not change settings', async () => {
  const originalFindUserByToken = auth.findUserByToken;
  const originalExecute = db.execute;
  const deliverySettings = {
    base_charge: '10',
    free_minimum: '500',
    per_km_charge: '10',
    max_distance: '15',
  };

  auth.findUserByToken = async (token) => {
    if (token === 'delivery-token') {
      return { role: 'delivery', employee_id: 'delivery-partner-1' };
    }
    if (token === 'admin-token') return { role: 'admin' };
    return null;
  };
  db.execute = async (query) => {
    assert.match(query, /SELECT setting_value FROM app_settings/);
    return [[{ setting_value: JSON.stringify(deliverySettings) }]];
  };

  const app = express();
  app.use(express.json());
  app.use('/api', require('../routers/routes'));
  const server = app.listen(0, '127.0.0.1');

  try {
    await once(server, 'listening');
    const baseUrl = `http://127.0.0.1:${server.address().port}/api/settings/delivery`;
    const pricingResponse = await fetch(baseUrl, {
      headers: { Authorization: 'Bearer delivery-token' },
    });
    assert.equal(pricingResponse.status, 200);
    assert.deepEqual((await pricingResponse.json()).data, deliverySettings);

    const updateResponse = await fetch(baseUrl, {
      method: 'POST',
      headers: {
        Authorization: 'Bearer delivery-token',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ base_charge: 20 }),
    });
    assert.equal(updateResponse.status, 403);

    const adminResponse = await fetch(baseUrl, {
      headers: { Authorization: 'Bearer admin-token' },
    });
    assert.equal(adminResponse.status, 200);

    const unauthenticatedResponse = await fetch(baseUrl);
    assert.equal(unauthenticatedResponse.status, 401);
  } finally {
    await new Promise((resolve, reject) => {
      server.close((error) => (error ? reject(error) : resolve()));
    });
    auth.findUserByToken = originalFindUserByToken;
    db.execute = originalExecute;
  }
});
