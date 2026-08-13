# Refrigerant Log — MTS

A digital refrigerant tracking log for the field team, built for EPA Section 608
recordkeeping. Technicians sign in individually and log usage and purchases;
admins get a separate dashboard to view the roster, browse all data, and
export it for compliance reporting.

Runs on Cloudflare Workers with a D1 (SQLite) database — no separate server
or database to manage, and it's free at this app's scale.

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
- **Export** — CSV download, copy-to-clipboard, or a pre-filled email
  template, available for the roster, usage logs, and purchases (with
  optional filters by technician, refrigerant type, and date range).
- **Modern, responsive UI** — works on phones and tablets in the field.

## Project structure

```
worker/   Cloudflare Worker API (Hono) + D1 database
client/   React + Vite + Tailwind frontend
```

In production, the Worker serves both the API (`/api/*`) and the built
frontend (everything else, with client-side routing fallback), so the whole
app lives behind one URL.

## Requirements

- Node.js 18+
- A [Cloudflare account](https://dash.cloudflare.com/sign-up) (free tier is enough)

## Setup

```bash
npm run install:all
```

## Run in development

```bash
npm run dev
```

This starts the Worker (via `wrangler dev`, using a local D1 emulation — no
Cloudflare account needed for local dev) on `http://localhost:8787` and the
frontend on `http://localhost:5173` (the frontend proxies `/api` requests to
the Worker). Open `http://localhost:5173` in your browser.

Local environment variables (`JWT_SECRET`, `ADMIN_PASSWORD`) go in
`worker/.dev.vars` (gitignored):

```
JWT_SECRET=any-local-dev-value
ADMIN_PASSWORD=admin123
```

The first time you run the app, apply the database schema locally:

```bash
npm run db:migrate:local
```

## Deploying to Cloudflare

1. **Log in to Cloudflare** (one-time):
   ```bash
   cd worker
   npx wrangler login
   ```
2. **Create the D1 database:**
   ```bash
   npx wrangler d1 create refrigerant-log-mts
   ```
   This prints a `database_id` — copy it into `worker/wrangler.toml`,
   replacing `REPLACE_WITH_YOUR_D1_DATABASE_ID`.
3. **Apply the schema to the real database:**
   ```bash
   npm run db:migrate:remote
   ```
4. **Set secrets** (these are encrypted by Cloudflare, not stored in the repo):
   ```bash
   npx wrangler secret put JWT_SECRET
   npx wrangler secret put ADMIN_PASSWORD
   ```
   Pick a long random value for `JWT_SECRET` and whatever you want the admin
   login password to be for `ADMIN_PASSWORD`.
5. **Deploy** (from the repo root):
   ```bash
   npm run deploy
   ```
   This builds the frontend and runs `wrangler deploy`.

Once deployed, Wrangler prints your live URL — something like
`https://refrigerant-log-mts.<your-subdomain>.workers.dev`. Your links are:

- **Technicians:** `<that URL>/technician/login` (or just the root — the
  landing page links to it)
- **Admin:** `<that URL>/admin/login`

To use a custom domain instead of the `workers.dev` subdomain, add a Route
or Custom Domain to the Worker in the Cloudflare dashboard — the same
`/technician/login` and `/admin/login` paths carry over.

### Redeploying after changes

Any time you change the app, just run `npm run deploy` again from the repo
root. If you change `worker/migrations/`, also run
`npm run db:migrate:remote` first.

## Environment variables / secrets

| Variable         | Where it's set                          | Description                                                        |
|------------------|-------------------------------------------|----------------------------------------------------------------------|
| `ADMIN_PASSWORD` | `worker/.dev.vars` (local) / `wrangler secret put` (production) | Admin login password. Change it later from Admin → Settings in the app. |
| `JWT_SECRET`     | `worker/.dev.vars` (local) / `wrangler secret put` (production) | Secret used to sign login sessions. Use a long random value in production. |

## Data storage

Data lives in a Cloudflare D1 database (SQLite), configured in
`worker/wrangler.toml` and defined by the schema in `worker/migrations/`.
D1's free tier (5 GB storage, tens of millions of row reads/month) is far
more than this app needs. To back up your data, run:

```bash
npx wrangler d1 export refrigerant-log-mts --remote --output backup.sql
```

## EPA 608 notes

The usage log captures the fields commonly required for refrigerant
recordkeeping: date of service, technician, equipment/unit identifier,
location, refrigerant type, service performed, and amount added vs.
recovered. Export from the admin dashboard (CSV, clipboard, or email) for
audits or EPA recordkeeping requests.
