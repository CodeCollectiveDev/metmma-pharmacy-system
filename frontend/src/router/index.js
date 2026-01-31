
import { createRouter, createWebHistory } from 'vue-router'
import Login from '@/modules/auth/views/Login.vue'

// Lazy-load dashboard view
const Dashboard = () => import('@/modules/dashboard/views/Dashboard.vue')


const routes = [
  { path: '/login', component: Login },

  { path: '/', redirect: '/dashboard' },
  { path: '/dashboard', component: Dashboard, meta: { requiresAuth: true, roles: ['admin', 'store_manager', 'pharmacist', 'hr_officer'] } },
  {
    path: '/pos',
    component: () => import('@/modules/pos/views/PosView.vue'),
    meta: { requiresAuth: true, roles: ['cashier', 'admin'] }
  },
  {
    path: '/help',
    component: () => import('@/modules/shared/views/HelpView.vue'),
    meta: { requiresAuth: true, roles: ['admin', 'store_manager', 'pharmacist', 'hr_officer', 'cashier'] }
  },
  {
    path: '/inventory',
    component: () => import('@/modules/inventory/views/InventoryDashboard.vue'),
    meta: { requiresAuth: true, roles: ['admin', 'store_manager', 'pharmacist'] }
  },
  {
    path: '/hr',
    component: () => import('@/modules/hr/views/HrDashboard.vue'),
    meta: { requiresAuth: true, roles: ['admin', 'hr_officer'] }
  },
  {
    path: '/reports',
    component: () => import('@/modules/reports/views/ReportsDashboard.vue'),
    meta: { requiresAuth: true, roles: ['admin', 'store_manager', 'pharmacist', 'hr_officer'] }
  },
]



const router = createRouter({
  history: createWebHistory(),
  routes
})

router.beforeEach((to, from, next) => {
  const token = localStorage.getItem('token')
  const role = localStorage.getItem('role')

  if (to.meta.requiresAuth && !token) {
    next('/login')
    return
  }

  // RBAC
  if (to.meta.roles && !to.meta.roles.includes(role)) {
    alert('Unauthorized access'); // Simple alert for now
    if (role === 'cashier') next('/pos');
    else next('/dashboard');
    return;
  }

  // Specific checks
  if (to.path === '/pos' && role !== 'cashier' && role !== 'admin') {
    // Optional: restrict POS to cashiers/admins only
  }

  next()
})

export default router
