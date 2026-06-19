# Data Drops Backend (Network Run Confirmation API)

Express + MySQL API behind the McKee Security "Data Drops" tool, used to track and
confirm network data runs (cabling drops) per site and date, with technician and
administrator sign-off.

This lives in the [vercel-mckee-security monorepo](../README.md). The website
(`../website`) never calls this API cross-origin; it proxies through Next at
`/api/dd/*`. See [`../docs/DATA-DROPS.md`](../docs/DATA-DROPS.md) for the full
architecture and [`../docs/DEPLOYMENT.md`](../docs/DEPLOYMENT.md) for deploy steps.

## Stack

- Node.js (Elastic Beanstalk platform: Node.js 22 on Amazon Linux 2023)
- Express, `mysql2` connection pool, `cors`, `nodemailer`, `node-cron`
- ES Modules (`"type": "module"`)
- AWS Elastic Beanstalk (env `data-drops-app`, region `ca-central-1`) + RDS MySQL
- TLS to RDS via `certs/ca-central-1-bundle.pem`

## Multi-tenancy

All data is partitioned by `site_domain`. The two tenants are `hhhs` (Haliburton
Highlands Health Services) and `mckeesecurity` (internal). Requests pass the tenant
as `domain` (query string on `GET /api/sites`) or `site_domain` (JSON body on
everything else).

## API endpoints

### Sites

- `GET /api/sites?domain=<tenant>` - list sites for a tenant
- `GET /api/sites/:id` - get one site
- `POST /api/sites` - create (`site_name`, `site_code`, `site_domain`)
- `PUT /api/sites/:id` - update (`site_name`, `site_code`, `old_site_name`, `site_domain`)
- `DELETE /api/sites/:id` - delete (`admin_password`, `site_domain`)

### Network data

- `POST /api/network-data/site/initialize` - create a date entry for a site
- `POST /api/network-data/drops` - add a drop
- `PUT /api/network-data/drops` - edit a drop
- `DELETE /api/network-data/drops` - delete a drop (`admin_password`)
- `POST /api/network-data/drops/:site_name` - all drops for a site
- `POST /api/network-data/drops-by-date` - drops for a site + date
- `POST /api/network-data/date/:site_name` - date entries (with signatures + request state) for a site
- `DELETE /api/network-data/site-data-by-date` - delete a whole day (`admin_password`)
- `PUT /api/network-data/update-date` - move a day to a new date
- `PUT /api/network-data/signatures` - set or revoke `signature_tech` / `signature_admin` (send `"REVOKE_SIGNATURE"` to clear)
- `POST /api/notify-signer` - email a signature request and record `req_signature_date` / `req_signature_email`

The `admin_password` for destructive actions is validated server-side against the EB
environment configuration. It is separate from the website's page-access password.

## Environment variables (set on the EB environment, never in the repo)

```
RDS_ENDPOINT=your-db-instance.region.rds.amazonaws.com
RDS_USERNAME=your_username
RDS_PASSWORD=your_password
RDS_DB_NAME=your_database_name
PORT=3000   # optional, defaults to 3000
```

## Local development

```bash
npm install
# export the RDS_* vars (a local .env is gitignored)
node app.js
```

## Deploy

The EB CLI is configured via `.elasticbeanstalk/config.yml` (app `data-drops-app`,
env `data-drops-app`, profile `eb-cli`). `.ebignore` scopes the bundle to this folder
and lets deploys include uncommitted changes.

```bash
eb deploy
```

AWS credentials live in `~/.aws/credentials` under the `eb-cli` profile (never in the
repo). The Elastic Beanstalk platform runs `npm install` during deploy, so
`node_modules` is not uploaded.

## Author

Brenden McKee
