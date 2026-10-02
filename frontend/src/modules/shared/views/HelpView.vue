<script setup>
import { ref, computed } from 'vue'
import MainLayout from '@/layouts/MainLayout.vue'
import { startTour } from '@/composables/useTour'
const search = ref('')
const role = localStorage.getItem('role')
const topics = [
  ['Sell items', 'Open Sell items. Search by name or code, or scan a barcode and press Enter. Choose a product to add it to the cart. Check the quantity, choose Cash or Card and select Complete Sale. Collect payment using your usual process; this system records it.'],
  ['If a sale fails', 'Your cart stays here. Check your connection and select Retry sale. A retry uses the same checkout reference, so it cannot save the sale twice. If stock or prices changed, check the cart before trying again.'],
  ['Stock and products', 'Inventory shows current stock. Add a product with its code, batch, expiry date and selling price. Add stock records a delivery and its note. Deactivating a product hides it from future sales and keeps past receipts.'],
  ['Past sales', 'Sales shows saved receipts, payment methods and sold items. Cashiers see their own sales. Only an administrator can reverse a sale. A reversal returns the full quantity and records the money returned; it happens only once.'],
  ['Notifications', 'The bell shows unread low stock and expiry notices. Open it to read a notice or mark all as read. Notices change when the product changes. Ask the stock manager about a notice if you cannot open Inventory.'],
  ['Finances', 'Completed sales record income automatically. Administrators and store managers can record expenses, edit them or delete an incorrect entry. Each change is recorded with the person and date. Pharmacists and HR officers can view finances. Choose dates to see income, expenses and the amount left.'],
  ['Staff', 'Administrators and HR officers can view staff and mark attendance. An administrator adds employees or creates sign-in accounts. Staff records and sign-in accounts are separate.'],
  ['Connection and help', 'Stock and money records need a working connection. If an action fails, keep the form open, check the connection and try again. Give the Help reference to your administrator if one is shown.'],
  ['Keyboard and scanner', 'Press Tab to move between controls and Enter to choose a product or confirm a button. Press Esc to close a window. Keep the scanner field selected when using a barcode scanner.'],
  ['Existing offline records', 'Older versions stored pending receipts in this browser. They are kept for review and are not sent automatically. Ask your administrator to compare them with server receipts before entering anything again.']
]
const filtered = computed(() => topics.filter(t => t.join(' ').toLowerCase().includes(search.value.toLowerCase())))
</script>
<template>
  <MainLayout title="Help and tour" subtitle="Short instructions for everyday work">
    <div class="panel mb-4 flex flex-wrap items-center gap-3"><button class="primary" @click="startTour(true)">Take the tour</button><button class="secondary" @click="startTour()">Resume tour</button><router-link v-if="role === 'admin'" to="/register" class="secondary">Create staff account</router-link></div>
    <label class="block mb-4">Find help<input v-model="search" class="field mt-1" placeholder="Search for help" /></label>
    <div class="space-y-3"><details v-for="topic in filtered" :key="topic[0]" class="panel" open><summary class="font-semibold cursor-pointer">{{ topic[0] }}</summary><p class="mt-3 leading-relaxed">{{ topic[1] }}</p></details></div>
    <div v-if="!filtered.length" class="panel"><p>No matching instructions. Try a shorter word or take the tour.</p><button class="primary mt-3" @click="search = ''">Show all help</button></div>
  </MainLayout>
</template>
