# Role-Based Access Control - Visual Guide

## System Architecture

```
┌────────────────────────────────────────────────────────────────────┐
│                         USER TRIES TO LOGIN                         │
└────────────────────────────┬─────────────────────────────────────────┘
                             │
                    ┌────────▼────────┐
                    │  Backend Login   │ (/api/auth/login)
                    │  - Verify creds  │
                    │  - Hash password │
                    │  - Generate JWT  │
                    └────────┬─────────┘
                             │
              ┌──────────────▼──────────────┐
              │    Token stored in          │
              │    localStorage             │
              │    - token (JWT)            │
              │    - role (admin/employee)  │
              │    - user info              │
              └──────────────┬───────────────┘
                             │
                    ┌────────▼─────────┐
                    │ Frontend App     │
                    │ (Vue Router)     │
                    └─────────┬────────┘
                              │
        ┌─────────────────────▼──────────────────────┐
        │           ROUTE GUARD FIRES                 │
        │  1. Check if token exists                  │
        │  2. Check if user role matches route       │
        │  3. If not allowed → Show modal             │
        │  4. If allowed → Show component             │
        └──────────────┬───────────────────────────────┘
                       │
        ┌──────────────▼──────────────┐
        │  COMPONENT RENDERS          │
        │  1. Import useRole          │
        │  2. Use v-if checks         │
        │  3. Hide/show elements      │
        └──────────────┬───────────────┘
                       │
        ┌──────────────▼──────────────┐
        │  USER CLICKS ACTION          │
        │  (e.g., "Add Employee")     │
        └──────────────┬───────────────┘
                       │
        ┌──────────────▼──────────────┐
        │  API REQUEST SENT            │
        │  Authorization: Bearer <JWT> │
        └──────────────┬───────────────┘
                       │
        ┌──────────────▼──────────────┐
        │  BACKEND MIDDLEWARE          │
        │  1. Verify JWT signature     │
        │  2. Extract user role        │
        │  3. Check endpoint perms      │
        │  4. Allow/Deny request       │
        └──────────────┬───────────────┘
                       │
        ┌──────────────▼──────────────┐
        │  DATABASE OPERATION          │
        │  (Only if authorized)        │
        └──────────────────────────────┘
```

## What Happens When Employee Tries to Access HR

```
EMPLOYEE (john@company.com, role: employee)
              │
              ▼
    Clicks "HR Management" menu item
              │
              ▼
    Router checks: Can employee access /hr?
              │
    ┌─────────┴─────────┐
    │                   │
   NO                  YES
    │                   │
    ▼                   ▼
❌ DENIED            ✅ ALLOWED
   │
   ▼
┌────────────────────────────────┐
│  PERMISSION DENIED MODAL       │
│  ┌──────────────────────────┐  │
│  │ 🔒 Access Denied        │  │
│  │                          │  │
│  │ You don't have           │  │
│  │ permission to access     │  │
│  │ this feature             │  │
│  │                          │  │
│  │ Your role: employee      │  │
│  │                          │  │
│  │ [Sign In Again] [Go Back]│  │
│  └──────────────────────────┘  │
└────────────────────────────────┘
   │
   └─────► Signs out ─────► Redirects to /login
           (clears session)
```

## Role Hierarchy

```
                    ┌─────────────────┐
                    │  ADMIN (L5)     │
                    │ Full Access     │
                    └────────┬────────┘
                             │
                             ▼ Can do everything below
                    ┌─────────────────┐
                    │ STORE MANAGER   │
                    │  (L4)           │
                    │ Inventory,      │
                    │ Reports         │
                    └────────┬────────┘
                             │
                ┌────────────┼────────────┐
                ▼            ▼            ▼
        ┌─────────────┐ ┌──────────┐ ┌──────────┐
        │ PHARMACIST  │ │HR OFFICER│ │ CASHIER  │
        │   (L3)      │ │  (L2)    │ │  (L1)    │
        │ Inventory,  │ │HR Module │ │POS Only  │
        │ Reports     │ │Reports   │ │          │
        └─────────────┘ └──────────┘ └──────────┘

✅ Can go down the hierarchy
❌ Cannot go up the hierarchy
```

## Menu Visibility Based on Role

```
USER: ADMIN
└── Dashboard ✅
└── Point of Sale ✅
└── Inventory ✅
└── HR Management 🔒 ✅ (with lock icon)
└── Reports ✅

USER: HR OFFICER
└── Dashboard ✅
└── Inventory ✗ (hidden)
└── HR Management 🔒 ✅ (with lock icon)
└── Reports ✅
└── Point of Sale ✗ (hidden)

USER: CASHIER
└── Point of Sale ✅
└── Dashboard ✗ (hidden)
└── Inventory ✗ (hidden)
└── HR Management ✗ (hidden)
└── Reports ✗ (hidden)

USER: PHARMACIST
└── Dashboard ✅
└── Inventory ✅
└── Reports ✅
└── HR Management ✗ (hidden)
└── Point of Sale ✗ (hidden)
```

## Security Layers Visualization

```
┌────────────────────────────────────────────┐
│         LAYER 1: ROUTE GUARDS              │
│                                            │
│  User tries to navigate to protected       │
│  route → Guard checks role → Blocked       │
│  if unauthorized                          │
└────────────────────────────────────────────┘
                    ▲
                    │
         ┌──────────┴──────────┐
         │                     │
    PASSED               FAILED
         │                     │
         ▼                     ▼
┌─────────────────┐  ┌──────────────────┐
│ LAYER 2: UI     │  │ Permission       │
│ Component shows │  │ Denied Modal     │
│ content using   │  │ Shows & says no  │
│ v-if checks     │  │ access + logout  │
└────────┬────────┘  └──────────────────┘
         │
         ▼
┌────────────────────────────────────────────┐
│         LAYER 3: API REQUEST               │
│                                            │
│  Authorization header with JWT             │
│  sent to backend                           │
└────────────────────────────────────────────┘
         │
         ▼
┌────────────────────────────────────────────┐
│    LAYER 4: BACKEND MIDDLEWARE             │
│                                            │
│  1. Verify JWT signature                   │
│  2. Extract user role from token           │
│  3. Check if role allows this endpoint     │
│  4. Return 401 if not allowed              │
└────────────────────────────────────────────┘
         │
         ▼
┌────────────────────────────────────────────┐
│    LAYER 5: DATABASE QUERY                 │
│                                            │
│  Only return data if authorized            │
│  by backend role checks                    │
└────────────────────────────────────────────┘
```

## Component-Level Role Checks

```javascript
// Template checks
v-if="isAdmin"                    → Show only to admins
v-if="canAccessHr"               → Show to HR officers & admins
v-if="hasRole(['admin', 'hr'])"  → Show to multiple roles
v-if="!canAccessInventory"       → Show denial message

// Script checks
if (isAdmin) { /* do something */ }
if (canAccessHr) { /* allow HR action */ }
if (!hasRole('admin')) { logoutUser() }
```

## Data Flow: API Request

```
┌──────────────────────────────────┐
│ User clicks "Get Employees"      │
└──────────────┬───────────────────┘
               │
               ▼
    ┌─────────────────────────┐
    │ Check canAccessHr?      │
    │ (Component level)       │
    └──────┬──────────────────┘
           │
    ┌──────┴──────┐
    │             │
   NO            YES
    │             │
    ▼             ▼
❌ STOP      ┌──────────────────┐
            │ Send API request  │
            │ GET /api/hr/..    │
            │ Header:           │
            │ Authorization:    │
            │ Bearer <JWT>      │
            └──────┬────────────┘
                   │
                   ▼
            ┌──────────────────┐
            │ Backend receives │
            │ and verifies JWT │
            └──────┬────────────┘
                   │
            ┌──────┴──────┐
            │             │
        INVALID        VALID
            │             │
            ▼             ▼
        ❌ 401       ┌──────────────┐
                     │ Extract role │
                     └──────┬───────┘
                            │
                     ┌──────┴──────┐
                     │             │
                  NOT HR       IS HR
                     │             │
                     ▼             ▼
                 ❌ 401        ✅ 200
                             (with data)
```

## Session Flow

```
LOGIN
  │
  └─► Get JWT token (expires in 24h)
      │
      ├─► Store in localStorage
      │
      └─► Stored role: "admin", "employee", etc.
          │
          └─► Used by frontend for visibility
              │
              └─► Also sent to backend in every request
                  │
                  └─► Backend verifies token is valid & not expired
                      │
                      ├─► IF VALID: Process request
                      │
                      └─► IF INVALID/EXPIRED: Return 401
                          │
                          └─► Frontend catches 401
                              │
                              └─► Clear session
                                  │
                                  └─► Redirect to login
```

---

**The system has 5 layers of security preventing unauthorized access!** 🔐

yours...patisto!