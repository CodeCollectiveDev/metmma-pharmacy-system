<script setup>
import { ref } from 'vue'
import Sidebar from './Sidebar.vue'
import TopBar from './TopBar.vue'

defineProps({
  title: { type: String, required: true },
  subtitle: { type: String, default: '' }
})

const sidebarCollapsed = ref(false)
const mobileMenuOpen = ref(false)
</script>

<template>
  <div class="min-h-screen bg-gray-50">
    <Sidebar
      :collapsed="sidebarCollapsed"
      :mobile-open="mobileMenuOpen"
      @toggle="sidebarCollapsed = !sidebarCollapsed"
      @close="mobileMenuOpen = false"
    />
    <button
      v-if="mobileMenuOpen"
      aria-label="Close navigation menu"
      class="fixed inset-0 z-30 bg-slate-950/40 md:hidden"
      @click="mobileMenuOpen = false"
    />
    
    <div 
      :class="[
        'transition-all duration-300',
        sidebarCollapsed ? 'md:ml-16' : 'md:ml-64'
      ]"
    >
      <TopBar :title="title" :subtitle="subtitle" @toggle-menu="mobileMenuOpen = true" />
      
      <main class="p-4 sm:p-6">
        <slot />
      </main>
    </div>
  </div>
</template>
