<script setup>
import { ref } from 'vue'
import router from './router'
import PermissionDeniedModal from '@/components/PermissionDeniedModal.vue'

const permissionModal = ref(null)

// Set the callback for permission denied
router.setPermissionDeniedCallback((role, pageLabel) => {
  if (permissionModal.value) {
    permissionModal.value.showModal(role, pageLabel)
  }
})
</script>

<template>
  <PermissionDeniedModal ref="permissionModal" />
  <router-view />
</template>

  

