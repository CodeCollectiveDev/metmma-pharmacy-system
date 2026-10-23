<script setup>
import { computed } from 'vue'
const props = defineProps({ section: String })
const role = localStorage.getItem('role')
const links = computed(() => props.section === 'team'
  ? [{ path: '/hr', label: 'Staff records' }, { path: '/leave', label: 'Leave' }, ...(role === 'admin' ? [{ path: '/accounts', label: 'Sign-in accounts' }, { path: '/pharmacy-profile', label: 'Pharmacy profile' }] : [])]
  : [{ path: '/sales', label: 'Receipts' }, ...(['admin', 'store_manager', 'pharmacist', 'hr_officer'].includes(role) ? [{ path: '/finances', label: 'Income & expenses' }, { path: '/reports', label: 'Reports' }] : [])])
</script>
<template>
  <nav :aria-label="section === 'team' ? 'Staff tools' : 'Sales and money tools'" class="section-nav">
    <router-link v-for="link in links" :key="link.path" :to="link.path" active-class="is-active">{{ link.label }}</router-link>
  </nav>
</template>
