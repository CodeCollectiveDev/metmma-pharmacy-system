<template>
  <nav class="pagination" aria-label="Sales pagination">
    <p class="pagination__summary">
      Showing {{ rangeStart }}–{{ rangeEnd }} of {{ total }} transactions
    </p>

    <div class="pagination__controls">
      <button
        type="button"
        class="pagination__btn"
        :disabled="page <= 1"
        @click="$emit('change', page - 1)"
      >
        Previous
      </button>

      <button
        v-for="pageNum in visiblePages"
        :key="pageNum"
        type="button"
        class="pagination__btn"
        :class="{ 'pagination__btn--active': pageNum === page }"
        :disabled="pageNum === '...'"
        @click="pageNum !== '...' && $emit('change', pageNum)"
      >
        {{ pageNum }}
      </button>

      <button
        type="button"
        class="pagination__btn"
        :disabled="page >= totalPages || totalPages === 0"
        @click="$emit('change', page + 1)"
      >
        Next
      </button>
    </div>
  </nav>
</template>

<script setup>
import { computed } from 'vue';

const props = defineProps({
  page: { type: Number, required: true },
  limit: { type: Number, required: true },
  total: { type: Number, required: true },
  totalPages: { type: Number, required: true }
});

defineEmits(['change']);

const rangeStart = computed(() => {
  if (props.total === 0) return 0;
  return (props.page - 1) * props.limit + 1;
});

const rangeEnd = computed(() => {
  return Math.min(props.page * props.limit, props.total);
});

const visiblePages = computed(() => {
  const total = props.totalPages;
  const current = props.page;
  if (total <= 7) {
    return Array.from({ length: total }, (_, i) => i + 1);
  }

  const pages = new Set([1, total, current, current - 1, current + 1]);
  const sorted = [...pages].filter((p) => p >= 1 && p <= total).sort((a, b) => a - b);
  const result = [];

  for (let i = 0; i < sorted.length; i++) {
    if (i > 0 && sorted[i] - sorted[i - 1] > 1) {
      result.push('...');
    }
    result.push(sorted[i]);
  }
  return result;
});
</script>

<style scoped>
.pagination {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 0.75rem;
  margin-top: 1rem;
}

.pagination__summary {
  margin: 0;
  color: #546e7a;
  font-size: 0.9rem;
}

.pagination__controls {
  display: flex;
  flex-wrap: wrap;
  gap: 0.35rem;
}

.pagination__btn {
  border: 1px solid #cfd8dc;
  background: #fff;
  color: #37474f;
  border-radius: 0.4rem;
  padding: 0.35rem 0.7rem;
  font-size: 0.85rem;
  cursor: pointer;
}

.pagination__btn:hover:not(:disabled) {
  border-color: #2e7d32;
  color: #2e7d32;
}

.pagination__btn:disabled {
  opacity: 0.45;
  cursor: not-allowed;
}

.pagination__btn--active {
  background: #2e7d32;
  border-color: #2e7d32;
  color: #fff;
}
</style>
