# API Contract — METMMA Pharmacy Management System

All endpoints are prefixed with `/api`.

Authentication uses **JWT Bearer Tokens**.

---

## AUTHENTICATION

### POST /api/auth/register
**Role:** Admin only
```json
{
  "username": "admin",
  "password": "password",
  "full_name": "Admin User",
  "email": "admin@example.com",
  "role": "Admin"
}

Notes:
- `full_name` is required (matches DB schema).
- `email` is optional.
- `role` is stored as lowercase in the DB (`admin`, `pharmacist`, `cashier`, `store_manager`, `hr_officer`), but the API accepts common UI role names like `Admin` and normalizes them.

### POST /api/auth/login
{
  "username": "admin",
  "password": "password"
}

Response:
{
  "token": "jwt-token",
  "user": {
    "id": 1,
    "username": "admin",
    "role": "admin"
  }
}
---

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
