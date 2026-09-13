# Barcode Scanning — Setup, Run & Test Guide

This document explains how to run the METMMA system with barcode scanning enabled and how to test each part of the feature.

The feature adds:
- A backend barcode lookup endpoint
- Barcode-aware lookup in the POS (fixes the old `batch_number`-only search)
- Camera-based barcode scanning (phone camera) in the POS
- A `barcode` input field on product forms
- Barcode-aware search in the Inventory dashboard

---

## 1. Prerequisites

- Docker (for PostgreSQL) — or your own PostgreSQL instance
- Node.js `^20.19.0 || >=22.12.0`
- npm

---

## 2. Start the Database

The schema lives in `database/init.sql` (includes the `barcode` column, a new `idx_products_barcode` index, and seeded barcodes for the 5 demo products).

```bash
# From the repository root
docker compose up -d
```

This creates the `products` table with barcode seed data. If you already have a database running, run `database/init.sql` against it instead, or just add barcodes to your existing products manually (see §6).

---

## 3. Run the Backend

```bash
cd backend
npm install
npm start
```

Copy `.env.example` to `.env` if it does not exist, and update the database connection values as needed.

The backend serves the API at `http://localhost:3000`.

Confirm the new endpoint is reachable:

```bash
curl "http://localhost:3000/api/products/barcode/0500001234567"
```

Expected response (Panadol Extra):

```json
{
  "success": true,
  "data": { "id": 1, "name": "Panadol Extra", "barcode": "0500001234567", "...": "..." },
  "batches": [ { "...": "..." } ]
}
```

A 404 is returned for an unknown barcode.

---

## 4. Run the Frontend

Open a second terminal:

```bash
cd frontend
npm install
npm run dev
```

Open the printed URL (default `http://localhost:5173`). The Vite dev server proxies `/api` → `http://localhost:3000`.

> **Camera note:** Camera access requires a secure context. `localhost` works fine; if testing from another device on your LAN, serve over HTTPS or it will be blocked by the browser.

---

## 5. Test Scenarios

### 5.1 Backend barcode lookup

With the backend running:

```bash
# Existing barcode → product
curl "http://localhost:3000/api/products/barcode/0500001234567"

# Unknown barcode → 404
curl -i "http://localhost:3000/api/products/barcode/9999999999999"
```

### 5.2 POS — manual barcode entry

1. Log in as a cashier/admin.
2. Go to the **Point of Sale** page.
3. In the barcode field, type a seeded barcode (e.g. `0500001234567`) and press **Enter**.
4. The product is added to the cart and a green "added to cart" message appears.
5. Type an unknown barcode (e.g. `1234567890123`) — a red "Product not found" message appears and nothing is added.

The seeded barcodes for the demo products are:

| Product | Barcode |
|---|---|
| Panadol Extra | `0500001234567` |
| Amoxicillin 500mg | `0111109876543` |
| Ventolin Inhaler | `0500005555555` |
| Insulin Glargine | `0543211112222` |
| Paracetamol 500mg | `0600004444444` |

### 5.3 POS — physical USB/Bluetooth scanner

Physical barcode scanners present themselves as keyboard devices, so they "type" into the barcode input and send an **Enter** keystroke automatically.

1. Plug in / pair your scanner.
2. Focus the barcode input.
3. Scan a barcode — the product should be added to the cart automatically.

No code changes are needed for this path; it works because the input now resolves by `barcode`.

### 5.4 POS — camera scanning (phone camera)

1. On the **Point of Sale** page, click the **camera icon** button next to the Scan button.
2. Grant camera permission when prompted.
3. Point the camera at a printed barcode (use one of the seeded codes generated as a barcode, or use a barcode generator site).
4. The code is auto-detected and the product is added to the cart, and the modal closes.

Use a barcode generator (e.g. search "barcode generator") to render one of the seeded codes as a real scannable barcode.

If the camera is unavailable or permission is denied, an error screen appears with a **Try Again** button.

### 5.5 Manual product search still works

- The regular "Search products..." field and category filters are unchanged and continue to work alongside barcode scanning.

---

## 6. Adding a Barcode to a Product

### Via the UI
1. Go to **Inventory Management**.
2. Click **Add Product**.
3. Fill in the required fields and optionally enter a **Barcode (optional)**.
4. Save — the product can now be scanned.

### Via SQL (existing products)
```sql
UPDATE products SET barcode = '5901234123457' WHERE product_code = 'MED001';
```

---

## 7. Offline / Local-First Behavior

The POS first checks the locally-cached products (LocalForage) for the barcode. If found there, no network call is made. If not found locally and the device is online, it falls back to a server-side barcode lookup.

The offline seed data in `frontend/src/pouchdb/seed.js` already includes barcodes for `Amoxicillin 500mg` and `Paracetamol 500mg`, so those can be scanned even without a backend.

> **Note:** the cached product list in your browser may predate the new barcode data. If a barcode isn't found offline, clear the relevant local data (or load the app online once) so the products are refreshed from the backend.

---

## 8. Build & Lint Verification

```bash
# Frontend production build (catches template/script errors)
cd frontend && npm run build

# Backend module load sanity check
cd backend && node -e "require('./api/controllers/productsController'); require('./api/routes/productsRoutes');"
```

---

## 9. Troubleshooting

| Symptom | Likely Cause / Fix |
|---|---|
| Camera button does nothing | Not in a secure context — use `localhost` or HTTPS |
| "Unable to access camera" | Camera permission denied or no device — click Try Again or check browser permissions |
| Barcode not found | Product has no `barcode` value — add one via the UI or SQL (see §6) |
| Physical scanner not adding to cart | Ensure the barcode input is focused before scanning |
| Backend 404 on barcode endpoint | Confirm backend is running and the barcode exists in the DB |
