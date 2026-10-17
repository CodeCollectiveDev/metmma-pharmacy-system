<script setup>
import MainLayout from '@/layouts/MainLayout.vue'
import AttendancePanel from '../components/AttendancePanel.vue'
</script>

<template>
  <MainLayout title="Attendance" subtitle="Record today’s attendance and review previous days">
    <AttendancePanel />
  </MainLayout>
</template>
