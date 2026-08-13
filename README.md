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

`npm start` runs the API on port 4000 (override with `PORT`). Serve
`client/dist` with your preferred static host or reverse proxy, forwarding
`/api/*` requests to the API server.

### Environment variables

| Variable         | Description                                                        | Default                    |
|------------------|----------------------------------------------------------------------|-----------------------------|
| `ADMIN_PASSWORD` | Initial admin password (only used the first time the data file is created — change it from Admin → Settings afterward) | `ChangeMe123!` |
| `JWT_SECRET`     | Secret used to sign login sessions. Set a long random value in production. | `dev-secret-change-in-production` |
| `PORT`           | API server port                                                     | `4000`                      |

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
