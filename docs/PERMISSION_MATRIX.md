# Permission Matrix — METMMA Pharmacy System

Source of truth for role-based access control across all four layers
(DB CHECK constraint, backend ROLES + `authorize`, frontend route metas,
and frontend sidebar/`useRole`). Keep this grid in sync with:

- `database/init.sql` (and `database/migrations/001_expanded_roles.sql`)
- `backend/middleware/roleMiddleware.js`
- `backend/api/routes/*.js`
- `frontend/src/router/index.js`
- `frontend/src/composables/useRole.js`
- `frontend/src/layouts/Sidebar.vue`

## Roles

| Role | Code | Notes |
|------|------|-------|
| Super Admin | `super_admin` | Bootstrap account; full system access |
| Managing Director | `managing_director` | Executive; can provision accounts, view financials |
| Director | `director` | Executive; read-mostly access |
| Pharmacist (Manager) | `pharmacist_manager` | Leads pharmacy; inventory + POS + stock write |
| Pharmacist | `pharmacist` | Dispensing; inventory + POS |
| Assistant Pharmacist | `assistant_pharmacist` | Clerk-level pharmacy; POS + inventory view |
| Store Manager | `store_manager` | Stock / store ops; reports |
| Cashier | `cashier` | POS only |
| HR Officer | `hr_officer` | HR module; attendance |

Hierarchy (for `hasHigherOrEqualRole`):
`super_admin (10) > managing_director (9) > director (8) > pharmacist_manager (7) > pharmacist (6) > store_manager (5) > assistant_pharmacist (4) > hr_officer (3) > cashier (2)`

## Matrix

Legend: ✓ can access | — denied (401/403 via backend `authorize`, route guard on frontend)

| Module | Action | super_admin | managing_director | director | pharmacist_manager | pharmacist | assistant_pharmacist | store_manager | cashier | hr_officer |
|--------|--------|:-----------:|:-----------------:|:--------:|:------------------:|:----------:|:--------------------:|:-------------:|:-------:|:----------:|
| Auth | Login | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| Users | Create / List / Disable | ✓ | ✓ | — | — | — | — | — | — | — |
| Dashboard | View | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| POS | Process sale | ✓ | — | — | ✓ | ✓ | ✓ | — | ✓ | — |
| POS | Sale history | ✓ | — | — | ✓ | ✓ | ✓ | — | ✓ | — |
| Inventory | View | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | — | — |
| Inventory | Add product | ✓ | — | — | ✓ | ✓ | — | ✓ | — | — |
| Inventory | Update / Restock | ✓ | — | — | ✓ | ✓ | — | ✓ | — | — |
| Inventory | Delete product | ✓ | — | — | ✓ | — | — | — | — | — |
| HR | Manage employees | ✓ | — | — | — | — | — | — | — | ✓ |
| Attendance | View / Mark | ✓ | — | — | ✓ | ✓ | — | ✓ | — | ✓ |
| Reports | View reports | ✓ | ✓ | ✓ | ✓ | — | — | ✓ | — | ✓ |
| Reports | Create financial/compliance | ✓ | ✓ | — | — | — | — | ✓ | — | — |
| Help | View | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |

## Route → Roles Map (backend `authorize`)

| Endpoint | Allowed roles |
|----------|---------------|
| `POST /api/auth/users` | super_admin, managing_director |
| `GET /api/auth/users` | super_admin, managing_director |
| `PATCH /api/auth/users/:id/active` | super_admin, managing_director |
| `POST /api/products` | super_admin, pharmacist_manager, store_manager, pharmacist |
| `PUT /api/products/:id` | super_admin, pharmacist_manager, store_manager, pharmacist |
| `DELETE /api/products/:id` | super_admin, pharmacist_manager |
| `POST /api/sales/checkout` | super_admin, pharmacist_manager, pharmacist, assistant_pharmacist, cashier |
| `GET /api/employees` | super_admin, hr_officer |
| `POST /api/employees` | super_admin, hr_officer |
| `PUT /api/employees/:id` | super_admin, hr_officer |
| `DELETE /api/employees/:id` | super_admin, hr_officer |
| `GET /api/attendance/employee/:employee_id` | super_admin, hr_officer, store_manager, pharmacist_manager, pharmacist |
| `POST /api/attendance` | super_admin, hr_officer, store_manager, pharmacist_manager |
| `GET /api/reports/financial` | super_admin, managing_director, director, pharmacist_manager, store_manager, hr_officer |
| `POST /api/reports/financial` | super_admin, managing_director, store_manager |
| `GET /api/reports/compliance` | super_admin, managing_director, director, pharmacist_manager, store_manager, hr_officer |
| `POST /api/reports/compliance` | super_admin, managing_director, store_manager |
| `GET /api/reports/recent-activity` | all roles |

## Frontend route metas

| Route | Allowed roles |
|-------|---------------|
| `/dashboard` | all roles |
| `/pos` | super_admin, pharmacist_manager, pharmacist, assistant_pharmacist, cashier |
| `/inventory` | super_admin, managing_director, director, pharmacist_manager, pharmacist, assistant_pharmacist, store_manager |
| `/hr` | super_admin, hr_officer |
| `/users` | super_admin, managing_director |
| `/reports` | super_admin, managing_director, director, pharmacist_manager, store_manager, hr_officer |
| `/help` | all roles |

> Registration is removed. Accounts are provisioned only via the bootstrap
> script (`backend/scripts/createAdmin.js`) or an existing
> super_admin / managing_director.