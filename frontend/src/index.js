import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import App from './App';

// Log only in development
if (process.env.NODE_ENV === 'development') {
  console.log('🚀 NexaNova: Starting frontend...');
}

const rootElement = document.getElementById('root');
if (!rootElement) {
  console.error('❌ Root element not found!');
} else {
  const root = ReactDOM.createRoot(rootElement);

  try {
    root.render(
      <React.StrictMode>
        <App />
      </React.StrictMode>
    );

    if (process.env.NODE_ENV === 'development') {
      console.log('✅ App rendered successfully');
    }
  } catch (error) {
    console.error('❌ Error rendering app:', error);
    rootElement.innerHTML = `
      <div style="padding: 2rem; text-align: center;">
        <h1>Error Loading App</h1>
        <p>${error.message}</p>
        <button onclick="window.location.reload()">Reload</button>
      </div>
    `;
  }
}

// Development-only: cleanup service workers and caches
if ('serviceWorker' in navigator && process.env.NODE_ENV === 'development') {
  navigator.serviceWorker.getRegistrations().then((registrations) => {
    registrations.forEach((registration) => registration.unregister());
  });

  if ('caches' in window) {
    caches.keys().then((cacheNames) => {
      cacheNames.forEach((cacheName) => caches.delete(cacheName));
    });
  }
}
