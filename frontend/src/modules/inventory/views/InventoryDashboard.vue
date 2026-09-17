<script setup>
import { ref, computed, onMounted } from 'vue'
import MainLayout from '@/layouts/MainLayout.vue'
import { useInventoryStore } from '../store/inventoryStore'
import { Plus, Search, Package, AlertTriangle, Calendar, Edit, ScanBarcode } from 'lucide-vue-next'
import StatCardsSkeleton from '@/modules/shared/components/skeleton/StatCardsSkeleton.vue'
import TableSkeleton from '@/modules/shared/components/skeleton/TableSkeleton.vue'

const store = useInventoryStore()
const showAddForm = ref(false)
const showRestockModal = ref(false)
const restockTarget = ref(null)
const restockQty = ref('')
const restockNote = ref('')
const filter = ref('all')
const searchQuery = ref('')
const barcodeSearch = ref('')

const newProduct = ref({
  name: '',
  category: 'Antibiotics',
  batchNumber: '',
  expiryDate: '',
  supplier: '',
  price: null,
  stock: null,
  minStockLevel: 10
})

const categories = ['Antibiotics', 'Painkillers', 'Vitamins', 'Cough & Cold', 'First Aid', 'Diagnostics', 'Diabetes', 'Gastrointestinal', 'Other']

onMounted(() => {
  store.fetchProducts()
})

const filteredProducts = computed(() => {
  let products = store.products
  
  // Filter by status
  if (filter.value === 'low') products = store.lowStockProducts
  if (filter.value === 'expired') products = store.expiredProducts
  
  // Filter by search
  if (searchQuery.value || barcodeSearch.value) {
    const query = (searchQuery.value || barcodeSearch.value).toLowerCase()
    products = products.filter(p =>
      p.name.toLowerCase().includes(query) ||
      p.batchNumber?.toLowerCase().includes(query) ||
      p.category?.toLowerCase().includes(query)
    )
  }
  
  return products
})

const handleBarcodeSearch = () => {
  searchQuery.value = barcodeSearch.value
  barcodeSearch.value = ''
}

const saveProduct = async () => {
  if (!newProduct.value.name || !newProduct.value.batchNumber) {
    alert('Please fill required fields (Name, Batch Number)')
    return
  }
  
  const success = await store.addProduct({ ...newProduct.value })
  if (success) {
    showAddForm.value = false
    newProduct.value = { name: '', category: 'Antibiotics', batchNumber: '', expiryDate: '', supplier: '', price: null, stock: null, minStockLevel: 10 }
    alert('Product added successfully!')
  }
}

const openRestockModal = (product) => {
  restockTarget.value = product
  restockQty.value = ''
  restockNote.value = ''
  showRestockModal.value = true
}

const confirmRestock = async () => {
  if (!restockTarget.value) return
  const quantity = Number(restockQty.value)
  if (Number.isNaN(quantity) || quantity <= 0) {
    alert('Please enter a valid quantity greater than 0')
    return
  }

  const success = await store.restockProduct(restockTarget.value, quantity, restockNote.value)
  if (success) {
    showRestockModal.value = false
    restockTarget.value = null
    restockQty.value = ''
    restockNote.value = ''
    alert('Stock updated successfully')
  } else {
    alert('Failed to update stock')
  }
}

const ignoreLowStock = async (product) => {
  const reason = window.prompt('Optional reason to ignore low stock:', '') || ''
  const success = await store.ignoreLowStock(product, reason)
  if (success) {
    alert('Low stock notification ignored')
  } else {
    alert('Failed to ignore low stock notification')
  }
}

const removeExpired = async (product) => {
  const confirmRemove = window.confirm('Remove expired item from stock? This will delete it.')
  if (!confirmRemove) return
  const success = await store.deleteProduct(product)
  if (success) {
    alert('Expired item removed')
  } else {
    alert('Failed to remove expired item')
  }
}

const removeAllExpired = async () => {
  if (!store.expiredProducts.length) return
  const confirmRemove = window.confirm('Remove ALL expired items from stock? This will delete them.')
  if (!confirmRemove) return

  let failures = 0
  for (const product of store.expiredProducts) {
    const success = await store.deleteProduct(product)
    if (!success) failures += 1
  }

  if (failures === 0) {
    alert('All expired items removed')
  } else {
    alert(`Some items could not be removed (${failures} failed).`)
  }
}

const formatCurrency = (amount) => {
  return new Intl.NumberFormat('en-MW', { style: 'currency', currency: 'MWK', minimumFractionDigits: 0 }).format(amount || 0)
}

const isExpired = (date) => new Date(date) < new Date()
const isLowStock = (product) => product.stock <= (product.minStockLevel || 10) && !product.lowStockIgnored
const isLowStockIgnored = (product) => product.stock <= (product.minStockLevel || 10) && product.lowStockIgnored
</script>

<template>
  <MainLayout title="Inventory Management" subtitle="Manage stock, products, and suppliers">
    <div v-if="store.loading" class="space-y-6">
      <StatCardsSkeleton />
      <TableSkeleton :columns="8" />
    </div>

    <template v-else>
    <!-- Stats Cards -->
    <div class="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2 sm:gap-5 xl:grid-cols-4">
      <div class="app-card app-card-body flex items-center gap-4">
        <div class="rounded-lg bg-blue-50 p-3">
          <Package class="h-6 w-6 text-blue-600" />
        </div>
        <div>
          <p class="app-stat-label">Total Products</p>
          <p class="app-stat-value">{{ store.products.length }}</p>
        </div>
      </div>
      <div class="app-card app-card-body flex items-center gap-4 border-orange-100">
        <div class="rounded-lg bg-orange-50 p-3">
          <AlertTriangle class="h-6 w-6 text-orange-600" />
        </div>
        <div>
          <p class="app-stat-label">Low Stock</p>
          <p class="app-stat-value text-orange-600">{{ store.lowStockProducts.length }}</p>
        </div>
      </div>
      <div class="app-card app-card-body flex items-center gap-4 border-red-100">
        <div class="rounded-lg bg-red-50 p-3">
          <Calendar class="h-6 w-6 text-red-600" />
        </div>
        <div>
          <p class="app-stat-label">Expired</p>
          <p class="app-stat-value text-red-600">{{ store.expiredProducts.length }}</p>
        </div>
      </div>
      <div class="app-card app-card-body flex min-h-[5.5rem] items-center justify-center">
        <button @click="showAddForm = !showAddForm" class="flex items-center justify-center gap-2 font-medium text-blue-600 hover:text-blue-700">
          <Plus class="h-5 w-5" />
          <span>{{ showAddForm ? 'Cancel' : 'Add Product' }}</span>
        </button>
      </div>
    </div>

    <!-- Add Product Form -->
    <div v-if="showAddForm" class="app-card app-card-body mb-6">
      <h3 class="app-section-title mb-4">Add New Product</h3>
      <div class="grid grid-cols-1 md:grid-cols-4 gap-4">
        <input v-model="newProduct.name" type="text" placeholder="Product Name *" class="px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none">
        <input v-model="newProduct.batchNumber" type="text" placeholder="Batch Number *" class="px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none">
        <select v-model="newProduct.category" class="px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none">
          <option v-for="cat in categories" :key="cat">{{ cat }}</option>
        </select>
        <input v-model="newProduct.expiryDate" type="date" placeholder="Expiry Date" class="px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none">
        <input v-model="newProduct.supplier" type="text" placeholder="Supplier" class="px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none">
        <input v-model.number="newProduct.price" type="number" placeholder="Price (MWK)" class="px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none">
        <input v-model.number="newProduct.stock" type="number" placeholder="Quantity" class="px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none">
        <input v-model.number="newProduct.minStockLevel" type="number" placeholder="Min Stock Level" class="px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none">
      </div>
      <div class="flex justify-end mt-4">
        <button @click="saveProduct" class="w-full sm:w-auto px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors">
          Save Product
        </button>
      </div>
    </div>

    <!-- Filters & Search -->
    <div class="app-card mb-6">
      <div class="flex flex-col gap-4 p-4 xl:flex-row xl:items-center xl:justify-between">
        <div class="grid grid-cols-1 sm:flex gap-2">
          <button @click="filter = 'all'" :class="['px-4 py-2 rounded-lg text-sm font-medium transition-colors', filter === 'all' ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200']">
            All ({{ store.products.length }})
          </button>
          <button @click="filter = 'low'" :class="['px-4 py-2 rounded-lg text-sm font-medium transition-colors', filter === 'low' ? 'bg-orange-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200']">
            Low Stock ({{ store.lowStockProducts.length }})
          </button>
          <button @click="filter = 'expired'" :class="['px-4 py-2 rounded-lg text-sm font-medium transition-colors', filter === 'expired' ? 'bg-red-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200']">
            Expired ({{ store.expiredProducts.length }})
          </button>
        </div>
        <div class="grid grid-cols-1 sm:grid-cols-2 xl:flex gap-2">
          <div class="relative">
            <input v-model="barcodeSearch" @keyup.enter="handleBarcodeSearch" type="text" placeholder="Scan barcode..." class="w-full pl-10 pr-4 py-2 border rounded-lg sm:w-48 focus:ring-2 focus:ring-blue-500 outline-none">
            <ScanBarcode class="w-4 h-4 text-gray-400 absolute left-3 top-2.5" />
          </div>
          <div class="relative">
            <input v-model="searchQuery" type="text" placeholder="Search products..." class="w-full pl-10 pr-4 py-2 border rounded-lg sm:w-64 focus:ring-2 focus:ring-blue-500 outline-none">
            <Search class="w-4 h-4 text-gray-400 absolute left-3 top-2.5" />
          </div>
          <button
            v-if="store.expiredProducts.length"
            @click="removeAllExpired"
            class="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg text-sm font-medium transition-colors"
          >
            Remove All Expired
          </button>
        </div>
      </div>
    </div>

    <!-- Restock Modal -->
    <div v-if="showRestockModal" class="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
      <div class="bg-white rounded-xl shadow-lg w-full max-w-md max-h-[calc(100vh-2rem)] overflow-y-auto mx-4 p-4 sm:p-6">
        <h3 class="text-lg font-semibold text-gray-800 mb-4">Restock Item</h3>
        <div class="space-y-3">
          <div class="text-sm text-gray-600">
            <div><span class="font-medium">Product:</span> {{ restockTarget?.name }}</div>
            <div><span class="font-medium">Current Stock:</span> {{ restockTarget?.stock ?? 0 }}</div>
          </div>
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">Quantity to Add</label>
            <input v-model="restockQty" type="number" min="1" class="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" placeholder="e.g. 50" />
          </div>
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">Note (supplier/invoice)</label>
            <input v-model="restockNote" type="text" class="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" placeholder="Optional" />
          </div>
        </div>
        <div class="mt-6 flex justify-end gap-2">
          <button @click="showRestockModal = false" class="px-4 py-2 rounded-lg bg-gray-100 text-gray-700 hover:bg-gray-200">Cancel</button>
          <button @click="confirmRestock" class="px-4 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700">Confirm Restock</button>
        </div>
      </div>
    </div>

    <!-- Products Table -->
    <div class="app-card overflow-hidden">
      <div class="overflow-x-auto">
      <table class="w-full min-w-[850px]">
        <thead class="bg-gray-50 border-b border-gray-100">
          <tr>
            <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Product</th>
            <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Batch #</th>
            <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Category</th>
            <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Expiry</th>
            <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Stock (Qty)</th>
            <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Price</th>
            <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
            <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
          </tr>
        </thead>
        <tbody class="divide-y divide-gray-100">
          <tr v-for="product in filteredProducts" :key="product._id" class="hover:bg-gray-50">
            <td class="px-6 py-4">
              <p class="font-medium text-gray-800">{{ product.name }}</p>
              <p class="text-sm text-gray-500">{{ product.supplier }}</p>
            </td>
            <td class="px-6 py-4 font-mono text-sm text-gray-600">{{ product.batchNumber }}</td>
            <td class="px-6 py-4 text-gray-600">{{ product.category }}</td>
            <td class="px-6 py-4" :class="isExpired(product.expiryDate) ? 'text-red-600 font-medium' : 'text-gray-600'">
              {{ product.expiryDate ? new Date(product.expiryDate).toLocaleDateString() : '-' }}
            </td>
            <td class="px-6 py-4">
              <span :class="['font-bold', isLowStock(product) ? 'text-red-600' : 'text-gray-800']">{{ product.stock }}</span>
              <span class="text-xs text-gray-400 ml-1">/ min {{ product.minStockLevel || 10 }}</span>
            </td>
            <td class="px-6 py-4 font-medium text-gray-800">{{ formatCurrency(product.price) }}</td>
            <td class="px-6 py-4">
              <span v-if="isExpired(product.expiryDate)" class="px-2 py-1 bg-red-100 text-red-700 text-xs font-medium rounded-full">Expired</span>
              <span v-else-if="isLowStockIgnored(product)" class="px-2 py-1 bg-gray-100 text-gray-700 text-xs font-medium rounded-full">Low Stock (Ignored)</span>
              <span v-else-if="isLowStock(product)" class="px-2 py-1 bg-orange-100 text-orange-700 text-xs font-medium rounded-full">Low Stock</span>
              <span v-else class="px-2 py-1 bg-green-100 text-green-700 text-xs font-medium rounded-full">OK</span>
            </td>
            <td class="px-6 py-4">
              <div class="flex flex-wrap gap-2">
                <button
                  v-if="!isExpired(product.expiryDate)"
                  @click="openRestockModal(product)"
                  class="px-2.5 py-1 text-xs font-medium rounded bg-blue-50 text-blue-700 hover:bg-blue-100"
                >
                  Restock
                </button>
                <button
                  v-if="isLowStock(product)"
                  @click="ignoreLowStock(product)"
                  class="px-2.5 py-1 text-xs font-medium rounded bg-gray-100 text-gray-700 hover:bg-gray-200"
                >
                  Ignore Low Stock
                </button>
                <button
                  v-if="isExpired(product.expiryDate)"
                  @click="removeExpired(product)"
                  class="px-2.5 py-1 text-xs font-medium rounded bg-red-50 text-red-700 hover:bg-red-100"
                >
                  Remove Expired
                </button>
              </div>
            </td>
          </tr>
          <tr v-if="filteredProducts.length === 0">
            <td colspan="8" class="px-6 py-8 text-center text-gray-400">No products found</td>
          </tr>
        </tbody>
      </table>
      </div>
    </div>
    </template>
  </MainLayout>
</template>
