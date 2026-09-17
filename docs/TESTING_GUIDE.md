# Testing Guide — METMMA Pharmacy System

How to spin up the system and test the production-readiness changes from the
current sprint. Covers the super-admin bootstrap, RBAC, user provisioning,
POS checkout, and HR employee flows. Corresponding issues: `issues/issue1.md`,
`issue2.md`, `issue3.md`, `issue5.md`. Issue #4 (session management / refresh
tokens) is intentionally **out of scope** for now.

---

## 1. Prerequisites

- Node.js 18+ and `npm`
- PostgreSQL 16 — easiest via `docker-compose` (see `database/DATABASE_SETUP_GUIDE.md`)
- Nothing else; the frontend proxies `/api` to the backend during dev

Install dependencies once:

```bash
# Frontend
cd frontend && npm install && cd ..

# Backend
cd backend && npm install && cd ..
```

---

## 2. Set up the database

### Option A — Fresh database (Docker)

```bash
docker compose up -d postgres
# If your user can't reach Docker, re-login or run: newgrp docker
```

On first boot, `docker-entrypoint-initdb.d/init.sql` runs automatically
(volume mounted from `./database/init.sql`). This already includes the new
9-role set and the auto-generated `employee_id` default, so no migrations
are needed for a fresh volume.

> ℹ️ The seed users' passwords are placeholder hashes and **cannot be used to
> log in**. Provision a real super admin in step 3, then create staff accounts
> from the UI (step 5) — don't rely on the seed accounts.

### Option B — Existing database (apply migrations)

If you already have a database from before this sprint, apply the two
migrations instead of re-creating it:

```bash
psql "postgresql://metmma_user:SecurePass123!@localhost:5432/metmma_pharmacy" \
  -f database/migrations/001_expanded_roles.sql
psql "postgresql://metmma_user:SecurePass123!@localhost:5432/metmma_pharmacy" \
  -f database/migrations/002_employee_id_default.sql
```

Verify the schema quickly:

```sql
SELECT column_name, column_default
FROM information_schema.columns
WHERE table_name = 'employees' AND column_name = 'employee_id';
-- should show a default like 'EMP-' || lpad(nextval('employee_id_seq'::regclass)::text, 6, '0'))

-- the 9 roles live in a CHECK constraint on users.role:
SELECT conname, pg_get_constraintdef(oid)
FROM pg_constraint WHERE conrelid = 'users'::regclass;
```

---

## 3. Create the super user (bootstrap)

There is **no public registration endpoint** anymore. The first account is
provisioned with a one-time CLI script that bcrypt-hashes the password for
you:

```bash
cd backend
ADMIN_USERNAME=admin \
ADMIN_PASSWORD='change-me-to-something-strong' \
ADMIN_EMAIL='admin@metmma.pharmacy' \
npm run create-admin
```

- Creates the user with role `super_admin` and `is_active = TRUE`.
- If the username already exists, it is **promoted** to `super_admin` and its
  password **reset** — the same command can recover a lost admin password.
- Password must be ≥ 8 characters.

Positional form also works:
`node scripts/createAdmin.js admin '<strong-password>' admin@metmma.pharmacy`

---

## 4. Run backend and frontend

```bash
# Terminal 1 — backend (http://localhost:3000)
cd backend && npm start

# Terminal 2 — frontend (http://localhost:5173)
cd frontend && npm run dev
```

Expected backend startup log ends with a listen message. If it logs a DB
connection error instead, the database isn't reachable — check step 2.

Open http://localhost:5173 and log in as the super admin you just created.

---

## 5. Provision staff accounts (Issue #1 — registration security)

As super admin:

1. Go to **User Management** (`/users`).
2. Click **Add New User** → `username`, `role` (pick from the 9 roles),
   `full_name`, `email`, `password`. Save.
3. The new user appears in the list. Use **Reset Password** to set a new
   password for any account (uses `PATCH /api/auth/users/:id/password`).
4. Use **Deactivate** to disable an account; that user can no longer log in
   (login is rejected because `is_active` is false).

Verify negative cases:
- `GET /register` → no route (redirects to catch-all). Registration is gone.
- Log in as a non-`super_admin` account and open `/users` → **403 / blocked**.
- `curl` the same endpoints with a cashier token → 403 (see curl examples below).

Create at least one account per role so you can walk the RBAC matrix in step 6:
`managing_director`, `director`, `pharmacist_manager`, `pharmacist`,
`assistant_pharmacist`, `store_manager`, `cashier`, `hr_officer`.

---

## 6. RBAC permissions (Issue #5)

The 9 roles and their hierarchy (highest → lowest):

```
super_admin (10) → managing_director (9) → director (8) → pharmacist_manager (7)
→ pharmacist (6) → store_manager (5) → assistant_pharmacist (4)
→ hr_officer (3) → cashier (2)
```

Role matrix is the source of truth in `docs/PERMISSION_MATRIX.md`. Test each
role by logging in and checking **sidebar visibility**, **route access**, and
**API authorization** (403s). Key checks:

| Role | Should see | Routes blocked for them |
|------|-----------|-------------------------|
| super_admin | everything incl. **User Management** | none |
| managing_director | dashboards, reports, products, users | *(grants User Management too)* |
| director | dashboards, reports | POS write, HR, user mgmt |
| pharmacist_manager / pharmacist | inventory + POS + dashboard | reports write, HR, user mgmt |
| assistant_pharmacist | inventory + dashboard | sales write, reports write, HR, user mgmt |
| store_manager | inventory + POS + dashboard | reports write, HR, user mgmt |
| cashier | POS + dashboard | inventory edits, HR, user mgmt |
| hr_officer | HR + dashboard | POS write, reports write, user mgmt |

Practical tests:
- Log in as `cashier` → POS works, **Inventory edit buttons hidden**, navigating
  directly to `/inventory`, `/hr`, or `/users` redirects/blocks.
- Log in as `hr_officer` → HR works, `/pos` blocked.
- Log in as `director` → read-only dashboards/reports available, `/hr` and
  `/users` blocked.
- Every role can reach `/dashboard` and `/help`.

API-level 403 checks (all use the role gates in the route files):

```bash
# Get a token (adjust username/password)
TOKEN=$(curl -s -X POST http://localhost:3000/api/auth/login \
  -H 'Content-Type: application/json' \
  -d '{"username":"cashier","password":"<pw>"}' | jq -r .token)

# cashier must be FORBIDDEN (403) from creating a user
curl -s -X POST http://localhost:3000/api/auth/users -H "Authorization: Bearer $TOKEN" \
  -H 'Content-Type: application/json' \
  -d '{"username":"x","password":"password123","role":"cashier"}'   # → 403

# cashier must be FORBIDDEN from deleting/changing stock on a product
curl -s -X POST http://localhost:3000/api/products -H "Authorization: Bearer $TOKEN" \
  -H 'Content-Type: application/json' \
  -d '{"productCode":"T1","name":"Test Drug","batchNumber":"B1","expiryDate":"2030-01-01","unitPrice":1,"sellingPrice":2,"supplier":"S","category":"C"}'   # → 403
```

---

## 7. POS & stock (Issue #2)

End-to-end happy path:
1. Log in as `cashier` (or `store_manager`/`super_admin`).
2. Go to **Inventory** (`/inventory`), add a product if none exists. Note its
   stock level.
3. Go to **POS** (`/pos`), pick products into the cart, click **Checkout**
   with a customer name and payment method.
4. Confirmation/receipt is shown **only after the backend confirms the sale**
   — then the cart clears and products refresh.
5. Verify stock actually decreased in the backend (Inventory page, or via SQL):

```sql
SELECT name, quantity FROM products ORDER BY name;
SELECT receipt_number, total_amount, payment_method FROM sales ORDER BY id DESC LIMIT 5;
SELECT * FROM sale_items ORDER BY id DESC LIMIT 5;   -- line items written
```

Critical regression checks (this is what was broken before):
- **Cart is NOT cleared before the sale succeeds.** Kill the backend mid-checkout
  (Ctrl-C on terminal 1) → the cart stays intact and no sale is recorded.
- **Stock is NOT decremented on the client.** Even if the network dies, the UI
  never calls stock deductions itself; the customer can retry once backend is up.
- **Malformed payloads are rejected.** A sale with an empty cart, a non-integer
  `productId`, a zero quantity, or a missing/zero `totalAmount` → 400 with a
  clear message, nothing written.

Manual checkout curl:

```bash
TOKEN=$(curl -s -X POST http://localhost:3000/api/auth/login \
  -H 'Content-Type: application/json' \
  -d '{"username":"cashier","password":"<pw>"}' | jq -r .token)

curl -s -X POST http://localhost:3000/api/sales/checkout -H "Authorization: Bearer $TOKEN" \
  -H 'Content-Type: application/json' \
  -d '{
    "items":[{"productId":1,"quantity":2,"unitPrice":500,"subtotal":1000}],
    "totalAmount":1000,
    "paymentMethod":"cash",
    "customerName":"Test Customer",
    "userId":<cashier-user-id>
  }'
```

---

## 8. HR — Add Employee (Issue #3)

1. Log in as `super_admin` or an `hr_officer`.
2. Go to **HR** (`/hr`) → **Add Employee**.
3. Fill the form: first name, last name, **role** (job title — not the login
   role; e.g. "Pharmacist"), department (one of Pharmacy, Administration,
   Finance, Human Resources, Operations, Sales, IT), email, salary, hire date,
   phone. Submit.
4. Expected: a **success panel shows the exact created details** — employee
   name, role/position, department, start date, status, and the generated
   **employee ID** (format `EMP-0000xx` — built server-side, not user-supplied).
5. Trigger a validation error (e.g. a department outside the whitelist, or a
   bad email) → the server message is shown in the form; no record is created.

Verify in the DB:

```sql
SELECT employee_id, first_name, last_name, role, department, is_active
FROM employees ORDER BY id DESC LIMIT 3;
```

---

## 9. Background sync (offline mode, quick check)

- With the frontend offline-database intact, make a sale or product change,
  then look at DevTools → Application → IndexedDB/LocalForage and the
  `syncWorker` (`frontend/src/services/sync/syncWorker.js`).
- Products push uses **PUT (update)** for items that already have a DB id —
  confirm none of your test syncs produce duplicate-product 409s.

---

## 10. Automated checks (CI-style, no DB needed)

```bash
# Backend parses cleanly (no syntax errors across all files)
cd backend && find . -name "*.js" -not -path "./node_modules/*" -exec node --check {} \; && echo BACKEND_OK

# Frontend type/build check
cd frontend && npm run build

# Unit tests (POS store logic)
cd frontend && npx vitest run
```

Current status: backend parses clean, frontend build passes, posStore tests pass (4).

---

## 11. Troubleshooting

| Symptom | Cause / fix |
|---------|-------------|
| `docker: permission denied` on the socket | User not in `docker` group; run `sudo usermod -aG docker $USER` then re-login / `newgrp docker` |
| Backend log: connection refused / ECONNREFUSED 5432 | Postgres not running — `docker compose up -d postgres` |
| Seed admin can't log in | Seed hashes are placeholders; run `npm run create-admin` (step 3) |
| `createAdmin.js` exits "A strong ADMIN_PASSWORD is required" | Password < 8 chars or env var not set — pass `ADMIN_PASSWORD` |
| New user login rejected | `is_active` is false (deactivated) — re-enable in **User Management** |
| Login as a role → page blocked (403/redirect) | Expected — that role isn't granted the route (check `PERMISSION_MATRIX.md`) |
| Checkout button does nothing / no receipt | Backend unreachable or sale rejected (400) — check backend log; cart is kept on purpose |
| `POST /api/auth/register` → 404 | By design; registration was removed. Use User Management / `createAdmin` |

---

## Resolved (previously deferred)

- Issue #43: JWT refresh tokens, session revocation (logout), force-logout,
  session audit, and removal of the `JWT_SECRET` fallback are now implemented.
  `JWT_SECRET` is required at startup (fail-fast) — see `backend/config/jwt.js`.
  Apply `database/migrations/003_session_management.sql` to existing databases.
- Remaining security items tracked as issues: #52 (audit of hardcoded secret
  usages), #63 (offline login design), #46/#47/#48/#49/#50 — see GitHub issues.