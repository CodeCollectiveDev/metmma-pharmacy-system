# Quick Reference: Using Roles in Your Components

## Import the composable
```javascript
import { useRole } from '@/composables/useRole'

const { isAdmin, canAccessHr, userRole, logout } = useRole()
```

## Scenario 1: Hide Admin-Only Content

```vue
<template>
  <div v-if="isAdmin" class="admin-section">
    <h2>Admin Controls</h2>
    <p>This is only visible to admins</p>
  </div>
</template>

<script setup>
import { useRole } from '@/composables/useRole'
const { isAdmin } = useRole()
</script>
```

## Scenario 2: Lock Sensitive Features for Non-HR Users

```vue
<template>
  <div class="hr-actions">
    <button 
      @click="openHrPanel"
      :disabled="!canAccessHr"
      :class="{ 'opacity-50 cursor-not-allowed': !canAccessHr }"
    >
      HR Management
    </button>
  </div>
</template>

<script setup>
import { useRole } from '@/composables/useRole'
const { canAccessHr } = useRole()

const openHrPanel = () => {
  if (!canAccessHr) {
    alert('Access denied. HR Management is restricted.')
    return
  }
  // Open HR panel
}
</script>
```

## Scenario 3: Multiple Roles

```vue
<template>
  <!-- Show to managers and admins -->
  <div v-if="hasRole(['admin', 'store_manager'])">
    <h3>Management Dashboard</h3>
  </div>
  
  <!-- Show only to admins -->
  <div v-if="isAdmin">
    <h3>System Settings</h3>
  </div>
</template>

<script setup>
import { useRole } from '@/composables/useRole'
const { isAdmin, hasRole } = useRole()
</script>
```

## Scenario 4: Custom Permission Messages

```vue
<template>
  <div v-if="!canAccessInventory" class="alert alert-warning">
    <p>🔒 Inventory Management is restricted to authorized personnel only.</p>
    <p>Current role: <strong>{{ userRole }}</strong></p>
  </div>
  
  <div v-else class="inventory-panel">
    <!-- Inventory content -->
  </div>
</template>

<script setup>
import { useRole } from '@/composables/useRole'
const { canAccessInventory, userRole } = useRole()
</script>
```

## Scenario 5: Role-Based Navigation Menu

```vue
<template>
  <nav class="menu">
    <ul>
      <li><router-link to="/dashboard">Dashboard</router-link></li>
      <li v-if="canAccessPos"><router-link to="/pos">POS</router-link></li>
      <li v-if="canAccessInventory"><router-link to="/inventory">Inventory</router-link></li>
      <li v-if="canAccessHr"><router-link to="/hr">HR Management</router-link></li>
      <li v-if="canAccessReports"><router-link to="/reports">Reports</router-link></li>
    </ul>
  </nav>
</template>

<script setup>
import { useRole } from '@/composables/useRole'
const { canAccessPos, canAccessInventory, canAccessHr, canAccessReports } = useRole()
</script>
```

## Scenario 6: Logout (Force Re-login for Sensitive Operation)

```vue
<template>
  <button @click="handleSensitiveAction">
    Perform Sensitive Action
  </button>
</template>

<script setup>
import { useRole } from '@/composables/useRole'
import { useRouter } from 'vue-router'

const router = useRouter()
const { logout, isAdmin } = useRole()

const handleSensitiveAction = () => {
  if (!isAdmin) {
    // Force re-login for non-admins
    logout()
    router.push('/login')
    alert('Please sign in with admin credentials')
    return
  }
  
  // Perform action
}
</script>
```

## All Available Checks

| Check | Returns | Use Case |
|-------|---------|----------|
| `isAdmin` | Boolean | Admin-only features |
| `isHrOfficer` | Boolean | HR-specific features |
| `isPharmacist` | Boolean | Pharmacy operations |
| `isStoreManager` | Boolean | Store management |
| `isCashier` | Boolean | POS operations |
| `canAccessHr` | Boolean | HR module access |
| `canAccessInventory` | Boolean | Inventory access |
| `canAccessReports` | Boolean | Reports access |
| `canAccessPos` | Boolean | POS access |
| `hasRole(['role1', 'role2'])` | Boolean | Multiple role check |
| `hasHigherOrEqualRole('role')` | Boolean | Hierarchy check |
| `userRole` | String | Current role name |
| `logout()` | Void | Clear session |

## Fallback for When Access is Denied

The router automatically shows a **Permission Denied Modal** when:
1. User tries to navigate to restricted route
2. User doesn't have the required role
3. Shows friendly message with role info
4. Option to "Sign In Again" (clears session) or "Go Back"

---

## Testing

1. **Test as Admin**: Should see all features
2. **Test as Employee**: Should see limited features, denied modal when trying restricted routes
3. **Test as Cashier**: Should only see POS, denied for anything else

---

Your app now has **production-ready role-based access control!** 🔐
