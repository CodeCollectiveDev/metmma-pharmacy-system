<template>
  <div class="overflow-x-auto">
    <table class="w-full text-sm text-left text-gray-500">
        <thead class="text-xs text-gray-700 uppercase bg-gray-50">
            <tr>
                <th scope="col" class="px-6 py-3">Product Name</th>
                <th scope="col" class="px-6 py-3">Category</th>
                <th scope="col" class="px-6 py-3">Batch #</th>
                <th scope="col" class="px-6 py-3">Expiry</th>
                <th scope="col" class="px-6 py-3">Stock</th>
                <th scope="col" class="px-6 py-3">Price (MWK)</th>
                <th scope="col" class="px-6 py-3">Status</th>
                <th scope="col" class="px-6 py-3">Actions</th>
            </tr>
        </thead>
        <tbody>
            <tr v-for="product in products" :key="product._id" class="bg-white border-b hover:bg-gray-50 transition-colors">
                <td class="px-6 py-4 font-medium text-gray-900">{{ product.name }}</td>
                <td class="px-6 py-4">{{ product.category }}</td>
                <td class="px-6 py-4">{{ product.batchNumber }}</td>
                <td class="px-6 py-4">{{ new Date(product.expiryDate).toLocaleDateString() }}</td>
                <td class="px-6 py-4 font-bold" :class="{'text-red-600': isLowStock(product)}">
                    {{ product.stock }}
                </td>
                <td class="px-6 py-4">MWK {{ product.price.toFixed(2) }}</td>
                <td class="px-6 py-4">
                    <span v-if="isExpired(product)" class="bg-red-100 text-red-800 text-xs font-medium mr-2 px-2.5 py-0.5 rounded">Expired</span>
                    <span v-else-if="isLowStock(product)" class="bg-yellow-100 text-yellow-800 text-xs font-medium mr-2 px-2.5 py-0.5 rounded">Low Stock</span>
                    <span v-else class="bg-green-100 text-green-800 text-xs font-medium mr-2 px-2.5 py-0.5 rounded">OK</span>
                </td>
                <td class="px-6 py-4">
                     <button @click="$emit('edit', product)" class="font-medium text-blue-600 hover:underline mr-3">Edit</button>
                    <!-- <button @click="$emit('delete', product)" class="font-medium text-red-600 hover:underline">Delete</button> -->
                </td>
            </tr>
            <tr v-if="products.length === 0" class="bg-white border-b">
                <td colspan="8" class="px-6 py-4 text-center text-gray-400">No products found.</td>
            </tr>
        </tbody>
    </table>
  </div>
</template>

<script setup>
defineProps({
    products: {
        type: Array,
        required: true
    }
});

const isLowStock = (product) => {
    return product.stock <= (product.minStockLevel || 10);
};

const isExpired = (product) => {
    return new Date(product.expiryDate) < new Date();
};
</script>
