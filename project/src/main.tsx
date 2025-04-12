import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';
import { debugAPI } from './lib/debug';

// Run debug checks in development mode
if (import.meta.env.DEV) {
  console.log('Running in development mode - checking API configuration');
  debugAPI.checkAPIConfig();
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
