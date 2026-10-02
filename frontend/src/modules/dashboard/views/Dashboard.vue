<script setup>
import { ref, onMounted } from 'vue'
import MainLayout from '@/layouts/MainLayout.vue'
import ErrorNotice from '@/components/ErrorNotice.vue'
import { dataService } from '@/services/api/dataService'
import { currency } from '@/services/api/money'
const data = ref(null), error = ref(null), loading = ref(false), role = localStorage.getItem('role')
async function load() { loading.value = true; error.value = null; data.value = null; try { data.value = (await dataService.getDashboard()).data } catch (err) { error.value = err } finally { loading.value = false } }
onMounted(load)
</script>
<template>
  <MainLayout title="Dashboard" subtitle="Your pharmacy at a glance">
    <ErrorNotice :error="error" :retry="load" /><p v-if="loading" role="status">Loading current figures…</p>
    <div v-if="data" class="grid sm:grid-cols-3 gap-4 mb-4"><div class="panel">Total Products<strong class="block text-2xl">{{ data.products.total }}</strong></div><div class="panel">Low Stock Alerts<strong class="block text-2xl">{{ data.products.low }}</strong></div><div class="panel">Today's sales<strong class="block text-2xl">{{ currency(data.todaySales) }}</strong></div></div>
    <div class="panel mb-4"><h2 class="text-lg font-bold mb-3">What would you like to do?</h2><div class="flex flex-wrap gap-3"><router-link v-if="['admin','pharmacist'].includes(role)" to="/pos" class="primary">Sell items</router-link><router-link v-if="role !== 'hr_officer'" to="/inventory" class="secondary">Check stock</router-link><router-link to="/sales" class="secondary">Find a sale</router-link><router-link to="/finances" class="secondary">View finances</router-link><router-link to="/help" class="secondary">Help and tour</router-link></div></div>
    <div v-if="data" class="panel"><h2 class="text-lg font-bold mb-3">Stock needing attention</h2><ul><li v-for="item in data.lowStock" :key="item.id" class="border-t py-3"><span>{{ item.name }} · {{ item.quantity }} units left</span><router-link v-if="role !== 'hr_officer'" :to="{path:'/inventory',query:{product:item.id}}" class="ml-3 text-blue-800 underline">Open product</router-link></li></ul><div v-if="!data.lowStock.length"><p>No low stock items. Stock notices appear here when products reach their threshold.</p><router-link to="/help" class="inline-block secondary mt-3">Learn about stock notices</router-link></div></div>
  </MainLayout>
</template>
