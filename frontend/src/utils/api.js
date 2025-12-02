// src/utils/api.js
import axios from "axios";

// ═══════════════════════════════════════════════════════════════════════════
// API CONFIGURATION
// ═══════════════════════════════════════════════════════════════════════════

// Detect environment (local dev vs production)
// In production, use REACT_APP_API_BASE_URL from environment variables
// This should be set to your Render backend URL (e.g., https://your-app.onrender.com/api)
// IMPORTANT: The URL MUST end with /api
const BASE_URL =
  process.env.NODE_ENV === "production"
    ? (process.env.REACT_APP_API_BASE_URL || "https://neno-app.onrender.com/api")
    : "http://localhost:5000/api"; // Local development

// Ensure BASE_URL ends with /api
const normalizedBaseUrl = BASE_URL.endsWith('/api') ? BASE_URL : BASE_URL + '/api';

console.log("🔗 API BASE URL:", normalizedBaseUrl);

// Create axios instance with default config
const api = axios.create({
  baseURL: normalizedBaseUrl,
  withCredentials: true,
  timeout: 30000, // 30 second timeout
  headers: {
    "Content-Type": "application/json",
  },
});

// ═══════════════════════════════════════════════════════════════════════════
// REQUEST INTERCEPTOR
// ═══════════════════════════════════════════════════════════════════════════
api.interceptors.request.use(
  (config) => {
    // Add auth token from localStorage if available
    const token = localStorage.getItem("token");
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }

    // Log requests in development
    if (process.env.NODE_ENV !== "production") {
      console.log("➡️ Request:", config.method?.toUpperCase(), config.url);
    }

    return config;
  },
  (error) => {
    console.error("❌ Request Error:", error);
    return Promise.reject(error);
  }
);

// ═══════════════════════════════════════════════════════════════════════════
// RESPONSE INTERCEPTOR
// ═══════════════════════════════════════════════════════════════════════════
api.interceptors.response.use(
  (response) => {
    // Log successful responses in development
    if (process.env.NODE_ENV !== "production") {
      console.log("✅ Response:", response.config.url, response.status);
    }
    return response;
  },
  (error) => {
    // Handle specific error codes
    if (error.response) {
      const { status, data } = error.response;

      // Log error details
      console.error("❌ API Error:", {
        status,
        url: error.config?.url,
        message: data?.message || error.message,
      });

      // Handle 401 Unauthorized - token expired or invalid
      if (status === 401) {
        // Clear local storage if token is invalid
        const currentPath = window.location.pathname;
        if (currentPath !== "/login" && currentPath !== "/") {
          console.log("🔐 Token expired or invalid, redirecting to login...");
          localStorage.removeItem("token");
          localStorage.removeItem("user");
          // Redirect to login (handled by AuthContext)
        }
      }

      // Handle 403 Forbidden
      if (status === 403) {
        console.error("🚫 Access forbidden");
      }

      // Handle 404 Not Found
      if (status === 404) {
        console.error("🔍 Resource not found:", error.config?.url);
      }

      // Handle 500 Server Error
      if (status >= 500) {
        console.error("🔥 Server error:", data?.message || "Internal server error");
      }
    } else if (error.request) {
      // Network error (no response received)
      console.error("🌐 Network Error: No response received", error.message);
    } else {
      // Something else happened
      console.error("❌ Error:", error.message);
    }

    return Promise.reject(error);
  }
);

// ═══════════════════════════════════════════════════════════════════════════
// HELPER FUNCTIONS
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Set auth token for all requests
 */
export const setAuthToken = (token) => {
  if (token) {
    api.defaults.headers.common.Authorization = `Bearer ${token}`;
    localStorage.setItem("token", token);
  } else {
    delete api.defaults.headers.common.Authorization;
    localStorage.removeItem("token");
  }
};

/**
 * Clear auth token
 */
export const clearAuthToken = () => {
  delete api.defaults.headers.common.Authorization;
  localStorage.removeItem("token");
  localStorage.removeItem("user");
};

/**
 * Check if the API is reachable
 */
export const checkApiHealth = async () => {
  try {
    const response = await api.get("/health");
    return response.data;
  } catch (error) {
    return { success: false, error: error.message };
  }
};

export default api;
