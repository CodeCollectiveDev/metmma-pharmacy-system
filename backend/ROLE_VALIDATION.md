# Backend Role Validation

## Overview
Your backend already has built-in role-based access control. Every API endpoint validates the user's role before responding.

## Current Backend Role Validation Files

### 1. **Role Middleware**
- **File**: `backend/middleware/roleMiddleware.js`
- **Purpose**: Validates user authentication and role authorization
- **How it works**: 
  - Extracts JWT token from request headers
  - Verifies token signature and expiration
  - Checks if user's role matches required roles for endpoint
  - Returns 401 if unauthorized

### 2. **User Model**
- **File**: `backend/models/user.js`
- **Valid Roles**:
  - `admin`
  - `pharmacist`
  - `cashier`
  - `store_manager`
  - `hr_officer`

### 3. **Auth Routes**
- **File**: `backend/routes/authRoutes.js`
- **Features**:
  - Role normalization (e.g., "Store Manager" → "store_manager")
  - Password hashing with bcrypt
  - JWT token generation with 24-hour expiry

## Protected Endpoints Example

```javascript
// Only admins can delete employees
router.delete('/:id', 
  authenticate,                         // Check if token is valid
  authorize([ROLES.ADMIN]),             // Check if role is admin
  employeesController.deleteEmployee
);

// Only admins and store managers can update inventory
router.put('/:id',
  authenticate,
  authorize([ROLES.ADMIN, ROLES.STORE_MANAGER]),
  inventoryController.updateInventory
);
```

## How Backend Validates

When a request comes in:

1. **Request arrives** → POST /api/employees
2. **Middleware checks** → Is there a valid JWT token?
3. **Extract user data** → Get user ID and role from token
4. **Check permissions** → Does this role have access to this endpoint?
5. **Allow/Deny**:
   - ✅ If authorized → Process request
   - ❌ If unauthorized → Return 401 + "Unauthorized access"

## Response Examples

### ✅ Authorized Request
```json
{
  "message": "Success",
  "data": { /* employee data */ }
}
```

### ❌ Unauthorized Request
```json
{
  "error": "Unauthorized access"
}
```
HTTP Status: **401**

### ❌ Invalid Token
```json
{
  "error": "Invalid or expired token"
}
```
HTTP Status: **401**

## Why This Matters

Even if someone:
- ❌ Bypasses the frontend role checks
- ❌ Modifies browser localStorage to claim admin role
- ❌ Directly calls API endpoints with curl

**The backend will still reject their request** because:
1. The JWT token was signed with a secret key
2. They can't forge a valid token without the secret
3. Even if they could, their actual role from the database is checked

This is called **defense in depth** - multiple layers of security.

## Frontend + Backend Security Flow

```
┌─────────────────────────────────────────────────────────┐
│                     FRONTEND (Vue)                       │
│  1. Route guard blocks unauthorized navigation           │
│  2. Component-level visibility checks (v-if)            │
│  3. Shows permission denied modal                        │
└──────────────────────┬──────────────────────────────────┘
                       │ (if somehow bypassed)
                       ↓
┌─────────────────────────────────────────────────────────┐
│                   API REQUEST (HTTP)                     │
│  1. JWT token sent in Authorization header              │
│  2. Backend middleware verifies token signature          │
│  3. Backend checks role against endpoint permissions     │
│  4. Returns 401 if unauthorized                          │
└──────────────────────┬──────────────────────────────────┘
                       │ (if somehow bypassed)
                       ↓
┌─────────────────────────────────────────────────────────┐
│                   DATABASE (PostgreSQL)                  │
│  1. Only authenticated queries run                       │
│  2. Role-based queries limit data access                │
│  3. Audit logs track who accessed what                   │
└─────────────────────────────────────────────────────────┘
```

## Your System is Secure Because:

✅ **Frontend**: Multiple validation layers prevent accidental access
✅ **API**: Every request is authenticated and authorized
✅ **Database**: Data is isolated by role
✅ **Sessions**: JWT tokens expire after 24 hours
✅ **Passwords**: Hashed with bcrypt (industry standard)

## What You Don't Need to Change

- ❌ Backend already validates roles
- ❌ Backend already rejects unauthorized requests
- ❌ Backend already hashes passwords
- ❌ Backend already uses JWT for sessions

Your backend is doing everything correctly!

---

**Both frontend and backend work together to create a secure, multi-layered access control system.** 🔒
