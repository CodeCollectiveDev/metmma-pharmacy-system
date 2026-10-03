# Confirmed removals and retained data

Reference evidence: Phase 0 INVENTORY.txt plus `rg` over current runtime imports/callers, router entries and Vite build root. Git's baseline commit preserves every removed file.

| Removed | Why confirmed unused/nonfunctional | Replacement / preservation |
| --- | --- | --- |
| `frontend/frontend/` | Nested Vite starter; root index.html/main.js and build config target `frontend/src`, no imports point into nested starter. | Main app stays. |
| DashboardActions/Header/Stats | Dashboard imports only MainLayout/data services; no imports of these components. Fake figures and dead settings button inside unused code. | Real server dashboard counts and working role-aware links. |
| POS CartSection/ProductGrid/PosLayout | PosView never imports them; PosLayout imports missing PosHeader. Dead discount/pay buttons and alternate tax rate. | Actual PosView retains working cart, server VAT and receipt. |
| Inventory AddProduct/StockTable; shared Base* | No runtime imports; duplicate forms/tables, unused edit event and commented delete. | Accessible routed inventory form/table. |
| Browser seed | Unimported; plaintext development user passwords. | Real bcrypt login; controlled administrator bootstrap. |
| Sync worker + data orchestrator | Replaced all runtime callers with bounded authoritative API requests; auto-replayed ambiguous receipts, saved rejected product writes as successful. | Failed sales remain in per-user drafts; old IndexedDB records untouched. Admin Help can download pending records for reconciliation. Never replay legacy receipts automatically. |
| HR row ellipsis | No handler. | Removed cell/column. |
| HR Payroll tab | Invented 10% deductions, no payroll domain/tables. | Salaries and employee data remain. Attendance buttons now save actual attendance. |
| Ignore Low Stock / bulk expired removal | Ignore properties have no SQL fields; absolute/browser-only stock writes; bulk delete hid rejected calls. | Persisted notification read state; individually confirmed admin-only product deactivation. Stock records remain intact. |
| Static notification dot | No handler or data. | Real unread badge and accessible, paginated panel. |
| Fake support phone/email | No verified contact configuration/source. | Help refers to pharmacy administrator and sanitized request reference. |
| Unmounted operationReport controller | No route imports/mounts; no frontend API calls. | `operation_reports` table and its data/views/indexes retained for review. |
| backendSystemTest.js | Standalone outdated mutation script; no authentication/idempotency contract, not invoked by test/start scripts. | Real isolated integration suite. |
| White logo / duplicate favicon | No imports or public references. | Referenced logo/favicon retained. |
| frontend uuid, pinia-plugin-persistedstate | UUID now native crypto; persistence plugin never registered. | Native UUID and per-user draft storage. |
| frontend autoprefixer, postcss (direct), vue-devtools plugin | No PostCSS config/caller; Tailwind Vite plugin handles CSS. Development inspector removed. | Transitive PostCSS needed by Vite stays in lockfile. |
| backend axios | Only caller was removed standalone backendSystemTest.js. | Built-in fetch in tests. |

No database table, existing sale, product, staff record, audit entry or browser pending record was deleted by this cleanup. APIs and DB tables with uncertain external consumers (`reports/financial`, `reports/compliance`, recent activity and legacy report tables/views) remain, with sanitized errors, validated inputs and pagination. Their writes now use the actual supplied schema. No new runtime dependencies or frameworks were added. Temporary Playwright tooling lives outside the project.
