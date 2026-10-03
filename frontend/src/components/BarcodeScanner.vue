<script setup>
import { ref, onMounted, onBeforeUnmount } from 'vue'
import { BrowserMultiFormatReader } from '@zxing/browser'
import { BarcodeFormat, DecodeHintType } from '@zxing/library'
const emit=defineEmits(['detected','close'])
const video=ref(null), error=ref(''), ready=ref(false)
let controls, stream, stopped=false
function stop(){stopped=true;controls?.stop();stream?.getTracks().forEach(t=>t.stop());if(video.value)video.value.srcObject=null}
function close(){stop();emit('close')}
onMounted(async()=>{
 if(!navigator.mediaDevices?.getUserMedia){error.value='Camera access needs HTTPS or localhost and a supported browser. You can still type a barcode or use a USB scanner.';return}
 try{
  // Acquire the stream ourselves so closing during a permission prompt also releases it.
  stream=await navigator.mediaDevices.getUserMedia({audio:false,video:{facingMode:{ideal:'environment'},width:{ideal:1280}}})
  if(stopped){stream.getTracks().forEach(t=>t.stop());return}
  const hints=new Map([[DecodeHintType.POSSIBLE_FORMATS,[BarcodeFormat.EAN_13,BarcodeFormat.EAN_8,BarcodeFormat.UPC_A,BarcodeFormat.UPC_E,BarcodeFormat.CODE_128,BarcodeFormat.CODE_39,BarcodeFormat.ITF]]])
  const reader=new BrowserMultiFormatReader(hints,{delayBetweenScanAttempts:150})
  controls=await reader.decodeFromStream(stream,video.value,(result)=>{
   if(stopped||!result)return
   const code=result.getText().trim()
   if(!code)return
   stop();emit('detected',code)
  })
  if(stopped)controls.stop();else ready.value=true
 }catch{stop();error.value='Unable to open the camera. Check camera permissions, then close and retry, or enter the barcode manually.'}
})
onBeforeUnmount(stop)
</script>
<template>
<section aria-label="Camera barcode scanner" class="space-y-3">
<p v-if="error" role="alert">{{error}}</p><p v-else role="status">{{ready?'Hold the barcode steady inside the camera view.':'Opening camera…'}}</p>
<video ref="video" autoplay muted playsinline class="w-full rounded-lg bg-black" aria-label="Live barcode camera preview"/>
<button type="button" class="secondary" @click="close">Stop camera</button>
</section>
</template>
