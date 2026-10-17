<script setup>
import { Camera } from 'lucide-vue-next'
defineProps({ label: { type: String, default: 'Read barcode with camera' }, disabled: Boolean })
</script>
<template><button type="button" class="secondary camera-button" :disabled="disabled" :aria-label="label" :title="label"><Camera aria-hidden="true" class="h-5 w-5" /></button></template>
