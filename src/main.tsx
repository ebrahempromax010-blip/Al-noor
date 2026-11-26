import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import { ErrorBoundary } from './components/ErrorBoundary.tsx';
import './index.css';

const CACHE_VERSION_KEY = 'alnour_pwa_cache_version';
const CURRENT_APP_CACHE_VERSION = '2026.11.26.3';

async function cleanupStaleCachesIfNeeded() {
  if (typeof window === 'undefined') return;
  try {
    const prevVersion = window.sessionStorage.getItem(CACHE_VERSION_KEY);
    if (prevVersion && prevVersion !== CURRENT_APP_CACHE_VERSION && 'caches' in window) {
      const keys = await window.caches.keys();
      await Promise.all(
        keys
          .filter((k) => !k.includes('google-fonts') && !k.includes('gstatic-fonts'))
          .map((k) => window.caches.delete(k))
      );
    }
    window.sessionStorage.setItem(CACHE_VERSION_KEY, CURRENT_APP_CACHE_VERSION);
  } catch {
    // Graceful no-op when storage/cache APIs are restricted
  }
}

void cleanupStaleCachesIfNeeded();

if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker
      .register('/sw.js', { scope: '/', updateViaCache: 'none' })
      .then((reg) => {
        void reg.update().catch(() => {});
        reg.addEventListener('updatefound', () => {
          const installing = reg.installing;
          if (!installing) return;
          installing.addEventListener('statechange', () => {
            if (installing.state === 'installed' && navigator.serviceWorker.controller) {
              installing.postMessage({ type: 'SKIP_WAITING' });
            }
          });
        });
      })
      .catch(() => {
        // Ignore silent SW registration issues in restricted environments
      });
  });
}

createRoot(document.getElementById('root')!).render(
  <ErrorBoundary>
    <App />
  </ErrorBoundary>
);
