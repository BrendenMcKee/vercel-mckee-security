# McKee Security Monorepo

Monorepo for [mckeesecurity.ca](https://mckeesecurity.ca): the Next.js marketing site, the customer and admin portals, Starlink rental admin, and the Data Drops backend.

- **Portal (authoritative):** [`PORTAL_PLAN.md`](./PORTAL_PLAN.md) — client dashboard at `/user-dashboard` (Dashboard / Settings / Alerts), staff console at `/admin-dashboard`. Client-facing portal mail stays off until the Billing-tab `GO LIVE` flip (R52 / 9.5.5C). Plain-language accounting companion: [`ACCOUNTING_PLAN.md`](./ACCOUNTING_PLAN.md).
- **Multi-site / extra logins (planned, not built):** [`docs/MULTI_SITE_ACCOUNTS.md`](./docs/MULTI_SITE_ACCOUNTS.md) — account + site + Account admin / Member. Required before county-style import.
- **Portal CUA test (after multi-site ships):** [`docs/PORTAL_CUA_TEST.md`](./docs/PORTAL_CUA_TEST.md) — last gate before the QuickBooks bridge and real import.
- **Requirements baseline (not the current UI spec):** [`PRODUCT_HANDOVER.md`](./PRODUCT_HANDOVER.md)
- **Deployment and workflow:** [`docs/DEPLOYMENT.md`](./docs/DEPLOYMENT.md)
- **Data Drops architecture:** [`docs/DATA-DROPS.md`](./docs/DATA-DROPS.md)
- **Older marketing-migration notes:** [`general.md`](./general.md) (superseded for product work; do not treat as the plan)

## Repository structure

```
vercel-mckee-security/
├── PORTAL_PLAN.md            # Authoritative portal / admin / billing plan
├── ACCOUNTING_PLAN.md        # Stakeholder explainer for the QuickBooks rail
├── PRODUCT_HANDOVER.md       # Original requirements baseline
├── docs/                     # Deployment, architecture, MULTI_SITE_ACCOUNTS, PORTAL_CUA_TEST
├── audit/                    # WordPress audit (reference only, not deployed)
├── website/                  # Next.js app (marketing, portals, Starlink, Data Drops). Vercel root.
├── supabase/                 # Portal migrations
└── data-drops-aws-backend/   # Express API for Data Drops (AWS Elastic Beanstalk + RDS)
```

The two apps deploy independently: the website to Vercel, the backend to AWS Elastic Beanstalk. Keeping them in one repo centralizes everything; it does not couple their deploys.

## Apps

### Website (Vercel)

Next.js 16 marketing site, customer portal (`/user-dashboard`), admin portal (`/admin-dashboard`), Starlink rental admin, and the Data Drops UI. The Vercel root directory is `website`. Pushes to `main` auto-deploy.

```bash
cd website
npm install
npm run dev    # http://localhost:3000
```

Project dashboard: https://vercel.com/brendenmckees-projects/vercel-mckee-security

### Data Drops backend (AWS)

Express + MySQL (RDS) API served at `https://app-mckeesecurity.ca/api`, deployed to the `data-drops-app` Elastic Beanstalk environment in `ca-central-1`. The website never calls it cross-origin; it proxies through `website` at `/api/dd/*`.

```bash
cd data-drops-aws-backend
eb deploy      # deploys this folder's working tree to data-drops-app
```

See [`docs/DEPLOYMENT.md`](./docs/DEPLOYMENT.md) and [`data-drops-aws-backend/README.md`](./data-drops-aws-backend/README.md).

## Build behavior

Vercel rebuilds on every push to `main`, including backend-only commits. This is intentional: backend changes are infrequent, and a redundant rebuild just redeploys the same site with no downtime, so we keep it simple.

Optional (not enabled): if backend-only commits ever become frequent, set the Vercel Ignored Build Step (Project Settings -> Git) to `git diff --quiet HEAD^ HEAD -- ':(top)website'`, which skips the build when nothing under `website/` changed.

## Environment variables

### Vercel (website)

| Variable | Purpose |
|----------|---------|
| `RESEND_API_KEY` | Sends form notification emails. Forms still succeed and log to console without it. |
| `CONTACT_EMAIL` | Inbox for form submissions (default: info@mckeesecurity.ca) |
| `EMAIL_FROM` | Sender address for Resend |
| `DATA_DROPS_PASSWORD` | Shared access password for the Data Drops pages |
| `DATA_DROPS_API_URL` | Optional. Data Drops API base. Defaults to `https://app-mckeesecurity.ca/api` |

Portal and Stripe keys are listed in [`PORTAL_PLAN.md`](./PORTAL_PLAN.md) Section 12. The portals also need `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`, and `SUPABASE_SERVICE_ROLE_KEY`.

### AWS Elastic Beanstalk (backend)

`RDS_ENDPOINT`, `RDS_USERNAME`, `RDS_PASSWORD`, `RDS_DB_NAME` are set on the EB environment, never in the repo.

## GitHub

https://github.com/BrendenMcKee/vercel-mckee-security
