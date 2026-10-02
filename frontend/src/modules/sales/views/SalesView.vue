<script setup>
import { ref, watch, onMounted, onBeforeUnmount } from 'vue'
import { useRoute } from 'vue-router'
import MainLayout from '@/layouts/MainLayout.vue'
import AppDialog from '@/components/AppDialog.vue'
import ErrorNotice from '@/components/ErrorNotice.vue'
import PaginationControls from '@/components/PaginationControls.vue'
import { dataService } from '@/services/api/dataService'
import { usePage } from '@/composables/usePage'
import { currency, periodDates } from '@/services/api/money'
const page = usePage(dataService.getSalesHistory)
const dates = ref(periodDates('month')), search = ref(useRoute().query.receipt || ''), reverse = ref(null), reason = ref(''), kind = ref('refund'), saving = ref(false), error = ref(null), notice = ref(''), role = localStorage.getItem('role')
let timer
function load(number = 1) { return page.load({ ...dates.value, search: search.value, page: number }) }
watch([search, dates], () => { clearTimeout(timer); timer = setTimeout(() => load(), 100) }, { deep: true })
onMounted(load); onBeforeUnmount(() => clearTimeout(timer))
async function reverseSale() {
  if (saving.value) return
  saving.value = true; error.value = null
  try { await dataService.reverseSale(reverse.value.id, { reason: reason.value, kind: kind.value }); reverse.value = null; notice.value = 'Sale reversed. Stock and money records have been updated.'; await load(); window.dispatchEvent(new Event('stock-changed')) } catch (err) { error.value = err } finally { saving.value = false }
}
</script>
<template>
  <MainLayout title="Sales" :subtitle="role === 'cashier' ? 'Find your saved receipts' : 'Find saved receipts and the items sold'">
    <ErrorNotice :error="page.error.value" :retry="load" /><p v-if="notice" role="status" class="text-green-800 mb-3">{{ notice }}</p>
    <div class="panel mb-4 flex flex-wrap gap-3 items-end"><label>From<input v-model="dates.start" type="date" class="field mt-1" /></label><label>Through<input v-model="dates.end" type="date" class="field mt-1" /></label><label class="flex-1">Find a receipt or customer<input v-model="search" class="field mt-1" placeholder="Receipt or customer name" /></label><button class="secondary" :disabled="page.loading.value" @click="load()">Refresh</button></div>
    <p v-if="page.loading.value" role="status">Loading receipts…</p>
    <div class="panel overflow-x-auto p-0"><table class="w-full min-w-[700px]"><thead class="bg-gray-50"><tr><th class="p-3 text-left">Receipt and date</th><th class="p-3 text-left">Items</th><th class="p-3 text-left">Payment</th><th class="p-3 text-left">Total</th><th class="p-3 text-left">Status</th></tr></thead><tbody><tr v-for="sale in page.rows.value" :key="sale.id" class="border-t"><td class="p-3">{{ sale.receiptNumber }}<p class="text-sm text-gray-600">{{ new Date(sale.date).toLocaleString() }}</p><p class="text-sm">{{ sale.customerName || 'Walk-in customer' }} · {{ sale.cashier || 'Previous staff member' }}</p></td><td class="p-3"><p v-for="line in sale.items" :key="line.productId">{{ line.name }} × {{ line.quantity }}</p></td><td class="p-3">{{ sale.paymentMethod.replaceAll('_',' ') }}</td><td class="p-3">{{ currency(sale.totalAmount) }}</td><td class="p-3"><p>{{ sale.status === 'completed' ? 'Completed' : 'Reversed' }}</p><button v-if="role === 'admin' && sale.status === 'completed'" class="secondary mt-2" @click="reverse = sale; reason = ''; error = null">Reverse sale</button></td></tr></tbody></table><div v-if="!page.loading.value && !page.error.value && !page.rows.value.length" class="p-6 text-center"><p>No sales match these dates or this search.</p><p class="text-sm text-gray-600 my-2">Completed sales appear here automatically. Try different dates or make your first sale.</p><router-link v-if="['admin','cashier','pharmacist'].includes(role)" to="/pos" class="primary inline-block">Sell items</router-link><button v-else class="secondary" @click="dates = periodDates('month'); search = ''">Show this month</button></div><PaginationControls :pagination="page.pagination.value" :loading="page.loading.value" @change="load" /></div>
    <AppDialog :open="!!reverse" title="Reverse this sale?" :dismissible="!saving" @close="reverse = null"><form @submit.prevent="reverseSale"><p class="mb-3">{{ reverse?.receiptNumber }}: all sold units will return to stock and {{ currency(reverse?.totalAmount) }} will be recorded as money returned. Past records stay available. This can happen only once. Return the payment using your normal process.</p><ErrorNotice :error="error" /><label class="block mb-3">What happened?<select v-model="kind" class="field mt-1"><option value="refund">Customer refund</option><option value="void">Sale entered by mistake</option></select></label><label class="block">Reason<input v-model="reason" required minlength="3" maxlength="500" class="field mt-1" /></label><button class="primary mt-4" :disabled="saving">{{ saving ? 'Reversing…' : 'Confirm reversal' }}</button></form></AppDialog>
  </MainLayout>
</template>
