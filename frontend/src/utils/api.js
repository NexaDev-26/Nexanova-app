// src/utils/api.js
import axios from "axios";

// Detect environment (local dev vs production)
const BASE_URL =
  process.env.NODE_ENV === "production"
    ? process.env.REACT_APP_API_BASE_URL // Vercel Environment Variable
    : "http://localhost:5000/api";       // Local development

console.log("🔗 API BASE URL:", BASE_URL);

// Create axios instance
const api = axios.create({
  baseURL: BASE_URL,
  withCredentials: true,
  headers: {
    "Content-Type": "application/json",
  },
});

// Optional: log requests in dev
api.interceptors.request.use((config) => {
  if (process.env.NODE_ENV !== "production") {
    console.log("➡️ Request:", config.method?.toUpperCase(), config.url);
  }
  return config;
});

// Optional: log errors
api.interceptors.response.use(
  (response) => response,
  (error) => {
    console.error("❌ API Error:", error.response || error.message);
    return Promise.reject(error);
  }
);

export default api;
