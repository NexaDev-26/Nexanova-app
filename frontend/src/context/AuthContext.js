import React, { createContext, useContext, useState, useEffect } from 'react';
import api from '../utils/api';

const AuthContext = createContext();

// Hook for accessing the Auth context
export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within AuthProvider");
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  /* ----------------------------
     LOAD USER + TOKEN FROM STORAGE
  ----------------------------- */
  const [token, setToken] = useState(() => localStorage.getItem("token") || null);
  const [user, setUser] = useState(() => {
    try {
      const stored = localStorage.getItem("user");
      return stored ? JSON.parse(stored) : null;
    } catch {
      return null;
    }
  });
  const [loading, setLoading] = useState(true);

  /* ----------------------------
     CHECK TOKEN (background)
  ----------------------------- */
  useEffect(() => {
    if (!token) {
      setLoading(false);
      return;
    }

    api.defaults.headers.common.Authorization = `Bearer ${token}`;

    // Verify token silently
    api.get("/auth/profile")
      .then(res => {
        if (res.data.success && res.data.user) {
          setUser(res.data.user);
          localStorage.setItem("user", JSON.stringify(res.data.user));
        }
      })
      .catch(err => {
        // Only clear on invalid token
        if (err.response?.status === 401 || err.response?.status === 403) {
          logout();
        }
      })
      .finally(() => setLoading(false));

  }, [token]);

  /* ----------------------------
     LOGIN
  ----------------------------- */
  const login = async (email, password) => {
    try {
      const res = await api.post("/auth/login", { email, password });

      if (res.data.success) {
        const userData = res.data.user;

        // Save everything
        localStorage.setItem("token", res.data.token);
        localStorage.setItem("user", JSON.stringify(userData));

        setToken(res.data.token);
        setUser(userData);

        api.defaults.headers.common.Authorization = `Bearer ${res.data.token}`;

        return { success: true };
      }

      return { success: false, message: res.data.message || "Login failed" };

    } catch (err) {
      // Better error handling
      if (!err.response) {
        // Network error - no response from server
        const isDevelopment = process.env.NODE_ENV !== 'production';
        const baseUrl = err.config?.baseURL || 'http://localhost:5000/api';
        
        let message = "Cannot connect to server.";
        
        if (isDevelopment) {
          message += " Please ensure the backend server is running on port 5000. Run 'npm run server' from the project root.";
        } else {
          message += " Please check your internet connection and try again.";
        }
        
        console.error("🌐 Connection Error Details:", {
          baseURL: baseUrl,
          code: err.code,
          message: err.message,
          config: err.config
        });
        
        return {
          success: false,
          message: message
        };
      }
      
      const status = err.response?.status;
      const errorMessage = err.response?.data?.message;

      if (status === 401) {
        return {
          success: false,
          message: errorMessage || "Invalid email or password. Please try again."
        };
      }

      if (status === 500) {
        return {
          success: false,
          message: "Server error. Please try again later."
        };
      }

      if (status === 404) {
        return {
          success: false,
          message: "Login endpoint not found. Please check backend configuration."
        };
      }

      return {
        success: false,
        message: errorMessage || "An unexpected error occurred. Please try again."
      };
    }
  };

  /* ----------------------------
     REGISTER
  ----------------------------- */
  const register = async (data) => {
    try {
      const res = await api.post("/auth/register", data);

      if (res.data.success) {
        const userData = res.data.user || data;

        localStorage.setItem("token", res.data.token);
        localStorage.setItem("user", JSON.stringify(userData));

        setToken(res.data.token);
        setUser(userData);
        api.defaults.headers.common.Authorization = `Bearer ${res.data.token}`;

        return { success: true };
      }

      return { success: false, message: res.data.message };

    } catch (err) {
      if (err.response?.status === 404) {
        return {
          success: false,
          message: "Registration endpoint not found. Check backend route.",
        };
      }

      return {
        success: false,
        message: err.response?.data?.message || "Registration failed"
      };
    }
  };

  /* ----------------------------
     LOGOUT
  ----------------------------- */
  const logout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    setToken(null);
    setUser(null);
    delete api.defaults.headers.common.Authorization;
  };

  /* ----------------------------
     UPDATE USER LOCALLY
  ----------------------------- */
  const updateUser = (data) => {
    const updated = { ...user, ...data };
    setUser(updated);
    localStorage.setItem("user", JSON.stringify(updated));
  };

  /* ----------------------------
     CONTEXT VALUE
  ----------------------------- */
  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        login,
        register,
        logout,
        updateUser,
        loading,
        isAuthenticated: !!token,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};
