<template>
  <div v-if="isOpen" class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
    <div class="bg-white rounded-lg shadow-xl p-8 max-w-md w-full mx-4">
      <div class="flex justify-center mb-4">
        <div class="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center">
          <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="text-red-600">
            <circle cx="12" cy="12" r="10"/>
            <line x1="12" x2="12" y1="8" y2="12"/>
            <line x1="12" x2="12.01" y1="16" y2="16"/>
          </svg>
        </div>
      </div>
      
      <h2 class="text-2xl font-bold text-gray-800 text-center mb-2">Access Denied</h2>
      <p class="text-gray-600 text-center mb-6">
        You don't have permission to access this feature. 
        <span class="font-semibold">Your current role is: {{ role }}</span>
      </p>
      
      <p class="text-gray-500 text-sm text-center mb-6">
        Please sign in with an account that has the required permissions.
      </p>

      <div class="space-y-3">
        <button
          @click="goToLogin"
          class="w-full py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors"
        >
          Sign In Again
        </button>
        <button
          @click="goBack"
          class="w-full py-2.5 bg-gray-200 hover:bg-gray-300 text-gray-800 font-medium rounded-lg transition-colors"
        >
          Go Back
        </button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, watch } from 'vue';
import { useRouter } from 'vue-router';

const router = useRouter();
const isOpen = ref(false);
const role = ref('');

const showModal = (userRole) => {
  role.value = userRole || 'unknown';
  isOpen.value = true;
};

const goToLogin = () => {
  // Clear session
  localStorage.removeItem('token');
  localStorage.removeItem('role');
  localStorage.removeItem('user');
  isOpen.value = false;
  router.push('/login');
};

const goBack = () => {
  isOpen.value = false;
  router.back();
};

defineExpose({ showModal });
</script>
