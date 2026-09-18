# API Contract — METMMA Pharmacy Management System

All endpoints are prefixed with `/api`.

Authentication uses **JWT Bearer Tokens**. Tokens are tied to a server-side
session (`sessions` table) so they can be revoked, rotated, and audited.

- `token` — short-lived access token (default **15m**, env `ACCESS_TOKEN_TTL`), sent as `Authorization: Bearer <token>`.
- `refreshToken` — long-lived refresh token (default **7d**, env `REFRESH_TOKEN_TTL`) used to mint new pairs.
- `JWT_SECRET` is **required** (min 32 chars); the server fails fast at startup if it is missing — there is no fallback secret.

---

## AUTHENTICATION

### POST /api/auth/login
```json
{
  "username": "admin",
  "password": "password"
}
```

Response:
```json
{
  "token": "jwt-access-token",
  "refreshToken": "jwt-refresh-token",
  "expiresIn": 900000,
  "user": {
    "id": 1,
    "username": "admin",
    "role": "super_admin"
  }
}
```

### POST /api/auth/refresh
Exchange a valid refresh token for a fresh access + refresh pair (rotation:
the previous pair is invalidated server-side).
```json
{
  "refreshToken": "jwt-refresh-token"
}
```
Response is the same shape as `/login`. A used/revoked/expired refresh token → 401.

### POST /api/auth/logout
**Auth:** any valid access token.

Revokes the calling session server-side. Tokens stop working immediately.

### GET /api/auth/sessions/me
**Auth:** any valid access token.

Lists the current user's own sessions (audit / "log out other devices").

### POST /api/auth/sessions/revoke-all
**Auth:** any valid access token.

Forces logout on every device for the current user.

### GET /api/auth/sessions
**Role:** super_admin, managing_director

Session audit — who is logged in, from where, last active:
```json
{
  "success": true,
  "data": [
    {
      "sid": "uuid",
      "user_id": 1,
      "username": "admin",
      "role": "super_admin",
      "user_agent": "Mozilla/5.0...",
      "ip_address": "1.2.3.4",
      "issued_at": "...",
      "expires_at": "...",
      "last_active_at": "..."
    }
  ]
}
```

### POST /api/auth/users
**Role:** super_admin, managing_director

Creates a provisioned account (public self-registration was removed).
```json
{
  "username": "cashier1",
  "password": "password",
  "full_name": "Cashier One",
  "email": "cashier1@example.com",
  "role": "cashier"
}
```

Notes:
- `full_name` is required (matches DB schema).
- `email` is optional.
- `role` is validated against the 9-role set: `super_admin`, `managing_director`, `director`, `pharmacist_manager`, `pharmacist`, `assistant_pharmacist`, `store_manager`, `cashier`, `hr_officer`. Common UI names like `Admin` are normalized.
- Duplicate username → 409.

### GET /api/auth/users
**Role:** super_admin, managing_director

Returns `{ "success": true, "data": [ ...users ] }`.

### PATCH /api/auth/users/:id/active
**Role:** super_admin, managing_director
```json
{ "is_active": true }
```

Toggles an account on/off. Disabled accounts are rejected at login and **all of their sessions are revoked immediately** (offboarding).

### PATCH /api/auth/users/:id/password
**Role:** super_admin, managing_director
```json
{ "password": "new-password-8-chars" }
```

Resets another user's password (offboarding / forgot-password).

> First-run bootstrap: `cd backend && ADMIN_USERNAME=admin ADMIN_PASSWORD='strong' npm run create-admin` provisions the initial `super_admin`. See `docs/TESTING_GUIDE.md`.

## PRODUCTS (Medicines)

### GET /api/products

Response:

 {
    "id": 1,
    "name": "Panadol",
    "batch_number": "B123",
    "expiry_date": "2026-01-01",
    "quantity": 100,
    "price": 500
 }


### POST /api/products
**Role:** Admin, Pharmacist

Request:
{
  "name": "Panadol",
  "batch_number": "B123",
  "expiry_date": "2026-01-01",
  "quantity": 100,
  "price": 500
}

---

## SALES

### POST /api/sales

Request:
{
  "items": [
    {
      "product_id": 1,
      "quantity": 2
    }
  ],
  "payment_method": "cash"
}

---

## EMPLOYEES

### GET /api/emplyees
**Role:** Admin, HR

---

## REPORTS

### GET /api/reports/sales-daily
Returns JSON sales summary.
