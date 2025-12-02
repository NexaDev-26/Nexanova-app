import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import '../styles/Login.css';

export default function Login() {
  const { login, isAuthenticated } = useAuth();
  const { showToast } = useToast();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Redirect if already authenticated
  useEffect(() => {
    if (isAuthenticated) {
      navigate('/dashboard', { replace: true });
    }
  }, [isAuthenticated, navigate]);

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
          {error && (
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
            <input
              id="password"
              type="password"
              placeholder="Enter your password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              disabled={loading}
              autoComplete="current-password"
              required
            />
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
