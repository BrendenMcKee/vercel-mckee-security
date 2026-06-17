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

## Vercel Setup

When connecting in the Vercel dashboard:

1. Import the GitHub repo `vercel-mckee-security`
2. Set **Root Directory** to `website`
3. Framework preset: Next.js (auto-detected)
4. Deploy

## Local Development

```bash
cd website
npm install
npm run dev
```

Open http://localhost:3000
