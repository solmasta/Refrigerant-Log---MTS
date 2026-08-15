import { Link } from 'react-router-dom';

export default function Landing() {
  return (
    <div className="flex min-h-dvh items-center justify-center bg-gradient-to-b from-sky-50 via-white to-white px-4">
      <div className="w-full max-w-3xl text-center">
        <div className="mx-auto mb-6 flex h-14 w-14 items-center justify-center rounded-2xl bg-sky-600 text-white shadow-lg shadow-sky-200">
          <svg viewBox="0 0 24 24" fill="none" className="h-8 w-8">
            <path
              d="M12 2v20M12 2l-3 3M12 2l3 3M12 22l-3-3M12 22l3-3M2 12h20M2 12l3-3M2 12l3 3M22 12l-3-3M22 12l-3 3M5 5l14 14M19 5L5 19"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
            />
          </svg>
        </div>
        <h1 className="text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">
          Refrigerant Log &mdash; MTS
        </h1>
        <p className="mx-auto mt-3 max-w-xl text-slate-600">
          Digital EPA 608 refrigerant tracking for the field team. Log usage and purchases in
          seconds, keep a clean audit trail, and export compliance data anytime.
        </p>

        <div className="mt-10 grid gap-4 sm:grid-cols-2">
          <Link
            to="/technician/login"
            className="group rounded-2xl border border-slate-200 bg-white p-6 text-left shadow-sm transition hover:-translate-y-0.5 hover:border-sky-300 hover:shadow-md"
          >
            <p className="text-xs font-semibold uppercase tracking-wide text-sky-600">
              Field Technicians
            </p>
            <p className="mt-1 text-lg font-semibold text-slate-900">Log In</p>
            <p className="mt-2 text-sm text-slate-500">
              Sign in with your first and last name to log refrigerant usage and purchases.
            </p>
            <span className="mt-4 inline-flex items-center text-sm font-medium text-sky-600">
              Continue
              <span className="ml-1 transition group-hover:translate-x-0.5">&rarr;</span>
            </span>
          </Link>

          <Link
            to="/admin/login"
            className="group rounded-2xl border border-slate-200 bg-white p-6 text-left shadow-sm transition hover:-translate-y-0.5 hover:border-slate-400 hover:shadow-md"
          >
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
              Administration
            </p>
            <p className="mt-1 text-lg font-semibold text-slate-900">Admin Dashboard</p>
            <p className="mt-2 text-sm text-slate-500">
              Review the roster, browse all entries, and export data for EPA recordkeeping.
            </p>
            <span className="mt-4 inline-flex items-center text-sm font-medium text-slate-700">
              Continue
              <span className="ml-1 transition group-hover:translate-x-0.5">&rarr;</span>
            </span>
          </Link>
        </div>
      </div>
    </div>
  );
}
