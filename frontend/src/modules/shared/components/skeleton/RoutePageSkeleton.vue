<script setup>
import StatCardsSkeleton from './StatCardsSkeleton.vue'
import TableSkeleton from './TableSkeleton.vue'
</script>

<template>
  <div class="min-h-screen bg-gray-50" aria-busy="true" aria-label="Loading page">
    <div class="hidden md:block fixed left-0 top-0 z-40 h-screen w-64 animate-pulse bg-slate-800/40" />
    <div class="md:ml-64">
      <div class="border-b border-gray-200 bg-white px-4 py-4 sm:px-6">
        <div class="h-6 w-48 animate-pulse rounded bg-gray-200/80" />
        <div class="mt-2 h-4 w-64 animate-pulse rounded bg-gray-200/80" />
      </div>
      <main class="space-y-6 p-4 sm:p-6">
        <StatCardsSkeleton />
        <TableSkeleton />
      </main>
    </div>
  </div>
</template>
