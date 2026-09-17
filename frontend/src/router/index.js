
import { createRouter, createWebHistory } from 'vue-router'
import Login from '@/modules/auth/views/Login.vue'
import { setRouteLoading } from '@/composables/useRouteLoading'

// Lazy-load dashboard view
const Dashboard = () => import('@/modules/dashboard/views/Dashboard.vue')

// Role definitions for better maintainability
const ROLES = {
  SUPER_ADMIN: 'super_admin',
  MANAGING_DIRECTOR: 'managing_director',
  DIRECTOR: 'director',
  PHARMACIST_MANAGER: 'pharmacist_manager',
  PHARMACIST: 'pharmacist',
  ASSISTANT_PHARMACIST: 'assistant_pharmacist',
  STORE_MANAGER: 'store_manager',
  CASHIER: 'cashier',
  HR_OFFICER: 'hr_officer'
}

const ALL_ROLES = Object.values(ROLES)

const ROLE_HIERARCHY = {
  super_admin: 10,
  managing_director: 9,
  director: 8,
  pharmacist_manager: 7,
  pharmacist: 6,
  store_manager: 5,
  assistant_pharmacist: 4,
  hr_officer: 3,
  cashier: 2
}

const routes = [
  { path: '/login', component: Login, meta: { requiresAuth: false } },

  { path: '/', redirect: '/dashboard' },
  
  {
    path: '/dashboard',
    component: Dashboard,
    meta: {
      requiresAuth: true,
      roles: ALL_ROLES,
      label: 'Dashboard'
    }
  },
  
  {
    path: '/pos',
    component: () => import('@/modules/pos/views/PosView.vue'),
    meta: {
      requiresAuth: true,
      roles: [ROLES.SUPER_ADMIN, ROLES.PHARMACIST_MANAGER, ROLES.PHARMACIST, ROLES.ASSISTANT_PHARMACIST, ROLES.CASHIER],
      label: 'Point of Sale'
    }
  },
  
  {
    path: '/help',
    component: () => import('@/modules/shared/views/HelpView.vue'),
    meta: {
      requiresAuth: true,
      roles: ALL_ROLES,
      label: 'Help'
    }
  },
  
  {
    path: '/inventory',
    component: () => import('@/modules/inventory/views/InventoryDashboard.vue'),
    meta: {
      requiresAuth: true,
      roles: [ROLES.SUPER_ADMIN, ROLES.MANAGING_DIRECTOR, ROLES.DIRECTOR, ROLES.PHARMACIST_MANAGER, ROLES.PHARMACIST, ROLES.ASSISTANT_PHARMACIST, ROLES.STORE_MANAGER],
      label: 'Inventory Management',
      requiresAdmin: false
    }
  },
  
  {
    path: '/hr',
    component: () => import('@/modules/hr/views/HrDashboard.vue'),
    meta: {
      requiresAuth: true,
      roles: [ROLES.SUPER_ADMIN, ROLES.HR_OFFICER],
      label: 'HR Management',
      requiresAdmin: true
    }
  },
  
  {
    path: '/users',
    component: () => import('@/modules/admin/views/UserManagement.vue'),
    meta: {
      requiresAuth: true,
      roles: [ROLES.SUPER_ADMIN, ROLES.MANAGING_DIRECTOR],
      label: 'User Management',
      requiresAdmin: true
    }
  },
  
  {
    path: '/reports',
    component: () => import('@/modules/reports/views/ReportsDashboard.vue'),
    meta: {
      requiresAuth: true,
      roles: [ROLES.SUPER_ADMIN, ROLES.MANAGING_DIRECTOR, ROLES.DIRECTOR, ROLES.PHARMACIST_MANAGER, ROLES.STORE_MANAGER, ROLES.HR_OFFICER],
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
  if (to.path !== from.path) {
    setRouteLoading(true)
  }

  const token = localStorage.getItem('token')
  const storedRole = localStorage.getItem('role')
  const role = storedRole === 'admin' ? ROLES.SUPER_ADMIN : storedRole

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
    setRouteLoading(false)
    next(false)
    return
  }

  next()
})

router.afterEach(() => {
  setRouteLoading(false)
})

export default router
export { ROLES, ROLE_HIERARCHY }
