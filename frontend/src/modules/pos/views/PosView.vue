<script setup>
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
const barcode = ref(''), scanner = ref(null), payment = ref('cash'), customer = ref(''), receipt = ref(null), showReceipt = ref(false), configured = ref(false)
const cameraOpen = ref(false), amountReceived = ref('')
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
async function scan() { if (await store.scan(barcode.value)) barcode.value = ''; scanner.value?.focus() }
async function pay() { if (!store.pending && !paymentValid.value) return; try { const result = await store.checkout(payment.value, customer.value, amountReceived.value); if (result) { receipt.value = result.transaction; showReceipt.value = true; customer.value = ''; amountReceived.value = '' } } catch {} }
async function clear() { if (await confirmAction('Clear this cart?', 'All items in this cart will be removed. No sale will be saved.', 'Clear cart')) store.clearCart() }
function unavailableMessage(item) {
  const reason=item.unavailableReason || (item.expired?'expired':item.isActive===false?'inactive':null)
  return ({expired:`Expired${item.expiryDate ? ' on '+item.expiryDate.slice(0,10) : ''}. Remove this item and select an unexpired batch.`,inactive:'This product was deactivated. Remove it and choose an active product.',missing:'This product no longer exists. Remove it and select it again from the product list.',missing_expiry:'This product has no expiry date. Ask the stock manager to check its record.'})[reason]
}
async function retryLoad() { await initialize() }
</script>
<template>
  <MainLayout title="Sell items" subtitle="Add items, collect payment and save a sale">
    <ErrorNotice :error="store.error" :retry="store.pending ? pay : retryLoad" />
    <p v-if="store.pending && !store.processing" role="status" class="panel mb-4">This sale is waiting for confirmation. Retry it using the same cart. Its checkout reference is {{ store.pending.idempotencyKey }}.</p>
    <div class="grid gap-4 lg:grid-cols-[minmax(0,1fr)_22rem]">
      <section class="panel" aria-label="Products to sell">
        <ErrorNotice :error="store.productError" :retry="store.fetchProducts" />
        <label class="block mb-3">Scan a barcode or enter a product code<div class="flex gap-2 mt-1"><input ref="scanner" id="barcode-input" v-model="barcode" :disabled="store.locked" @keydown.enter.prevent="scan" class="field" placeholder="Scan barcode or enter code" autocomplete="off" /><button class="primary" :disabled="store.locked || !barcode" @click="scan">Add scanned item</button></div></label>
        <button type="button" class="secondary mb-3" :disabled="store.locked" @click="cameraOpen = true">Scan with camera</button>
        <label class="block mb-4">Search products<input v-model="store.searchQuery" class="field mt-1" placeholder="Search products..." /></label>
        <p class="text-sm text-gray-600 mb-3">Select a product to add one to your cart. Browse products or search by name, code or barcode. Expired and out-of-stock products are shown but cannot be sold.</p>
        <p v-if="store.loading" role="status" class="mb-3">Finding products…</p>
        <div class="grid grid-cols-2 xl:grid-cols-3 gap-3 max-h-64 lg:max-h-[calc(100vh-24rem)] overflow-y-auto p-1" role="region" aria-label="Matching products" tabindex="0" :aria-busy="store.loading">
          <button v-for="product in store.products" :key="product.id" :disabled="store.locked || product.stock <= 0 || product.expired || product.expiryDate === null" @click="store.addToCart(product)" class="text-left p-3 rounded-lg border border-gray-300 hover:bg-blue-50 hover:border-blue-700" :aria-label="`Add ${product.name} to cart`">
            <span class="block font-semibold">{{ product.name }}</span><span class="block text-blue-800 font-bold">{{ currency(product.price) }}</span><span class="text-sm text-gray-600">{{ product.productCode }} · {{ product.stock }} left</span><span class="block text-sm">Batch {{product.batchNumber || '—'}} · Expiry {{product.expiryDate || 'Not set'}}</span><span v-if="product.expired" class="block text-red-800 text-sm">Expired — unavailable</span><span v-else-if="product.stock <= 0" class="block text-red-800 text-sm">Out of stock</span>
          </button>
        </div>
        <div v-if="!store.loading && !store.products.length && !store.productError" class="py-6 text-center"><p>No products match this search.</p><p class="text-gray-600 text-sm my-2">Try a shorter name or ask the stock manager to add available stock.</p><button class="secondary" @click="store.searchQuery = ''; store.fetchProducts()">Show all products</button></div>
        <PaginationControls :pagination="store.pagination" :loading="store.loading" @change="store.fetchProducts" />
      </section>
      <section class="panel flex flex-col" aria-label="Current cart">
        <h2 class="text-lg font-bold">Current cart</h2><p class="text-sm text-gray-600 mb-3">{{ store.cart.length }} items</p>
        <div v-if="!store.cart.length" class="py-5"><p>Your cart is empty.</p><p class="text-gray-600 text-sm mb-2">Search for a product or scan its barcode to begin.</p><button class="secondary" @click="scanner?.focus()">Scan your first item</button></div>
        <ul class="space-y-3 mb-4"><li v-for="item in store.cart" :key="item._id" class="p-3 rounded-lg bg-gray-50"><p class="font-medium">{{ item.name }}</p><p v-if="unavailableMessage(item)" role="alert" class="text-sm text-red-800 my-2">{{unavailableMessage(item)}}</p><p class="text-sm mb-2">{{ currency(item.price) }} each</p><div class="flex items-center gap-2"><button class="secondary px-3" :disabled="store.locked" :aria-label="`Decrease ${item.name} quantity`" @click="store.updateQuantity(item._id, -1)">−</button><span>{{ item.quantity }}</span><button class="secondary px-3" :disabled="store.locked" :aria-label="`Increase ${item.name} quantity`" @click="store.updateQuantity(item._id, 1)">+</button><button class="ml-auto underline text-red-800" :disabled="store.locked" :aria-label="`Remove ${item.name} from cart`" @click="store.removeFromCart(item._id)">Remove</button></div></li></ul>
        <div class="border-t pt-3 space-y-2 mt-auto">
          <p class="flex justify-between"><span>Subtotal</span><span>{{ currency(store.cartTotal) }}</span></p>
          <p class="flex justify-between"><span>VAT ({{ store.taxBps / 100 }}%)</span><span>{{ currency(store.taxMinor / 100) }}</span></p>
          <p class="flex justify-between text-lg font-bold"><span>Total</span><span>{{ currency(store.totalAmount) }}</span></p>
          <label class="block">Customer name (optional)<input v-model="customer" maxlength="100" class="field mt-1" :disabled="store.locked" /></label>
          <label class="block">How did the customer pay?<select v-model="payment" class="field mt-1" :disabled="store.locked"><option value="cash">Cash</option><option value="card">Card</option><option value="mobile_money">Mobile money</option><option value="bank_transfer">Bank transfer</option></select></label>
          <label class="block">{{ payment === 'cash' ? 'Cash received (MWK)' : 'Amount received (MWK)' }}<input v-model="amountReceived" aria-label="Amount received" type="number" min="0" max="9999999999.99" step="0.01" inputmode="decimal" class="field mt-1" :disabled="store.locked" /></label>
          <button class="secondary" :disabled="store.locked || !store.cart.length" @click="amountReceived = decimal(dueMinor)">Exact amount</button>
          <p v-if="difference !== null && difference < 0" role="status" class="text-red-800">Still owed: {{ currency(-difference / 100) }}</p>
          <p v-else-if="difference !== null && payment === 'cash'" role="status" class="font-bold text-green-800">Change to give: {{ currency(difference / 100) }}</p>
          <p v-else-if="difference !== null && difference > 0" role="status" class="text-red-800">Received {{ currency(difference / 100) }} above the total. Check the payment amount before saving.</p>
          <p class="text-sm text-gray-600">Collect payment using your usual process before saving.</p>
          <button class="primary w-full" :disabled="store.processing || !store.cart.length || !configured || (!store.pending && !paymentValid)" @click="pay">{{ store.processing ? 'Saving sale…' : store.pending ? 'Retry sale' : 'Complete Sale' }}</button>
          <button class="secondary w-full" :disabled="store.locked || !store.cart.length" @click="clear">Clear cart</button>
        </div>
      </section>
    </div>
    <AppDialog :open="cameraOpen" title="Scan product barcode" @close="cameraOpen = false"><BarcodeScanner v-if="cameraOpen" @close="cameraOpen = false" @detected="cameraScan" /></AppDialog>
    <button v-if="receipt && !showReceipt" class="secondary mt-4" @click="showReceipt = true">View last receipt</button>
    <ReceiptDialog :open="showReceipt" :sale="receipt" @close="showReceipt = false" />
  </MainLayout>
</template>
