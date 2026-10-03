# MVP hardening report — 2 October 2026

**Critical bugs fixed:** arbitrary administrator registration, insecure fallback JWT secret, injectable expiry filtering, client-controlled sale prices/totals/actor, false successful stock writes, duplicate offline receipt replay, and selling expired/inactive items. The uploaded application should not be used as a checkout rollback target.

Implementation and local verification are complete. Actual staff devices, a production database copy and hosting credentials were not supplied. This is a locally verified release candidate; production preflight and deployment remain **Unverified**.

## Changes by phase

| Phase | What changed and why | Evidence |
| --- | --- | --- |
| 0 — Audit | Read routes, validators, SQL, stores, components, callers and hosting files before application edits. Enumerated every declared action/route/table and observed failures. | AUDIT.md, INVENTORY.txt and baseline evidence; audit commit precedes implementation. |
| 1 — Beginner UX | Per-user first-run tour, skip/resume/relaunch in Help; plain instructions, empty-state actions, confirmations, current-page navigation, keyboard product selection, visible focus, accessible field labels and shared focus-trapped dialogs. Bounded product results and initially collapsed tablet navigation keep the cart reachable. | Frontend tests; production browser walkthrough; desktop/tablet screenshots and visual review. |
| 2 — Notifications | Working bell/unread badge, paginated newest-first notices with time/read state, mark one/all, friendly empty state, button/backdrop/Esc close and focus return. Real quantity/reorder/expiry triggers only; reads persisted per user; permitted users can open the relevant inventory item. | DB read-isolation test; browser verifies read controls, zero badge, empty state, close methods and Tab focus. |
| 3 — Errors | Shared Axios mapping and Vue error handling; stable sanitized backend codes, field paths and request UUIDs. In-place sign-in renewal; retry preserves cart/form; busy submission guards. | Forced DB failure hides SQL details; frontend mapping tests; browser forces validation, unreachable API, expired token and stock conflict. |
| 4 — Speed/integrity | Bounded authoritative POS search, 40 ms debounce, barcode lookup, lazy routes, paged lists, shared pool, indexes, timeouts and DB/schema readiness. Server-calculated money, ordered locks, atomic checkout and persisted retry references. Additive restock retry protection and stale-count rejection. | Measurements below; rollback, concurrent retry/stock tests; build chunks. |
| 5 — Finances | Sale and linked income commit together. Administrator full refund/void creates one reversing money record and returns units. Expenses have edit/confirmed soft-delete, actor and before/after audit. Searchable paged date/type/payment list, period totals, deleted-record audit review. | Exact decimal/reconciliation, reversal, expense CRUD/audit/stale-version and permission tests; browser verifies expense changes and visible reconciled totals. |
| 6 — Cleanup | Removed confirmed unimported starters/duplicates, fake payroll/dead actions, unsafe automatic sync and unused dependencies. Wired attendance; retained useful bounded reports and uncertain external APIs. | REMOVALS.md, FINAL_INVENTORY.txt, passing build/regressions and routed browser flows. |

No new runtime dependencies. Lockfile cleanup removed 85 frontend and 11 backend installed packages. Temporary Playwright tools were installed outside the application. LocalForage stays for read-only legacy record review.

## Reliability and data preservation

Checkout locks the user/request reference, then product rows in ascending ID order. Sale, lines, stock movements/deduction and income commit together. Repeating the same reference/cart returns the receipt; reusing it with a changed cart is rejected. An ambiguous failure locks the saved per-user draft until retry confirms it. Competing sales cannot oversell, and stale absolute stock adjustments cannot overwrite sales.

Database money remains exact decimal. Backend arithmetic uses BigInt minor units and integer tax basis points; the browser uses checked integer minor units. Display formatting uses numbers only. Historical sale totals are preserved and backfilled as income. Their original correctness cannot be reconstructed because the uploaded server accepted browser totals.

The migration is additive. Down archives new finance/audit/read tables and sale/item/stock metadata before removing added columns; up restores archives. Tests prove repeated up and populated up/down/up preservation. All writes must stop during migration/rollback. Actual-data rehearsal remains mandatory.

Legacy pending receipts lack reliable retry references. Administrator Help can export them for manual comparison with saved receipts. Their IndexedDB records remain untouched; automatic replay could duplicate money and stock.

## Performance

Budgets: visible POS search <200 ms, cart addition <100 ms, checkout-to-receipt <1,000 ms, POS/inventory ready <2,000 ms, bounded APIs <300 ms, initial JavaScript gzip <75 kB.

Same local Linux workspace, 3 virtual CPUs, approximately 9.7 GiB RAM, Node 24.19, PostgreSQL 16, Chromium, 1,000 synthetic products/100 sales. Comparable UI timings use Vite development mode; production build was separately walked through. UI/build timings are single samples, not percentile guarantees; API timings average five sequential requests. Raw JSON and the harness are retained.

| Measurement | Baseline | Final | Budget |
| --- | ---: | ---: | --- |
| POS ready | 1,891 ms | 657 ms | <2,000 ms |
| Search results visible | 136 ms | 106 ms | <200 ms |
| Add to cart | 75 ms | 59 ms | <100 ms |
| Checkout to receipt | 859 ms | 97 ms | <1,000 ms |
| Inventory ready | 1,377 ms | 220 ms | <2,000 ms |
| Product search API | 15.09 ms | 7.66 ms | <300 ms |
| Product page API | 4.94 ms / 18,338 bytes | 5.40 ms / 18,438 bytes | <300 ms |
| Sales history API | 5.11 ms / 17,271 bytes | 5.14 ms / 5,656 bytes | <300 ms |
| Transactions API | Missing | 5.12 ms | <300 ms |
| Notifications API | Missing | 4.83 ms | <300 ms |
| Initial JS / gzip | 181.67 / 67.04 kB | 159.70 / 61.17 kB | <75 kB gzip |
| Production build | 4.05 s | 3.07 s | Pass |

First hardened search took 211 ms with an 80 ms debounce; 40 ms met the budget. The intermediate result is retained. Checking active users against the database adds a few milliseconds to some list APIs while paging reduces payloads and page readiness improves. Stock/money are never supplied from an offline catalogue cache. Real device/network budgets are **Unverified**.

## Verification checklist

- [x] Production build and backend JavaScript/frontend JavaScript+Vue-template checks pass.
- [ ] Formal lint/static type checking — **Unverified / not configured** in this JavaScript project; no lint/type dependency added.
- [x] 9 backend unit, 23 real PostgreSQL integration and 35 frontend tests pass; none skipped.
- [x] Existing product/employee/attendance/sales contract coverage passes after adapting hardened responses and retry contracts. Unsafe offline-success tests were replaced with draft-preservation and authoritative API tests.
- [x] New tests cover rollback atomicity, retry idempotency, stock competition, decimal rounding, linked income, reversal, expense CRUD/audit and exact reconciliation.
- [x] Production walkthrough: first-run tour → product → barcode sale → receipt → notifications → restock → expense create/edit/delete → audit → transactions/summary.
- [x] Notification read controls, hidden zero badge, empty state, keyboard focus, button/overlay/Esc close verified.
- [x] Readiness against an actual unavailable DB returns a sanitized unavailable response and correlation ID.
- [x] Forced unreachable connection, invalid input, insufficient stock and expired session show friendly messages and preserve input/cart. Browser network test aborts requests; a separate real DB trigger forces an actual server write failure.
- [x] Before/after POS and existing-list measurements; new finance/notification API measurements.
- [x] Confirmed dead controls/placeholders/unimported routes removed or wired; reference inventory and normal browser routes checked.
- [x] Migration up/down/up on populated synthetic data preserves existing and new financial/audit/read/stock metadata.
- [x] Actual backup helper creates a custom-format synthetic DB backup; PostgreSQL 16 restores it into a separate database with 1,000 products, 101 sales/income records and equal totals.
- [ ] Migration on a copy of actual pharmacy data — **Unverified**, no data copy supplied.
- [x] No application debug console calls/debugger statements or real supplied secrets in production assets; no page errors or normal-flow console errors in the production browser walkthrough. Full failure details remain server-side.
- [ ] Hosted deployment, actual provider TLS/CORS/proxy configuration, physical scanner/receipt printer and pharmacy hardware/performance — **Unverified**.

Synthetic fixture passwords/signing secrets used by tests are not production credentials and are absent from the frontend bundle. Dependency exception strings remain inside bundled libraries; the error layer never displays them.

## Assumptions and review items

- Finance readers follow existing financial-report roles: administrator, store manager, pharmacist and HR officer. Expense writers: administrator/store manager. Reversals: administrator. Cashiers see their own receipts and cannot access finance summaries. Confirm against staff responsibilities.
- MWK and the existing 16.5% VAT remain. Confirm TAX_RATE_BPS=1650 against the pharmacy's applicable rate before release.
- Existing SQL timestamps have no zone; default UTC preserves the baseline interpretation. Confirm old-row semantics before changing PHARMACY_TIMEZONE. DB sessions and Node parsing use the same setting.
- Refund/void is a full-sale reversal returning all units; no partial refunds. Administrators must follow the physical return-to-stock policy.
- Tour completion and checkout drafts are remembered per user in that browser/device, not synchronized between devices.
- Ambiguous barcode/batch matches are rejected rather than selecting an arbitrary product. Physical label/scanner behavior is **Unverified**.
- Suppliers remain product text; customers remain optional receipt names. No missing supplier/customer module was invented.
- Legacy financial/compliance/report APIs, recent activity and operation_reports tables/views remain because external use could not be ruled out. Retained APIs are validated/sanitized/paginated where applicable; review consumers before deleting them.
- No production data, deployment credentials or actual device specifications were supplied; remote deployment was not attempted.

Every removal and reference check is documented in REMOVALS.md. Git baseline preserves removed source. All implementation commits are on mvp-hardening.

## Recommended after MVP

1. Regular off-host backups and restore rehearsals.
2. Manual reconciliation of legacy pending receipts and historical browser-controlled totals against real receipts.
3. Staff smoke/performance checks with actual scanners, printers and network.
4. CI lint/type baseline and hosting smoke checks when the maintenance owner and deployment target are confirmed.

See DEPLOYMENT_CHECKLIST.md for weekend rollout, environment settings, migration preflight, smoke tests and rollback.
