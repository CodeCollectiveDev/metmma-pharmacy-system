import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { dataService } from '@/services/api/dataService'
export const useHrStore = defineStore('hr', () => {
  const employees = ref([]), loading = ref(false), employeeError = ref(null), pagination = ref(null), attendance = ref([])
  async function fetchEmployees(params = {}) {
    loading.value = true; employeeError.value = null
    try { const res = await dataService.getEmployees({ page: 1, limit: 25, ...params }); employees.value = res.data.data.map(e => ({ ...e, _id: String(e.id), name: `${e.first_name || ''} ${e.last_name || ''}`.trim(), position: e.position || '', status: e.is_active ? 'active' : 'inactive', startDate: e.hire_date })); pagination.value = res.data.pagination }
    catch (err) { employeeError.value = err }
    finally { loading.value = false }
  }
  async function addEmployee(employee) {
    employeeError.value = null
    try {
      const body = { first_name: employee.first_name, last_name: employee.last_name, email: employee.email, department: employee.department, job_title: employee.position, salary: employee.salary, hire_date: employee.startDate || new Date().toISOString().slice(0,10), ...(employee.role ? { role: employee.role } : {}), ...(employee.phone ? { phone: employee.phone } : {}) }
      const res = await dataService.addEmployee(body)
      await fetchEmployees()
      return res.data.data
    } catch (err) { employeeError.value = err; return false }
  }
  async function markAttendance(record) { employeeError.value = null; try { await dataService.markAttendance(record); return true } catch (err) { employeeError.value = err; return false } }
  const activeEmployees = computed(() => employees.value.filter(e => e.status === 'active'))
  return { employees, loading, employeeError, pagination, attendance, fetchEmployees, addEmployee, markAttendance, activeEmployees }
})
