# McKee Security — Vercel Edition

Modern rebuild of [mckeesecurity.ca](https://mckeesecurity.ca) — Next.js on Vercel, replacing WordPress/Flatsome.

**Master plan:** see [`general.md`](./general.md)

## Repository Structure

```
├── general.md       # Master plan + progress tracker
├── audit/           # WordPress audit (reference — not deployed)
└── website/         # Next.js app → Vercel root directory
```

## GitHub

https://github.com/BrendenMcKee/vercel-mckee-security

## Vercel

**Production URL:** https://vercel-mckee-security.vercel.app  
**Dashboard:** https://vercel.com/brendenmckees-projects/vercel-mckee-security

Root directory is set to `website`. Pushes to `main` auto-deploy.

## Local Development

```bash
cd website
npm install
npm run dev
```

Open http://localhost:3000
