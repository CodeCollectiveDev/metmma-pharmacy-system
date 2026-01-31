<script setup>
import { ref, computed, onMounted } from 'vue'
import MainLayout from '@/layouts/MainLayout.vue'
import { getAll } from '@/pouchdb'
import { FileText, Download, Filter, TrendingUp, Package, Users, Calendar } from 'lucide-vue-next'

const activeTab = ref('sales')
const products = ref([])
const employees = ref([])
const transactions = ref([])
const dateFilter = ref('today')

onMounted(async () => {
  products.value = await getAll('products')
  employees.value = await getAll('employees')
  transactions.value = await getAll('transactions')
})

// Mock sales data for demonstration
const salesData = computed(() => [
  { id: 1, date: '2026-01-25', product: 'Paracetamol 500mg', qty: 5, total: 2500, customer: 'Walk-in' },
  { id: 2, date: '2026-01-25', product: 'Amoxicillin 500mg', qty: 2, total: 3000, customer: 'Walk-in' },
  { id: 3, date: '2026-01-24', product: 'Vitamin C 1000mg', qty: 3, total: 3000, customer: 'Walk-in' },
  { id: 4, date: '2026-01-24', product: 'Ibuprofen 400mg', qty: 4, total: 3400, customer: 'Walk-in' },
  { id: 5, date: '2026-01-23', product: 'Cough Syrup 100ml', qty: 2, total: 2400, customer: 'Walk-in' },
])

const lowStockProducts = computed(() => products.value.filter(p => p.stock <= (p.minStockLevel || 10)))
const expiredProducts = computed(() => products.value.filter(p => new Date(p.expiryDate) < new Date()))

const formatCurrency = (amount) => {
  return new Intl.NumberFormat('en-MW', { style: 'currency', currency: 'MWK', minimumFractionDigits: 0 }).format(amount || 0)
}

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
    <!-- Report Type Tabs -->
    <div class="bg-white rounded-xl shadow-sm border border-gray-100 mb-6">
      <div class="flex border-b border-gray-100">
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
      <div class="flex items-center justify-between mb-6">
        <div class="flex items-center gap-4">
          <select v-model="dateFilter" class="px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none">
            <option value="today">Today</option>
            <option value="week">This Week</option>
            <option value="month">This Month</option>
            <option value="all">All Time</option>
          </select>
        </div>
        <button @click="exportToCsv(salesData, 'sales-report')" class="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg font-medium flex items-center gap-2 transition-colors">
          <Download class="w-4 h-4" /> Export CSV
        </button>
      </div>

      <!-- Sales Summary Cards -->
      <div class="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
        <div class="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
          <p class="text-sm text-gray-500">Total Sales</p>
          <p class="text-2xl font-bold text-gray-800 mt-1">{{ formatCurrency(14300) }}</p>
        </div>
        <div class="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
          <p class="text-sm text-gray-500">Transactions</p>
          <p class="text-2xl font-bold text-gray-800 mt-1">{{ salesData.length }}</p>
        </div>
        <div class="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
          <p class="text-sm text-gray-500">Avg. Transaction</p>
          <p class="text-2xl font-bold text-gray-800 mt-1">{{ formatCurrency(2860) }}</p>
        </div>
      </div>

      <!-- Sales Table -->
      <div class="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <table class="w-full">
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
        </table>
      </div>
    </div>

    <!-- Stock Reports -->
    <div v-if="activeTab === 'stock'">
      <div class="flex justify-end mb-6">
        <button @click="exportToCsv(products, 'stock-report')" class="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg font-medium flex items-center gap-2 transition-colors">
          <Download class="w-4 h-4" /> Export CSV
        </button>
      </div>

      <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <!-- Low Stock -->
        <div class="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          <div class="px-6 py-4 border-b border-gray-100 bg-orange-50">
            <h3 class="font-semibold text-orange-800">Low Stock Items ({{ lowStockProducts.length }})</h3>
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
        <div class="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          <div class="px-6 py-4 border-b border-gray-100 bg-red-50">
            <h3 class="font-semibold text-red-800">Expired Items ({{ expiredProducts.length }})</h3>
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
      <div class="flex justify-end mb-6">
        <button @click="exportToCsv(employees, 'employees-report')" class="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg font-medium flex items-center gap-2 transition-colors">
          <Download class="w-4 h-4" /> Export CSV
        </button>
      </div>

      <div class="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div class="px-6 py-4 border-b border-gray-100">
          <h3 class="font-semibold text-gray-800">Employee List</h3>
        </div>
        <table class="w-full">
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
        </table>
      </div>
    </div>
  </MainLayout>
</template>
