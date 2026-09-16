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
