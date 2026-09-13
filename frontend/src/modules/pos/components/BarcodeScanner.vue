<script setup>
import { ref, onMounted, onUnmounted } from 'vue'
import { Html5Qrcode } from 'html5-qrcode'
import { Camera, CameraOff, RefreshCw } from 'lucide-vue-next'

const emit = defineEmits(['scanned', 'closed'])

let scanner = null
const scanning = ref(false)
const error = ref('')
const cameraUnavailable = ref(false)
const stream = ref(null)

const readerId = 'barcode-reader'

const stopCamera = () => {
  if (stream.value) {
    stream.value.getTracks().forEach(track => track.stop())
    stream.value = null
  }
}

const startScanner = async () => {
  error.value = ''
  cameraUnavailable.value = false

  if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
    cameraUnavailable.value = true
    error.value = 'Camera is not supported on this device or browser.'
    return
  }

  try {
    scanner = new Html5Qrcode(readerId)
    await scanner.start(
      { facingMode: 'environment' },
      { fps: 10, qrbox: { width: 250, height: 150 } },
      (decodedText) => {
        emit('scanned', decodedText)
        stop()
      },
      () => {}
    )
    scanning.value = true
    const activeStream = scanner.getState?.() === Html5Qrcode.SCAN_STATE.SCANNING
    if (activeStream) {
      try {
        const mediaStream = document.querySelector(`#${readerId} video`)?.srcObject
        if (mediaStream) stream.value = mediaStream
      } catch (e) {}
    }
  } catch (e) {
    cameraUnavailable.value = true
    error.value = 'Unable to access camera. Please check camera permissions.'
    console.error('Camera scan start error:', e)
  }
}

const stop = async () => {
  stopCamera()
  if (scanner) {
    try {
      if (scanner.isScanning?.()) await scanner.stop()
    } catch (e) { console.warn('Scanner stop error:', e) }
    try { scanner.clear() } catch (e) {}
    scanner = null
  }
  scanning.value = false
}

onMounted(startScanner)

onUnmounted(() => {
  stop()
  emit('closed')
})
</script>

<template>
  <div class="space-y-3">
    <div v-if="error" class="text-center py-6">
      <CameraOff class="w-12 h-12 text-red-400 mx-auto mb-3" />
      <p class="text-red-600 font-medium mb-2">{{ error }}</p>
      <button
        @click="startScanner"
        class="px-4 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 inline-flex items-center gap-2"
      >
        <RefreshCw class="w-4 h-4" /> Try Again
      </button>
    </div>

    <div v-else class="space-y-3">
      <div id="barcode-reader" class="w-full overflow-hidden rounded-lg bg-black" style="min-height: 220px;"></div>
      <p class="text-sm text-gray-500 text-center">
        <Camera class="w-4 h-4 inline-block mr-1" />
        Point your camera at the product barcode to scan automatically
      </p>
    </div>
  </div>
</template>
