# Elevate Marketing CRM

A private, internal CRM and business management platform for Elevate Marketing — built with Next.js
(App Router), TypeScript, Tailwind CSS v4, and Prisma. Everything behind the login screen is real and
backed by a database: nothing is mocked, and refreshing or coming back later never loses data.

Covers clients (with per-client workspaces), projects, tasks, contracts with a self-hosted
e-signature flow, invoices with on-device OCR, finance reporting, and partner/profit-share
management for Unais, Jamal and Sazid.

## First-time setup

```bash
npm install
cp .env.example .env          # fill in CRM_SESSION_SECRET (openssl rand -hex 32)
npx prisma migrate deploy     # creates prisma/dev.db (SQLite, gitignored)
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
- **Database** — SQLite out of the box for zero-setup local use. **Important if you deploy this**:
  SQLite's local file won't survive on a serverless host like Vercel (the filesystem isn't persistent
  across invocations). Before deploying anywhere other than a traditional always-on server, point
  `DATABASE_URL` at a real Postgres database (e.g. [Neon](https://neon.tech) or
  [Supabase](https://supabase.com), both have free tiers) and change the `provider` in
  `prisma/schema.prisma` from `"sqlite"` to `"postgresql"` — the schema itself is portable, this is a
  one-line change plus re-running `prisma migrate deploy` against the new database.
- **File storage** — stored on local disk under `storage/uploads/` (gitignored), served only to
  logged-in users. On a serverless host this has the same non-persistence problem as SQLite — swap in
  cloud storage (e.g. Supabase Storage or S3) before deploying there.

## Deploying it privately (e.g. to sell/run for a business)

1. Switch the database to Postgres as above (Neon/Supabase free tier is enough to start).
2. Deploy to Vercel (or similar) — the `/crm/login` screen is already the private password gate,
   nothing extra needed for that part. Add a custom domain if you want one.
3. Set the environment variables from `.env.example` in your hosting provider's dashboard.
4. Run `npx prisma migrate deploy` once against the production database, then `npm run db:seed` (or
   create accounts by hand) to get your first logins.

## Build & test

```bash
npm run build
npm run lint
npm test
```
