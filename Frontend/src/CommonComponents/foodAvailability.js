import { useEffect, useState } from "react";

export const MEAL_TYPES = ["All Day", "Breakfast", "Lunch", "Evening Snacks", "Dinner"];

export const MEAL_AVAILABLE_TIMES = {
  Breakfast: "6:00 AM - 11:00 AM",
  Lunch: "11:00 AM - 3:00 PM",
  "Evening Snacks": "3:00 PM - 6:00 PM",
  Dinner: "6:00 PM - 11:00 PM",
  "All Day": "All Day",
};

export const getLocalMinutes = (date = new Date()) => {
  if (typeof date === "number") return date;
  return date.getHours() * 60 + date.getMinutes();
};

export const parseTimeToMinutes = (timeStr) => {
  if (!timeStr || typeof timeStr !== "string") return null;
  const match = timeStr.trim().match(/^(\d{1,2}):(\d{2})\s*(AM|PM)?$/i);
  if (!match) return null;
  let hours = Number(match[1]);
  const minutes = Number(match[2]);
  const meridiem = match[3]?.toUpperCase();

  if (meridiem) {
    if (hours < 1 || hours > 12 || minutes < 0 || minutes > 59) return null;
    if (meridiem === "AM" && hours === 12) hours = 0;
    if (meridiem === "PM" && hours !== 12) hours += 12;
  } else {
    if (hours < 0 || hours > 23 || minutes < 0 || minutes > 59) return null;
  }
  return hours * 60 + minutes;
};

export const parseAvailableTimeRange = (availableTime) => {
  if (!availableTime || typeof availableTime !== "string") return null;
  const trimmed = availableTime.trim();
  if (/^all\s*day$/i.test(trimmed)) return { allDay: true };
  const parts = trimmed.split(/\s*[-–—to]\s*/i).map((s) => s.trim()).filter(Boolean);
  if (parts.length !== 2) return null;
  const start = parseTimeToMinutes(parts[0]);
  const end = parseTimeToMinutes(parts[1]);
  if (start === null || end === null) return null;
  return { start, end };
};

export const isWithinAvailableTime = (availableTime, date = new Date()) => {
  const range = parseAvailableTimeRange(availableTime);
  if (!range) return null;
  if (range.allDay) return true;
  const minutes = getLocalMinutes(date);
  const { start, end } = range;
  if (start <= end) {
    return minutes >= start && minutes < end;
  }
  // Overnight range (e.g. 10:00 PM - 2:00 AM)
  return minutes >= start || minutes < end;
};

export const getActiveMenu = (date = new Date()) => {
  const minutes = getLocalMinutes(date);
  if (!Number.isInteger(minutes) || minutes < 0 || minutes >= 24 * 60) return null;

  if (minutes >= 6 * 60 && minutes < 11 * 60) {
    return { mealType: "Breakfast", heading: "Good Morning – Breakfast Menu", timeRange: "6:00 AM - 11:00 AM" };
  }
  if (minutes >= 11 * 60 && minutes < 15 * 60) {
    return { mealType: "Lunch", heading: "Lunch Menu", timeRange: "11:00 AM - 3:00 PM" };
  }
  if (minutes >= 15 * 60 && minutes < 18 * 60) {
    return { mealType: "Evening Snacks", heading: "Evening Snacks Menu", timeRange: "3:00 PM - 6:00 PM" };
  }
  if (minutes >= 18 * 60 && minutes < 23 * 60) {
    return { mealType: "Dinner", heading: "Dinner Menu", timeRange: "6:00 PM - 11:00 PM" };
  }
  return { mealType: "Evening Snacks", heading: "Late Night Snacks Menu", timeRange: "3:00 PM - 6:00 PM" };
};

export const isFoodScheduledNow = (mealTypeOrFood, date = new Date()) => {
  if (mealTypeOrFood && typeof mealTypeOrFood === "object") {
    if (mealTypeOrFood.available_time) {
      const match = isWithinAvailableTime(mealTypeOrFood.available_time, date);
      if (match !== null) return match;
    }
    return isFoodScheduledNow(mealTypeOrFood.meal_type, date);
  }

  const mealType = mealTypeOrFood;
  const normalizedType = String(mealType || "").trim().toLowerCase();
  if (normalizedType === "all day") return getActiveMenu(date) !== null;
  const activeMenu = getActiveMenu(date);
  if (!activeMenu) return false;
  const activeMeal = activeMenu.mealType.toLowerCase();
  return normalizedType === activeMeal;
};

export const getFoodAvailability = (food, date = new Date()) => {
  let scheduledAvailable = false;
  if (food?.available_time) {
    const timeMatch = isWithinAvailableTime(food.available_time, date);
    if (timeMatch !== null) {
      scheduledAvailable = timeMatch;
    } else {
      scheduledAvailable = isFoodScheduledNow(food?.meal_type, date);
    }
  } else {
    scheduledAvailable = isFoodScheduledNow(food?.meal_type, date);
  }

  const manuallyEnabled = food?.is_available !== false
    && food?.is_menu_visible !== false
    && String(food?.status || "Active").toLowerCase() === "active"
    && Number(food?.stock_quantity || 0) > 0;

  const available = scheduledAvailable && manuallyEnabled;

  return {
    scheduledAvailable,
    available,
    availableTime: food?.available_time || "",
    mealType: food?.meal_type || "",
    label: available
      ? (food?.available_time || food?.meal_type || "Available")
      : (food?.available_time ? `${food.available_time}` : (food?.meal_type || "Unavailable")),
  };
};

export const useFoodAvailabilityClock = () => {
  const [currentTime, setCurrentTime] = useState(() => new Date());

  useEffect(() => {
    let intervalId;
    const updateCurrentTime = () => setCurrentTime(new Date());
    const timeoutId = window.setTimeout(() => {
      updateCurrentTime();
      intervalId = window.setInterval(updateCurrentTime, 60_000);
    }, 60_000 - (Date.now() % 60_000));
    window.addEventListener("focus", updateCurrentTime);
    document.addEventListener("visibilitychange", updateCurrentTime);
    return () => {
      window.clearTimeout(timeoutId);
      if (intervalId) window.clearInterval(intervalId);
      window.removeEventListener("focus", updateCurrentTime);
      document.removeEventListener("visibilitychange", updateCurrentTime);
    };
  }, []);

  return currentTime;
};
