const MEAL_TYPES = Object.freeze(['All Day', 'Breakfast', 'Lunch', 'Evening Snacks', 'Dinner']);

const MEAL_AVAILABLE_TIMES = Object.freeze({
  Breakfast: '6:00 AM - 11:00 AM',
  Lunch: '11:00 AM - 3:00 PM',
  'Evening Snacks': '3:00 PM - 6:00 PM',
  Dinner: '6:00 PM - 11:00 PM',
  'All Day': 'All Day',
});

const getLocalMinutes = (request) => {
  const rawMinutes = request?.get?.('x-local-time-minutes');
  if (typeof rawMinutes === 'string' && /^\d{1,4}$/.test(rawMinutes.trim())) {
    const requestedMinutes = Number(rawMinutes);
    if (requestedMinutes >= 0 && requestedMinutes < 24 * 60) return requestedMinutes;
  }
  const now = new Date();
  return now.getHours() * 60 + now.getMinutes();
};

const parseTimeToMinutes = (timeStr) => {
  if (!timeStr || typeof timeStr !== 'string') return null;
  const match = timeStr.trim().match(/^(\d{1,2}):(\d{2})\s*(AM|PM)?$/i);
  if (!match) return null;
  let hours = Number(match[1]);
  const minutes = Number(match[2]);
  const meridiem = match[3]?.toUpperCase();

  if (meridiem) {
    if (hours < 1 || hours > 12 || minutes < 0 || minutes > 59) return null;
    if (meridiem === 'AM' && hours === 12) hours = 0;
    if (meridiem === 'PM' && hours !== 12) hours += 12;
  } else {
    if (hours < 0 || hours > 23 || minutes < 0 || minutes > 59) return null;
  }
  return hours * 60 + minutes;
};

const parseAvailableTimeRange = (availableTime) => {
  if (!availableTime || typeof availableTime !== 'string') return null;
  const trimmed = availableTime.trim();
  if (/^all\s*day$/i.test(trimmed)) return { allDay: true };
  const parts = trimmed.split(/\s*[-–—to]\s*/i).map((s) => s.trim()).filter(Boolean);
  if (parts.length !== 2) return null;
  const start = parseTimeToMinutes(parts[0]);
  const end = parseTimeToMinutes(parts[1]);
  if (start === null || end === null) return null;
  return { start, end };
};

const isWithinAvailableTime = (availableTime, minutes) => {
  const range = parseAvailableTimeRange(availableTime);
  if (!range) return null;
  if (range.allDay) return true;
  const { start, end } = range;
  if (start <= end) {
    return minutes >= start && minutes < end;
  }
  return minutes >= start || minutes < end;
};

const getActiveMealType = (minutes) => {
  if (!Number.isInteger(minutes) || minutes < 0 || minutes >= 24 * 60) return null;
  if (minutes >= 6 * 60 && minutes < 11 * 60) return 'Breakfast';
  if (minutes >= 11 * 60 && minutes < 15 * 60) return 'Lunch';
  if (minutes >= 15 * 60 && minutes < 18 * 60) return 'Evening Snacks';
  if (minutes >= 18 * 60 && minutes < 23 * 60) return 'Dinner';
  return 'Evening Snacks';
};

const isFoodScheduledNow = (mealTypeOrFood, minutes) => {
  if (mealTypeOrFood && typeof mealTypeOrFood === 'object') {
    if (mealTypeOrFood.available_time) {
      const match = isWithinAvailableTime(mealTypeOrFood.available_time, minutes);
      if (match !== null) return match;
    }
    return isFoodScheduledNow(mealTypeOrFood.meal_type, minutes);
  }

  const mealType = mealTypeOrFood;
  const normalized = String(mealType || '').trim().toLowerCase();
  if (normalized === 'all day') return Boolean(getActiveMealType(minutes));
  const activeMealType = getActiveMealType(minutes);
  return Boolean(activeMealType)
    && normalized === activeMealType.toLowerCase();
};

const getFoodAvailability = (food, minutes) => {
  let scheduledAvailable = false;
  if (food?.available_time) {
    const timeMatch = isWithinAvailableTime(food.available_time, minutes);
    if (timeMatch !== null) {
      scheduledAvailable = timeMatch;
    } else {
      scheduledAvailable = isFoodScheduledNow(food?.meal_type, minutes);
    }
  } else {
    scheduledAvailable = isFoodScheduledNow(food?.meal_type, minutes);
  }

  const manuallyEnabled = Boolean(food.is_available)
    && Boolean(food.is_menu_visible)
    && Number(food.stock_quantity || 0) > 0
    && String(food.status || '').toLowerCase() === 'active';
  const available = scheduledAvailable && manuallyEnabled;

  return {
    scheduled_available: scheduledAvailable,
    is_effectively_available: available,
    availability_label: available
      ? (food.available_time || food.meal_type || 'Available')
      : (food.available_time ? `${food.available_time}` : (food.meal_type || 'Unavailable')),
  };
};

module.exports = {
  MEAL_AVAILABLE_TIMES,
  MEAL_TYPES,
  getActiveMealType,
  getFoodAvailability,
  getLocalMinutes,
  isFoodScheduledNow,
  isWithinAvailableTime,
  parseAvailableTimeRange,
  parseTimeToMinutes,
};
