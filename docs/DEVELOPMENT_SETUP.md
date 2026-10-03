# Development Setup

This guide runs the METMMA Pharmacy System locally with Docker PostgreSQL, an Express backend, and a Vue/Vite frontend. Local commands use disposable development settings and do not require Neon or any other hosted database.

## Prerequisites

Install the following before starting:

- Node.js 22.12 or newer
- npm
- Docker Engine
- Docker Compose
- Git, if you are cloning the repository

Check the installed versions:

```sh
node --version
npm --version
docker --version
docker compose version
```

## Install Dependencies

Run these commands from the repository root:

```sh
npm ci --prefix backend
npm ci --prefix frontend
```

## Start the Local Databases

From the repository root:

```sh
docker compose up -d --wait
```

The Compose file starts two local PostgreSQL services:

| Service | Address | Database | Purpose |
| --- | --- | --- | --- |
| `postgres` | `127.0.0.1:55432` | `metmma_pharmacy` | Application development |
| `postgres-test` | `127.0.0.1:55433` | `metmma_test` | Integration tests |

These credentials are disposable and are defined in `docker-compose.yml`. Do not use them in production.

## Apply Database Migrations

From the repository root:

```sh
npm run migrate:dev --prefix backend
```

The `migrate:dev` command explicitly selects the local database, even if `backend/.env` contains different or production settings.

## Create the First Local Administrator

This step is optional, but is needed to sign in to a new local database. Run it from the repository root, or use the equivalent commands from inside `backend` without `--prefix backend`.

Run each command separately so the hidden password prompt receives input correctly:

```sh
export BOOTSTRAP_USERNAME=superadmin
read -rsp "Local admin password: " BOOTSTRAP_PASSWORD
echo
export BOOTSTRAP_PASSWORD
npm run bootstrap:dev --prefix backend
unset BOOTSTRAP_USERNAME BOOTSTRAP_PASSWORD
```

Use a password between 10 and 72 bytes. A successful run prints:

```text
Administrator account is ready.
```

If you are already in the `backend` directory, use this instead:

```sh
npm run bootstrap:dev
```

Do not use `npm run bootstrap:dev --prefix backend` while your current directory is already `backend`; that makes npm look for `backend/backend/package.json`.

The bootstrap command never replaces the password of an existing valid account. For a disposable local database, reset all local data and repeat the setup with:

```sh
docker compose down -v
docker compose up -d --wait
npm run migrate:dev --prefix backend
```

## Start the Application

Start the backend from the repository root:

```sh
npm run dev --prefix backend
```

In a second terminal, from the repository root, start the frontend:

```sh
npm run dev --prefix frontend
```

Open [http://localhost:5173](http://localhost:5173). The frontend proxies `/api` requests to the backend at `http://localhost:3000`.

## Verify the Setup

```sh
npm run check --prefix backend
npm test --prefix backend
npm run check --prefix frontend
npm test --prefix frontend
npm run test:integration:local --prefix backend
npm run build --prefix frontend
```

## Stop and Restart

Stop the database containers while preserving application data:

```sh
docker compose stop
```

Start them again later with:

```sh
docker compose up -d --wait
```

`docker compose down` also preserves the named development volume. `docker compose down -v` deletes the local application database and should only be used when a full reset is intended.
