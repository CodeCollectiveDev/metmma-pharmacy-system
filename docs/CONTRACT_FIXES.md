# Contract regression fixes

Scope: checkout [#41](https://github.com/CodeCollectiveDev/metmma-pharmacy-system/issues/41), catalogue [#58](https://github.com/CodeCollectiveDev/metmma-pharmacy-system/issues/58), employee creation [#42](https://github.com/CodeCollectiveDev/metmma-pharmacy-system/issues/42) (overlapping #21), recon G25 attendance status validation, and the requested focused test setup. No standalone issue was found for G25 or the test setup. These are independent fixes, with shared API/orchestration changes limited to their callers.

## Checkout

Execution path: `PosView.vue` → `posStore.checkout` → `dataOrchestrator.saveItem` → `dataService.recordSale` → authenticated/authorized `POST /api/sales/checkout` → Joi `validateSale` → `salesController.processSale` → transaction across `sales`, `sale_items`, `products`, `stock_movements` → confirmed sale → receipt/local cache. Offline transactions replay through the same `recordSale` API boundary.

The controller and `backend/backendSystemTest.js` establish the existing camelCase request contract. The old view instead sent `total` and line `total`, omitted the user ID, and posted stock decrements to product creation. It also displayed receipts after API rejections were converted to offline success.

Requests now contain `items[{productId,quantity,unitPrice,subtotal}]`, `totalAmount`, `paymentMethod`, optional `customerName` and optional `userId`. Database product IDs are required. Local display/cache fields are stripped at the API boundary; legacy pending receipts with `total` fields are translated there. Unsynchronized product identifiers are not guessed. Joi rejects malformed fields, empty carts, and nonpositive/noninteger quantities before SQL. Existing checkout authorization is unchanged (admin, cashier, pharmacist).

The response retains `success`, `message`, `receiptNumber`, `saleId`, and adds `data` containing the confirmed sale. History's existing SQL-shaped response remains compatible; the existing frontend normalization boundary maps it to the checkout's logical fields. The existing `total` alias is retained for report/dashboard consumers. The current UI's 16.5% tax calculation is retained, with money rounded to two decimals; this does not establish any new tax/pricing rule. The database still persists the gross total and line subtotals, with no added tax fields.

Stock persistence belongs to the backend transaction. Offline stock deduction is only a local cache projection, never a queued product write. A pending sale does not produce a confirmed server receipt. HTTP rejections surface to the cashier and keep the cart. History refresh preserves pending sales; synchronization adopts the server ID/receipt and removes the temporary sale key.

These sale-specific error, identity and pending-record corrections overlap #56 but are blocking for #41 and the requested offline contract. This is not a general offline queue redesign. Idempotency after an ambiguous network failure (#55), account isolation (#50), caller-supplied actor identity (#48), full financial arithmetic rules (#47), and inactive-product enforcement (#49) remain separate.

## Catalogue

All current consumers (inventory, POS, dashboard, reports) call `dataService.getProducts` through `dataOrchestrator.fetchCollection`. They search/count a local catalogue, including while offline. `GET /api/products` already applied page/limit with a default of 50, but returned only that page's `count` without metadata.

The endpoint retains `success`, page `count`, and `data`, and adds `pagination: {page, limit, total, totalPages, hasMore}`. Count queries use the same active/category/search filters. Stable `name, id` ordering handles identical product names. Invalid page/limit values return 400. Authentication and filters are unchanged.

`getProductPage(params)` exposes individual pages without discarding metadata. Existing full-catalogue consumers fetch consecutive normal-sized pages; no arbitrary high limit is used. A failed later page rejects the full fetch before cache replacement. Full loading is needed by the existing offline search/count design; server-side UI pagination would be a separate architectural change. Offset pagination does not provide a snapshot during concurrent catalogue edits.

## Employee creation

Execution path: HR form → `hrStore.addEmployee` → `dataService.addEmployee` → authenticated admin-only `POST /api/employees` → `employeeCreateSchema` → `employeesController.addEmployee` → `employees` INSERT/RETURNING → success details and refreshed list. Employee records do not create login accounts or grant permissions.

| Field | Form/API | Validation | Persistence |
|---|---|---|---|
| `employee_id` | Not client supplied | Not an accepted write field | Controller generates `EMP-` plus UUID; unique/non-null constraint retained |
| `first_name`, `last_name` | Separate required inputs | Existing length/required checks | Same-named columns |
| `email` | New required email input | Required valid email, normalized lowercase, max 255 | New nullable `employees.email` |
| `department` | Required existing selector | Required string, max 50; no unsupported enum | Existing `department` column |
| `job_title` | Required position input mapped by store | Required string, max 100 | Existing `position` column |
| `role` | Optional role input | Preserved optional string, max 50 | Existing `role` column; independent of login roles |
| `phone` | Optional input, omitted when empty | Existing phone validation | Existing `phone_number` column |
| `hire_date` | Date input/default | Existing ISO date/default | Existing required `hire_date` column |
| `salary` | Required numeric input | Existing positive two-decimal validation | Existing `salary` column |
| `is_active` | Not client supplied on creation | Database default | Existing true default |

The validator's previous department enum disagreed with the existing UI options and the unconstrained database string. Accepting bounded department strings preserves both old API departments and existing UI choices. The controller returns the created row under `data`, retaining its success message. Validation failures remain 400 with field details; the form now displays them. A missing/empty optional phone is no longer submitted as an invalid empty string. `hire_date` is mapped for display in the refreshed employee list.

### Email migration

The user explicitly selected persistence of employee email with an additive column. The old validator required email but there was no employee column to store it. `users.email` belongs to a login account; `employees.user_id` is optional, and HR employee creation does not create accounts. Reusing it would require unrelated account creation or lose email for employees without accounts. No existing employee field represents email.

Apply `database/migrations/20260917_employee_email.sql` to existing databases **before** deploying the backend. For example, using an already configured PostgreSQL connection:

```sh
psql -v ON_ERROR_STOP=1 -f database/migrations/20260917_employee_email.sql
```

The script uses `ADD COLUMN IF NOT EXISTS email VARCHAR(255)` in a transaction. Legacy rows remain null, with no invented backfill or uniqueness rule. New records require email through API validation. `database/init.sql` includes the column for fresh databases; re-running a CREATE TABLE IF NOT EXISTS initialization is not a substitute for migrating existing tables. No existing constraint is relaxed and no other schema change is required. The migration has not been applied to any project/deployed database.

Partial employee updates, omitted-field overwrites, and inactive employee display are pre-existing #59 work and are not claimed as repaired here. The existing full-field update path and retrieval remain in place.

## Attendance

`hrStore.markAttendance` supplies lowercase `present` by default; the UI labels Present/Absent refer to those existing states. Authenticated `POST /api/attendance` (admin/HR officer/store manager) validates then passes the status directly to `attendanceControllers.addAttendance`. PostgreSQL's existing domain is `present`, `absent`, `late`, `leave`, `holiday`; no attendance seeds add another state. Joi now accepts that domain and lowercases title-case callers. `Excused` is rejected with a 400 validation message. The SQL constraint and valid stored rows are unchanged.

The UI attendance buttons remain disconnected and reads still use local storage: that independent workflow is #22/recon G26. This change repairs the status contract only; it does not claim the attendance screen is complete.

## Verification commands

No backend unit framework or CI test configuration existed. Node's built-in test runner is the smallest setup and adds no dependency. Existing frontend Vitest/Vue Test Utils are reused. Existing locked dependencies were installed with user permission; no dependency versions or lockfiles changed.

```sh
npm --prefix backend test
npm --prefix frontend test
npm --prefix frontend run build
TEST_DATABASE_URL=postgresql://postgres@127.0.0.1:55432/metmma_contract_tests npm --prefix backend run test:integration
git diff --check
```

The database suite requires an isolated PostgreSQL database, creates uniquely named schemas, uses the real route/auth/validation/controller/SQL path, and drops only its own schemas. It covers pagination/filter metadata over 103 products, checkout persistence and stock rollback, employee identifiers/fields/retrieval/full updates, attendance persistence, and applying the email migration twice to a legacy employee table. It never loads the application's environment/database configuration. Frontend tests cover real form submission, catalogue consumers beyond page one, accepted checkout payloads, errors, offline replay and server identity adoption.

There is no configured lint or type-check command.

### Executed results (2026-09-17)

| Verification | Result |
|---|---|
| `npm test` in `backend/` | PASS: both native test files (9 cases); cases also inspected using direct Node invocation |
| `node backend/test/contracts.test.js` | PASS: 6 validation cases |
| `node backend/test/products.test.js` | PASS: 3 pagination cases |
| `node --test --test-reporter=spec backend/test/contracts.test.js backend/test/products.test.js` | PASS |
| `npm test` in `frontend/` | PASS: 34 cases in 6 files |
| `npm run build` in `frontend/` | PASS |
| `TEST_DATABASE_URL=postgresql://postgres@127.0.0.1:55432/metmma_contract_tests npm run test:integration` in `backend/` | PASS: 6 real PostgreSQL/API cases, including fresh schema and additive migration |
| `node --check` across all 51 backend/frontend JavaScript files | PASS; Vue templates also compiled by the build |
| `git diff --check` | PASS |
| Comparison of dependency declarations and lockfiles against Git HEAD | PASS: unchanged |

Initial dependency installs failed with sandbox DNS errors and then network resets. Both succeeded with the same lockfiles using `npm ci --no-audit --no-fund --cache /tmp/metmma-npm-cache --maxsockets=3 --fetch-retries=1 --fetch-timeout=30000` and elevated network access. The added POS view test initially had an incomplete router mock; the mock was corrected without skipping assertions, and the full suite passed afterward.

The integration command initially failed without `TEST_DATABASE_URL` (intentional environment guard), and the sandboxed socket-based run failed. The full elevated run against the disposable container passed. Direct Docker Hub downloads of `postgres:16` and `postgres:16-alpine` timed out; the official image was successfully obtained through `mirror.gcr.io/library/postgres:16-alpine`. Test schemas were removed by the integration suite. No project or deployed database was used or migrated.

Live browser/device operation, a production deployment, and the broader issues explicitly excluded above were not verified. The migration still needs to be applied to the target deployment before its new employee API is released.

### Resumed-session verification (2026-09-17)

Recovered the previous session's task, approvals, and actual PostgreSQL test output. Implementation was already complete; the unfinished step was the final verification/handoff. No application code was changed during the resumed session.

- Re-ran `npm --prefix backend test`: PASS. Direct runs of `node backend/test/contracts.test.js` and `node backend/test/products.test.js` also passed all 9 individual cases.
- Re-ran `npm --prefix frontend test`: PASS, 34 tests in 6 files.
- Re-ran `npm --prefix frontend run build`: PASS.
- Re-ran `git diff --check` and the lockfile comparison: PASS.
- Confirmed the previous PostgreSQL integration run's output: 6 passed, 0 failed. This suite was not rerun in the resumed session; its disposable database had already been removed.
- Confirmed with Docker that no `metmma` test containers remain. The sandbox denied Docker socket access; the authorized elevated check succeeded.

At this verification checkpoint, the implementation was uncommitted on `fix/confirmed-contract-regressions`. No push, merge, rebase, deployment, or target-database migration had been performed. The pre-existing `.gitignore` edit and `docs/PHASE_1_RECONNAISSANCE_REPORT.md` were preserved and are not part of these fixes.
