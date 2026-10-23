<script setup>
import { onMounted } from 'vue'
import { useCategoryStore } from '@/modules/shared/store/categoryStore'

const props = defineProps({
  name: { type: String, default: 'category' },
  required: { type: Boolean, default: false },
  disabled: { type: Boolean, default: false }
})
const model = defineModel({ type: String, default: '' })
const store = useCategoryStore()

onMounted(() => {
  if (!store.loaded && !store.loading) store.fetchCategories()
})

function retry() {
  store.fetchCategories({ force: true })
}
</script>

<template>
  <div>
    <select :id="props.name" v-model="model" :name="props.name" :required="props.required" :disabled="props.disabled || store.loading || !!store.error" class="field mt-1">
      <option value="" disabled>{{ store.loading ? 'Loading categories…' : store.error ? 'Categories could not load' : 'Choose a category' }}</option>
      <option v-for="category in store.categories" :key="category.id" :value="category.name">{{ category.name }}</option>
    </select>
    <p v-if="store.error" role="alert" class="text-sm text-red-800 mt-1">Categories could not load. <button type="button" class="underline" @click="retry">Try again</button></p>
  </div>
</template>
