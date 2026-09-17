<template>
  <div class="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
    <h3 class="font-semibold text-gray-800 mb-4">Quick Actions</h3>
    <div class="flex flex-wrap gap-4">
      <button
        @click="$router.push('/pos')"
        class="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-5 py-2.5 rounded-lg transition-colors font-medium shadow-sm"
      >
        <span class="text-lg">💰</span> Open POS
      </button>

      <button
        class="flex items-center gap-2 bg-white border border-gray-200 text-gray-700 hover:bg-gray-50 px-5 py-2.5 rounded-lg transition-colors font-medium"
      >
        <span class="text-lg">📦</span> Manage Inventory
      </button>

      <button
        v-if="role === 'super_admin' || role === 'managing_director'"
        @click="$router.push('/users')"
        class="flex items-center gap-2 bg-white border border-gray-200 text-gray-700 hover:bg-gray-50 px-5 py-2.5 rounded-lg transition-colors font-medium"
      >
        <span class="text-lg">⚙️</span> Admin Settings
      </button>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'

const role = ref('')

onMounted(() => {
  role.value = localStorage.getItem("role") || ''
})
</script>