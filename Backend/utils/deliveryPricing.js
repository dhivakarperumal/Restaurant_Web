const { getSettings } = require('../modules/settings');

const DEFAULT_DELIVERY_SETTINGS = {
  base_charge: 50,
  free_minimum: 500,
  per_km_charge: 10,
  max_distance: 15,
};

const createDeliveryError = (message, statusCode) => {
  const error = new Error(message);
  error.statusCode = statusCode;
  return error;
};

const readNonNegativeSetting = (settings, key, label) => {
  const value = settings[key] ?? DEFAULT_DELIVERY_SETTINGS[key];
  const number = Number(value);
  if (value === '' || !Number.isFinite(number) || number < 0) {
    throw createDeliveryError(`The configured ${label} is invalid. Please contact the restaurant.`, 503);
  }
  return number;
};

const readCoordinates = (location, label, statusCode = 400) => {
  const hasLatitude = location?.latitude !== null
    && location?.latitude !== undefined
    && String(location.latitude).trim() !== '';
  const hasLongitude = location?.longitude !== null
    && location?.longitude !== undefined
    && String(location.longitude).trim() !== '';
  const latitude = Number(location?.latitude);
  const longitude = Number(location?.longitude);
  if (!hasLatitude || !hasLongitude || !Number.isFinite(latitude) || latitude < -90 || latitude > 90
    || !Number.isFinite(longitude) || longitude < -180 || longitude > 180) {
    const guidance = label === 'Restaurant location'
      ? ' Set restaurant latitude and longitude under Admin Settings > Restaurant Profile.'
      : '';
    throw createDeliveryError(`${label} coordinates are missing or invalid.${guidance}`, statusCode);
  }
  return { latitude, longitude };
};

const distanceInMetres = (origin, destination) => {
  const radians = (degrees) => (degrees * Math.PI) / 180;
  const latitudeDifference = radians(destination.latitude - origin.latitude);
  const longitudeDifference = radians(destination.longitude - origin.longitude);
  const haversine = Math.min(1, Math.sin(latitudeDifference / 2) ** 2
    + Math.cos(radians(origin.latitude))
      * Math.cos(radians(destination.latitude))
      * Math.sin(longitudeDifference / 2) ** 2);
  return 6371000 * 2 * Math.atan2(Math.sqrt(haversine), Math.sqrt(1 - haversine));
};

const distanceInKilometres = (origin, destination) => (
  distanceInMetres(origin, destination) / 1000
);

const calculateDeliveryQuoteFromSettings = ({
  location,
  subtotal,
  storeSettings,
  deliverySettings,
}) => {
  const amount = Number(subtotal);
  if (!Number.isFinite(amount) || amount < 0) {
    throw createDeliveryError('The order subtotal is invalid.', 400);
  }
  const customerCoordinates = readCoordinates(location, 'Delivery location');
  const restaurantCoordinates = readCoordinates({
    latitude: storeSettings.latitude,
    longitude: storeSettings.longitude,
  }, 'Restaurant location', 503);
  const baseCharge = readNonNegativeSetting(deliverySettings, 'base_charge', 'base delivery charge');
  const freeMinimum = readNonNegativeSetting(deliverySettings, 'free_minimum', 'free-delivery minimum');
  const perKmCharge = readNonNegativeSetting(deliverySettings, 'per_km_charge', 'per-kilometre delivery charge');
  const maxDistance = Number(deliverySettings.max_distance ?? DEFAULT_DELIVERY_SETTINGS.max_distance);
  if (!Number.isFinite(maxDistance) || maxDistance <= 0) {
    throw createDeliveryError('The configured delivery radius is invalid. Please contact the restaurant.', 503);
  }

  const exactDistanceMetres = distanceInMetres(restaurantCoordinates, customerCoordinates);
  const exactDistanceKm = exactDistanceMetres / 1000;
  const distanceKm = Number(exactDistanceKm.toFixed(2));
  if (exactDistanceMetres > maxDistance * 1000) {
    throw createDeliveryError(
      `This address is outside the delivery area. Delivery is available within ${maxDistance} km; your location is about ${distanceKm} km away.`,
      400,
    );
  }

  const freeDelivery = freeMinimum > 0 && amount >= freeMinimum;
  const deliveryCharge = freeDelivery
    ? 0
    : Number((baseCharge + (exactDistanceMetres * perKmCharge / 1000)).toFixed(2));
  return {
    deliveryCharge,
    distanceKm,
    totalAmount: Number((amount + deliveryCharge).toFixed(2)),
    freeDelivery,
  };
};

const calculateDeliveryQuote = async ({ location, subtotal }) => {
  const [storeSettings, deliverySettings] = await Promise.all([
    getSettings('store'),
    getSettings('delivery'),
  ]);
  return calculateDeliveryQuoteFromSettings({
    location,
    subtotal,
    storeSettings,
    deliverySettings,
  });
};

module.exports = {
  calculateDeliveryQuote,
  calculateDeliveryQuoteFromSettings,
  distanceInKilometres,
};
