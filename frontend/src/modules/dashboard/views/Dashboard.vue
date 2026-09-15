<script setup>
import { ref, computed, onMounted } from 'vue'
import MainLayout from '@/layouts/MainLayout.vue'
import { dataOrchestrator } from '@/services/data/dataOrchestrator'
import { dataService } from '@/services/api/dataService'
import { Package, ShoppingCart, Users, AlertTriangle, TrendingUp, Clock } from 'lucide-vue-next'

const stats = ref({
  totalProducts: 0,
  lowStockCount: 0,
  totalEmployees: 0,
  todaySales: 0
})

const lowStockItems = ref([])
const recentActivity = ref([])

onMounted(async () => {
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
})

const role = computed(() => localStorage.getItem('role') || '')
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
    <!-- Stats Cards -->
    <div class="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 sm:gap-6 mb-8">
      <div class="bg-white p-4 sm:p-6 rounded-xl shadow-sm border border-gray-100">
        <div class="flex items-center justify-between">
          <div>
            <p class="text-sm font-medium text-gray-500">Total Products</p>
            <p class="text-3xl font-bold text-gray-800 mt-1">{{ stats.totalProducts }}</p>
          </div>
          <div class="p-3 bg-blue-50 rounded-lg">
            <Package class="w-6 h-6 text-blue-600" />
          </div>
        </div>
      </div>

      <div class="bg-white p-4 sm:p-6 rounded-xl shadow-sm border border-gray-100">
        <div class="flex items-center justify-between">
          <div>
            <p class="text-sm font-medium text-gray-500">Low Stock Alerts</p>
            <p class="text-3xl font-bold text-orange-600 mt-1">{{ stats.lowStockCount }}</p>
          </div>
          <div class="p-3 bg-orange-50 rounded-lg">
            <AlertTriangle class="w-6 h-6 text-orange-600" />
          </div>
        </div>
      </div>

      <div class="bg-white p-4 sm:p-6 rounded-xl shadow-sm border border-gray-100">
        <div class="flex items-center justify-between">
          <div>
            <p class="text-sm font-medium text-gray-500">Today's Sales</p>
            <p class="text-3xl font-bold text-green-600 mt-1">{{ formatCurrency(stats.todaySales) }}</p>
          </div>
          <div class="p-3 bg-green-50 rounded-lg">
            <TrendingUp class="w-6 h-6 text-green-600" />
          </div>
        </div>
      </div>

      <div class="bg-white p-4 sm:p-6 rounded-xl shadow-sm border border-gray-100">
        <div class="flex items-center justify-between">
          <div>
            <p class="text-sm font-medium text-gray-500">Total Staff</p>
            <p class="text-3xl font-bold text-purple-600 mt-1">{{ stats.totalEmployees }}</p>
          </div>
          <div class="p-3 bg-purple-50 rounded-lg">
            <Users class="w-6 h-6 text-purple-600" />
          </div>
        </div>
      </div>
    </div>

    <!-- Main Content Grid -->
    <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <!-- Low Stock Alerts -->
      <div class="lg:col-span-2 bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div class="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
          <h3 class="font-semibold text-gray-800">Low Stock Items</h3>
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
      <div class="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div class="px-6 py-4 border-b border-gray-100">
          <h3 class="font-semibold text-gray-800">Recent Activity</h3>
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
    <div class="mt-8 bg-white rounded-xl shadow-sm border border-gray-100 p-4 sm:p-6">
      <h3 class="font-semibold text-gray-800 mb-4">Quick Actions</h3>
      <div class="flex flex-col sm:flex-row gap-3 sm:gap-4">
        <router-link v-if="role === 'cashier' || role === 'admin'" to="/pos" class="justify-center px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors flex items-center gap-2">
          <ShoppingCart class="w-4 h-4" /> Open POS
        </router-link>
        <router-link v-if="role !== 'cashier'" to="/inventory" class="justify-center px-5 py-2.5 bg-white border border-gray-200 text-gray-700 hover:bg-gray-50 rounded-lg font-medium transition-colors flex items-center gap-2">
          <Package class="w-4 h-4" /> Manage Inventory
        </router-link>
        <router-link v-if="role === 'admin' || role === 'hr_officer'" to="/hr" class="justify-center px-5 py-2.5 bg-white border border-gray-200 text-gray-700 hover:bg-gray-50 rounded-lg font-medium transition-colors flex items-center gap-2">
          <Users class="w-4 h-4" /> HR Management
        </router-link>
      </div>
    </div>
  </MainLayout>
</template>
