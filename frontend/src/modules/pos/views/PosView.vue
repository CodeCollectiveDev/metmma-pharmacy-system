<script setup>
import CameraButton from '@/components/CameraButton.vue'
import { ShoppingBasket, Search, Trash2 } from 'lucide-vue-next'
import { ref, computed, watch, onMounted, onBeforeUnmount } from 'vue'
import MainLayout from '@/layouts/MainLayout.vue'
import BarcodeScanner from '@/components/BarcodeScanner.vue'
import PaginationControls from '@/components/PaginationControls.vue'
import ReceiptDialog from '@/components/ReceiptDialog.vue'
import AppDialog from '@/components/AppDialog.vue'
import ErrorNotice from '@/components/ErrorNotice.vue'
import { usePosStore } from '../store/posStore'
import { confirmAction } from '@/composables/useFeedback'
import { currency, minor, decimal } from '@/services/api/money'
const store = usePosStore()
const barcode = computed({get: () => store.searchQuery, set: value => { store.searchQuery = value }}), scanner = ref(null), payment = ref('cash'), customer = ref(''), receipt = ref(null), showReceipt = ref(false), configured = ref(false)
const cameraOpen = ref(false), amountReceived = ref(''), scanBusy = ref(false), notice = ref('')
const itemCount = computed(() => store.cart.reduce((sum, item) => sum + item.quantity, 0))
const receivedMinor = computed(() => { try { return amountReceived.value === '' ? null : minor(amountReceived.value) } catch { return null } })
const dueMinor = computed(() => store.subtotalMinor + store.taxMinor)
const difference = computed(() => receivedMinor.value === null ? null : receivedMinor.value - dueMinor.value)
const paymentValid = computed(() => receivedMinor.value !== null && (payment.value === 'cash' ? difference.value >= 0 : difference.value === 0))
watch(payment, () => { if (!store.locked) amountReceived.value = '' })
async function initialize() {
  configured.value = false
  await Promise.allSettled([store.fetchProducts(), store.configure().then(() => { configured.value = true })])
  if (store.pending) { payment.value = store.pending.paymentMethod; customer.value = store.pending.customerName || ''; amountReceived.value = store.pending.amountReceived ?? store.pending.totalAmount }
}
async function cameraScan(code) { cameraOpen.value = false; barcode.value = code; await scan() }
watch(() => store.locked, locked => { if (locked) cameraOpen.value = false })
let timer
watch(() => [store.searchQuery, store.selectedCategory], () => { clearTimeout(timer); timer = setTimeout(() => store.fetchProducts(), 40) })
onMounted(async () => { await initialize(); scanner.value?.focus() })
onBeforeUnmount(() => clearTimeout(timer))
async function scan() {
  if (scanBusy.value || store.locked || !barcode.value.trim()) return
  scanBusy.value = true
  const submitted = barcode.value
  try {
    const named = store.products.filter(p => p.name.toLowerCase() === submitted.trim().toLowerCase())
    const added = named.length === 1 ? store.addToCart(named[0]) : await store.scan(submitted)
    if (added) { notice.value = 'Item added to the cart.'; if (barcode.value === submitted) barcode.value = '' }
  } finally { scanBusy.value = false; scanner.value?.focus() }
}
function addProduct(product) { if (store.addToCart(product)) { notice.value = `${product.name} added to the cart.`; scanner.value?.focus() } }
function removeItem(item) { store.removeFromCart(item._id); notice.value = `${item.name} removed from the cart.` }

async function pay() { if (!store.pending && !paymentValid.value) return; try { const result = await store.checkout(payment.value, customer.value, amountReceived.value); if (result) { receipt.value = result.transaction; showReceipt.value = true; notice.value = 'Sale saved. Your receipt is ready.'; customer.value = ''; amountReceived.value = '' } } catch {} }
async function clear() { if (await confirmAction('Clear this cart?', 'All items in this cart will be removed. No sale will be saved.', 'Clear cart')) store.clearCart() }
function unavailableMessage(item) {
  const reason=item.unavailableReason || (item.expired?'expired':item.isActive===false?'inactive':null)
  return ({expired:`Expired${item.expiryDate ? ' on '+item.expiryDate.slice(0,10) : ''}. Remove this item and select an unexpired batch.`,inactive:'This product was deactivated. Remove it and choose an active product.',missing:'This product no longer exists. Remove it and select it again from the product list.',missing_expiry:'This product has no expiry date. Ask the stock manager to check its record.'})[reason]
}
async function retryLoad() { await initialize() }
</script>
<template>
  <MainLayout title="Sell items" subtitle="1. Add products · 2. Confirm payment · 3. Give the receipt">
    <ErrorNotice :error="store.error" :retry="store.pending ? pay : retryLoad" />
    <p v-if="store.pending && !store.processing" role="status" class="panel mb-4">This sale is waiting for confirmation. Retry it using the same cart. Your cart is protected while we confirm whether payment was recorded.</p>
    <div class="grid gap-4 lg:grid-cols-[minmax(0,1fr)_24rem] xl:grid-cols-[minmax(0,1fr)_27rem]">
      <section class="panel" aria-label="Products to sell">
        <ErrorNotice :error="store.productError" :retry="store.fetchProducts" />
        <div class="flex items-center justify-between gap-3 mb-4"><div><h2 class="text-lg font-bold">Find a product</h2><p class="text-sm text-slate-500">Search by name, or enter a barcode and press Enter.</p></div><router-link to="/sales" class="text-sm text-blue-800 underline">Past receipts</router-link></div>
        <form class="flex gap-2 mb-3" @submit.prevent="scan"><label class="relative flex-1"><span class="sr-only">Search products or enter barcode number</span><Search class="absolute left-3 top-3 w-5 h-5 text-slate-400" aria-hidden="true"/><input ref="scanner" id="barcode-input" v-model="barcode" :disabled="store.locked" class="field pl-10" placeholder="Product name or barcode number" maxlength="100" autocomplete="off" /></label><CameraButton :disabled="store.locked || scanBusy" @click="cameraOpen = true"/></form>
        <p class="text-sm text-slate-500 mb-3">Select a product below to add one unit. USB scanners use the same search box.</p>
        <p role="status" class="text-sm text-emerald-800 min-h-5 mb-3">{{ notice }}</p>
        <p v-if="store.loading" role="status" class="mb-3">Finding products…</p>
        <div class="grid grid-cols-2 xl:grid-cols-3 gap-3 max-h-80 lg:max-h-[calc(100vh-22rem)] overflow-y-auto p-1" role="region" aria-label="Matching products" tabindex="0" :aria-busy="store.loading">
          <button v-for="product in store.products" :key="product.id" :disabled="store.locked || product.stock <= 0 || product.expired || product.expiryDate === null" @click="addProduct(product)" class="text-left p-3 rounded-lg border border-gray-300 hover:bg-blue-50 hover:border-blue-700" :aria-label="`Add ${product.name} to cart`">
            <span class="block font-semibold">{{ product.name }}</span><span class="block text-blue-800 font-bold">{{ currency(product.price) }}</span><span class="text-sm text-gray-600">{{ product.productCode }} · {{ product.stock }} left</span><span class="block text-sm">Batch {{product.batchNumber || '—'}} · Expiry {{product.expiryDate || 'Not set'}}</span><span v-if="product.expired" class="block text-red-800 text-sm">Expired — unavailable</span><span v-else-if="product.stock <= 0" class="block text-red-800 text-sm">Out of stock</span>
          </button>
        </div>
        <div v-if="!store.loading && !store.products.length && !store.productError" class="py-6 text-center"><p>No products match this search.</p><p class="text-gray-600 text-sm my-2">Try a shorter name or ask the stock manager to add available stock.</p><button class="secondary" @click="store.searchQuery = ''; store.fetchProducts()">Show all products</button></div>
        <PaginationControls :pagination="store.pagination" :loading="store.loading" @change="store.fetchProducts" />
      </section>
      <section class="panel flex flex-col lg:sticky lg:top-4 self-start" aria-label="Current cart">
        <div class="flex items-start justify-between gap-2 mb-4"><div><h2 class="text-lg font-bold flex items-center gap-2"><ShoppingBasket class="h-5 w-5"/>Current cart</h2><p class="text-sm text-slate-500">{{ itemCount }} units · {{ store.cart.length }} products</p></div><button class="text-sm text-slate-500 underline" :disabled="store.locked || !store.cart.length" @click="clear">Clear cart</button></div>
        <div v-if="!store.cart.length" class="py-5"><p>Your cart is empty.</p><p class="text-gray-600 text-sm mb-2">Search for a product or scan its barcode to begin.</p><button class="secondary" @click="scanner?.focus()">Find your first item</button></div>
        <ul class="space-y-3 mb-4 max-h-72 overflow-auto"><li v-for="item in store.cart" :key="item._id" class="p-3 rounded-lg bg-gray-50"><p class="font-medium flex justify-between gap-2"><span>{{ item.name }}</span><span class="whitespace-nowrap">{{ currency(Number(item.price) * item.quantity) }}</span></p><p v-if="unavailableMessage(item)" role="alert" class="text-sm text-red-800 my-2">{{unavailableMessage(item)}}</p><p class="text-sm mb-2">{{ currency(item.price) }} each</p><div class="flex items-center gap-2"><button class="secondary px-3" :disabled="store.locked" :aria-label="`Decrease ${item.name} quantity`" @click="store.updateQuantity(item._id, -1)">−</button><span>{{ item.quantity }}</span><button class="secondary px-3" :disabled="store.locked" :aria-label="`Increase ${item.name} quantity`" @click="store.updateQuantity(item._id, 1)">+</button><button class="ml-auto underline text-red-800" :disabled="store.locked" :aria-label="`Remove ${item.name} from cart`" @click="removeItem(item)"><Trash2 class="h-4 w-4" aria-hidden="true"/></button></div></li></ul>
        <div class="border-t pt-3 space-y-2 mt-auto">
          <p class="flex justify-between"><span>Subtotal</span><span>{{ currency(store.cartTotal) }}</span></p>
          <p class="flex justify-between"><span>VAT ({{ store.taxBps / 100 }}%)</span><span>{{ currency(store.taxMinor / 100) }}</span></p>
          <p class="flex justify-between text-2xl font-bold bg-blue-50 rounded-lg px-3 py-4 text-blue-950"><span>Total</span><span>{{ currency(store.totalAmount) }}</span></p>
          <details class="py-1"><summary class="text-sm cursor-pointer text-slate-600">Add customer name (optional)</summary><label class="block mt-2"><span class="sr-only">Customer name</span><input v-model="customer" maxlength="100" class="field" :disabled="store.locked" placeholder="Walk-in customer"/></label></details>
          <label class="block">How did the customer pay?<select v-model="payment" class="field mt-1" :disabled="store.locked"><option value="cash">Cash</option><option value="card">Card</option><option value="mobile_money">Mobile money</option><option value="bank_transfer">Bank transfer</option></select></label>
          <label class="block">{{ payment === 'cash' ? 'Cash received (MWK)' : 'Amount received (MWK)' }}<input v-model="amountReceived" aria-label="Amount received" type="number" min="0" max="9999999999.99" step="0.01" inputmode="decimal" class="field mt-1" :disabled="store.locked" /></label>
          <button class="secondary" :disabled="store.locked || !store.cart.length" @click="amountReceived = decimal(dueMinor)">Exact amount</button>
          <p v-if="difference !== null && difference < 0" role="status" class="text-red-800">Still owed: {{ currency(-difference / 100) }}</p>
          <p v-else-if="difference !== null && payment === 'cash'" role="status" class="font-bold text-green-800">Change to give: {{ currency(difference / 100) }}</p>
          <p v-else-if="difference !== null && difference > 0" role="status" class="text-red-800">Received {{ currency(difference / 100) }} above the total. Check the payment amount before saving.</p>
          <p class="text-sm text-gray-600">Collect payment using your usual process before saving.</p>
          <button class="primary w-full" :disabled="store.processing || !store.cart.length || !configured || (!store.pending && !paymentValid)" @click="pay">{{ store.processing ? 'Saving sale…' : store.pending ? 'Retry sale' : 'Complete Sale' }}</button>
          <p v-if="store.cart.length && !paymentValid && !store.pending" class="text-xs text-slate-500">Enter the payment received or choose Exact amount to complete the sale.</p>
        </div>
      </section>
    </div>
    <AppDialog :open="cameraOpen" title="Scan product barcode" @close="cameraOpen = false"><BarcodeScanner v-if="cameraOpen" @close="cameraOpen = false" @detected="cameraScan" /></AppDialog>
    <button v-if="receipt && !showReceipt" class="secondary mt-4" @click="showReceipt = true">View last receipt</button>
    <ReceiptDialog :open="showReceipt" :sale="receipt" @close="showReceipt = false" />
  </MainLayout>
</template>
