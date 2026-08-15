import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { getLastTechnicianName, clearLastTechnicianName } from '../api.js';

export default function TechnicianLogin() {
  const savedName = getLastTechnicianName();
  const [useSaved, setUseSaved] = useState(!!savedName);
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { loginTechnician } = useAuth();
  const navigate = useNavigate();

  async function signIn(first, last) {
    setError('');
    setLoading(true);
    try {
      await loginTechnician(first, last);
      navigate('/technician');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  function handleSubmit(e) {
    e.preventDefault();
    signIn(firstName, lastName);
  }

  function handleNotYou() {
    clearLastTechnicianName();
    setUseSaved(false);
  }

  return (
    <div className="relative flex min-h-dvh items-center justify-center bg-gradient-to-b from-sky-50 via-white to-white px-4">
      <Link
        to="/"
        className="absolute left-4 top-4 text-sm text-slate-500 hover:text-slate-700 sm:left-6 sm:top-6"
      >
        &larr; Back
      </Link>
      <div className="w-full max-w-sm">
        <div className="rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
          <h1 className="text-xl font-semibold text-slate-900">Technician Sign In</h1>

          {useSaved && savedName ? (
            <>
              <p className="mt-1 text-sm text-slate-500">Welcome back.</p>
              <button
                onClick={() => signIn(savedName.firstName, savedName.lastName)}
                disabled={loading}
                className="mt-6 w-full rounded-lg bg-sky-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-sky-700 disabled:opacity-60"
              >
                {loading ? 'Signing in…' : `Continue as ${savedName.firstName} ${savedName.lastName}`}
              </button>
              {error && <p className="mt-3 text-sm text-red-600">{error}</p>}
              <button
                onClick={handleNotYou}
                className="mt-4 w-full text-center text-sm text-slate-500 hover:text-slate-700"
              >
                Not you? Sign in as someone else
              </button>
            </>
          ) : (
            <>
              <p className="mt-1 text-sm text-slate-500">
                Enter your first and last name. New technicians are added to the roster
                automatically.
              </p>

              <form onSubmit={handleSubmit} className="mt-6 space-y-4">
                <div>
                  <label className="mb-1 block text-sm font-medium text-slate-700">First name</label>
                  <input
                    autoFocus
                    required
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-sky-500 focus:ring-2 focus:ring-sky-100"
                    placeholder="Jordan"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-slate-700">Last name</label>
                  <input
                    required
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-sky-500 focus:ring-2 focus:ring-sky-100"
                    placeholder="Rivera"
                  />
                </div>

                {error && <p className="text-sm text-red-600">{error}</p>}

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full rounded-lg bg-sky-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-sky-700 disabled:opacity-60"
                >
                  {loading ? 'Signing in…' : 'Continue'}
                </button>
                {savedName && (
                  <button
                    type="button"
                    onClick={() => setUseSaved(true)}
                    className="w-full text-center text-sm text-slate-500 hover:text-slate-700"
                  >
                    &larr; Back to {savedName.firstName} {savedName.lastName}
                  </button>
                )}
              </form>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
