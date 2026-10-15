<script setup>
import { ref, computed, watch, onMounted, onBeforeUnmount } from 'vue'
import { Download, TrendingUp, Package, Users } from 'lucide-vue-next'
import MainLayout from '@/layouts/MainLayout.vue'
import SectionNav from '@/components/SectionNav.vue'
import ErrorNotice from '@/components/ErrorNotice.vue'
import PaginationControls from '@/components/PaginationControls.vue'
import { dataService } from '@/services/api/dataService'
import { usePage } from '@/composables/usePage'
import { currency, periodDates } from '@/services/api/money'
import { receiptLabel, dateLabel, paymentLabel } from '@/services/api/display'
const role = localStorage.getItem('role'), tab = ref('sales'), period = ref('month'), dates = ref(periodDates('month'))
const overview = ref(null), error = ref(null), loading = ref(false), notice = ref('')
const stockFilter = ref('all')
const page = usePage(params => tab.value === 'sales' ? dataService.getSalesHistory({ ...params, ...dates.value }) : tab.value === 'stock' ? dataService.getProductPage({ ...params, status: stockFilter.value }) : dataService.getEmployees(params))
const validDates = computed(() => tab.value !== 'sales' || !!dates.value.start && !!dates.value.end && dates.value.end >= dates.value.start && (Date.parse(dates.value.end)-Date.parse(dates.value.start))/86400000 <= 365)
let generation = 0
function loadPage(number = 1) { return page.load({ page: number }) }
async function load() {
  const current = ++generation
  overview.value = null; error.value = null; notice.value = ''; loading.value = false
  page.reset()
  if (!validDates.value) return
  loading.value = true
  const request = { section: tab.value, ...(tab.value === 'sales' ? dates.value : periodDates('today')) }
  const summary = dataService.getReportOverview(request).then(r => { if (current === generation) overview.value = r.data }).catch(e => { if (current === generation) error.value = e })
  await Promise.allSettled([summary, loadPage()])
  if (current === generation) loading.value = false
}
watch(period, () => { if (period.value !== 'custom') dates.value = periodDates(period.value) })
watch([tab, dates], load, { deep: true })
watch(stockFilter, () => loadPage())
onMounted(load); onBeforeUnmount(() => generation++)
const maxDaily = computed(() => Math.max(1, ...(overview.value?.daily || []).map(d => Number(d.total))))
const displayDays = computed(() => (overview.value?.daily || []).slice(-14))
function csvValue(value) { let text = String(value ?? ''); if (/^[=+@\-\t\r]/.test(text)) text = `'${text}`; return `"${text.replaceAll('"','""')}"` }
function download(rows, filename) {
  const content = '\uFEFF' + rows.map(row => row.map(csvValue).join(',')).join('\r\n')
  const url = URL.createObjectURL(new Blob([content], { type: 'text/csv;charset=utf-8' }))
  const link = document.createElement('a'); link.href = url; link.download = filename; link.click(); URL.revokeObjectURL(url)
  notice.value = 'Download prepared.'
}
function exportSummary() {
  const data = overview.value
  if (!data) return
  const rows = [[`METMMA ${tab.value} report`], [tab.value === 'sales' ? `${dates.value.start} to ${dates.value.end}` : `Current snapshot · ${periodDates('today').start}`], ['Currency', 'MWK']]
  if (tab.value === 'sales') {
    rows.push(['Completed sales', data.summary.saleCount], ['Sales incl. VAT', data.summary.revenue], ['VAT', data.summary.tax], ['Average sale', data.summary.averageSale], ['Reversed sales', data.summary.reversedCount], [], ['Date', 'Sales', 'Total incl. VAT'], ...data.daily.map(d => [d.date, d.count, d.total]), [], ['Top products by units', 'Units', 'Sales before VAT'], ...data.products.map(p => [p.name, p.units, p.revenue]), [], ['Payment', 'Sales', 'Total'], ...data.payments.map(p => [paymentLabel(p.method), p.count, p.total]))
  } else if (tab.value === 'stock') rows.push(['Active product batches', data.summary.products], ['Sellable units', data.summary.units], ['Stock selling value before VAT', data.summary.stockValue], ['Low stock batches', data.summary.low], ['Out of stock batches', data.summary.empty], ['Expired batches with stock', data.summary.expired], ['Batches expiring within 90 days', data.summary.expiring])
  else rows.push(['Active staff',data.summary.active], ['Inactive staff',data.summary.inactive], ['Active staff with linked account',data.summary.withAccount], ['On leave today',data.summary.onLeave], ['Pending leave requests',data.summary.pendingLeave], [], ['Department','Active staff'], ...data.departments.map(d => [d.department,d.count]))
  download(rows, `${tab.value}-summary-${dates.value.start}-${dates.value.end}.csv`)
}
function exportPage() {
  const rows = tab.value === 'sales' ? [['Receipt','Date','Customer','Payment','Total MWK','Status'], ...page.rows.value.map(r => [receiptLabel(r),r.date,r.customerName || 'Walk-in customer',paymentLabel(r.paymentMethod),r.totalAmount,r.status])]
    : tab.value === 'stock' ? [['Product','Batch','Expiry','Units','Price MWK','Supplier'], ...page.rows.value.map(r => [r.name,r.batchNumber,r.expiryDate,r.quantity,r.sellingPrice,r.supplier])]
    : [['Name','Position','Department','Status'], ...page.rows.value.map(r => [`${r.first_name} ${r.last_name}`,r.position,r.department,r.is_active?'Active':'Inactive'])]
  download(rows, `${tab.value}-details-page-${page.pagination.value?.page || 1}.csv`)
}
</script>
<template>
  <MainLayout title="Reports" subtitle="Understand sales, plan stock and see where attention is needed">
    <SectionNav section="business" />
    <div class="flex flex-wrap gap-2 mb-5" aria-label="Report type">
      <button :class="tab === 'sales' ? 'primary' : 'secondary'" :aria-pressed="tab === 'sales'" @click="tab = 'sales'"><TrendingUp class="inline w-4 h-4 mr-2"/>Sales performance</button>
      <button :class="tab === 'stock' ? 'primary' : 'secondary'" :aria-pressed="tab === 'stock'" @click="tab = 'stock'"><Package class="inline w-4 h-4 mr-2"/>Stock health</button>
      <button v-if="['admin','hr_officer'].includes(role)" :class="tab === 'staff' ? 'primary' : 'secondary'" :aria-pressed="tab === 'staff'" @click="tab = 'staff'"><Users class="inline w-4 h-4 mr-2"/>Team overview</button>
    </div>
    <div class="panel flex flex-wrap gap-3 mb-5 items-end">
      <template v-if="tab === 'sales'"><label>Period<select v-model="period" class="field mt-1"><option value="today">Today</option><option value="week">This week</option><option value="month">This month</option><option value="custom">Choose dates</option></select></label><label>From<input v-model="dates.start" type="date" class="field mt-1" @change="period = 'custom'"/></label><label>Through<input v-model="dates.end" type="date" :min="dates.start" class="field mt-1" @change="period = 'custom'"/></label></template>
      <p v-else class="text-sm text-slate-600">Current snapshot · {{ dateLabel(periodDates('today').start) }}</p>
      <button class="secondary ml-auto" :disabled="loading || !overview" @click="exportSummary"><Download class="inline w-4 h-4 mr-2"/>Download report</button>
    </div>
    <p v-if="!validDates" role="alert" class="field-error mb-4">Choose a start and end date, in order, within one year.</p>
    <p v-if="notice" role="status" class="success-notice mb-4">{{ notice }}</p>
    <ErrorNotice :error="error" :retry="load"/><p v-if="loading" role="status" class="mb-4">Preparing your report…</p>
    <template v-if="overview && !loading">
      <template v-if="tab === 'sales'">
        <div class="grid sm:grid-cols-2 xl:grid-cols-4 gap-4 mb-5">
          <div class="panel"><span class="metric-label">Sales including VAT</span><strong class="metric-value">{{ currency(overview.summary.revenue) }}</strong><p class="text-xs text-slate-500 mt-2">Completed sales in this period</p></div>
          <div class="panel"><span class="metric-label">Completed sales</span><strong class="metric-value">{{ overview.summary.saleCount }}</strong><p class="text-xs text-slate-500 mt-2">{{ overview.summary.reversedCount }} reversed sales excluded</p></div>
          <div class="panel"><span class="metric-label">Average sale</span><strong class="metric-value">{{ currency(overview.summary.averageSale) }}</strong><p class="text-xs text-slate-500 mt-2">Average customer basket including VAT</p></div>
          <div class="panel"><span class="metric-label">VAT recorded</span><strong class="metric-value">{{ currency(overview.summary.tax) }}</strong><p class="text-xs text-slate-500 mt-2">Already included in sales above</p></div>
        </div>
        <div class="grid xl:grid-cols-2 gap-5 mb-5">
          <section class="panel"><h2 class="font-bold text-lg">Sales by day</h2><p class="text-sm text-slate-500 mb-4">{{ overview.daily.length > 14 ? 'Last 14 days with sales; download includes every day with sales.' : 'Days with completed sales in the selected period.' }}</p><div v-for="day in displayDays" :key="day.date" class="mb-3"><div class="flex justify-between text-sm gap-3 mb-1"><span>{{ dateLabel(day.date) }} · {{ day.count }} sales</span><strong>{{ currency(day.total) }}</strong></div><div class="h-2 rounded bg-blue-50" aria-hidden="true"><div class="h-2 rounded bg-blue-600" :style="{width: `${Number(day.total)/maxDaily*100}%`}"/></div></div><p v-if="!displayDays.length" class="py-6 text-slate-500">No completed sales in this period.</p></section>
          <section class="panel"><h2 class="font-bold text-lg">Most sold products</h2><p class="text-sm text-slate-500 mb-4">Top 10 by units sold. Use this to plan restocking.</p><table class="w-full"><thead><tr><th class="p-2 text-left">Product</th><th class="p-2 text-right">Units</th><th class="p-2 text-right">Sales before VAT</th></tr></thead><tbody><tr v-for="product in overview.products" :key="product.id" class="border-b border-slate-100"><td class="p-2">{{ product.name }}</td><td class="p-2 text-right">{{ product.units }}</td><td class="p-2 text-right">{{ currency(product.revenue) }}</td></tr></tbody></table><p v-if="!overview.products.length" class="py-6 text-slate-500">Products will appear after a sale is saved.</p></section>
        </div>
        <div v-if="overview.payments.length" class="panel mb-5"><h2 class="font-bold mb-3">How customers paid</h2><div class="grid sm:grid-cols-2 xl:grid-cols-4 gap-4"><div v-for="method in overview.payments" :key="method.method" class="border-l-4 border-blue-200 pl-3"><p class="text-sm text-slate-500">{{ paymentLabel(method.method) }} · {{ method.count }} sales</p><strong>{{ currency(method.total) }}</strong></div></div></div>
        <p class="text-sm text-slate-500 mb-5">Totals cover the full period, regardless of the detail page below. Reversed sales are excluded by original sale date. For money received and refunded by transaction date, open <router-link to="/finances" class="underline text-blue-800">Income & expenses</router-link>.</p>
      </template>
      <template v-else-if="tab === 'stock'">
        <div class="grid sm:grid-cols-3 gap-4 mb-5"><div class="panel"><span class="metric-label">Active product batches</span><strong class="metric-value">{{ overview.summary.products }}</strong></div><div class="panel"><span class="metric-label">Units available, not expired</span><strong class="metric-value">{{ overview.summary.units }}</strong></div><div class="panel"><span class="metric-label">Stock at selling price</span><strong class="metric-value">{{ currency(overview.summary.stockValue) }}</strong><p class="text-xs text-slate-500 mt-2">Before VAT; excludes expired stock. This is not cost or profit.</p></div></div>
        <section class="panel mb-5"><h2 class="font-bold text-lg mb-3">Stock needing attention</h2><div class="grid sm:grid-cols-3 gap-3"><button class="text-left border border-amber-200 bg-amber-50 p-4 rounded-lg" @click="stockFilter = 'low'"><strong class="block text-2xl">{{ overview.summary.low }}</strong>Low stock<p class="text-xs mt-1">Review the low stock list below</p></button><button class="text-left border border-red-200 bg-red-50 p-4 rounded-lg" @click="stockFilter = 'expired'"><strong class="block text-2xl">{{ overview.summary.expired }}</strong>Expired batches with stock<p class="text-xs mt-1">Set aside; do not sell</p></button><button class="text-left border border-amber-200 bg-amber-50 p-4 rounded-lg" @click="stockFilter = 'expiring'"><strong class="block text-2xl">{{ overview.summary.expiring }}</strong>Expiring within 90 days<p class="text-xs mt-1">Plan stock rotation</p></button></div></section>
      </template>
      <template v-else>
        <div class="grid sm:grid-cols-3 gap-4 mb-5"><div class="panel"><span class="metric-label">Active staff</span><strong class="metric-value">{{ overview.summary.active }}</strong><p class="text-xs text-slate-500 mt-2">{{ overview.summary.inactive }} inactive · {{ overview.summary.withAccount }} linked to sign-in accounts</p></div><div class="panel"><span class="metric-label">On leave today</span><strong class="metric-value">{{ overview.summary.onLeave }}</strong><router-link to="/leave" class="text-sm text-blue-800 underline">Review leave</router-link></div><div class="panel"><span class="metric-label">Leave awaiting review</span><strong class="metric-value">{{ overview.summary.pendingLeave }}</strong></div></div>
        <section class="panel mb-5"><h2 class="font-bold mb-3">Active staff by department</h2><div class="flex flex-wrap gap-4"><p v-for="group in overview.departments" :key="group.department" class="rounded-lg bg-slate-50 p-4">{{ group.department }} <strong class="ml-3">{{ group.count }}</strong></p></div></section>
      </template>
    </template>
    <section v-if="validDates" class="panel p-0 overflow-hidden">
      <div class="flex flex-wrap items-center justify-between gap-3 p-4"><div><h2 class="font-bold">{{ tab === 'sales' ? 'Receipt details' : tab === 'stock' ? 'Stock details' : 'Staff details' }}</h2><p class="text-sm text-slate-500">{{ page.pagination.value?.total || 0 }} matching records · {{ page.rows.value.length }} on this page</p></div><select v-if="tab === 'stock'" v-model="stockFilter" class="field w-auto" aria-label="Stock report filter"><option value="all">All stock</option><option value="low">Low stock</option><option value="expired">Expired</option><option value="expiring">Expiring within 90 days</option></select><button class="secondary" :disabled="page.loading.value || !page.rows.value.length" @click="exportPage">Export detail page</button></div>
      <ErrorNotice :error="page.error.value" :retry="loadPage"/>
      <div class="overflow-x-auto"><table class="w-full min-w-[620px]"><thead><tr v-if="tab === 'sales'"><th class="p-3 text-left">Receipt</th><th class="p-3 text-left">Date</th><th class="p-3 text-left">Payment</th><th class="p-3 text-right">Total</th><th class="p-3 text-left">Status</th></tr><tr v-else-if="tab === 'stock'"><th class="p-3 text-left">Product</th><th class="p-3 text-left">Batch</th><th class="p-3 text-left">Expiry</th><th class="p-3 text-right">Units</th><th class="p-3 text-right">Unit price</th></tr><tr v-else><th class="p-3 text-left">Employee</th><th class="p-3 text-left">Position</th><th class="p-3 text-left">Department</th><th class="p-3 text-left">Status</th></tr></thead><tbody>
        <tr v-for="row in page.rows.value" :key="row.id" class="border-t border-slate-100"><template v-if="tab === 'sales'"><td class="p-3"><router-link :to="{path:'/sales',query:{receipt:receiptLabel(row)}}" class="font-semibold text-blue-800 underline">{{ receiptLabel(row) }}</router-link></td><td class="p-3">{{ dateLabel(row.date) }}</td><td class="p-3">{{ paymentLabel(row.paymentMethod) }}</td><td class="p-3 text-right tabular-nums">{{ currency(row.totalAmount) }}</td><td class="p-3"><span class="badge">{{ row.status === 'completed' ? 'Completed' : 'Reversed' }}</span></td></template><template v-else-if="tab === 'stock'"><td class="p-3 font-medium"><router-link v-if="role !== 'hr_officer'" :to="{path:'/inventory',query:{product:row.id}}" class="text-blue-800 underline">{{ row.name }}</router-link><span v-else>{{ row.name }}</span></td><td class="p-3">{{ row.batchNumber }}</td><td class="p-3">{{ dateLabel(row.expiryDate) }}</td><td class="p-3 text-right">{{ row.quantity }}</td><td class="p-3 text-right">{{ currency(row.sellingPrice) }}</td></template><template v-else><td class="p-3 font-medium">{{ row.first_name }} {{ row.last_name }}</td><td class="p-3">{{ row.position || '—' }}</td><td class="p-3">{{ row.department || 'Unassigned' }}</td><td class="p-3">{{ row.is_active ? 'Active' : 'Inactive' }}</td></template></tr>
      </tbody></table></div>
      <p v-if="!page.loading.value && !page.rows.value.length && !page.error.value" class="p-6 text-slate-500">No records match this view. Try a different period or filter.</p>
      <PaginationControls :pagination="page.pagination.value" :loading="page.loading.value" @change="loadPage"/>
    </section>
  </MainLayout>
</template>
