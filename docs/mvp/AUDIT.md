# Phase 0 audit — 2 October 2026, before implementation

**Critical release blockers:** client-controlled sale prices/totals/user identity; injectable expiry query; public registration with arbitrary administrator role; insecure fallback JWT secret; stock writes falsely reported successful after API rejection. Offline sales can be replayed twice after an ambiguous response. Expired or inactive products can be sold. Restocking does not send the server's quantity field. Correct these before deployment.

## Method and scope

Read all application routes, controllers, validators, views, stores, layout, services, SQL and deployment configuration. Searched imports and callers. Installed the supplied lockfiles, built, ran existing tests, exercised POS and inventory in headless Chromium at 1440×900 and 1024×768 against PostgreSQL 16 with 1,000 synthetic products and 100 synthetic sales. No live pharmacy database, deployment credentials, actual staff device specifications or production traffic were supplied.

Statuses below describe the uploaded version. Working = implemented and observed in the stated checks; Partially working = implemented with confirmed gaps or runtime behavior not fully verified; Broken = definite mismatch or missing handler; Unused = no runtime caller/import/route found. “Working” does not imply production readiness. Source-line inventories in INVENTORY.txt enumerate every route declaration, button, navigation link, event handler, component and SQL table; grouped rows below explain their status.

## Stack, structure and commands

- Vue 3 JavaScript, Vite 7, Tailwind 4, Pinia, Vue Router, Axios, Lucide icons. `pouchdb/` actually wraps LocalForage/IndexedDB, not PouchDB. No TypeScript or lint configuration/scripts.
- Express 5, PostgreSQL via pg, Joi, bcrypt, JWT, Helmet, CORS, express-rate-limit. Three independent connection pools in server/db/user model; startup test connection is leaked.
- `frontend/src`: auth, dashboard, inventory, POS, HR, reports, help, layouts, services, browser data. `backend/api`: controllers/routes/validators/db; `backend/routes`: auth and mounting; `database`: init and one email migration.
- Node 22.12+ (baseline runtime Node 24.19), `cd backend && npm ci && npm start`; `cd frontend && npm ci && npm run dev` (Vite proxies `/api` to port 3000).
- Build: `cd frontend && npm run build`; tests: `npm test` in each package; backend integration requires isolated `TEST_DATABASE_URL` and `npm run test:integration`.
- Database: supplied `docker-compose.yml` starts PostgreSQL 16 and runs `database/init.sql` only on a new volume. Init seeds unusable placeholder password hashes and embedded development password. Never run its sample inserts on production or erase existing data.
- Deployment files: Netlify frontend/API rewrite; Render backend manifest missing backend rootDir; frontend Docker image serves static files without API proxy. Existing deployment docs require verification against those real files. No backend compilation. `/api/health` returns OK without querying database.

## Feature/page/menu inventory

| Page/module/menu | Status | Evidence/gap |
| --- | --- | --- |
| `/`, `/login` | Partially working | Login works with test bcrypt account; label says email but sends username. Offline fallback trusts browser plaintext credentials. No friendly general error mapping. |
| `/register`, Create one here | Broken/security | Public creation of any role. Transaction starts on unused connection and never commits; user inserted through another pool. |
| `/dashboard`, Dashboard | Partially working | Entire catalogue, employees and all sales fetched sequentially and cached. Counts/today sum built in JS. Managers/pharmacists cannot fetch employee API but silently see cached/empty values. |
| `/pos`, Point of Sale | Partially working | Sale and receipt observed. VAT 16.5% computed in floats and server trusts browser totals. Full catalogue downloaded, written/read through IndexedDB. Click-only product cards; scan matches batch/id, ignores barcode column. Checkout refreshes entire catalogue. Offline confirmation clears cart before server acceptance. |
| `/inventory`, Inventory | Broken writes / partially working reads | Full list and filters render. Form sends name/price/stock/minStockLevel, omits required productCode/unitPrice/sellingPrice/quantity/reorderLevel. API rejects; orchestrator saves pending and claims success. Restock updates local stock rather than quantity; ignore fields absent from SQL. Delete hides locally even after server denial. |
| Sales history (Reports → Sales) | Partially working | Endpoint and sale records exist. UI shows Unknown/zero because it expects top-level product/quantity rather than sale items; period control is unused. No dedicated sales menu. |
| `/reports`, Reports → Stock | Partially working | Derived cached stock/expiry lists and CSV. CSV lacks escaping/formula safety and object serialization; URL not revoked. |
| Reports → HR | Partially working | Employees read/export; exposed to roles denied by server. |
| `/hr`, HR → Employees | Partially working | Create tested; HR users see Add button despite admin-only write. Empty state lacks action. Ellipsis action has no handler. Search assumes position exists. |
| HR → Attendance | Broken UI | Present/Absent have no click handler. API exists; browser history fetches only local records. Client attendance URL differs from server. |
| HR → Payroll | Broken/placeholder | Salary × 0.9 presented as net with invented 10% deductions; no payroll model or workflow. Remove UI, preserve salaries. |
| `/help`, help icons | Partially working | Searchable static help. No tour; inaccurate scanning/report promises; unverified support phone/email. |
| Notification bell | Broken | Static red dot, no event handler, modal, count, read state or notification API/table. |
| Supplier | Partially working | Product text column/form only. No supplier page/API/table; retain field, do not add module. |
| Customer | Partially working | Nullable sales.customer_name and checkout contract, no customer CRUD/table/page. Retain optional sale name; no new module. |
| Income tracking | Broken/missing | Sales store totals; financial_reports stores snapshots, no linked automatic income ledger. |
| Expenses | Broken/missing | No expense table/CRUD or menu. Report totals are not expense records. |
| Transactions | Partially working | Browser “transactions” collection holds sales only, including pending receipts. No server money movement view or reconciliation. |
| Unknown route/permission dialog | Partially working | 404 and role modal implemented; focus/keyboard lifecycle not verified. |

## Every reachable action (grouped by page)

| Actions | Status / observed behavior |
| --- | --- |
| Sidebar navigation, logout, collapse, mobile open/close | Working code; desktop/tablet renders observed; collapse lacks label and current item lacks aria-current. |
| Login submit, register link; register submit, sign-in link | Login observed; privileged public register is unsafe. Forms disable submit during request. |
| Dashboard quick links (POS, Inventory, HR, Reports) | Wired in actual Dashboard; visibility not consistently aligned with permissions. |
| POS search, category chips, scan/Enter, help, product selection | Search/add observed; scanner ignores real barcode; product selection not keyboard accessible, unbounded rendering. |
| POS quantity +/−, remove line, cash/card, Complete Sale, Clear Cart | Checkout observed. Clear has no confirmation; no reliable idempotency; error alerts append raw server text. |
| POS receipt Print/Close | Close observed; browser print code exists, physical printer Unverified. Modal has no Esc/focus trap/overlay handler. |
| Inventory Add/Cancel/Save, all/low/expired filters, scan/search | Reads observed; saves use incompatible payload and false offline success. No submit busy guard. |
| Inventory Restock/Cancel/Confirm, Ignore Low Stock | Broken server contract/no model for ignore; does not reliably persist. |
| Inventory Remove Expired/Remove All Expired | Confirmation exists but says delete; server uses soft deactivation. UI disregards permissions/errors; bulk action costly and unsafe. |
| Reports sales/stock/HR tabs, period select, three CSV buttons | Tabs wired; period select unused; CSV escaping missing. |
| HR tabs, search, Add/Cancel/Save, row ellipsis | Creation tested; row ellipsis dead; role visibility inconsistent. |
| HR Present/Absent; Payroll tab | Dead buttons and fabricated payroll calculations. |
| Help search/accordions; 404 back links; permission login/back | Implemented; no onboarding lifecycle. |
| TopBar Help/bell | Help works; bell dead/static unread dot. |

## API inventory (all under /api)

| Method + endpoint | Status / gap |
| --- | --- |
| GET `/`, GET `/health` | Working liveness only, no readiness query. |
| POST `/auth/login`, POST `/login` | Working tested login; weak fallback secret; token roles not rechecked against deactivation. |
| POST `/auth/register` | Broken/security above. |
| GET `/products` | Working tested pagination/filter contract; limit unbounded; ILIKE contains cannot use plain name B-tree; SELECT *, COUNT each call. |
| GET `/products/:id` | Partially working; param unvalidated, raw DB failures. |
| GET `/products/low-stock` | Partially working; unpaginated. |
| GET `/products/expiring` | Broken/security; interpolated days, unpaginated. |
| POST `/products` | Partially working API; separate insert/movement writes, UI payload broken. |
| PUT `/products/:id` | Partially working; no row lock/transaction, absolute quantity may overwrite concurrent sales; optional update schema applies create defaults. |
| DELETE `/products/:id` | Partially working; soft deactivation preserves history; UI swallows errors. |
| POST `/sales/checkout` | Partially working; existing transaction + FOR UPDATE prevents overselling for basic requests, rollback tested. No server pricing, expiry check, income, idempotency, actor verification; inconsistent lock order may deadlock; raw error text. |
| GET `/sales/history` | Working retrieval observed; unpaginated, correlated aggregate of SELECT * per sale with no sale_items.sale_id index. |
| GET `/employees`, GET `/employees/:id` | Working tested reads; unpaginated/sensitive SELECT *. Admin/HR only. |
| POST `/employees` | Working tested create, admin only; UI also offers it to HR. |
| PUT `/employees/:id` | Broken partial update: omitted fields overwritten with null; position/department/email ignored. |
| DELETE `/employees/:id` | Partially working; hard-delete conflicts with attendance/user references, raw exception. |
| GET `/attendance/employee/:employee_id` | Working tested; unpaginated; frontend calls `/attendance/:id` instead. |
| POST `/attendance` | Working tested statuses; duplicate day raw unique constraint error. |
| GET `/reports/financial`, `/reports/compliance` | Partially working; lists unused by frontend, unpaginated. |
| POST `/reports/financial`, `/reports/compliance` | Broken: insert column names absent from supplied schema. Retain and repair contracts; external consumers cannot be ruled out. |
| GET `/reports/recent-activity` | Partially working; bounded UNION across every historical record, invalid limit accepted; unnecessary sorting. |
| Operation report CRUD controller; dataService.getDailySales | Unused/unreachable: no mounting route; `/reports/sales-daily` does not exist. |

## Database inventory

| Table/view | Status / use |
| --- | --- |
| users | Working test login; init passwords invalid; public privilege creation unsafe. |
| products | Working reads; stock/expiry/barcode/reorder fields exist. NUMERIC(10,2) prices are safe in DB; UI math is floating point. |
| sales | Working sale totals/history; NUMERIC(12,2); nullable actor with no FK; no idempotency or reversal status. |
| sale_items | Working linked lines; missing sale_id index; no positivity constraints. |
| stock_movements | Partially working audit, sale actor not written; product writes not transactional. |
| employees | Working create/read; partial update broken; salary NUMERIC; preserve data. |
| attendance | Working API tested; unique employee/date; frontend unused. |
| operation_reports | Unused runtime controller/table; preserve data, remove unmounted controller only. |
| compliance_reports | Partially working reads, writes use wrong columns; preserve. |
| financial_reports | Partially working snapshots; wrong write columns; not an income/expense ledger. |
| low_stock_products / expiring_products views | Unused by controllers; correct real data concepts; keep DB views to avoid risky schema deletion. |
| Browser products/users/transactions/employees/attendance | Partially working; not scoped by user; stale sensitive/stock/money data and swallowed failure. Preserve stored legacy data for review; stop automatic writes/replay that cannot be safely reconciled. |

## Confirmed dead/unreferenced files/dependencies

`frontend/frontend/` is a second untouched Vite starter, not referenced by build/router. Dashboard components are not imported by Dashboard (one has fake figures and dead Settings/Inventory buttons). POS components are unimported by PosView; PosLayout imports nonexistent PosHeader. Inventory AddProduct/StockTable and shared Base* components have no runtime imports. Browser seed file is unimported and embeds plaintext sample passwords. `pinia-plugin-persistedstate` is never registered/imported. PostCSS/autoprefixer have no configuration/caller with Tailwind Vite plugin. White logo and duplicate favicon have no runtime reference. Remove only after another reference check; retain SQL and APIs where external use is uncertain.

## Errors and performance

API returns a mix of error/message/errors/details, sometimes raw SQL/exception text; connect() before try may throw HTML Express errors. Frontend interceptor only logs 401. Reads silently fall back to shared browser cache; inventory writes queue invalid data; deletes swallow denial. POS alerts concatenate exceptions. No timeout, global error boundary or retry controls. POS cart is retained for explicit HTTP rejection, but cleared for ambiguous network failures queued as sales.

Baseline: backend unit files 2/2; integration tests 6/6; frontend 34/34; production build passed (4.05 s). There are no configured lint/type-check commands: Unverified, not claimed passing. Initial JS 181.67 kB / 67.04 kB gzip. No browser page errors in measured flow. See evidence logs.

| Local measurement | Before | MVP budget |
| --- | ---: | ---: |
| POS initial readiness, dev server | 1,891 ms | <2,000 ms |
| POS search perceived | 136 ms | <200 ms |
| Add to cart perceived | 75 ms | <100 ms |
| Complete sale through receipt | 859 ms | <1,000 ms |
| Inventory initial readiness | 1,377 ms | <2,000 ms |
| Product search API (5-call mean) | 15.09 ms / 481 B | <200 ms |
| Product page API | 4.94 ms / 18,338 B | <300 ms |
| Sales history API | 5.11 ms / 17,271 B | <300 ms, bounded pages |

Single browser sample; local hardware is 3 vCPU/~9.7 GiB, not target pharmacy device. POS full download/IndexedDB rewrite, catalogue refresh at checkout, unbounded lists, sequential dashboard reads, correlated sales lines, large recent-activity sort are confirmed hot spots. No remote latency claims. Target hardware/printer behavior remains Unverified.

## Implementation assumptions

Preserve existing MWK currency and 16.5% VAT, move calculation to server and integer minor units; make VAT rate explicit in environment/config and deployment review. Follow existing financial report read roles (admin, manager, pharmacist, HR) and edit roles (admin, manager); cashier can see their own sales, not whole finances. Keep stock/money authoritative on server. Network failure keeps a resumable cart rather than completing an unconfirmed sale. Do not auto-submit legacy pending browser receipts: missing old server idempotency makes them impossible to reconcile automatically. No supplier/customer modules or payroll. Preserve existing tables and records, safely backfill income from existing sales; warn that historical client totals cannot be retrospectively validated.
