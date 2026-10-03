<template>
  <div class="min-h-screen bg-gray-100 flex items-center justify-center p-4">
    <div class="bg-white rounded-lg shadow-lg p-8 max-w-md w-full text-center">
      <div class="mb-6">
        <h1 class="text-2xl font-bold text-gray-800">We could not find this page</h1>
      </div>

      <p class="text-gray-600 mb-6">
        The page you're looking for doesn't exist or has been moved.
      </p>

      <div class="space-y-3">
        <router-link
          :to="home"
          class="block w-full py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors"
        >
          Back to my work
        </router-link>
        <button
          @click="$router.back()"
          class="block w-full py-2.5 bg-gray-200 hover:bg-gray-300 text-gray-800 font-medium rounded-lg transition-colors"
        >
          Go Back
        </button>
      </div>

    </div>
  </div>
</template>

<script setup>
const home = !localStorage.getItem('token') ? '/login' : localStorage.getItem('role') === 'cashier' ? '/pos' : '/dashboard'
</script>
