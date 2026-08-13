# Refrigerant Log — MTS

A digital refrigerant tracking log for the field team, built for EPA Section 608
recordkeeping. Technicians sign in individually and log usage and purchases;
admins get a separate dashboard to view the roster, browse all data, and
export it for compliance reporting.

## Features

- **Technician sign-in** — enter first and last name; new technicians are
  added to the roster automatically. No shared password.
- **Admin dashboard** — separate password-protected login with its own
  session. View the technician roster, all usage logs, and all purchases at a
  glance.
- **Refrigerant usage log** — date (calendar picker), equipment ID, location,
  refrigerant type (dropdown), service type (dropdown), amount added/recovered,
  notes.
- **Refrigerant purchasing log** — date, refrigerant type, quantity, cost,
  supplier, invoice number.
- **CSV export** — admin can export usage logs and purchases separately,
  with optional filters by technician, refrigerant type, and date range.
- **Modern, responsive UI** — works on phones and tablets in the field.

## Project structure

```
server/   Express API + JSON file datastore (server/data/db.json, auto-created)
client/   React + Vite + Tailwind frontend
```

## Requirements

- Node.js 18+

## Setup

```bash
npm run install:all
```

## Run in development

```bash
# Set an admin password (defaults to "ChangeMe123!" if omitted)
export ADMIN_PASSWORD=your-secure-password

npm run dev
```

This starts the API on `http://localhost:4000` and the frontend on
`http://localhost:5173` (the frontend proxies `/api` requests to the backend).
Open `http://localhost:5173` in your browser.

## Production build

```bash
npm run build      # builds client/dist
ADMIN_PASSWORD=your-secure-password JWT_SECRET=a-long-random-string npm start
```

`npm start` runs a single server on port 4000 (override with `PORT`) that
serves both the API (`/api/*`) and the built frontend (everything else),
so the whole app lives behind one URL — e.g. `https://yourapp.com/` for
technicians and `https://yourapp.com/admin/login` for admins.

### Environment variables

| Variable         | Description                                                        | Default                    |
|------------------|----------------------------------------------------------------------|-----------------------------|
| `ADMIN_PASSWORD` | Initial admin password (only used the first time the data file is created — change it from Admin → Settings afterward) | `ChangeMe123!` |
| `JWT_SECRET`     | Secret used to sign login sessions. Set a long random value in production. | `dev-secret-change-in-production` |
| `PORT`           | Server port                                                        | `4000`                      |
| `DB_PATH`        | Path to the JSON data file. Point this at a persistent disk in production (see below) — otherwise data is lost on every redeploy/restart. | `server/data/db.json` |

## Deploying to Render (recommended)

This repo includes a `render.yaml` blueprint that provisions everything
needed as a single web service — one URL for both technicians and admin.

1. Push this repo to GitHub (already done if you're reading this from the repo).
2. In the [Render dashboard](https://dashboard.render.com), click **New +** → **Blueprint**, and select this repository. Render will read `render.yaml` automatically.
3. Render will prompt for the `ADMIN_PASSWORD` environment variable (it's marked `sync: false` in the blueprint so it isn't stored in the repo) — set it to whatever you want the admin password to be. `JWT_SECRET` is generated automatically.
4. Deploy. Render builds the client, starts the server, and attaches a 1 GB persistent disk mounted at `/var/data` for `server/data/db.json` (via `DB_PATH`) so your team's data survives restarts and redeploys.
5. Once live, your links are:
   - **Technicians:** `https://<your-service>.onrender.com/technician/login` (or just the root URL — the landing page links to it)
   - **Admin:** `https://<your-service>.onrender.com/admin/login`

The blueprint uses Render's **Starter** plan — the free tier doesn't
support persistent disks, so on free tier your data would be wiped on
every restart. If you later add a custom domain in Render, the same
`/technician/login` and `/admin/login` paths carry over.

### Deploying elsewhere

The app is a single Node process (`npm start`) that serves both the API
and the static frontend, so it runs on Railway, Fly.io, a plain VPS, or
any Node host the same way: run `npm run install:all && npm run build`,
then `npm start`, with `ADMIN_PASSWORD`, `JWT_SECRET`, and a `DB_PATH`
pointed at persistent storage set as environment variables.

## Data storage

Data is stored in `server/data/db.json` (gitignored — it holds your team's
real log data, not sample data). Back this file up regularly; there's no
external database dependency, so a copy of this file is a full backup.

## EPA 608 notes

The usage log captures the fields commonly required for refrigerant
recordkeeping: date of service, technician, equipment/unit identifier,
location, refrigerant type, service performed, and amount added vs.
recovered. Export the CSV from the admin dashboard for audits or EPA
recordkeeping requests.
