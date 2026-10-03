# Verification evidence

Raw logs/JSON are retained rather than inferred outcomes. Baseline artifacts describe uploaded source; final artifacts describe the hardened release.

- baseline-* — original build/tests/performance; baseline backend unit run was sandbox-limited, while its real DB integration suite passed separately.
- final-* — 9 backend unit, 23 PostgreSQL integration and 35 frontend tests, syntax/template checks, production build and comparable local performance.
- after-before-search-tuning.json — first hardened search measurement that missed the budget, before the debounce correction.
- production-browser-verification.json — complete production walkthrough assertions and console/page error results.
- pos-* and finances-* screenshots — 1440×900, 1024×768, 768×1024; desktop finances and all POS screenshots were visually reviewed.
- readiness-failure.json and its server log — an actual refused local DB connection returns sanitized unavailable readiness plus a help reference; full connection detail stays in the server log.
- backup-restore-verification.json — actual backup helper with PostgreSQL 16 pg_dump supplied by the existing container, restored to a separate empty database; row counts and exact totals checked. Provider backup/restore remains unverified.
- harness-reproduction.txt — packaged performance harness executes successfully; this repeat is supplementary evidence, not substituted for the recorded baseline/final pair.

## Reproduce the browser checks

The harness is separate test tooling, not an application dependency. It changes synthetic products, passwords and receipts; reset clears financial records. Never run it against real pharmacy data.

1. Install Playwright in a separate tools directory, e.g. /tmp/metmma-browser-tools, and install Chromium there.
2. Create an empty PostgreSQL fixture database using the example loopback-only test connection in config.cjs, or set MVP_BENCH_DATABASE_URL to a separate disposable database. Do not reuse production credentials.
3. Set MVP_BENCH_FIXTURE=disposable. Run seed-fixture.cjs, then the backend migration against that database. Seed uses fixture password MvpTestPassword42 and placeholder accounts from the supplied init.sql.
4. Start backend on localhost:3000 with the fixture DB, fixture JWT_SECRET matching config.cjs, DB_SSL=false, TAX_RATE_BPS=1650, PHARMACY_TIMEZONE=UTC. Allow the local frontend origins when testing separate ports.
5. Start Vite dev on localhost:5173 for performance. For the production walkthrough, build and run Vite preview on localhost:4173 (its local /api proxy reaches port 3000).

~~~sh
MVP_BENCH_FIXTURE=disposable node docs/mvp/evidence/harness/final-browser-performance.cjs
MVP_BENCH_FIXTURE=disposable node docs/mvp/evidence/harness/production-walkthrough.cjs
~~~

MVP_BROWSER_TOOLS chooses the separate Playwright installation. Optional MVP_BENCH_JWT_SECRET must match the local backend. Outputs are written under /tmp; see the scripts for the exact names. Reset only a disposable fixture before comparing performance. baseline-browser.cjs targets the uploaded markup, so run it against the preserved baseline checkout and corresponding unmigrated isolated fixture.

Reported UI measurements are individual headless-browser samples. They do not establish p95 latency or performance on pharmacy hardware. Syntax checks are not formal lint/static type checking.
