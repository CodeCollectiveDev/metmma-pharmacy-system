<script setup>
import { ref, computed, onMounted, watch } from 'vue'
import MainLayout from '@/layouts/MainLayout.vue'
import { useInventoryStore } from '../store/inventoryStore'
import {
  Plus, Search, Package, AlertTriangle, Calendar, ScanBarcode,
  Filter, X, ChevronUp, ChevronDown, ChevronsUpDown, Loader2
} from 'lucide-vue-next'

const store = useInventoryStore()

/* ------------------------------------------------------------------ */
/* Local state                                                        */
/* ------------------------------------------------------------------ */

const showAddForm = ref(false)
const showRestockModal = ref(false)
const restockTarget = ref(null)
const restockQty = ref('')
const restockNote = ref('')

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

/* -------------------- Phase 1: Search -------------------- */
const searchQuery = ref('')      // free text: name / generic name / brand / batch number
const barcodeSearch = ref('')    // dedicated barcode scan input

/* -------------------- Phase 2: Filters -------------------- */
const selectedSupplier = ref('')          // supplier dropdown (single)
const selectedCategories = ref([])        // multiple category selection
const showCategoryPanel = ref(false)
const expiryFrom = ref('')
const expiryTo = ref('')
const stockStatus = ref('all')            // all | ok | low | expired

/* -------------------- Phase 3: Sorting -------------------- */
const sortField = ref('name')             // name | stock | expiryDate | price | supplier | category
const sortOrder = ref('asc')              // asc | desc

/* -------------------- Phase 4: UI state -------------------- */
const isLoading = ref(false)

/* ------------------------------------------------------------------ */
/* Lifecycle                                                          */
/* ------------------------------------------------------------------ */

onMounted(async () => {
  isLoading.value = true
  try {
    await store.fetchProducts()
  } finally {
    isLoading.value = false
  }
})

/* ------------------------------------------------------------------ */
/* Derived option lists                                               */
/* ------------------------------------------------------------------ */

const uniqueSuppliers = computed(() => {
  const set = new Set(
    store.products
      .map(p => p.supplier)
      .filter(s => s && s.trim().length)
  )
  return Array.from(set).sort((a, b) => a.localeCompare(b))
})

const usedCategories = computed(() => {
  const set = new Set(store.products.map(p => p.category).filter(Boolean))
  // Preserve the canonical category order, but only show ones actually in use;
  // fall back to the full list if products haven't loaded any categories yet.
  const inUse = categories.filter(c => set.has(c))
  return inUse.length ? inUse : categories
})

/* ------------------------------------------------------------------ */
/* Filtering + sorting pipeline                                       */
/* ------------------------------------------------------------------ */

const isExpired = (date) => !!date && new Date(date) < new Date()
const isLowStock = (product) => product.stock <= (product.minStockLevel || 10) && !product.lowStockIgnored
const isLowStockIgnored = (product) => product.stock <= (product.minStockLevel || 10) && product.lowStockIgnored

const matchesSearch = (product, query) => {
  if (!query) return true
  const q = query.toLowerCase()
  return (
    product.name?.toLowerCase().includes(q) ||
    product.genericName?.toLowerCase().includes(q) ||
    product.brand?.toLowerCase().includes(q) ||
    product.barcode?.toLowerCase().includes(q) ||
    product.batchNumber?.toLowerCase().includes(q)
  )
}

const matchesStockStatus = (product) => {
  switch (stockStatus.value) {
    case 'ok':
      return !isExpired(product.expiryDate) && !isLowStock(product) && !isLowStockIgnored(product)
    case 'low':
      return !isExpired(product.expiryDate) && isLowStock(product)
    case 'expired':
      return isExpired(product.expiryDate)
    default:
      return true
  }
}

const matchesExpiryRange = (product) => {
  if (!expiryFrom.value && !expiryTo.value) return true
  if (!product.expiryDate) return false
  const d = new Date(product.expiryDate)
  if (expiryFrom.value && d < new Date(expiryFrom.value)) return false
  if (expiryTo.value && d > new Date(expiryTo.value)) return false
  return true
}

const filteredProducts = computed(() => {
  const query = searchQuery.value || barcodeSearch.value

  let products = store.products.filter(p => (
    matchesSearch(p, query) &&
    (!selectedSupplier.value || p.supplier === selectedSupplier.value) &&
    (!selectedCategories.value.length || selectedCategories.value.includes(p.category)) &&
    matchesExpiryRange(p) &&
    matchesStockStatus(p)
  ))

  const dir = sortOrder.value === 'asc' ? 1 : -1
  products = [...products].sort((a, b) => {
    let av, bv
    switch (sortField.value) {
      case 'stock':
        av = a.stock ?? 0; bv = b.stock ?? 0
        return (av - bv) * dir
      case 'price':
        av = a.price ?? 0; bv = b.price ?? 0
        return (av - bv) * dir
      case 'expiryDate':
        av = a.expiryDate ? new Date(a.expiryDate).getTime() : 0
        bv = b.expiryDate ? new Date(b.expiryDate).getTime() : 0
        return (av - bv) * dir
      case 'supplier':
        av = a.supplier || ''; bv = b.supplier || ''
        return av.localeCompare(bv) * dir
      case 'category':
        av = a.category || ''; bv = b.category || ''
        return av.localeCompare(bv) * dir
      case 'name':
      default:
        av = a.name || ''; bv = b.name || ''
        return av.localeCompare(bv) * dir
    }
  })

  return products
})

const toggleSort = (field) => {
  if (sortField.value === field) {
    sortOrder.value = sortOrder.value === 'asc' ? 'desc' : 'asc'
  } else {
    sortField.value = field
    sortOrder.value = 'asc'
  }
}

/* ------------------------------------------------------------------ */
/* Active filter chips (Phase 4)                                      */
/* ------------------------------------------------------------------ */

const stockStatusLabels = { ok: 'OK', low: 'Low Stock', expired: 'Expired' }

const activeFilters = computed(() => {
  const chips = []

  if (searchQuery.value) {
    chips.push({ key: 'search', label: `Search: "${searchQuery.value}"`, clear: () => { searchQuery.value = '' } })
  }
  if (selectedSupplier.value) {
    chips.push({ key: 'supplier', label: `Supplier: ${selectedSupplier.value}`, clear: () => { selectedSupplier.value = '' } })
  }
  selectedCategories.value.forEach(cat => {
    chips.push({ key: `cat-${cat}`, label: `Category: ${cat}`, clear: () => toggleCategory(cat) })
  })
  if (expiryFrom.value) {
    chips.push({ key: 'expiryFrom', label: `From: ${expiryFrom.value}`, clear: () => { expiryFrom.value = '' } })
  }
  if (expiryTo.value) {
    chips.push({ key: 'expiryTo', label: `To: ${expiryTo.value}`, clear: () => { expiryTo.value = '' } })
  }
  if (stockStatus.value !== 'all') {
    chips.push({ key: 'stockStatus', label: `Status: ${stockStatusLabels[stockStatus.value]}`, clear: () => { stockStatus.value = 'all' } })
  }

  return chips
})

const hasActiveFilters = computed(() => activeFilters.value.length > 0)

const clearAllFilters = () => {
  searchQuery.value = ''
  barcodeSearch.value = ''
  selectedSupplier.value = ''
  selectedCategories.value = []
  expiryFrom.value = ''
  expiryTo.value = ''
  stockStatus.value = 'all'
}

const toggleCategory = (cat) => {
  const idx = selectedCategories.value.indexOf(cat)
  if (idx === -1) selectedCategories.value.push(cat)
  else selectedCategories.value.splice(idx, 1)
}

/* ------------------------------------------------------------------ */
/* Actions                                                            */
/* ------------------------------------------------------------------ */

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

    <!-- Search & Filters -->
    <div class="bg-white rounded-xl shadow-sm border border-gray-100 mb-4">
      <div class="p-4 flex flex-wrap gap-3 items-center">
        <!-- Search -->
        <div class="relative flex-1 min-w-[220px]">
          <input
            v-model="searchQuery"
            type="text"
            placeholder="Search by name, generic name, brand or batch #..."
            class="pl-10 pr-4 py-2 border rounded-lg w-full focus:ring-2 focus:ring-blue-500 outline-none"
          >
          <Search class="w-4 h-4 text-gray-400 absolute left-3 top-2.5" />
        </div>

        <!-- Barcode scan -->
        <div class="relative">
          <input
            v-model="barcodeSearch"
            @keyup.enter="handleBarcodeSearch"
            type="text"
            placeholder="Scan barcode..."
            class="pl-10 pr-4 py-2 border rounded-lg w-44 focus:ring-2 focus:ring-blue-500 outline-none"
          >
          <ScanBarcode class="w-4 h-4 text-gray-400 absolute left-3 top-2.5" />
        </div>

        <!-- Supplier dropdown -->
        <select v-model="selectedSupplier" class="px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none">
          <option value="">All Suppliers</option>
          <option v-for="s in uniqueSuppliers" :key="s" :value="s">{{ s }}</option>
        </select>

        <!-- Category multi-select -->
        <div class="relative">
          <button
            @click="showCategoryPanel = !showCategoryPanel"
            class="px-3 py-2 border rounded-lg text-sm flex items-center gap-2 hover:bg-gray-50"
          >
            <Filter class="w-4 h-4 text-gray-400" />
            <span>Category{{ selectedCategories.length ? ` (${selectedCategories.length})` : '' }}</span>
          </button>
          <div
            v-if="showCategoryPanel"
            class="absolute z-10 mt-2 w-56 bg-white border border-gray-100 rounded-lg shadow-lg p-3 space-y-1"
          >
            <label
              v-for="cat in usedCategories"
              :key="cat"
              class="flex items-center gap-2 text-sm px-2 py-1 rounded hover:bg-gray-50 cursor-pointer"
            >
              <input type="checkbox" :checked="selectedCategories.includes(cat)" @change="toggleCategory(cat)">
              {{ cat }}
            </label>
            <button
              v-if="selectedCategories.length"
              @click="selectedCategories = []"
              class="text-xs text-blue-600 hover:text-blue-700 mt-1"
            >
              Clear categories
            </button>
          </div>
        </div>

        <!-- Expiry range -->
        <div class="flex items-center gap-2 text-sm text-gray-500">
          <span>Expiry</span>
          <input v-model="expiryFrom" type="date" class="px-2 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none">
          <span>-</span>
          <input v-model="expiryTo" type="date" class="px-2 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none">
        </div>

        <!-- Stock status -->
        <select v-model="stockStatus" class="px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none">
          <option value="all">All Statuses</option>
          <option value="ok">OK</option>
          <option value="low">Low Stock</option>
          <option value="expired">Expired</option>
        </select>

        <button
          v-if="store.expiredProducts.length"
          @click="removeAllExpired"
          class="ml-auto px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg text-sm font-medium transition-colors"
        >
          Remove All Expired
        </button>
      </div>

      <!-- Active filter chips -->
      <div v-if="hasActiveFilters" class="px-4 pb-4 flex flex-wrap items-center gap-2">
        <span
          v-for="chip in activeFilters"
          :key="chip.key"
          class="inline-flex items-center gap-1 px-2.5 py-1 bg-blue-50 text-blue-700 text-xs font-medium rounded-full"
        >
          {{ chip.label }}
          <button @click="chip.clear" class="hover:text-blue-900">
            <X class="w-3 h-3" />
          </button>
        </span>
        <button @click="clearAllFilters" class="text-xs text-gray-500 hover:text-gray-700 underline ml-1">
          Clear all filters
        </button>
      </div>
    </div>

    <!-- Result count / loading -->
    <div class="flex items-center justify-between mb-3 px-1 text-sm text-gray-500">
      <div v-if="isLoading" class="flex items-center gap-2">
        <Loader2 class="w-4 h-4 animate-spin" />
        <span>Loading products...</span>
      </div>
      <div v-else>
        Showing {{ filteredProducts.length }} of {{ store.products.length }} products
      </div>
    </div>

    <!-- Restock Modal -->
    <div v-if="showRestockModal" class="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
      <div class="bg-white rounded-xl shadow-lg w-full max-w-md p-6">
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
    <div class="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
      <table class="w-full">
        <thead class="bg-gray-50 border-b border-gray-100">
          <tr>
            <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase cursor-pointer select-none" @click="toggleSort('name')">
              <span class="inline-flex items-center gap-1">
                Product
                <ChevronUp v-if="sortField === 'name' && sortOrder === 'asc'" class="w-3 h-3" />
                <ChevronDown v-else-if="sortField === 'name' && sortOrder === 'desc'" class="w-3 h-3" />
                <ChevronsUpDown v-else class="w-3 h-3 text-gray-300" />
              </span>
            </th>
            <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Batch #</th>
            <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase cursor-pointer select-none" @click="toggleSort('category')">
              <span class="inline-flex items-center gap-1">
                Category
                <ChevronUp v-if="sortField === 'category' && sortOrder === 'asc'" class="w-3 h-3" />
                <ChevronDown v-else-if="sortField === 'category' && sortOrder === 'desc'" class="w-3 h-3" />
                <ChevronsUpDown v-else class="w-3 h-3 text-gray-300" />
              </span>
            </th>
            <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase cursor-pointer select-none" @click="toggleSort('expiryDate')">
              <span class="inline-flex items-center gap-1">
                Expiry
                <ChevronUp v-if="sortField === 'expiryDate' && sortOrder === 'asc'" class="w-3 h-3" />
                <ChevronDown v-else-if="sortField === 'expiryDate' && sortOrder === 'desc'" class="w-3 h-3" />
                <ChevronsUpDown v-else class="w-3 h-3 text-gray-300" />
              </span>
            </th>
            <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase cursor-pointer select-none" @click="toggleSort('stock')">
              <span class="inline-flex items-center gap-1">
                Stock (Qty)
                <ChevronUp v-if="sortField === 'stock' && sortOrder === 'asc'" class="w-3 h-3" />
                <ChevronDown v-else-if="sortField === 'stock' && sortOrder === 'desc'" class="w-3 h-3" />
                <ChevronsUpDown v-else class="w-3 h-3 text-gray-300" />
              </span>
            </th>
            <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase cursor-pointer select-none" @click="toggleSort('price')">
              <span class="inline-flex items-center gap-1">
                Price
                <ChevronUp v-if="sortField === 'price' && sortOrder === 'asc'" class="w-3 h-3" />
                <ChevronDown v-else-if="sortField === 'price' && sortOrder === 'desc'" class="w-3 h-3" />
                <ChevronsUpDown v-else class="w-3 h-3 text-gray-300" />
              </span>
            </th>
            <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase cursor-pointer select-none" @click="toggleSort('supplier')">
              <span class="inline-flex items-center gap-1">
                Supplier
                <ChevronUp v-if="sortField === 'supplier' && sortOrder === 'asc'" class="w-3 h-3" />
                <ChevronDown v-else-if="sortField === 'supplier' && sortOrder === 'desc'" class="w-3 h-3" />
                <ChevronsUpDown v-else class="w-3 h-3 text-gray-300" />
              </span>
            </th>
            <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
            <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
          </tr>
        </thead>
        <tbody class="divide-y divide-gray-100">
          <!-- Loading skeleton rows -->
          <template v-if="isLoading">
            <tr v-for="n in 5" :key="`skeleton-${n}`" class="animate-pulse">
              <td class="px-6 py-4" colspan="9">
                <div class="h-4 bg-gray-100 rounded w-full"></div>
              </td>
            </tr>
          </template>

          <template v-else>
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
              <td class="px-6 py-4 text-gray-600">{{ product.supplier || '-' }}</td>
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
              <td colspan="9" class="px-6 py-10 text-center text-gray-400">
                <div class="flex flex-col items-center gap-2">
                  <Package class="w-8 h-8 text-gray-300" />
                  <p>No products found</p>
                  <button
                    v-if="hasActiveFilters"
                    @click="clearAllFilters"
                    class="text-sm text-blue-600 hover:text-blue-700 underline"
                  >
                    Clear filters to see all products
                  </button>
                </div>
              </td>
            </tr>
          </template>
        </tbody>
      </table>
    </div>
  </MainLayout>
</template>