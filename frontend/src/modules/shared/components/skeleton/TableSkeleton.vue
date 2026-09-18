<script setup>
defineProps({
  rows: { type: Number, default: 6 },
  columns: { type: Number, default: 5 }
})
</script>

<template>
  <div class="app-card overflow-hidden">
    <div class="border-b border-gray-100 px-5 py-4">
      <div class="h-4 w-40 animate-pulse rounded bg-gray-200/80" />
    </div>
    <div class="divide-y divide-gray-100">
      <div
        v-for="row in rows"
        :key="row"
        class="flex items-center gap-4 px-5 py-4"
      >
        <div
          v-for="col in columns"
          :key="col"
          class="h-4 flex-1 animate-pulse rounded bg-gray-200/80"
          :class="{ 'max-w-[8rem]': col === 1, 'max-w-[5rem]': col === columns }"
        />
      </div>
    </div>
  </div>
</template>
