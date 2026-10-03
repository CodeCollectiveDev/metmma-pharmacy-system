import { ref, onBeforeUnmount } from 'vue'
export function usePage(fetcher) {
  const rows = ref([]), pagination = ref(null), loading = ref(false), error = ref(null)
  let generation = 0
  async function load(params = {}) {
    const current = ++generation
    loading.value = true; error.value = null
    try {
      const res = await fetcher({ page: 1, limit: 25, ...params })
      if (current === generation) { rows.value = res.data.data; pagination.value = res.data.pagination }
    } catch (err) { if (current === generation) { rows.value = []; pagination.value = null; error.value = err } }
    finally { if (current === generation) loading.value = false }
  }
  onBeforeUnmount(() => { generation++ })
  return { rows, pagination, loading, error, load }
}
