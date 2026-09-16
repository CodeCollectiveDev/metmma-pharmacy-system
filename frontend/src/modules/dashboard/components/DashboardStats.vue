<script setup>
import { Package, ShoppingCart, Users, DollarSign } from 'lucide-vue-next'
</script>

<template>
  <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
    <div class="bg-white p-6 rounded-xl shadow-sm border border-gray-100 flex items-center">
      <div class="p-3 rounded-full bg-blue-50 text-blue-600 mr-4">
        <Package class="w-6 h-6" />
      </div>
      <div>
        <h3 class="text-sm font-medium text-gray-500">Total Products</h3>
        <p class="text-2xl font-bold text-gray-800">120</p>
      </div>
    </div>

    <div class="bg-white p-6 rounded-xl shadow-sm border border-gray-100 flex items-center">
      <div class="p-3 rounded-full bg-green-50 text-green-600 mr-4">
        <ShoppingCart class="w-6 h-6" />
      </div>
      <div>
        <h3 class="text-sm font-medium text-gray-500">Today's Orders</h3>
        <p class="text-2xl font-bold text-gray-800">45</p>
      </div>
    </div>

    <div class="bg-white p-6 rounded-xl shadow-sm border border-gray-100 flex items-center">
      <div class="p-3 rounded-full bg-purple-50 text-purple-600 mr-4">
        <Users class="w-6 h-6" />
      </div>
      <div>
        <h3 class="text-sm font-medium text-gray-500">Active Staff</h3>
        <p class="text-2xl font-bold text-gray-800">8</p>
      </div>
    </div>
    
    <div class="bg-white p-6 rounded-xl shadow-sm border border-gray-100 flex items-center">
      <div class="p-3 rounded-full bg-orange-50 text-orange-600 mr-4">
        <DollarSign class="w-6 h-6" />
      </div>
      <div>
        <h3 class="text-sm font-medium text-gray-500">Revenue</h3>
        <p class="text-2xl font-bold text-gray-800">$1,250</p>
      </div>
    </div>
  </div>
</template>
