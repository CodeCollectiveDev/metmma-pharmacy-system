<script setup>
import { ref, watch, onMounted } from 'vue'
import MainLayout from '@/layouts/MainLayout.vue'
import ErrorNotice from '@/components/ErrorNotice.vue'
import PaginationControls from '@/components/PaginationControls.vue'
import { dataService } from '@/services/api/dataService'
import { usePage } from '@/composables/usePage'
import { currency, periodDates } from '@/services/api/money'
const tab = ref('sales'), period = ref('today'), role = localStorage.getItem('role')
const page = usePage(params => tab.value === 'sales' ? dataService.getSalesHistory({...params,...periodDates(period.value)}) : tab.value === 'stock' ? dataService.getProductPage(params) : dataService.getEmployees(params))
function load(number = 1) { return page.load({ page: number }) }
watch([tab,period], () => load()); onMounted(load)
function csvValue(value) { let text = String(value ?? ''); if (/^[=+@\-\t\r]/.test(text)) text = `'${text}`; return `"${text.replaceAll('"','""')}"` }
function exportPage() {
  const data = page.rows.value.map(r => tab.value === 'sales' ? { receipt:r.receiptNumber,date:r.date,total:r.totalAmount,payment:r.paymentMethod,status:r.status,items:r.items.map(i=>`${i.name} x${i.quantity}`).join('; ') } : tab.value === 'stock' ? { code:r.productCode,name:r.name,batch:r.batchNumber,expiry:r.expiryDate,quantity:r.quantity,price:r.sellingPrice,supplier:r.supplier } : { name:`${r.first_name} ${r.last_name}`,position:r.position,department:r.department,active:r.is_active })
  if (!data.length) return
  const headers = Object.keys(data[0]), content = [headers.map(csvValue).join(','),...data.map(r=>headers.map(h=>csvValue(r[h])).join(','))].join('\r\n')
  const url = URL.createObjectURL(new Blob([content], {type:'text/csv;charset=utf-8'})); const link = document.createElement('a'); link.href = url; link.download = `${tab.value}-page-${page.pagination.value.page}.csv`; link.click(); URL.revokeObjectURL(url)
}
</script>
<template>
  <MainLayout title="Reports" subtitle="View current records and export the page you are viewing">
    <div class="panel flex flex-wrap gap-3 mb-4"><button class="secondary" :aria-pressed="tab === 'sales'" @click="tab = 'sales'">Sales</button><button class="secondary" :aria-pressed="tab === 'stock'" @click="tab = 'stock'">Stock</button><button v-if="['admin','hr_officer'].includes(role)" class="secondary" :aria-pressed="tab === 'staff'" @click="tab = 'staff'">Staff</button><label v-if="tab === 'sales'">Period<select v-model="period" class="field"><option value="today">Today</option><option value="week">This week</option><option value="month">This month</option></select></label><button class="primary ml-auto" :disabled="page.loading.value || !page.rows.value.length" @click="exportPage">Export this page as CSV</button></div>
    <ErrorNotice :error="page.error.value" :retry="load" /><p v-if="page.loading.value" role="status">Loading records…</p>
    <div class="panel"><ul><li v-for="row in page.rows.value" :key="row.id" class="border-t py-3"><template v-if="tab === 'sales'"><strong>{{ row.receiptNumber }}</strong> · {{ currency(row.totalAmount) }}<p>{{ row.items.map(i=>`${i.name} × ${i.quantity}`).join(', ') }}</p></template><template v-else-if="tab === 'stock'"><strong>{{ row.name }}</strong> · {{ row.quantity }} in stock · {{ row.expiryDate?.slice(0,10) }}</template><template v-else><strong>{{ row.first_name }} {{ row.last_name }}</strong> · {{ row.position }} · {{ row.department }}</template></li></ul><div v-if="!page.loading.value && !page.rows.value.length && !page.error.value"><p>No records in this view. Choose another period or open the relevant tool to add a record.</p><router-link :to="tab === 'sales' ? '/sales' : tab === 'stock' ? '/inventory' : '/hr'" class="primary inline-block mt-3">Open {{ tab === 'staff' ? 'staff' : tab }}</router-link></div><PaginationControls :pagination="page.pagination.value" :loading="page.loading.value" @change="load" /></div>
  </MainLayout>
</template>
