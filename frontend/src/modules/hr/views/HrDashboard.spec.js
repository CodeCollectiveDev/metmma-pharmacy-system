import { beforeEach, expect, it, vi } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import HrDashboard from './HrDashboard.vue'
import { dataService } from '@/services/api/dataService'
import { dataOrchestrator } from '@/services/data/dataOrchestrator'
import { createRequire } from 'node:module'

vi.mock('@/services/api/dataService', () => ({ dataService: { addEmployee: vi.fn(), getEmployees: vi.fn() } }))
vi.mock('@/services/data/dataOrchestrator', () => ({ dataOrchestrator: { fetchCollection: vi.fn() } }))
vi.mock('@/pouchdb', () => ({ getAll: vi.fn().mockResolvedValue([]), save: vi.fn(), remove: vi.fn() }))
const { employeeCreateSchema } = createRequire(import.meta.url)('../../../../../backend/api/validators/employeeValidators.js')

beforeEach(() => {
    vi.clearAllMocks()
    setActivePinia(createPinia())
    dataOrchestrator.fetchCollection.mockResolvedValue([])
})

const fillForm = async () => {
    const wrapper = mount(HrDashboard, { global: { stubs: { MainLayout: { template: '<main><slot /></main>' } } } })
    await wrapper.findAll('button').find(button => button.text() === 'Add Employee').trigger('click')
    for (const [placeholder, value] of [['First Name *', 'Jane'], ['Last Name *', 'Smith'], ['Email *', 'JANE@example.com'], ['Position *', 'Pharmacist'], ['Role (optional)', 'pharmacist'], ['Salary (MWK) *', 1000]]) {
        await wrapper.get(`input[placeholder="${placeholder}"]`).setValue(value)
    }
    await wrapper.get('select').setValue('Pharmacy')
    await wrapper.get('input[type="date"]').setValue('2026-01-01')
    return wrapper
}

it('submits an accepted employee contract from the form and displays returned details', async () => {
    dataService.addEmployee.mockImplementation(async body => {
        const { error, value } = employeeCreateSchema.validate(body, { stripUnknown: true })
        expect(error).toBeUndefined()
        return { status: 201, data: { data: {
            ...value, id: 1, employee_id: 'EMP-generated', position: value.job_title, is_active: true
        } } }
    })
    const wrapper = await fillForm()
    await wrapper.get('form').trigger('submit')
    await flushPromises()
    expect(dataService.addEmployee).toHaveBeenCalledWith(expect.objectContaining({
        first_name: 'Jane', last_name: 'Smith', job_title: 'Pharmacist', role: 'pharmacist',
        email: 'JANE@example.com', department: 'Pharmacy', salary: 1000
    }))
    expect(dataService.addEmployee.mock.calls[0][0]).not.toHaveProperty('phone')
    expect(wrapper.find('form').exists()).toBe(false)
    expect(wrapper.get('[role="status"]').text()).toContain('EMP-generated')
    expect(wrapper.get('[role="status"]').text()).toContain('Jane Smith')
    expect(wrapper.get('[role="status"]').text()).toContain('jane@example.com')
    wrapper.unmount()
})

it('keeps the form and displays field validation errors', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {})
    dataService.addEmployee.mockRejectedValue({ response: { data: { error: 'Validation error', details: [{ message: 'email must be valid' }] } } })
    const wrapper = await fillForm()
    await wrapper.get('form').trigger('submit')
    await flushPromises()
    expect(wrapper.get('[role="alert"]').text()).toBe('email must be valid')
    expect(wrapper.find('form').exists()).toBe(true)
    expect(wrapper.find('[role="status"]').exists()).toBe(false)
    wrapper.unmount()
})
