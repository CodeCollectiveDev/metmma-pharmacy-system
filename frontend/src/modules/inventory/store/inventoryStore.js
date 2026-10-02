import { defineStore } from 'pinia'
import { ref } from 'vue'
import { dataService } from '@/services/api/dataService'
export const useInventoryStore = defineStore('inventory', () => {
  const products = ref([]), loading = ref(false), error = ref(null), pagination = ref(null), summary = ref({ total: 0, low: 0, expired: 0 })
  let generation = 0
  async function fetchProducts(params = {}) {
    const current = ++generation; loading.value = true; error.value = null
    try { const res = await dataService.getProductPage({ page: 1, limit: 25, ...params }); if (current === generation) { products.value = res.data.data; pagination.value = res.data.pagination } }
    catch (err) { if (current === generation) error.value = err }
    finally { if (current === generation) loading.value = false }
  }
  async function refreshSummary() { try { summary.value = (await dataService.getProductSummary()).data } catch (err) { error.value = err } }
  return { products, loading, error, pagination, summary, fetchProducts, refreshSummary }
})
