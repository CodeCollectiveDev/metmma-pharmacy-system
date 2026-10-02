
import { createRouter, createWebHistory } from 'vue-router'
import Login from '@/modules/auth/views/Login.vue'
import Register from '@/modules/auth/views/Register.vue'

// Lazy-load dashboard view
const Dashboard = () => import('@/modules/dashboard/views/Dashboard.vue')

// Role definitions for better maintainability
const ROLES = {
  ADMIN: 'admin',
  STORE_MANAGER: 'store_manager',
  PHARMACIST: 'pharmacist',
  HR_OFFICER: 'hr_officer',
  CASHIER: 'cashier'
}

const ROLE_HIERARCHY = {
  admin: 5,
  store_manager: 4,
  pharmacist: 3,
  hr_officer: 2,
  cashier: 1
}

const routes = [
  { path: '/login', component: Login, meta: { requiresAuth: false } },
  { path: '/register', component: Register, meta: { requiresAuth: false } },

  { path: '/', redirect: '/dashboard' },
  
  {
    path: '/dashboard',
    component: Dashboard,
    meta: {
      requiresAuth: true,
      roles: [ROLES.ADMIN, ROLES.STORE_MANAGER, ROLES.PHARMACIST, ROLES.HR_OFFICER],
      label: 'Dashboard'
    }
  },
  
  {
    path: '/pos',
    component: () => import('@/modules/pos/views/PosView.vue'),
    meta: {
      requiresAuth: true,
      roles: [ROLES.CASHIER, ROLES.ADMIN],
      label: 'Point of Sale'
    }
  },
  
  {
    path: '/help',
    component: () => import('@/modules/shared/views/HelpView.vue'),
    meta: {
      requiresAuth: true,
      roles: [ROLES.ADMIN, ROLES.STORE_MANAGER, ROLES.PHARMACIST, ROLES.HR_OFFICER, ROLES.CASHIER],
      label: 'Help'
    }
  },
  
  {
    path: '/inventory',
    component: () => import('@/modules/inventory/views/InventoryDashboard.vue'),
    meta: {
      requiresAuth: true,
      roles: [ROLES.ADMIN, ROLES.STORE_MANAGER, ROLES.PHARMACIST],
      label: 'Inventory Management',
      requiresAdmin: false
    }
  },
  
  {
    path: '/hr',
    component: () => import('@/modules/hr/views/HrDashboard.vue'),
    meta: {
      requiresAuth: true,
      roles: [ROLES.ADMIN, ROLES.HR_OFFICER],
      label: 'HR Management',
      requiresAdmin: true
    }
  },
  
  {
    path: '/reports',
    component: () => import('@/modules/reports/views/ReportsDashboard.vue'),
    meta: {
      requiresAuth: true,
      roles: [ROLES.ADMIN, ROLES.STORE_MANAGER, ROLES.PHARMACIST, ROLES.HR_OFFICER],
      label: 'Reports',
      requiresAdmin: false
    }
  },

  // 404 catch-all
  {
    path: '/:pathMatch(.*)*',
    component: () => import('@/modules/shared/views/NotFoundView.vue'),
    meta: { requiresAuth: false }
  }
]

const router = createRouter({
  history: createWebHistory(),
  routes
})

// Store for permission denied modal
let permissionDeniedCallback = null

router.setPermissionDeniedCallback = (callback) => {
  permissionDeniedCallback = callback
}

router.beforeEach((to, from, next) => {
  const token = localStorage.getItem('token')
  const role = localStorage.getItem('role')

  // Allow public routes
  if (!to.meta.requiresAuth) {
    next()
    return
  }

  // Check authentication
  if (!token) {
    next('/login')
    return
  }

  // Check role-based access
  if (to.meta.roles && !to.meta.roles.includes(role)) {
    // Show permission denied modal instead of alert
    if (permissionDeniedCallback) {
      permissionDeniedCallback(role, to.meta.label)
    }
    next(false)
    return
  }

  next()
})

export default router
export { ROLES, ROLE_HIERARCHY }
