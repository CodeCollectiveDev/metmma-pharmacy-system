# API Contract — METMMA Pharmacy Management System

All endpoints are prefixed with `/api`.

Authentication uses **JWT Bearer Tokens**.

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
  "token": "jwt-token",
  "user": {
    "id": 1,
    "username": "admin",
    "role": "super_admin"
  }
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

Toggles an account on/off. Disabled accounts are rejected at login.

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
