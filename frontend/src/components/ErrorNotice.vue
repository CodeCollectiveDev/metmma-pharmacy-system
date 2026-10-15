<script setup>
import { computed } from 'vue'
import { userError } from '@/services/api/errors'
const props = defineProps({ error: [Object, String], retry: Function })
const labels = { productCode:'Product code', name:'Product name', batchNumber:'Batch / lot number', expiryDate:'Expiry date', sellingPrice:'Selling price', unitPrice:'Selling price', reorderLevel:'Low stock alert', employee_id:'Employee', first_name:'First name', last_name:'Last name', job_title:'Position', hire_date:'Start date', start_date:'First day', expected_return_date:'Last day of leave', leave_type:'Leave type', current_password:'Current password', password:'Password', paymentMethod:'Payment method', amountReceived:'Payment received', totalAmount:'Total', full_name:'Full name' }
function fieldLabel(field) { return labels[field] || (/^items\.\d+\.quantity$/.test(field) ? 'Cart quantity' : field.replace(/([a-z])([A-Z])/g,'$1 $2').replaceAll('_',' ')) }
const notice = computed(() => props.error ? userError(props.error) : null)
</script>
<template>
  <div v-if="notice" role="alert" class="my-3 p-4 rounded-lg bg-red-50 border border-red-200 text-red-800">
    <p>{{ notice.message }}</p>
    <ul v-if="notice.fields.length" class="mt-2 list-disc pl-5 text-sm"><li v-for="field in notice.fields" :key="field.field">{{ fieldLabel(field.field) }}: {{ field.message }}</li></ul>
    <details v-if="notice.requestId" class="text-sm mt-2"><summary class="cursor-pointer">Details for support</summary><p class="break-all mt-1">Help reference: {{ notice.requestId }}</p></details>
    <button v-if="retry && notice.retryable" @click="retry()" class="mt-2 underline font-medium">Try again</button>
  </div>
</template>
