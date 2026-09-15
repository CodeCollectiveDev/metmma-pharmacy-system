<script setup>
import { ref, onMounted } from 'vue'
import MainLayout from '@/layouts/MainLayout.vue'
import { useHrStore } from '../store/hrStore'
import { Plus, Search, UserPlus, Calendar, DollarSign, MoreVertical } from 'lucide-vue-next'

const store = useHrStore()
const activeTab = ref('employees')
const showAddForm = ref(false)
const searchQuery = ref('')

const newEmployee = ref({
  name: '',
  position: '',
  department: '',
  salary: null,
  startDate: '',
  status: 'active',
  email: '',
  phone: ''
})

onMounted(() => {
  store.fetchEmployees()
  store.fetchAttendance()
})

const filteredEmployees = () => {
  if (!searchQuery.value) return store.employees
  return store.employees.filter(e => 
    e.name.toLowerCase().includes(searchQuery.value.toLowerCase()) ||
    e.position.toLowerCase().includes(searchQuery.value.toLowerCase())
  )
}

const saveEmployee = async () => {
  if (!newEmployee.value.name || !newEmployee.value.position) {
    alert('Please fill required fields')
    return
  }
  const success = await store.addEmployee({ ...newEmployee.value })
  if (success) {
    showAddForm.value = false
    newEmployee.value = { name: '', position: '', department: '', salary: null, startDate: '', status: 'active', email: '', phone: '' }
  }
}

const formatCurrency = (amount) => {
  return new Intl.NumberFormat('en-MW', { style: 'currency', currency: 'MWK', minimumFractionDigits: 0 }).format(amount || 0)
}
</script>

<template>
  <MainLayout title="HR Management" subtitle="Manage employees, attendance, and payroll">
    <!-- Tabs -->
    <div class="bg-white rounded-xl shadow-sm border border-gray-100 mb-6">
      <div class="flex overflow-x-auto border-b border-gray-100">
        <button 
          @click="activeTab = 'employees'"
          :class="['px-6 py-4 font-medium text-sm transition-colors flex items-center gap-2', activeTab === 'employees' ? 'text-blue-600 border-b-2 border-blue-600' : 'text-gray-500 hover:text-gray-700']"
        >
          <UserPlus class="w-4 h-4" /> Employees
        </button>
        <button 
          @click="activeTab = 'attendance'"
          :class="['px-6 py-4 font-medium text-sm transition-colors flex items-center gap-2', activeTab === 'attendance' ? 'text-blue-600 border-b-2 border-blue-600' : 'text-gray-500 hover:text-gray-700']"
        >
          <Calendar class="w-4 h-4" /> Attendance
        </button>
        <button 
          @click="activeTab = 'payroll'"
          :class="['px-6 py-4 font-medium text-sm transition-colors flex items-center gap-2', activeTab === 'payroll' ? 'text-blue-600 border-b-2 border-blue-600' : 'text-gray-500 hover:text-gray-700']"
        >
          <DollarSign class="w-4 h-4" /> Payroll
        </button>
      </div>
    </div>

    <!-- Employees Tab -->
    <div v-if="activeTab === 'employees'">
      <!-- Header -->
      <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-6">
        <div class="relative w-full sm:w-auto">
          <input 
            v-model="searchQuery"
            type="text" 
            placeholder="Search employees..." 
            class="w-full sm:w-72 pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
          >
          <Search class="w-4 h-4 text-gray-400 absolute left-3 top-3" />
        </div>
        <button @click="showAddForm = !showAddForm" class="justify-center px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium flex items-center gap-2 transition-colors">
          <Plus class="w-4 h-4" /> Add Employee
        </button>
      </div>

      <!-- Add Employee Form -->
      <div v-if="showAddForm" class="bg-white rounded-xl shadow-sm border border-gray-100 p-4 sm:p-6 mb-6">
        <h3 class="font-semibold text-gray-800 mb-4">Add New Employee</h3>
        <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
          <input v-model="newEmployee.name" type="text" placeholder="Full Name *" class="px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none">
          <input v-model="newEmployee.position" type="text" placeholder="Position *" class="px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none">
          <select v-model="newEmployee.department" class="px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none">
            <option value="">Select Department</option>
            <option>Pharmacy</option>
            <option>Sales</option>
            <option>Operations</option>
            <option>Human Resources</option>
            <option>Administration</option>
          </select>
          <input v-model.number="newEmployee.salary" type="number" placeholder="Salary (MWK)" class="px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none">
          <input v-model="newEmployee.startDate" type="date" class="px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none">
          <input v-model="newEmployee.phone" type="tel" placeholder="Phone Number" class="px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none">
        </div>
        <div class="flex justify-end gap-3 mt-4">
          <button @click="showAddForm = false" class="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors">Cancel</button>
          <button @click="saveEmployee" class="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors">Save Employee</button>
        </div>
      </div>

      <!-- Employees Table -->
      <div class="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden"><div class="overflow-x-auto">
        <table class="w-full min-w-[750px]">
          <thead class="bg-gray-50 border-b border-gray-100">
            <tr>
              <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Employee</th>
              <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Department</th>
              <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Salary</th>
              <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Start Date</th>
              <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
              <th class="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Actions</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-gray-100">
            <tr v-for="emp in filteredEmployees()" :key="emp._id" class="hover:bg-gray-50">
              <td class="px-6 py-4">
                <div class="flex items-center gap-3">
                  <div class="w-10 h-10 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center font-medium">
                    {{ emp.name?.charAt(0) }}
                  </div>
                  <div>
                    <p class="font-medium text-gray-800">{{ emp.name }}</p>
                    <p class="text-sm text-gray-500">{{ emp.position }}</p>
                  </div>
                </div>
              </td>
              <td class="px-6 py-4 text-gray-600">{{ emp.department }}</td>
              <td class="px-6 py-4 font-medium text-gray-800">{{ formatCurrency(emp.salary) }}</td>
              <td class="px-6 py-4 text-gray-600">{{ emp.startDate ? new Date(emp.startDate).toLocaleDateString() : '-' }}</td>
              <td class="px-6 py-4">
                <span :class="['px-2 py-1 rounded-full text-xs font-medium', emp.status === 'active' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600']">
                  {{ emp.status }}
                </span>
              </td>
              <td class="px-6 py-4 text-right">
                <button class="p-1 hover:bg-gray-100 rounded-lg transition-colors">
                  <MoreVertical class="w-4 h-4 text-gray-500" />
                </button>
              </td>
            </tr>
            <tr v-if="store.employees.length === 0">
              <td colspan="6" class="px-6 py-8 text-center text-gray-400">No employees found</td>
            </tr>
          </tbody>
        </table></div>
      </div>
    </div>

    <!-- Attendance Tab -->
    <div v-if="activeTab === 'attendance'" class="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
      <h3 class="font-semibold text-gray-800 mb-4">Attendance Management</h3>
      <p class="text-gray-500">Mark daily attendance for employees</p>
      <div class="mt-6 grid gap-4">
        <div v-for="emp in store.activeEmployees" :key="emp._id" class="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 border border-gray-100 rounded-lg">
          <div class="flex items-center gap-3">
            <div class="w-10 h-10 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center font-medium">
              {{ emp.name?.charAt(0) }}
            </div>
            <div>
              <p class="font-medium text-gray-800">{{ emp.name }}</p>
              <p class="text-sm text-gray-500">{{ emp.position }}</p>
            </div>
          </div>
          <div class="flex gap-2">
            <button class="px-3 py-1.5 bg-green-100 text-green-700 rounded-lg text-sm font-medium hover:bg-green-200 transition-colors">Present</button>
            <button class="px-3 py-1.5 bg-red-100 text-red-700 rounded-lg text-sm font-medium hover:bg-red-200 transition-colors">Absent</button>
          </div>
        </div>
      </div>
    </div>

    <!-- Payroll Tab -->
    <div v-if="activeTab === 'payroll'" class="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
      <div class="px-6 py-4 border-b border-gray-100">
        <h3 class="font-semibold text-gray-800">Payroll Summary</h3>
      </div>
      <div class="overflow-x-auto"><table class="w-full min-w-[650px]">
        <thead class="bg-gray-50 border-b border-gray-100">
          <tr>
            <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Employee</th>
            <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Base Salary</th>
            <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Deductions</th>
            <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Net Pay</th>
          </tr>
        </thead>
        <tbody class="divide-y divide-gray-100">
          <tr v-for="emp in store.activeEmployees" :key="emp._id" class="hover:bg-gray-50">
            <td class="px-6 py-4 font-medium text-gray-800">{{ emp.name }}</td>
            <td class="px-6 py-4 text-gray-600">{{ formatCurrency(emp.salary) }}</td>
            <td class="px-6 py-4 text-gray-600">{{ formatCurrency((emp.salary || 0) * 0.1) }}</td>
            <td class="px-6 py-4 font-bold text-green-600">{{ formatCurrency((emp.salary || 0) * 0.9) }}</td>
          </tr>
        </tbody>
      </table></div>
    </div>
  </MainLayout>
</template>
