<template>
  <div class="min-h-screen bg-gray-100 flex items-center justify-center p-4">
    <div class="bg-white p-5 sm:p-8 rounded-xl shadow-md w-full max-w-md border border-gray-200">
      <div class="flex flex-col items-center mb-6">
        <div class="w-20 h-20 bg-blue-600 rounded-lg flex items-center justify-center text-white mb-3">
          <img src="@/assets/metmma_pharmacy_logo.svg" alt="METMMA Pharmacy Logo" class="w-16 h-12 object-contain">
        </div>
        <h2 class="text-2xl font-bold text-gray-800">METMMA PHARMACY</h2>
        <p class="text-gray-500 text-sm">Create a staff sign-in account</p>
      </div>

      <div v-if="error" class="bg-red-50 text-red-600 p-3 rounded-lg mb-4 text-sm border border-red-100 flex items-center gap-2">
        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-alert-circle"><circle cx="12" cy="12" r="10"/><line x1="12" x2="12" y1="8" y2="12"/><line x1="12" x2="12.01" y1="16" y2="16"/></svg>
        {{ error }}
      </div>

      <div v-if="success" class="bg-green-50 text-green-600 p-3 rounded-lg mb-4 text-sm border border-green-100 flex items-center gap-2">
        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-check-circle"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
        Account created. You can give the username to your staff member.
      </div>

      <form @submit.prevent="register" class="space-y-4">
        <div>
          <label for="account-username" class="block text-sm font-medium text-gray-700 mb-1">Username</label>
          <input
            id="account-username" v-model="formData.username"
            type="text"
            placeholder="your_username"
            class="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
            required
          />
        </div>

        <div>
          <label for="account-full_name" class="block text-sm font-medium text-gray-700 mb-1">Full Name</label>
          <input
            id="account-full_name" v-model="formData.full_name"
            type="text"
            placeholder="John Doe"
            class="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
            required
          />
        </div>

        <div>
          <label for="account-email" class="block text-sm font-medium text-gray-700 mb-1">Email Address</label>
          <input
            id="account-email" v-model="formData.email"
            type="email"
            placeholder="your@example.com"
            class="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
            required
          />
        </div>

        <div>
          <label for="account-password" class="block text-sm font-medium text-gray-700 mb-1">Password</label>
          <input
            id="account-password" v-model="formData.password"
            type="password"
            placeholder="••••••••"
            class="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
            required
            minlength="10"
          />
          <p class="text-xs text-gray-500 mt-1">Minimum 10 characters</p>
        </div>

        <div>
          <label for="account-role" class="block text-sm font-medium text-gray-700 mb-1">Role</label>
          <select
            id="account-role" v-model="formData.role"
            class="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
            required
          >
            <option value="">Select a role</option>
            <option value="admin">Admin</option>
            <option value="store_manager">Store Manager</option>
            <option value="pharmacist">Pharmacist</option>
            <option value="cashier">Cashier</option>
            <option value="hr_officer">HR Officer</option>
          </select>
        </div>

        <button
          type="submit"
          class="w-full py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg shadow transition-colors flex justify-center items-center gap-2"
          :disabled="loading"
        >
          <span v-if="loading">Creating account...</span>
          <span v-else>Create Account</span>
        </button>
      </form>

      <div class="mt-6 pt-6 border-t border-gray-200 text-center">
        <p class="text-sm text-gray-600">
          Finished?
          <router-link to="/help" class="text-blue-600 hover:text-blue-700 font-medium">
            Back to Help
          </router-link>
        </p>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref } from "vue";
import { authService } from '@/services/api/authService';
import { userError } from '@/services/api/errors';

const formData = ref({
  username: "",
  full_name: "",
  email: "",
  password: "",
  role: "cashier"
});

const error = ref("");
const success = ref(false);
const loading = ref(false);

async function register() {
  error.value = "";
  success.value = false;
  loading.value = true;

  try {
    // Validate
    if (!formData.value.username || !formData.value.full_name || !formData.value.email || !formData.value.password || !formData.value.role) {
      error.value = "All fields are required";
      loading.value = false;
      return;
    }

    if (formData.value.password.length < 10) {
      error.value = "Password must be at least 10 characters";
      loading.value = false;
      return;
    }

    const data = await authService.register(formData.value);

    if (data && data.message) {
      success.value = true;
    } else {
      error.value = "Failed to create account";
    }
  } catch (err) {
    error.value = userError(err).message;
  } finally {
    loading.value = false;
  }
}
</script>
