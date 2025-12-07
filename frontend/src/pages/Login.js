import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { checkApiHealth } from '../utils/api';
import '../styles/Login.css';

export default function Login() {
  const { login, isAuthenticated } = useAuth();
  const { showToast } = useToast();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [backendStatus, setBackendStatus] = useState(null);

  // Redirect if already authenticated
  useEffect(() => {
    if (isAuthenticated) {
      navigate('/dashboard', { replace: true });
    }
  }, [isAuthenticated, navigate]);

  // Check backend health on mount
  useEffect(() => {
    const checkBackend = async () => {
      try {
        const health = await checkApiHealth();
        setBackendStatus(health.success ? 'online' : 'offline');
      } catch (err) {
        setBackendStatus('offline');
      }
    };
    
    checkBackend();
    // Check every 10 seconds
    const interval = setInterval(checkBackend, 10000);
    return () => clearInterval(interval);
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    // Validation
    if (!email.trim()) {
      setError('Please enter your email');
      setLoading(false);
      return;
    }

    if (!password) {
      setError('Please enter your password');
      setLoading(false);
      return;
    }

    try {
      const result = await login(email.trim(), password);

      if (result.success) {
        showToast('Welcome back! 🎉', 'success');
        // Navigation will happen automatically via useEffect when isAuthenticated changes
        navigate('/dashboard', { replace: true });
      } else {
        const errorMessage = result.message || 'Login failed. Please check your credentials.';
        setError(errorMessage);
        showToast(errorMessage, 'error');
      }
    } catch (err) {
      // Error message is already handled in AuthContext login function
      const errorMessage = err.message || 'An unexpected error occurred. Please try again.';
      setError(errorMessage);
      showToast(errorMessage, 'error');
      console.error('Login error:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-page">
      <div className="login-container">
        <div className="login-header">
          <h1>Welcome Back</h1>
          <p>Sign in to continue your journey</p>
        </div>

        <form onSubmit={handleSubmit} className="login-form">
          {backendStatus === 'offline' && (
            <div className="error-message backend-offline" role="alert">
              <span>🔴</span>
              <span>
                Backend server is offline. Please start the backend server:
                <br />
                <code style={{ fontSize: '0.75rem', marginTop: '0.25rem', display: 'block' }}>
                  npm run server
                </code>
              </span>
            </div>
          )}
          {error && backendStatus !== 'offline' && (
            <div className="error-message" role="alert">
              <span>⚠️</span>
              <span>{error}</span>
            </div>
          )}

          <div className="form-group">
            <label htmlFor="email">Email</label>
            <input
              id="email"
              type="email"
              placeholder="Enter your email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={loading}
              autoComplete="email"
              required
            />
          </div>

          <div className="form-group">
            <label htmlFor="password">Password</label>
            <div className="password-input-wrapper">
              <input
                id="password"
                type={showPassword ? "text" : "password"}
                placeholder="Enter your password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={loading}
                autoComplete="current-password"
                required
              />
              <button
                type="button"
                className="password-toggle"
                onClick={() => setShowPassword(!showPassword)}
                disabled={loading}
                aria-label={showPassword ? "Hide password" : "Show password"}
              >
                {showPassword ? (
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"></path>
                    <line x1="1" y1="1" x2="23" y2="23"></line>
                  </svg>
                ) : (
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
                    <circle cx="12" cy="12" r="3"></circle>
                  </svg>
                )}
              </button>
            </div>
          </div>

          <button
            type="submit"
            className="login-button"
            disabled={loading || !email.trim() || !password}
          >
            {loading ? 'Signing in...' : 'Sign In'}
          </button>

          <div className="login-footer">
            <a href="/forgot-password" className="forgot-password-link">
              Forgot password?
            </a>
            <p className="signup-link">
              Don't have an account? <a href="/onboarding">Sign up</a>
            </p>
          </div>
        </form>
      </div>
    </div>
  );
}
