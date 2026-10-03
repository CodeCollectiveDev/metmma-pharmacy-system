import { reactive, ref } from 'vue'
export const sessionExpired = ref(false)
export const confirmation = reactive({ open: false, title: '', message: '', label: 'Continue' })
let resolveConfirmation
export function confirmAction(title, message, label = 'Continue') {
  if (resolveConfirmation) resolveConfirmation(false)
  Object.assign(confirmation, { open: true, title, message, label })
  return new Promise(resolve => { resolveConfirmation = resolve })
}
export function answerConfirmation(answer) {
  confirmation.open = false
  resolveConfirmation?.(answer)
  resolveConfirmation = null
}

export const appFailure = ref('')
