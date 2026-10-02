# METMMA Pharmacy Management System — hardened MVP

Vue 3, Vite, Tailwind and Pinia frontend; Express 5 and PostgreSQL backend. No new application dependencies or frameworks. Stock and money are confirmed by the server. A failed checkout keeps a per-user cart and a retry reference.

Read the [pre-change audit](docs/mvp/AUDIT.md), [final report](docs/mvp/FINAL_REPORT.md) and [weekend deployment checklist](docs/mvp/DEPLOYMENT_CHECKLIST.md). These supersede the uploaded sprint, offline-sync, backup and deployment instructions.

## Development

Use Node 22.12+ and PostgreSQL 16. Install both supplied lockfiles:

~~~sh
npm ci --prefix backend
npm ci --prefix frontend
~~~

Copy backend/.env.example to backend/.env. Supply a database connection and a random JWT_SECRET of at least 32 characters. Locally set DB_SSL=false, NODE_ENV=development, TRUST_PROXY=0 and ALLOWED_ORIGINS=http://localhost:5173.

For a new disposable development database, set DB_PASSWORD in the shell and run docker compose up -d. Init seeds placeholder accounts; the bootstrap below sets a real administrator password. Never reinitialize an existing database.

~~~sh
cd backend
npm run migrate
# Optional new installation: supply BOOTSTRAP_USERNAME and BOOTSTRAP_PASSWORD securely.
npm run bootstrap:admin
npm start
~~~

In another terminal run npm run dev from frontend. Vite serves localhost:5173 and proxies /api to localhost:3000. Separately hosted production frontends need VITE_API_BASE_URL at build time; see frontend/.env.example.

## Verification

~~~sh
npm run check --prefix backend
npm test --prefix backend
npm run check --prefix frontend
npm test --prefix frontend
npm run build --prefix frontend
# TEST_DATABASE_URL must point to an isolated disposable PostgreSQL database.
npm run test:integration --prefix backend
~~~

Integration suites create unique schemas and remove them afterward. Check scripts validate JavaScript syntax and Vue templates; ESLint and static type checks are not configured. Results and the separate browser harness are in docs/mvp/evidence.

## Workflows

Sell items, inventory and deliveries, receipts and administrator reversals, real stock/expiry notifications, income and expenses, staff/attendance, bounded reports, and Help with a resumable tour. Suppliers remain a product text field; customers remain an optional receipt name.

User login accounts and staff records are separate existing domains. Administrators create login accounts from Help. Roles are enforced on the server. Old IndexedDB pending records remain available for administrator download and manual reconciliation; they are never automatically replayed.

Serve frontend/dist over HTTPS, run backend/npm start under a process manager or hosting service, and migrate before accepting writes. Follow the release checklist for real-data checks, backup/restore, smoke tests and rollback.
