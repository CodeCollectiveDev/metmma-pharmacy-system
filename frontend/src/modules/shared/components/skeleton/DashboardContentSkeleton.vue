<script setup>
import StatCardsSkeleton from './StatCardsSkeleton.vue'
</script>

<template>
  <div class="space-y-6" aria-busy="true" aria-label="Loading dashboard">
    <StatCardsSkeleton />
    <div class="grid grid-cols-1 gap-5 lg:grid-cols-3">
      <div class="app-card lg:col-span-2">
        <div class="border-b border-gray-100 px-5 py-4">
          <div class="h-4 w-36 animate-pulse rounded bg-gray-200/80" />
        </div>
        <div class="space-y-4 p-5">
          <div v-for="n in 4" :key="n" class="flex items-center justify-between gap-4">
            <div class="h-4 w-1/3 animate-pulse rounded bg-gray-200/80" />
            <div class="h-4 w-16 animate-pulse rounded bg-gray-200/80" />
          </div>
        </div>
      </div>
      <div class="app-card">
        <div class="border-b border-gray-100 px-5 py-4">
          <div class="h-4 w-32 animate-pulse rounded bg-gray-200/80" />
        </div>
        <div class="space-y-4 p-5">
          <div v-for="n in 3" :key="n" class="space-y-2">
            <div class="h-4 w-full animate-pulse rounded bg-gray-200/80" />
            <div class="h-3 w-2/3 animate-pulse rounded bg-gray-200/80" />
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
