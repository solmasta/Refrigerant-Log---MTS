import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';

export default function Navbar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  function handleLogout() {
    logout();
    navigate('/');
  }

  return (
    <header className="sticky top-0 z-10 border-b border-slate-200 bg-white/90 backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-2 px-3 py-3 sm:px-6">
        <div className="flex min-w-0 items-center gap-2">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-sky-600 text-white shadow-sm">
            <svg viewBox="0 0 24 24" fill="none" className="h-5 w-5">
              <path
                d="M12 2v20M12 2l-3 3M12 2l3 3M12 22l-3-3M12 22l3-3M2 12h20M2 12l3-3M2 12l3 3M22 12l-3-3M22 12l-3 3M5 5l14 14M19 5L5 19"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
              />
            </svg>
          </div>
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold leading-tight text-slate-900">
              Refrigerant Log
            </p>
            <p className="hidden truncate text-xs leading-tight text-slate-500 sm:block">
              MTS &middot; EPA 608 Compliance
            </p>
          </div>
        </div>

        {user && (
          <div className="flex min-w-0 shrink items-center gap-2 sm:gap-3">
            <div className="min-w-0 text-right">
              <p className="truncate text-sm font-medium text-slate-900">
                {user.role === 'admin' ? 'Administrator' : `${user.firstName} ${user.lastName}`}
              </p>
              <p className="hidden text-xs capitalize text-slate-500 sm:block">{user.role}</p>
            </div>
            <button
              onClick={handleLogout}
              className="shrink-0 whitespace-nowrap rounded-lg border border-slate-200 px-2.5 py-1.5 text-sm font-medium text-slate-600 transition hover:border-slate-300 hover:bg-slate-50 sm:px-3"
            >
              Sign out
            </button>
          </div>
        )}
      </div>
    </header>
  );
}
