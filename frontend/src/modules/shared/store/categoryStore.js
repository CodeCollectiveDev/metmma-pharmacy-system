import { defineStore } from 'pinia'
import { ref } from 'vue'
import { dataService } from '@/services/api/dataService'

export const useCategoryStore = defineStore('categories', () => {
  const categories = ref([]), loading = ref(false), error = ref(null), loaded = ref(false)
  let generation = 0

  async function fetchCategories({ force = false } = {}) {
    if (loaded.value && !force) return categories.value
    const current = ++generation
    loading.value = true; error.value = null
    try {
      const response = await dataService.getCategories()
      if (current === generation) {
        categories.value = response.data.data || []
        loaded.value = true
      }
    } catch (err) {
      if (current === generation) {
        categories.value = []
        loaded.value = false
        error.value = err
      }
    } finally {
      if (current === generation) loading.value = false
    }
    return categories.value
  }

  function reset() {
    generation++; categories.value = []; loading.value = false; error.value = null; loaded.value = false
  }

  return { categories, loading, error, loaded, fetchCategories, reset }
})
