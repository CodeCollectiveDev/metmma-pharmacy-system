<script setup>
import { ref, computed, onMounted } from 'vue'
import MainLayout from '@/layouts/MainLayout.vue'
import { dataOrchestrator } from '@/services/data/dataOrchestrator'
import { dataService } from '@/services/api/dataService'
import { FileText, Download, Filter, TrendingUp, Package, Users, Calendar } from 'lucide-vue-next'
import StatCardsSkeleton from '@/modules/shared/components/skeleton/StatCardsSkeleton.vue'
import TableSkeleton from '@/modules/shared/components/skeleton/TableSkeleton.vue'

const pageLoading = ref(true)
const activeTab = ref('sales')
const products = ref([])
const employees = ref([])
const salesData = ref([])
const dateFilter = ref('today')

onMounted(async () => {
  pageLoading.value = true
  try {
    products.value = await dataOrchestrator.fetchCollection('products', dataService.getProducts)
    employees.value = await dataOrchestrator.fetchCollection('employees', dataService.getEmployees)

    const transactions = await dataOrchestrator.fetchCollection('transactions', dataService.getSalesHistory)
    salesData.value = transactions.flatMap(t => {
      const date = (t.created_at || t.date || '').toString().slice(0, 10)
      const items = Array.isArray(t.items) ? t.items : [t]
      return items.map((item, index) => {
        const productId = item.productId ?? item.product_id
        const product = products.value.find(candidate => String(candidate.id || candidate._id) === String(productId))
        return {
          id: `${t.id || t._id}-${productId || index}`,
          date,
          product: item.name || item.product_name || product?.name || 'Unknown',
          qty: item.quantity || item.qty || 0,
          total: item.subtotal || item.total || (items.length === 1 ? (t.total_amount || t.total || 0) : 0),
          customer: t.customer_name || t.customerName || 'Walk-in'
        }
      })
    })
  } finally {
    pageLoading.value = false
  }
})

const lowStockProducts = computed(() => products.value.filter(p => p.stock <= (p.minStockLevel || 10) && !p.lowStockIgnored))
const expiredProducts = computed(() => products.value.filter(p => new Date(p.expiryDate) < new Date()))

const formatCurrency = (amount) => {
  return new Intl.NumberFormat('en-MW', { style: 'currency', currency: 'MWK', minimumFractionDigits: 0 }).format(amount || 0)
}

const totalSales = computed(() => {
  return salesData.value.reduce((sum, s) => sum + Number(s.total || 0), 0)
})

const avgTransaction = computed(() => {
  return salesData.value.length > 0 ? totalSales.value / salesData.value.length : 0
})

const exportToCsv = (data, filename) => {
  if (data.length === 0) return alert('No data to export')
  const headers = Object.keys(data[0]).filter(k => !k.startsWith('_'))
  const csv = [
    headers.join(','),
    ...data.map(row => headers.map(h => row[h]).join(','))
  ].join('\n')
  const blob = new Blob([csv], { type: 'text/csv' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `${filename}.csv`
  a.click()
}
</script>

<template>
  <MainLayout title="Reports" subtitle="View and export system reports">
    <div v-if="pageLoading" class="space-y-6">
      <div class="app-card h-14 animate-pulse bg-gray-100/50" />
      <StatCardsSkeleton :count="3" />
      <TableSkeleton />
    </div>

    <template v-else>
    <!-- Report Type Tabs -->
    <div class="app-card mb-6">
      <div class="flex overflow-x-auto border-b border-gray-100">
        <button 
          @click="activeTab = 'sales'"
          :class="['px-6 py-4 font-medium text-sm transition-colors flex items-center gap-2', activeTab === 'sales' ? 'text-blue-600 border-b-2 border-blue-600' : 'text-gray-500 hover:text-gray-700']"
        >
          <TrendingUp class="w-4 h-4" /> Sales Reports
        </button>
        <button 
          @click="activeTab = 'stock'"
          :class="['px-6 py-4 font-medium text-sm transition-colors flex items-center gap-2', activeTab === 'stock' ? 'text-blue-600 border-b-2 border-blue-600' : 'text-gray-500 hover:text-gray-700']"
        >
          <Package class="w-4 h-4" /> Stock Reports
        </button>
        <button 
          @click="activeTab = 'hr'"
          :class="['px-6 py-4 font-medium text-sm transition-colors flex items-center gap-2', activeTab === 'hr' ? 'text-blue-600 border-b-2 border-blue-600' : 'text-gray-500 hover:text-gray-700']"
        >
          <Users class="w-4 h-4" /> HR Reports
        </button>
      </div>
    </div>

    <!-- Sales Reports -->
    <div v-if="activeTab === 'sales'">
      <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-6">
        <div class="flex items-center gap-4">
          <select v-model="dateFilter" class="px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none">
            <option value="today">Today</option>
            <option value="week">This Week</option>
            <option value="month">This Month</option>
            <option value="all">All Time</option>
          </select>
        </div>
        <button @click="exportToCsv(salesData, 'sales-report')" class="justify-center px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg font-medium flex items-center gap-2 transition-colors">
          <Download class="w-4 h-4" /> Export CSV
        </button>
      </div>

      <!-- Sales Summary Cards -->
      <div class="mb-6 grid grid-cols-1 gap-5 md:grid-cols-3">
        <div class="app-card app-card-body">
          <p class="app-stat-label">Total Sales</p>
          <p class="app-stat-value">{{ formatCurrency(totalSales) }}</p>
        </div>
        <div class="app-card app-card-body">
          <p class="app-stat-label">Transactions</p>
          <p class="app-stat-value">{{ salesData.length }}</p>
        </div>
        <div class="app-card app-card-body">
          <p class="app-stat-label">Avg. Transaction</p>
          <p class="app-stat-value">{{ formatCurrency(avgTransaction) }}</p>
        </div>
      </div>

      <!-- Sales Table -->
      <div class="app-card overflow-hidden"><div class="overflow-x-auto">
        <table class="w-full min-w-[600px]">
          <thead class="bg-gray-50 border-b border-gray-100">
            <tr>
              <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
              <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Product</th>
              <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Qty</th>
              <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Total</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-gray-100">
            <tr v-for="sale in salesData" :key="sale.id" class="hover:bg-gray-50">
              <td class="px-6 py-4 text-gray-600">{{ sale.date }}</td>
              <td class="px-6 py-4 font-medium text-gray-800">{{ sale.product }}</td>
              <td class="px-6 py-4 text-gray-600">{{ sale.qty }}</td>
              <td class="px-6 py-4 font-medium text-green-600">{{ formatCurrency(sale.total) }}</td>
            </tr>
          </tbody>
        </table></div>
      </div>
    </div>

    <!-- Stock Reports -->
    <div v-if="activeTab === 'stock'">
      <div class="flex sm:justify-end mb-6">
        <button @click="exportToCsv(products, 'stock-report')" class="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg font-medium flex items-center gap-2 transition-colors">
          <Download class="w-4 h-4" /> Export CSV
        </button>
      </div>

      <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <!-- Low Stock -->
        <div class="app-card overflow-hidden">
          <div class="border-b border-gray-100 bg-orange-50 px-5 py-4">
            <h3 class="app-section-title text-orange-800">Low Stock Items ({{ lowStockProducts.length }})</h3>
          </div>
          <div class="divide-y divide-gray-100 max-h-80 overflow-y-auto">
            <div v-for="product in lowStockProducts" :key="product._id" class="px-6 py-4 flex justify-between">
              <div>
                <p class="font-medium text-gray-800">{{ product.name }}</p>
                <p class="text-sm text-gray-500">{{ product.category }}</p>
              </div>
              <div class="text-right">
                <p class="font-bold text-red-600">{{ product.stock }} left</p>
                <p class="text-xs text-gray-400">Min: {{ product.minStockLevel || 10 }}</p>
              </div>
            </div>
            <div v-if="lowStockProducts.length === 0" class="px-6 py-8 text-center text-gray-400">No low stock items</div>
          </div>
        </div>

        <!-- Expired Stock -->
        <div class="app-card overflow-hidden">
          <div class="border-b border-gray-100 bg-red-50 px-5 py-4">
            <h3 class="app-section-title text-red-800">Expired Items ({{ expiredProducts.length }})</h3>
          </div>
          <div class="divide-y divide-gray-100 max-h-80 overflow-y-auto">
            <div v-for="product in expiredProducts" :key="product._id" class="px-6 py-4 flex justify-between">
              <div>
                <p class="font-medium text-gray-800">{{ product.name }}</p>
                <p class="text-sm text-gray-500">Batch: {{ product.batchNumber }}</p>
              </div>
              <div class="text-right">
                <p class="font-bold text-red-600">Expired</p>
                <p class="text-xs text-gray-400">{{ product.expiryDate }}</p>
              </div>
            </div>
            <div v-if="expiredProducts.length === 0" class="px-6 py-8 text-center text-gray-400">No expired items</div>
          </div>
        </div>
      </div>
    </div>

    <!-- HR Reports -->
    <div v-if="activeTab === 'hr'">
      <div class="flex sm:justify-end mb-6">
        <button @click="exportToCsv(employees, 'employees-report')" class="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg font-medium flex items-center gap-2 transition-colors">
          <Download class="w-4 h-4" /> Export CSV
        </button>
      </div>

      <div class="app-card overflow-hidden">
        <div class="border-b border-gray-100 px-5 py-4">
          <h3 class="app-section-title">Employee List</h3>
        </div>
        <div class="overflow-x-auto"><table class="w-full min-w-[600px]">
          <thead class="bg-gray-50 border-b border-gray-100">
            <tr>
              <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Name</th>
              <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Position</th>
              <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Department</th>
              <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-gray-100">
            <tr v-for="emp in employees" :key="emp._id" class="hover:bg-gray-50">
              <td class="px-6 py-4 font-medium text-gray-800">{{ emp.name }}</td>
              <td class="px-6 py-4 text-gray-600">{{ emp.position }}</td>
              <td class="px-6 py-4 text-gray-600">{{ emp.department }}</td>
              <td class="px-6 py-4">
                <span :class="['px-2 py-1 rounded-full text-xs font-medium', emp.status === 'active' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600']">
                  {{ emp.status }}
                </span>
              </td>
            </tr>
            <tr v-if="employees.length === 0">
              <td colspan="4" class="px-6 py-8 text-center text-gray-400">No employees found</td>
            </tr>
          </tbody>
        </table></div>
      </div>
    </div>
    </template>
  </MainLayout>
</template>
