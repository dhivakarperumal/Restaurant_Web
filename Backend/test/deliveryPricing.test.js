const assert = require('node:assert/strict');
const { test } = require('node:test');

const {
  calculateDeliveryQuoteFromSettings,
  distanceInKilometres,
} = require('../utils/deliveryPricing');

const coordinatesAtDistance = (metres) => ({
  latitude: (metres / 6371000) * (180 / Math.PI),
  longitude: 0,
});

const quoteForDistance = (metres) => calculateDeliveryQuoteFromSettings({
  location: coordinatesAtDistance(metres),
  subtotal: 100,
  storeSettings: { latitude: 0, longitude: 0 },
  deliverySettings: {
    base_charge: 0,
    free_minimum: 500,
    per_km_charge: '10',
    max_distance: 15,
  },
});

test('charges per kilometre proportionally for a distance measured in metres', () => {
  const quote = quoteForDistance(12);

  assert.equal(quote.deliveryCharge, 0.12);
  assert.equal(quote.distanceKm, 0.01);
});

test('charges the full per-kilometre rate for a one-kilometre distance', () => {
  const quote = quoteForDistance(1000);

  assert.equal(quote.deliveryCharge, 10);
  assert.equal(quote.distanceKm, 1);
});

test('reports coordinate distances in kilometres', () => {
  const distanceKm = distanceInKilometres(
    { latitude: 0, longitude: 0 },
    coordinatesAtDistance(12000),
  );

  assert.ok(Math.abs(distanceKm - 12) < 1e-9);
});
