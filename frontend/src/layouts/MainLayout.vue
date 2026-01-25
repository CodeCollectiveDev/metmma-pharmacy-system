<script setup>
import { ref } from 'vue'
import Sidebar from './Sidebar.vue'
import TopBar from './TopBar.vue'

defineProps({
  title: { type: String, required: true },
  subtitle: { type: String, default: '' }
})

const sidebarCollapsed = ref(false)
</script>

<template>
  <div class="min-h-screen bg-gray-50">
    <Sidebar :collapsed="sidebarCollapsed" @toggle="sidebarCollapsed = !sidebarCollapsed" />
    
    <div 
      :class="[
        'transition-all duration-300',
        sidebarCollapsed ? 'ml-16' : 'ml-64'
      ]"
    >
      <TopBar :title="title" :subtitle="subtitle" />
      
      <main class="p-6">
        <slot />
      </main>
    </div>
  </div>
</template>
