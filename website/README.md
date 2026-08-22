# McKee Security website

Next.js 16 (App Router) app for [mckeesecurity.ca](https://mckeesecurity.ca):
marketing site, customer portal, admin portal, Starlink rental admin, and the
internal Data Drops tool. This is the `website/` app in the
[vercel-mckee-security monorepo](../README.md) and is the Vercel root directory.

Portal implementation lives in [`../PORTAL_PLAN.md`](../PORTAL_PLAN.md). The
client portal (`/user-dashboard`) is tabbed: **Dashboard** (services, billing,
alarm contacts, equipment), **Settings** (phone, service address, password;
sign-in email is locked), and **Alerts**. The staff console is
`/admin-dashboard` (Overview, Clients, Billing, Devices, Alerts). Client-facing
portal mail (invites, reminders, receipts, caller-ID and device notices) stays
off until the Billing-tab `GO LIVE` confirm (`PORTAL_PLAN.md` 9.5.5C).

## Local development

```bash
npm install
npm run dev    # http://localhost:3000
```

## Stack

- Next.js 16 App Router, TypeScript
- Tailwind CSS 4 (CSS variables), Framer Motion, lucide-react
- React Hook Form + Zod, Resend for email (via API routes)

## Notable areas

- Marketing pages: `src/app/*` and `src/components/*`
- Customer portal: `src/app/(portal)/user-dashboard`, `src/components/portal/*`,
  `src/lib/portal/*`. Tabs are query-param driven (`?tab=settings`, `?tab=alerts`).
- Admin portal: `src/app/(admin-portal)/admin-dashboard`,
  `src/components/admin-portal/*`
- Starlink rental admin: `src/app/starlink-admin`, `src/components/starlink-admin/*`,
  `src/lib/starlink/*`. Profit math: [../docs/STARLINK-PROFITABILITY.md](../docs/STARLINK-PROFITABILITY.md)
- Data Drops tool: `src/app/(data-drops)/*`, `src/app/api/dd/*` (proxy),
  `src/app/api/data-drops/*` (gate), `src/components/data-drops/*`,
  `src/lib/data-drops/*`. See [../docs/DATA-DROPS.md](../docs/DATA-DROPS.md).

## Environment variables (Vercel)

| Variable | Purpose |
|----------|---------|
| `RESEND_API_KEY` | Form notification emails (forms log to console without it) |
| `CONTACT_EMAIL` | Inbox for form submissions |
| `EMAIL_FROM` | Resend sender address |
| `STARLINK_REMINDER_EMAIL` | Optional. Who gets Starlink rental reminders (comma-separated). Defaults to `andi@mckeesecurity.ca`. See [../docs/STARLINK-RENTAL-REMINDERS.md](../docs/STARLINK-RENTAL-REMINDERS.md) |
| `DATA_DROPS_PASSWORD` | Shared access password for the Data Drops pages |
| `DATA_DROPS_API_URL` | Optional. Defaults to `https://app-mckeesecurity.ca/api` |
| `LANVAC_API_BASE` | Set. `https://lanvac.mobi:8843`. Server-only. Does not turn on writes. |
| `LANVAC_DEALER_ACCOUNT` | Set. Dealer `10638`. Server-only. |
| `LANVAC_DEALER_PASSWORD` | Set. WinLinks password. Sensitive, server-only, never `NEXT_PUBLIC_`. |

Portal / Stripe / cron variables are in [`../PORTAL_PLAN.md`](../PORTAL_PLAN.md) Section 12. Local portal work also needs the three Supabase keys in `.env.local`.

QuickBooks bridge secrets are **not** Vercel env vars. `/api/qb/poll`, `/api/qb/report`, and `/api/qb/mirror` authenticate with a per-bridge bearer secret (hash in `qb_bridges`). Create the sandbox row with `scripts/qb-bridge-register.mjs`. Contract: `PORTAL_PLAN.md` 9.5.2A.

## Agent note

This project pins a future Next.js with breaking changes. See [`AGENTS.md`](./AGENTS.md):
read the guides in `node_modules/next/dist/docs/` before writing Next code.

Deployment and the monorepo build workflow are documented in
[../docs/DEPLOYMENT.md](../docs/DEPLOYMENT.md).
