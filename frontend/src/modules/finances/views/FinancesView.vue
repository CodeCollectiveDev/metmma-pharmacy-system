<script setup>
import { receiptLabel } from '@/services/api/display'
import SectionNav from '@/components/SectionNav.vue'
import { ref, computed, watch, onMounted, onBeforeUnmount } from 'vue'
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
const showDeleted = ref(false), auditPagination = ref(null)
const dates = ref(periodDates('today')), period = ref('today'), type = ref('all'), payment = ref('all'), search = ref(''), summary = ref(null), summaryError = ref(null), formOpen = ref(false), saving = ref(false), error = ref(null), fields = ref([]), notice = ref(''), audit = ref(null), auditRows = ref([]), auditError = ref(null)
const categories = ['Stock purchase','Rent','Utilities','Salaries','Transport','Other']
const payments = ['cash','card','mobile_money','bank_transfer']
const blank = () => ({ idempotencyKey: crypto.randomUUID(), date: periodDates('today').start, amount: '', category: 'Stock purchase', paymentMethod: 'cash', note: '', supplier: '' })
const form = ref(blank())
const validDates = computed(() => !!dates.value.start && !!dates.value.end && dates.value.end >= dates.value.start)
let timer, summaryTimer, summaryGeneration = 0
function load(number = 1) { if (!validDates.value) { page.reset(); return }; return page.load({ ...dates.value, type: type.value, paymentMethod: payment.value, search: search.value, includeDeleted: showDeleted.value, page: number }) }
async function loadSummary() { const id = ++summaryGeneration; summary.value = null; summaryError.value = null; if (!validDates.value) return; try { const res = await dataService.getFinanceSummary(dates.value); if (id === summaryGeneration) summary.value = res.data } catch (err) { if (id === summaryGeneration) summaryError.value = err } }
async function refresh() { await Promise.allSettled([load(), loadSummary()]) }
watch(period, () => { if (period.value !== 'custom') dates.value = periodDates(period.value) })
watch(dates, () => { clearTimeout(summaryTimer); summaryTimer = setTimeout(refresh, 100) }, { deep: true })
watch([type, payment, search, showDeleted], () => { clearTimeout(timer); timer = setTimeout(() => load(), 100) })
onMounted(refresh); onBeforeUnmount(() => { clearTimeout(timer); clearTimeout(summaryTimer); summaryGeneration++ })
function openForm(row = null) { form.value = row ? { id: row.id, version: row.version, date: row.businessDate || row.date.slice(0,10), amount: row.amount.replace('-',''), category: row.category, paymentMethod: row.paymentMethod, note: row.note || '', supplier: row.supplier || '' } : blank(); error.value = null; fields.value = []; formOpen.value = true }
function invalid(name) { return fields.value.some(f => f.field === name) }
function auditDetails(row) {
  return [new Date(row.transaction_date).toLocaleDateString(), row.category, currency(Math.abs(Number(row.amount))), row.payment_method.replaceAll('_', ' '), row.supplier, row.note].filter(Boolean).join(' · ')
}
async function saveExpense() {
  if (saving.value) return
  saving.value = true; error.value = null; fields.value = []
  try { const { id, ...body } = form.value; if (id) await dataService.updateExpense(id, body); else await dataService.addExpense(body); formOpen.value = false; type.value = 'expense'; search.value = ''; payment.value = 'all'; notice.value = 'Expense saved.'; if (form.value.date < dates.value.start || form.value.date > dates.value.end) { period.value = 'custom'; dates.value = {start:form.value.date,end:form.value.date}; notice.value += ' Showing records for its date.' }; await refresh() }
  catch (err) { error.value = err; fields.value = userError(err).fields }
  finally { saving.value = false }
}
async function remove(row) {
  if (!(await confirmAction('Delete this expense?', `${row.category}: ${currency(Math.abs(Number(row.amount)))} will be removed from totals. Its change history will be kept.`, 'Delete expense'))) return
  saving.value = true
  try { await dataService.deleteExpense(row.id, row.version); notice.value = 'Expense removed from totals. Change history is kept.'; await refresh() } catch (err) { page.error.value = err } finally { saving.value = false }
}
async function showAudit(row) { audit.value = row; auditRows.value = []; auditPagination.value = null; await loadAudit() }
async function loadAudit(page = 1) { auditError.value = null; try { const res = await dataService.getExpenseAudit(audit.value.id, {page,limit:25}); auditRows.value = res.data.data; auditPagination.value = res.data.pagination } catch (err) { auditError.value = err } }
</script>
<template>
  <MainLayout title="Income & expenses" subtitle="See money received, track spending and understand the balance">
    <SectionNav section="business" />
    <div class="panel mb-4 flex flex-wrap gap-3 items-end"><label>Period<select v-model="period" class="field mt-1"><option value="today">Today</option><option value="week">This week</option><option value="month">This month</option><option value="custom">Choose dates</option></select></label><label>From<input v-model="dates.start" type="date" class="field mt-1" @change="period = 'custom'" /></label><label>Through<input v-model="dates.end" :min="dates.start" type="date" class="field mt-1" @change="period = 'custom'" /></label><button class="secondary" @click="refresh" :disabled="page.loading.value">Refresh</button><button v-if="canEdit" class="primary" @click="openForm()">Record expense</button></div>
    <ErrorNotice :error="summaryError" :retry="loadSummary" />
    <p v-if="!validDates" role="alert" class="field-error mb-4">Choose a start date and an end date on or after it.</p>
    <div v-if="summary" class="grid sm:grid-cols-2 xl:grid-cols-4 gap-4 mb-5">
      <div class="panel"><span class="metric-label">Sales received</span><strong class="metric-value">{{ currency(summary.grossIncome) }}</strong><p class="text-xs text-slate-500 mt-2">Before refunds</p></div>
      <div class="panel"><span class="metric-label">Money refunded</span><strong class="metric-value">{{ currency(summary.refunds) }}</strong><p class="text-xs text-slate-500 mt-2">Reversed sales in this period</p></div>
      <div class="panel"><span class="metric-label">Expenses paid</span><strong class="metric-value">{{ currency(summary.expenses) }}</strong><p class="text-xs text-slate-500 mt-2">Recorded spending; deleted entries excluded</p></div>
      <div class="panel border-blue-200 bg-blue-50"><span class="metric-label">Net recorded movement</span><strong class="metric-value" :class="{'text-red-800': Number(summary.net) < 0}">{{ currency(summary.net) }}</strong><p class="text-xs text-slate-600 mt-2">Sales − refunds − expenses</p></div>
    </div>
    <div class="panel mb-5"><div class="flex flex-wrap justify-between items-start gap-4"><div class="max-w-2xl"><h2 class="font-semibold">A clear view of recorded money</h2><p class="text-sm text-slate-600 mt-1">Sales and refunds are recorded automatically. Add expenses when money is spent. The balance above is movement during this period, not bank balance or profit; opening balances and unrecorded costs are not included.</p></div><router-link v-if="canEdit" to="/inventory" class="secondary">Record a stock delivery</router-link></div>
      <div v-if="summary?.categories?.length" class="mt-5 pt-4 border-t"><h3 class="text-sm font-semibold mb-3">Where the money went</h3><div class="grid sm:grid-cols-2 xl:grid-cols-3 gap-3"><div v-for="group in summary.categories" :key="group.category" class="flex justify-between gap-3 rounded-lg bg-slate-50 p-3"><span>{{group.category}}<small class="block text-slate-500">{{group.count}} expense entries</small></span><strong class="tabular-nums">{{currency(group.total)}}</strong></div></div></div>
    </div>
    <p v-if="notice" role="status" class="success-notice mb-3">{{ notice }}</p><ErrorNotice :error="page.error.value" :retry="load" />
    <div class="mb-3"><h2 class="font-bold text-lg">Transaction details</h2><p class="text-sm text-slate-500">Filters below affect this list. Summary totals above cover all transactions in the selected dates.</p></div>
    <div class="panel mb-4 grid sm:grid-cols-3 gap-3"><label>Record type<select v-model="type" class="field mt-1"><option value="all">All money records</option><option value="income">Income and refunds</option><option value="expense">Expenses</option></select></label><label>Payment method<select v-model="payment" class="field mt-1"><option value="all">All methods</option><option v-for="method in payments" :key="method" :value="method">{{ method.replaceAll('_',' ') }}</option></select></label><label>Find a record<input v-model="search" maxlength="100" class="field mt-1" placeholder="Receipt, category, supplier or note" /></label></div>
    <label class="flex gap-2 items-center mb-3"><input v-model="showDeleted" type="checkbox" /> Include deleted expenses for review (excluded from totals)</label>
    <p v-if="page.loading.value" role="status">Loading money records…</p>
    <div class="panel p-0 overflow-x-auto"><table class="w-full min-w-[800px]"><thead class="bg-gray-50"><tr><th class="p-3 text-left">Date</th><th class="p-3 text-left">Record</th><th class="p-3 text-left">Method</th><th class="p-3 text-left">Amount</th><th class="p-3 text-left">Actions</th></tr></thead><tbody><tr v-for="row in page.rows.value" :key="row.id" class="border-t"><td class="p-3">{{ row.type === 'expense' ? row.businessDate || row.date.slice(0,10) : new Date(row.date).toLocaleString() }}<p class="text-sm text-gray-600">{{ row.username || 'Previous staff member' }}</p></td><td class="p-3"><p class="font-medium">{{ row.type === 'refund' ? 'Refund / reversal' : row.type === 'income' ? 'Sale income' : row.category }}</p><router-link v-if="row.saleId" :to="{path:'/sales',query:{receipt:receiptLabel(row)}}" class="text-blue-800 underline">{{ receiptLabel(row) }}</router-link><p v-if="row.deletedAt" class="text-sm text-red-800">Deleted — excluded from totals</p><p class="text-sm">{{ row.note }}</p><p class="text-sm text-gray-600">{{ row.supplier }}</p></td><td class="p-3">{{ row.paymentMethod.replaceAll('_',' ') }}</td><td class="p-3 font-semibold tabular-nums" :class="row.type === 'income' ? 'text-emerald-800' : 'text-slate-800'">{{ row.type === 'income' ? '+' : '−' }}{{ currency(Math.abs(Number(row.amount))) }}<span class="block text-xs font-normal text-slate-500">{{ row.type === 'income' ? 'Money in' : 'Money out' }}</span></td><td class="p-3"><div v-if="row.type === 'expense'" class="flex flex-wrap gap-2"><button v-if="canEdit && !row.deletedAt" class="secondary" :disabled="saving" @click="openForm(row)">Edit</button><button v-if="canEdit && !row.deletedAt" class="secondary text-red-800" :disabled="saving" @click="remove(row)">Delete</button><button class="secondary" @click="showAudit(row)">View changes</button></div><span v-else class="text-sm text-gray-600">Saved with sale</span></td></tr></tbody></table><div v-if="!page.loading.value && !page.error.value && !page.rows.value.length" class="p-6 text-center"><p>No money records match these filters.</p><p class="text-sm text-gray-600 my-2">Sales add income here. Record an expense when the pharmacy spends money.</p><button v-if="canEdit" class="primary" @click="openForm()">Record expense</button><button v-else class="secondary" @click="search = ''; type = 'all'; payment = 'all'; load()">Clear filters</button></div><PaginationControls :pagination="page.pagination.value" :loading="page.loading.value" @change="load" /></div>
    <AppDialog :open="formOpen" :title="form.id ? 'Edit expense' : 'Record expense'" :dismissible="!saving" @close="formOpen = false"><form v-form-feedback="error" @submit.prevent="saveExpense"><p class="form-note">Fields marked * are required.</p><ErrorNotice :error="error" /><div class="grid sm:grid-cols-2 gap-3"><label>Date<input name="date" v-model="form.date" required type="date" :aria-invalid="invalid('date')" class="field mt-1" /></label><label>Amount spent (MWK)<input name="amount" aria-label="Amount spent (MWK)" v-model="form.amount" required type="number" min="0.01" max="9999999999.99" step="0.01" :aria-invalid="invalid('amount')" class="field mt-1" /><span v-if="invalid('amount')" class="text-sm text-red-800">Enter a positive amount with up to two decimal places.</span></label><label>Category<select name="category" v-model="form.category" required class="field mt-1"><option v-for="category in categories" :key="category">{{ category }}</option></select></label><label>Payment method<select name="paymentMethod" v-model="form.paymentMethod" required class="field mt-1"><option v-for="method in payments" :key="method" :value="method">{{ method.replaceAll('_',' ') }}</option></select></label><label>Supplier (optional)<input name="supplier" v-model="form.supplier" maxlength="200" class="field mt-1" /></label><label>Note (optional)<input name="note" v-model="form.note" maxlength="500" class="field mt-1" /></label></div><p class="text-sm text-gray-600 mt-3">Enter the amount paid once. If this was a stock delivery, add its units in Inventory too.</p><div class="form-actions"><button type="button" class="secondary" :disabled="saving" @click="formOpen = false">Cancel</button><button class="primary" :disabled="saving">{{ saving ? 'Saving…' : 'Save expense' }}</button></div></form></AppDialog>
    <AppDialog :open="!!audit" title="Expense change history" @close="audit = null"><ErrorNotice :error="auditError" /><ul><li v-for="entry in auditRows" :key="entry.id" class="border-t py-3"><p>{{ entry.action }} by {{ entry.username }} · {{ new Date(entry.date).toLocaleString() }}</p><p v-if="entry.before">Before: {{ auditDetails(entry.before) }}</p><p v-if="entry.after">After: {{ auditDetails(entry.after) }}</p></li></ul><PaginationControls :pagination="auditPagination" @change="loadAudit" /></AppDialog>
  </MainLayout>
</template>
