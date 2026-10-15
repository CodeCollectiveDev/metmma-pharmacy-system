# Version 2: setup and deployment

Version 2 is developed on `version-2`. It uses the existing GitHub Actions → SSH → PM2 workflow for the API and a separate Vercel project for the frontend. No live database is changed by preparing this branch.

## What changed

- Navigation is grouped into Daily work, Business and Team. Receipts, finances and reports link together; staff, attendance, leave and accounts link together.
- Help and the guided tour are available through the question mark in the top bar. The existing per-user/browser tour state prevents automatic repeats after skipping or completing the tour. Help can restart it.
- Required fields are marked and validation focuses the first invalid field, with inline guidance. Forms retain entered values after errors.
- Product creation asks for name, selling price, batch and expiry. Quantity defaults to zero, low-stock threshold to ten, and category to Other. Supplier and barcode number are optional. Internal product codes are generated when omitted.
- A barcode number identifies a product and is entered as text, with optional camera or USB scanning. Batch/lot and expiry remain separate: different batches can share a barcode. Staff must choose a batch when a code matches several products.
- Sell items has one search/code input, a camera button, a visible cart and payment total, change calculation, and protected checkout retries.
- Receipts use readable references such as `R-000123`. These derive from the sale ID, can be searched, and appear in printed receipts and exports. Historical database references remain intact and searchable.
- Leave and accounts share one searchable employee picker with keyboard navigation, active/unlinked filtering, and access to later result pages.
- Reports aggregate the entire selected period: sales totals, average sale, VAT, daily sales, top products and payment methods. Stock and staff reports are current snapshots. Report downloads contain full aggregate results; detail exports explicitly contain only the current page.
- Finances distinguish sales received, refunds, expenses and net recorded movement, with expense categories. This is not a bank balance or profit calculation.

## 1. Separate GitHub environment

Create a GitHub environment named **version-2** and add its own environment secrets:

- `VPS_HOST`
- `VPS_USER`
- `VPS_PORT` (optional; defaults to 22)
- `VPS_SSH_KEY`

Branch selection in `.github/workflows/deploy.yml` is explicit:

| Branch | GitHub environment | Server directory | PM2 process |
| --- | --- | --- | --- |
| `main` | `production` | `~/metmma-backend` | `metmma-backend` |
| `version-2` | `version-2` | `~/metmma-backend-v2` | `metmma-backend-v2` |

Both push deployments and manual dispatch use this mapping. Other branches cannot run the deployment job. The frontend is checked and built by Actions; Vercel publishes it separately.

## 2. New Neon database and server configuration

Create an empty Neon database for version 2. Use its application URL and its direct (non-pooler) migration URL. Do not use version 1's database URLs.

On the VPS, as the SSH deployment user:

```sh
mkdir -p ~/metmma-backend-v2
chmod 700 ~/metmma-backend-v2
```

Create `~/metmma-backend-v2/.env` with the following values, replacing placeholders:

```dotenv
NODE_ENV=production
PORT=3001
DATABASE_URL=postgresql://USER:PASSWORD@YOUR_V2_NEON_HOST/neondb
MIGRATION_DATABASE_URL=postgresql://USER:PASSWORD@YOUR_V2_DIRECT_NEON_HOST/neondb
DB_SSL=true
JWT_SECRET=REPLACE_WITH_A_NEW_RANDOM_SECRET_OF_AT_LEAST_32_CHARACTERS
ALLOWED_ORIGINS=https://v2.metmmapharmacy.com
TRUST_PROXY=1
TAX_RATE_BPS=1650
PHARMACY_TIMEZONE=Africa/Blantyre
```

```sh
chmod 600 ~/metmma-backend-v2/.env
```

Use your actual version-2 frontend origin, without a trailing slash. Choose a dedicated port and confirm the tax/timezone settings for this new database. As in the existing setup, omit `sslmode` and `channel_binding` parameters from URLs and let `DB_SSL=true` enforce certificate validation. `TRUST_PROXY=1` assumes one trusted reverse-proxy hop.

The version-2 deployment fails early if its `.env`, `DATABASE_URL` or dedicated port are missing. The workflow initializes only an empty public schema, removes fixture users during initialization, then runs the existing migrations. An existing database is preserved by initialization. Version 2 needs no additional schema migration beyond the current migration set.

## 3. API domain and first deploy

Point a separate API domain, for example `api-v2.metmmapharmacy.com`, at the VPS and configure the existing reverse proxy to forward that host to `127.0.0.1:3001`. Keep version 1's proxy host separate.

Commit and push the `version-2` branch after the environment and server `.env` are ready. The workflow will validate the code, package the backend with its SQL files, initialize/migrate the new database and start `metmma-backend-v2`.

The API readiness check is:

```text
https://api-v2.metmmapharmacy.com/api/health
```

Expect `{"status":"OK"}`. A failed readiness check needs investigation before using the frontend. The workflow checks local API readiness after starting PM2.

## 4. First administrator

On the VPS, after migration:

```sh
cd ~/metmma-backend-v2
export BOOTSTRAP_USERNAME=developer
read -rsp 'New administrator password (10–72 bytes): ' BOOTSTRAP_PASSWORD
echo
export BOOTSTRAP_PASSWORD
npm run bootstrap:admin
unset BOOTSTRAP_USERNAME BOOTSTRAP_PASSWORD
```

This command targets the version-2 `.env`. It preserves existing valid accounts. Users in the old database are not automatically copied to this new database.

## 5. Separate Vercel project

Import the same repository into a new Vercel project and select `version-2` as its production branch:

- Root directory: `frontend`
- Build command: `npm run build`
- Output directory: `dist`
- Production variable: `VITE_API_BASE_URL=https://api-v2.metmmapharmacy.com`
- Frontend domain: your chosen version-2 host, matching backend `ALLOWED_ORIGINS`

Redeploy after changing `VITE_API_BASE_URL`: Vite embeds it in the build. Do not assign the old frontend's domain to this project until you intend to switch versions.

## Acceptance checks after hosting

Use the new database to check:

1. Sign in as the new administrator. Skip the tour; navigating and signing back in should not automatically reopen it. The question mark can restart it.
2. Add a product with only required details and without a supplier, barcode or internal code. Confirm generated code and default stock values. Test missing fields, invalid price and expiry errors.
3. Add the barcode number manually, by USB scanner, and by camera. Create a second batch with the same barcode and confirm checkout asks you to choose the correct batch.
4. Make a cash sale, verify change and print its short receipt. Find it by that reference. Verify a rejected checkout keeps its cart.
5. Record/edit/delete an expense and check totals, category breakdown and feedback. Open its associated receipt from income records.
6. Create staff and accounts; select a staff member through the single picker. Record leave with an optional reason blank. Test overlap and date errors.
7. Compare report totals against multiple pages of receipts, including a reversed sale. Download both a full report and a detail page and verify their stated scopes.
8. Check stock/staff report access with non-admin roles, and use a narrow mobile screen to check navigation and dialogs.

Database integration and hosted end-to-end verification are intentionally left for deployment at the user's request. Local syntax and production-build checks do not establish live workflow correctness.
