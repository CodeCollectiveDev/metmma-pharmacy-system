<script setup>
import { ref, computed, onMounted } from 'vue'
import MainLayout from '@/layouts/MainLayout.vue'
import { useHrStore } from '../store/hrStore'
import { 
  Plus, 
  Search, 
  UserPlus, 
  Calendar, 
  DollarSign, 
  MoreVertical,
  CheckCircle,
  XCircle,
  AlertTriangle,
  RefreshCw,
  Check
} from 'lucide-vue-next'

const store = useHrStore()
const activeTab = ref('employees')
const showAddForm = ref(false)
const searchQuery = ref('')

const selectedDate = ref(new Date().toISOString().split('T')[0])
const markingEmployeeId = ref(null)
const attendanceSuccessMessage = ref('')
const attendanceErrorMessage = ref('')
const attendanceSearchQuery = ref('')

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

// Attendance computations & handlers
const presentCount = computed(() => {
  return store.activeEmployees.filter(emp => {
    const rec = store.getEmployeeAttendanceRecord(emp.id || emp._id, selectedDate.value)
    return rec?.status === 'present'
  }).length
})

const absentCount = computed(() => {
  return store.activeEmployees.filter(emp => {
    const rec = store.getEmployeeAttendanceRecord(emp.id || emp._id, selectedDate.value)
    return rec?.status === 'absent'
  }).length
})

const notMarkedCount = computed(() => {
  return Math.max(0, store.activeEmployees.length - (presentCount.value + absentCount.value))
})

const filteredAttendanceEmployees = computed(() => {
  if (!attendanceSearchQuery.value) return store.activeEmployees
  const q = attendanceSearchQuery.value.toLowerCase()
  return store.activeEmployees.filter(e =>
    (e.name || '').toLowerCase().includes(q) ||
    (e.position || '').toLowerCase().includes(q) ||
    (e.department || '').toLowerCase().includes(q)
  )
})

const sortedAttendanceHistory = computed(() => {
  return [...store.attendance].sort((a, b) => {
    const dateA = a.date || ''
    const dateB = b.date || ''
    return dateB.localeCompare(dateA)
  })
})

const getEmployeeName = (empId) => {
  const emp = store.employees.find(e => String(e.id || e._id) === String(empId))
  return emp ? emp.name : `Employee #${empId}`
}

const handleMarkAttendance = async (emp, status) => {
  const empId = emp.id || emp._id
  markingEmployeeId.value = empId
  attendanceSuccessMessage.value = ''
  attendanceErrorMessage.value = ''

  const result = await store.markAttendance({
    employee_id: empId,
    date: selectedDate.value,
    status: status
  })

  if (result.success) {
    attendanceSuccessMessage.value = `Marked ${emp.name} as ${status.toUpperCase()} for ${selectedDate.value}`
    setTimeout(() => {
      if (attendanceSuccessMessage.value.includes(emp.name)) {
        attendanceSuccessMessage.value = ''
      }
    }, 4000)
  } else {
    attendanceErrorMessage.value = result.error || 'Failed to update attendance on server'
  }

  markingEmployeeId.value = null
}

const handleRefreshAttendance = async () => {
  attendanceErrorMessage.value = ''
  await store.fetchAttendance()
}

const setDateToToday = () => {
  selectedDate.value = new Date().toISOString().split('T')[0]
}
</script>

<template>
  <MainLayout title="HR Management" subtitle="Manage employees, attendance, and payroll">
    <!-- Tabs -->
    <div class="bg-white rounded-xl shadow-sm border border-gray-100 mb-6">
      <div class="flex border-b border-gray-100">
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
      <div class="flex items-center justify-between mb-6">
        <div class="relative">
          <input 
            v-model="searchQuery"
            type="text" 
            placeholder="Search employees..." 
            class="pl-10 pr-4 py-2 border border-gray-200 rounded-lg w-72 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
          >
          <Search class="w-4 h-4 text-gray-400 absolute left-3 top-3" />
        </div>
        <button @click="showAddForm = !showAddForm" class="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium flex items-center gap-2 transition-colors">
          <Plus class="w-4 h-4" /> Add Employee
        </button>
      </div>

      <!-- Add Employee Form -->
      <div v-if="showAddForm" class="bg-white rounded-xl shadow-sm border border-gray-100 p-6 mb-6">
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
      <div class="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <table class="w-full">
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
        </table>
      </div>
    </div>

    <!-- Attendance Tab -->
    <div v-if="activeTab === 'attendance'" class="space-y-6">
      <!-- Attendance Header & Controls Card -->
      <div class="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
        <div class="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h3 class="font-semibold text-gray-800 text-lg">Attendance Management</h3>
            <p class="text-sm text-gray-500">Live synchronized attendance records powered by the server database</p>
          </div>
          
          <div class="flex flex-wrap items-center gap-3">
            <div class="flex items-center gap-2 bg-gray-50 px-3 py-1.5 border border-gray-200 rounded-lg">
              <Calendar class="w-4 h-4 text-gray-500" />
              <input 
                v-model="selectedDate" 
                type="date" 
                class="bg-transparent text-sm text-gray-700 outline-none cursor-pointer"
              />
            </div>

            <button 
              @click="setDateToToday" 
              class="px-3 py-1.5 text-xs font-medium bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg transition-colors cursor-pointer"
            >
              Today
            </button>

            <button 
              @click="handleRefreshAttendance" 
              :disabled="store.attendanceLoading"
              class="px-3 py-1.5 bg-blue-50 text-blue-600 hover:bg-blue-100 disabled:opacity-50 rounded-lg text-sm font-medium flex items-center gap-1.5 transition-colors cursor-pointer"
              title="Refresh from server"
            >
              <RefreshCw :class="['w-4 h-4', store.attendanceLoading ? 'animate-spin' : '']" />
              <span>Sync</span>
            </button>
          </div>
        </div>

        <!-- Alert messages -->
        <div v-if="attendanceSuccessMessage" class="mt-4 p-3 bg-green-50 border border-green-200 text-green-700 rounded-lg text-sm flex items-center justify-between">
          <div class="flex items-center gap-2">
            <CheckCircle class="w-4 h-4 text-green-600 flex-shrink-0" />
            <span>{{ attendanceSuccessMessage }}</span>
          </div>
          <button @click="attendanceSuccessMessage = ''" class="text-green-700 hover:text-green-900 text-xs font-semibold cursor-pointer">Dismiss</button>
        </div>

        <div v-if="attendanceErrorMessage || store.attendanceError" class="mt-4 p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg text-sm flex items-center justify-between">
          <div class="flex items-center gap-2">
            <AlertTriangle class="w-4 h-4 text-red-600 flex-shrink-0" />
            <span>{{ attendanceErrorMessage || store.attendanceError }}</span>
          </div>
          <button @click="attendanceErrorMessage = ''; store.attendanceError = null" class="text-red-700 hover:text-red-900 text-xs font-semibold cursor-pointer">Dismiss</button>
        </div>

        <!-- Summary Stats Cards -->
        <div class="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-6">
          <div class="p-4 bg-gray-50 border border-gray-100 rounded-xl">
            <p class="text-xs font-medium text-gray-500 uppercase tracking-wider">Total Active</p>
            <p class="text-2xl font-bold text-gray-800 mt-1">{{ store.activeEmployees.length }}</p>
          </div>
          <div class="p-4 bg-green-50 border border-green-100 rounded-xl">
            <p class="text-xs font-medium text-green-600 uppercase tracking-wider">Present</p>
            <p class="text-2xl font-bold text-green-700 mt-1">{{ presentCount }}</p>
          </div>
          <div class="p-4 bg-red-50 border border-red-100 rounded-xl">
            <p class="text-xs font-medium text-red-600 uppercase tracking-wider">Absent</p>
            <p class="text-2xl font-bold text-red-700 mt-1">{{ absentCount }}</p>
          </div>
          <div class="p-4 bg-amber-50 border border-amber-100 rounded-xl">
            <p class="text-xs font-medium text-amber-600 uppercase tracking-wider">Not Marked</p>
            <p class="text-2xl font-bold text-amber-700 mt-1">{{ notMarkedCount }}</p>
          </div>
        </div>

        <!-- Search Bar -->
        <div class="mt-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div class="relative w-full max-w-xs">
            <input 
              v-model="attendanceSearchQuery"
              type="text" 
              placeholder="Search active employees..." 
              class="w-full pl-9 pr-4 py-2 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
            />
            <Search class="w-4 h-4 text-gray-400 absolute left-3 top-2.5" />
          </div>
          <div class="text-xs text-gray-500 font-medium">
            Marking attendance for: <span class="font-semibold text-gray-800">{{ selectedDate }}</span>
          </div>
        </div>

        <!-- Employee Attendance List -->
        <div class="mt-4 grid gap-3">
          <div 
            v-for="emp in filteredAttendanceEmployees" 
            :key="emp._id || emp.id" 
            class="flex flex-col sm:flex-row sm:items-center justify-between p-4 border border-gray-100 hover:border-gray-200 rounded-xl bg-white shadow-2xs gap-4 transition-all"
          >
            <div class="flex items-center gap-3">
              <div class="w-10 h-10 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center font-semibold">
                {{ (emp.name || 'E').charAt(0) }}
              </div>
              <div>
                <div class="flex items-center gap-2">
                  <p class="font-medium text-gray-800">{{ emp.name }}</p>
                  <!-- Current Status Badge -->
                  <span 
                    v-if="store.getEmployeeAttendanceRecord(emp.id || emp._id, selectedDate)?.status === 'present'"
                    class="px-2 py-0.5 bg-green-100 text-green-700 text-xs font-medium rounded-full inline-flex items-center gap-1"
                  >
                    <Check class="w-3 h-3" /> Present
                  </span>
                  <span 
                    v-else-if="store.getEmployeeAttendanceRecord(emp.id || emp._id, selectedDate)?.status === 'absent'"
                    class="px-2 py-0.5 bg-red-100 text-red-700 text-xs font-medium rounded-full inline-flex items-center gap-1"
                  >
                    <XCircle class="w-3 h-3" /> Absent
                  </span>
                  <span 
                    v-else-if="store.getEmployeeAttendanceRecord(emp.id || emp._id, selectedDate)"
                    class="px-2 py-0.5 bg-purple-100 text-purple-700 text-xs font-medium rounded-full capitalize"
                  >
                    {{ store.getEmployeeAttendanceRecord(emp.id || emp._id, selectedDate)?.status }}
                  </span>
                  <span 
                    v-else
                    class="px-2 py-0.5 bg-gray-100 text-gray-500 text-xs font-medium rounded-full"
                  >
                    Not Marked
                  </span>
                </div>
                <p class="text-xs text-gray-500">{{ emp.position }} &bull; {{ emp.department || 'General' }}</p>
              </div>
            </div>

            <!-- Action Buttons -->
            <div class="flex items-center gap-2 self-end sm:self-center">
              <button 
                @click="handleMarkAttendance(emp, 'present')"
                :disabled="markingEmployeeId === (emp.id || emp._id)"
                :class="[
                  'px-3.5 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer',
                  store.getEmployeeAttendanceRecord(emp.id || emp._id, selectedDate)?.status === 'present'
                    ? 'bg-green-600 text-white shadow-sm ring-2 ring-green-600 ring-offset-1'
                    : 'bg-green-50 text-green-700 hover:bg-green-100 border border-green-200'
                ]"
              >
                <Check class="w-3.5 h-3.5" />
                <span>Present</span>
              </button>

              <button 
                @click="handleMarkAttendance(emp, 'absent')"
                :disabled="markingEmployeeId === (emp.id || emp._id)"
                :class="[
                  'px-3.5 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer',
                  store.getEmployeeAttendanceRecord(emp.id || emp._id, selectedDate)?.status === 'absent'
                    ? 'bg-red-600 text-white shadow-sm ring-2 ring-red-600 ring-offset-1'
                    : 'bg-red-50 text-red-700 hover:bg-red-100 border border-red-200'
                ]"
              >
                <XCircle class="w-3.5 h-3.5" />
                <span>Absent</span>
              </button>

              <span v-if="markingEmployeeId === (emp.id || emp._id)" class="text-xs text-blue-600 animate-pulse font-medium">
                Saving...
              </span>
            </div>
          </div>

          <div v-if="filteredAttendanceEmployees.length === 0" class="p-8 text-center text-gray-400 text-sm">
            No active employees found matching your search.
          </div>
        </div>
      </div>

      <!-- Server-Side Attendance History Log -->
      <div class="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div class="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
          <div>
            <h4 class="font-semibold text-gray-800">Server Attendance History</h4>
            <p class="text-xs text-gray-500">Live records retrieved directly from the backend database</p>
          </div>
          <span class="text-xs bg-blue-50 text-blue-700 px-2.5 py-1 rounded-full font-medium">
            {{ store.attendance.length }} Total Records
          </span>
        </div>

        <div class="overflow-x-auto">
          <table class="w-full text-left text-sm">
            <thead class="bg-gray-50 border-b border-gray-100 text-xs uppercase text-gray-500">
              <tr>
                <th class="px-6 py-3">Date</th>
                <th class="px-6 py-3">Employee</th>
                <th class="px-6 py-3">Status</th>
                <th class="px-6 py-3">Check-in Time</th>
                <th class="px-6 py-3 text-right">Source</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-gray-100">
              <tr v-for="rec in sortedAttendanceHistory.slice(0, 10)" :key="rec.id || (rec.employee_id + '-' + rec.date)" class="hover:bg-gray-50">
                <td class="px-6 py-3.5 font-medium text-gray-800">{{ rec.date }}</td>
                <td class="px-6 py-3.5 text-gray-700">{{ getEmployeeName(rec.employee_id) }}</td>
                <td class="px-6 py-3.5">
                  <span 
                    :class="[
                      'px-2 py-0.5 rounded-full text-xs font-medium capitalize',
                      rec.status === 'present' ? 'bg-green-100 text-green-700' :
                      rec.status === 'absent' ? 'bg-red-100 text-red-700' : 'bg-yellow-100 text-yellow-700'
                    ]"
                  >
                    {{ rec.status }}
                  </span>
                </td>
                <td class="px-6 py-3.5 text-gray-500">{{ rec.check_in_time || '-' }}</td>
                <td class="px-6 py-3.5 text-right">
                  <span class="text-xs bg-emerald-50 text-emerald-700 border border-emerald-200 px-2 py-0.5 rounded font-mono">
                    PostgreSQL
                  </span>
                </td>
              </tr>
              <tr v-if="store.attendance.length === 0">
                <td colspan="5" class="px-6 py-8 text-center text-gray-400">
                  No attendance records found on the server. Mark attendance above to persist records.
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>

    <!-- Payroll Tab -->
    <div v-if="activeTab === 'payroll'" class="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
      <div class="px-6 py-4 border-b border-gray-100">
        <h3 class="font-semibold text-gray-800">Payroll Summary</h3>
      </div>
      <table class="w-full">
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
      </table>
    </div>
  </MainLayout>
</template>
