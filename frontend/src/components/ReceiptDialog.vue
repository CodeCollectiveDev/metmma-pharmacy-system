<script setup>
import { nextTick, onMounted, ref } from 'vue'
import AppDialog from './AppDialog.vue'
import SaleReceipt from './SaleReceipt.vue'
import { receiptLabel } from '@/services/api/display'
import { copyText, receiptFileName, receiptText, renderReceiptPng } from '@/services/receiptExport'
import { cachedPharmacyProfile, fetchPharmacyProfile } from '@/composables/usePharmacyProfile'
const props = defineProps({open:Boolean,sale:Object})
const emit=defineEmits(['close'])
const receiptBody=ref(null), busy=ref(false), notice=ref(''), failed=ref(false)
function say(message, isError = false) { notice.value = message; failed.value = isError }
function receiptElement() { return receiptBody.value?.querySelector('.sale-receipt') || null }
async function printReceipt(){await nextTick();window.print()}
async function downloadReceipt() {
  if (busy.value || !props.sale) return
  busy.value = true; say('')
  try {
    const blob = await renderReceiptPng(receiptElement())
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url; link.download = receiptFileName(props.sale)
    document.body.appendChild(link); link.click(); link.remove()
    setTimeout(() => URL.revokeObjectURL(url), 1000)
    say('Receipt downloaded.')
  } catch {
    say('The receipt could not be downloaded on this device. You can still print it.', true)
  } finally { busy.value = false }
}
async function shareReceipt() {
  if (busy.value || !props.sale) return
  busy.value = true; say('')
  const text = receiptText(props.sale, cachedPharmacyProfile.value)
  try {
    let file = null
    try {
      const blob = await renderReceiptPng(receiptElement())
      if (typeof File === 'function') file = new File([blob], receiptFileName(props.sale), { type: 'image/png' })
    } catch {}
    if (file && navigator.canShare?.({ files: [file] })) {
      try { await navigator.share({ files: [file], title: `Receipt ${receiptLabel(props.sale)}`, text }); say('Receipt shared.'); return }
      catch (err) { if (err?.name === 'AbortError') return }
    }
    if (navigator.share) {
      try { await navigator.share({ title: `Receipt ${receiptLabel(props.sale)}`, text }); say('Receipt shared.'); return }
      catch (err) { if (err?.name === 'AbortError') return }
    }
    await copyText(text)
    say('Sharing is not available on this device, so the receipt text was copied to the clipboard.')
  } catch {
    try { await copyText(text); say('Sharing is not available on this device, so the receipt text was copied to the clipboard.') }
    catch { say('The receipt could not be shared on this device. You can still print it.', true) }
  } finally { busy.value = false }
}
onMounted(() => { fetchPharmacyProfile().catch(() => {}) })
</script>
<template>
<AppDialog :open="open" title="Sales Receipt" @close="emit('close')"><div ref="receiptBody"><SaleReceipt v-if="sale" :sale="sale" :profile="cachedPharmacyProfile"/></div><div class="flex flex-wrap gap-3 mt-5"><button class="primary" :disabled="busy" @click="printReceipt">Print receipt</button><button class="secondary" :disabled="busy" @click="downloadReceipt">Download</button><button class="secondary" :disabled="busy" @click="shareReceipt">Share</button><button class="secondary" @click="emit('close')">Close</button></div><p v-if="notice" role="status" :class="['text-sm mt-3', failed ? 'text-red-800' : 'text-emerald-800']">{{ notice }}</p><p class="text-sm text-gray-600 mt-3">Download saves an image on this device. Share opens your phone's sharing options. You can also print or save as PDF.</p></AppDialog>
<Teleport to="body"><div v-if="open && sale" class="receipt-print" aria-hidden="true"><SaleReceipt :sale="sale" :profile="cachedPharmacyProfile"/></div></Teleport>
</template>
