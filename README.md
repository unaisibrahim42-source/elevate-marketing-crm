# Elevate Marketing CRM

A private, internal CRM and business management platform for Elevate Marketing — built with Next.js
(App Router), TypeScript, Tailwind CSS v4, and Prisma. Everything behind the login screen is real and
backed by a database: nothing is mocked, and refreshing or coming back later never loses data.

Covers clients (with per-client workspaces), projects, tasks, contracts with a self-hosted
e-signature flow, invoices with on-device OCR, finance reporting, and partner/profit-share
management for Unais, Jamal and Sazid.

## First-time setup

Needs a Postgres database — a free one at [neon.tech](https://neon.tech) or [supabase.com](https://supabase.com)
takes under a minute to create.

```bash
npm install
cp .env.example .env          # fill in DATABASE_URL and CRM_SESSION_SECRET (openssl rand -hex 32)
npx prisma migrate deploy     # creates the tables
npm run db:seed               # creates Unais / Jamal / Sazid logins
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) — it redirects straight to the login screen. The
seed script prints a temporary shared password (`ChangeMe123!` by default, or whatever
`CRM_SEED_PASSWORD` is set to) — log in with any of the three seeded emails and change it immediately
from **Settings → Change My Password**.

## Structure

- `app/crm/login` — the password gate (public)
- `app/crm/sign/[token]` — the public, unauthenticated contract-signing page
- `app/crm/(dashboard)/*` — everything else (overview, clients, projects, tasks, documents, finance,
  people, partners, settings) — gated by `proxy.ts` + a server-side session check in
  `app/crm/(dashboard)/layout.tsx`
- `app/api/crm/files/[documentId]` — serves uploaded files, only to logged-in users
- `lib/actions/*` — all the Server Actions (CRUD, activity logging, notifications)
- `lib/*.ts` — pure business logic (money, dates, contract status, invoice/payment math, profit splits)
  — covered by the tests in `tests/`
- `prisma/schema.prisma` — the full data model
- `components/crm/*` — UI

## What's real vs. what needs configuring

A few integrations are genuinely functional out of the box with no setup, and a couple are
intentionally left as "configure before use" rather than faked:

- **E-signatures** — fully self-hosted (no DocuSign/HelloSign account needed): secure per-contract
  signing links, typed + drawn signature capture, consent and audit trail, auto status transitions.
- **Invoice OCR** — runs on-device with Tesseract (no API key); scans JPG/PNG uploads only, PDFs need
  manual entry.
- **Email sending** — not configured by default. Until you set `CRM_SMTP_HOST` / `_USER` / `_PASS` /
  `_FROM`, contract-signing links are generated and shown for you to copy/share manually instead of
  being silently "sent". The Settings page shows live status for this.
- **Database** — Postgres, via `DATABASE_URL`. The `vercel-build` script (`package.json`) runs
  `prisma migrate deploy` and the seed script automatically on every deploy, so a first deploy to
  Vercel sets itself up with no manual migration step. The seed is safe to re-run — it only creates
  the three partner accounts if they don't already exist, so later deploys are a no-op there.
- **File storage** — stored on local disk under `storage/uploads/` (gitignored), served only to
  logged-in users. **This does not persist on Vercel** (serverless filesystems reset between
  invocations) — fine for development, but swap in cloud storage (e.g. Supabase Storage or S3) before
  relying on file uploads in production.

## Deploying to Vercel

1. Create a free Postgres database (Neon or Supabase) and copy its connection string.
2. [Import this repo into Vercel](https://vercel.com/new) — it auto-detects Next.js.
3. In the Vercel project's **Settings → Environment Variables**, add:
   - `DATABASE_URL` — the Postgres connection string from step 1
   - `CRM_SESSION_SECRET` — a random 32+ char string (`openssl rand -hex 32`)
   - `CRM_SEED_PASSWORD` — optional, otherwise defaults to `ChangeMe123!`
   - the `CRM_SMTP_*` and `CRM_NEWS_RSS_URL` vars, optionally, per "What's real vs. what needs
     configuring" above
4. Deploy. The build runs migrations and seeds the three partner accounts automatically — log in with
   any of their emails and the seed password, then change it from Settings immediately.
5. The `/crm/login` screen is already the private password gate — no extra setup needed for that part.
   Add a custom domain from Vercel's project settings if you want one.

## Build & test

```bash
npm run build
npm run lint
npm test
```
