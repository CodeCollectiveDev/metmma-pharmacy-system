<script setup>
import { usePosStore } from '../store/posStore'
import { Trash2, Plus, Minus, CreditCard, Banknote, Percent } from 'lucide-vue-next'

const store = usePosStore()
</script>

<template>
  <div class="flex flex-col h-full bg-white border-l border-gray-200">
    <!-- Header -->
    <div class="p-5 border-b border-gray-200 bg-gray-50">
      <h2 class="text-xl font-semibold text-gray-800">Current Order</h2>
      <div class="text-sm text-gray-500 mt-1">Transaction #12345</div>
    </div>

    <!-- Cart Items -->
    <div class="flex-1 overflow-y-auto p-4">
      <div v-if="store.cart.length === 0" class="flex flex-col items-center justify-center h-full text-gray-400">
        <div class="text-4xl mb-3">🛒</div>
        <div>Cart is empty</div>
      </div>

      <div v-else class="space-y-3">
        <div 
          v-for="item in store.cart" 
          :key="item.id"
          class="flex justify-between items-center bg-white p-3 rounded-lg border border-gray-100 shadow-sm"
        >
          <div class="flex-1 min-w-0 mr-3">
            <div class="font-medium text-gray-800 truncate">{{ item.name }}</div>
            <div class="text-sm text-gray-500">${{ item.price.toFixed(2) }}</div>
          </div>

          <div class="flex items-center gap-3">
            <!-- Quantity Controls -->
            <div class="flex items-center border border-gray-200 rounded-md bg-gray-50">
              <button 
                @click="store.updateQuantity(item.id, -1)"
                class="w-7 h-7 flex items-center justify-center text-gray-600 hover:bg-gray-200 rounded-l-md transition-colors"
              >
                <Minus class="w-3 h-3" />
              </button>
              <span class="w-8 text-center text-sm font-medium">{{ item.quantity }}</span>
              <button 
                @click="store.updateQuantity(item.id, 1)"
                class="w-7 h-7 flex items-center justify-center text-gray-600 hover:bg-gray-200 rounded-r-md transition-colors"
              >
                <Plus class="w-3 h-3" />
              </button>
            </div>

            <button 
              @click="store.removeFromCart(item.id)"
              class="p-1.5 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-md transition-colors"
            >
              <Trash2 class="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- Summary & Actions -->
    <div class="p-5 bg-gray-50 border-t border-gray-200">
      <div class="space-y-2 mb-4">
        <div class="flex justify-between text-sm text-gray-600">
          <span>Subtotal</span>
          <span>${{ store.cartTotal.toFixed(2) }}</span>
        </div>
        <div class="flex justify-between text-sm text-gray-600">
          <span>Tax (10%)</span>
          <span>${{ (store.cartTotal * 0.1).toFixed(2) }}</span>
        </div>
        <div class="flex justify-between text-lg font-bold text-blue-700 pt-2 border-t border-gray-200">
          <span>Total</span>
          <span>${{ (store.cartTotal * 1.1).toFixed(2) }}</span>
        </div>
      </div>

      <!-- Action Buttons -->
      <div class="grid grid-cols-2 gap-3 mb-3">
        <button class="flex items-center justify-center gap-2 py-2.5 bg-white border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors font-medium text-sm">
          <Percent class="w-4 h-4" /> Discount
        </button>
        <button @click="store.clearCart" class="flex items-center justify-center gap-2 py-2.5 bg-white border border-red-200 text-red-600 rounded-lg hover:bg-red-50 transition-colors font-medium text-sm">
          <Trash2 class="w-4 h-4" /> Clear
        </button>
      </div>

      <button class="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg shadow-md hover:shadow-lg transition-all font-semibold flex items-center justify-center gap-2">
        <CreditCard class="w-5 h-5" /> Pay Now
      </button>
    </div>
  </div>
</template>
