# Heroku deployment

Both Heroku applications run one combined web container. The repository currently uses a **Vue 3/Vite frontend and an Express API** (not React and NestJS). Vite builds the frontend into static files, which the Express app serves from the same origin as `/api`.

| Environment | Heroku app | Branch | Dyno | Database |
| --- | --- | --- | --- | --- |
| Production | `metmma-pharmacy-prod-api` | `main` | One Basic `web` dyno | Existing production Neon database |
| Staging | `metmma-pharmacy-staging` | `staging` | One Eco `web` dyno | Separate Neon staging branch/database |

Routes are `/` for the frontend, `/api/...` for the API, and the existing API health endpoint is `/api/health`. The frontend build uses `VITE_API_BASE_URL=/api`, so browser requests stay on the current app's origin. Heroku supplies `PORT`; do not set it manually.

## Heroku app setup

Create both apps and set their stack to `container`. Do not add Heroku Postgres. In each app's **Resources** settings, select exactly one `web` dyno with the type in the table above. The `release` process is a one-off migration process run during a deployment; it is not an additional long-running dyno.

Set these config vars separately under each app's **Settings → Config Vars**. Use the existing production Neon values for production and a different Neon staging branch/database for staging.

| Config var | Production | Staging |
| --- | --- | --- |
| `NODE_ENV` | `production` | `production` |
| `DATABASE_URL` | Existing production Neon pooled/runtime URL | Staging Neon pooled/runtime URL |
| `MIGRATION_DATABASE_URL` | Existing production Neon direct URL | Staging Neon direct URL |
| `DB_SSL` | `true` | `true` |
| `JWT_SECRET` | Existing production secret (keep unchanged for session continuity) | A different random secret, at least 32 characters |
| `ALLOWED_ORIGINS` | Exact production Heroku app origin and any production custom origin | Exact staging Heroku app origin and any staging custom origin |
| `TRUST_PROXY` | `1` | `1` |
| `PHARMACY_TIMEZONE` | `UTC` to preserve the existing production interpretation | `UTC` unless staging is intentionally configured otherwise |
| `DB_SSL_CA` | Optional provider CA, only if required | Optional provider CA, only if required |

Do not copy production database URLs or `JWT_SECRET` into staging. Do not configure Heroku Postgres. For Neon URLs with `DB_SSL=true`, follow the existing deployment template: remove `sslmode` and `channel_binding` query parameters and URL-encode special characters in credentials. The migration URL must be a direct connection so PostgreSQL advisory locking works.

The app's `DATABASE_URL` and `MIGRATION_DATABASE_URL` are read by the web and release processes for that same Heroku app. Before enabling staging deployment, verify both staging values point to the staging Neon branch. The staging workflow is hard-pinned to the staging Heroku app and cannot select the production app.

## GitHub environments

Create GitHub environments named `production` and `staging`.

| Environment | Secret | Variable |
| --- | --- | --- |
| `production` | `HEROKU_API_KEY` with access to the production app | `HEROKU_API_APP=metmma-pharmacy-prod-api` |
| `staging` | `HEROKU_API_KEY` with access to the staging app | `HEROKU_API_APP=metmma-pharmacy-staging` |

The same Heroku key can be used in both environments if it has access to both apps. Keep Neon credentials and JWT secrets in the Heroku app config, not GitHub or frontend build variables. Each workflow checks that `HEROKU_API_APP` matches its hardcoded expected app before authenticating, building, or pushing.

## Workflows and image build

- `.github/workflows/deploy.yml` runs on pushes to `main` using the `production` environment.
- `.github/workflows/deploy-staging.yml` runs on pushes to `staging` using the `staging` environment.
- Both run backend and frontend checks, build the combined `web` image from the repository root using `backend/Dockerfile`, build the migration image from `backend/Dockerfile.release`, push both images, release `web` and `release`, then check `/api/health` at the app's Heroku Web URL.
- The web image uses a multi-stage build. Frontend development dependencies are used only in the build stage; the runtime image contains the built static assets, backend runtime dependencies, API and migration files.
- The release command remains `npm run migrate`. It keeps the existing advisory lock and direct migration connection. It never runs the database initializer or seed/bootstrap scripts. A failed migration blocks activation of the new web release.

The API only returns the frontend entry point for browser-style GET requests outside `/api`. Unknown `/api` endpoints remain API 404 responses, and missing asset files do not fall through to the frontend HTML.

## Domains and same-origin requests

The workflows get each app's current Heroku Web URL from `heroku apps:info`, so their health check does not depend on an app-name-derived hostname. In **Settings → Domains**, add any custom domain to the matching app, copy the DNS target Heroku supplies, and create the DNS record with your DNS provider. Enable Automated Certificate Management and wait for HTTPS. Add the exact browser origin to that app's `ALLOWED_ORIGINS` if using a custom domain. The frontend and API should use the same domain, with API routes under `/api`.

Vercel-related files and settings are retained for rollback or a future hosting change, but Vercel is no longer part of the deployment path for these two Heroku apps.

## Cutover and rollback

1. Create/configure the staging Heroku app and its separate Neon staging database. Add the `staging` GitHub environment secret and variable.
2. Open a feature PR into `staging`. After review and CI, merge it and verify the staging frontend, API, and database.
3. Configure the production environment variable and confirm the production app still has its existing Neon URLs and JWT secret. Do not change production database credentials during this cutover.
4. Open the reviewed `staging` → `main` release PR. Merging to `main` runs the production checks and deployment. No deployment is run by this documentation change itself.
5. Verify the production workflow health check, then sign in and run a safe smoke check against production.

Existing VPS files under `deploy/`, Neon setup, Vercel configuration, and rollback documentation remain available. For a failed app release, Heroku retains the previously active release; inspect the release output and database migration state before retrying. Database changes already committed by earlier migrations are not reverted by an app rollback.
