import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch(() => {});
  });
}

// Ask the browser not to evict this device's offline queue (IndexedDB)
// under storage pressure. Best-effort — unsupported or denied is fine,
// the queue still works, it's just not protected from eviction.
if (navigator.storage?.persist) {
  navigator.storage.persist().catch(() => {});
}
