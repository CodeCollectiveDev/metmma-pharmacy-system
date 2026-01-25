<script setup>
import { ref, computed, onMounted } from 'vue'
import MainLayout from '@/layouts/MainLayout.vue'
import { useInventoryStore } from '../store/inventoryStore'
import { Plus, Search, Package, AlertTriangle, Calendar, Edit, ScanBarcode } from 'lucide-vue-next'

const store = useInventoryStore()
const showAddForm = ref(false)
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

const formatCurrency = (amount) => {
  return new Intl.NumberFormat('en-MW', { style: 'currency', currency: 'MWK', minimumFractionDigits: 0 }).format(amount || 0)
}

const isExpired = (date) => new Date(date) < new Date()
const isLowStock = (product) => product.stock <= (product.minStockLevel || 10)
</script>

<template>
  <MainLayout title="Inventory Management" subtitle="Manage stock, products, and suppliers">
    <!-- Stats Cards -->
    <div class="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
      <div class="bg-white p-5 rounded-xl shadow-sm border border-gray-100 flex items-center gap-4">
        <div class="p-3 bg-blue-50 rounded-lg">
          <Package class="w-6 h-6 text-blue-600" />
        </div>
        <div>
          <p class="text-sm text-gray-500">Total Products</p>
          <p class="text-2xl font-bold text-gray-800">{{ store.products.length }}</p>
        </div>
      </div>
      <div class="bg-white p-5 rounded-xl shadow-sm border border-orange-100 flex items-center gap-4">
        <div class="p-3 bg-orange-50 rounded-lg">
          <AlertTriangle class="w-6 h-6 text-orange-600" />
        </div>
        <div>
          <p class="text-sm text-gray-500">Low Stock</p>
          <p class="text-2xl font-bold text-orange-600">{{ store.lowStockProducts.length }}</p>
        </div>
      </div>
      <div class="bg-white p-5 rounded-xl shadow-sm border border-red-100 flex items-center gap-4">
        <div class="p-3 bg-red-50 rounded-lg">
          <Calendar class="w-6 h-6 text-red-600" />
        </div>
        <div>
          <p class="text-sm text-gray-500">Expired</p>
          <p class="text-2xl font-bold text-red-600">{{ store.expiredProducts.length }}</p>
        </div>
      </div>
      <div class="bg-white p-5 rounded-xl shadow-sm border border-gray-100">
        <button @click="showAddForm = !showAddForm" class="w-full h-full flex items-center justify-center gap-2 text-blue-600 hover:text-blue-700 font-medium">
          <Plus class="w-5 h-5" />
          <span>{{ showAddForm ? 'Cancel' : 'Add Product' }}</span>
        </button>
      </div>
    </div>

    <!-- Add Product Form -->
    <div v-if="showAddForm" class="bg-white rounded-xl shadow-sm border border-gray-100 p-6 mb-6">
      <h3 class="font-semibold text-gray-800 mb-4">Add New Product</h3>
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
        <button @click="saveProduct" class="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors">
          Save Product
        </button>
      </div>
    </div>

    <!-- Filters & Search -->
    <div class="bg-white rounded-xl shadow-sm border border-gray-100 mb-6">
      <div class="p-4 flex flex-wrap gap-4 items-center justify-between">
        <div class="flex gap-2">
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
        <div class="flex gap-2">
          <div class="relative">
            <input v-model="barcodeSearch" @keyup.enter="handleBarcodeSearch" type="text" placeholder="Scan barcode..." class="pl-10 pr-4 py-2 border rounded-lg w-48 focus:ring-2 focus:ring-blue-500 outline-none">
            <ScanBarcode class="w-4 h-4 text-gray-400 absolute left-3 top-2.5" />
          </div>
          <div class="relative">
            <input v-model="searchQuery" type="text" placeholder="Search products..." class="pl-10 pr-4 py-2 border rounded-lg w-64 focus:ring-2 focus:ring-blue-500 outline-none">
            <Search class="w-4 h-4 text-gray-400 absolute left-3 top-2.5" />
          </div>
        </div>
      </div>
    </div>

    <!-- Products Table -->
    <div class="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
      <table class="w-full">
        <thead class="bg-gray-50 border-b border-gray-100">
          <tr>
            <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Product</th>
            <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Batch #</th>
            <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Category</th>
            <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Expiry</th>
            <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Stock</th>
            <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Price</th>
            <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
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
              <span v-else-if="isLowStock(product)" class="px-2 py-1 bg-orange-100 text-orange-700 text-xs font-medium rounded-full">Low Stock</span>
              <span v-else class="px-2 py-1 bg-green-100 text-green-700 text-xs font-medium rounded-full">OK</span>
            </td>
          </tr>
          <tr v-if="filteredProducts.length === 0">
            <td colspan="7" class="px-6 py-8 text-center text-gray-400">No products found</td>
          </tr>
        </tbody>
      </table>
    </div>
  </MainLayout>
</template>
