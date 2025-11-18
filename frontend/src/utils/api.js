import axios from 'axios';

// Dynamic API URL detection - works for localhost, IP addresses, and production
const getApiUrl = () => {
  // Check for environment variable first (for production builds)
  if (process.env.REACT_APP_API_URL) {
    console.log('📍 Using REACT_APP_API_URL:', process.env.REACT_APP_API_URL);
    return process.env.REACT_APP_API_URL;
  }
  
  // In Vercel preview/production, use the Vercel API URL pattern
  if (process.env.REACT_APP_VERCEL_URL) {
    const apiUrl = `https://${process.env.REACT_APP_VERCEL_URL}/api`;
    console.log('📍 Using Vercel URL:', apiUrl);
    return apiUrl;
  }
  
  // Get the current hostname (works for localhost, IP addresses, and domains)
  const hostname = window.location.hostname;
  const protocol = window.location.protocol;
  const port = window.location.port;
  
  // Determine API port based on current setup
  let apiPort = '5000'; // Default API port
  
  // In development:
  // - React dev server runs on port 3000 (or any port if 3000 is taken)
  // - Backend API runs on port 5000
  // If we're on port 3000, API is definitely on 5000
  if (port === '3000') {
    apiPort = '5000';
  }
  // If no port specified (default HTTP/HTTPS ports)
  // - localhost without port = likely localhost:5000
  // - IP without port = likely same IP but port 5000
  else if (!port) {
    apiPort = '5000';
  }
  // If on a different port (not 3000), API might be on 5000 or same port
  // Default to 5000 for development consistency
  else {
    // In development, assume API is on 5000
    // In production, API might be proxied through same port
    // For now, default to 5000 (can be overridden with REACT_APP_API_URL)
    apiPort = '5000';
  }
  
  // Build API URL using current hostname and protocol
  // This ensures mobile devices using IP can connect to API on same IP
  // Example: http://192.168.1.100:3000 -> http://192.168.1.100:5000/api
  return `${protocol}//${hostname}:${apiPort}/api`;
};

const API_URL = getApiUrl();

// Log API URL for debugging (only in development, and only once)
if (process.env.NODE_ENV === 'development' && !window.__API_URL_LOGGED__) {
  console.log('🌐 API URL:', API_URL);
  window.__API_URL_LOGGED__ = true;
}

const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json'
  },
  timeout: 15000 // 15 second timeout (increased for mobile networks)
});

// Add token to requests
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Add response interceptor to handle errors gracefully
api.interceptors.response.use(
  (response) => response,
  (error) => {
    // Handle 404 errors for frontend routes (shouldn't happen, but handle gracefully)
    if (error.response?.status === 404) {
      const errorPath = error.config?.url || '';
      const frontendRoutes = ['/dashboard', '/login', '/onboarding', '/habits', '/finance', '/journal', '/profile', '/ai-chat', '/qr'];
      
      // If someone accidentally called a frontend route as an API endpoint
      if (frontendRoutes.some(route => errorPath.includes(route) && !errorPath.startsWith('/api'))) {
        console.warn(`⚠️ Attempted to call frontend route as API: ${errorPath}`);
        console.warn('💡 Frontend routes are handled by React Router, not the API');
        // Don't show this as an error to the user, just log it
        return Promise.reject(new Error('Frontend route - not an API endpoint'));
      }
    }
    
    // Handle token expiration
    if (error.response?.status === 401) {
      const errorMessage = error.response.data?.message || 'Session expired';
      if (errorMessage.includes('token') || errorMessage.includes('expired') || errorMessage.includes('Invalid token')) {
        // Clear auth data
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        // Redirect to login if not already there
        if (window.location.pathname !== '/login' && window.location.pathname !== '/onboarding') {
          window.location.href = '/login';
        }
        console.warn('🔒 Session expired. Please login again.');
      }
    }
    
    // Enhanced error handling for mobile network issues
    if (error.code === 'ECONNREFUSED' || error.code === 'ERR_NETWORK' || error.message === 'Network Error') {
      console.warn('⚠️ Network Error - Backend not available');
      console.warn('📍 Attempted to connect to:', API_URL);
      console.warn('💡 Make sure:');
      console.warn('   1. Backend server is running');
      console.warn('   2. Both devices are on the same network');
      console.warn('   3. Firewall allows connections on port 5000');
      console.warn('   4. Access app via same IP/hostname as backend');
    } else if (error.code === 'ECONNABORTED') {
      console.warn('⏱️ Request timeout - Network might be slow');
    } else if (error.response) {
      // Server responded with error status
      console.error('❌ API Error:', error.response.status, error.response.data);
    }
    return Promise.reject(error);
  }
);

// Lazy load offline storage to avoid blocking
let offlineStorageLoaded = false;
async function loadOfflineStorage() {
  if (offlineStorageLoaded) return;
  try {
    const { openDB } = await import('./offlineStorage');
    offlineStorageLoaded = true;
    return openDB;
  } catch (error) {
    console.warn('Offline storage not available:', error);
    return null;
  }
}

// Handle offline mode - only for non-critical requests (lazy)
api.interceptors.request.use(
  async (config) => {
    // Allow all requests if online
    if (navigator.onLine) {
      return config;
    }
    
    // If offline, only queue POST/PATCH/DELETE
    if (['post', 'patch', 'delete'].includes(config.method.toLowerCase())) {
      try {
        const openDB = await loadOfflineStorage();
        if (openDB) {
          const db = await openDB();
          const tx = db.transaction('offlineRequests', 'readwrite');
          await tx.objectStore('offlineRequests').add({
            ...config,
            timestamp: Date.now()
          });
        }
      } catch (e) {
        console.warn('Failed to store offline request:', e);
      }
      // Return error but don't block the app
      return Promise.reject(new Error('Offline - request queued'));
    }
    
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

export default api;

