<script setup>
import { ref, watch, nextTick, useId, onBeforeUnmount } from 'vue'
const props = defineProps({ open: Boolean, title: String, dismissible: { type: Boolean, default: true } })
const emit = defineEmits(['close'])
const dialog = ref(null)
const headingId = useId()
let previousFocus
watch(() => props.open, async open => {
  await nextTick()
  if (open) {
    previousFocus = document.activeElement
    dialog.value?.showModal?.()
  } else {
    dialog.value?.close?.()
    previousFocus?.focus?.()
  }
}, { immediate: true })
function close(event) {
  event?.preventDefault()
  if (props.dismissible) emit('close')
}
onBeforeUnmount(() => { dialog.value?.close?.(); previousFocus?.focus?.() })
</script>
<template>
  <Teleport to="body">
    <dialog ref="dialog" :aria-labelledby="headingId" class="app-dialog" @cancel="close" @click="close">
      <div @click.stop class="p-5 sm:p-6">
        <div class="flex items-start justify-between gap-4 mb-4">
          <h2 :id="headingId" class="text-xl font-bold">{{ title }}</h2>
          <button v-if="dismissible" class="px-3 py-1 rounded-lg hover:bg-gray-100" aria-label="Close window" @click="close">✕</button>
        </div>
        <slot />
      </div>
    </dialog>
  </Teleport>
</template>
