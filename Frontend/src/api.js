import axios from "axios";

const rawApiUrl = import.meta.env.VITE_API_URL || "/api";
export const API_URL = rawApiUrl.endsWith("/") ? rawApiUrl.slice(0, -1) : rawApiUrl;

export const BACKEND_BASE_URL = (() => {
  const configuredBackend = import.meta.env.VITE_BACKEND_URL;
  if (configuredBackend) return configuredBackend.replace(/\/$/, "");

  if (/^https?:\/\//i.test(API_URL)) {
    return API_URL.replace(/\/api\/?$/, "").replace(/\/$/, "");
  }

  const currentOrigin = window.location.origin.replace(/\/$/, "");
  if (/localhost|127\.0\.0\.1/i.test(currentOrigin)) {
    return "http://localhost:5000";
  }

  return currentOrigin;
})();

const api = axios.create({
  baseURL: API_URL,
  withCredentials: true,
});

// Add token automatically and preserve FormData headers
api.interceptors.request.use(
  (config) => {
    // Always read token fresh from localStorage before each request
    const token = localStorage.getItem("token") || sessionStorage.getItem("token");
    const localNow = new Date();
    config.headers["X-Local-Time-Minutes"] = String(localNow.getHours() * 60 + localNow.getMinutes());
    
    if (token && token.trim()) {
      config.headers.Authorization = `Bearer ${token}`;
      // Debug log (remove in production if needed)
      if (import.meta.env.DEV) {
        console.log(`[API] Sending request to ${config.url} with token (length: ${token.length})`);
      }
    } else {
      if (import.meta.env.DEV) {
        console.warn(`[API] No token found for ${config.url}. User may not be authenticated.`);
      }
    }
    
    if (config.data instanceof FormData) {
      // Let axios set the multipart/form-data boundary header automatically
      delete config.headers["Content-Type"];
    } else {
      config.headers["Content-Type"] = "application/json";
    }
    
    return config;
  },
  (error) => Promise.reject(error)
);

// An endpoint-level 401 must not silently erase the signed-in profile. Login
// state is cleared explicitly by logout or replaced by a successful login.
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      console.warn("[API] Request was unauthorized:", error.config?.url);
    }
    return Promise.reject(error);
  }
);

export default api;