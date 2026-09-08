<template>
  <span :class="['status-badge', badgeClass]">
    <span class="status-badge__icon" aria-hidden="true">{{ icon }}</span>
    {{ label }}
  </span>
</template>

<script setup>
import { computed } from 'vue';

const props = defineProps({
  status: {
    type: String,
    default: 'completed'
  }
});

const normalized = computed(() => String(props.status || 'completed').toLowerCase());

const label = computed(() => {
  const map = {
    completed: 'Completed',
    cancelled: 'Cancelled',
    refunded: 'Refunded'
  };
  return map[normalized.value] || props.status;
});

const icon = computed(() => {
  const map = {
    completed: '✓',
    cancelled: '✕',
    refunded: '↻'
  };
  return map[normalized.value] || '•';
});

const badgeClass = computed(() => {
  const map = {
    completed: 'status-badge--completed',
    cancelled: 'status-badge--cancelled',
    refunded: 'status-badge--refunded'
  };
  return map[normalized.value] || 'status-badge--default';
});
</script>

<style scoped>
.status-badge {
  display: inline-flex;
  align-items: center;
  gap: 0.35rem;
  padding: 0.2rem 0.55rem;
  border-radius: 999px;
  font-size: 0.8rem;
  font-weight: 600;
  white-space: nowrap;
}

.status-badge__icon {
  font-size: 0.75rem;
}

.status-badge--completed {
  background: #e8f5e9;
  color: #1b5e20;
}

.status-badge--cancelled {
  background: #ffebee;
  color: #b71c1c;
}

.status-badge--refunded {
  background: #e3f2fd;
  color: #0d47a1;
}

.status-badge--default {
  background: #f5f5f5;
  color: #424242;
}
</style>
