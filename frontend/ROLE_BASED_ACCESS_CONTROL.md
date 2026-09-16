# Role-Based Access Control Implementation Guide

## Overview
This guide explains how to use the new role-based access control system in your Vue components.

## Available Composable: `useRole()`

Import in your components:
```javascript
import { useRole } from '@/composables/useRole'

const { isAdmin, canAccessHr, userRole, logout } = useRole()
```

## Available Properties & Methods

### Computed Properties (use in templates with v-if/v-show)
- `userRole` - Current user's role (string)
- `isAdmin` - True if user is admin
- `isHrOfficer` - True if user is HR officer
- `isStoreManager` - True if user is store manager
- `isPharmacist` - True if user is pharmacist
- `isCashier` - True if user is cashier

### Permission Checks (pre-built)
- `canAccessHr` - Can access HR features
- `canAccessInventory` - Can access inventory features
- `canAccessReports` - Can access reports
- `canAccessPos` - Can access POS

### Methods
- `hasRole(role)` - Check single or multiple roles: `hasRole(['admin', 'hr_officer'])`
- `hasHigherOrEqualRole(minRole)` - Check role hierarchy
- `logout()` - Clear session and sign out

## Usage Examples

### 1. Conditionally Hide/Show UI Elements

```vue
<template>
  <!-- Only show for admins -->
  <div v-if="isAdmin" class="admin-section">
    <h3>Admin Panel</h3>
    <!-- admin content -->
  </div>

  <!-- Show for HR personnel -->
  <div v-if="canAccessHr" class="hr-section">
    <h3>HR Management</h3>
    <!-- hr content -->
  </div>

  <!-- Show for store managers and admins -->
  <div v-if="hasRole(['admin', 'store_manager'])" class="manager-section">
    <!-- manager content -->
  </div>

  <!-- Show inventory only to authorized roles -->
  <div v-if="canAccessInventory" class="inventory-section">
    <!-- inventory content -->
  </div>
</template>

<script setup>
import { useRole } from '@/composables/useRole'

const { isAdmin, canAccessHr, canAccessInventory, hasRole } = useRole()
</script>
```

### 2. Conditionally Disable Features

```vue
<template>
  <button 
    @click="openHrManagement"
    :disabled="!canAccessHr"
    :class="{ 'opacity-50 cursor-not-allowed': !canAccessHr }"
  >
    HR Management
  </button>
</template>

<script setup>
import { useRole } from '@/composables/useRole'

const { canAccessHr } = useRole()

const openHrManagement = () => {
  if (!canAccessHr) {
    alert('You do not have access to HR Management')
    return
  }
  // Open HR management
}
</script>
```

### 3. Hide Menu Items Based on Role

In your Sidebar or Navigation:

```vue
<template>
  <nav class="sidebar">
    <router-link to="/dashboard">Dashboard</router-link>
    
    <router-link v-if="canAccessInventory" to="/inventory">
      Inventory
    </router-link>
    
    <router-link v-if="canAccessHr" to="/hr">
      HR Management
    </router-link>
    
    <router-link v-if="canAccessReports" to="/reports">
      Reports
    </router-link>
    
    <router-link v-if="canAccessPos" to="/pos">
      POS
    </router-link>

    <button @click="handleLogout">Logout</button>
  </nav>
</template>

<script setup>
import { useRole } from '@/composables/useRole'
import { useRouter } from 'vue-router'

const router = useRouter()
const { canAccessHr, canAccessInventory, canAccessReports, canAccessPos, logout } = useRole()

const handleLogout = () => {
  logout()
  router.push('/login')
}
</script>
```

## Role Hierarchy

The system supports role hierarchy (from highest to lowest):
1. `admin` (level 5) - Full access to everything
2. `store_manager` (level 4) - Can manage store operations
3. `pharmacist` (level 3) - Can manage pharmacy operations
4. `hr_officer` (level 2) - Can manage HR operations
5. `cashier` (level 1) - Can use POS

Use `hasHigherOrEqualRole()` to check hierarchy:
```javascript
if (hasHigherOrEqualRole('store_manager')) {
  // Can do store manager tasks
}
```

## Backend API Protection

The backend already validates every request. Even if someone bypasses the frontend checks, the API will reject unauthorized requests with a 401 Unauthorized response.

All API responses for sensitive features check the user's role and return errors if they lack permission.

## What Happens When Access is Denied?

1. **At Route Level**: Router guard prevents navigation and shows PermissionDeniedModal
2. **At Component Level**: UI elements are hidden using `v-if`
3. **At API Level**: Backend rejects the request and returns 401

When they click "Sign In Again" on the modal:
- Session is cleared (token, role, user data)
- They're redirected to the login page
- They must log in again with appropriate credentials

## Summary

- **Hide/Show elements** using role checks
- **Prevent route access** via router guards (automatically done)
- **Backend validates** every API request
- **Multiple layers** of security ensure comprehensive protection
