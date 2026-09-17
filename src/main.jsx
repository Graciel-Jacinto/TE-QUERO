import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import { track } from './lib/track';
import './index.css';

/* ============================================================
   LISTENERS GLOBAIS DE TRACKING
============================================================ */

// 1. Promises rejeitadas (fetch sem try/catch)
window.addEventListener('unhandledrejection', (e) => {
  const msg = e?.reason?.message || String(e?.reason || '');
  const lower = msg.toLowerCase();
  if (
    lower.includes('failed to fetch') ||
    lower.includes('networkerror') ||
    lower.includes('load failed') ||
    lower.includes('network request failed')
  ) {
    track('network_error', 'error', {
      message: msg,
      url: window.location.pathname,
      source: 'unhandledrejection',
      online: navigator.onLine,
    });
  }
});

// 2. Erros de JS normais
window.addEventListener('error', (e) => {
  const msg = e?.message || '';
  const lower = msg.toLowerCase();
  if (
    lower.includes('failed to fetch') ||
    lower.includes('networkerror') ||
    lower.includes('load failed')
  ) {
    track('network_error', 'error', {
      message: msg,
      url: window.location.pathname,
      source: 'window.error',
      online: navigator.onLine,
    });
  }
});

// 3. Abandono do browser
document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'hidden') {
    const step = sessionStorage.getItem('onboarding_step');
    if (step && !sessionStorage.getItem('onboarding_done')) {
      track('onboarding_abandon', 'started', {
        last_step: step,
        url: window.location.pathname,
      });
    }
  }
});

/* ============================================================
   ARRANQUE — SEM BrowserRouter (já existe no App.jsx)
============================================================ */
ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);