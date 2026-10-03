# Weekend release checklist

For the current hosting configuration and commands, use the [VPS + Neon + R2 runbook](../DEPLOYMENT_VPS.md). Retain this checklist's business validation and smoke tests; its Render/local-development instructions predate the VPS setup.

**Do not reopen the uploaded checkout after rollback:** it trusts client totals and can duplicate receipts. Use a maintenance page while resolving a failed rollout. This checklist is reviewable preparation; no production deployment or live-data migration has been run.

## Environment

Use Node 22.12+ and PostgreSQL 16. Keep environment files and database backups outside source control. Supply secrets through the hosting provider or a protected environment file.

| Variable | Required value / purpose |
| --- | --- |
| NODE_ENV | production |
| PORT | Provider-assigned port, or 3000 |
| JWT_SECRET | New random secret, at least 32 characters; no defaults. Keep stable between replicas/restarts. Rotating signs everyone out. |
| DATABASE_URL | Provider PostgreSQL connection URL; alternatively use all individual DB_* settings. |
| DB_HOST, DB_PORT, DB_NAME, DB_USER, DB_PASSWORD | Individual connection settings when DATABASE_URL is absent. No default password. |
| DB_SSL | true for hosted database; false only for a trusted local DB. Certificates are verified. |
| DB_SSL_CA | Optional PEM private CA. Avoid URL sslmode parameters that can override pg's SSL options when using this. |
| ALLOWED_ORIGINS | Exact HTTPS frontend origin(s), comma separated; no /api path or trailing slash. |
| TRUST_PROXY | Number of trusted reverse-proxy hops. Render: 1. Direct service: 0. Confirm actual topology before enabling. |
| TAX_RATE_BPS | Confirm applicable VAT. Uploaded behavior retained at 1650 (16.5%); 0–10000 supported. |
| PHARMACY_TIMEZONE | Default UTC preserves existing naive timestamp interpretation. Malawi commonly uses Africa/Blantyre. Verify historical row semantics on a copy before changing. |
| VITE_API_BASE_URL | Frontend build-time URL ending in /api, e.g. https://actual-backend.example/api. Default /api requires a real same-origin proxy. Never put secrets in VITE_* values. |
| BOOTSTRAP_USERNAME / BOOTSTRAP_PASSWORD | One-time optional administrator initialization only; password 10–72 bytes. Existing valid accounts are preserved. Unset afterward. |
| TEST_DATABASE_URL | Disposable test database only, never production. Integration tests create/drop schemas. |

Use HTTPS for the frontend: native random UUID generation requires a secure browser context (localhost also works). Restrict DB network access to the application/maintenance hosts.

## Before release

- [ ] Choose hosting target and capture the current release identifier/environment.
- [ ] Verify finance access: admin/manager may write expenses; pharmacist/HR may read; cashier cannot read finance and sees only own receipts; only admin reverses sales.
- [ ] Confirm VAT, currency MWK, timestamp interpretation and full-sale return-to-stock policy.
- [ ] Reconcile pending browser records with saved receipts; export from administrator Help before clearing browser storage. Never automatically replay old pending receipts.
- [ ] Pause sales/stock/expense writes and arrange a short maintenance window. Save a full backup; test restoration in an isolated database.
- [ ] Restore a production backup to a separate database and inspect the actual schema against database/init.sql. Do not run init.sql on an existing production database: it includes sample inserts.
- [ ] Check historical data without modifying it:

~~~sql
SELECT COUNT(*) FROM products WHERE quantity < 0 OR selling_price < 0;
SELECT COUNT(*) FROM sale_items WHERE quantity <= 0 OR subtotal < 0;
SELECT COUNT(*) FROM sales WHERE total_amount < 0;
SELECT COUNT(*) FROM sales s LEFT JOIN users u ON u.id=s.user_id
  WHERE s.user_id IS NOT NULL AND u.id IS NULL;
SELECT barcode, COUNT(*) FROM products
  WHERE is_active=TRUE AND barcode IS NOT NULL AND barcode<>''
  GROUP BY barcode HAVING COUNT(*)>1;
SELECT role, COUNT(*) FROM users GROUP BY role;
~~~

Missing historical users are preserved as null ledger actors. Duplicate barcodes need staff review because the new scanner rejects ambiguity. Differences between historical sale totals and line sums must be reviewed; the migration preserves totals rather than inventing corrections.

## Install, back up and rehearse

~~~sh
npm ci --prefix backend
npm ci --prefix frontend
npm run check --prefix backend
npm test --prefix backend
npm run check --prefix frontend
npm test --prefix frontend
# With TEST_DATABASE_URL set to a disposable database:
npm run test:integration --prefix backend
~~~

For backup, install the PostgreSQL 16 client on the maintenance host. With DB settings configured:

~~~sh
node scripts/backup.js
# Validate that the completed .dump exists; .partial files are failed backups.
pg_restore --list /secure/path/pharmacy-backup.dump
# Point --dbname at a NEW isolated empty database, never production:
pg_restore --no-owner --no-privileges --dbname=isolated_restore_database /secure/path/pharmacy-backup.dump
~~~

The helper writes custom-format backups under backups/ without deleting older copies. The directory is protected; move the backup to secure off-host storage. pg_dump/pg_restore use libpq TLS settings: use PGSSLMODE=verify-full and PGSSLROOTCERT for the provider CA as needed. The helper maps DB_SSL to verify-full/disable; DB_SSL_CA is for Node, so supply PGSSLROOTCERT separately for a private CA.

With backend environment pointed to the restored copy:

~~~sh
cd backend
npm run migrate
node test-db.js
~~~

Inspect row counts, stock and totals. Test a sale, retry, expense change and reversal on the copy. Run migrate:down then migrate again on that copy, check preserved rows/archives, and restore another backup if you need a pristine rehearsal. Down is a one-time operation per applied up migration; do not run it twice. The original additive employee-email migration is retained by MVP down because it predated this hardening.

## Deploy

1. Keep writes paused and take the final backup.
2. Run npm run migrate once from backend using production DB settings. It serializes migration runners; SQL is transactional. Index creation/backfill may lock large existing tables, so measure the rehearsal window.
3. Bootstrap an administrator only if no usable administrator exists. The script only inserts a missing account or replaces init.sql's unusable administrator placeholder hash; it never changes a valid existing password.
4. Deploy the backend and run npm start from backend. Verify GET /api/health returns status OK. A database/schema failure returns a sanitized unavailable response; do not reopen writes on failed readiness.
5. Set frontend VITE_API_BASE_URL before npm run build; deploy frontend/dist. Backend and frontend must be updated together because checkout now requires an idempotency key and list responses are paginated.
6. Serve index.html without long caching; hashed assets can be cached immutably. Invalidate old HTML, then reload staff tabs before reopening writes. Retain pending draft storage.

Render: render.yaml has rootDir=backend, npm ci, npm start and /api/health; supply the secret/origin/DB variables. Because migrations live outside backend, run the release migration from a checkout of the full repository on a maintenance host with production connectivity.

Netlify: netlify.toml builds frontend/dist and routes SPA paths to index.html. Set VITE_API_BASE_URL to the actual backend at build time; the unverified hardcoded API rewrite was removed. Allow that Netlify frontend origin on the backend.

Docker frontend alternative:

~~~sh
docker build --build-arg VITE_API_BASE_URL=https://actual-backend.example/api -t metmma-mvp-frontend frontend
~~~

Nginx serves static files/SPA routes and uncached HTML; it does not proxy an API by default. Put HTTPS termination in front. Docker image build and provider deployments remain Unverified.

For a brand-new database only, initialize from database/init.sql, then run migrate and bootstrap. Never delete an existing Docker volume or run compose down -v during release.

## Smoke tests before reopening

- [ ] Public readiness and /api/config show expected status, currency, VAT and timezone.
- [ ] HTTPS login works, disallowed roles receive friendly denial, old/expired sessions renew or sign in again.
- [ ] Complete/skip/resume tour and reopen from Help; verify on real desktop/tablet.
- [ ] Add a clearly labeled test product, scan its real label, sell one unit; check receipt, stock movement and one linked income. Retry the same submitted checkout reference: same receipt, no additional deduction.
- [ ] Two staff selling the last available unit cannot both succeed; losing request keeps a cart and explains stock shortage.
- [ ] Set a test product at low stock; bell lists it; mark-read/all and close methods work. Restock resolves the notice and a delivery retry does not double-add units.
- [ ] Record, edit and confirm-delete a small test expense; verify actor/before/after history and excluded deleted totals.
- [ ] Gross recorded income equals all saved sale totals for matching dates. Net income subtracts refund records; net summary equals signed ledger total excluding deleted expenses.

~~~sql
SELECT COALESCE(SUM(total_amount),0) AS sales FROM sales
  WHERE created_at >= DATE '2026-10-02' AND created_at < DATE '2026-10-03';
SELECT COALESCE(SUM(amount),0) AS gross_income FROM financial_transactions
  WHERE type='income' AND transaction_date >= DATE '2026-10-02'
  AND transaction_date < DATE '2026-10-03';
SELECT COALESCE(SUM(amount),0) AS net FROM financial_transactions
  WHERE deleted_at IS NULL AND transaction_date >= DATE '2026-10-02'
  AND transaction_date < DATE '2026-10-03';
~~~

Use the actual test period, interpreted in the configured pharmacy timezone. Refunds are separate negative records; reversed sales remain in gross historical income and are offset in net income.

- [ ] Reverse only a marked test sale; verify one stock return, one negative money record and safe repeat.
- [ ] Simulate an unavailable connection; preserve cart/input and retry without duplicates. Confirm no internal errors appear to staff.
- [ ] Physical scanner and receipt printer work; no normal-flow browser console errors.
- [ ] Measure actual staff device/network search (<200 ms) and checkout (<1 s), recording results. If slower, keep writes controlled until the cause is understood.
- [ ] Retain test receipts/reversal/audit history; do not delete financial records to erase smoke-test evidence. Reopen for staff only after checks pass.

## Rollback

1. Pause all writes and serve a maintenance page. Save logs/request references and take another backup including new transactions.
2. Prefer a forward correction or a previously verified hardened release with the additive schema retained. Do not re-enable the uploaded insecure checkout.
3. If schema rollback is required, keep writes stopped and run npm run migrate:down from backend. It archives new ledger/audit/read tables and sale/item/stock state under mvp_archive_* before removing new columns/indexes. Never delete those archives.
4. Preserve both pre-release and post-release backups. Restoring the old snapshot discards newer transactions unless separately reconciled; do not overwrite new records blindly.
5. Reapplying npm run migrate restores the archived MVP state. Test/reconcile stock, receipts, expenses and income before reopening the hardened version.
6. If a migration failed, its transaction rolls back; inspect DB state before retrying. Keep the environment/secret stable and restart the matching frontend/backend together.

Production backup restoration, provider configuration and migration timing must still be verified by the release operator on the actual infrastructure.
