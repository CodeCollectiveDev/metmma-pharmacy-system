<script setup>
import { ref, onMounted } from 'vue'
import router from './router'
import PermissionDeniedModal from '@/components/PermissionDeniedModal.vue'
import SessionWarningModal from '@/components/SessionWarningModal.vue'
import { useSession } from '@/composables/useSession'

const permissionModal = ref(null)

router.setPermissionDeniedCallback((role, pageLabel) => {
  if (permissionModal.value) {
    permissionModal.value.showModal(role, pageLabel)
  }
})

const { showWarning, countdown, dismissWarning, stopTracking } = useSession()

const handleSessionDismiss = () => {
  dismissWarning()
}

onMounted(() => {
  window.addEventListener('storage', (e) => {
    if (e.key === 'token' && !e.newValue) {
      stopTracking()
      router.push('/login')
    }
  })
})
</script>

<template>
  <PermissionDeniedModal ref="permissionModal" />
  <SessionWarningModal
    :show-warning="showWarning"
    :countdown="countdown"
    @dismiss="handleSessionDismiss"
  />
  <router-view />
</template>
