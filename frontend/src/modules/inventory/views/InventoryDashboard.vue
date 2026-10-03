<script setup>
import { ref, watch, onMounted, onBeforeUnmount } from 'vue'
import { useRoute } from 'vue-router'
import MainLayout from '@/layouts/MainLayout.vue'
import BarcodeScanner from '@/components/BarcodeScanner.vue'
import AppDialog from '@/components/AppDialog.vue'
import ErrorNotice from '@/components/ErrorNotice.vue'
import PaginationControls from '@/components/PaginationControls.vue'
import { useInventoryStore } from '../store/inventoryStore'
import { dataService } from '@/services/api/dataService'
import { currency } from '@/services/api/money'
import { userError } from '@/services/api/errors'
import { confirmAction } from '@/composables/useFeedback'
const store = useInventoryStore(), route = useRoute()
const role = localStorage.getItem('role'), canAdd = ['admin', 'pharmacist'].includes(role), canEdit = ['admin', 'pharmacist', 'store_manager'].includes(role)
const search = ref(''), status = ref('all'), showForm = ref(false), saving = ref(false), error = ref(null), fields = ref([]), notice = ref(''), restock = ref(null), quantity = ref(1), note = ref('')
const blank = () => ({ productCode: '', name: '', batchNumber: '', expiryDate: '', quantity: 0, sellingPrice: '', supplier: '', category: 'Other', reorderLevel: 10, barcode: '' })
const form = ref(blank())
const inputs = [ ['productCode','Product code','text','A unique code, such as PARA-001.'], ['name','Product name','text','The name staff will search for.'], ['batchNumber','Batch number','text','Use the number on the pack.'], ['expiryDate','Expiry date','date','Use the expiry date on the pack.'], ['quantity','Starting quantity','number','Number of units available.'], ['sellingPrice','Selling price (MWK)','number','Price for one unit, before VAT.'], ['supplier','Supplier','text','Who supplied this product.'], ['category','Category','text','For example, Painkillers or Vitamins.'], ['reorderLevel','Low stock threshold','number','You get a notice at or below this quantity.'], ['barcode','Barcode (optional)','text','The number read by your scanner.'] ]
const restockKey = ref('')
const cameraOpen = ref(false), barcodeProduct = ref(null), barcodeValue = ref('')
function cameraScan(code) { cameraOpen.value = false; if (barcodeProduct.value) barcodeValue.value = code; else if (showForm.value) form.value.barcode = code; else search.value = code }
async function saveBarcode() { if (saving.value) return; saving.value = true; error.value = null; try { await dataService.updateProduct({id:barcodeProduct.value.id,barcode:barcodeValue.value}); barcodeProduct.value = null; notice.value = 'Barcode saved.'; await refresh() } catch (err) { error.value = err } finally { saving.value = false } }
let timer
function load(page = 1) { return store.fetchProducts({ page, search: search.value, status: status.value, id: route.query.product }) }
async function refresh() { await Promise.allSettled([load(), store.refreshSummary()]) }
watch([search, status, () => route.query.product], () => { clearTimeout(timer); timer = setTimeout(() => load(), 100) })
onMounted(refresh); onBeforeUnmount(() => clearTimeout(timer))
function invalid(name) { return fields.value.some(f => f.field === name) }
function openRestock(product) {
  restock.value = product; restockKey.value = crypto.randomUUID(); quantity.value = 1; note.value = ''; error.value = null
}
async function saveProduct() {
  if (saving.value) return
  saving.value = true; error.value = null; fields.value = []
  try { await dataService.addProduct({ ...form.value, unitPrice: form.value.sellingPrice }); showForm.value = false; form.value = blank(); notice.value = 'Product saved.'; await refresh(); window.dispatchEvent(new Event('stock-changed')) }
  catch (err) { error.value = err; fields.value = userError(err).fields }
  finally { saving.value = false }
}
async function addStock() {
  if (saving.value) return
  saving.value = true; error.value = null
  try { await dataService.restockProduct(restock.value.id, { idempotencyKey: restockKey.value, quantity: quantity.value, reason: note.value }); restock.value = null; notice.value = 'Stock added.'; await refresh(); window.dispatchEvent(new Event('stock-changed')) }
  catch (err) { error.value = err }
  finally { saving.value = false }
}
async function deactivate(product) {
  if (!(await confirmAction('Deactivate this product?', `${product.name} will no longer appear in Sell items. Its stock and past receipts will stay in the records.`, 'Deactivate product'))) return
  saving.value = true; error.value = null
  try { await dataService.deleteProduct(product); notice.value = 'Product deactivated.'; await refresh(); window.dispatchEvent(new Event('stock-changed')) } catch (err) { error.value = err } finally { saving.value = false }
}
</script>
<template>
  <MainLayout title="Inventory" subtitle="Check current stock, add products and record deliveries">
    <ErrorNotice :error="store.error || (!showForm && !restock ? error : null)" :retry="refresh" /><p v-if="notice" role="status" class="mb-4 text-green-800">{{ notice }}</p>
    <div v-if="store.summary" class="grid grid-cols-3 gap-3 mb-4"><div class="panel">Products <strong class="block text-2xl">{{ store.summary.total }}</strong></div><div class="panel">Low stock <strong class="block text-2xl">{{ store.summary.low }}</strong></div><div class="panel">Expired <strong class="block text-2xl">{{ store.summary.expired }}</strong></div></div>
    <div class="panel mb-4 flex flex-wrap items-end gap-3"><label class="flex-1">Find a product<input v-model="search" class="field mt-1" placeholder="Name, code or barcode" /></label><button type="button" class="secondary" @click="cameraOpen = true">Scan with camera</button><label>Show<select v-model="status" class="field mt-1"><option value="all">All products</option><option value="low">Low stock</option><option value="expired">Expired</option><option value="expiring">Expiry within 90 days</option></select></label><button v-if="canAdd" class="primary" @click="showForm = true; error = null">Add product</button><router-link v-if="route.query.product" to="/inventory" class="secondary">Show all products</router-link></div>
    <p v-if="store.loading" role="status" class="mb-3">Loading stock…</p>
    <div class="panel overflow-x-auto p-0"><table class="w-full min-w-[760px]"><thead class="bg-gray-50"><tr><th class="p-3 text-left">Product</th><th class="p-3 text-left">Batch / expiry</th><th class="p-3 text-left">Stock</th><th class="p-3 text-left">Price</th><th class="p-3 text-left">Actions</th></tr></thead><tbody><tr v-for="product in store.products" :key="product.id" class="border-t border-gray-200"><td class="p-3"><strong>{{ product.name }}</strong><p class="text-sm text-gray-600">{{ product.productCode }} · {{ product.supplier }}</p></td><td class="p-3">{{ product.batchNumber }}<p class="text-sm">{{ product.expiryDate?.slice(0,10) }}</p></td><td class="p-3">{{ product.quantity }}<p class="text-sm text-gray-600">Low at {{ product.reorderLevel }}</p><p class="text-sm text-red-800" v-if="product.expired">Expired — do not sell</p></td><td class="p-3">{{ currency(product.sellingPrice) }}</td><td class="p-3"><div class="flex gap-2"><button v-if="canEdit" class="secondary" :disabled="saving" @click="barcodeProduct = product; barcodeValue = product.barcode || ''; error = null">Edit barcode</button><button v-if="canEdit && !product.expired" class="secondary" :disabled="saving" title="Record units received in a delivery" @click="openRestock(product)">Add stock</button><button v-if="role === 'admin'" class="secondary text-red-800" :disabled="saving" @click="deactivate(product)">Deactivate</button></div></td></tr></tbody></table><div v-if="!store.loading && !store.products.length && !store.error" class="p-6 text-center"><p>No products match these filters.</p><p class="text-sm text-gray-600 my-2">Add your first product or clear the search to see available records.</p><button v-if="canAdd" class="primary" @click="showForm = true">Add product</button><button v-else class="secondary" @click="search = ''; status = 'all'; load()">Clear filters</button></div><PaginationControls :pagination="store.pagination" :loading="store.loading" @change="load" /></div>
    <AppDialog :open="showForm" title="Add product" :dismissible="!saving" @close="showForm = false">
      <form @submit.prevent="saveProduct"><ErrorNotice :error="error" /><div class="grid sm:grid-cols-2 gap-3"><label v-for="[name,label,type,help] in inputs" :key="name">{{ label }}<input :aria-label="label" v-model="form[name]" :type="type" :required="name !== 'barcode'" :min="type === 'number' ? 0 : undefined" :step="name === 'sellingPrice' ? '0.01' : type === 'number' ? '1' : undefined" :aria-invalid="invalid(name)" :aria-describedby="`help-${name}`" class="field mt-1" /><span :id="`help-${name}`" class="block text-sm text-gray-600">{{ invalid(name) ? 'Please check this value.' : help }}</span></label></div><button type="button" class="secondary mt-4 mr-3" @click="cameraOpen = true">Scan barcode with camera</button><button class="primary mt-4" :disabled="saving">{{ saving ? 'Saving…' : 'Save product' }}</button></form>
    </AppDialog>
    <AppDialog :open="!!restock" title="Add stock" :dismissible="!saving" @close="restock = null"><form @submit.prevent="addStock"><p class="mb-3">Record a delivery of {{ restock?.name }}. New units are added to the latest stock count.</p><ErrorNotice :error="error" /><label class="block mb-3">Units received<input v-model.number="quantity" type="number" min="1" step="1" required class="field mt-1" /></label><label class="block">Delivery note or reason<input v-model="note" maxlength="500" required class="field mt-1" placeholder="Supplier and invoice, or a short reason" /></label><button class="primary mt-4" :disabled="saving">{{ saving ? 'Saving…' : 'Add stock' }}</button></form></AppDialog>
    <AppDialog :open="!!barcodeProduct" title="Edit product barcode" :dismissible="!saving" @close="barcodeProduct = null"><form @submit.prevent="saveBarcode"><ErrorNotice :error="error"/><p class="mb-3">{{barcodeProduct?.name}}</p><label class="block">Barcode<input v-model="barcodeValue" maxlength="100" class="field" autocomplete="off"/></label><p class="text-sm text-gray-600 my-2">Scan with a USB scanner, type the barcode, or use your camera. Leave blank to remove it.</p><button type="button" class="secondary mr-3" @click="cameraOpen = true">Scan with camera</button><button class="primary" :disabled="saving">Save barcode</button></form></AppDialog>
    <AppDialog :open="cameraOpen" title="Scan barcode" @close="cameraOpen = false"><BarcodeScanner v-if="cameraOpen" @close="cameraOpen = false" @detected="cameraScan"/></AppDialog>
  </MainLayout>
</template>
