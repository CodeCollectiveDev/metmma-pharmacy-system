<script setup>
import { ref } from 'vue'
import MainLayout from '@/layouts/MainLayout.vue'
import { ChevronDown, ChevronRight, Search, Phone, Mail, HelpCircle } from 'lucide-vue-next'

const openSections = ref(['getting-started'])
const searchQuery = ref('')

const toggleSection = (id) => {
  if (openSections.value.includes(id)) {
    openSections.value = openSections.value.filter(s => s !== id)
  } else {
    openSections.value.push(id)
  }
}

const isOpen = (id) => openSections.value.includes(id)

const helpTopics = [
  {
    id: 'getting-started',
    title: 'Getting Started',
    items: [
      { q: 'Logging In', a: 'Use your username and password provided by the administrator. Ensure you are logging in with the correct credentials assigned to your role.' },
      { q: 'System Navigation', a: 'Use the sidebar menu to navigate between modules. The top bar displays your current location and important system notifications.' }
    ]
  },
  {
    id: 'sales',
    title: 'Point of Sale (POS)',
    items: [
      { q: 'Starting a Transaction', a: 'Navigate to the Point of Sale module. Scan barcodes or search for products manually. Add items to the cart and proceed to payment.' },
      { q: 'Scanning Products', a: 'Click the barcode input field and use your connected scanner or mobile device. The system will automatically detect the batch number.' },
      { q: 'Processing Payments', a: 'Select the payment method (Cash or Card). For cash transactions, ensure the correct amount is tendered before completing the sale.' },
      { q: 'Receipt Printing', a: 'Upon successful transaction, a digital receipt will be generated. You can print this immediately using the "Print" button.' }
    ]
  },
  {
    id: 'inventory',
    title: 'Inventory Management',
    items: [
      { q: 'Adding New Products', a: 'Access the Inventory module and click "Add Product". Fill in all mandatory fields including Name, Batch Number, and Expiry Date.' },
      { q: 'Monitoring Stock Levels', a: 'Use the "Low Stock" filter in the Inventory dashboard to identify items falling below the minimum threshold.' },
      { q: 'Expiry Tracking', a: 'The "Expired" filter displays all batches that have passed their expiry date and should be removed from stock.' }
    ]
  },
  {
    id: 'reports',
    title: 'Reports & Analytics',
    items: [
      { q: 'Generating Sales Reports', a: 'Go to the Reports module. Select "Sales Reports" and choose your desired date range (Today, Week, Month).' },
      { q: 'Exporting Data', a: 'All reports can be exported to CSV format. Click the "Export CSV" button at the top right of any report view.' }
    ]
  }
]

const filteredTopics = () => {
  if (!searchQuery.value) return helpTopics
  
  const query = searchQuery.value.toLowerCase()
  return helpTopics.map(topic => {
    const matchingItems = topic.items.filter(item => 
      item.q.toLowerCase().includes(query) || 
      item.a.toLowerCase().includes(query)
    )
    
    if (matchingItems.length > 0) {
      return { ...topic, items: matchingItems }
    }
    return null
  }).filter(t => t !== null)
}
</script>

<template>
  <MainLayout title="Help Center" subtitle="System documentation and support">
    <!-- Search -->
    <div class="max-w-2xl mx-auto mb-6 sm:mb-8">
      <div class="relative">
        <input
          v-model="searchQuery"
          type="text"
          placeholder="Search for answers..."
          class="w-full pl-12 pr-4 py-4 border border-gray-200 rounded-xl shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none text-lg"
        >
        <Search class="w-6 h-6 text-gray-400 absolute left-4 top-4" />
      </div>
    </div>

    <!-- FAQ Sections -->
    <div class="max-w-4xl mx-auto space-y-4">
      <div v-for="topic in filteredTopics()" :key="topic.id" class="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <button
          @click="toggleSection(topic.id)"
          class="w-full px-4 sm:px-6 py-4 flex items-center justify-between text-left hover:bg-gray-50 transition-colors"
        >
          <h3 class="font-semibold text-lg text-gray-800">{{ topic.title }}</h3>
          <ChevronDown v-if="isOpen(topic.id) || searchQuery" class="w-5 h-5 text-gray-500" />
          <ChevronRight v-else class="w-5 h-5 text-gray-500" />
        </button>

        <div v-if="isOpen(topic.id) || searchQuery" class="border-t border-gray-100">
          <div v-for="(item, index) in topic.items" :key="index" class="px-4 sm:px-6 py-4 border-b border-gray-50 last:border-b-0 space-y-2">
            <p class="font-medium text-blue-700">{{ item.q }}</p>
            <p class="text-gray-600 text-sm leading-relaxed">{{ item.a }}</p>
          </div>
        </div>
      </div>
      
      <div v-if="filteredTopics().length === 0" class="text-center py-12 text-gray-500">
        No results found for "{{ searchQuery }}"
      </div>
    </div>

    <!-- Contact Support -->
    <div class="max-w-4xl mx-auto mt-8 bg-blue-50 border border-blue-100 rounded-xl p-4 sm:p-8">
      <div class="flex flex-col sm:flex-row items-start gap-4 sm:gap-6">
        <div class="p-4 bg-blue-100 rounded-full text-blue-600">
          <HelpCircle class="w-8 h-8" />
        </div>
        <div>
          <h3 class="text-lg font-bold text-gray-900 mb-2">Technical Support</h3>
          <p class="text-gray-600 mb-6">If you cannot find the answer you are looking for, please contact our support team.</p>
          <div class="flex flex-wrap gap-6">
            <div class="flex items-center gap-3 text-gray-700">
              <div class="p-2 bg-white rounded-lg border border-gray-200">
                <Phone class="w-4 h-4" />
              </div>
              <span class="font-medium">+265 889 123 456</span>
            </div>
            <div class="flex items-center gap-3 text-gray-700">
              <div class="p-2 bg-white rounded-lg border border-gray-200">
                <Mail class="w-4 h-4" />
              </div>
              <span class="font-medium">support@metmma.com</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  </MainLayout>
</template>
