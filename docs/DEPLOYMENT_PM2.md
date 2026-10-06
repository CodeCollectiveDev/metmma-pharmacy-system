# PM2 deployment database setup

The current `.github/workflows/deploy.yml` deploys the backend to
`~/metmma-backend` over SSH and starts or reloads `metmma-backend` in PM2.
It runs on pushes to `main` or through **Run workflow** in GitHub Actions.

The release includes `database/init.sql` and `database/migrations/` inside
`~/metmma-backend`. Both database scripts resolve SQL relative to their own
location. Source checkouts and Docker images also support the repository's
database directory beside `backend`. No `~/database` symlink is required.

Keep the production `.env` in `~/metmma-backend/.env`. The scripts use
`MIGRATION_DATABASE_URL` when set, otherwise `DATABASE_URL`. Use a direct Neon
connection for migrations, as the migration runner uses a session advisory lock.

Before reloading PM2, deployment runs:

```sh
cd ~/metmma-backend
npm run db:init -- --if-empty
npm run migrate
```

Initialization creates the base tables only when the public schema has no
tables. On subsequent deployments it skips initialization and preserves data;
the existing idempotent migrations run again. Connection, SQL, or missing-file
errors stop deployment before PM2 reloads. Running `npm run db:init` without
`--if-empty` still rejects a nonempty database.

If the database already contains a partial schema, initialization leaves it
untouched and migrations may fail. Inspect and repair that schema before
retrying; do not clear a database containing production data.

An empty database starts without user accounts. After the first deployment,
create the administrator using the existing bootstrap script:

```sh
cd ~/metmma-backend
export BOOTSTRAP_USERNAME=superadmin
read -rsp 'Admin password (10-72 bytes): ' BOOTSTRAP_PASSWORD
echo
export BOOTSTRAP_PASSWORD
npm run bootstrap:admin
unset BOOTSTRAP_USERNAME BOOTSTRAP_PASSWORD
```

The Docker/Caddy instructions in `DEPLOYMENT_VPS.md` describe the separate
Docker deployment tooling, rather than this PM2 workflow.
