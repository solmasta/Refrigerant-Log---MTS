import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

const TECHNICIAN = { manifest: '/manifest.json', icon: '/apple-touch-icon.png', theme: '#0284c7' };
const ADMIN = { manifest: '/manifest-admin.json', icon: '/apple-touch-icon-admin.png', theme: '#1e293b' };

function setLinkHref(rel, href) {
  const el = document.querySelector(`link[rel="${rel}"]`);
  if (el) el.setAttribute('href', href);
}

// Admin and technicians install this as two separate home-screen apps (own
// icon, own name, own launch target) even though it's one SPA on one origin.
// Since index.html can only declare one <link rel="manifest"> and one
// apple-touch-icon up front, swap them at runtime based on which section the
// browser is currently rendering -- this also has to happen on client-side
// route changes (not just full page loads), since navigating between
// /technician and /admin never reloads index.html.
export default function PwaScopeManager() {
  const location = useLocation();

  useEffect(() => {
    const target = location.pathname.startsWith('/admin') ? ADMIN : TECHNICIAN;
    setLinkHref('manifest', target.manifest);
    setLinkHref('apple-touch-icon', target.icon);
    document.querySelector('meta[name="theme-color"]')?.setAttribute('content', target.theme);
  }, [location.pathname]);

  return null;
}
