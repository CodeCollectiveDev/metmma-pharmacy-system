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
<!-- leave modalstate -->
const showLeaveModal = ref(false)
const leaveTarget = ref(null)
const leaveStart = ref('')
const leaveEnd = r  

<!-- ===================== Employees Tab ===================== -->
    <div v-if="activeTab === 'employees'">
      <!-- Toolbar -->
      <div class="flex flex-wrap gap-3 items-center mb-6">
        <div class="relative flex-1 min-w-[220px]">
          <input v-model="searchQuery" type="text" placeholder="Search name, position or department..." class="pl-10 pr-4 py-2 border rounded-lg w-full focus:ring-2 focus:ring-blue-500 outline-none">
          <Search class="w-4 h-4 text-gray-400 absolute left-3 top-2.5" />
        </div>
        <select v-model="departmentFilter" class="px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none">
          <option value="">All Departments</option>
          <option v-for="d in departments" :key="d" :value="d">{{ d }}</option>
        </select>
        <button @click="showAddForm = !showAddForm" class="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium flex items-center gap-2 transition-colors">
          <Plus class="w-4 h-4" />
          {{ showAddForm ? 'Cancel' : 'Add Employee' }}
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
            <option v-for="d in departments" :key="d">{{ d }}</option>
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
              <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Leave Balance</th>
              <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
              <th class="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Actions</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-gray-100">
            <tr v-if="store.loading">
              <td colspan="7" class="px-6 py-10 text-center text-gray-400">
                <Loader2 class="w-5 h-5 animate-spin inline" />
                <span class="ml-2">Loading employees...</span>
              </td>
            </tr>
 
            <tr v-for="emp in filteredEmployees" :key="emp._id" class="hover:bg-gray-50">
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
              <td class="px-6 py-4 text-gray-600">{{ emp.department || '-' }}</td>
              <td class="px-6 py-4 font-medium text-gray-800">{{ formatCurrency(emp.salary) }}</td>
              <td class="px-6 py-4 text-gray-600">{{ formatDate(emp.startDate) }}</td>
              <td class="px-6 py-4">
                <span class="font-medium text-gray-800">{{ remainingOf(emp) }}</span>
                <span class="text-xs text-gray-400 ml-1">of {{ entitlementOf(emp) }} days left</span>
              </td>
              <td class="px-6 py-4">
                <span v-if="isOnLeave(emp)" class="px-2 py-1 rounded-full text-xs font-medium bg-amber-100 text-amber-700">
                  On leave
                </span>
                <span v-else :class="['px-2 py-1 rounded-full text-xs font-medium', emp.status === 'active' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600']">
                  {{ emp.status || 'active' }}
                </span>
              </td>
              <td class="px-6 py-4 text-right">
                <button class="p-1 hover:bg-gray-100 rounded-lg transition-colors">
                  <MoreVertical class="w-4 h-4 text-gray-500" />
                </button>
              </td>
            </tr>
 
            <!-- Empty state now checks the SAME list that is rendered -->
            <tr v-if="!store.loading && filteredEmployees.length === 0">
              <td colspan="7" class="px-6 py-10 text-center text-gray-400">
                <template v-if="store.employees.length === 0">
                  No employees yet. Add your first one to get started.
                </template>
                <template v-else>
                  No employees match this search.
                </template>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
 
    <!-- ===================== Attendance & Leave Tab ===================== -->
    <div v-if="activeTab === 'attendance'" class="space-y-6">
      <!-- Currently on leave -->
      <div class="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
        <div class="flex items-center gap-2 mb-1">
          <CalendarDays class="w-5 h-5 text-amber-600" />
          <h3 class="font-semibold text-gray-800">On leave today ({{ employeesOnLeave.length }})</h3>
        </div>
        <p class="text-gray-500 text-sm mb-4">Who is away, for how long, and what they have left.</p>
 
        <div v-if="employeesOnLeave.length === 0" class="text-gray-400 text-sm py-4">
          Nobody is on leave today.
        </div>
 
        <div v-else class="grid gap-4">
          <div v-for="emp in employeesOnLeave" :key="emp._id" class="p-4 border border-amber-100 bg-amber-50/40 rounded-lg">
            <div class="flex items-start justify-between gap-4 flex-wrap">
              <div class="flex items-center gap-3">
                <div class="w-10 h-10 bg-amber-100 text-amber-700 rounded-full flex items-center justify-center font-medium">
                  {{ emp.name?.charAt(0) }}
                </div>   <!-- ===================== Employees Tab ===================== -->
    <div v-if="activeTab === 'employees'">
      <!-- Toolbar -->
      <div class="flex flex-wrap gap-3 items-center mb-6">
        <div class="relative flex-1 min-w-[220px]">
          <input v-model="searchQuery" type="text" placeholder="Search name, position or department..." class="pl-10 pr-4 py-2 border rounded-lg w-full focus:ring-2 focus:ring-blue-500 outline-none">
          <Search class="w-4 h-4 text-gray-400 absolute left-3 top-2.5" />
        </div>
        <select v-model="departmentFilter" class="px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none">
          <option value="">All Departments</option>
          <option v-for="d in departments" :key="d" :value="d">{{ d }}</option>
        </select>
        <button @click="showAddForm = !showAddForm" class="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium flex items-center gap-2 transition-colors">
          <Plus class="w-4 h-4" />
          {{ showAddForm ? 'Cancel' : 'Add Employee' }}
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
            <option v-for="d in departments" :key="d">{{ d }}</option>
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
              <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Leave Balance</th>
              <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
              <th class="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Actions</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-gray-100">
            <tr v-if="store.loading">
              <td colspan="7" class="px-6 py-10 text-center text-gray-400">
                <Loader2 class="w-5 h-5 animate-spin inline" />
                <span class="ml-2">Loading employees...</span>
              </td>
            </tr>
 
            <tr v-for="emp in filteredEmployees" :key="emp._id" class="hover:bg-gray-50">
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
              <td class="px-6 py-4 text-gray-600">{{ emp.department || '-' }}</td>
              <td class="px-6 py-4 font-medium text-gray-800">{{ formatCurrency(emp.salary) }}</td>
              <td class="px-6 py-4 text-gray-600">{{ formatDate(emp.startDate) }}</td>
              <td class="px-6 py-4">
                <span class="font-medium text-gray-800">{{ remainingOf(emp) }}</span>
                <span class="text-xs text-gray-400 ml-1">of {{ entitlementOf(emp) }} days left</span>
              </td>
              <td class="px-6 py-4">
                <span v-if="isOnLeave(emp)" class="px-2 py-1 rounded-full text-xs font-medium bg-amber-100 text-amber-700">
                  On leave
                </span>
                <span v-else :class="['px-2 py-1 rounded-full text-xs font-medium', emp.status === 'active' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600']">
                  {{ emp.status || 'active' }}
                </span>
              </td>
              <td class="px-6 py-4 text-right">
                <button class="p-1 hover:bg-gray-100 rounded-lg transition-colors">
                  <MoreVertical class="w-4 h-4 text-gray-500" />
                </button>
              </td>
            </tr>
 
            <!-- Empty state now checks the SAME list that is rendered -->
            <tr v-if="!store.loading && filteredEmployees.length === 0">
              <td colspan="7" class="px-6 py-10 text-center text-gray-400">
                <template v-if="store.employees.length === 0">
                  No employees yet. Add your first one to get started.
                </template>
                <template v-else>
                  No employees match this search.
                </template>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
 
    <!-- ===================== Attendance & Leave Tab ===================== -->
    
    <div v-if="activeTab === 'attendance'" class="space-y-6">
    
      <!-- Currently on leave -->

      <div class="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
        <div class="flex items-center gap-2 mb-1">
          <CalendarDays class="w-5 h-5 text-amber-600" />
          <h3 class="font-semibold text-gray-800">On leave today ({{ employeesOnLeave.length }})</h3>
        </div>
        <p class="text-gray-500 text-sm mb-4">Who is away, for how long, and what they have left.</p>
 
        <div v-if="employeesOnLeave.length === 0" class="text-gray-400 text-sm py-4">
          Nobody is on leave today.
        </div>
 
        <div v-else class="grid gap-4">
          <div v-for="emp in employeesOnLeave" :key="emp._id" class="p-4 border border-amber-100 bg-amber-50/40 rounded-lg">
            <div class="flex items-start justify-between gap-4 flex-wrap">
              <div class="flex items-center gap-3">
                <div class="w-10 h-10 bg-amber-100 text-amber-700 rounded-full flex items-center justify-center font-medium">
                  {{ emp.name?.charAt(0) }}
                </div>
                <div>
                  <p class="font-medium text-gray-800">{{ emp.name }}</p>
                  <p class="text-sm text-gray-500">{{ emp.position }}</p>
                  <p v-if="emp.leaveReason" class="text-sm text-gray-500 mt-1">{{ emp.leaveReason }}</p>
                </div>
              </div>
 
              <div class="flex gap-6 text-sm">
                <div>
                  <p class="text-gray-500">Leave period</p>
                  <p class="font-medium text-gray-800">{{ formatDate(emp.leaveStart) }} - {{ formatDate(emp.leaveEnd) }}</p>
                </div>
                <div>
                  <p class="text-gray-500">Days booked</p>
                  <p class="font-medium text-gray-800">{{ emp.leaveDays || 0 }}</p>
                </div>
                <div>
                  <p class="text-gray-500">Days still away</p>
                  <p class="font-medium text-amber-700">{{ daysLeftOnCurrentLeave(emp) }}</p>
                </div>
                <div>
                  <p class="text-gray-500">Balance after</p>
                  <p class="font-medium text-gray-800">{{ remainingOf(emp) }} / {{ entitlementOf(emp) }}</p>
                </div>
              </div>
 
              <button @click="endLeave(emp)" class="px-3 py-1.5 bg-white border border-amber-200 text-amber-700 rounded-lg text-sm font-medium hover:bg-amber-100 transition-colors">
                End leave early
              </button>
            </div>
          </div>
        </div>
      </div>
 
      <!-- Daily attendance -->
      <div class="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
        <h3 class="font-semibold text-gray-800 mb-1">Attendance for today</h3>
        <p class="text-gray-500 text-sm mb-4">Mark each employee present or absent, or send them on leave.</p>
 
        <div v-if="employeesAvailable.length === 0" class="text-gray-400 text-sm py-4">
          No active employees to mark.
        </div>
 
        <div class="grid gap-4">
          <div v-for="emp in employeesAvailable" :key="emp._id" class="flex items-center justify-between gap-4 flex-wrap p-4 border border-gray-100 rounded-lg">
            <div class="flex items-center gap-3">
              <div class="w-10 h-10 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center font-medium">
                {{ emp.name?.charAt(0) }}
              </div>
              <div>
                <p class="font-medium text-gray-800">{{ emp.name }}</p>
                <p class="text-sm text-gray-500">{{ emp.position }}</p>
              </div>
            </div>
 
            <div class="text-sm text-gray-500">
              Leave balance:
              <span class="font-medium text-gray-800">{{ remainingOf(emp) }}</span>
              of {{ entitlementOf(emp) }} days
            </div>
 
            <div class="flex gap-2">
              <button
                @click="markAttendance(emp, 'present')"
                :class="['px-3 py-1.5 rounded-lg text-sm font-medium transition-colors', attendanceOf(emp) === 'present' ? 'bg-green-600 text-white' : 'bg-green-100 text-green-700 hover:bg-green-200']"
              >
                Present
              </button>
              <button
                @click="markAttendance(emp, 'absent')"
                :class="['px-3 py-1.5 rounded-lg text-sm font-medium transition-colors', attendanceOf(emp) === 'absent' ? 'bg-red-600 text-white' : 'bg-red-100 text-red-700 hover:bg-red-200']"
              >
                Absent
              </button>
              <button
                @click="openLeaveModal(emp)"
                :disabled="remainingOf(emp) === 0"
                class="px-3 py-1.5 rounded-lg text-sm font-medium bg-amber-100 text-amber-700 hover:bg-amber-200 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
              >
                Record leave
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
 
    <!-- Leave Modal -->
    <div v-if="showLeaveModal" class="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
      <div class="bg-white rounded-xl shadow-lg w-full max-w-md p-6">
        <h3 class="text-lg font-semibold text-gray-800 mb-1">Record leave</h3>
        <p class="text-sm text-gray-500 mb-4">
          {{ leaveTarget?.name }} has {{ leaveTarget ? remainingOf(leaveTarget) : 0 }} days remaining.
        </p>
 
        <div class="space-y-3">
          <div class="grid grid-cols-2 gap-3">
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">First day</label>
              <input v-model="leaveStart" type="date" class="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none">
            </div>
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">Last day</label>
              <input v-model="leaveEnd" type="date" :min="leaveStart" class="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none">
            </div>
          </div>
 
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">Reason</label>
            <input v-model="leaveReason" type="text" placeholder="Annual leave, sick leave, compassionate..." class="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none">
          </div>
 
          <div v-if="previewDays > 0" class="text-sm p-3 bg-gray-50 rounded-lg">
            {{ previewDays }} day{{ previewDays === 1 ? '' : 's' }} requested.
            Balance after this leave:
            <span :class="leaveTarget && remainingOf(leaveTarget) - previewDays < 0 ? 'text-red-600 font-medium' : 'font-medium text-gray-800'">
              {{ leaveTarget ? remainingOf(leaveTarget) - previewDays : 0 }} days
            </span>
          </div>
        </div>
 
        <div class="mt-6 flex justify-end gap-2">
          <button @click="showLeaveModal = false" class="px-4 py-2 rounded-lg bg-gray-100 text-gray-700 hover:bg-gray-200">Cancel</button>
          <button @click="confirmLeave" class="px-4 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700">Record leave</button>
        </div>
      </div>
    </div>
                <div>
                  <p class="font-medium text-gray-800">{{ emp.name }}</p>
                  <p class="text-sm text-gray-500">{{ emp.position }}</p>
                  <p v-if="emp.leaveReason" class="text-sm text-gray-500 mt-1">{{ emp.leaveReason }}</p>
                </div>
              </div>
 
              <div class="flex gap-6 text-sm">
                <div>
                  <p class="text-gray-500">Leave period</p>
                  <p class="font-medium text-gray-800">{{ formatDate(emp.leaveStart) }} - {{ formatDate(emp.leaveEnd) }}</p>
                </div>
                <div>
                  <p class="text-gray-500">Days booked</p>
                  <p class="font-medium text-gray-800">{{ emp.leaveDays || 0 }}</p>
                </div>
                <div>
                  <p class="text-gray-500">Days still away</p>
                  <p class="font-medium text-amber-700">{{ daysLeftOnCurrentLeave(emp) }}</p>
                </div>
                <div>
                  <p class="text-gray-500">Balance after</p>
                  <p class="font-medium text-gray-800">{{ remainingOf(emp) }} / {{ entitlementOf(emp) }}</p>
                </div>
              </div>
 
              <button @click="endLeave(emp)" class="px-3 py-1.5 bg-white border border-amber-200 text-amber-700 rounded-lg text-sm font-medium hover:bg-amber-100 transition-colors">
                End leave early
              </button>
            </div>
          </div>
        </div>
      </div>
 
      <!-- Daily attendance -->
      <div class="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
        <h3 class="font-semibold text-gray-800 mb-1">Attendance for today</h3>
        <p class="text-gray-500 text-sm mb-4">Mark each employee present or absent, or send them on leave.</p>
 
        <div v-if="employeesAvailable.length === 0" class="text-gray-400 text-sm py-4">
          No active employees to mark.
        </div>
 
        <div class="grid gap-4">
          <div v-for="emp in employeesAvailable" :key="emp._id" class="flex items-center justify-between gap-4 flex-wrap p-4 border border-gray-100 rounded-lg">
            <div class="flex items-center gap-3">
              <div class="w-10 h-10 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center font-medium">
                {{ emp.name?.charAt(0) }}
              </div>
              <div>
                <p class="font-medium text-gray-800">{{ emp.name }}</p>
                <p class="text-sm text-gray-500">{{ emp.position }}</p>
              </div>
            </div>
 
            <div class="text-sm text-gray-500">
              Leave balance:
              <span class="font-medium text-gray-800">{{ remainingOf(emp) }}</span>
              of {{ entitlementOf(emp) }} days
            </div>
 
            <div class="flex gap-2">
              <button
                @click="markAttendance(emp, 'present')"
                :class="['px-3 py-1.5 rounded-lg text-sm font-medium transition-colors', attendanceOf(emp) === 'present' ? 'bg-green-600 text-white' : 'bg-green-100 text-green-700 hover:bg-green-200']"
              >
                Present
              </button>
              <button
                @click="markAttendance(emp, 'absent')"
                :class="['px-3 py-1.5 rounded-lg text-sm font-medium transition-colors', attendanceOf(emp) === 'absent' ? 'bg-red-600 text-white' : 'bg-red-100 text-red-700 hover:bg-red-200']"
              >
                Absent
              </button>
              <button
                @click="openLeaveModal(emp)"
                :disabled="remainingOf(emp) === 0"
                class="px-3 py-1.5 rounded-lg text-sm font-medium bg-amber-100 text-amber-700 hover:bg-amber-200 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
              >
                Record leave
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
 
    <!-- Leave Modal -->
    <div v-if="showLeaveModal" class="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
      <div class="bg-white rounded-xl shadow-lg w-full max-w-md p-6">
        <h3 class="text-lg font-semibold text-gray-800 mb-1">Record leave</h3>
        <p class="text-sm text-gray-500 mb-4">
          {{ leaveTarget?.name }} has {{ leaveTarget ? remainingOf(leaveTarget) : 0 }} days remaining.
        </p>
 
        <div class="space-y-3">
          <div class="grid grid-cols-2 gap-3">
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">First day</label>
              <input v-model="leaveStart" type="date" class="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none">
            </div>
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">Last day</label>
              <input v-model="leaveEnd" type="date" :min="leaveStart" class="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none">
            </div>
          </div>
 
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">Reason</label>
            <input v-model="leaveReason" type="text" placeholder="Annual leave, sick leave, compassionate..." class="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none">
          </div>
 
          <div v-if="previewDays > 0" class="text-sm p-3 bg-gray-50 rounded-lg">
            {{ previewDays }} day{{ previewDays === 1 ? '' : 's' }} requested.
            Balance after this leave:
            <span :class="leaveTarget && remainingOf(leaveTarget) - previewDays < 0 ? 'text-red-600 font-medium' : 'font-medium text-gray-800'">
              {{ leaveTarget ? remainingOf(leaveTarget) - previewDays : 0 }} days
            </span>
          </div>
        </div>
 
        <div class="mt-6 flex justify-end gap-2">
          <button @click="showLeaveModal = false" class="px-4 py-2 rounded-lg bg-gray-100 text-gray-700 hover:bg-gray-200">Cancel</button>
          <button @click="confirmLeave" class="px-4 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700">Record leave</button>
        </div>
      </div>
    </div>ef('')
const leaveReason = ref('')
 
onMounted(() => {
  // Without this the table is empty until a manual reload.
  store.fetchEmployees()
})
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

       <!-- ===================== Employees Tab ===================== -->
    <div v-if="activeTab === 'employees'">
      <!-- Toolbar -->
      <div class="flex flex-wrap gap-3 items-center mb-6">
        <div class="relative flex-1 min-w-[220px]">
          <input v-model="searchQuery" type="text" placeholder="Search name, position or department..." class="pl-10 pr-4 py-2 border rounded-lg w-full focus:ring-2 focus:ring-blue-500 outline-none">
          <Search class="w-4 h-4 text-gray-400 absolute left-3 top-2.5" />
        </div>
        <select v-model="departmentFilter" class="px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none">
          <option value="">All Departments</option>
          <option v-for="d in departments" :key="d" :value="d">{{ d }}</option>
        </select>
        <button @click="showAddForm = !showAddForm" class="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium flex items-center gap-2 transition-colors">
          <Plus class="w-4 h-4" />
          {{ showAddForm ? 'Cancel' : 'Add Employee' }}
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
            <option v-for="d in departments" :key="d">{{ d }}</option>
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
              <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Leave Balance</th>
              <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
              <th class="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Actions</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-gray-100">
            <tr v-if="store.loading">
              <td colspan="7" class="px-6 py-10 text-center text-gray-400">
                <Loader2 class="w-5 h-5 animate-spin inline" />
                <span class="ml-2">Loading employees...</span>
              </td>
            </tr>
 
            <tr v-for="emp in filteredEmployees" :key="emp._id" class="hover:bg-gray-50">
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
              <td class="px-6 py-4 text-gray-600">{{ emp.department || '-' }}</td>
              <td class="px-6 py-4 font-medium text-gray-800">{{ formatCurrency(emp.salary) }}</td>
              <td class="px-6 py-4 text-gray-600">{{ formatDate(emp.startDate) }}</td>
              <td class="px-6 py-4">
                <span class="font-medium text-gray-800">{{ remainingOf(emp) }}</span>
                <span class="text-xs text-gray-400 ml-1">of {{ entitlementOf(emp) }} days left</span>
              </td>
              <td class="px-6 py-4">
                <span v-if="isOnLeave(emp)" class="px-2 py-1 rounded-full text-xs font-medium bg-amber-100 text-amber-700">
                  On leave
                </span>
                <span v-else :class="['px-2 py-1 rounded-full text-xs font-medium', emp.status === 'active' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600']">
                  {{ emp.status || 'active' }}
                </span>
              </td>
              <td class="px-6 py-4 text-right">
                <button class="p-1 hover:bg-gray-100 rounded-lg transition-colors">
                  <MoreVertical class="w-4 h-4 text-gray-500" />
                </button>
              </td>
            </tr>
 
            <!-- Empty state now checks the SAME list that is rendered -->
            <tr v-if="!store.loading && filteredEmployees.length === 0">
              <td colspan="7" class="px-6 py-10 text-center text-gray-400">
                <template v-if="store.employees.length === 0">
                  No employees yet. Add your first one to get started.
                </template>
                <template v-else>
                  No employees match this search.
                </template>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
 
    <!-- ===================== Attendance & Leave Tab ===================== -->
    <div v-if="activeTab === 'attendance'" class="space-y-6">
      <!-- Currently on leave -->
      <div class="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
        <div class="flex items-center gap-2 mb-1">
          <CalendarDays class="w-5 h-5 text-amber-600" />
          <h3 class="font-semibold text-gray-800">On leave today ({{ employeesOnLeave.length }})</h3>
        </div>
        <p class="text-gray-500 text-sm mb-4">Who is away, for how long, and what they have left.</p>
 
        <div v-if="employeesOnLeave.length === 0" class="text-gray-400 text-sm py-4">
          Nobody is on leave today.
        </div>
 
        <div v-else class="grid gap-4">
          <div v-for="emp in employeesOnLeave" :key="emp._id" class="p-4 border border-amber-100 bg-amber-50/40 rounded-lg">
            <div class="flex items-start justify-between gap-4 flex-wrap">
              <div class="flex items-center gap-3">
                <div class="w-10 h-10 bg-amber-100 text-amber-700 rounded-full flex items-center justify-center font-medium">
                  {{ emp.name?.charAt(0) }}
                </div>
                <div>
                  <p class="font-medium text-gray-800">{{ emp.name }}</p>
                  <p class="text-sm text-gray-500">{{ emp.position }}</p>
                  <p v-if="emp.leaveReason" class="text-sm text-gray-500 mt-1">{{ emp.leaveReason }}</p>
                </div>
              </div>
 
              <div class="flex gap-6 text-sm">
                <div>
                  <p class="text-gray-500">Leave period</p>
                  <p class="font-medium text-gray-800">{{ formatDate(emp.leaveStart) }} - {{ formatDate(emp.leaveEnd) }}</p>
                </div>
                <div>
                  <p class="text-gray-500">Days booked</p>
                  <p class="font-medium text-gray-800">{{ emp.leaveDays || 0 }}</p>
                </div>
                <div>
                  <p class="text-gray-500">Days still away</p>
                  <p class="font-medium text-amber-700">{{ daysLeftOnCurrentLeave(emp) }}</p>
                </div>
                <div>
                  <p class="text-gray-500">Balance after</p>
                  <p class="font-medium text-gray-800">{{ remainingOf(emp) }} / {{ entitlementOf(emp) }}</p>
                </div>
              </div>
 
              <button @click="endLeave(emp)" class="px-3 py-1.5 bg-white border border-amber-200 text-amber-700 rounded-lg text-sm font-medium hover:bg-amber-100 transition-colors">
                End leave early
              </button>
            </div>
          </div>
        </div>
      </div>
 
      <!-- Daily attendance -->
      <div class="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
        <h3 class="font-semibold text-gray-800 mb-1">Attendance for today</h3>
        <p class="text-gray-500 text-sm mb-4">Mark each employee present or absent, or send them on leave.</p>
 
        <div v-if="employeesAvailable.length === 0" class="text-gray-400 text-sm py-4">
          No active employees to mark.
        </div>
 
        <div class="grid gap-4">
          <div v-for="emp in employeesAvailable" :key="emp._id" class="flex items-center justify-between gap-4 flex-wrap p-4 border border-gray-100 rounded-lg">
            <div class="flex items-center gap-3">
              <div class="w-10 h-10 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center font-medium">
                {{ emp.name?.charAt(0) }}
              </div>
              <div>
                <p class="font-medium text-gray-800">{{ emp.name }}</p>
                <p class="text-sm text-gray-500">{{ emp.position }}</p>
              </div>
            </div>
 
            <div class="text-sm text-gray-500">
              Leave balance:
              <span class="font-medium text-gray-800">{{ remainingOf(emp) }}</span>
              of {{ entitlementOf(emp) }} days
            </div>
 
            <div class="flex gap-2">
              <button
                @click="markAttendance(emp, 'present')"
                :class="['px-3 py-1.5 rounded-lg text-sm font-medium transition-colors', attendanceOf(emp) === 'present' ? 'bg-green-600 text-white' : 'bg-green-100 text-green-700 hover:bg-green-200']"
              >
                Present
              </button>
              <button
                @click="markAttendance(emp, 'absent')"
                :class="['px-3 py-1.5 rounded-lg text-sm font-medium transition-colors', attendanceOf(emp) === 'absent' ? 'bg-red-600 text-white' : 'bg-red-100 text-red-700 hover:bg-red-200']"
              >
                Absent
              </button>
              <button
                @click="openLeaveModal(emp)"
                :disabled="remainingOf(emp) === 0"
                class="px-3 py-1.5 rounded-lg text-sm font-medium bg-amber-100 text-amber-700 hover:bg-amber-200 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
              >
                Record leave
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
 
    <!-- Leave Modal -->
    <div v-if="showLeaveModal" class="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
      <div class="bg-white rounded-xl shadow-lg w-full max-w-md p-6">
        <h3 class="text-lg font-semibold text-gray-800 mb-1">Record leave</h3>
        <p class="text-sm text-gray-500 mb-4">
          {{ leaveTarget?.name }} has {{ leaveTarget ? remainingOf(leaveTarget) : 0 }} days remaining.
        </p>
 
        <div class="space-y-3">
          <div class="grid grid-cols-2 gap-3">
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">First day</label>
              <input v-model="leaveStart" type="date" class="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none">
            </div>
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">Last day</label>
              <input v-model="leaveEnd" type="date" :min="leaveStart" class="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none">
            </div>
          </div>
 
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">Reason</label>
            <input v-model="leaveReason" type="text" placeholder="Annual leave, sick leave, compassionate..." class="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none">
          </div>
 
          <div v-if="previewDays > 0" class="text-sm p-3 bg-gray-50 rounded-lg">
            {{ previewDays }} day{{ previewDays === 1 ? '' : 's' }} requested.
            Balance after this leave:
            <span :class="leaveTarget && remainingOf(leaveTarget) - previewDays < 0 ? 'text-red-600 font-medium' : 'font-medium text-gray-800'">
              {{ leaveTarget ? remainingOf(leaveTarget) - previewDays : 0 }} days
            </span>
          </div>
        </div>
 
        <div class="mt-6 flex justify-end gap-2">
          <button @click="showLeaveModal = false" class="px-4 py-2 rounded-lg bg-gray-100 text-gray-700 hover:bg-gray-200">Cancel</button>
          <button @click="confirmLeave" class="px-4 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700">Record leave</button>
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
