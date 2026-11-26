import { createRoot } from 'react-dom/client';
import { registerSW } from 'virtual:pwa-register';
import App from './App.tsx';
import { ErrorBoundary } from './components/ErrorBoundary.tsx';
import './index.css';

const CACHE_VERSION_KEY = 'ashraf_tech_cache_version';
const CURRENT_APP_CACHE_VERSION = '2026.11.25.2';

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
  try {
    const updateSW = registerSW({
      immediate: true,
      onNeedRefresh() {
        void cleanupStaleCachesIfNeeded().finally(() => {
          updateSW(true);
        });
      },
      onRegisterError() {
        // Ignore silent SW registration issues in restricted environments
      },
    });
  } catch {
    // Graceful no-op in restricted preview contexts
  }
}

createRoot(document.getElementById('root')!).render(
  <ErrorBoundary>
    <App />
  </ErrorBoundary>
);
