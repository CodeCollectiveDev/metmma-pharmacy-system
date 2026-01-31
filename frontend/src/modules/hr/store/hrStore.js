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
            const result = await save('employees', employee)
            if (result.ok) {
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
            attendance.value = await getAll('attendance')
        } catch (error) {
            console.error('Error fetching attendance:', error)
        }
    }

    async function markAttendance(record) {
        try {
            const result = await save('attendance', record)
            if (result.ok) {
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
