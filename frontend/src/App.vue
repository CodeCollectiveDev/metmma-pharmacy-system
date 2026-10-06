<script setup>
import { ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import PermissionDeniedModal from '@/components/PermissionDeniedModal.vue'
import AppDialog from '@/components/AppDialog.vue'
import GuidedTour from '@/components/GuidedTour.vue'
import { confirmation, answerConfirmation, sessionExpired, appFailure } from '@/composables/useFeedback'
import { authService } from '@/services/api/authService'
import { userError } from '@/services/api/errors'
import ErrorNotice from '@/components/ErrorNotice.vue'
import PasswordInput from '@/components/PasswordInput.vue'
import { autoTour } from '@/composables/useTour'
const router = useRouter()
const route = useRoute()
const permissionModal = ref(null)
router.setPermissionDeniedCallback((role, label) => permissionModal.value?.showModal(role, label))
watch(() => route.path, () => { if (route.meta.requiresAuth && localStorage.getItem('token')) autoTour() }, { immediate: true })
const sessionPassword = ref(''), sessionError = ref(null), signingIn = ref(false)
async function signIn() {
  signingIn.value = true; sessionError.value = null
  try {
    const previous = JSON.parse(localStorage.getItem('user') || '{}')
    const data = await authService.login(previous.username || previous.name, sessionPassword.value)
    if (data.user.id !== previous.id) throw new Error('Different account')
    localStorage.setItem('token', data.token); localStorage.setItem('role', data.user.role.toLowerCase())
    sessionExpired.value = false; sessionPassword.value = ''
  } catch (err) { sessionError.value = userError(err) } finally { signingIn.value = false }
}
</script>
<template>
  <PermissionDeniedModal ref="permissionModal" />
  <div v-if="appFailure" role="alert" class="p-4 bg-red-50 text-red-800">{{ appFailure }} <button class="underline" @click="appFailure = ''">Close message</button></div>
  <router-view />
  <GuidedTour />
  <AppDialog :open="confirmation.open" :title="confirmation.title" @close="answerConfirmation(false)">
    <p>{{ confirmation.message }}</p>
    <div class="mt-5 flex gap-3"><button class="secondary" @click="answerConfirmation(false)">Cancel</button><button class="primary" @click="answerConfirmation(true)">{{ confirmation.label }}</button></div>
  </AppDialog>
  <AppDialog :open="sessionExpired" title="Sign in again" @close="sessionExpired = false">
    <p>Your session ended. Sign in to continue. Your cart and open form are still here.</p>
    <form @submit.prevent="signIn"><ErrorNotice :error="sessionError" /><PasswordInput v-model="sessionPassword" label="Your password" label-class="block mt-3" input-class="field mt-1" required autocomplete="current-password" /><button class="primary mt-4" :disabled="signingIn">{{ signingIn ? 'Signing in…' : 'Sign in' }}</button></form>
  </AppDialog>
</template>
