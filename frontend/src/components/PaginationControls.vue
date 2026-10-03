<script setup>
const props = defineProps({ pagination: Object, loading: Boolean })
const emit = defineEmits(['change'])
</script>
<template>
  <div v-if="pagination" class="flex flex-wrap items-center gap-3 p-4 border-t border-gray-200">
    <button class="secondary" :disabled="loading || pagination.page <= 1" @click="emit('change', pagination.page - 1)">Previous</button>
    <span>Page {{ pagination.page }} of {{ Math.max(1, pagination.totalPages) }} · {{ pagination.total }} records</span>
    <button class="secondary" :disabled="loading || !pagination.hasMore" @click="emit('change', pagination.page + 1)">Next</button>
  </div>
</template>
