# AGENTS.md

Monorepo for [mckeesecurity.ca](https://mckeesecurity.ca). See [`README.md`](./README.md)
for the overview and [`docs/`](./docs) for deployment/architecture. Note: the older
[`general.md`](./general.md) plan predates the Supabase portal and is not authoritative;
`PORTAL_PLAN.md` / `PRODUCT_HANDOVER.md` and the code are.

## Cursor Cloud specific instructions

### Services and how to run them (local dev)

- Website (Next.js 16, the main product surface): `cd website && npm run dev` (http://localhost:3000).
  Hosts the marketing site, customer portal (`/user-dashboard`), admin portal (`/admin-dashboard`),
  Starlink rental + admin, and the Data Drops UI. Standard scripts live in `website/package.json`.
- Lint: `cd website && npm run lint`. The command works but the checked-in code currently has
  pre-existing lint errors/warnings; a clean exit is not expected on an unmodified tree.
- There is no automated test suite. `data-drops-aws-backend` has a placeholder `test` script, and
  `website/scripts/*-check.mjs` are ad-hoc manual check scripts, not a runner. Four are worth
  re-running after UI or email changes:
  - `mobile-audit.mjs` — both portals in a real browser at an iPhone viewport (needs seeded Supabase
    users). Flags horizontal overflow and screenshots every page.
  - `starlink-admin-ui-check.mjs` — the Starlink admin at 390/740x360/768/1024/1920 against a running
    dev server. Needs `STARLINK_ADMIN_PASSWORD` set for both the server and the script. Measures
    document width, tap-target and focused-font sizes, the booking modal's sticky bars, and the kit
    availability path including the double-booking confirm dialog.
  - `email-render-check.mjs` — renders the Starlink reminder emails through the real send path with
    `fetch` stubbed (nothing is sent) and asserts the things that break silently in mail clients:
    rgba() text colours, block elements orphaned out of a `<p>`, unwrappable long values, escaping,
    absolute deep links, and Gmail's clipping threshold. Run it with the alias loader:
    `node --import ./scripts/register-ts-alias.mjs scripts/email-render-check.mjs`. That loader
    (`ts-alias-loader.mjs`) is what lets a plain Node script import the app's own `@/`-aliased
    TypeScript; it also stubs `server-only`. It writes the rendered HTML plus a phone and desktop
    screenshot of each email, which is the quickest way to check a copy or layout change.
  - `elfsight-reviews-check.mjs` — the Google reviews widget on the homepage and `/gallery`, at a
    phone and a desktop viewport, against a running dev server. Needs internet access
    (`elfsightcdn.com`). Reviews come from a paid Elfsight embed whose failure mode is silent, so
    this asserts that the right one of the two configured widgets mounts, that it fills with real
    review text rather than Elfsight's loading skeleton, that it still renders after an in-app
    navigation and a resize across the breakpoint (their `platform.js` only scans the DOM for
    containers once), that the widget's rendered height still matches the space the component
    reserves for it, that the band collapses when Elfsight is blocked, and that the retired
    `/api/reviews` route is gone.

  All four write screenshots to gitignored directories.
- Data Drops backend (`data-drops-aws-backend`, Express + MySQL): rarely run locally. The website's
  `/api/dd/*` proxy defaults to the live AWS API (`DATA_DROPS_API_URL`), so you do not need it for
  portal/marketing work. To run it you must supply a MySQL and `RDS_*` env vars; see its `README.md`.

### Local Supabase is required for the portal/admin/Starlink flows

The portal reads `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`, and
`SUPABASE_SERVICE_ROLE_KEY` (non-null asserted), so those routes need a running Supabase.
The environment ships with Docker and the Supabase CLI already installed.

1. Start Docker if it is not running: `sudo dockerd > /tmp/dockerd.log 2>&1 &`
   (Docker 29 here is configured for `fuse-overlayfs` with the containerd snapshotter disabled in
   `/etc/docker/daemon.json`, plus `iptables-legacy`; without that config the daemon fails to start.)
2. From the repo root: `sudo supabase start`. This also applies `supabase/migrations`. Get the local
   URL/keys with `sudo supabase status` and put them in `website/.env.local` (gitignored).

### NON-OBVIOUS GOTCHA: grant table privileges after `supabase start` / `db reset`

The local Postgres image grants only `Dxtm` (no SELECT/INSERT/UPDATE/DELETE) on `public` tables to
`anon`/`authenticated`/`service_role`, so the portal fails with `permission denied for table profiles`
(seed script and every portal read/write). Hosted Supabase grants full DML automatically. The
migrations do not grant explicitly, so after every `supabase start` or `supabase db reset` run:

```
sudo docker exec -i "$(sudo docker ps --format '{{.Names}}' | grep supabase_db)" \
  psql -U postgres -d postgres <<'SQL'
grant all on all tables in schema public to anon, authenticated, service_role;
grant all on all sequences in schema public to anon, authenticated, service_role;
grant all on all routines in schema public to anon, authenticated, service_role;
alter default privileges in schema public grant all on tables to anon, authenticated, service_role;
alter default privileges in schema public grant all on sequences to anon, authenticated, service_role;
alter default privileges in schema public grant all on routines to anon, authenticated, service_role;
SQL
```

### Seeding an admin to log in with

`scripts/seed-admin.mjs` creates a passwordless auth user (intended for Google sign-in / reset flow).
For local email+password login, seed then set a password via the admin API:

```
cd website
node --env-file=.env.local scripts/seed-admin.mjs <email> <first> <last>
# then set a password on that user with supabase.auth.admin.updateUserById(...)
```

Local Supabase disables email confirmation and catches outbound mail in Mailpit (http://127.0.0.1:54324).

### Graceful degradation (expected locally, not failures)

Missing `RESEND_API_KEY` (email logs to console; portal invites show "invitation email failed to send,
copy the link"), `STRIPE_*` (billing/checkout disabled), and the Data Drops / Starlink admin password
gates all degrade gracefully. Only Supabase is hard-required for the portal.

### Next.js 16 note

This pins a future Next.js with breaking changes; see `website/AGENTS.md` and read
`website/node_modules/next/dist/docs/` before writing Next code.
