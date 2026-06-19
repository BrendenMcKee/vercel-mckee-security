# McKee Security Monorepo

Monorepo for [mckeesecurity.ca](https://mckeesecurity.ca): the Next.js marketing site and the Data Drops backend, managed together so the whole product lives in one place.

- **Master plan and progress:** [`general.md`](./general.md)
- **Deployment and workflow:** [`docs/DEPLOYMENT.md`](./docs/DEPLOYMENT.md)
- **Data Drops architecture:** [`docs/DATA-DROPS.md`](./docs/DATA-DROPS.md)

## Repository structure

```
vercel-mckee-security/
├── general.md                # Master plan and progress tracker
├── docs/                     # Deployment and architecture docs
├── audit/                    # WordPress audit (reference only, not deployed)
├── website/                  # Next.js app (marketing site + Data Drops UI). Vercel root directory.
└── data-drops-aws-backend/   # Express API for Data Drops (AWS Elastic Beanstalk + RDS)
```

The two apps deploy independently: the website to Vercel, the backend to AWS Elastic Beanstalk. Keeping them in one repo centralizes everything; it does not couple their deploys.

## Apps

### Website (Vercel)

Next.js 16 marketing site plus the internal Data Drops tool. The Vercel root directory is `website`. Pushes to `main` auto-deploy.

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

### AWS Elastic Beanstalk (backend)

`RDS_ENDPOINT`, `RDS_USERNAME`, `RDS_PASSWORD`, `RDS_DB_NAME` are set on the EB environment, never in the repo.

## GitHub

https://github.com/BrendenMcKee/vercel-mckee-security
