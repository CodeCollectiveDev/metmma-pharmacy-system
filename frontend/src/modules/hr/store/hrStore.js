import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { dataOrchestrator } from '@/services/data/dataOrchestrator'
import { dataService } from '@/services/api/dataService'

export const useHrStore = defineStore('hr', () => {
    const employees = ref([])
    const attendance = ref([])
    const loading = ref(false)
    const attendanceLoading = ref(false)
    const attendanceError = ref(null)

    async function fetchEmployees() {
        loading.value = true
        try {
            employees.value = await dataOrchestrator.fetchCollection('employees', dataService.getEmployees)
        } catch (error) {
            console.error('Error fetching employees:', error)
        } finally {
            loading.value = false
        }
    }

    async function addEmployee(employee) {
        try {
            // Normalize employee data to match backend schema
            const employeeData = {
                first_name: employee.first_name || employee.name?.split(' ')[0] || '',
                last_name: employee.last_name || employee.name?.split(' ').slice(1).join(' ') || '',
                role: employee.position || employee.role || 'employee',
                hire_date: employee.startDate || employee.hire_date || new Date().toISOString().split('T')[0],
                salary: employee.salary || 0,
                email: employee.email || '',
                phone: employee.phone || '',
                status: employee.status || 'active'
            }
            
            const result = await dataService.addEmployee(employeeData)
            if (result.data?.success || result.status === 201) {
                await fetchEmployees()
                return true
            }
            return false
        } catch (error) {
            console.error('Error adding employee:', error)
            return false
        }
    }

    /**
     * Fetch attendance records from backend API
     * Optional filter parameter (e.g. { date: 'YYYY-MM-DD' } or employeeId)
     */
    async function fetchAttendance(filters) {
        attendanceLoading.value = true
        attendanceError.value = null
        try {
            const response = await dataService.getAttendance(filters)
            const payload = response?.data?.data ?? response?.data ?? []
            attendance.value = Array.isArray(payload) ? payload : []
            return attendance.value
        } catch (error) {
            const errorMessage = error.response?.data?.error || error.response?.data?.message || error.message || 'Error fetching attendance'
            attendanceError.value = errorMessage
            console.error('Error fetching attendance from backend API:', error)
            return []
        } finally {
            attendanceLoading.value = false
        }
    }

    /**
     * Mark/save attendance record via backend API
     */
    async function markAttendance(record) {
        attendanceLoading.value = true
        attendanceError.value = null
        try {
            const rawEmpId = record.employee_id ?? record.employeeId ?? record.id ?? record._id
            const empId = typeof rawEmpId === 'number' ? rawEmpId : parseInt(rawEmpId, 10)

            const attendanceData = {
                employee_id: empId,
                date: record.date || new Date().toISOString().split('T')[0],
                status: (record.status || 'present').toLowerCase(),
                check_in_time: record.check_in_time || record.check_in || (record.status?.toLowerCase() === 'present' ? new Date().toTimeString().slice(0, 5) : null),
                notes: record.notes || null
            }
            
            const result = await dataService.markAttendance(attendanceData)
            if (result.status === 200 || result.status === 201 || result.data?.message) {
                await fetchAttendance()
                return { success: true, data: result.data }
            }
            return { success: false, error: 'Unexpected response from server' }
        } catch (error) {
            const errorMessage = error.response?.data?.error || error.response?.data?.message || error.message || 'Error marking attendance'
            attendanceError.value = errorMessage
            console.error('Error marking attendance via backend API:', error)
            return { success: false, error: errorMessage }
        } finally {
            attendanceLoading.value = false
        }
    }

    const activeEmployees = computed(() => employees.value.filter(e => e.status === 'active'))

    /**
     * Helper to find attendance record for an employee on a specific date (YYYY-MM-DD)
     */
    function getEmployeeAttendanceRecord(employeeId, dateStr) {
        if (!employeeId || !dateStr) return null
        return attendance.value.find(a => {
            const matchEmp = String(a.employee_id) === String(employeeId)
            const recDate = typeof a.date === 'string' ? a.date.split('T')[0] : ''
            return matchEmp && recDate === dateStr
        }) || null
    }

    return {
        employees,
        attendance,
        loading,
        attendanceLoading,
        attendanceError,
        fetchEmployees,
        addEmployee,
        fetchAttendance,
        markAttendance,
        activeEmployees,
        getEmployeeAttendanceRecord
    }
})
