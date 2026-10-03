<script setup>
import { ref, onMounted, onBeforeUnmount } from 'vue'
import { useRouter } from 'vue-router'
import AppDialog from './AppDialog.vue'
import ErrorNotice from './ErrorNotice.vue'
import PaginationControls from './PaginationControls.vue'
import { dataService } from '@/services/api/dataService'
import { Bell } from 'lucide-vue-next'
const router = useRouter()
const open = ref(false), rows = ref([]), unread = ref(0), pagination = ref(null), error = ref(null), loading = ref(false), busy = ref(false)
let timer
let mounted = true
async function load(page = 1) {
  loading.value = true; error.value = null
  try { const res = await dataService.getNotifications({ page, limit: 20 }); if (mounted) { rows.value = res.data.data; unread.value = res.data.unreadCount; pagination.value = res.data.pagination } }
  catch (err) { if (mounted) { error.value = err; unread.value = 0; rows.value = []; pagination.value = null } }
  finally { if (mounted) loading.value = false }
}
async function mark(item = null, go = false) {
  if (busy.value) return
  busy.value = true; error.value = null
  try {
    if (item) await dataService.readNotification(item.id)
    else await dataService.readAllNotifications()
    await load(pagination.value?.page || 1)
    if (go && item) { open.value = false; await router.push({ path: localStorage.getItem('role') === 'cashier' || localStorage.getItem('role') === 'hr_officer' ? '/help' : '/inventory', query: { product: item.productId } }) }
  } catch (err) { error.value = err }
  finally { busy.value = false }
}
function refresh() { if (!document.hidden) load(open.value ? pagination.value?.page || 1 : 1) }
onMounted(() => { load(); timer = setInterval(refresh, 60000); window.addEventListener('stock-changed', refresh); document.addEventListener('visibilitychange', refresh) })
onBeforeUnmount(() => { mounted = false; clearInterval(timer); window.removeEventListener('stock-changed', refresh); document.removeEventListener('visibilitychange', refresh) })
</script>
<template>
  <button data-tour="notifications" class="relative p-2 rounded-lg hover:bg-gray-100" aria-label="Notifications" title="Read low stock and expiry notices" @click="open = true; load()">
    <Bell class="w-5 h-5" />
    <span v-if="unread > 0" class="absolute -top-1 -right-1 min-w-5 px-1 rounded-full bg-red-700 text-white text-xs">{{ unread > 99 ? '99+' : unread }}</span>
  </button>
  <AppDialog :open="open" title="Notifications" @close="open = false">
    <p class="text-sm text-gray-600 mb-3">These notices use current stock and expiry dates. Reading a notice does not change the product.</p>
    <ErrorNotice :error="error" :retry="load" />
    <p v-if="loading" role="status">Checking notices…</p>
    <button v-if="unread" class="secondary mb-3" :disabled="busy" @click="mark()">Mark all as read</button>
    <ul class="space-y-3">
      <li v-for="item in rows" :key="item.id" :class="['rounded-lg border p-3', item.read ? 'border-gray-200' : 'bg-blue-50 border-blue-300']">
        <p class="text-sm font-medium text-blue-800">{{ item.read ? 'Read' : 'Unread' }}</p>
        <button class="font-semibold text-left underline" :disabled="busy" @click="mark(item, true)">{{ item.title }}</button>
        <p class="mt-1">{{ item.message }}</p>
        <time :datetime="item.time" class="text-sm text-gray-600">{{ new Date(item.time).toLocaleString() }}</time>
        <button v-if="!item.read" class="block mt-2 text-blue-800 underline" :disabled="busy" @click="mark(item)">Mark as read</button>
      </li>
    </ul>
    <div v-if="!loading && !error && rows.length === 0" class="py-5 text-center"><p class="font-medium">No stock or expiry notices.</p><p class="text-sm text-gray-600 my-2">You are up to date. Check again after stock changes.</p><button class="secondary" @click="load()">Check again</button></div>
    <PaginationControls :pagination="pagination" :loading="loading" @change="load" />
  </AppDialog>
</template>
