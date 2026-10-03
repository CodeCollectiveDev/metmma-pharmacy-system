<script setup>
import { nextTick } from 'vue'
import AppDialog from './AppDialog.vue'
import SaleReceipt from './SaleReceipt.vue'
defineProps({open:Boolean,sale:Object})
const emit=defineEmits(['close'])
async function printReceipt(){await nextTick();window.print()}
</script>
<template>
<AppDialog :open="open" title="Sales Receipt" @close="emit('close')"><SaleReceipt v-if="sale" :sale="sale"/><div class="flex gap-3 mt-5"><button class="primary" @click="printReceipt">Print receipt</button><button class="secondary" @click="emit('close')">Close</button></div><p class="text-sm text-gray-600 mt-3">Select your printer or Save as PDF in the print window.</p></AppDialog>
<Teleport to="body"><div v-if="open && sale" class="receipt-print" aria-hidden="true"><SaleReceipt :sale="sale"/></div></Teleport>
</template>
