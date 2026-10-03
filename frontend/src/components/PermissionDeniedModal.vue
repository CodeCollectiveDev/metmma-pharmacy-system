<script setup>
import { ref } from 'vue'
import AppDialog from './AppDialog.vue'
const open = ref(false), page = ref('this page')
function showModal(role, label) { page.value = label || 'this page'; open.value = true }
defineExpose({ showModal })
</script>
<template>
  <AppDialog :open="open" title="Your account cannot open this page" @close="open = false"><p>Ask your administrator for help with {{ page }}. Your current work is still here.</p><button class="primary mt-4" @click="open = false">Back to my work</button></AppDialog>
</template>
