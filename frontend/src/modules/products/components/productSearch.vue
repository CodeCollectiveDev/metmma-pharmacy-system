<template>
  <div>
    <input
      type="text"
      placeholder="Search products..."
      v-model="search"
      class="border p-2 w-full"
    />

    <p v-if="loading">Searching...</p>  
    <p v-if="!loading && products.length === 0 && search">
      No products found
    </p>

    <ul>
      <li v-for="product in products" :key="product.id">
        {{ product.name }}
      </li>
    </ul>
  </div>
</template>

<script setup>
import { ref, watch } from "vue";
import { searchProducts } from "@/services/productService";

const search = ref("");
const products = ref([]);
const loading = ref(false);

let timeout = null;

// Debounced search
watch(search, (newValue) => {
  clearTimeout(timeout);

  timeout = setTimeout(async () => {
    if (!newValue) {
      products.value = [];
      return;
    }

    loading.value = true;

    try {
      products.value = await searchProducts(newValue);
    } catch (error) {
      console.error(error);
      products.value = [];
    } finally {
      loading.value = false;
    }
  }, 400);
});
</script>
