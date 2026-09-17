import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { getAll, save, remove } from '@/pouchdb'
import { dataOrchestrator } from '@/services/data/dataOrchestrator'
import { dataService } from '@/services/api/dataService'

export const useHrStore = defineStore('hr', () => {
    const employees = ref([])
    const attendance = ref([])
    const loading = ref(false)

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
            // Normalize employee data to match the backend contract
            // (employees table stores the job title in `role`).
            const name = employee.name || ''
            const parts = name.trim().split(/\s+/)
            const employeeData = {
                first_name: employee.first_name || parts[0] || '',
                last_name: employee.last_name || parts.slice(1).join(' ') || '',
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

    async function fetchAttendance() {
        try {
            // Fetch all attendance records or from last 30 days
            attendance.value = await getAll('attendance')
        } catch (error) {
            console.error('Error fetching attendance:', error)
        }
    }

    async function markAttendance(record) {
        try {
            // Normalize attendance record
            const attendanceData = {
                employee_id: record.employee_id || record.employeeId,
                date: record.date || new Date().toISOString().split('T')[0],
                status: record.status || 'present'
            }
            
            const result = await dataService.markAttendance(attendanceData)
            if (result.data?.success || result.status === 201) {
                await fetchAttendance()
                return true
            }
            return false
        } catch (error) {
            console.error('Error marking attendance:', error)
            return false
        }
    }

    const activeEmployees = computed(() => employees.value.filter(e => e.status === 'active'))

    return {
        employees,
        attendance,
        loading,
        fetchEmployees,
        addEmployee,
        fetchAttendance,
        markAttendance,
        activeEmployees
    }
})
