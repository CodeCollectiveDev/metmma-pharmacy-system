<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import MainLayout from '@/layouts/MainLayout.vue'
import { usePosStore } from '../store/posStore'
import { Search, Plus, Minus, Trash2, CreditCard, Banknote, Printer, ScanBarcode, HelpCircle } from 'lucide-vue-next'

const router = useRouter()
const store = usePosStore()

const searchQuery = ref('')
const barcodeInput = ref('')
const paymentMethod = ref('cash')
const showReceipt = ref(false)
const lastTransaction = ref(null)
const processing = ref(false)

const categories = ['All', 'Antibiotics', 'Painkillers', 'Vitamins', 'Cough & Cold', 'First Aid', 'Diagnostics', 'Diabetes', 'Gastrointestinal']

onMounted(() => {
  store.fetchProducts()
  // Focus barcode input on mount
  document.getElementById('barcode-input')?.focus()
})

// Filter products based on search and category
const filteredProducts = computed(() => {
  return store.products.filter(p => {
    const matchesSearch = p.name.toLowerCase().includes(searchQuery.value.toLowerCase()) ||
                         p.batchNumber?.toLowerCase().includes(searchQuery.value.toLowerCase())
    const matchesCategory = store.selectedCategory === 'All' || p.category === store.selectedCategory
    return matchesSearch && matchesCategory && p.stock > 0
  })
})

// Handle barcode scan (Enter pressed in barcode input)
const handleBarcodeScan = () => {
  if (!barcodeInput.value) return
  const product = store.products.find(p => 
    p.batchNumber?.toLowerCase() === barcodeInput.value.toLowerCase() ||
    p._id === barcodeInput.value
  )
  if (product) {
    store.addToCart(product)
    barcodeInput.value = ''
  } else {
    alert('Product not found: ' + barcodeInput.value)
    barcodeInput.value = ''
  }
}

// Process payment and complete transaction
const processPayment = async () => {
  if (store.cart.length === 0) {
    alert('Cart is empty!')
    return
  }

  processing.value = true
  
  try {
    const result = await store.checkout(paymentMethod.value)
    if (result.offline) {
      alert('Sale saved offline and awaiting synchronization. A server receipt is not yet available.')
    } else {
      lastTransaction.value = result.transaction
      showReceipt.value = true
    }
  } catch (error) {
    console.error('Payment error:', error)
    alert('Payment failed: ' + (error.response?.data?.errors?.map(e => e.message).join('; ') || error.response?.data?.message || error.message))
  } finally {
    processing.value = false
  }
}

// Print receipt
const printReceipt = () => {
  window.print()
}

const formatCurrency = (amount) => {
  return new Intl.NumberFormat('en-MW', { style: 'currency', currency: 'MWK', minimumFractionDigits: 0 }).format(amount || 0)
}

const goToHelp = () => {
  router.push('/help')
}
</script>

<template>
  <MainLayout title="Point of Sale" subtitle="Process sales transactions">
    <div class="flex flex-col gap-4 lg:flex-row lg:gap-6 lg:h-[calc(100vh-180px)]">
      <!-- Left: Product Selection -->
      <div class="flex-1 flex flex-col min-h-[32rem] bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <!-- Search & Barcode Scanner -->
        <div class="p-4 border-b border-gray-100 space-y-3">
          <!-- Barcode Scanner & Help -->
          <div class="flex gap-2">
            <div class="relative flex-1">
              <input
                id="barcode-input"
                v-model="barcodeInput"
                @keyup.enter="handleBarcodeScan"
                type="text"
                placeholder="Scan barcode or enter batch number..."
                class="w-full pl-10 pr-4 py-2.5 border border-blue-200 bg-blue-50 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
              >
              <ScanBarcode class="w-5 h-5 text-blue-500 absolute left-3 top-2.5" />
            </div>
            <button @click="handleBarcodeScan" class="shrink-0 px-3 sm:px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">
              Scan
            </button>
            <button @click="goToHelp" class="px-3 py-2 border border-gray-200 text-gray-600 rounded-lg hover:bg-gray-50 transition-colors flex items-center justify-center">
              <HelpCircle class="w-5 h-5" />
            </button>
          </div>


          <!-- Search -->
          <div class="relative">
            <input
              v-model="searchQuery"
              type="text"
              placeholder="Search products..."
              class="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
            >
            <Search class="w-4 h-4 text-gray-400 absolute left-3 top-2.5" />
          </div>

          <!-- Categories -->
          <div class="flex flex-wrap gap-2">
            <button
              v-for="cat in categories"
              :key="cat"
              @click="store.selectedCategory = cat"
              :class="[
                'px-3 py-1 text-xs font-medium rounded-full border transition-all',
                store.selectedCategory === cat
                  ? 'bg-blue-600 text-white border-blue-600'
                  : 'bg-white text-gray-600 border-gray-200 hover:border-blue-400'
              ]"
            >
              {{ cat }}
            </button>
          </div>
        </div>

        <!-- Products Grid -->
        <div class="flex-1 p-4 overflow-y-auto">
          <div class="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
            <div
              v-for="product in filteredProducts"
              :key="product._id"
              @click="store.addToCart(product)"
              class="bg-gray-50 border border-gray-200 rounded-lg p-3 cursor-pointer hover:border-blue-500 hover:bg-blue-50 transition-all"
            >
              <div class="font-medium text-gray-800 text-sm mb-1 truncate">{{ product.name }}</div>
              <div class="text-lg font-bold text-blue-600">{{ formatCurrency(product.price) }}</div>
              <div class="text-xs text-gray-500 flex justify-between mt-1">
                <span>{{ product.batchNumber }}</span>
                <span :class="{'text-red-500 font-medium': product.stock < 20}">{{ product.stock }} left</span>
              </div>
            </div>
          </div>
          <div v-if="filteredProducts.length === 0" class="text-center text-gray-400 py-8">
            No products found
          </div>
        </div>
      </div>

      <!-- Right: Cart -->
      <div class="w-full lg:w-96 lg:shrink-0 flex flex-col bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div class="p-4 border-b border-gray-100 bg-gray-50">
          <h3 class="font-semibold text-gray-800">Current Order</h3>
          <p class="text-sm text-gray-500">{{ store.cart.length }} items</p>
        </div>

        <!-- Cart Items -->
        <div class="max-h-80 lg:max-h-none lg:flex-1 overflow-y-auto p-4 space-y-3">
          <div v-if="store.cart.length === 0" class="text-center text-gray-400 py-8">
            <div class="text-4xl mb-2">🛒</div>
            <p>Cart is empty</p>
            <p class="text-sm">Scan or click products to add</p>
          </div>
          <div
            v-for="item in store.cart"
            :key="item._id"
            class="flex items-center gap-3 p-3 bg-gray-50 rounded-lg"
          >
            <div class="flex-1 min-w-0">
              <p class="font-medium text-gray-800 text-sm truncate">{{ item.name }}</p>
              <p class="text-sm text-gray-500">{{ formatCurrency(item.price) }}</p>
            </div>
            <div class="flex items-center gap-2">
              <button @click="store.updateQuantity(item._id, -1)" class="w-7 h-7 flex items-center justify-center bg-white border border-gray-200 rounded-md hover:bg-gray-100">
                <Minus class="w-3 h-3" />
              </button>
              <span class="w-8 text-center font-medium">{{ item.quantity }}</span>
              <button @click="store.updateQuantity(item._id, 1)" class="w-7 h-7 flex items-center justify-center bg-white border border-gray-200 rounded-md hover:bg-gray-100">
                <Plus class="w-3 h-3" />
              </button>
              <button @click="store.removeFromCart(item._id)" class="p-1 text-red-400 hover:text-red-600">
                <Trash2 class="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>

        <!-- Totals & Payment -->
        <div class="p-4 bg-gray-50 border-t border-gray-100 space-y-3">
          <div class="flex justify-between text-sm">
            <span class="text-gray-500">Subtotal</span>
            <span>{{ formatCurrency(store.cartTotal) }}</span>
          </div>
          <div class="flex justify-between text-sm">
            <span class="text-gray-500">VAT (16.5%)</span>
            <span>{{ formatCurrency(store.cartTotal * 0.165) }}</span>
          </div>
          <div class="flex justify-between text-lg font-bold text-blue-700 pt-2 border-t">
            <span>Total</span>
            <span>{{ formatCurrency(store.cartTotal * 1.165) }}</span>
          </div>

          <!-- Payment Method -->
          <div class="flex gap-2">
            <button
              @click="paymentMethod = 'cash'"
              :class="['flex-1 py-2 rounded-lg border font-medium text-sm flex items-center justify-center gap-2', paymentMethod === 'cash' ? 'bg-green-600 text-white border-green-600' : 'bg-white text-gray-700 border-gray-200']"
            >
              <Banknote class="w-4 h-4" /> Cash
            </button>
            <button
              @click="paymentMethod = 'card'"
              :class="['flex-1 py-2 rounded-lg border font-medium text-sm flex items-center justify-center gap-2', paymentMethod === 'card' ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-gray-700 border-gray-200']"
            >
              <CreditCard class="w-4 h-4" /> Card
            </button>
          </div>

          <button
            @click="processPayment"
            :disabled="processing || store.cart.length === 0"
            class="w-full py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed text-white font-semibold rounded-lg flex items-center justify-center gap-2 transition-colors"
          >
            <span v-if="processing">Processing...</span>
            <span v-else>Complete Sale</span>
          </button>

          <button @click="store.clearCart" class="w-full py-2 border border-red-200 text-red-600 rounded-lg hover:bg-red-50 text-sm font-medium transition-colors">
            Clear Cart
          </button>
        </div>
      </div>
    </div>

    <!-- Receipt Modal -->
    <div v-if="showReceipt" class="fixed inset-0 bg-black/50 flex items-center justify-center z-50 print:bg-white print:inset-auto">
      <div class="bg-white rounded-xl shadow-xl max-w-md w-full mx-4 max-h-[calc(100vh-2rem)] overflow-y-auto print:shadow-none print:rounded-none">
        <div class="p-6 text-center border-b print:border-none">
          <h2 class="text-xl font-bold">METMMA Pharmacy</h2>
          <p class="text-sm text-gray-500">Sales Receipt</p>
        </div>

        <div class="p-6 space-y-4" v-if="lastTransaction">
          <div class="text-sm text-gray-500 text-center">
            <p>Date: {{ new Date(lastTransaction.date).toLocaleString() }}</p>
            <p>Cashier: {{ lastTransaction.cashier }}</p>
            <p>Transaction: {{ lastTransaction.receiptNumber || lastTransaction._id }}</p>
          </div>

          <div class="border-t border-b border-dashed py-4 space-y-2">
            <div v-for="item in lastTransaction.items" :key="item.productId" class="flex justify-between text-sm">
              <span>{{ item.name }} x{{ item.quantity }}</span>
              <span>{{ formatCurrency(item.subtotal) }}</span>
            </div>
          </div>

          <div class="space-y-1 text-sm">
            <div class="flex justify-between"><span>Subtotal</span><span>{{ formatCurrency(lastTransaction.subtotal) }}</span></div>
            <div class="flex justify-between"><span>VAT (16.5%)</span><span>{{ formatCurrency(lastTransaction.tax) }}</span></div>
            <div class="flex justify-between font-bold text-lg"><span>Total</span><span>{{ formatCurrency(lastTransaction.totalAmount) }}</span></div>
          </div>

          <p class="text-center text-sm text-gray-500 pt-4 border-t border-dashed">Thank you for your purchase!</p>
        </div>

        <div class="p-4 flex gap-3 print:hidden">
          <button @click="printReceipt" class="flex-1 py-2 bg-blue-600 text-white rounded-lg font-medium flex items-center justify-center gap-2">
            <Printer class="w-4 h-4" /> Print
          </button>
          <button @click="showReceipt = false" class="flex-1 py-2 border border-gray-200 text-gray-700 rounded-lg font-medium">
            Close
          </button>
        </div>
      </div>
    </div>
  </MainLayout>
</template>

<style>
@media print {
  body * { visibility: hidden; }
  .print\:bg-white, .print\:bg-white * { visibility: visible; }
}
</style>
