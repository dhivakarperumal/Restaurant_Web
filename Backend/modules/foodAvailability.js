const MEAL_TYPES = Object.freeze(['Breakfast', 'Lunch', 'Evening Snacks', 'Dinner']);

const getLocalMinutes = (request) => {
  const rawMinutes = request?.get?.('x-local-time-minutes');
  if (typeof rawMinutes === 'string' && /^\d{1,4}$/.test(rawMinutes.trim())) {
    const requestedMinutes = Number(rawMinutes);
    if (requestedMinutes >= 0 && requestedMinutes < 24 * 60) return requestedMinutes;
  }
  const now = new Date();
  return now.getHours() * 60 + now.getMinutes();
};

const getActiveMealType = (minutes) => {
  if (!Number.isInteger(minutes) || minutes < 0 || minutes >= 24 * 60) return null;
  if (minutes >= 6 * 60 && minutes < 11 * 60) return 'Breakfast';
  if (minutes >= 11 * 60 && minutes < 15 * 60) return 'Lunch';
  if (minutes >= 15 * 60 && minutes < 18 * 60) return 'Evening Snacks';
  if (minutes >= 18 * 60 && minutes < 23 * 60) return 'Dinner';
  return 'Evening Snacks';
};

const isFoodScheduledNow = (mealType, minutes) => {
  const activeMealType = getActiveMealType(minutes);
  return Boolean(activeMealType)
    && String(mealType || '').trim().toLowerCase() === activeMealType.toLowerCase();
};

const getFoodAvailability = (food, minutes) => {
  const mealType = String(food.meal_type || '').trim();
  const scheduledAvailable = isFoodScheduledNow(mealType, minutes);
  const manuallyEnabled = Boolean(food.is_available)
    && Boolean(food.is_menu_visible)
    && Number(food.stock_quantity || 0) > 0
    && String(food.status || '').toLowerCase() === 'active';
  const available = scheduledAvailable && manuallyEnabled;
  return {
    scheduled_available: scheduledAvailable,
    is_effectively_available: available,
    availability_label: available ? mealType : 'Unavailable',
  };
};

module.exports = { MEAL_TYPES, getActiveMealType, getFoodAvailability, getLocalMinutes, isFoodScheduledNow };
