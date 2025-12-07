import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { useLocale } from '../context/LocaleContext';
import { checkApiHealth } from '../utils/api';
import '../styles/Login.css';

export default function Login() {
  const { login, isAuthenticated } = useAuth();
  const { showToast } = useToast();
  const { t } = useLocale();
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

  // Check backend health on mount and show toast if offline
  useEffect(() => {
    const checkBackend = async () => {
      try {
        const health = await checkApiHealth();
        if (health.success) {
          setBackendStatus('online');
        } else {
          setBackendStatus('offline');
          showToast(t('auth.errors.backendOffline') + ' npm run server', 'error');
        }
      } catch (err) {
        setBackendStatus('offline');
        showToast(t('auth.errors.backendOffline') + ' npm run server', 'error');
      }
    };
    
    checkBackend();
    // Check every 10 seconds
    const interval = setInterval(checkBackend, 10000);
    return () => clearInterval(interval);
  }, [t, showToast]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    // Validation
    if (!email.trim()) {
      setError(t('auth.errors.enterEmail'));
      setLoading(false);
      return;
    }

    if (!password) {
      setError(t('auth.errors.enterPassword'));
      setLoading(false);
      return;
    }

    try {
      const result = await login(email.trim(), password);

      if (result.success) {
        showToast(t('auth.welcomeBack') + ' 🎉', 'success');
        // Navigation will happen automatically via useEffect when isAuthenticated changes
        navigate('/dashboard', { replace: true });
      } else {
        // Map error messages to translations
        let errorKey = 'auth.errors.loginFailed';
        if (result.message?.includes('Invalid') || result.message?.includes('invalid')) {
          errorKey = 'auth.errors.invalidCredentials';
        } else if (result.message?.includes('Server') || result.message?.includes('server')) {
          errorKey = 'auth.errors.serverError';
        } else if (result.message?.includes('connect') || result.message?.includes('network')) {
          errorKey = 'auth.errors.networkError';
        }
        const errorMessage = result.message || t(errorKey);
        setError(errorMessage);
        showToast(errorMessage, 'error');
      }
    } catch (err) {
      // Error message is already handled in AuthContext login function
      let errorKey = 'auth.errors.unexpectedError';
      if (err.message?.includes('connect') || err.message?.includes('network')) {
        errorKey = 'auth.errors.networkError';
      }
      const errorMessage = err.message || t(errorKey);
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
          <h1>{t('auth.welcomeBack')}</h1>
          <p>{t('auth.signInToContinue')}</p>
        </div>

        <form onSubmit={handleSubmit} className="login-form">
          {error && (
            <div className="error-message" role="alert">
              <span>⚠️</span>
              <span>{error}</span>
            </div>
          )}

          <div className="form-group">
            <label htmlFor="email">{t('auth.email')}</label>
            <input
              id="email"
              type="email"
              placeholder={t('auth.enterEmail')}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={loading}
              autoComplete="email"
              required
            />
          </div>

          <div className="form-group">
            <label htmlFor="password">{t('auth.password')}</label>
            <div className="password-input-wrapper">
              <input
                id="password"
                type={showPassword ? "text" : "password"}
                placeholder={t('auth.enterPassword')}
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
                aria-label={showPassword ? t('auth.hidePassword') : t('auth.showPassword')}
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
            {loading ? t('common.loading') : t('auth.login')}
          </button>

          <div className="login-footer">
            <a href="/forgot-password" className="forgot-password-link">
              {t('auth.forgotPassword')}
            </a>
            <p className="signup-link">
              {t('auth.dontHaveAccount')} <a href="/onboarding">{t('auth.signUp')}</a>
            </p>
          </div>
        </form>
      </div>
    </div>
  );
}
