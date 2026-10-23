<script setup>
import { ref, onMounted } from 'vue'
import MainLayout from '@/layouts/MainLayout.vue'
import AppDialog from '@/components/AppDialog.vue'
import ErrorNotice from '@/components/ErrorNotice.vue'
import { dataService } from '@/services/api/dataService'
import { useCategoryStore } from '@/modules/shared/store/categoryStore'
import { confirmAction } from '@/composables/useFeedback'

const categoryStore = useCategoryStore()
const categories = ref([]), loading = ref(false), error = ref(null), notice = ref(''), saving = ref(false)
const open = ref(false), editing = ref(null), formError = ref(null)
const form = ref({ name: '', sortOrder: 0 })

async function load() {
  loading.value = true; error.value = null
  try {
    const response = await dataService.getCategories({ all: true })
    categories.value = response.data.data
  } catch (err) { error.value = err } finally { loading.value = false }
}
function nextSortOrder() {
  return categories.value.reduce((highest, category) => Math.max(highest, category.sortOrder), 0) + 10
}
function create() {
  editing.value = null; form.value = { name: '', sortOrder: nextSortOrder() }; formError.value = null; open.value = true
}
function edit(category) {
  editing.value = category; form.value = { name: category.name, sortOrder: category.sortOrder }; formError.value = null; open.value = true
}
async function save() {
  if (saving.value) return
  saving.value = true; formError.value = null
  try {
    const body = { name: form.value.name, sortOrder: Number(form.value.sortOrder) }
    if (editing.value) await dataService.updateCategory(editing.value.id, body)
    else await dataService.addCategory(body)
    notice.value = editing.value ? 'Category updated.' : 'Category added.'
    open.value = false
    await load(); await categoryStore.fetchCategories({ force: true })
  } catch (err) { formError.value = err } finally { saving.value = false }
}
async function toggle(category) {
  const action = category.isActive ? 'Deactivate' : 'Activate'
  if (!(await confirmAction(`${action} ${category.name}?`, category.isActive ? 'It will no longer be offered when adding or editing products. Existing products and receipts stay unchanged.' : 'It will be offered again when adding or editing products.', `${action} category`))) return
  saving.value = true; error.value = null
  try {
    await dataService.updateCategory(category.id, { isActive: !category.isActive })
    notice.value = `Category ${category.isActive ? 'deactivated' : 'activated'}.`
    await load(); await categoryStore.fetchCategories({ force: true })
  } catch (err) { error.value = err } finally { saving.value = false }
}
onMounted(load)
</script>

<template>
  <MainLayout title="Product categories" subtitle="Manage the categories offered when adding or editing products">
    <ErrorNotice v-if="!open" :error="error" :retry="load" />
    <p v-if="notice" role="status" class="success-notice mb-4">{{ notice }}</p>
    <div class="panel mb-4 flex flex-wrap items-center justify-between gap-3">
      <p class="text-sm text-slate-600">Categories are never deleted. Deactivating one keeps historic products readable.</p>
      <button class="primary" @click="create">Add category</button>
    </div>
    <p v-if="loading" role="status" class="mb-3">Loading categories…</p>
    <div class="panel overflow-x-auto p-0">
      <table class="w-full min-w-[520px]">
        <thead class="bg-gray-50"><tr><th class="p-3 text-left">Category</th><th class="p-3 text-left">Order</th><th class="p-3 text-left">Status</th><th class="p-3 text-left">Actions</th></tr></thead>
        <tbody>
          <tr v-for="category in categories" :key="category.id" class="border-t border-gray-200">
            <td class="p-3 font-medium">{{ category.name }}</td>
            <td class="p-3">{{ category.sortOrder }}</td>
            <td class="p-3">{{ category.isActive ? 'Active' : 'Inactive' }}</td>
            <td class="p-3"><div class="flex flex-wrap gap-2"><button class="secondary" :disabled="saving" @click="edit(category)">Rename or reorder</button><button class="secondary" :disabled="saving" @click="toggle(category)">{{ category.isActive ? 'Deactivate' : 'Activate' }}</button></div></td>
          </tr>
        </tbody>
      </table>
      <p v-if="!loading && !categories.length" class="p-5">No categories yet. Add the first category.</p>
    </div>
    <AppDialog :open="open" :title="editing ? 'Rename or reorder category' : 'Add category'" :dismissible="!saving" @close="open = false">
      <form v-form-feedback="formError" @submit.prevent="save">
        <ErrorNotice :error="formError" />
        <label class="block">Category name<input v-model.trim="form.name" name="name" required minlength="2" maxlength="100" class="field mt-1" /></label>
        <label class="block mt-3">Order<input v-model.number="form.sortOrder" name="sortOrder" type="number" required min="0" max="1000000" step="1" class="field mt-1" /><span class="block text-xs text-slate-500 mt-1">Lower numbers appear first in the product dropdown and POS filter.</span></label>
        <div class="form-actions"><button type="button" class="secondary" :disabled="saving" @click="open = false">Cancel</button><button class="primary" :disabled="saving">{{ saving ? 'Saving…' : 'Save category' }}</button></div>
      </form>
    </AppDialog>
  </MainLayout>
</template>
