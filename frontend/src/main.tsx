import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './index.css';
import './i18n';
import App from './App.tsx';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);

// ── PWA service worker ───────────────────────
// Registered in production builds only (dev would interfere with
// Vite's HMR websocket). The worker is a pass-through — it enables
// installability without caching anything (see public/sw.js).
if (import.meta.env.PROD && 'serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch(() => {
      // Installation is a nice-to-have; never block the app on it.
    });
  });
}
