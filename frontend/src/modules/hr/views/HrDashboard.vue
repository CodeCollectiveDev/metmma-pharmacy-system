<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import MainLayout from '@/layouts/MainLayout.vue'
import { useHrStore } from '../store/hrStore'
import { useRole } from '@/composables/useRole'
import { Plus, Search, UserPlus, Calendar, DollarSign, MoreVertical, Palmtree, RefreshCw, CheckCircle2, XCircle } from 'lucide-vue-next'
import TableSkeleton from '@/modules/shared/components/skeleton/TableSkeleton.vue'

const store = useHrStore()
const router = useRouter()
const { canManageUsers } = useRole()
const activeTab = ref('employees')
const showAddForm = ref(false)
const searchQuery = ref('')
const formMessage = ref(null)
const createdEmployee = ref(null)
const selectedDate = ref(new Date().toISOString().split('T')[0])
const leaveMessage = ref(null)
const attendanceMessage = ref(null)
const savingEmployee = ref(false)
const newLeave = ref({ employee_id: '', leave_type: 'Annual leave', reason: '', start_date: '', expected_return_date: '' })

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
  store.fetchAttendance(selectedDate.value)
  store.fetchLeave()
  store.fetchLeaveRequests()
})

const attendanceByEmployee = computed(() => new Map(store.attendance.map(record => [String(record.employee_id), record])))
const attendanceRows = computed(() => store.activeEmployees.map(employee => ({
  employee,
  record: attendanceByEmployee.value.get(String(employee.id)),
  status: attendanceByEmployee.value.get(String(employee.id))?.status || 'Absent',
  onLeave: attendanceByEmployee.value.get(String(employee.id))?.on_leave || false
})))
const presentCount = computed(() => attendanceRows.value.filter(row => ['Present', 'Late'].includes(row.status)).length)
const absentCount = computed(() => attendanceRows.value.filter(row => row.status === 'Absent').length)

const loadAttendance = () => store.fetchAttendance(selectedDate.value)

const markEmployeeAttendance = async (employee, status) => {
  attendanceMessage.value = null
  const success = await store.markAttendance({
    employee_id: employee.id,
    date: selectedDate.value,
    status: status.toLowerCase()
  })
  attendanceMessage.value = success
    ? { type: 'success', text: `${employee.name}'s attendance was saved for ${formatDate(selectedDate.value)}.` }
    : { type: 'error', text: store.error || 'Could not save attendance.' }
}

const submitLeave = async () => {
  leaveMessage.value = null
  const result = await store.createLeave({ ...newLeave.value, employee_id: Number(newLeave.value.employee_id) })
  leaveMessage.value = result.ok
    ? { type: 'success', text: 'Leave request submitted for approval.' }
    : { type: 'error', text: result.error || 'Could not submit leave request.' }
  if (result.ok) newLeave.value = { employee_id: '', leave_type: 'Annual leave', reason: '', start_date: '', expected_return_date: '' }
}

const reviewLeave = async (request, status) => {
  await store.updateLeaveStatus(request.id, status)
}

const filteredEmployees = () => {
  if (!searchQuery.value) return store.employees
  return store.employees.filter(e => 
    e.name.toLowerCase().includes(searchQuery.value.toLowerCase()) ||
    e.position.toLowerCase().includes(searchQuery.value.toLowerCase())
  )
}

const resetForm = () => {
  newEmployee.value = { name: '', position: '', department: '', salary: null, startDate: '', status: 'active', email: '', phone: '' }
  createdEmployee.value = null
}

const saveEmployee = async () => {
  if (savingEmployee.value) return
  formMessage.value = null
  if (!newEmployee.value.name || !newEmployee.value.position) {
    formMessage.value = { type: 'error', text: 'Full name and position are required' }
    return
  }

  savingEmployee.value = true
  try {
    const result = await store.addEmployee({ ...newEmployee.value })
    if (result.ok) {
      createdEmployee.value = result.data
      formMessage.value = {
        type: 'success',
        text: `Employee ${result.data.first_name} ${result.data.last_name} created (${result.data.employee_id})`
      }
      showAddForm.value = false
      resetForm()
    } else {
      formMessage.value = { type: 'error', text: result.error || 'Failed to add employee' }
    }
  } finally {
    savingEmployee.value = false
  }
}

const formatDate = (d) => {
  if (!d) return '-'
  const date = new Date(d)
  if (Number.isNaN(date.getTime())) return d
  return date.toLocaleDateString('en-MW', { dateStyle: 'medium' })
}

const formatCurrency = (amount) => {
  return new Intl.NumberFormat('en-MW', { style: 'currency', currency: 'MWK', minimumFractionDigits: 0 }).format(amount || 0)
}

// Jump to User Management with the employee preselected so an account can be
// provisioned without retyping the employee's details.
const grantAccount = (emp) => {
  const id = emp.id ?? emp._id
  if (!id) return
  router.push({ path: '/users', query: { employee: String(id) } })
}
</script>

<template>
  <MainLayout title="HR Management" subtitle="Manage employees, attendance, and payroll">
    <!-- Form feedback -->
    <div v-if="formMessage" :class="['p-3 rounded-lg mb-4 text-sm border flex items-center gap-2', formMessage.type === 'error' ? 'bg-red-50 text-red-600 border-red-100' : 'bg-green-50 text-green-600 border-green-100']">
      <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-alert-circle"><circle cx="12" cy="12" r="10"/><line x1="12" x2="12" y1="8" y2="12"/><line x1="12" x2="12.01" y1="16" y2="16"/></svg>
      {{ formMessage.text }}
    </div>

    <!-- Created employee details -->
    <div v-if="createdEmployee" class="app-card app-card-body mb-6 bg-green-50/50 border-green-100">
      <h3 class="app-section-title mb-3">Employee Created Successfully</h3>
      <dl class="grid grid-cols-2 md:grid-cols-3 gap-x-6 gap-y-3 text-sm">
        <div><dt class="text-gray-500 text-xs uppercase">Name</dt><dd class="font-medium text-gray-800">{{ createdEmployee.first_name }} {{ createdEmployee.last_name }}</dd></div>
        <div><dt class="text-gray-500 text-xs uppercase">Role / Position</dt><dd class="font-medium text-gray-800">{{ createdEmployee.role }}</dd></div>
        <div><dt class="text-gray-500 text-xs uppercase">Employee ID</dt><dd class="font-medium text-gray-800">{{ createdEmployee.employee_id }}</dd></div>
        <div><dt class="text-gray-500 text-xs uppercase">Department</dt><dd class="font-medium text-gray-800">{{ createdEmployee.department }}</dd></div>
        <div><dt class="text-gray-500 text-xs uppercase">Start Date</dt><dd class="font-medium text-gray-800">{{ formatDate(createdEmployee.hire_date) }}</dd></div>
        <div><dt class="text-gray-500 text-xs uppercase">Status</dt><dd class="font-medium text-gray-800">{{ createdEmployee.is_active === false ? 'Inactive' : 'Active' }}</dd></div>
      </dl>
    </div>

    <!-- Tabs -->
    <div class="app-card mb-6">
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
          @click="activeTab = 'leave'"
          :class="['px-6 py-4 font-medium text-sm transition-colors flex items-center gap-2', activeTab === 'leave' ? 'text-blue-600 border-b-2 border-blue-600' : 'text-gray-500 hover:text-gray-700']"
        >
          <Palmtree class="w-4 h-4" /> Leave
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
      <TableSkeleton v-if="store.loading" />

      <template v-else>
      <div v-if="showAddForm" class="app-card app-card-body mb-6">
        <h3 class="app-section-title mb-4">Add New Employee</h3>
        <form @submit.prevent="saveEmployee">
        <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
          <input v-model="newEmployee.name" type="text" placeholder="Full Name *" required class="px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none">
          <input v-model="newEmployee.position" type="text" placeholder="Position / Role *" required class="px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none">
          <select v-model="newEmployee.department" required class="px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none">
            <option value="" disabled>Select Department *</option>
            <option>Pharmacy</option>
            <option>Sales</option>
            <option>Operations</option>
            <option>Finance</option>
            <option>Human Resources</option>
            <option>Administration</option>
            <option>IT</option>
          </select>
          <input v-model="newEmployee.email" type="email" placeholder="Email *" required class="px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none">
          <input v-model.number="newEmployee.salary" type="number" placeholder="Salary (MWK) *" required class="px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none">
          <label class="flex flex-col gap-1 text-sm text-gray-600"><span>Employment Start Date</span><input v-model="newEmployee.startDate" type="date" class="px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"></label>
          <input v-model="newEmployee.phone" type="tel" placeholder="Phone Number" class="px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none">
        </div>
        <div class="flex justify-end gap-3 mt-4">
          <button type="button" @click="showAddForm = false" class="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors">Cancel</button>
          <button type="submit" :disabled="savingEmployee" class="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60 text-white rounded-lg font-medium transition-colors">{{ savingEmployee ? 'Saving Employee...' : 'Save Employee' }}</button>
        </div>
        </form>
      </div>

      <!-- Employees Table -->
      <div class="app-card overflow-hidden"><div class="overflow-x-auto">
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
              <td class="px-6 py-4 text-gray-600">{{ emp.startDate ? formatDate(emp.startDate) : '-' }}</td>
              <td class="px-6 py-4">
                <span :class="['px-2 py-1 rounded-full text-xs font-medium', emp.status === 'active' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600']">
                  {{ emp.status }}
                </span>
              </td>
              <td class="px-6 py-4 text-right space-x-2">
                <button v-if="canManageUsers && !emp.user_id" @click="grantAccount(emp)" class="px-2 py-1 text-sm text-blue-600 hover:bg-blue-50 rounded-lg transition-colors inline-flex items-center gap-1" :title="`Create a login account for ${emp.name}`">
                  <UserPlus class="w-3.5 h-3.5" /> Create account
                </button>
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
      </template>
    </div>

    <!-- Attendance Tab -->
    <div v-if="activeTab === 'attendance'" class="space-y-6">
      <div class="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div class="app-card app-card-body"><p class="text-sm text-gray-500">Reported for work</p><p class="mt-1 text-2xl font-semibold text-green-700">{{ presentCount }}</p></div>
        <div class="app-card app-card-body"><p class="text-sm text-gray-500">Not reported</p><p class="mt-1 text-2xl font-semibold text-red-700">{{ absentCount }}</p></div>
        <div class="app-card app-card-body"><p class="text-sm text-gray-500">Attendance date</p><p class="mt-1 text-lg font-semibold text-gray-800">{{ formatDate(selectedDate) }}</p></div>
      </div>
      <div class="app-card app-card-body">
        <div class="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4 mb-5">
          <div><h3 class="app-section-title">Daily attendance</h3><p class="text-sm text-gray-500 mt-1">Select a work date, then mark each employee. Previous dates remain in the attendance history.</p></div>
          <div class="flex items-center gap-2"><label for="attendance-date" class="text-sm text-gray-600">Work date</label><input id="attendance-date" v-model="selectedDate" @change="loadAttendance" type="date" class="px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none"><button @click="loadAttendance" class="p-2 border border-gray-200 rounded-lg text-gray-600 hover:bg-gray-50" title="Refresh attendance for selected date" aria-label="Refresh attendance"><RefreshCw class="w-4 h-4" /></button></div>
        </div>
        <div v-if="attendanceMessage" :class="['mb-4 rounded-lg p-3 text-sm', attendanceMessage.type === 'error' ? 'bg-red-50 text-red-700' : 'bg-green-50 text-green-700']">{{ attendanceMessage.text }}</div>
        <div v-if="store.attendanceLoading" class="space-y-3"><div v-for="n in 5" :key="n" class="h-16 rounded-lg bg-gray-100 animate-pulse"></div></div>
        <div v-else-if="store.error" class="p-4 rounded-lg bg-red-50 text-red-700 text-sm">{{ store.error }}</div>
        <div v-else class="overflow-x-auto"><table class="w-full min-w-[680px]"><thead class="bg-gray-50 border-b border-gray-100"><tr><th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Employee</th><th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Department</th><th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th><th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Check-in</th></tr></thead><tbody class="divide-y divide-gray-100">
          <tr v-for="row in attendanceRows" :key="row.employee._id" class="hover:bg-gray-50"><td class="px-4 py-3"><p class="font-medium text-gray-800">{{ row.employee.name }}</p><p class="text-xs text-gray-500">{{ row.employee.position }}</p></td><td class="px-4 py-3 text-sm text-gray-600">{{ row.employee.department }}</td><td class="px-4 py-3"><span v-if="row.onLeave" class="inline-flex rounded-lg bg-amber-100 px-2 py-1.5 text-sm font-medium text-amber-700">On approved leave</span><select v-else :value="row.status" @change="markEmployeeAttendance(row.employee, $event.target.value)" class="rounded-lg border border-gray-200 px-2 py-1.5 text-sm focus:ring-2 focus:ring-blue-500 outline-none"><option>Present</option><option>Absent</option><option>Late</option><option>Leave</option><option>Holiday</option></select></td><td class="px-4 py-3 text-sm text-gray-600">{{ row.record?.check_in || '-' }}</td></tr>
          <tr v-if="attendanceRows.length === 0"><td colspan="4" class="px-4 py-10 text-center text-gray-400">No active employees found.</td></tr>
        </tbody></table></div>
      </div>
    </div>

    <!-- Leave Tab -->
    <div v-if="activeTab === 'leave'" class="space-y-6">
      <div class="app-card app-card-body">
        <div class="mb-4"><h3 class="app-section-title">Give employee leave</h3><p class="text-sm text-gray-500 mt-1">Submit a request for approval. Approved leave appears when its start date arrives.</p></div>
        <div v-if="leaveMessage" :class="['mb-4 p-3 rounded-lg text-sm', leaveMessage.type === 'error' ? 'bg-red-50 text-red-700' : 'bg-green-50 text-green-700']">{{ leaveMessage.text }}</div>
        <form @submit.prevent="submitLeave" class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-3 items-end">
          <label class="text-sm text-gray-600">Employee<select v-model="newLeave.employee_id" required class="mt-1 w-full px-3 py-2 border border-gray-200 rounded-lg text-sm"><option value="" disabled>Select employee</option><option v-for="employee in store.activeEmployees" :key="employee.id" :value="employee.id">{{ employee.name }}</option></select></label>
          <label class="text-sm text-gray-600">Leave type<select v-model="newLeave.leave_type" class="mt-1 w-full px-3 py-2 border border-gray-200 rounded-lg text-sm"><option>Annual leave</option><option>Sick leave</option><option>Family leave</option><option>Study leave</option><option>Other</option></select></label>
          <label class="text-sm text-gray-600">Start date<input v-model="newLeave.start_date" required type="date" class="mt-1 w-full px-3 py-2 border border-gray-200 rounded-lg text-sm"></label>
          <label class="text-sm text-gray-600">Expected return<input v-model="newLeave.expected_return_date" required type="date" class="mt-1 w-full px-3 py-2 border border-gray-200 rounded-lg text-sm"></label>
          <button type="submit" class="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium">Submit for approval</button>
          <label class="text-sm text-gray-600 md:col-span-2 lg:col-span-4">Reason<textarea v-model="newLeave.reason" rows="2" placeholder="Reason for leave" class="mt-1 w-full px-3 py-2 border border-gray-200 rounded-lg text-sm resize-none"></textarea></label>
        </form>
      </div>
      <div class="app-card app-card-body">
        <div class="flex items-center justify-between mb-4"><div><h3 class="app-section-title">Pending leave requests</h3><p class="text-sm text-gray-500 mt-1">Review requests before they become active.</p></div><span class="px-2 py-1 rounded-full bg-amber-100 text-amber-700 text-xs font-medium">{{ store.leaveRequests.length }} pending</span></div>
        <div v-if="store.leaveRequests.length === 0" class="py-8 text-center text-gray-400">No pending leave requests.</div>
        <div v-else class="space-y-3"><div v-for="request in store.leaveRequests" :key="request.id" class="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border border-gray-100 rounded-lg p-4"><div><p class="font-medium text-gray-800">{{ request.first_name }} {{ request.last_name }} <span class="font-normal text-gray-500">· {{ request.leave_type }}</span></p><p class="text-sm text-gray-500">{{ formatDate(request.start_date) }} to {{ formatDate(request.expected_return_date) }}<span v-if="request.reason"> · {{ request.reason }}</span></p></div><div class="flex gap-2"><button @click="reviewLeave(request, 'approved')" class="px-3 py-1.5 bg-green-100 text-green-700 rounded-lg text-sm font-medium hover:bg-green-200">Approve</button><button @click="reviewLeave(request, 'rejected')" class="px-3 py-1.5 bg-red-100 text-red-700 rounded-lg text-sm font-medium hover:bg-red-200">Reject</button></div></div></div>
      </div>
      <div class="app-card app-card-body">
      <div class="flex items-start justify-between gap-4 mb-5"><div><h3 class="app-section-title">Employees currently on leave</h3><p class="text-sm text-gray-500 mt-1">Active leave records with expected return dates and remaining days.</p></div><Palmtree class="w-5 h-5 text-emerald-600" /></div>
      <div v-if="store.leaveLoading" class="grid gap-3 sm:grid-cols-2"><div v-for="n in 4" :key="n" class="h-32 rounded-lg bg-gray-100 animate-pulse"></div></div>
      <div v-else-if="store.leave.length === 0" class="py-12 text-center text-gray-400">No employees are currently on leave.</div>
      <div v-else class="grid gap-4 lg:grid-cols-2"><article v-for="person in store.leave" :key="person.id" class="rounded-lg border border-emerald-100 bg-emerald-50/40 p-4"><div class="flex items-start justify-between gap-3"><div><h4 class="font-semibold text-gray-800">{{ person.first_name }} {{ person.last_name }}</h4><p class="text-sm text-gray-500">{{ person.role }} · {{ person.department }}</p></div><span class="px-2 py-1 rounded-full bg-emerald-100 text-emerald-700 text-xs font-medium">On leave</span></div><p class="mt-4 text-sm text-gray-700"><span class="font-medium">{{ person.leave_type }}</span><span v-if="person.reason"> · {{ person.reason }}</span></p><div class="mt-4 grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm"><div><p class="text-xs text-gray-500">Started</p><p class="font-medium text-gray-800">{{ formatDate(person.start_date) }}</p></div><div><p class="text-xs text-gray-500">Returns</p><p class="font-medium text-gray-800">{{ formatDate(person.expected_return_date) }}</p></div><div><p class="text-xs text-gray-500">Used</p><p class="font-medium text-gray-800">{{ person.days_used }} days</p></div><div><p class="text-xs text-gray-500">Remaining</p><p class="font-semibold text-emerald-700">{{ person.days_remaining }} days</p></div></div></article></div>
      </div>
    </div>

    <!-- Payroll Tab -->
    <div v-if="activeTab === 'payroll'" class="app-card overflow-hidden">
      <div class="border-b border-gray-100 px-5 py-4">
        <h3 class="app-section-title">Payroll Summary</h3>
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
