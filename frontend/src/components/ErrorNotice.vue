<script setup>
import { computed } from 'vue'
import { userError } from '@/services/api/errors'
const props = defineProps({ error: [Object, String], retry: Function })
const notice = computed(() => props.error ? userError(props.error) : null)
</script>
<template>
  <div v-if="notice" role="alert" class="my-3 p-4 rounded-lg bg-red-50 border border-red-200 text-red-800">
    <p>{{ notice.message }}</p>
    <p v-if="notice.requestId" class="text-sm mt-1">Help reference: {{ notice.requestId }}</p>
    <button v-if="retry && notice.retryable" @click="retry()" class="mt-2 underline font-medium">Try again</button>
  </div>
</template>
