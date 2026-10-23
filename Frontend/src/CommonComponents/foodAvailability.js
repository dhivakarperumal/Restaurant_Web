import { useEffect, useState } from "react";

export const MEAL_TYPES = ["Breakfast", "Lunch", "Dinner", "All Day"];

export const getLocalMinutes = (date = new Date()) => date.getHours() * 60 + date.getMinutes();

export const getFoodAvailability = (food, date = new Date()) => {
  const mealType = String(food?.meal_type || "").trim();
  const minutes = getLocalMinutes(date);
  let scheduledAvailable = false;

  switch (mealType.toLowerCase()) {
    case "breakfast":
      scheduledAvailable = minutes >= 6 * 60 && minutes < 12 * 60;
      break;
    case "lunch":
      scheduledAvailable = minutes >= 12 * 60 && minutes < 16 * 60;
      break;
    case "dinner":
      scheduledAvailable = minutes >= 18 * 60 && minutes < 24 * 60;
      break;
    case "all day":
      scheduledAvailable = true;
      break;
    default:
      scheduledAvailable = false;
  }

  const manuallyEnabled = food?.is_available !== false
    && food?.is_menu_visible !== false
    && String(food?.status || "Active").toLowerCase() === "active";
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
    const timeoutId = window.setTimeout(() => {
      setCurrentTime(new Date());
      intervalId = window.setInterval(() => setCurrentTime(new Date()), 60_000);
    }, 60_000 - (Date.now() % 60_000));
    return () => {
      window.clearTimeout(timeoutId);
      if (intervalId) window.clearInterval(intervalId);
    };
  }, []);

  return currentTime;
};
