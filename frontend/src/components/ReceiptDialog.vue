<script setup>
import { nextTick, onBeforeUnmount, onMounted } from 'vue'
import AppDialog from './AppDialog.vue'
import SaleReceipt from './SaleReceipt.vue'
import { receiptLabel } from '@/services/api/display'
import { cachedPharmacyProfile, fetchPharmacyProfile } from '@/composables/usePharmacyProfile'
const props=defineProps({open:Boolean,sale:Object})
const emit=defineEmits(['close'])
let previousTitle=''
function restoreTitle(){if(previousTitle){document.title=previousTitle;previousTitle=''}}
async function printReceipt(){
 await nextTick()
 if(!previousTitle)previousTitle=document.title
 document.title=receiptLabel(props.sale)
 window.addEventListener('afterprint',restoreTitle,{once:true})
 window.print()
}
onMounted(() => { fetchPharmacyProfile().catch(() => {}) })
onBeforeUnmount(() => { window.removeEventListener('afterprint',restoreTitle);restoreTitle() })
</script>
<template>
<AppDialog :open="open" title="Sales Receipt" @close="emit('close')"><SaleReceipt v-if="sale" :sale="sale" :profile="cachedPharmacyProfile"/><div class="flex gap-3 mt-5"><button class="primary" @click="printReceipt">Print receipt</button><button class="secondary" @click="emit('close')">Close</button></div><p class="text-sm text-gray-600 mt-3">Select your printer or Save as PDF in the print window.</p></AppDialog>
<Teleport to="body"><div v-if="open && sale" class="receipt-print" aria-hidden="true"><SaleReceipt :sale="sale" :profile="cachedPharmacyProfile"/></div></Teleport>
</template>
