# METMMA Pharmacy Management System — hardened MVP

Vue 3, Vite, Tailwind and Pinia frontend; Express 5 and PostgreSQL backend. Stock and money are confirmed by the server. A failed checkout keeps a per-user cart and a retry reference.

Version 2: see the [separate deployment and acceptance guide](docs/VERSION_2.md) for the `version-2` branch, GitHub Actions environment, new Neon database and Vercel project.

Deployment: follow the [VPS + Neon + R2 runbook](docs/DEPLOYMENT_VPS.md) for GitHub Actions, Vercel/Netlify and local Docker development. Also read the [pre-change audit](docs/mvp/AUDIT.md), [final report](docs/mvp/FINAL_REPORT.md) and [business release checklist](docs/mvp/DEPLOYMENT_CHECKLIST.md).

## Development

For the complete local setup, see [docs/DEVELOPMENT_SETUP.md](docs/DEVELOPMENT_SETUP.md). For production deployment, see [docs/PRODUCTION_SETUP.md](docs/PRODUCTION_SETUP.md) and the detailed [VPS runbook](docs/DEPLOYMENT_VPS.md).

Use Node 22.12+ and PostgreSQL 16. Install both supplied lockfiles:

~~~sh
npm ci --prefix backend
npm ci --prefix frontend
~~~

Start the isolated local PostgreSQL databases. Development commands explicitly use ports 55432 (app) and 55433 (integration tests), overriding database settings in your existing `.env`. No Neon credentials are needed.

~~~sh
docker compose up -d --wait
npm run migrate:dev --prefix backend
# Optional first local admin: securely export BOOTSTRAP_USERNAME and BOOTSTRAP_PASSWORD.
npm run bootstrap:dev --prefix backend
npm run dev --prefix backend
~~~

In another terminal run npm run dev from frontend. Vite serves localhost:5173 and proxies /api to localhost:3000. For Vercel, use `frontend` as the project root and set `VITE_API_BASE_URL=https://api.metmmapharmacy.com` before building. The client adds `/api` when given a bare origin. See [frontend/.env.example](frontend/.env.example) and [frontend production setup](docs/PRODUCTION_SETUP.md#4-configure-the-frontend).

## Branching and releases

`main` is live production. All work is pushed through `staging`:

~~~sh
git checkout staging && git pull
git checkout -b feature/my-change
# ... work, then open a PR into staging
~~~

A pull request into `staging` needs green CI and one teammate approval. When the staged build is tested and you are confident it works, open a pull request from `staging` into `main` — merging there deploys to production. Both branches reject direct pushes, force pushes and deletions, including from administrators. Full policy: [docs/BRANCHING_WORKFLOW.md](docs/BRANCHING_WORKFLOW.md).

## Verification

~~~sh
npm run check --prefix backend
npm test --prefix backend
npm run check --prefix frontend
npm test --prefix frontend
npm run build --prefix frontend
# Always selects the disposable Docker test database, never Neon.
npm run test:integration:local --prefix backend
python3 -m unittest discover -s deploy/tests -p 'test_*.py'
~~~

Integration suites create unique schemas and remove them afterward. Check scripts validate JavaScript syntax and Vue templates; ESLint and static type checks are not configured. Results and the separate browser harness are in docs/mvp/evidence.

## Workflows

Sell items, inventory and deliveries, receipts and administrator reversals, real stock/expiry notifications, income and expenses, staff/attendance, bounded reports, and Help with a resumable tour. Suppliers remain a product text field; customers remain an optional receipt name.

Administrators manage sign-ins in Accounts, link existing staff, or create a staff record automatically with a new account. Administrators and HR officers manage leave in Leave. Camera scanning is available in Sell items and Inventory; USB scanners and manual entry remain supported. Roles are enforced on the server. Old IndexedDB pending records remain available for administrator download and manual reconciliation; they are never automatically replayed.

Serve frontend/dist over HTTPS, run backend/npm start under a process manager or hosting service, and migrate before accepting writes. Follow the release checklist for real-data checks, backup/restore, smoke tests and rollback.

See [the feature comparison and setup notes](docs/STAFF_WORKFLOWS.md) for the develop-branch comparison, required staff-workflow migration and verification limits.
