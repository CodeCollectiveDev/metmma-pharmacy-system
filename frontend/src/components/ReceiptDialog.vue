<script setup>
import { nextTick, onBeforeUnmount, onMounted, ref } from 'vue'
import AppDialog from './AppDialog.vue'
import SaleReceipt from './SaleReceipt.vue'
import { receiptLabel } from '@/services/api/display'
import { receiptFileName, renderReceiptPng } from '@/services/receiptExport'
import { cachedPharmacyProfile, fetchPharmacyProfile } from '@/composables/usePharmacyProfile'
const props = defineProps({open:Boolean,sale:Object})
const emit=defineEmits(['close'])
const receiptBody=ref(null), busy=ref(false), notice=ref(''), failed=ref(false)
let previousTitle=''
function restoreTitle(){if(previousTitle){document.title=previousTitle;previousTitle=''}}
function say(message,isError=false){notice.value=message;failed.value=isError}
function receiptElement(){return receiptBody.value?.querySelector('.sale-receipt') || null}
async function printReceipt(){
 await nextTick()
 if(!previousTitle)previousTitle=document.title
 document.title=receiptLabel(props.sale)
 window.addEventListener('afterprint',restoreTitle,{once:true})
 window.print()
}
async function downloadReceipt(){
  if(busy.value || !props.sale)return
  busy.value=true;say('')
  try{
    const blob=await renderReceiptPng(receiptElement())
    const url=URL.createObjectURL(blob)
    const link=document.createElement('a')
    link.href=url;link.download=receiptFileName(props.sale)
    document.body.appendChild(link);link.click();link.remove()
    setTimeout(()=>URL.revokeObjectURL(url),1000)
    say('Receipt downloaded.')
  }catch{
    say('The receipt could not be downloaded on this device. You can still print it.',true)
  }finally{busy.value=false}
}
onMounted(() => { fetchPharmacyProfile().catch(() => {}) })
onBeforeUnmount(() => { window.removeEventListener('afterprint',restoreTitle);restoreTitle() })
</script>
<template>
<AppDialog :open="open" title="Sales Receipt" @close="emit('close')"><div ref="receiptBody"><SaleReceipt v-if="sale" :sale="sale" :profile="cachedPharmacyProfile"/></div><div class="flex flex-wrap gap-3 mt-5"><button class="primary" :disabled="busy" @click="printReceipt">Print receipt</button><button class="secondary" :disabled="busy" @click="downloadReceipt">{{ busy ? 'Preparing…' : 'Download receipt' }}</button><button class="secondary" @click="emit('close')">Close</button></div><p v-if="notice" role="status" :class="['text-sm mt-3', failed ? 'text-red-800' : 'text-emerald-800']">{{ notice }}</p><p class="text-sm text-gray-600 mt-3">Download saves an image of this receipt. You can also print or save as PDF.</p></AppDialog>
<Teleport to="body"><div v-if="open && sale" class="receipt-print" aria-hidden="true"><SaleReceipt :sale="sale" :profile="cachedPharmacyProfile"/></div></Teleport>
</template>
