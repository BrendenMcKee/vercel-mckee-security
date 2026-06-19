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
auto-deploys on every push to `main`.

> Important: a monorepo does NOT, by itself, stop Vercel from rebuilding on
> backend-only pushes. A `.gitignore` cannot control this either. To skip website
> rebuilds when only the backend changed, set the Vercel **Ignored Build Step**.

Set it once in **Vercel -> Project -> Settings -> Git -> Ignored Build Step**:

```bash
git diff --quiet HEAD^ HEAD -- ':(top)website'
```

How it reads: the command exits `0` (cancel build) when nothing under `website/`
changed, and `1` (build) when it did. So backend-only commits will not trigger a
website deploy.

## Backend (AWS Elastic Beanstalk)

- App: `Express App` · Environment: `nvr-backup` · Region: `ca-central-1`
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
