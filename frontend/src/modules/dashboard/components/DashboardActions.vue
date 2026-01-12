<template>
  <div class="flex gap-4">
        <button
        class="bg-blue-600 text-white px-4 py-2 rounded"
        >
        View Products
        </button>

        <button
        v-if="role === 'admin'"
        class="bg-red-600 text-white px-4 py-2 rounded"
        >
        Admin Panel
        </button>
  </div>
</template>

<script setup>
const role = localStorage.getItem("role");
</script>