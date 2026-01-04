
import { createRouter, createWebHistory } from 'vue-router'
import Login from '@/modules/auth/views/Login.vue'

// Lazy-load dashboard view
const Dashboard = () => import('@/modules/dashboard/views/Dashboard.vue')

const routes = [
  { path: '/login', component: Login },
  { path: '/', redirect: '/dashboard' },
  { path: '/dashboard', component: Dashboard, meta: { requiresAuth: true } }
]

const router = createRouter({
  history: createWebHistory(),
  routes
})

router.beforeEach((to, from, next) => {
  const token = localStorage.getItem('token')

  if (to.meta.requiresAuth && !token) {
    next('/login')
  } else {
    next()
  }
})

export default router
