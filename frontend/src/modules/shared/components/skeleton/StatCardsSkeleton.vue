<script setup>
defineProps({
  count: { type: Number, default: 4 }
})
</script>

<template>
  <div class="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 sm:gap-5">
    <div
      v-for="n in count"
      :key="n"
      class="app-card app-card-body flex items-center justify-between gap-4 min-h-[5.5rem]"
    >
      <div class="flex-1 space-y-2">
        <div class="h-3.5 w-24 animate-pulse rounded bg-gray-200/80" />
        <div class="h-7 w-16 animate-pulse rounded bg-gray-200/80" />
      </div>
      <div class="h-11 w-11 shrink-0 animate-pulse rounded-lg bg-gray-200/80" />
    </div>
  </div>
</template>
