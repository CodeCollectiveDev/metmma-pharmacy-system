<script setup>
import CameraButton from '@/components/CameraButton.vue'
import { periodDates } from '@/services/api/money'
import { ref, computed, watch, onMounted, onBeforeUnmount } from 'vue'
import { useRoute } from 'vue-router'
import MainLayout from '@/layouts/MainLayout.vue'
import BarcodeScanner from '@/components/BarcodeScanner.vue'
import AppDialog from '@/components/AppDialog.vue'
import ErrorNotice from '@/components/ErrorNotice.vue'
import PaginationControls from '@/components/PaginationControls.vue'
import { useInventoryStore } from '../store/inventoryStore'
import { useCategoryStore } from '@/modules/shared/store/categoryStore'
import CategorySelect from '@/modules/shared/components/CategorySelect.vue'
import { dataService } from '@/services/api/dataService'
import { currency } from '@/services/api/money'
import { userError } from '@/services/api/errors'
import { confirmAction } from '@/composables/useFeedback'
const store = useInventoryStore(), categoryStore = useCategoryStore(), route = useRoute()
const role = localStorage.getItem('role'), canAdd = ['admin', 'pharmacist'].includes(role), canEdit = ['admin', 'pharmacist', 'store_manager'].includes(role)
const search = ref(''), status = ref('all'), showForm = ref(false), saving = ref(false), error = ref(null), fields = ref([]), notice = ref(''), restock = ref(null), quantity = ref(1), note = ref('')
const blank = () => ({ name: '', batchNumber: '', expiryDate: '', quantity: 0, sellingPrice: '', supplier: '', category: '', reorderLevel: 10, barcode: '' })
const form = ref(blank())
const today = periodDates('today').start
const categoriesReady = computed(() => categoryStore.categories.length > 0)
const editProduct = ref(null), editSaving = ref(false), editError = ref(null)
const blankEdit = () => ({ name: '', genericName: '', category: '', batchNumber: '', expiryDate: '', sellingPrice: '', costPrice: '', supplier: '', reorderLevel: 10, location: '', barcode: '' })
const editForm = ref(blankEdit())
watch(() => categoryStore.categories, list => {
  if (!form.value.category && list.length) form.value.category = list[0].name
}, { immediate: true })
const inputs = [
  {name:'name',label:'Product name',type:'text',required:true,minlength:2,maxlength:200,help:'Include strength and pack size, e.g. Paracetamol 500 mg, 10 tablets.'},
  {name:'sellingPrice',label:'Selling price (MWK)',type:'number',required:true,min:0,max:9999999999.99,step:'0.01',help:'Price for one selling unit.'},
  {name:'batchNumber',label:'Batch / lot number',type:'text',required:true,minlength:2,maxlength:100,help:'Printed next to LOT or BATCH. This identifies the production lot, not the barcode.'},
  {name:'expiryDate',label:'Expiry date',type:'date',required:true,min:today,help:'Use the date on this batch. Add different batches as separate stock records.'},
  {name:'quantity',label:'Units in stock',type:'number',min:0,max:2147483647,step:1,help:'Count the same selling units used for the price. Starts at 0.'},
  {name:'reorderLevel',label:'Low stock alert at',type:'number',min:0,max:2147483647,step:1,help:'We flag the product when stock reaches this level. Defaults to 10.'}
]
const restockKey = ref('')
const cameraOpen = ref(false), barcodeProduct = ref(null), barcodeValue = ref('')
function normalizeExpiryDate(value) {
  if (!value || typeof value !== 'string') return value
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) return value
  const match = /^([0-9]{1,2})[/-]([0-9]{1,2})[/-]([0-9]{4})$/.exec(value.trim())
  if (!match) return value
  const [, day, month, year] = match
  const normalized = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`
  const check = new Date(`${normalized}T00:00:00Z`)
  return Number.isFinite(check.getTime()) && check.toISOString().slice(0, 10) === normalized ? normalized : value
}
function normalizeProductPayload(raw = {}) {
  const payload = { ...raw }
  delete payload.productCode
  return {
    ...payload,
    expiryDate: normalizeExpiryDate(raw.expiryDate),
    name: String(raw.name ?? '').trim(),
    batchNumber: String(raw.batchNumber ?? '').trim(),
    supplier: String(raw.supplier ?? '').trim(),
    category: String(raw.category ?? '').trim(),
    barcode: String(raw.barcode ?? '').trim(),
    sellingPrice: raw.sellingPrice,
    unitPrice: raw.sellingPrice,
    quantity: Number(raw.quantity === '' ? 0 : raw.quantity ?? 0),
    reorderLevel: Number(raw.reorderLevel === '' ? 10 : raw.reorderLevel ?? 10)
  }
}
function cameraScan(code) { cameraOpen.value = false; if (barcodeProduct.value) barcodeValue.value = code; else if (showForm.value) form.value.barcode = code; else search.value = code }
async function saveBarcode() { if (saving.value) return; saving.value = true; error.value = null; try { await dataService.updateProduct({id:barcodeProduct.value.id,barcode:barcodeValue.value}); barcodeProduct.value = null; notice.value = 'Barcode saved.'; await refresh() } catch (err) { error.value = err } finally { saving.value = false } }
let timer
function load(page = 1) { return store.fetchProducts({ page, search: search.value, status: status.value, id: route.query.product }) }
async function refresh() { await Promise.allSettled([load(), store.refreshSummary()]) }
watch([search, status, () => route.query.product], () => { clearTimeout(timer); timer = setTimeout(() => load(), 100) })
onMounted(() => { refresh(); categoryStore.fetchCategories() }); onBeforeUnmount(() => clearTimeout(timer))
function invalid(name) { return fields.value.some(f => f.field === name) }
function openAdd() {
  error.value = null; fields.value = []
  if (!form.value.category) form.value.category = categoryStore.categories[0]?.name || ''
  showForm.value = true
  categoryStore.fetchCategories()
}
function openEdit(product) {
  editProduct.value = product; editError.value = null
  editForm.value = {
    name: product.name || '', genericName: product.genericName || '', category: product.category || '',
    batchNumber: product.batchNumber || '', expiryDate: String(product.expiryDate || '').slice(0, 10),
    sellingPrice: product.sellingPrice ?? '', costPrice: product.costPrice ?? '', supplier: product.supplier || '',
    reorderLevel: product.reorderLevel ?? 10, location: product.location || '', barcode: product.barcode || ''
  }
  categoryStore.fetchCategories()
}
async function saveEdit() {
  if (editSaving.value) return
  editSaving.value = true; editError.value = null
  try {
    const form = editForm.value, price = form.sellingPrice, costPrice = String(form.costPrice ?? '').trim()
    await dataService.updateProduct({
      id: editProduct.value.id, name: String(form.name ?? '').trim(), genericName: String(form.genericName ?? '').trim(),
      category: String(form.category ?? '').trim(), batchNumber: String(form.batchNumber ?? '').trim(),
      expiryDate: normalizeExpiryDate(form.expiryDate), sellingPrice: price, unitPrice: price,
      costPrice: costPrice === '' ? null : costPrice, supplier: String(form.supplier ?? '').trim(),
      reorderLevel: Number(form.reorderLevel), location: String(form.location ?? '').trim(),
      barcode: String(form.barcode ?? '').trim()
    })
    editProduct.value = null; notice.value = 'Product updated.'; await refresh(); window.dispatchEvent(new Event('stock-changed'))
  } catch (err) {
    const failure = userError(err)
    editError.value = failure.code === 'CONFLICT'
      ? { ...failure, message: 'This product changed since you opened it. Reopen it and try again.' }
      : err
  } finally { editSaving.value = false }
}
function openRestock(product) {
  restock.value = product; restockKey.value = crypto.randomUUID(); quantity.value = 1; note.value = ''; error.value = null
}
async function saveProduct() {
  if (saving.value) return
  saving.value = true; error.value = null; fields.value = []
  try {
    const payload = normalizeProductPayload(form.value)
    await dataService.addProduct(payload)
    showForm.value = false; form.value = blank(); notice.value = 'Product saved.'; await refresh(); window.dispatchEvent(new Event('stock-changed'))
  }
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
    <ErrorNotice :error="store.error || (!showForm && !restock ? error : null)" :retry="refresh" /><p v-if="notice" role="status" class="success-notice mb-4">{{ notice }}</p>
    <div v-if="store.summary" class="grid grid-cols-3 gap-3 mb-4"><div class="panel">Products <strong class="block text-2xl">{{ store.summary.total }}</strong></div><div class="panel">Low stock <strong class="block text-2xl">{{ store.summary.low }}</strong></div><div class="panel">Expired <strong class="block text-2xl">{{ store.summary.expired }}</strong></div></div>
    <div class="panel mb-4 flex flex-wrap items-end gap-3"><label class="flex-1">Find a product<input v-model="search" maxlength="100" class="field mt-1" placeholder="Name, code or barcode" /></label><CameraButton @click="cameraOpen = true"/><label>Show<select v-model="status" class="field mt-1"><option value="all">All products</option><option value="low">Low stock</option><option value="expired">Expired</option><option value="expiring">Expiry within 90 days</option></select></label><button v-if="canAdd" class="primary" @click="openAdd">Add product</button><router-link v-if="route.query.product" to="/inventory" class="secondary">Show all products</router-link></div>
    <p v-if="store.loading" role="status" class="mb-3">Loading stock…</p>
    <div class="panel overflow-x-auto p-0"><table class="w-full min-w-[760px]"><thead class="bg-gray-50"><tr><th class="p-3 text-left">Product</th><th class="p-3 text-left">Batch / expiry</th><th class="p-3 text-left">Stock</th><th class="p-3 text-left">Price</th><th class="p-3 text-left">Actions</th></tr></thead><tbody><tr v-for="product in store.products" :key="product.id" class="border-t border-gray-200"><td class="p-3"><strong>{{ product.name }}</strong><p class="text-sm text-gray-600">{{ product.productCode }} · {{ product.supplier }}</p></td><td class="p-3">{{ product.batchNumber }}<p class="text-sm">{{ product.expiryDate?.slice(0,10) }}</p></td><td class="p-3">{{ product.quantity }}<p class="text-sm text-gray-600">Low at {{ product.reorderLevel }}</p><p class="text-sm text-red-800" v-if="product.expired">Expired — do not sell</p></td><td class="p-3">{{ currency(product.sellingPrice) }}</td><td class="p-3"><div class="flex gap-2"><button v-if="canEdit" class="secondary" :disabled="saving" @click="openEdit(product)">Edit</button><button v-if="canEdit" class="secondary" :disabled="saving" @click="barcodeProduct = product; barcodeValue = product.barcode || ''; error = null">Barcode number</button><button v-if="canEdit && !product.expired" class="secondary" :disabled="saving" title="Record units received in a delivery" @click="openRestock(product)">Add stock</button><button v-if="role === 'admin'" class="secondary text-red-800" :disabled="saving" @click="deactivate(product)">Deactivate</button></div></td></tr></tbody></table><div v-if="!store.loading && !store.products.length && !store.error" class="p-6 text-center"><p>No products match these filters.</p><p class="text-sm text-gray-600 my-2">Add your first product or clear the search to see available records.</p><button v-if="canAdd" class="primary" @click="openAdd">Add product</button><button v-else class="secondary" @click="search = ''; status = 'all'; load()">Clear filters</button></div><PaginationControls :pagination="store.pagination" :loading="store.loading" @change="load" /></div>
    <AppDialog :open="showForm" title="Add product" :dismissible="!saving" @close="showForm = false">
      <form v-form-feedback="error" @submit.prevent="saveProduct">
        <p class="form-note">Fields marked * are required. One record represents one batch of a product.</p>
        <ErrorNotice :error="error" />
        <div class="grid sm:grid-cols-2 gap-4">
          <label v-for="input in inputs" :key="input.name" class="text-sm font-medium">{{ input.label }}
            <input v-model="form[input.name]" :name="input.name" :aria-label="input.label" :type="input.type" :required="input.required" :minlength="input.minlength" :maxlength="input.maxlength" :min="input.min" :max="input.max" :step="input.step" :aria-describedby="`help-${input.name}`" class="field mt-1" />
            <span :id="`help-${input.name}`" class="block text-xs font-normal text-slate-500 mt-1">{{ input.help }}</span>
          </label>
          <label class="text-sm font-medium">Category
            <CategorySelect v-model="form.category" name="category" required :disabled="saving" />
          </label>
        </div>
        <div class="my-5 p-4 bg-slate-50 rounded-lg">
          <label class="block text-sm font-medium">Barcode number (optional)<div class="flex gap-2 mt-1"><input v-model="form.barcode" name="barcode" maxlength="100" class="field" placeholder="Type the printed number or use a scanner" autocomplete="off" @keydown.enter.prevent/><CameraButton @click="cameraOpen = true"/></div></label>
          <p class="text-xs text-slate-500 mt-2">The number below the barcode helps you find this product at checkout. A USB scanner or the camera fills it in; no image is stored.</p>
        </div>
        <details class="border-t pt-3"><summary class="font-medium cursor-pointer">Additional details (optional)</summary><div class="grid sm:grid-cols-2 gap-4 mt-3">
          <label>Supplier<input v-model.trim="form.supplier" name="supplier" minlength="2" maxlength="200" class="field mt-1" /></label>
        </div></details>
        <div class="form-actions"><button type="button" class="secondary" :disabled="saving" @click="showForm = false">Cancel</button><button class="primary" :disabled="saving || !categoriesReady">{{ saving ? 'Saving…' : 'Save product' }}</button></div>
      </form>
    </AppDialog>
    <AppDialog :open="!!editProduct" title="Edit product" :dismissible="!editSaving" @close="editProduct = null">
      <form v-form-feedback="editError" @submit.prevent="saveEdit">
        <p class="form-note">Correct spelling or details here. Use Add stock to change the quantity.</p>
        <ErrorNotice :error="editError" />
        <div class="grid sm:grid-cols-2 gap-4">
          <label class="text-sm font-medium">Product name<input v-model.trim="editForm.name" name="name" required minlength="2" maxlength="200" class="field mt-1" /></label>
          <label class="text-sm font-medium">Generic name (optional)<input v-model.trim="editForm.genericName" name="genericName" maxlength="200" class="field mt-1" /></label>
          <label class="text-sm font-medium">Category<CategorySelect v-model="editForm.category" name="category" required :disabled="editSaving" /></label>
          <label class="text-sm font-medium">Batch / lot number<input v-model.trim="editForm.batchNumber" name="batchNumber" required minlength="2" maxlength="100" class="field mt-1" /></label>
          <label class="text-sm font-medium">Expiry date<input v-model="editForm.expiryDate" name="expiryDate" type="date" required :min="today" class="field mt-1" /></label>
          <label class="text-sm font-medium">Selling price (MWK)<input v-model="editForm.sellingPrice" name="sellingPrice" type="number" required min="0" max="9999999999.99" step="0.01" class="field mt-1" /></label>
          <label class="text-sm font-medium">Cost price (optional)<input v-model="editForm.costPrice" name="costPrice" type="number" min="0" max="9999999999.99" step="0.01" class="field mt-1" /></label>
          <label class="text-sm font-medium">Supplier (optional)<input v-model.trim="editForm.supplier" name="supplier" minlength="2" maxlength="200" class="field mt-1" /></label>
          <label class="text-sm font-medium">Low stock alert at<input v-model="editForm.reorderLevel" name="reorderLevel" type="number" required min="0" max="2147483647" step="1" class="field mt-1" /></label>
          <label class="text-sm font-medium">Location (optional)<input v-model.trim="editForm.location" name="location" maxlength="100" class="field mt-1" /></label>
          <label class="text-sm font-medium">Barcode number (optional)<input v-model.trim="editForm.barcode" name="barcode" maxlength="100" autocomplete="off" class="field mt-1" /></label>
        </div>
        <div class="form-actions"><button type="button" class="secondary" :disabled="editSaving" @click="editProduct = null">Cancel</button><button class="primary" :disabled="editSaving || !categoriesReady">{{ editSaving ? 'Saving…' : 'Save changes' }}</button></div>
      </form>
    </AppDialog>
    <AppDialog :open="!!restock" title="Add stock" :dismissible="!saving" @close="restock = null"><form v-form-feedback="error" @submit.prevent="addStock"><p class="mb-3">Record a delivery of {{ restock?.name }}. Only add units from the same batch and expiry date. For a new batch, use Add product.</p><ErrorNotice :error="error" /><label class="block mb-3">Units received<input name="quantity" v-model.number="quantity" type="number" min="1" max="2147483647" step="1" required class="field mt-1" /></label><label class="block">Delivery note or reason<input name="reason" v-model="note" minlength="3" maxlength="500" required class="field mt-1" placeholder="Supplier and invoice, or a short reason" /></label><button class="primary mt-4" :disabled="saving">{{ saving ? 'Saving…' : 'Add stock' }}</button></form></AppDialog>
    <AppDialog :open="!!barcodeProduct" title="Edit barcode number" :dismissible="!saving" @close="barcodeProduct = null"><form v-form-feedback="error" @submit.prevent="saveBarcode"><ErrorNotice :error="error"/><p class="mb-3">{{barcodeProduct?.name}}</p><label class="block">Barcode number (optional)<input name="barcode" v-model="barcodeValue" maxlength="100" class="field" autocomplete="off"/></label><p class="text-sm text-gray-600 my-2">Scan with a USB scanner, type the barcode, or use your camera. Leave blank to remove it.</p><CameraButton class="mr-3" @click="cameraOpen = true"/><button class="primary" :disabled="saving">Save barcode</button></form></AppDialog>
    <AppDialog :open="cameraOpen" title="Scan barcode" @close="cameraOpen = false"><BarcodeScanner v-if="cameraOpen" @close="cameraOpen = false" @detected="cameraScan"/></AppDialog>
  </MainLayout>
</template>
