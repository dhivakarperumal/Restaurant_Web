const MEAL_TYPES = Object.freeze(['Breakfast', 'Lunch', 'Dinner', 'All Day']);

const getLocalMinutes = (request) => {
  const rawMinutes = request?.get?.('x-local-time-minutes');
  if (typeof rawMinutes === 'string' && /^\d{1,4}$/.test(rawMinutes.trim())) {
    const requestedMinutes = Number(rawMinutes);
    if (requestedMinutes >= 0 && requestedMinutes < 24 * 60) return requestedMinutes;
  }
  const now = new Date();
  return now.getHours() * 60 + now.getMinutes();
};

const isFoodScheduledNow = (mealType, minutes) => {
  if (!Number.isInteger(minutes) || minutes < 0 || minutes >= 24 * 60) return false;
  switch (String(mealType || '').trim().toLowerCase()) {
    case 'breakfast':
      return minutes >= 6 * 60 && minutes < 12 * 60;
    case 'lunch':
      return minutes >= 12 * 60 && minutes < 16 * 60;
    case 'dinner':
      return minutes >= 18 * 60 && minutes < 24 * 60;
    case 'all day':
      return true;
    default:
      return false;
  }
};

const getFoodAvailability = (food, minutes) => {
  const mealType = String(food.meal_type || '').trim();
  const scheduledAvailable = isFoodScheduledNow(mealType, minutes);
  const manuallyEnabled = Boolean(food.is_available)
    && Boolean(food.is_menu_visible)
    && String(food.status || '').toLowerCase() === 'active';
  const available = scheduledAvailable && manuallyEnabled;
  return {
    scheduled_available: scheduledAvailable,
    is_effectively_available: available,
    availability_label: available ? mealType : 'Unavailable',
  };
};

module.exports = { MEAL_TYPES, getFoodAvailability, getLocalMinutes, isFoodScheduledNow };
