import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import ErrorBoundary from './components/ErrorBoundary.jsx'

// Tangkap global dynamic import / chunk load error saat ada deploy baru di Vercel
if (typeof window !== 'undefined') {
  window.addEventListener('error', (e) => {
    const msg = e?.message || '';
    if (msg.includes('Failed to fetch dynamically imported module') || msg.includes('Loading chunk')) {
      const hasAutoReloaded = sessionStorage.getItem('chunk_auto_reload');
      if (!hasAutoReloaded) {
        sessionStorage.setItem('chunk_auto_reload', 'true');
        window.location.reload();
      }
    }
  });

  window.addEventListener('unhandledrejection', (e) => {
    const reason = e?.reason?.message || '';
    if (reason.includes('Failed to fetch dynamically imported module') || reason.includes('Loading chunk')) {
      const hasAutoReloaded = sessionStorage.getItem('chunk_auto_reload');
      if (!hasAutoReloaded) {
        sessionStorage.setItem('chunk_auto_reload', 'true');
        window.location.reload();
      }
    }
  });
}

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </StrictMode>,
)
