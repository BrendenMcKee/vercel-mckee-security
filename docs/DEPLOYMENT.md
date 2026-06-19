# Deployment & Monorepo Workflow

This repository is a monorepo containing both deployable apps:

```
vercel-mckee-security/
├── website/                  # Next.js marketing site + Data Drops UI  -> Vercel
└── data-drops-aws-backend/   # Express API (Elastic Beanstalk + RDS)    -> AWS
```

The two deploy to different platforms and should be released independently.

## Frontend (Vercel)

Vercel is connected to this repo with the **Root Directory set to `website/`**. It
auto-deploys on every push to `main`, including backend-only commits.

We intentionally let every push rebuild the site. Backend changes are infrequent, and
a redundant rebuild just redeploys the same site with no downtime, so the simplicity is
worth more than the saved build. Note that a monorepo (or a `.gitignore`) cannot change
this on its own.

Optional optimization (not enabled): if backend-only commits ever become frequent, set
the Vercel **Ignored Build Step** in **Project Settings -> Git** to:

```bash
git diff --quiet HEAD^ HEAD -- ':(top)website'
```

It exits `0` (skip the build) when nothing under `website/` changed, and `1` (build)
when it did. With it set, backend-only commits would not trigger a website deploy.

## Backend (AWS Elastic Beanstalk)

- Application: `data-drops-app` · Environment: `data-drops-app` · Region: `ca-central-1`
- Live API: `https://app-mckeesecurity.ca/api`
- EB CLI profile: `eb-cli`

Deploy from the backend folder:

```bash
cd data-drops-aws-backend
npm install        # only needed locally for testing; EB runs install on deploy
eb deploy
```

`data-drops-aws-backend/.ebignore` makes the EB CLI bundle this folder's working
tree (ignoring git), so deploys are scoped to the backend and can include changes
before they are committed. The EB platform runs `npm install` during deploy, so
`node_modules` is never uploaded.

## Commit guidance

- Keep backend and frontend changes in separate commits where practical, so the
  Vercel Ignored Build Step can cleanly skip backend-only pushes.
- Secrets are never committed. Frontend env vars live in Vercel
  (`DATA_DROPS_PASSWORD`, etc.); backend env vars (`RDS_*`) live in the Elastic
  Beanstalk environment configuration.
