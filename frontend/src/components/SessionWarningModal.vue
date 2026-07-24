<template>
  <div v-if="showWarning" class="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
    <div class="bg-white rounded-xl shadow-2xl p-6 max-w-sm w-full mx-4 border border-gray-200">
      <div class="flex items-center gap-3 mb-4">
        <div class="w-10 h-10 bg-amber-100 rounded-full flex items-center justify-center">
          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="text-amber-600">
            <circle cx="12" cy="12" r="10"/>
            <line x1="12" x2="12" y1="8" y2="12"/>
            <line x1="12" x2="12.01" y1="16" y2="16"/>
          </svg>
        </div>
        <h3 class="text-lg font-semibold text-gray-800">Session Timeout Warning</h3>
      </div>
      <p class="text-sm text-gray-600 mb-4">
        You will be logged out due to inactivity in <strong class="text-amber-600">{{ countdown }}</strong> seconds.
      </p>
      <div class="flex justify-end gap-3">
        <button
          @click="$emit('dismiss')"
          class="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium"
        >
          Stay Logged In
        </button>
      </div>
    </div>
  </div>
</template>

<script setup>
defineProps({
  showWarning: Boolean,
  countdown: Number
})

defineEmits(['dismiss'])
</script>
