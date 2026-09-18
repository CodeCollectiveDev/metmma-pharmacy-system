<script setup>
import { ref, computed, onMounted } from 'vue'
import MainLayout from '@/layouts/MainLayout.vue'
import { useRole } from '@/composables/useRole'
import { dataOrchestrator } from '@/services/data/dataOrchestrator'
import { dataService } from '@/services/api/dataService'
import { Package, ShoppingCart, Users, AlertTriangle, TrendingUp, Clock } from 'lucide-vue-next'
import DashboardContentSkeleton from '@/modules/shared/components/skeleton/DashboardContentSkeleton.vue'

const { canAccessPos, canAccessInventory, canAccessHr } = useRole()

const pageLoading = ref(true)
const stats = ref({
  totalProducts: 0,
  lowStockCount: 0,
  totalEmployees: 0,
  todaySales: 0
})

const lowStockItems = ref([])
const recentActivity = ref([])

onMounted(async () => {
  pageLoading.value = true
  try {
  // Fetch products
  const products = await dataOrchestrator.fetchCollection('products', dataService.getProducts)
  stats.value.totalProducts = products.length
  stats.value.lowStockCount = products.filter(p => p.stock <= (p.minStockLevel || 10) && !p.lowStockIgnored).length
  lowStockItems.value = products.filter(p => p.stock <= (p.minStockLevel || 10) && !p.lowStockIgnored).slice(0, 5)

  // Fetch employees
  const employees = await dataOrchestrator.fetchCollection('employees', dataService.getEmployees)
  stats.value.totalEmployees = employees.length

  // Fetch sales history for today's total
  const transactions = await dataOrchestrator.fetchCollection('transactions', dataService.getSalesHistory)
  const today = new Date().toISOString().slice(0, 10)
  stats.value.todaySales = transactions
    .filter(t => (t.created_at || t.date || '').toString().slice(0, 10) === today)
    .reduce((sum, t) => sum + Number(t.total_amount || t.total || 0), 0)

  // Recent activity from backend
  try {
    const res = await dataService.getRecentActivity()
    recentActivity.value = res.data?.data || res.data || []
  } catch (err) {
    console.warn('Failed to load recent activity:', err)
    recentActivity.value = []
  }
  } finally {
    pageLoading.value = false
  }
})

const userName = computed(() => {
  try {
    return JSON.parse(localStorage.getItem('user') || '{}').name || 'User'
  } catch {
    return 'User'
  }
})

const formatCurrency = (amount) => {
  return new Intl.NumberFormat('en-MW', { style: 'currency', currency: 'MWK', minimumFractionDigits: 0 }).format(amount || 0)
}

const formatTime = (timestamp) => {
  if (!timestamp) return ''
  const date = new Date(timestamp)
  if (Number.isNaN(date.getTime())) return ''
  return date.toLocaleString('en-MW', { dateStyle: 'medium', timeStyle: 'short' })
}
</script>

<template>
  <MainLayout title="Dashboard" :subtitle="`Welcome back, ${userName}`">
    <DashboardContentSkeleton v-if="pageLoading" />

    <template v-else>
    <!-- Stats Cards -->
    <div class="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2 sm:gap-5 xl:grid-cols-4">
      <div class="app-card app-card-body">
        <div class="flex items-center justify-between gap-4">
          <div>
            <p class="app-stat-label">Total Products</p>
            <p class="app-stat-value">{{ stats.totalProducts }}</p>
          </div>
          <div class="rounded-lg bg-blue-50 p-3">
            <Package class="h-6 w-6 text-blue-600" />
          </div>
        </div>
      </div>

      <div class="app-card app-card-body">
        <div class="flex items-center justify-between gap-4">
          <div>
            <p class="app-stat-label">Low Stock Alerts</p>
            <p class="app-stat-value text-orange-600">{{ stats.lowStockCount }}</p>
          </div>
          <div class="rounded-lg bg-orange-50 p-3">
            <AlertTriangle class="h-6 w-6 text-orange-600" />
          </div>
        </div>
      </div>

      <div class="app-card app-card-body">
        <div class="flex items-center justify-between gap-4">
          <div>
            <p class="app-stat-label">Today's Sales</p>
            <p class="app-stat-value text-green-600">{{ formatCurrency(stats.todaySales) }}</p>
          </div>
          <div class="rounded-lg bg-green-50 p-3">
            <TrendingUp class="h-6 w-6 text-green-600" />
          </div>
        </div>
      </div>

      <div class="app-card app-card-body">
        <div class="flex items-center justify-between gap-4">
          <div>
            <p class="app-stat-label">Total Staff</p>
            <p class="app-stat-value text-purple-600">{{ stats.totalEmployees }}</p>
          </div>
          <div class="rounded-lg bg-purple-50 p-3">
            <Users class="h-6 w-6 text-purple-600" />
          </div>
        </div>
      </div>
    </div>

    <!-- Main Content Grid -->
    <div class="grid grid-cols-1 gap-5 lg:grid-cols-3">
      <!-- Low Stock Alerts -->
      <div class="app-card lg:col-span-2 overflow-hidden">
        <div class="flex items-center justify-between border-b border-gray-100 px-5 py-4">
          <h3 class="app-section-title">Low Stock Items</h3>
          <router-link to="/inventory" class="text-sm text-blue-600 hover:underline">View All</router-link>
        </div>
        <div class="divide-y divide-gray-100">
          <div v-if="lowStockItems.length === 0" class="p-6 text-center text-gray-400">
            No low stock items
          </div>
          <div v-for="item in lowStockItems" :key="item._id" class="px-4 sm:px-6 py-4 flex items-center justify-between gap-3 hover:bg-gray-50">
            <div>
              <p class="font-medium text-gray-800">{{ item.name }}</p>
              <p class="text-sm text-gray-500">{{ item.category }}</p>
            </div>
            <div class="text-right">
              <p class="font-bold text-red-600">{{ item.stock }} left</p>
              <p class="text-xs text-gray-400">Min: {{ item.minStockLevel || 10 }}</p>
            </div>
          </div>
        </div>
      </div>

      <!-- Recent Activity -->
      <div class="app-card overflow-hidden">
        <div class="border-b border-gray-100 px-5 py-4">
          <h3 class="app-section-title">Recent Activity</h3>
        </div>
        <div class="divide-y divide-gray-100">
          <div v-if="recentActivity.length === 0" class="p-6 text-center text-gray-400">
            No recent activity
          </div>
          <div v-for="activity in recentActivity" :key="`${activity.type}-${activity.timestamp}`" class="px-6 py-4">
            <div class="flex items-start gap-3">
              <div class="p-2 bg-gray-100 rounded-lg">
                <ShoppingCart v-if="activity.type === 'sale'" class="w-4 h-4 text-green-600" />
                <Package v-else-if="activity.type === 'stock'" class="w-4 h-4 text-blue-600" />
                <Users v-else class="w-4 h-4 text-purple-600" />
              </div>
              <div class="flex-1 min-w-0">
                <p class="font-medium text-gray-800 text-sm">{{ activity.title }}</p>
                <p class="text-sm text-gray-500 truncate">{{ activity.description }}</p>
                <p class="text-xs text-gray-400 mt-1 flex items-center gap-1">
                  <Clock class="w-3 h-3" /> {{ formatTime(activity.timestamp) }}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Quick Actions -->
    <div class="app-card app-card-body mt-6">
      <h3 class="app-section-title mb-4">Quick Actions</h3>
      <div class="flex flex-col sm:flex-row gap-3 sm:gap-4">
        <router-link v-if="canAccessPos" to="/pos" class="justify-center px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors flex items-center gap-2">
          <ShoppingCart class="w-4 h-4" /> Open POS
        </router-link>
        <router-link v-if="canAccessInventory" to="/inventory" class="justify-center px-5 py-2.5 bg-white border border-gray-200 text-gray-700 hover:bg-gray-50 rounded-lg font-medium transition-colors flex items-center gap-2">
          <Package class="w-4 h-4" /> Manage Inventory
        </router-link>
        <router-link v-if="canAccessHr" to="/hr" class="justify-center px-5 py-2.5 bg-white border border-gray-200 text-gray-700 hover:bg-gray-50 rounded-lg font-medium transition-colors flex items-center gap-2">
          <Users class="w-4 h-4" /> HR Management
        </router-link>
      </div>
    </div>
    </template>
  </MainLayout>
</template>
