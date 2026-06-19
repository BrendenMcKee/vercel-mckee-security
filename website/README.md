# McKee Security website

Next.js 16 (App Router) marketing site for [mckeesecurity.ca](https://mckeesecurity.ca),
plus the internal Data Drops tool. This is the `website/` app in the
[vercel-mckee-security monorepo](../README.md) and is the Vercel root directory.

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
- Data Drops tool: `src/app/(data-drops)/*`, `src/app/api/dd/*` (proxy),
  `src/app/api/data-drops/*` (gate), `src/components/data-drops/*`,
  `src/lib/data-drops/*`. See [../docs/DATA-DROPS.md](../docs/DATA-DROPS.md).

## Environment variables (Vercel)

| Variable | Purpose |
|----------|---------|
| `RESEND_API_KEY` | Form notification emails (forms log to console without it) |
| `CONTACT_EMAIL` | Inbox for form submissions |
| `EMAIL_FROM` | Resend sender address |
| `DATA_DROPS_PASSWORD` | Shared access password for the Data Drops pages |
| `DATA_DROPS_API_URL` | Optional. Defaults to `https://app-mckeesecurity.ca/api` |

## Agent note

This project pins a future Next.js with breaking changes. See [`AGENTS.md`](./AGENTS.md):
read the guides in `node_modules/next/dist/docs/` before writing Next code.

Deployment and the monorepo build workflow are documented in
[../docs/DEPLOYMENT.md](../docs/DEPLOYMENT.md).
