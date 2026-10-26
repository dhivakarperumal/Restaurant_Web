import { useEffect, useState } from "react";

export const MEAL_TYPES = ["Breakfast", "Lunch", "Evening Snacks", "Dinner"];

export const getLocalMinutes = (date = new Date()) => date.getHours() * 60 + date.getMinutes();

export const getActiveMenu = (date = new Date()) => {
  const minutes = typeof date === "number" ? date : getLocalMinutes(date);
  if (!Number.isInteger(minutes) || minutes < 0 || minutes >= 24 * 60) return null;

  if (minutes >= 6 * 60 && minutes < 11 * 60) {
    return { mealType: "Breakfast", heading: "Good Morning – Breakfast Menu" };
  }
  if (minutes >= 11 * 60 && minutes < 15 * 60) {
    return { mealType: "Lunch", heading: "Lunch Menu" };
  }
  if (minutes >= 15 * 60 && minutes < 18 * 60) {
    return { mealType: "Evening Snacks", heading: "Evening Snacks Menu" };
  }
  if (minutes >= 18 * 60 && minutes < 23 * 60) {
    return { mealType: "Dinner", heading: "Dinner Menu" };
  }
  return { mealType: "Evening Snacks", heading: "Late Night Snacks Menu" };
};

export const isFoodScheduledNow = (mealType, date = new Date()) => {
  const normalizedType = String(mealType || "").trim().toLowerCase();
  const activeMenu = getActiveMenu(date);
  if (!activeMenu) return false;
  const activeMeal = activeMenu.mealType.toLowerCase();
  return normalizedType === activeMeal;
};

export const getFoodAvailability = (food, date = new Date()) => {
  const mealType = String(food?.meal_type || "").trim();
  const scheduledAvailable = isFoodScheduledNow(mealType, date);
  const manuallyEnabled = food?.is_available !== false
    && food?.is_menu_visible !== false
    && String(food?.status || "Active").toLowerCase() === "active"
    && Number(food?.stock_quantity || 0) > 0;
  const available = scheduledAvailable && manuallyEnabled;

  return {
    scheduledAvailable,
    available,
    label: available ? mealType : "Unavailable",
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
