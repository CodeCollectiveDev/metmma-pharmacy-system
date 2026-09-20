<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import MainLayout from '@/layouts/MainLayout.vue'
import BarcodeCameraScanner from '@/modules/shared/components/BarcodeCameraScanner.vue'
import { usePosStore } from '../store/posStore'
import { dataService } from '@/services/api/dataService'
import { Search, Plus, Minus, Trash2, CreditCard, Banknote, Printer, ScanBarcode, HelpCircle } from 'lucide-vue-next'

const router = useRouter()
const store = usePosStore()

const searchQuery = ref('')
const barcodeInputElement = ref(null)
const showCameraScanner = ref(false)
const paymentMethod = ref('cash')
const showReceipt = ref(false)
const lastTransaction = ref(null)
const processing = ref(false)
const amountTendered = ref('')
const VAT_RATE = 0.175

const categories = ['All', 'Antibiotics', 'Painkillers', 'Vitamins', 'Cough & Cold', 'First Aid', 'Diagnostics', 'Diabetes', 'Gastrointestinal']

onMounted(() => {
  store.fetchProducts()
  // Focus barcode input on mount
  barcodeInputElement.value?.focus()
})

// Filter products based on search and category
const filteredProducts = computed(() => {
  return store.products.filter(p => {
    const matchesSearch = p.name.toLowerCase().includes(searchQuery.value.toLowerCase()) ||
                         p.batchNumber?.toLowerCase().includes(searchQuery.value.toLowerCase()) ||
                         p.category?.toLowerCase().includes(searchQuery.value.toLowerCase()) ||
                         String(p.barcode ?? '').toLowerCase().includes(searchQuery.value.toLowerCase())
    const matchesCategory = store.selectedCategory === 'All' || p.category === store.selectedCategory
    return matchesSearch && matchesCategory && p.stock > 0
  })
})

// Handle an exact barcode, batch number, or product ID from a scanner.
const handleBarcodeScan = () => {
  const scanValue = searchQuery.value.trim()
  if (!scanValue) return
  const product = store.products.find(p => 
    p.batchNumber?.toLowerCase() === scanValue.toLowerCase() ||
    String(p.barcode ?? '').toLowerCase() === scanValue.toLowerCase() ||
    p._id === scanValue
  )
  if (product) {
    store.addToCart(product)
    searchQuery.value = ''
  } else {
    alert('Product not found: ' + scanValue)
  }
}

const focusBarcodeInput = () => {
  barcodeInputElement.value?.focus()
}

const startBarcodeScan = () => {
  if (searchQuery.value.trim()) {
    handleBarcodeScan()
    return
  }
  focusBarcodeInput()
}

const handleCameraBarcode = (barcode) => {
  showCameraScanner.value = false
  searchQuery.value = barcode
  handleBarcodeScan()
}

const saleSubtotal = computed(() => Math.round(store.cartTotal * 100) / 100)
const saleVat = computed(() => Math.round(saleSubtotal.value * VAT_RATE * 100) / 100)
const saleTotal = computed(() => Math.round((saleSubtotal.value + saleVat.value) * 100) / 100)
const changeDue = computed(() => Math.max(0, Math.round((Number(amountTendered.value || 0) - saleTotal.value) * 100) / 100))
const paymentShortfall = computed(() => Math.max(0, Math.round((saleTotal.value - Number(amountTendered.value || 0)) * 100) / 100))

// Process payment and complete transaction
const processPayment = async () => {
  if (store.cart.length === 0) {
    alert('Cart is empty!')
    return
  }
  if (paymentMethod.value === 'cash' && Number(amountTendered.value || 0) < saleTotal.value) {
    alert(`Amount received is short by ${formatCurrency(paymentShortfall.value)}.`)
    return
  }

  processing.value = true
  
  try {
    const user = JSON.parse(localStorage.getItem('user') || '{}')
    const subtotal = saleSubtotal.value
    const totalAmount = saleTotal.value

    // Backend contract: salesController.processSale expects
    // { items: [{ productId (DB id), quantity, unitPrice, subtotal }],
    //   totalAmount, paymentMethod, customerName, userId }
    const payload = {
      localSaleId: globalThis.crypto?.randomUUID?.() || `sale_${Date.now()}_${Math.random().toString(16).slice(2)}`,
      items: store.cart.map(item => ({
        productId: Number(item.id || item._id),
        quantity: item.quantity,
        unitPrice: item.price,
        subtotal: Math.round(item.price * item.quantity * 100) / 100
      })),
      totalAmount,
      paymentMethod: paymentMethod.value,
      customerName: '',
      userId: user.id
    }

    if (payload.items.some(item => !Number.isSafeInteger(item.productId) || item.productId <= 0)) {
      throw new Error('This product is not synchronized with the server yet. Refresh inventory before selling it.')
    }

    // Sale must be confirmed by the backend before we show a receipt or
    // clear the cart. Never auto-queue a sale and claim success.
    const response = await dataService.recordSale(payload)
    const result = response?.data

    if (!result || !result.success) {
      throw new Error(result?.message || 'Sale could not be completed')
    }

    // Store confirmed transaction for the receipt (server-generated receipt no.)
    lastTransaction.value = {
      _id: result.receiptNumber || `txn_${Date.now()}`,
      date: new Date().toISOString(),
      items: store.cart.map(item => ({
        productId: item.id,
        name: item.name,
        batchNumber: item.batchNumber,
        quantity: item.quantity,
        unitPrice: item.price,
        total: Math.round(item.price * item.quantity * 100) / 100
      })),
      subtotal,
      tax: saleVat.value,
      total: totalAmount,
      amountTendered: paymentMethod.value === 'cash' ? Number(amountTendered.value) : null,
      changeDue: paymentMethod.value === 'cash' ? changeDue.value : null,
      paymentMethod: paymentMethod.value,
      cashier: user.name || 'Unknown'
    }
    showReceipt.value = true

    // Clear cart and reload products — stock was decremented server-side
    // inside the sale transaction.
    store.clearCart()
    amountTendered.value = ''
    await store.fetchProducts()
  } catch (error) {
    console.error('Payment error:', error)
    const detail = error.response?.data?.errors?.map(item => `${item.field}: ${item.message}`).join('; ')
    alert('Payment failed: ' + (detail || error.response?.data?.message || error.message))
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
                id="product-search"
                ref="barcodeInputElement"
                v-model="searchQuery"
                @keyup.enter="handleBarcodeScan"
                type="text"
                placeholder="Search products, barcodes, or batches..."
                class="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
              >
              <Search class="w-5 h-5 text-gray-400 absolute left-3 top-2.5" />
            </div>
            <button type="button" @click="startBarcodeScan" class="shrink-0 px-3 sm:px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">
              <ScanBarcode class="h-5 w-5" />
              <span class="hidden sm:inline">Scanner</span>
            </button>
            <button type="button" @click="showCameraScanner = true" class="shrink-0 px-3 py-2 border border-blue-200 text-blue-700 rounded-lg hover:bg-blue-50 transition-colors" aria-label="Scan barcode with camera" title="Scan with camera">
              <ScanBarcode class="h-5 w-5" />
              <span class="hidden sm:inline">Camera</span>
            </button>
            <button @click="goToHelp" class="px-3 py-2 border border-gray-200 text-gray-600 rounded-lg hover:bg-gray-50 transition-colors flex items-center justify-center">
              <HelpCircle class="w-5 h-5" />
            </button>
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

        <BarcodeCameraScanner
          v-if="showCameraScanner"
          @detected="handleCameraBarcode"
          @close="showCameraScanner = false"
        />

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
            <span class="text-gray-500">VAT (17.5%)</span>
            <span>{{ formatCurrency(saleVat) }}</span>
          </div>
          <div class="flex justify-between text-lg font-bold text-blue-700 pt-2 border-t">
            <span>Total</span>
            <span>{{ formatCurrency(saleTotal) }}</span>
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

          <div v-if="paymentMethod === 'cash'" class="space-y-2">
            <label for="amount-tendered" class="block text-sm font-medium text-gray-700">Amount received (MWK)</label>
            <input id="amount-tendered" v-model.number="amountTendered" type="number" min="0" step="0.01" :placeholder="`Enter at least ${saleTotal}`" class="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none">
            <div v-if="amountTendered !== ''" class="flex justify-between text-sm font-medium" :class="paymentShortfall ? 'text-red-600' : 'text-green-700'">
              <span>{{ paymentShortfall ? 'Amount still due' : 'Change due' }}</span>
              <span>{{ formatCurrency(paymentShortfall || changeDue) }}</span>
            </div>
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
            <p>Transaction: {{ lastTransaction._id }}</p>
          </div>

          <div class="border-t border-b border-dashed py-4 space-y-2">
            <div v-for="item in lastTransaction.items" :key="item.productId" class="flex justify-between text-sm">
              <span>{{ item.name }} x{{ item.quantity }}</span>
              <span>{{ formatCurrency(item.total) }}</span>
            </div>
          </div>

          <div class="space-y-1 text-sm">
            <div class="flex justify-between"><span>Subtotal</span><span>{{ formatCurrency(lastTransaction.subtotal) }}</span></div>
            <div class="flex justify-between"><span>VAT (17.5%)</span><span>{{ formatCurrency(lastTransaction.tax) }}</span></div>
            <div class="flex justify-between font-bold text-lg"><span>Total</span><span>{{ formatCurrency(lastTransaction.total) }}</span></div>
            <div v-if="lastTransaction.amountTendered !== null" class="flex justify-between"><span>Amount received</span><span>{{ formatCurrency(lastTransaction.amountTendered) }}</span></div>
            <div v-if="lastTransaction.changeDue !== null" class="flex justify-between font-semibold"><span>Change</span><span>{{ formatCurrency(lastTransaction.changeDue) }}</span></div>
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
