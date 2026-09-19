<template>
  <div class="min-h-screen bg-gray-100 flex items-center justify-center p-4">
    <div class="bg-white p-5 sm:p-8 rounded-xl shadow-md w-full max-w-md border border-gray-200">
      <div class="flex flex-col items-center mb-6">
        <div class="w-20 h-20 bg-blue-600 rounded-lg flex items-center justify-center text-white mb-3">
          <img src="@/assets/metmma_pharmacy_logo.svg" alt="METMMA Pharmacy Logo" class="w-16 h-12 object-contain">
        </div>
        <h2 class="text-2xl font-bold text-gray-800">METMMA PHARMACY</h2>
        <p class="text-gray-500 text-sm">Sign in to your account</p>
      </div>

      <div v-if="error" class="bg-red-50 text-red-600 p-3 rounded-lg mb-4 text-sm border border-red-100 flex items-center gap-2">
        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-alert-circle"><circle cx="12" cy="12" r="10"/><line x1="12" x2="12" y1="8" y2="12"/><line x1="12" x2="12.01" y1="16" y2="16"/></svg>
        {{ error }}
      </div>

      <form @submit.prevent="login" class="space-y-4">
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1">Email Address</label>
          <input 
            v-model="email" 
            type="text" 
            placeholder="username" 
            class="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
            required
          />
        </div>
        
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1">Password</label>
          <input 
            v-model="password" 
            type="password" 
            placeholder="••••••••" 
            class="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
            required
          />
        </div>

        <button 
          type="submit" 
          class="w-full py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg shadow transition-colors flex justify-center items-center gap-2"
          :disabled="loading"
        >
          <span v-if="loading">Signing in...</span>
          <span v-else>Sign In</span>
        </button>
      </form>

      <div class="mt-6 pt-6 border-t border-gray-200 text-center">
        <p class="text-sm text-gray-500">
          Accounts are provisioned by an administrator.
        </p>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref } from "vue";
import { useRouter } from "vue-router";
import { storeSession } from '@/services/api/apiClient';

const email = ref("");
const password = ref("");
const error = ref("");
const loading = ref(false);
const router = useRouter();

import { authService } from '@/services/api/authService';

async function login() {
  error.value = "";
  loading.value = true;

  try {
    const data = await authService.login(email.value, password.value);
    
    if (data && data.token) {
      // Create session from backend response
      storeSession({
        token: data.token,
        refreshToken: data.refreshToken,
        role: data.user.role.toLowerCase(),
        user: {
          id: data.user.id,
          name: data.user.username,
          email: email.value,
          role: data.user.role.toLowerCase()
        }
      });

      // Role-based redirect
      const role = data.user.role.toLowerCase();
      if (role === 'cashier') {
        router.push("/pos");
      } else {
        router.push("/dashboard");
      }
    } else {
      error.value = "Invalid server response.";
    }
  } catch (err) {
    console.error('[Login] API Error:', err);
    if (err.response && err.response.status === 401) {
      error.value = "Invalid credentials. Please try again.";
    } else {
      // No offline fallback: a valid session requires server connectivity so
      // that authentication and token revocation stay enforceable server-side.
      error.value = "Server unreachable. Login requires an active connection.";
    }
  } finally {
    loading.value = false;
  }
}
</script>
