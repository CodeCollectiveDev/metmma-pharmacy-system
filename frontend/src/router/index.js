import { createRouter, createWebHistory } from 'vue-router'
import HomeView from '@/modules/shared/views/HomeView.vue'

const routes = [
  { path: '/', name: 'Home', component: HomeView },
]

const router = createRouter({
  history: createWebHistory(),
  routes
})

export default router
