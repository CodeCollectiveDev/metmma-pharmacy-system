<script setup>
import { ref } from 'vue'
import router from './router'
import PermissionDeniedModal from '@/components/PermissionDeniedModal.vue'
import RoutePageSkeleton from '@/modules/shared/components/skeleton/RoutePageSkeleton.vue'
import { useRouteLoading } from '@/composables/useRouteLoading'

const permissionModal = ref(null)
const { routeLoading } = useRouteLoading()

// Set the callback for permission denied
router.setPermissionDeniedCallback((role, pageLabel) => {
  if (permissionModal.value) {
    permissionModal.value.showModal(role, pageLabel)
  }
})
</script>

<template>
  <PermissionDeniedModal ref="permissionModal" />
  <RoutePageSkeleton v-if="routeLoading" />
  <router-view v-else />
</template>

  

