# Production API deployment

This setup deploys only the production API to Heroku. The frontend remains on Vercel and the API continues using the existing production Neon database.

| Component | Host | Branch | Database |
| --- | --- | --- | --- |
| Production API | Heroku app `metmma-pharmacy-prod-api` | `main` | Existing Neon production database |
| Production frontend | Existing Vercel project | `main` | None |
| Staging API and frontend | No deployment from this workflow | `staging` | None |

## Heroku app setup

Create or select the Heroku app named `metmma-pharmacy-prod-api`. Before building or pushing images, the GitHub workflow authenticates with the production `HEROKU_API_KEY`, checks the app's current stack, and sets it to `container` if needed.

Do **not** add a Heroku Postgres add-on. Heroku supplies the API's `PORT` value at runtime; the existing backend server listens on it.

Set these config vars in the Heroku app's **Settings → Config Vars**:

| Config var | Value |
| --- | --- |
| `NODE_ENV` | `production` |
| `DATABASE_URL` | Existing production Neon connection URL used by the current API |
| `MIGRATION_DATABASE_URL` | Neon direct (non-pooler) URL for migrations |
| `DB_SSL` | `true` |
| `JWT_SECRET` | The current production secret, copied securely from the existing API host |
| `TRUST_PROXY` | `1` |
| `PHARMACY_TIMEZONE` | `UTC` to preserve current timestamp interpretation |
| `ALLOWED_ORIGINS` | The exact production Vercel frontend origin, without a trailing slash or `/api` |

The migration runner reads `MIGRATION_DATABASE_URL`, takes the existing PostgreSQL advisory lock, and uses the direct connection. Keep those migration files and scripts unchanged. For Neon URLs used with `DB_SSL=true`, follow the existing deployment template: remove query parameters such as `sslmode` and `channel_binding`, and URL-encode special characters in credentials.

Keep `JWT_SECRET` equal to the current production value during cutover so active signed sessions continue to validate. Never put the database URL or JWT secret in GitHub source or Vercel frontend variables.

## GitHub Actions setup

Open the repository's **Settings → Environments → production** and add this environment secret:

| Name | Value |
| --- | --- |
| `HEROKU_API_KEY` | A Heroku API key permitted to deploy `metmma-pharmacy-prod-api` |

The workflow hardcodes the specified app name; it requires no Heroku app-name or frontend build variables. It runs on pushes to `main` only, after backend checks and unit tests pass. It authenticates to Heroku, ensures the app uses the `container` stack, builds both backend Docker images from the repository root, pushes the `web` and `release` process images, releases them together to Heroku, and checks `/api/health` on the app's Heroku hostname.

The Heroku API key is only used by this workflow; API runtime settings and Neon credentials belong in the Heroku app config vars above.

## Database and migration safety

The release image runs only:

```sh
npm run migrate
```

It does **not** run `db:init`. Production already has a Neon database, and the API migration code retains its direct-connection and advisory-lock behavior. Do not add an initializer to the release command. Before the first Heroku release, take and verify a Neon backup. A failed migration must block the release; inspect the migration and database state before retrying.

No staging database is connected or deployed by this workflow. Never point the production Heroku app at a staging database.

## API domain and Vercel frontend

The workflow's health check uses Heroku's default hostname, so it works before custom DNS is configured. In Heroku **Settings → Domains**, add `api.metmmapharmacy.com`, copy the DNS target Heroku gives you, and create the corresponding CNAME record at your DNS provider. Enable Automated Certificate Management and wait for the certificate to be issued. Do not use a Heroku IP address. If using Cloudflare DNS, use DNS-only while Heroku verifies the record and provisions HTTPS.

The existing Vercel configuration in `frontend/vercel.json` remains in place. In the existing Vercel project, keep the project root as `frontend`, build command `npm run build`, and output directory `dist`. Confirm the production branch is `main` and set the Vercel **Production** environment variable:

```text
VITE_API_BASE_URL=https://api.metmmapharmacy.com
```

The frontend client appends `/api` to this bare API origin. Redeploy the Vercel frontend after setting or changing the variable. Do not add a Heroku frontend app or staging deployment through this workflow.

## Cutover order

1. Configure the Heroku production app, its Neon config vars, the `production` GitHub environment secret, and the Vercel production API URL.
2. Open a reviewed PR into `staging`, then a reviewed release PR into `main` as required by the [branching policy](BRANCHING_WORKFLOW.md). Merging into `main` runs backend checks, tests, migrations, and the Heroku API deployment.
3. Check the workflow health step and Heroku logs. Test the API on its Heroku hostname.
4. Point `api.metmmapharmacy.com` to the Heroku DNS target and wait for HTTPS. Confirm the existing Vercel site can sign in and complete a safe workflow against the production API.
5. Redeploy the Vercel frontend with `VITE_API_BASE_URL=https://api.metmmapharmacy.com` if the deployed build was made before the API domain was configured.

The old VPS files under `deploy/` remain as rollback assets. The GitHub deploy workflow no longer deploys to the VPS. Keep the existing Neon backup schedule active; the Heroku API dyno does not run the VPS/R2 backup timer.
