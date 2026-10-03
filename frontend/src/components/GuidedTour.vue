<script setup>
import { computed, watch } from 'vue'
import { useRouter } from 'vue-router'
import AppDialog from './AppDialog.vue'
import { tour, advanceTour, pauseTour } from '@/composables/useTour'
const router = useRouter()
const step = computed(() => tour.steps[tour.index])
watch(() => [tour.open, tour.index], async () => { if (tour.open && step.value?.path) await router.push(step.value.path) })
</script>
<template>
  <AppDialog :open="tour.open" :title="step?.title || 'Take the tour'" @close="pauseTour">
    <p class="text-sm text-gray-600 mb-3">Step {{ tour.index + 1 }} of {{ tour.steps.length }}</p>
    <p class="leading-relaxed">{{ step?.description }}</p>
    <p class="text-sm text-gray-600 mt-3">You can close this tour and resume it from Help.</p>
    <div class="flex flex-wrap gap-3 mt-5">
      <button @click="pauseTour" class="secondary">Skip for now</button>
      <button v-if="tour.index > 0" @click="advanceTour(-1)" class="secondary">Back</button>
      <button @click="advanceTour(1)" class="primary">{{ tour.index === tour.steps.length - 1 ? 'Finish tour' : 'Next' }}</button>
    </div>
  </AppDialog>
</template>
