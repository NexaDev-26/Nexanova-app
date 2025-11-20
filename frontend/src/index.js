import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import App from './App';

if (process.env.NODE_ENV === 'development') {
  console.log('🚀 NexaNova: Starting frontend...');
}

const rootElement = document.getElementById('root');
if (!rootElement) throw new Error('#root not found');

const root = ReactDOM.createRoot(rootElement);
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
