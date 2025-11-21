import React, { useState, useEffect, Suspense, lazy } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ThemeProvider } from './context/ThemeContext';
import { ToastProvider, useToast } from './context/ToastContext';
import { LocaleProvider } from './context/LocaleContext';
import ErrorBoundary from './ErrorBoundary';
import LoadingSpinner from './components/LoadingSpinner';
import Header from './components/Header';
import FloatingAIChat from './components/FloatingAIChat';
import './App.css';
import './styles/Toast.css';

// Lazy load pages
const Onboarding = lazy(() => import('./pages/Onboarding'));
const Login = lazy(() => import('./pages/Login'));
const ForgotPassword = lazy(() => import('./pages/ForgotPassword'));
const Dashboard = lazy(() => import('./pages/Dashboard'));
const AIChat = lazy(() => import('./pages/AIChat'));
const HabitTracker = lazy(() => import('./pages/HabitTracker'));
const FinanceTracker = lazy(() => import('./pages/FinanceTracker'));
const Journal = lazy(() => import('./pages/Journal'));
const Profile = lazy(() => import('./pages/Profile'));
const QRCode = lazy(() => import('./pages/QRCode'));

// Protected Route
const ProtectedRoute = ({ children }) => {
  const { isAuthenticated, loading } = useAuth();
  if (loading) return <LoadingSpinner size="large" text="Loading your journey..." />;
  return isAuthenticated ? children : <Navigate to="/login" replace />;
};

// Public Route
const PublicRoute = ({ children }) => {
  const { isAuthenticated, loading } = useAuth();
  if (loading) return <LoadingSpinner size="large" />;
  return !isAuthenticated ? children : <Navigate to="/dashboard" replace />;
};

function AppRoutes() {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const { isAuthenticated } = useAuth();
  const toast = useToast();
  const location = useLocation();

  // Offline detection
  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      toast.show('📡 Back online! Your queued requests will sync.', { type: 'success' });
    };
    const handleOffline = () => {
      setIsOnline(false);
      toast.show('⚠️ You are offline. Changes will sync when back online.', { type: 'warning' });
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [toast]);

  const isPublicPage = ['/onboarding', '/login', '/forgot-password'].includes(location.pathname);
  const showHeaderAndAI = isAuthenticated && !isPublicPage;

  return (
    <div className={`App ${showHeaderAndAI ? 'app-with-header' : ''}`}>
      {!isOnline && (
        <div className="offline-banner">
          📡 You're offline. Your data will sync when you're back online.
        </div>
      )}
      {showHeaderAndAI && <Header />}
      <Suspense fallback={<LoadingSpinner size="large" text="Loading page..." />}>
        <Routes>
          <Route path="/onboarding" element={<PublicRoute><Onboarding /></PublicRoute>} />
          <Route path="/login" element={<PublicRoute><Login /></PublicRoute>} />
          <Route path="/forgot-password" element={<PublicRoute><ForgotPassword /></PublicRoute>} />
          <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
          <Route path="/ai-chat" element={<ProtectedRoute><AIChat /></ProtectedRoute>} />
          <Route path="/habits" element={<ProtectedRoute><HabitTracker /></ProtectedRoute>} />
          <Route path="/finance" element={<ProtectedRoute><FinanceTracker /></ProtectedRoute>} />
          <Route path="/journal" element={<ProtectedRoute><Journal /></ProtectedRoute>} />
          <Route path="/profile" element={<ProtectedRoute><Profile /></ProtectedRoute>} />
          <Route path="/qr" element={<ProtectedRoute><QRCode /></ProtectedRoute>} />
          <Route path="/" element={<Navigate to="/onboarding" replace />} />
        </Routes>
      </Suspense>
      {showHeaderAndAI && <FloatingAIChat />}
    </div>
  );
}

function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider>
        <LocaleProvider>
          <ToastProvider>
            <AuthProvider>
              <Router>
                <AppRoutes />
              </Router>
            </AuthProvider>
          </ToastProvider>
        </LocaleProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;
