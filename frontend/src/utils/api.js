import axios from "axios";

// Determine the base URL
const baseURL =
  process.env.REACT_APP_API_BASE_URL ||
  process.env.REACT_APP_API_URL ||
  (() => {
    const host = window.location.hostname;
    const protocol = window.location.protocol;
    return `${protocol}//${host}:5000/api`; // fallback for local dev
  })();

// Create axios instance
const api = axios.create({
  baseURL,
  withCredentials: true,
  headers: {
    "Content-Type": "application/json"
  },
  timeout: 15000,
});

// Attach token automatically
api.interceptors.request.use((config) => {
  const token = localStorage.getItem("token");
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

export default api;
