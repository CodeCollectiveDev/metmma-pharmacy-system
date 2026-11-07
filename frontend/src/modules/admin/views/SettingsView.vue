<script setup>
import { computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import MainLayout from '@/layouts/MainLayout.vue'
import PharmacyProfilePanel from '@/modules/admin/components/PharmacyProfilePanel.vue'
import CategoriesPanel from '@/modules/admin/components/CategoriesPanel.vue'

const route = useRoute()
const router = useRouter()

const tabs = [
  { id: 'profile', label: 'Pharmacy profile' },
  { id: 'categories', label: 'Product categories' }
]

const activeTab = computed(() => route.query.tab === 'categories' ? 'categories' : 'profile')

function selectTab(id) {
  router.replace({ path: '/settings', query: { ...route.query, tab: id } })
}
</script>

<template>
  <MainLayout title="Settings" subtitle="Pharmacy profile and product categories">
    <div class="mb-4 flex flex-wrap gap-2 border-b border-gray-200" role="tablist" aria-label="Settings sections">
      <button
        v-for="tab in tabs"
        :key="tab.id"
        type="button"
        role="tab"
        :id="`settings-tab-${tab.id}`"
        :aria-selected="activeTab === tab.id"
        :aria-controls="`settings-panel-${tab.id}`"
        :tabindex="activeTab === tab.id ? 0 : -1"
        class="-mb-px border-b-2 px-4 py-2 text-sm font-medium transition-colors"
        :class="activeTab === tab.id ? 'border-blue-600 text-blue-700' : 'border-transparent text-slate-600 hover:border-slate-300 hover:text-slate-900'"
        @click="selectTab(tab.id)"
      >
        {{ tab.label }}
      </button>
    </div>
    <div
      v-show="activeTab === 'profile'"
      role="tabpanel"
      id="settings-panel-profile"
      aria-labelledby="settings-tab-profile"
    >
      <PharmacyProfilePanel />
    </div>
    <div
      v-show="activeTab === 'categories'"
      role="tabpanel"
      id="settings-panel-categories"
      aria-labelledby="settings-tab-categories"
    >
      <CategoriesPanel />
    </div>
  </MainLayout>
</template>
