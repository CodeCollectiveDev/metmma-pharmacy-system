<script setup>
import { onBeforeUnmount, onMounted, ref } from 'vue'
import { BrowserMultiFormatReader } from '@zxing/browser'
import { Camera, X } from 'lucide-vue-next'

const emit = defineEmits(['detected', 'close'])

const videoElement = ref(null)
const errorMessage = ref('')
let reader
let controls
let scannerClosed = false

const stopScanning = () => {
  controls?.stop()
  controls = undefined
  const stream = videoElement.value?.srcObject
  stream?.getTracks().forEach(track => track.stop())
  if (videoElement.value) videoElement.value.srcObject = null
  scannerClosed = true
}

const closeScanner = () => {
  stopScanning()
  emit('close')
}

onMounted(async () => {
  reader = new BrowserMultiFormatReader()

  try {
    controls = await reader.decodeFromConstraints(
      {
        audio: false,
        video: { facingMode: { ideal: 'environment' } }
      },
      videoElement.value,
      (result) => {
        if (!result) return
        const barcode = result.getText().trim()
        if (!barcode) return
        stopScanning()
        emit('detected', barcode)
      }
    )
    if (scannerClosed) controls?.stop()
  } catch (error) {
    console.error('Camera scanner error:', error)
    errorMessage.value = 'Camera access failed. Check browser permissions and use HTTPS or localhost.'
  }
})

onBeforeUnmount(stopScanning)
</script>

<template>
  <Teleport to="body">
    <div class="fixed inset-0 z-[60] flex items-center justify-center bg-black/70 p-4" role="dialog" aria-modal="true" aria-label="Scan barcode with camera">
      <div class="w-full max-w-lg overflow-hidden rounded-xl bg-white shadow-2xl">
        <div class="flex items-center justify-between border-b border-gray-100 px-4 py-3">
          <div class="flex items-center gap-2 font-semibold text-gray-800">
            <Camera class="h-5 w-5 text-blue-600" />
            Scan barcode with camera
          </div>
          <button type="button" @click="closeScanner" class="rounded-md p-2 text-gray-500 hover:bg-gray-100 hover:text-gray-700" aria-label="Close camera scanner">
            <X class="h-5 w-5" />
          </button>
        </div>

        <div class="bg-black p-3">
          <video ref="videoElement" class="aspect-video w-full rounded-lg object-cover" autoplay muted playsinline />
        </div>

        <div class="space-y-3 px-4 py-4">
          <p v-if="errorMessage" class="text-sm text-red-600">{{ errorMessage }}</p>
          <p v-else class="text-sm text-gray-600">Point your rear camera at a product barcode.</p>
          <button type="button" @click="closeScanner" class="w-full rounded-lg bg-gray-100 px-4 py-2 font-medium text-gray-700 hover:bg-gray-200">
            Cancel
          </button>
        </div>
      </div>
    </div>
  </Teleport>
</template>
