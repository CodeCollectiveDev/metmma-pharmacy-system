<script setup>
import { ref, watch, onMounted, onBeforeUnmount } from 'vue'
import MainLayout from '@/layouts/MainLayout.vue'
import AppDialog from '@/components/AppDialog.vue'
import ErrorNotice from '@/components/ErrorNotice.vue'
import { usePosStore } from '../store/posStore'
import { confirmAction } from '@/composables/useFeedback'
import { currency } from '@/services/api/money'
const store = usePosStore()
const barcode = ref(''), scanner = ref(null), payment = ref('cash'), customer = ref(''), receipt = ref(null), showReceipt = ref(false), configured = ref(false)
let timer
watch(() => [store.searchQuery, store.selectedCategory], () => { clearTimeout(timer); timer = setTimeout(() => store.fetchProducts(), 40) })
onMounted(async () => { try { await store.configure(); configured.value = true; await store.fetchProducts() } catch {} scanner.value?.focus() })
onBeforeUnmount(() => clearTimeout(timer))
async function scan() { if (await store.scan(barcode.value)) barcode.value = ''; scanner.value?.focus() }
async function pay() { try { const result = await store.checkout(payment.value, customer.value); if (result) { receipt.value = result.transaction; showReceipt.value = true; customer.value = '' } } catch {} }
async function clear() { if (await confirmAction('Clear this cart?', 'All items in this cart will be removed. No sale will be saved.', 'Clear cart')) store.clearCart() }
function print() { window.print() }
async function retryLoad() { try { await store.configure(); configured.value = true; await store.fetchProducts() } catch {} }
</script>
<template>
  <MainLayout title="Sell items" subtitle="Add items, collect payment and save a sale">
    <ErrorNotice :error="store.error" :retry="store.pending ? pay : retryLoad" />
    <p v-if="store.pending && !store.processing" role="status" class="panel mb-4">This sale is waiting for confirmation. Retry it using the same cart. Its checkout reference is {{ store.pending.idempotencyKey }}.</p>
    <div class="grid gap-4 lg:grid-cols-[minmax(0,1fr)_22rem]">
      <section class="panel" aria-label="Products to sell">
        <label class="block mb-3">Scan a barcode or enter a product code<div class="flex gap-2 mt-1"><input ref="scanner" id="barcode-input" v-model="barcode" :disabled="store.locked" @keydown.enter.prevent="scan" class="field" placeholder="Scan barcode or enter code" autocomplete="off" /><button class="primary" :disabled="store.locked || !barcode" @click="scan">Add scanned item</button></div></label>
        <label class="block mb-4">Search products<input v-model="store.searchQuery" class="field mt-1" placeholder="Search products..." /></label>
        <p class="text-sm text-gray-600 mb-3">Select a product to add one to your cart. Showing up to 40 matches; type more to narrow the list. Expired products cannot be sold.</p>
        <p v-if="store.loading" role="status" class="mb-3">Finding products…</p>
        <div class="grid grid-cols-2 xl:grid-cols-3 gap-3 max-h-64 lg:max-h-[calc(100vh-24rem)] overflow-y-auto p-1" role="region" aria-label="Matching products" tabindex="0" :aria-busy="store.loading">
          <button v-for="product in store.products" :key="product.id" :disabled="store.locked || product.stock <= 0" @click="store.addToCart(product)" class="text-left p-3 rounded-lg border border-gray-300 hover:bg-blue-50 hover:border-blue-700" :aria-label="`Add ${product.name} to cart`">
            <span class="block font-semibold">{{ product.name }}</span><span class="block text-blue-800 font-bold">{{ currency(product.price) }}</span><span class="text-sm text-gray-600">{{ product.productCode }} · {{ product.stock }} left</span>
          </button>
        </div>
        <div v-if="!store.loading && !store.products.length && !store.error" class="py-6 text-center"><p>No products match this search.</p><p class="text-gray-600 text-sm my-2">Try a shorter name or ask the stock manager to add available stock.</p><button class="secondary" @click="store.searchQuery = ''; store.fetchProducts()">Show available products</button></div>
      </section>
      <section class="panel flex flex-col" aria-label="Current cart">
        <h2 class="text-lg font-bold">Current cart</h2><p class="text-sm text-gray-600 mb-3">{{ store.cart.length }} items</p>
        <div v-if="!store.cart.length" class="py-5"><p>Your cart is empty.</p><p class="text-gray-600 text-sm mb-2">Search for a product or scan its barcode to begin.</p><button class="secondary" @click="scanner?.focus()">Scan your first item</button></div>
        <ul class="space-y-3 mb-4"><li v-for="item in store.cart" :key="item._id" class="p-3 rounded-lg bg-gray-50"><p class="font-medium">{{ item.name }}</p><p class="text-sm mb-2">{{ currency(item.price) }} each</p><div class="flex items-center gap-2"><button class="secondary px-3" :disabled="store.locked" :aria-label="`Decrease ${item.name} quantity`" @click="store.updateQuantity(item._id, -1)">−</button><span>{{ item.quantity }}</span><button class="secondary px-3" :disabled="store.locked" :aria-label="`Increase ${item.name} quantity`" @click="store.updateQuantity(item._id, 1)">+</button><button class="ml-auto underline text-red-800" :disabled="store.locked" :aria-label="`Remove ${item.name} from cart`" @click="store.removeFromCart(item._id)">Remove</button></div></li></ul>
        <div class="border-t pt-3 space-y-2 mt-auto">
          <p class="flex justify-between"><span>Subtotal</span><span>{{ currency(store.cartTotal) }}</span></p>
          <p class="flex justify-between"><span>VAT ({{ store.taxBps / 100 }}%)</span><span>{{ currency(store.taxMinor / 100) }}</span></p>
          <p class="flex justify-between text-lg font-bold"><span>Total</span><span>{{ currency(store.totalAmount) }}</span></p>
          <label class="block">Customer name (optional)<input v-model="customer" maxlength="100" class="field mt-1" :disabled="store.locked" /></label>
          <label class="block">How did the customer pay?<select v-model="payment" class="field mt-1" :disabled="store.locked"><option value="cash">Cash</option><option value="card">Card</option><option value="mobile_money">Mobile money</option><option value="bank_transfer">Bank transfer</option></select></label>
          <p class="text-sm text-gray-600">Collect payment using your usual process before saving.</p>
          <button class="primary w-full" :disabled="store.processing || !store.cart.length || !configured" @click="pay">{{ store.processing ? 'Saving sale…' : store.pending ? 'Retry sale' : 'Complete Sale' }}</button>
          <button class="secondary w-full" :disabled="store.locked || !store.cart.length" @click="clear">Clear cart</button>
        </div>
      </section>
    </div>
    <AppDialog :open="showReceipt" title="Sales Receipt" @close="showReceipt = false">
      <div v-if="receipt" class="receipt space-y-3"><h3 class="font-bold text-center">METMMA Pharmacy</h3><p>{{ receipt.receiptNumber }}</p><p>{{ new Date(receipt.date).toLocaleString() }} · {{ receipt.cashier }}</p><p>Payment: {{ receipt.paymentMethod.replaceAll('_', ' ') }}</p><ul><li v-for="item in receipt.items" :key="item.productId" class="flex justify-between gap-3"><span>{{ item.name }} × {{ item.quantity }}</span><span>{{ currency(item.subtotal) }}</span></li></ul><p>Subtotal: {{ currency(receipt.subtotal) }}</p><p>VAT: {{ currency(receipt.tax) }}</p><p class="font-bold">Total: {{ currency(receipt.totalAmount) }}</p></div>
      <div class="flex gap-3 mt-5 print-hide"><button class="primary" @click="print">Print</button><button class="secondary" @click="showReceipt = false">Close</button></div>
    </AppDialog>
  </MainLayout>
</template>
