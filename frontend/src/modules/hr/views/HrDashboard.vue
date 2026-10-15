<script setup>
import SectionNav from '@/components/SectionNav.vue'
import { ref, onMounted, watch } from 'vue'
import AttendancePanel from '../components/AttendancePanel.vue'
import MainLayout from '@/layouts/MainLayout.vue'
import ErrorNotice from '@/components/ErrorNotice.vue'
import PaginationControls from '@/components/PaginationControls.vue'
import { periodDates } from '@/services/api/money'
const today = periodDates('today').start
import { useHrStore } from '../store/hrStore'
import { Plus, Search, UserPlus, Calendar,  } from 'lucide-vue-next'

const store = useHrStore()
const role = localStorage.getItem('role')
function load(page = 1) { return store.fetchEmployees({page,search:searchQuery.value}) }
const activeTab = ref('employees')
const showAddForm = ref(false)
const searchQuery = ref('')
const saving = ref(false)
const createdEmployee = ref(null)

const newEmployee = ref({
  first_name: '',
  last_name: '',
  role: '',
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

})

watch(searchQuery, () => load())
const filteredEmployees = () => store.employees

const saveEmployee = async () => {
  if (saving.value) return
  saving.value = true
  createdEmployee.value = null
  try {
    const employee = await store.addEmployee({ ...newEmployee.value })
    if (employee) {
      createdEmployee.value = employee
      showAddForm.value = false
      newEmployee.value = { first_name: '', last_name: '', role: '', position: '', department: '', salary: null, startDate: '', status: 'active', email: '', phone: '' }
    }
  } finally {
    saving.value = false
  }
}

const formatCurrency = (amount) => {
  return new Intl.NumberFormat('en-MW', { style: 'currency', currency: 'MWK', minimumFractionDigits: 0 }).format(amount || 0)
}
</script>

<template>
  <MainLayout title="Staff & attendance" subtitle="View staff records, daily attendance and attendance history">
    <SectionNav section="team" />
    <ErrorNotice v-if="!showAddForm" :error="store.employeeError" :retry="load" />
    <p v-if="store.loading" role="status">Loading staff…</p>
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
            aria-label="Search employees..." placeholder="Search employees..."
            class="w-full sm:w-72 pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
          >
          <Search class="w-4 h-4 text-gray-400 absolute left-3 top-3" />
        </div>
        <button v-if="role === 'admin'" @click="showAddForm = !showAddForm" class="justify-center px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium flex items-center gap-2 transition-colors">
          <Plus class="w-4 h-4" /> Add Employee
        </button>
      </div>

      <!-- Add Employee Form -->
      <form v-if="showAddForm" v-form-feedback="store.employeeError" @submit.prevent="saveEmployee" class="bg-white rounded-xl shadow-sm border border-gray-100 p-4 sm:p-6 mb-6">
        <h3 class="font-semibold text-gray-800 mb-4">Add New Employee</h3>
        <p class="form-note">Fields marked * are required. This creates a staff record. Add sign-in access from Accounts when needed.</p>
        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
          <label>First name<input v-model.trim="newEmployee.first_name" name="first_name" required minlength="2" maxlength="50" class="field mt-1" autocomplete="given-name"/></label>
          <label>Last name<input v-model.trim="newEmployee.last_name" name="last_name" required minlength="2" maxlength="50" class="field mt-1" autocomplete="family-name"/></label>
          <label>Email<input v-model.trim="newEmployee.email" name="email" required maxlength="255" type="email" class="field mt-1" autocomplete="email"/></label>
          <label>Phone (optional)<input v-model.trim="newEmployee.phone" name="phone" type="tel" pattern="[0-9+\s\-]{10,15}" maxlength="15" class="field mt-1" placeholder="e.g. +265991234567"/></label>
          <label>Position<input v-model.trim="newEmployee.position" name="job_title" required maxlength="100" class="field mt-1" placeholder="e.g. Pharmacist"/></label>
          <label>Department<select v-model="newEmployee.department" name="department" required class="field mt-1"><option value="">Choose a department</option><option>Pharmacy</option><option>Sales</option><option>Operations</option><option>Human Resources</option><option>Administration</option></select></label>
          <label>Monthly salary (MWK)<input v-model.number="newEmployee.salary" name="salary" required min="0.01" max="99999999.99" step="0.01" type="number" class="field mt-1"/></label>
          <label>Start date (optional)<input v-model="newEmployee.startDate" name="hire_date" type="date" :max="today" class="field mt-1"/><span class="text-xs text-slate-500">Defaults to today when left blank.</span></label>
        </div>
        <div class="flex justify-end gap-3 mt-4">
          <button type="button" @click="showAddForm = false" class="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors">Cancel</button>
          <button type="submit" :disabled="saving" class="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors">{{ saving ? 'Saving...' : 'Save Employee' }}</button>
        </div>
        <ErrorNotice :error="store.employeeError" />

      </form>

      <div v-if="createdEmployee" role="status" class="mb-6 p-4 bg-green-50 text-green-800 rounded-lg">
        <p class="font-semibold">Employee created: {{ createdEmployee.first_name }} {{ createdEmployee.last_name }}</p>
        <p>{{ createdEmployee.position }} · {{ createdEmployee.department }}</p>
        <p v-if="createdEmployee.role">Role: {{ createdEmployee.role }}</p>
        <p>{{ createdEmployee.email }} · Start date: {{ new Date(createdEmployee.hire_date).toLocaleDateString() }} · {{ createdEmployee.is_active ? 'Active' : 'Inactive' }}</p>
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

            </tr>
            <tr v-if="store.employees.length === 0">
              <td colspan="5" class="px-6 py-8 text-center text-gray-400">No staff match this search. An administrator can add your first staff member.<button v-if="role === 'admin'" class="primary block mx-auto mt-3" @click="showAddForm = true">Add employee</button><button v-else class="secondary block mx-auto mt-3" @click="searchQuery = ''; load()">Clear search</button></td>
            </tr>
          </tbody>
        </table></div>
        <PaginationControls :pagination="store.pagination" :loading="store.loading" @change="load" />
      </div>
    </div>

    <AttendancePanel v-if="activeTab === 'attendance'" />
  </MainLayout>
</template>
