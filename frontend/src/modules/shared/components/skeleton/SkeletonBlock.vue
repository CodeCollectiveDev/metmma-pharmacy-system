<script setup>
defineProps({
  width: { type: String, default: 'w-full' },
  height: { type: String, default: 'h-4' },
  rounded: { type: String, default: 'rounded-md' }
})
</script>

<template>
  <div
    :class="['animate-pulse bg-gray-200/80', width, height, rounded]"
    aria-hidden="true"
  />
</template>
