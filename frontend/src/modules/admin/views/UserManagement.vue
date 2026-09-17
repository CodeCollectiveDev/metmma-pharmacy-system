<script setup>
import { ref, onMounted } from 'vue'
import MainLayout from '@/layouts/MainLayout.vue'
import { authService } from '@/services/api/authService'
import { UserPlus, Users, RotateCcw } from 'lucide-vue-next'
import TableSkeleton from '@/modules/shared/components/skeleton/TableSkeleton.vue'

const ROLES = [
  { value: 'super_admin', label: 'Super Admin' },
  { value: 'managing_director', label: 'Managing Director' },
  { value: 'director', label: 'Director' },
  { value: 'pharmacist_manager', label: 'Pharmacist (Manager)' },
  { value: 'pharmacist', label: 'Pharmacist' },
  { value: 'assistant_pharmacist', label: 'Assistant Pharmacist' },
  { value: 'store_manager', label: 'Store Manager' },
  { value: 'cashier', label: 'Cashier' },
  { value: 'hr_officer', label: 'HR Officer' },
]

const users = ref([])
const loading = ref(false)
const showAddForm = ref(false)
const message = ref(null)

const formData = ref({
  username: '',
  full_name: '',
  email: '',
  password: '',
  role: 'cashier'
})

const isMsgError = (msg) => msg?.type === 'error'

onMounted(fetchUsers)

async function fetchUsers() {
  loading.value = true
  try {
    const res = await authService.getUsers()
    users.value = res.data || []
  } catch (err) {
    showMessage(`Failed to load users: ${err.response?.data?.error || err.message}`, 'error')
  } finally {
    loading.value = false
  }
}

const showMessage = (text, type) => {
  message.value = { text, type }
  setTimeout(() => { message.value = null }, 6000)
}

async function saveUser() {
  message.value = null
  if (!formData.value.username || !formData.value.full_name || !formData.value.email || !formData.value.password || !formData.value.role) {
    showMessage('All fields are required', 'error')
    return
  }
  if (formData.value.password.length < 8) {
    showMessage('Password must be at least 8 characters', 'error')
    return
  }

  try {
    const res = await authService.createUser({ ...formData.value })
    showMessage(`Account created for ${res.user.username} (${res.user.role})`, 'success')
    formData.value = { username: '', full_name: '', email: '', password: '', role: 'cashier' }
    showAddForm.value = false
    await fetchUsers()
  } catch (err) {
    if (err.response && err.response.status === 409) {
      showMessage('Username already exists. Choose another.', 'error')
    } else {
      showMessage(err.response?.data?.error || 'Failed to create account', 'error')
    }
  }
}

async function toggleActive(user) {
  const newState = !user.is_active
  try {
    await authService.setUserActive(user.id, newState)
    await fetchUsers()
    showMessage(`${user.username} ${newState ? 'activated' : 'deactivated'}`, 'success')
  } catch (err) {
    showMessage(err.response?.data?.error || 'Failed to update account', 'error')
  }
}

const resetPassword = async (user) => {
  const newPassword = prompt(`Enter a new password for ${user.username}:`)
  if (!newPassword || newPassword.length < 8) {
    showMessage('Password must be at least 8 characters', 'error')
    return
  }
  try {
    await authService.setUserPassword(user.id, newPassword)
    showMessage(`Password updated for ${user.username}`, 'success')
  } catch (err) {
    showMessage(err.response?.data?.error || 'Failed to reset password', 'error')
  }
}
</script>

<template>
  <MainLayout title="User Management" subtitle="Provision and manage system accounts">
    <div v-if="message" :class="['p-3 rounded-lg mb-4 text-sm border flex items-center gap-2', isMsgError(message) ? 'bg-red-50 text-red-600 border-red-100' : 'bg-green-50 text-green-600 border-green-100']">
      {{ message.text }}
    </div>

    <!-- Header -->
    <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-6">
      <div>
        <h3 class="text-lg font-semibold text-gray-800">System Accounts</h3>
        <p class="text-sm text-gray-500">Accounts are only created by an authorized administrator.</p>
      </div>
      <button @click="showAddForm = !showAddForm" class="justify-center px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium flex items-center gap-2 transition-colors">
        <UserPlus class="w-4 h-4" /> Create Account
      </button>
    </div>

    <!-- Create Account Form -->
    <div v-if="showAddForm" class="app-card app-card-body mb-6">
      <h3 class="app-section-title mb-4">Create New Account</h3>
      <form @submit.prevent="saveUser" class="grid grid-cols-1 md:grid-cols-3 gap-4">
        <input v-model="formData.full_name" type="text" placeholder="Full Name *" required class="px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none">
        <input v-model="formData.username" type="text" placeholder="Username *" required class="px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none">
        <input v-model="formData.email" type="email" placeholder="Email *" required class="px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none">
        <input v-model="formData.password" type="password" placeholder="Password (min 8 chars) *" required minlength="8" class="px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none">
        <select v-model="formData.role" required class="px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none">
          <option value="" disabled>Select role *</option>
          <option v-for="r in ROLES" :key="r.value" :value="r.value">{{ r.label }}</option>
        </select>
        <div class="flex justify-end gap-3 md:col-span-1">
          <button type="button" @click="showAddForm = false" class="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors">Cancel</button>
          <button type="submit" class="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors">Create User</button>
        </div>
      </form>
    </div>

    <!-- Users Table -->
    <TableSkeleton v-if="loading" />
    <div v-else class="app-card overflow-hidden">
      <div class="overflow-x-auto">
        <table class="w-full min-w-[700px]">
          <thead class="bg-gray-50 border-b border-gray-100">
            <tr>
              <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">User</th>
              <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Email</th>
              <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Role</th>
              <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
              <th class="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Actions</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-gray-100">
            <tr v-for="user in users" :key="user.id" class="hover:bg-gray-50">
              <td class="px-6 py-4">
                <div class="flex items-center gap-3">
                  <div class="w-10 h-10 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center font-medium">
                    {{ user.full_name?.charAt(0) || user.username?.charAt(0) }}
                  </div>
                  <div>
                    <p class="font-medium text-gray-800">{{ user.full_name }}</p>
                    <p class="text-sm text-gray-500">@{{ user.username }}</p>
                  </div>
                </div>
              </td>
              <td class="px-6 py-4 text-gray-600">{{ user.email || '-' }}</td>
              <td class="px-6 py-4"><span class="px-2 py-1 rounded-full text-xs font-medium bg-blue-50 text-blue-700 capitalize">{{ user.role.replace(/_/g, ' ') }}</span></td>
              <td class="px-6 py-4">
                <span :class="['px-2 py-1 rounded-full text-xs font-medium', user.is_active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600']">
                  {{ user.is_active ? 'Active' : 'Disabled' }}
                </span>
              </td>
              <td class="px-6 py-4 text-right space-x-2">
                <button @click="resetPassword(user)" class="px-2 py-1 text-sm text-gray-600 hover:bg-gray-100 rounded-lg transition-colors inline-flex items-center gap-1">
                  <RotateCcw class="w-3.5 h-3.5" /> Reset
                </button>
                <button @click="toggleActive(user)" class="px-2 py-1 text-sm text-red-600 hover:bg-red-50 rounded-lg transition-colors">
                  {{ user.is_active ? 'Disable' : 'Enable' }}
                </button>
              </td>
            </tr>
            <tr v-if="users.length === 0">
              <td colspan="5" class="px-6 py-8 text-center text-gray-400">
                <Users class="w-6 h-6 mx-auto mb-2" /> No accounts yet
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  </MainLayout>
</template>