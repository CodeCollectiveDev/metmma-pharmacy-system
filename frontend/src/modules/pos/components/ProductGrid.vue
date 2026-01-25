<script setup>
import { onMounted } from 'vue'
import { usePosStore } from '../store/posStore'
import { Search } from 'lucide-vue-next'

const store = usePosStore()

onMounted(() => {
  store.fetchProducts()
})

const categories = ['All', 'Antibiotics', 'Painkillers', 'Vitamins', 'Cough & Cold', 'First Aid', 'Diagnostics']

const setCategory = (cat) => {
  store.selectedCategory = cat
}
</script>

<template>
  <div class="flex flex-col h-full bg-gray-50 border-r border-gray-200">
    <!-- Header: Search & Filter -->
    <div class="bg-white p-5 border-b border-gray-200">
      <h2 class="text-xl font-semibold text-gray-800 mb-4">Products</h2>
      
      <!-- Search -->
      <div class="relative mb-4">
        <input 
          v-model="store.searchQuery"
          type="text" 
          placeholder="Search items..." 
          class="w-full pl-10 pr-4 py-2.5 bg-white border border-gray-200 rounded-lg focus:outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600 transition-all text-sm"
        >
        <Search class="w-4 h-4 absolute left-3.5 top-3 text-gray-400" />
      </div>

      <!-- Categories -->
      <div class="flex flex-wrap gap-2">
        <button 
          v-for="cat in categories" 
          :key="cat"
          @click="setCategory(cat)"
          :class="[
            'px-3 py-1.5 text-xs font-medium rounded-full border transition-all',
            store.selectedCategory === cat 
              ? 'bg-blue-600 text-white border-blue-600' 
              : 'bg-white text-gray-600 border-gray-200 hover:border-blue-400'
          ]"
        >
          {{ cat }}
        </button>
      </div>
    </div>

    <!-- Grid -->
    <div class="flex-1 p-5 overflow-y-auto">
      <div class="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        <div 
          v-for="product in store.filteredProducts" 
          :key="product.id"
          @click="store.addToCart(product)"
          class="bg-white border border-gray-200 rounded-lg p-4 cursor-pointer hover:border-blue-500 hover:shadow-sm transition-all group"
        >
          <div class="font-medium text-gray-800 mb-1 group-hover:text-blue-700">{{ product.name }}</div>
          <div class="text-lg font-bold text-blue-600 mb-1">${{ product.price.toFixed(2) }}</div>
          <div class="text-xs text-gray-500 flex justify-between">
            <span>{{ product.category }}</span>
            <span :class="{'text-red-500 font-medium': product.stock < 20}">{{ product.stock }} in stock</span>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
