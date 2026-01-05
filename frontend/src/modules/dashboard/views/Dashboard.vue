<template>
  <div class="p-6">
    <DashboardHeader />
    <DashboardStats />
    <DashboardActions />
  </div>
</template>

<script setup>
import DashboardHeader from "@/modules/dashboard/components/DashboardHeader.vue";
import DashboardStats from "@/modules/dashboard/components/DashboardStats.vue";
import DashboardActions from "@/modules/dashboard/components/DashboardActions.vue";
</script>
