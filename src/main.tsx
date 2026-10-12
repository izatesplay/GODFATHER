import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import { ErrorBoundary } from './components/ErrorBoundary.tsx';
import './index.css';

// Unregister stale service workers in dev or preview environments to prevent blank screens
if ('serviceWorker' in navigator) {
  const isDevOrPreview = 
    import.meta.env.DEV || 
    window.location.hostname.includes('run.app') || 
    window.location.hostname === 'localhost' ||
    window.location.hostname === '127.0.0.1';

  if (isDevOrPreview) {
    navigator.serviceWorker.getRegistrations().then((registrations) => {
      for (const reg of registrations) {
        reg.unregister().catch(() => {});
      }
    }).catch(() => {});
  } else if (window.location.protocol.startsWith('http')) {
    window.addEventListener('load', () => {
      navigator.serviceWorker.register('/sw.js').catch((err) => {
        console.warn('ServiceWorker registration error:', err);
      });
    });
  }
}

createRoot(document.getElementById('root')!).render(
  <ErrorBoundary>
    <App />
  </ErrorBoundary>
);

