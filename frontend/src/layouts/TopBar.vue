<script setup>
import { computed } from 'vue'
import { Bell, HelpCircle, Menu } from 'lucide-vue-next'

defineProps({
  title: { type: String, required: true },
  subtitle: { type: String, default: '' }
})
defineEmits(['toggle-menu'])

const currentDate = computed(() => {
  return new Date().toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  })
})
</script>

<template>
  <header class="bg-white border-b border-gray-200 px-4 py-3 sm:px-6 sm:py-4 flex items-center justify-between gap-3">
    <div class="flex min-w-0 items-center gap-2">
      <button @click="$emit('toggle-menu')" class="-ml-1 p-2 text-gray-600 hover:bg-gray-100 rounded-lg md:hidden" aria-label="Open navigation menu">
        <Menu class="w-5 h-5" />
      </button>
      <div class="min-w-0">
      <h1 class="truncate text-lg sm:text-xl font-bold text-gray-800">{{ title }}</h1>
      <p v-if="subtitle" class="text-sm text-gray-500 mt-0.5">{{ subtitle }}</p>
      </div>
    </div>

    <div class="flex shrink-0 items-center gap-1 sm:gap-4">
      <div class="text-sm text-gray-500 hidden md:block">{{ currentDate }}</div>
      
      <router-link to="/help" class="p-2 text-gray-500 hover:bg-gray-100 rounded-lg transition-colors" title="Help Center">
        <HelpCircle class="w-5 h-5" />
      </router-link>

      <button class="relative p-2 text-gray-500 hover:bg-gray-100 rounded-lg transition-colors">
        <Bell class="w-5 h-5" />
        <span class="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full"></span>
      </button>
    </div>
  </header>
</template>
