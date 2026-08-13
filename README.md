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
- **Installable as an app (PWA)** — technicians and admins can add it to
  their phone's home screen with its own icon, so it opens like a native
  app instead of a browser tab. See "Installing on a phone" below.
- **Works through spotty signal** — if a technician loses connection while
  filling out a log or purchase (basements, rural sites, etc.), the entry
  saves on the device and sends automatically once they're back online,
  with a visible "Pending sync" indicator until it does.
- **Automated backups** — a full snapshot of the roster, usage logs, and
  purchases is saved to Cloudflare R2 every day and kept for 90 days.
  Admins can also trigger a backup on demand and download any snapshot
  from Admin → Settings.
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
4. **Create the R2 bucket for automated backups:**
   ```bash
   npx wrangler r2 bucket create refrigerant-log-mts-backups
   ```
   The bucket name must match `bucket_name` in `worker/wrangler.toml`.
5. **Set secrets** (these are encrypted by Cloudflare, not stored in the repo):
   ```bash
   npx wrangler secret put JWT_SECRET
   npx wrangler secret put ADMIN_PASSWORD
   ```
   Pick a long random value for `JWT_SECRET` and whatever you want the admin
   login password to be for `ADMIN_PASSWORD`.
6. **Deploy** (from the repo root):
   ```bash
   npm run deploy
   ```
   This builds the frontend and runs `wrangler deploy`.

Once deployed, Wrangler prints your live URL — something like
`https://refrigerant-log-mts.<your-subdomain>.workers.dev`. Your links are:

- **Technicians:** `<that URL>/technician/login` (or just the root — the
  landing page links to it)
- **Admin:** `<that URL>/admin/login`

Steps 1–5 above are one-time setup. After that, you don't need to run
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

## Installing on a phone

The app is a PWA (installable web app) — no app store needed.

- **Android (Chrome):** open the site, tap the **⋮** menu → **Add to Home
  screen** / **Install app**. Chrome may also show an install banner
  automatically.
- **iPhone/iPad (Safari):** open the site, tap the **Share** icon → **Add to
  Home Screen**. (Push-style install prompts don't exist on iOS Safari —
  this manual step is how every PWA gets installed there.)

Either way, it adds a home screen icon that opens the app full-screen, no
browser address bar. It's the same live site, not a separate download —
signing in and all data work exactly the same.

## Working offline

Technicians can fill out and submit a usage log or purchase entry even with
no signal, as long as the app was already open when they lost connection
(the realistic field scenario — open it with signal, walk into a basement,
keep working). The entry is saved on the device and shows a "Pending sync"
badge in **My Entries**; a banner at the top of the Field Log page shows how
many entries are waiting and syncs them automatically the moment the
connection comes back (or tap **Sync now** to retry manually).

**Limitation:** this doesn't make the app itself load while fully offline
from a cold start — if a technician closes the app/browser entirely while
offline and tries to reopen it, it won't load until they're back online.
Caching the app shell for a true cold-start offline load was deliberately
left out: it would mean the service worker could serve a stale version of
the app after a deploy, which is a real risk for compliance software. The
tradeoff favors always running the current version over working from a
fully closed state with no signal.

**How the offline queue protects against data loss:**

- The app requests [persistent storage](https://developer.mozilla.org/en-US/docs/Web/API/StorageManager/persist) on load, which tells the browser not to
  auto-evict the offline queue under storage pressure (best-effort — not
  all browsers grant it, but the queue works either way).
- An entry is only ever removed from the device once the server has
  actually confirmed it was saved — never on a guess.
- If saving to the device itself fails (e.g. private/incognito browsing,
  which blocks this kind of storage in some browsers) the form does
  **not** clear and does **not** claim success — it shows a clear warning
  telling the technician to screenshot or write down the entry as a
  backup, since in that specific case there's nowhere left to safely
  auto-save it.
- If a queued entry keeps failing to sync for a reason other than "still
  offline" (rare — e.g. an expired session), its badge in **My Entries**
  changes from "Pending sync" to "Sync issue" so it doesn't sit silently
  unnoticed.

## Data storage

Data lives in a Cloudflare D1 database (SQLite), configured in
`worker/wrangler.toml` and defined by the schema in `worker/migrations/`.
D1's free tier (5 GB storage, tens of millions of row reads/month) is far
more than this app needs.

### Automated backups

Every day, the same scheduled job that checks for reminder emails also
takes a full JSON snapshot of the roster, usage logs, and purchases and
saves it to a Cloudflare R2 bucket (`refrigerant-log-mts-backups`). R2's
free tier (10 GB storage) comfortably covers years of daily snapshots at
this app's scale. Backups older than 90 days are pruned automatically.

From Admin → Settings → **Database backups**, you can trigger a backup
immediately ("Back up now") and download any of the recent snapshots as a
JSON file — useful before a risky change, or just for peace of mind.

This requires the one-time `wrangler r2 bucket create
refrigerant-log-mts-backups` step from deployment (see above) — without
it, the daily backup will fail (logged, but won't block reminder emails)
and the Backups card in Settings will show an error.

### Manual export

You can also export the raw SQLite database directly at any time:

```bash
npx wrangler d1 export refrigerant-log-mts --remote --output backup.sql
```

## EPA 608 notes

The usage log captures the fields commonly required for refrigerant
recordkeeping: date of service, technician, equipment/unit identifier,
location, refrigerant type, service performed, and amount added vs.
recovered. Export from the admin dashboard (CSV, clipboard, or email) for
audits or EPA recordkeeping requests.
