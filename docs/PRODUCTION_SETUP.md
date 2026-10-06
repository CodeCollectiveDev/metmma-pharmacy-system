# Production Setup

This guide is the production deployment checklist for METMMA Pharmacy System. The supported architecture is a Vercel or Netlify frontend, a Dockerized API on an AMD64 VPS, Neon PostgreSQL, Caddy for HTTPS, and Cloudflare R2 for backups.

For the complete operational procedures, configuration reference, restore rehearsal, and security notes, read [DEPLOYMENT_VPS.md](DEPLOYMENT_VPS.md).

## Prerequisites

Prepare the following:

- A Linux x86_64/AMD64 VPS
- Docker Engine and Docker Compose 2.30 or newer
- systemd, Bash, curl, gzip, coreutils, and util-linux
- A domain for the API and DNS control
- A Neon PostgreSQL database
- A private Cloudflare R2 bucket and restricted S3 credentials
- A GitHub repository with Actions enabled
- A Vercel or Netlify account for the frontend
- A dedicated SSH deployment key

Do not expose PostgreSQL or the API port directly to the internet. Only SSH and TCP ports 80/443 should be publicly reachable.

## 1. Prepare the VPS

Create the deployment user and application directories:

```sh
sudo useradd --create-home --shell /bin/bash metmma
sudo usermod -aG docker metmma
sudo install -d -m 700 -o metmma -g metmma /home/metmma/.ssh
sudo install -d -m 700 -o metmma -g metmma /opt/metmma /opt/metmma/releases
```

Install the verified deployment public key in `/home/metmma/.ssh/authorized_keys` with owner `metmma` and mode `600`. Log in again after adding the user to the Docker group.

Point the API DNS record to the VPS. Caddy obtains and renews the HTTPS certificate automatically.

## 2. Configure Production Secrets

Copy these templates to the VPS:

| Template | Destination |
| --- | --- |
| `deploy/.env.example` | `/opt/metmma/.env` |
| `deploy/backend.env.example` | `/opt/metmma/backend.env` |
| `deploy/backup.env.example` | `/opt/metmma/backup.env` |

Set the following values securely:

- `API_DOMAIN` in `/opt/metmma/.env`
- A strong, stable `JWT_SECRET`
- Direct Neon URLs in `DATABASE_URL` and `MIGRATION_DATABASE_URL`
- `ALLOWED_ORIGINS` for the exact frontend HTTPS origin
- R2 endpoint, bucket, access key, and secret in `backup.env`

Use direct Neon connections for migrations. Remove `sslmode` and `channel_binding` query parameters from the application URLs; the production configuration enables certificate validation with `DB_SSL=true`.

Protect the files:

```sh
sudo chown metmma:metmma /opt/metmma/.env /opt/metmma/backend.env /opt/metmma/backup.env
sudo chmod 600 /opt/metmma/.env /opt/metmma/backend.env /opt/metmma/backup.env
openssl rand -hex 32
```

Never put database, R2, or backend secrets in frontend variables. Only `VITE_API_BASE_URL` is public and belongs in the frontend hosting configuration.

## 3. Configure GitHub Actions

Create a GitHub environment named `production` with these secrets:

- `VPS_HOST`
- `VPS_USER` set to `metmma`
- `VPS_PORT`, if not using 22
- `VPS_SSH_KEY`

Add these as **Environment secrets** under `Settings -> Environments -> production`, not only as repository secrets. The deployment job uses the `production` environment.

The workflow uses the existing `VPS_SSH_KEY` to authenticate and automatically obtains the VPS ED25519 host key with `ssh-keyscan` on the GitHub runner. You do not need a `VPS_KNOWN_HOSTS` secret. This matches the simpler SSH deployment pattern, but it does not pin the host key in GitHub; use a pre-verified known-hosts secret instead if strict host identity verification is required.

The deployment workflow builds AMD64 images, uploads them over SSH, takes a database backup, migrates, and starts the release.

For a brand-new empty Neon database, run the workflow's initialization option once. Do not enable initialization for an existing database or later releases.

## 4. Configure the Frontend

Set the frontend provider to use the `frontend` directory as its project root.

| Setting | Value |
| --- | --- |
| Build command | `npm run build` |
| Output directory | `dist` |
| Node version | 22 |
| Build variable | `VITE_API_BASE_URL=https://api.metmmapharmacy.com` |

In Vercel, add `VITE_API_BASE_URL` under **Project Settings -> Environment Variables** for **Production**, then deploy or redeploy. Vite embeds this public value during the build; changing it requires a new deployment. See [Vite on Vercel](https://vercel.com/docs/frameworks/frontend/vite).

The API client accepts a bare origin and adds `/api`, so login calls `https://api.metmmapharmacy.com/api/auth/login`. An explicit base URL such as `https://api.metmmapharmacy.com/api` also works without duplicating `/api`; surrounding whitespace and trailing slashes are removed. All frontend API requests use this shared client. Preview deployments should set the variable to their staging API.

Without this variable, requests use same-origin `/api`. `npm run dev` always uses the local Vite proxy to `localhost:3000`, even if a production URL exists in a local `.env` file.

Use the same production branch as the backend workflow. Configure backend `ALLOWED_ORIGINS` to match the deployed frontend URL exactly, without a trailing slash or `/api`.

## 5. Create the First Administrator

After the first successful API deployment, SSH to the VPS and run:

```sh
cd /opt/metmma
export BOOTSTRAP_USERNAME=superadmin
read -rsp 'Production admin password (10-72 bytes): ' BOOTSTRAP_PASSWORD
echo
export BOOTSTRAP_PASSWORD
docker compose --env-file .env --env-file current/release.env -f current/compose.yml \
  run --rm --no-deps -e BOOTSTRAP_USERNAME -e BOOTSTRAP_PASSWORD api npm run bootstrap:admin
unset BOOTSTRAP_USERNAME BOOTSTRAP_PASSWORD
```

The bootstrap command preserves existing valid accounts and does not reset their passwords.

## 6. Enable Backups and Verify

Install and enable the supplied systemd backup service and timer:

```sh
sudo systemctl daemon-reload
sudo systemctl enable --now metmma-backup.timer
sudo systemctl start metmma-backup.service
sudo systemctl status metmma-backup.service
sudo systemctl list-timers metmma-backup.timer
```

Before accepting real transactions, verify:

- The frontend loads over HTTPS.
- Login and role restrictions work.
- The API can read and write the Neon database.
- A backup completes and exists in R2.
- A restore rehearsal has been completed against an isolated database.
- Health checks, logs, disk space, and certificate renewal are monitored.

See [mvp/DEPLOYMENT_CHECKLIST.md](mvp/DEPLOYMENT_CHECKLIST.md) before release and [DEPLOYMENT_VPS.md](DEPLOYMENT_VPS.md) for the full deployment and restore runbook.
