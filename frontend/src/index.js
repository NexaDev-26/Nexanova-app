import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import App from './App';

// Log startup info only in development
if (process.env.NODE_ENV === 'development') {
  console.log('🚀 NexaNova: Starting frontend...')import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import App from './App';

// Log startup info only in development
if (process.env.NODE_ENV === 'development') {
  console.log('🚀 NexaNova: Starting frontend...');
}

const rootElement = document.getElementById('root');

if (!rootElement) {
  console.error('❌ Root element #root NOT FOUND');
} else {
  const root = ReactDOM.createRoot(rootElement);

  try {
    root.render(
      <React.StrictMode>
        <App />
      </React.StrictMode>
    );

    if (process.env.NODE_ENV === 'development') {
      console.log('✅ App rendered successfully.');
    }
  } catch (error) {
    console.error('❌ App rendering failed:', error);

    rootElement.innerHTML = `
      <div style="padding:2rem; text-align:center; font-family:sans-serif;">
        <h1 style="color:#d00;">App Failed to Load</h1>
        <p>${error.message}</p>
        <button onclick="window.location.reload()" 
                style="padding:.5rem 1rem; margin-top:1rem; cursor:pointer;">
          Reload Page
        </button>
      </div>
    `;
  }
}

// 🔥 Disable all service workers (avoid offline bugs)
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.getRegistrations().then((registrations) => {
    registrations.forEach((reg) => reg.unregister());
  });
}

// Clear all caches to prevent stale asset issues
if ('caches' in window) {
  caches.keys().then((keys) => {
    keys.forEach((key) => caches.delete(key));
  });
}

}

const rootElement = document.getElementById('root');

if (!rootElement) {
  console.error('❌ Root element #root NOT FOUND');
} else {
  const root = ReactDOM.createRoot(rootElement);

  try {
    root.render(
      <React.StrictMode>
        <App />
      </React.StrictMode>
    );

    if (process.env.NODE_ENV === 'development') {
      console.log('✅ App rendered successfully.');
    }
  } catch (error) {
    console.error('❌ App rendering failed:', error);

    rootElement.innerHTML = `
      <div style="padding:2rem; text-align:center; font-family:sans-serif;">
        <h1 style="color:#d00;">App Failed to Load</h1>
        <p>${error.message}</p>
        <button onclick="window.location.reload()" 
                style="padding:.5rem 1rem; margin-top:1rem; cursor:pointer;">
          Reload Page
        </button>
      </div>
    `;
  }
}

// 🔥 Disable all service workers (avoid offline bugs)
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.getRegistrations().then((registrations) => {
    registrations.forEach((reg) => reg.unregister());
  });
}

// Clear all caches to prevent stale asset issues
if ('caches' in window) {
  caches.keys().then((keys) => {
    keys.forEach((key) => caches.delete(key));
  });
}
