# Vercel/Netlify + VPS + Neon + Cloudflare R2

This is the deployment runbook for the supplied GitHub Actions workflow. It supersedes the older Render instructions. Cloudflare backups here mean **Cloudflare R2 object storage**. No production services or cloud accounts are provisioned by committing these files.

The frontend is built and hosted by Vercel or Netlify. GitHub Actions tests the application against disposable PostgreSQL, builds Linux AMD64 Docker images, and uploads the finished images over SSH. The VPS loads them; it does not clone the repository or install npm dependencies. Caddy serves the API over HTTPS. Neon holds production data. R2 holds daily and pre-deployment database backups.

## 1. Local development (no Neon access)

Requirements: Node 22.12+ (CI uses Node 22), Docker Engine and Docker Compose. From the repository root:

```sh
docker compose up -d --wait
npm ci --prefix backend
npm ci --prefix frontend
npm run migrate:dev --prefix backend
# Optional first local admin; enter a password without placing it in shell history.
export BOOTSTRAP_USERNAME=admin
read -rsp 'Local admin password (10–72 bytes): ' BOOTSTRAP_PASSWORD
export BOOTSTRAP_PASSWORD
npm run bootstrap:dev --prefix backend
unset BOOTSTRAP_USERNAME BOOTSTRAP_PASSWORD
npm run dev --prefix backend
```

In a second terminal:

```sh
npm run dev --prefix frontend
```

Open `http://localhost:5173`. Vite proxies `/api` to `localhost:3000`. The development command explicitly selects `/api`, even if a frontend `.env` contains a production URL.

| Service | Local port | Database / user | Local password | Storage |
| --- | --- | --- | --- | --- |
| `postgres` | 55432 | `metmma_pharmacy` / `metmma_user` | `metmma_local_only` | Named Docker volume |
| `postgres-test` | 55433 | `metmma_test` / `metmma_test` | `metmma_test_only` | Disposable memory filesystem |

Both ports bind only to `127.0.0.1`. These are disposable development credentials. The project name `metmma-development` creates a new development volume; it does not reuse the previous Compose database volume. Existing volumes are preserved.

`dev`, `migrate:dev`, `bootstrap:dev`, and `test:integration:local` override inherited and `.env` database URLs with the local addresses above. Your existing `backend/.env` is untouched. Production commands (`start`, `migrate`, `db:init`, `bootstrap:admin`) deliberately continue using the configured production environment; do not use those for routine local work.

```sh
npm run test:integration:local --prefix backend
npm test --prefix backend
npm test --prefix frontend
docker compose stop
# Start again later; development data survives.
docker compose up -d --wait
```

If Docker requires elevated access, run the Docker commands with `sudo`. `docker compose down` also preserves the development volume; adding `-v` deletes it. Test data disappears when the test container stops.

## 2. Prepare Neon and R2

Create a production Neon database. Use PostgreSQL 16 to match local/CI initially; the backup image has PostgreSQL 18 tools and supports servers through version 18. Before upgrading production, update and rehearse against the same server major version locally and in CI.

Use Neon's **direct connection** (hostname without `-pooler`) for migrations and backups. The app's connection pool already limits connections to 20, so the supplied template also uses a direct connection for the API. If you later select a pooled API URL, keep `MIGRATION_DATABASE_URL` direct. Session advisory locks are used by the migration runner. See [Neon connection pooling](https://neon.com/docs/connect/connection-pooling) and [exporting a Neon database](https://neon.com/docs/guides/export-neon-postgres-compatible).

For these templates, remove the connection URL's query parameters (`?sslmode=...&channel_binding=...`) and URL-encode special characters in the username/password. The API sets `DB_SSL=true` with certificate validation. The backup script enforces `verify-full` and the system CA bundle itself. Do not disable TLS verification.

Create a **private** R2 bucket, e.g. `metmma-backups`. Create R2 S3 credentials with Object Read & Write access restricted to that bucket. Copy the account's S3 endpoint and credentials into `backup.env`; do not make backups public. Configure an R2 lifecycle rule on `metmma/production/` to expire objects after your chosen retention period (30 days is an example, not a legal retention policy). Failed multipart uploads should also expire. The endpoint and AWS CLI compatibility are described in [Cloudflare's R2 CLI guide](https://developers.cloudflare.com/r2/get-started/cli/).

## 3. One-time VPS setup

Use a Linux **x86_64/AMD64** VPS with systemd, Docker Engine, Docker Compose **2.30+**, Bash, curl, gzip, coreutils and util-linux (`flock`). The current workflow builds AMD64 images; an ARM VPS requires changing the build architecture first. Allow inbound SSH and TCP 80/443. No PostgreSQL or API port needs to be opened on the VPS.

Install Docker using the [official installation guide](https://docs.docker.com/engine/install/). Create a dedicated deployment account:

```sh
sudo useradd --create-home --shell /bin/bash metmma
sudo usermod -aG docker metmma
sudo install -d -m 700 -o metmma -g metmma /home/metmma/.ssh
sudo install -d -m 700 -o metmma -g metmma /opt/metmma /opt/metmma/releases
```

Docker-group membership gives host administration capability; reserve this user/key for trusted production deployments. Add the deployment public key to `/home/metmma/.ssh/authorized_keys`, owned by `metmma`, mode `600`. Log in again after changing group membership. Passwordless SSH is required by the workflow.

Point `api.your-domain.example` DNS to the VPS. If using Cloudflare DNS, use **DNS only** for this initial setup: the API trusts exactly one proxy hop (Caddy). Ensure no other service occupies ports 80/443. Caddy obtains and renews HTTPS certificates automatically; see [Caddy HTTPS setup](https://caddyserver.com/docs/quick-starts/https).

Copy and fill these templates on the VPS, using a secure editor or file transfer:

| Repository template | VPS destination | Contents |
| --- | --- | --- |
| `deploy/.env.example` | `/opt/metmma/.env` | Public API hostname only |
| `deploy/backend.env.example` | `/opt/metmma/backend.env` | Neon URLs, JWT secret, frontend origin, business settings |
| `deploy/backup.env.example` | `/opt/metmma/backup.env` | Direct Neon URL and R2 credentials |

```sh
sudo chown metmma:metmma /opt/metmma/.env /opt/metmma/backend.env /opt/metmma/backup.env
sudo chmod 600 /opt/metmma/.env /opt/metmma/backend.env /opt/metmma/backup.env
openssl rand -hex 32
```

Use the generated random value as `JWT_SECRET` and keep it stable across releases. Backend/backup files use Compose's **raw** env-file format: `KEY=value`, no quotes, no shell expansion. Separate files keep R2 credentials out of the API container. Set `ALLOWED_ORIGINS` to the exact frontend HTTPS origin(s), comma separated, without trailing slash or `/api`. Preserve `PHARMACY_TIMEZONE=UTC` for existing data unless its timestamp semantics have been checked. Confirm the pharmacy's tax setting before release.

## 4. GitHub production environment

Create the GitHub environment named **`production`**, with these environment secrets:

| Secret | Value |
| --- | --- |
| `VPS_HOST` | VPS hostname or IP; no `https://` |
| `VPS_USER` | `metmma` |
| `VPS_PORT` | SSH port; optional, defaults to `22` |
| `VPS_SSH_KEY` | Full private deployment SSH key, including BEGIN/END lines; a dedicated key usable without an interactive passphrase |

The workflow obtains the VPS ED25519 host key at deployment time with `ssh-keyscan`; `VPS_KNOWN_HOSTS` is not required. This keeps setup compatible with the existing SSH deployment pattern, but does not pin the VPS host key in GitHub. For strict host identity verification, add a verified known-hosts file and restore pinned host-key checking in the workflow.

Database and R2 credentials stay in protected VPS files; GitHub needs only SSH access. Never put them in frontend variables or build arguments. GitHub's environment behavior is documented in [deployment environments](https://docs.github.com/en/actions/reference/workflows-and-actions/deployments-and-environments).

The workflow deploys pushes to **`main`** and manual runs on **`main`**, after all checks pass. This repository was on `mvp-hardening` when these files were added: merge into `main` to enable deployment, or deliberately change both the workflow trigger and deploy-job branch condition to your production branch. Restrict the `production` environment to that branch. Required reviewers are optional; enabling them makes deployment wait for approval. Protect the branch and workflow files against unreviewed changes.

For a **brand-new empty Neon database**, first run Actions → **Validate and deploy** → Run workflow on main → enable **initialize_database**. Initialization refuses a database with existing public tables and removes development sample accounts. Leave that option off for all subsequent releases and for any existing database.

The first push to an empty, uninitialized database will fail at migration and keep the API stopped. Use the explicit first-install manual run to initialize it. No deploy ever resets or drops the database.

After the first successful deployment, SSH in as `metmma` and create an administrator:

```sh
cd /opt/metmma
export BOOTSTRAP_USERNAME=admin
read -rsp 'Production admin password (10–72 bytes): ' BOOTSTRAP_PASSWORD
export BOOTSTRAP_PASSWORD
docker compose --env-file .env --env-file current/release.env -f current/compose.yml \
  run --rm --no-deps -e BOOTSTRAP_USERNAME -e BOOTSTRAP_PASSWORD api npm run bootstrap:admin
unset BOOTSTRAP_USERNAME BOOTSTRAP_PASSWORD
```

The bootstrap command preserves existing valid accounts; it is not a password reset tool.

## 5. Frontend hosting

Choose one provider and connect its Git integration to the same repository/production branch:

| Setting | Vercel | Netlify |
| --- | --- | --- |
| Project root/base | `frontend` | Root `netlify.toml` sets base to `frontend` |
| Framework | Vite | Vite |
| Build command | `npm run build` | `npm run build` |
| Output directory | `dist` | `dist` relative to base |
| Node version | 22 | 22 |
| Build variable | `VITE_API_BASE_URL=https://api.your-domain.example/api` | Same |

`frontend/vercel.json` and `netlify.toml` include SPA fallback routing so refreshing a route works. Vercel's project root must be `frontend` for that config to apply; see [Vite on Vercel](https://vercel.com/docs/frameworks/frontend/vite). Rebuild the frontend whenever `VITE_API_BASE_URL` changes. Only allow production frontend origins in backend CORS. Preview deployments should use a separate staging backend/DB, not the production pharmacy database.

The frontend provider's Git deployment and backend GitHub Actions run independently. For coordinated or breaking releases, pause sales and wait for both deployments before staff resume work. This setup is not zero-downtime: the API stops while backing up and migrating.

## 6. Enable scheduled R2 backups

After the first successful deployment, copy `deploy/systemd/metmma-backup.service` and `deploy/systemd/metmma-backup.timer` to `/etc/systemd/system/` on the VPS, then:

```sh
sudo systemctl daemon-reload
sudo systemctl enable --now metmma-backup.timer
sudo systemctl start metmma-backup.service
sudo systemctl status metmma-backup.service
sudo systemctl list-timers metmma-backup.timer
sudo journalctl -u metmma-backup.service -n 50 --no-pager
```

The timer runs daily at **02:15 Africa/Blantyre** (00:15 UTC), with up to five minutes of jitter, and catches a missed run after the VPS starts. Every deployment also takes a backup before any migration. Deployments and scheduled backups share a VPS lock.

The backup tool creates a custom-format dump, validates its archive listing, uploads it plus a SHA-256 checksum, and verifies the remote object's size. Only then does it update `/backups/last-success` and remove local copies older than seven days. An upload failure retains the dump on the VPS and reports failure. R2 retention is controlled by the bucket lifecycle rule, independently of the seven-day local retention.

Monitor the service's exit status, disk space, and the timestamp of the latest R2 object. The timer does not send email/Slack alerts automatically. Daily backups alone imply up to roughly one day of data loss; choose a shorter timer interval and appropriate Neon recovery settings if needed.

These backups contain the complete application database, including staff and financial records. They do not include VPS configuration or credentials. Store configuration secrets separately in your password manager. A successful upload is not a restore rehearsal.

## 7. Restore rehearsal (isolated database only)

Use PostgreSQL 18 restore tools for dumps produced by this backup image. On the VPS as `metmma`, select a real R2 dump name and download it and its checksum through the backup container:

```sh
cd /opt/metmma
docker compose --env-file .env --env-file current/release.env -f current/compose.yml \
  run --rm --no-deps --entrypoint bash backup
```

Inside that container:

```sh
export AWS_DEFAULT_REGION=auto AWS_EC2_METADATA_DISABLED=true
cd /backups
name=REPLACE_WITH_THE_ACTUAL_pharmacy_TIMESTAMP_CONTAINER.dump
aws --endpoint-url "$R2_ENDPOINT" s3 cp "s3://$R2_BUCKET/$R2_PREFIX/$name" "$name"
aws --endpoint-url "$R2_ENDPOINT" s3 cp "s3://$R2_BUCKET/$R2_PREFIX/$name.sha256" "$name.sha256"
sha256sum --check "$name.sha256"
pg_restore --list "$name"
exit
```

Back on the VPS, create a separate temporary restore server with **no published port**:

```sh
docker network create metmma-restore-test
docker run -d --name metmma-restore-test --network metmma-restore-test \
  -e POSTGRES_USER=restore_test -e POSTGRES_PASSWORD=restore-test-only \
  -e POSTGRES_DB=restore_test postgres:18-bookworm
# Wait until this reports accepting connections:
docker exec metmma-restore-test pg_isready -U restore_test -d restore_test
```

Restore the selected file using an explicit connection to that temporary server:

```sh
docker run --rm --network metmma-restore-test \
  -v metmma-production_backups:/backups:ro \
  -e PGPASSWORD=restore-test-only postgres:18-bookworm \
  pg_restore --exit-on-error --no-owner --no-privileges \
  --host=metmma-restore-test --username=restore_test --dbname=restore_test \
  /backups/REPLACE_WITH_THE_ACTUAL_DUMP_NAME.dump
docker exec metmma-restore-test psql -U restore_test -d restore_test \
  -c 'SELECT count(*) FROM sales; SELECT count(*) FROM products;'
```

Check row counts and financial totals against the backup date, and rehearse application login/checkout against an isolated restored copy before relying on the backups. Remove only the disposable restore resources when finished:

```sh
docker rm -fv metmma-restore-test
docker network rm metmma-restore-test
```

Never restore over the live Neon database as a test. A real recovery requires pausing writes, selecting a recovery point, rehearsing the restore, and reconciling transactions after the backup.

## 8. Deployment failure, rollback and maintenance

Each release is kept in `/opt/metmma/releases/<commit>-<run>-<attempt>`. Images have the same immutable tag. `/opt/metmma/current` is updated only after migrations, container readiness and public HTTPS readiness pass; `/opt/metmma/previous` records the preceding successful release. Caddy certificates persist in Docker volumes.

After image transfer and checksum validation, deployment stops the API, backs up to R2, optionally initializes an explicitly requested empty database, applies migrations, starts the API and checks `/api/health`. Existing migrations are intentionally idempotent and rerun on each deployment. New migrations must be added to the list in `backend/scripts/migrate.js` and tested on a restored copy.

Failures after stopping the API leave it stopped. GitHub reports a failed deployment. Inspect the failed release using its path, because `current` still identifies the last success:

```sh
cd /opt/metmma
docker compose --env-file .env --env-file releases/FAILED_RELEASE/release.env \
  -f releases/FAILED_RELEASE/compose.yml logs --tail=100 api proxy
```

Prefer fixing forward and rerunning deployment. Application rollback is safe only after confirming the older image supports the current database schema. There is no automatic down migration or restore. For an explicitly reviewed compatible rollback:

```sh
cd /opt/metmma
flock deploy.lock docker compose --env-file .env --env-file previous/release.env \
  -f previous/compose.yml up -d --wait --wait-timeout 180 api proxy
curl --fail https://YOUR_API_DOMAIN/api/health
# Only after the health check and application smoke tests succeed:
ln -sfn "$(readlink -f previous)" current
```

Pause deployment triggers and the backup timer while carrying out a manual recovery. Do not roll back to the original unhardened checkout. See the business smoke tests in [the MVP release checklist](mvp/DEPLOYMENT_CHECKLIST.md).

The workflow retains downloaded release artifacts for seven days. VPS image/release cleanup is deliberately manual: retain the current and previous images/manifests, then remove reviewed obsolete releases when disk usage requires it. Do not prune production volumes. Update base images regularly by rebuilding and deploying a tested release.

## Verification of this change

Local verification passed: backend syntax checks and 16 unit tests (including isolation from inherited production URLs), frontend syntax/template checks, 52 frontend tests and the production frontend build, eight deployment/backup success/failure tests, Bash syntax, both Compose configurations, and YAML/JSON parsing. The local machine runs Node 26; frontend tests passed with `NODE_OPTIONS=--no-experimental-webstorage` so test workers use jsdom storage. The supplied development/CI runtime is Node 22.

Local Docker image builds and database integration tests were not run because Docker access required a local sudo password; the user chose to continue without them. GitHub Actions is configured to run integration tests, build all images, initialize and migrate a disposable database, reject reinitialization, and smoke-test the built API. No actual GitHub run, VPS rollout, Neon migration, R2 upload or cloud restore was performed in this session.
