# Staff workflows and barcode comparison

Reference: `/home/patisto/Projects/CODECOLLECTIVE PROJECTS/metmma-pharmacy-system`, local `develop` commit `bbf029b617a5e390509f2b9783248726a57d62f1`. The reference checkout was on `polish`; comparison read the develop tree without switching or modifying it.

| Workflow | MVP before this change | Implemented here |
| --- | --- | --- |
| Accounts | Administrator registration only | Paginated/searchable account list, create, employee linking, automatic staff record creation, role changes, password reset, activate/deactivate |
| Session revocation | Active-account and role checks | Credential/access changes also increment a version checked on every authenticated request |
| Leave | Staff and attendance only | Requests, approval/rejection/cancellation, returned/completed state, history and current-leave filter |
| Leave integrity | No leave records | Valid calendar dates, inclusive ranges, active employee checks, serialized overlap protection, controlled terminal states, actor timestamps |
| USB barcode input | Already supported in POS | Preserved; empty scans ignored, ambiguous matches explained, failed additions retain the code |
| Camera barcode input | Missing | ZXing camera scanner in POS, inventory search, product creation and existing-product barcode editing |

The existing five roles, API error format, server-authoritative sales, checkout retry handling, inventory/financial audit workflows and shared UI components remain the basis of the implementation. Expanded reference roles and offline sale replay were not imported as part of these three workflows. Existing user edits were retained.

## Setup

Install the frontend lockfile with `npm ci --prefix frontend`. Before starting the updated backend, run `npm run migrate --prefix backend` against the intended database. This includes `20261003_staff_workflows.sql`, adding `users.session_version` and `employee_leave`. Existing accounts and staff are preserved; old unlinked accounts can be linked from Accounts. New account creation and employee linking occur in one transaction.

This additive staff migration is retained by the existing `migrate:down` command, which rolls back the older MVP sales/finance migration only. It does not delete leave history or reset credential versions.

Open Accounts as an administrator. Open Leave as an administrator or HR officer. Leave dates are inclusive; the API retains the reference field name `expected_return_date` for the last day of leave. Leave completion is explicit through “Mark returned”; attendance remains a separate record and is not rewritten automatically. Leave balances and entitlement policies are not part of this workflow.

Camera use requires HTTPS or localhost, browser permission, and a camera. EAN-13, EAN-8, UPC-A/E, Code 128, Code 39 and ITF are supported. Closing, navigating away, or detecting a code stops the media tracks, including delayed permission grants. A scan shared by multiple sellable batches requires selecting the correct product manually.

## Verification

Backend unit tests, frontend component/store tests, syntax/template checks and production build passed. Frontend tests on this machine's Node 26 require `NODE_OPTIONS=--no-experimental-webstorage npm test --prefix frontend`; the application itself uses browser storage normally.

Database integration tests now cover provisioning/link conflicts, password/session revocation, account permissions, concurrent leave overlaps, and terminal leave transitions. Run `TEST_DATABASE_URL=<isolated-test-database> npm run test:integration --prefix backend` to execute them. They were not executed here: PostgreSQL was unavailable and Docker required a sudo password. No application database migration was applied in this session. Real camera hardware scanning still needs a browser/device smoke test.

## POS and attendance follow-up

Run `npm run migrate --prefix backend` before starting this version. The additional `20261003_payment_amounts.sql` migration adds nullable received/change fields to sales; old receipts remain unchanged. The MVP rollback also leaves these additive fields intact.

Sell items loads the catalogue independently of checkout configuration and displays all active products across pages. Expired/out-of-stock products remain visible with sale buttons disabled. Checkout still needs valid configuration, stock and prices.

Cash received must cover the total; change uses integer minor units. Card, mobile-money and bank-transfer payments must equal the total. The backend verifies these rules and saves received/change values. Retries preserve the original tender amount. Older API clients that omit the amount retain exact-payment behavior; historical receipts are not backfilled with assumed tender amounts. Income continues to record the sale total, not cash tendered.

Staff → Attendance now has a paginated daily roster including unmarked staff, a date selector, corrections for existing daily records, and searchable history with date-range/status filters. Corrections retain one record per employee/day. Date validation rejects impossible calendar dates.

Follow-up verification: 49 frontend tests and backend unit suites pass. Integration coverage was extended for payment persistence/retries and dated attendance, but still requires an accessible isolated PostgreSQL database.

## Checkout availability and receipts

Restored carts now refresh product availability. Rejected checkouts identify affected product IDs with a safe reason (expired, inactive, missing, or missing expiry), and the cart shows the reason beside the item. The server logs these IDs/reasons with the Help reference for diagnosis. Expiry protection remains enforced. A live read-only database check timed out, so the reported Help reference could not be traced to a specific batch in this session.

Confirmed checkout opens a shared receipt dialog with a Print receipt button. The latest receipt can be reopened in POS, and Sales history offers View / print receipt for previous sales, including a clear REVERSED label when applicable. Printing uses a separate receipt-only document element to avoid clipping within a modal or printing the application navigation. The browser print window supports a printer or Save as PDF.

Verification: 52 frontend tests, backend unit suites, syntax/template checks and production build passed. Printer hardware and live database integration remain unverified. No additional schema migration is required for this follow-up.
