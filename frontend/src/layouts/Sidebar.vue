<script setup>
import { computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { 
  LayoutDashboard, 
  Package, 
  ShoppingCart, 
  Users, 
  FileText, 
  Settings, 
  LogOut,
  ChevronLeft,
  ChevronRight
} from 'lucide-vue-next'

const route = useRoute()
const router = useRouter()

const props = defineProps({
  collapsed: { type: Boolean, default: false }
})

const emit = defineEmits(['toggle'])

const user = computed(() => {
  try {
    return JSON.parse(localStorage.getItem('user') || '{}')
  } catch {
    return {}
  }
})

const role = computed(() => localStorage.getItem('role') || '')

const menuItems = computed(() => {
  const items = [
    { path: '/dashboard', label: 'Dashboard', icon: LayoutDashboard, roles: ['admin', 'store_manager', 'pharmacist', 'hr_officer'] },
    { path: '/pos', label: 'Point of Sale', icon: ShoppingCart, roles: ['cashier', 'admin'] },
    { path: '/inventory', label: 'Inventory', icon: Package, roles: ['admin', 'store_manager', 'pharmacist'] },
    { path: '/hr', label: 'HR Management', icon: Users, roles: ['admin', 'hr_officer'] },
    { path: '/reports', label: 'Reports', icon: FileText, roles: ['admin', 'store_manager', 'pharmacist', 'hr_officer'] },
  ]
  return items.filter(item => item.roles.includes(role.value))
})

const isActive = (path) => route.path === path || route.path.startsWith(path + '/')

const logout = () => {
  localStorage.removeItem('token')
  localStorage.removeItem('role')
  localStorage.removeItem('user')
  router.push('/login')
}
</script>

<template>
  <aside 
    :class="[
      'h-screen bg-slate-900 text-white flex flex-col transition-all duration-300 fixed left-0 top-0 z-40',
      collapsed ? 'w-16' : 'w-64'
    ]"
  >
    <!-- Logo -->
    <div class="p-4 border-b border-slate-700 flex items-center justify-between">
      <div v-if="!collapsed" class="flex items-center gap-3">
        <div class="w-10 h-10 bg-blue-600 rounded-lg flex items-center justify-center font-bold text-lg">
          <img src="@/assets/metmma_pharmacy_logo_white.svg" alt="Pharmacy Logo" class="w-7 h-7 rounded-md object-cover">
        </div>
        <div>
          <div class="font-bold text-sm">METMMA PHARMACY</div>
          <div class="text-xs text-slate-400">Management System</div>
        </div>
      </div>
      <div v-else class="w-10 h-10 bg-blue-600 rounded-lg flex items-center justify-center font-bold text-lg mx-auto">
        M
      </div>
    </div>

    <!-- Menu -->
    <nav class="flex-1 py-4 overflow-y-auto">
      <ul class="space-y-1 px-2">
        <li v-for="item in menuItems" :key="item.path">
          <router-link 
            :to="item.path"
            :class="[
              'flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors',
              isActive(item.path) 
                ? 'bg-blue-600 text-white' 
                : 'text-slate-300 hover:bg-slate-800 hover:text-white'
            ]"
          >
            <component :is="item.icon" class="w-5 h-5 flex-shrink-0" />
            <span v-if="!collapsed" class="text-sm font-medium">{{ item.label }}</span>
          </router-link>
        </li>
      </ul>
    </nav>

    <!-- User Info & Logout -->
    <div class="border-t border-slate-700 p-3">
      <div v-if="!collapsed" class="flex items-center gap-3 mb-3 px-2">
        <div class="w-9 h-9 bg-slate-700 rounded-full flex items-center justify-center text-sm font-medium">
          {{ user.name?.charAt(0) || 'U' }}
        </div>
        <div class="flex-1 min-w-0">
          <div class="text-sm font-medium truncate">{{ user.name || 'User' }}</div>
          <div class="text-xs text-slate-400 capitalize">{{ role }}</div>
        </div>
      </div>
      <button 
        @click="logout"
        :class="[
          'flex items-center gap-3 w-full px-3 py-2 rounded-lg text-slate-300 hover:bg-red-600/20 hover:text-red-400 transition-colors',
          collapsed ? 'justify-center' : ''
        ]"
      >
        <LogOut class="w-5 h-5" />
        <span v-if="!collapsed" class="text-sm">Logout</span>
      </button>
    </div>

    <!-- Toggle Button -->
    <button 
      @click="emit('toggle')"
      class="absolute -right-3 top-20 w-6 h-6 bg-slate-700 rounded-full flex items-center justify-center text-slate-300 hover:bg-slate-600 transition-colors border border-slate-600"
    >
      <ChevronLeft v-if="!collapsed" class="w-4 h-4" />
      <ChevronRight v-else class="w-4 h-4" />
    </button>
  </aside>
</template>
