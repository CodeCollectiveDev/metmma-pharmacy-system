import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { dataOrchestrator } from '@/services/data/dataOrchestrator'
import { dataService } from '@/services/api/dataService'

export const useHrStore = defineStore('hr', () => {
    const employees = ref([])
    const attendance = ref([])
    const leave = ref([])
    const leaveRequests = ref([])
    const loading = ref(false)
    const attendanceLoading = ref(false)
    const leaveLoading = ref(false)
    const error = ref(null)

    async function fetchEmployees() {
        loading.value = true
        try {
            employees.value = await dataOrchestrator.fetchCollection('employees', dataService.getEmployees)
        } catch (err) {
            console.error('Error fetching employees:', err)
            error.value = err.message
        } finally {
            loading.value = false
        }
    }

    async function addEmployee(employee) {
        try {
            // Normalize employee data to match the backend contract
            // (employees table stores the job title in `role`).
            const name = employee.name || ''
            const parts = name.trim().split(/\s+/)
            const employeeData = {
                first_name: employee.first_name || parts[0] || '',
                last_name: employee.last_name || parts.slice(1).join(' ') || 'Staff',
                role: employee.role || employee.position || '',
                department: employee.department || '',
                email: employee.email || '',
                salary: Number(employee.salary) || 0,
                hire_date: employee.startDate || employee.hire_date || new Date().toISOString().split('T')[0],
                phone: employee.phone || '',
                status: employee.status || 'active'
            }

            // Field-level guard so the backend never rejects with a 400.
            const required = ['first_name', 'last_name', 'role', 'department', 'email', 'salary']
            for (const field of required) {
                if (!employeeData[field]) {
                    return { ok: false, error: `Missing required field: ${field}` }
                }
            }

            const result = await dataService.addEmployee(employeeData)
            const created = result.data

            if (created && created.id) {
                await fetchEmployees()
                return { ok: true, data: created }
            }
            return { ok: false, error: 'Server did not return the created employee' }
        } catch (error) {
            console.error('Error adding employee:', error)
            const msg = error.response?.data?.error || error.response?.data?.message || error.message
            return { ok: false, error: msg || 'Failed to add employee' }
        }
    }

    async function fetchAttendance(date = new Date().toISOString().split('T')[0]) {
        attendanceLoading.value = true
        error.value = null
        try {
            const response = await dataService.getAttendanceByDate(date)
            attendance.value = response.data?.data || response.data || []
        } catch (err) {
            console.error('Error fetching attendance:', err)
            error.value = err.message
        } finally {
            attendanceLoading.value = false
        }
    }

    async function fetchLeave() {
        leaveLoading.value = true
        error.value = null
        try {
            const response = await dataService.getCurrentLeave()
            leave.value = response.data?.data || response.data || []
        } catch (err) {
            console.error('Error fetching leave:', err)
            error.value = err.message
        } finally {
            leaveLoading.value = false
        }
    }

    async function fetchLeaveRequests() {
        try {
            const response = await dataService.getLeaveRequests()
            leaveRequests.value = response.data?.data || []
        } catch (err) {
            console.error('Error fetching leave requests:', err)
            error.value = err.message
        }
    }

    async function createLeave(leaveData) {
        try {
            await dataService.createLeave(leaveData)
            await Promise.all([fetchLeave(), fetchLeaveRequests()])
            return { ok: true }
        } catch (err) {
            return { ok: false, error: err.response?.data?.error || err.message }
        }
    }

    async function updateLeaveStatus(id, status) {
        try {
            await dataService.updateLeaveStatus(id, status)
            await Promise.all([fetchLeave(), fetchLeaveRequests()])
            return true
        } catch (err) {
            error.value = err.response?.data?.error || err.message
            return false
        }
    }

    async function markAttendance(record) {
        error.value = null
        try {
            // Normalize attendance record
            const attendanceData = {
                employee_id: record.employee_id || record.employeeId,
                date: record.date || new Date().toISOString().split('T')[0],
                status: record.status || 'present'
            }
            
            const result = await dataService.markAttendance(attendanceData)
            if (result.data?.success || result.status === 201) {
                await fetchAttendance(attendanceData.date)
                return true
            }
            return false
        } catch (err) {
            console.error('Error marking attendance:', err)
            error.value = err.response?.data?.error || err.message
            return false
        }
    }

    const activeEmployees = computed(() => employees.value.filter(e => e.status === 'active'))

    return {
        employees,
        attendance,
        leave,
        leaveRequests,
        loading,
        attendanceLoading,
        leaveLoading,
        error,
        fetchEmployees,
        addEmployee,
        fetchAttendance,
        fetchLeave,
        fetchLeaveRequests,
        createLeave,
        updateLeaveStatus,
        markAttendance,
        activeEmployees
    }
})
