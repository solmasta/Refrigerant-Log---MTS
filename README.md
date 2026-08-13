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
- **Monthly reminder emails** — every technician with an email on file
  automatically gets a reminder to log any outstanding entries before the
  month closes out. The day it fires (1st–31st, default the 28th) is
  configurable from Admin → Settings — in shorter months it fires on the
  actual last day instead of skipping. Admins can also send it on demand.
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

Steps 1–4 above are one-time setup. After that, you don't need to run
`wrangler deploy` by hand again — see the next section.

## Automatic deploys (GitHub Actions)

`.github/workflows/deploy.yml` redeploys the app automatically on every push
to `main` (build → apply any new D1 migrations → `wrangler deploy`). It also
has a "Run workflow" button on the Actions tab for deploying on demand
without pushing a commit.

One-time setup, in the GitHub repo's **Settings → Secrets and variables →
Actions**, add two repository secrets:

| Secret | Where to find it |
|---|---|
| `CLOUDFLARE_API_TOKEN` | [dash.cloudflare.com/profile/api-tokens](https://dash.cloudflare.com/profile/api-tokens) → **Create Token** → use the **Edit Cloudflare Workers** template. If the migration step in the workflow fails with a permissions error, edit the token to add **D1 → Edit** as well. |
| `CLOUDFLARE_ACCOUNT_ID` | Cloudflare dashboard → **Workers & Pages** → your Account ID is shown in the right sidebar. |

This doesn't replace the one-time bootstrap above (D1 database creation and
secrets still need to happen once via `wrangler`) — it just means you never
need to run `npm run deploy` locally again after that.

## Environment variables / secrets

| Variable         | Where it's set                          | Description                                                        |
|------------------|-------------------------------------------|----------------------------------------------------------------------|
| `ADMIN_PASSWORD` | `worker/.dev.vars` (local) / `wrangler secret put` (production) | Admin login password. Change it later from Admin → Settings in the app. |
| `JWT_SECRET`     | `worker/.dev.vars` (local) / `wrangler secret put` (production) | Secret used to sign login sessions. Use a long random value in production. |
| `RESEND_API_KEY` | `worker/.dev.vars` (local) / `wrangler secret put` (production) | Required for monthly reminder emails to actually send. See below. |
| `APP_URL`        | `worker/wrangler.toml` `[vars]` (committed, not secret) | Your live URL, used to build the login link in reminder emails. Already set to your deployment; update if you add a custom domain. |

### Setting up reminder emails

Reminder emails are sent via [Resend](https://resend.com) (free tier: 100
emails/day, 3,000/month — plenty for a small team).

1. Sign up at [resend.com](https://resend.com) and create an API key
   (Dashboard → API Keys → Create API Key).
2. Set it as a Worker secret:
   ```bash
   cd worker
   npx wrangler secret put RESEND_API_KEY
   ```
3. That's it — reminders send from `onboarding@resend.dev` by default, which
   works out of the box without any domain setup. If you'd rather send from
   your own domain (e.g. `reminders@yourcompany.com`), verify that domain in
   Resend, then set a `FROM_EMAIL` secret the same way:
   ```bash
   npx wrangler secret put FROM_EMAIL
   # e.g. "Refrigerant Log MTS <reminders@yourcompany.com>"
   ```

Test it anytime from Admin → Settings → **Send reminder emails now**, without
waiting for the 28th.

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
