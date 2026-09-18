<template>
  <div class="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
    <h2 class="text-lg font-semibold text-gray-800 mb-4">Add New Product</h2>
    
    <form @submit.prevent="saveProduct" class="space-y-4">
      <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1">Product Name</label>
          <input v-model="form.name" type="text" required class="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" placeholder="e.g. Amoxicillin">
        </div>
        
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1">Category</label>
          <select v-model="form.category" class="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none">
            <option>Antibiotics</option>
            <option>Painkillers</option>
            <option>Vitamins</option>
            <option>Cough & Cold</option>
            <option>First Aid</option>
             <option>Diagnostics</option>
             <option>Other</option>
          </select>
        </div>

        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1">Barcode</label>
          <input v-model="form.barcode" type="text" inputmode="numeric" class="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" placeholder="Scan or enter barcode">
        </div>

        <div>
           <label class="block text-sm font-medium text-gray-700 mb-1">Batch Number</label>
           <input v-model="form.batchNumber" type="text" required class="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" placeholder="BATCH123">
        </div>

         <div>
           <label class="block text-sm font-medium text-gray-700 mb-1">Expiry Date</label>
           <input v-model="form.expiryDate" type="date" required class="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none">
        </div>

        <div>
           <label class="block text-sm font-medium text-gray-700 mb-1">Supplier</label>
           <input v-model="form.supplier" type="text" required class="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" placeholder="Supplier Name">
        </div>

         <div>
           <label class="block text-sm font-medium text-gray-700 mb-1">Price (MWK)</label>
           <input v-model.number="form.price" type="number" step="0.01" required class="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" placeholder="0.00">
        </div>
        
         <div>
           <label class="block text-sm font-medium text-gray-700 mb-1">Quantity</label>
           <input v-model.number="form.stock" type="number" required class="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" placeholder="0">
        </div>

         <div>
           <label class="block text-sm font-medium text-gray-700 mb-1">Min Stock Level</label>
           <input v-model.number="form.minStockLevel" type="number" class="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" placeholder="10">
        </div>
      </div>

      <div class="flex justify-end gap-3 mt-6">
        <button type="button" @click="$emit('cancel')" class="px-4 py-2 text-gray-600 hover:bg-gray-50 rounded-lg">Cancel</button>
        <button type="submit" class="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium shadow-sm transition-colors" :disabled="loading">
            {{ loading ? 'Saving...' : 'Save Product' }}
        </button>
      </div>
    </form>
  </div>
</template>

<script setup>
import { reactive, ref } from 'vue';
import { useInventoryStore } from '../store/inventoryStore';

const emit = defineEmits(['save', 'cancel']);
const store = useInventoryStore();
const loading = ref(false);

const form = reactive({
    name: '',
  barcode: '',
    category: 'Antibiotics',
    batchNumber: '',
    expiryDate: '',
    supplier: '',
    price: null,
    stock: null,
    minStockLevel: 10
});

const saveProduct = async () => {
    loading.value = true;
    const success = await store.addProduct({ ...form });
    loading.value = false;
    
    if (success) {
        emit('save');
        // Reset form
        Object.keys(form).forEach(key => form[key] = '');
        form.category = 'Antibiotics';
        form.minStockLevel = 10;
        alert('Product added successfully!');
    } else {
        alert('Failed to add product.');
    }
}
</script>
