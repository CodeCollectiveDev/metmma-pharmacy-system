<script setup>
import { ref, watch, onMounted, onBeforeUnmount } from 'vue'
import MainLayout from '@/layouts/MainLayout.vue'
import AppDialog from '@/components/AppDialog.vue'
import ErrorNotice from '@/components/ErrorNotice.vue'
import PaginationControls from '@/components/PaginationControls.vue'
import { dataService } from '@/services/api/dataService'
import { usePage } from '@/composables/usePage'
import { userError } from '@/services/api/errors'
import { currency, periodDates } from '@/services/api/money'
import { confirmAction } from '@/composables/useFeedback'
const page = usePage(dataService.getTransactions)
const role = localStorage.getItem('role'), canEdit = ['admin', 'store_manager'].includes(role)
const dates = ref(periodDates('today')), period = ref('today'), type = ref('all'), payment = ref('all'), search = ref(''), summary = ref(null), summaryError = ref(null), formOpen = ref(false), saving = ref(false), error = ref(null), fields = ref([]), notice = ref(''), audit = ref(null), auditRows = ref([]), auditError = ref(null)
const categories = ['Stock purchase','Rent','Utilities','Salaries','Transport','Other']
const payments = ['cash','card','mobile_money','bank_transfer']
const blank = () => ({ idempotencyKey: crypto.randomUUID(), date: periodDates('today').start, amount: '', category: 'Stock purchase', paymentMethod: 'cash', note: '', supplier: '' })
const form = ref(blank())
let timer, summaryGeneration = 0
function load(number = 1) { return page.load({ ...dates.value, type: type.value, paymentMethod: payment.value, search: search.value, page: number }) }
async function loadSummary() { const id = ++summaryGeneration; summary.value = null; summaryError.value = null; try { const res = await dataService.getFinanceSummary(dates.value); if (id === summaryGeneration) summary.value = res.data } catch (err) { if (id === summaryGeneration) summaryError.value = err } }
async function refresh() { await Promise.allSettled([load(), loadSummary()]) }
watch(period, () => { if (period.value !== 'custom') dates.value = periodDates(period.value) })
watch(dates, () => { clearTimeout(timer); timer = setTimeout(refresh, 100) }, { deep: true })
watch([type, payment, search], () => { clearTimeout(timer); timer = setTimeout(() => load(), 100) })
onMounted(refresh); onBeforeUnmount(() => { clearTimeout(timer); summaryGeneration++ })
function openForm(row = null) { form.value = row ? { id: row.id, version: row.version, date: row.date.slice(0,10), amount: row.amount.replace('-',''), category: row.category, paymentMethod: row.paymentMethod, note: row.note || '', supplier: row.supplier || '' } : blank(); error.value = null; fields.value = []; formOpen.value = true }
function invalid(name) { return fields.value.some(f => f.field === name) }
async function saveExpense() {
  if (saving.value) return
  saving.value = true; error.value = null; fields.value = []
  try { const { id, ...body } = form.value; if (id) await dataService.updateExpense(id, body); else await dataService.addExpense(body); formOpen.value = false; notice.value = 'Expense saved.'; await refresh() }
  catch (err) { error.value = err; fields.value = userError(err).fields }
  finally { saving.value = false }
}
async function remove(row) {
  if (!(await confirmAction('Delete this expense?', `${row.category}: ${currency(Math.abs(Number(row.amount)))} will be removed from totals. Its change history will be kept.`, 'Delete expense'))) return
  saving.value = true
  try { await dataService.deleteExpense(row.id, row.version); notice.value = 'Expense removed from totals. Change history is kept.'; await refresh() } catch (err) { page.error.value = err } finally { saving.value = false }
}
async function showAudit(row) { audit.value = row; auditRows.value = []; auditError.value = null; try { auditRows.value = (await dataService.getExpenseAudit(row.id)).data.data } catch (err) { auditError.value = err } }
</script>
<template>
  <MainLayout title="Finances" subtitle="Sales income, expenses and the amount left">
    <div class="panel mb-4 flex flex-wrap gap-3 items-end"><label>Period<select v-model="period" class="field mt-1"><option value="today">Today</option><option value="week">This week</option><option value="month">This month</option><option value="custom">Choose dates</option></select></label><label>From<input v-model="dates.start" type="date" class="field mt-1" @change="period = 'custom'" /></label><label>Through<input v-model="dates.end" type="date" class="field mt-1" @change="period = 'custom'" /></label><button class="secondary" @click="refresh" :disabled="page.loading.value">Refresh</button><button v-if="canEdit" class="primary" @click="openForm()">Record expense</button></div>
    <ErrorNotice :error="summaryError" :retry="loadSummary" />
    <div v-if="summary" class="grid sm:grid-cols-3 gap-3 mb-4"><div class="panel">Income (after refunds)<strong class="block text-2xl">{{ currency(summary.income) }}</strong></div><div class="panel">Expenses<strong class="block text-2xl">{{ currency(summary.expenses) }}</strong></div><div class="panel">Net<strong class="block text-2xl">{{ currency(summary.net) }}</strong><p class="text-sm text-gray-600">Income minus expenses</p></div></div>
    <p class="text-sm text-gray-600 mb-4">Sales record income automatically. Refunds reduce income. Expense changes keep a history. Dates use the pharmacy server's configured time zone.</p>
    <p v-if="notice" role="status" class="text-green-800 mb-3">{{ notice }}</p><ErrorNotice :error="page.error.value" :retry="load" />
    <div class="panel mb-4 grid sm:grid-cols-3 gap-3"><label>Record type<select v-model="type" class="field mt-1"><option value="all">All money records</option><option value="income">Income and refunds</option><option value="expense">Expenses</option></select></label><label>Payment method<select v-model="payment" class="field mt-1"><option value="all">All methods</option><option v-for="method in payments" :key="method" :value="method">{{ method.replaceAll('_',' ') }}</option></select></label><label>Find a record<input v-model="search" class="field mt-1" placeholder="Receipt, category, supplier or note" /></label></div>
    <p v-if="page.loading.value" role="status">Loading money records…</p>
    <div class="panel p-0 overflow-x-auto"><table class="w-full min-w-[800px]"><thead class="bg-gray-50"><tr><th class="p-3 text-left">Date</th><th class="p-3 text-left">Record</th><th class="p-3 text-left">Method</th><th class="p-3 text-left">Amount</th><th class="p-3 text-left">Actions</th></tr></thead><tbody><tr v-for="row in page.rows.value" :key="row.id" class="border-t"><td class="p-3">{{ new Date(row.date).toLocaleString() }}<p class="text-sm text-gray-600">{{ row.username || 'Previous staff member' }}</p></td><td class="p-3"><p class="font-medium">{{ row.type === 'refund' ? 'Refund / reversal' : row.type === 'income' ? 'Sale income' : row.category }}</p><router-link v-if="row.saleId" :to="{path:'/sales',query:{receipt:row.receiptNumber}}" class="text-blue-800 underline">{{ row.receiptNumber }}</router-link><p class="text-sm">{{ row.note }}</p><p class="text-sm text-gray-600">{{ row.supplier }}</p></td><td class="p-3">{{ row.paymentMethod.replaceAll('_',' ') }}</td><td class="p-3 font-medium">{{ currency(row.amount) }}</td><td class="p-3"><div v-if="row.type === 'expense'" class="flex flex-wrap gap-2"><button v-if="canEdit" class="secondary" :disabled="saving" @click="openForm(row)">Edit</button><button v-if="canEdit" class="secondary text-red-800" :disabled="saving" @click="remove(row)">Delete</button><button class="secondary" @click="showAudit(row)">View changes</button></div><span v-else class="text-sm text-gray-600">Saved with sale</span></td></tr></tbody></table><div v-if="!page.loading.value && !page.error.value && !page.rows.value.length" class="p-6 text-center"><p>No money records match these filters.</p><p class="text-sm text-gray-600 my-2">Sales add income here. Record an expense when the pharmacy spends money.</p><button v-if="canEdit" class="primary" @click="openForm()">Record expense</button><button v-else class="secondary" @click="search = ''; type = 'all'; payment = 'all'; load()">Clear filters</button></div><PaginationControls :pagination="page.pagination.value" :loading="page.loading.value" @change="load" /></div>
    <AppDialog :open="formOpen" :title="form.id ? 'Edit expense' : 'Record expense'" :dismissible="!saving" @close="formOpen = false"><form @submit.prevent="saveExpense"><ErrorNotice :error="error" /><div class="grid sm:grid-cols-2 gap-3"><label>Date<input v-model="form.date" required type="date" :aria-invalid="invalid('date')" class="field mt-1" /></label><label>Amount spent (MWK)<input v-model="form.amount" required type="number" min="0.01" step="0.01" :aria-invalid="invalid('amount')" class="field mt-1" /><span v-if="invalid('amount')" class="text-sm text-red-800">Enter a positive amount with up to two decimal places.</span></label><label>Category<select v-model="form.category" class="field mt-1"><option v-for="category in categories" :key="category">{{ category }}</option></select></label><label>Payment method<select v-model="form.paymentMethod" class="field mt-1"><option v-for="method in payments" :key="method" :value="method">{{ method.replaceAll('_',' ') }}</option></select></label><label>Supplier (optional)<input v-model="form.supplier" maxlength="200" class="field mt-1" /></label><label>Note (optional)<input v-model="form.note" maxlength="500" class="field mt-1" /></label></div><p class="text-sm text-gray-600 mt-3">Enter the amount paid once. If this was a stock delivery, add its units in Inventory too.</p><button class="primary mt-4" :disabled="saving">{{ saving ? 'Saving…' : 'Save expense' }}</button></form></AppDialog>
    <AppDialog :open="!!audit" title="Expense change history" @close="audit = null"><ErrorNotice :error="auditError" /><ul><li v-for="entry in auditRows" :key="entry.id" class="border-t py-3"><p>{{ entry.action }} by {{ entry.username }} · {{ new Date(entry.date).toLocaleString() }}</p><p v-if="entry.before">Before: {{ entry.before.category }}, {{ currency(Math.abs(Number(entry.before.amount))) }}, {{ entry.before.note }}</p><p v-if="entry.after">After: {{ entry.after.category }}, {{ currency(Math.abs(Number(entry.after.amount))) }}, {{ entry.after.note }}</p></li></ul></AppDialog>
  </MainLayout>
</template>
