<script setup>
import PosHeader from './PosHeader.vue'
</script>

<template>
  <div class="flex flex-col h-screen bg-gray-100 overflow-hidden font-sans">
    <PosHeader />
    
    <main class="flex-1 flex overflow-hidden max-w-[1600px] w-full mx-auto p-4">
      <div class="flex-1 flex bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <slot />
      </div>
    </main>

    <footer class="bg-white border-t border-gray-200 px-6 py-3">
      <div class="max-w-[1600px] mx-auto flex justify-between text-sm text-gray-500">
        <p>&copy; 2025 Code Collective Pharmacy Management System. All rights reserved.</p>
        <p>Version 0.0.1 | Last updated: October 2025</p>
      </div>
    </footer>
  </div>
</template>
