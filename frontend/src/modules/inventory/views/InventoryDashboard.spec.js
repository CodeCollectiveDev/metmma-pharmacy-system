import { beforeEach, expect, it, vi } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import InventoryDashboard from './InventoryDashboard.vue'
import { dataService } from '@/services/api/dataService'

vi.mock('vue-router', async importOriginal => ({ ...await importOriginal(), useRoute: () => ({ query: {} }) }))
vi.mock('@/services/api/dataService', () => ({ dataService: {
  getProductPage: vi.fn(), getProductSummary: vi.fn(), getCategories: vi.fn(),
  addProduct: vi.fn(), updateProduct: vi.fn(), restockProduct: vi.fn(), deleteProduct: vi.fn()
} }))

const product = {
  id: 7, productCode: 'P-1', name: 'Paracetmol', genericName: 'Paracetamol', batchNumber: 'B-1',
  expiryDate: '2030-01-01', quantity: 5, sellingPrice: '10.00', costPrice: '6.00', supplier: 'Acme',
  category: 'Antibiotics', reorderLevel: 3, location: 'Shelf A', barcode: '123456', expired: false
}
let products

function mountView() {
  return mount(InventoryDashboard, { global: { stubs: {
    MainLayout: { template: '<main><slot /></main>' },
    AppDialog: { props: ['open', 'title'], template: '<div v-if="open" role="dialog"><h2>{{ title }}</h2><slot /></div>' },
    CameraButton: true,
    PaginationControls: true
  } } })
}

beforeEach(() => {
  vi.clearAllMocks()
  localStorage.clear()
  localStorage.setItem('role', 'admin')
  setActivePinia(createPinia())
  products = [product]
  dataService.getCategories.mockResolvedValue({ data: { data: [{ id: 1, name: 'Antibiotics', isActive: true }] } })
  dataService.getProductPage.mockImplementation(async () => ({ data: {
    data: products, pagination: { page: 1, limit: 25, total: products.length, totalPages: 1, hasMore: false }
  } }))
  dataService.getProductSummary.mockResolvedValue({ data: { total: 1, low: 0, expired: 0 } })
})

it('opens the edit form with current values and saves a corrected name', async () => {
  const wrapper = mountView()
  await flushPromises()
  await wrapper.findAll('button').find(button => button.text() === 'Edit').trigger('click')
  await flushPromises()

  expect(wrapper.get('input[name="name"]').element.value).toBe('Paracetmol')
  expect(wrapper.get('input[name="genericName"]').element.value).toBe('Paracetamol')
  expect(wrapper.get('input[name="batchNumber"]').element.value).toBe('B-1')
  expect(wrapper.get('input[name="expiryDate"]').element.value).toBe('2030-01-01')
  expect(wrapper.get('input[name="costPrice"]').element.value).toBe('6.00')
  expect(wrapper.get('input[name="location"]').element.value).toBe('Shelf A')
  expect(wrapper.get('input[name="barcode"]').element.value).toBe('123456')

  dataService.updateProduct.mockImplementation(async body => {
    products = [{ ...product, name: body.name }]
    return { data: { data: products[0] } }
  })
  await wrapper.get('input[name="name"]').setValue('Paracetamol 500 mg')
  await wrapper.get('form').trigger('submit')
  await flushPromises()

  const payload = dataService.updateProduct.mock.calls[0][0]
  expect(payload).toMatchObject({
    id: 7, name: 'Paracetamol 500 mg', genericName: 'Paracetamol', batchNumber: 'B-1',
    expiryDate: '2030-01-01', sellingPrice: '10.00', costPrice: '6.00', supplier: 'Acme',
    category: 'Antibiotics', reorderLevel: 3, location: 'Shelf A', barcode: '123456'
  })
  expect(payload).not.toHaveProperty('quantity')
  expect(wrapper.text()).toContain('Paracetamol 500 mg')
  expect(wrapper.find('[role="dialog"]').exists()).toBe(false)
  wrapper.unmount()
})

it('shows a clear message when the product changed before saving', async () => {
  dataService.updateProduct.mockRejectedValue({ response: { status: 409, data: { code: 'CONFLICT' } } })
  const wrapper = mountView()
  await flushPromises()
  await wrapper.findAll('button').find(button => button.text() === 'Edit').trigger('click')
  await flushPromises()
  await wrapper.get('input[name="name"]').setValue('Corrected name')
  await wrapper.get('form').trigger('submit')
  await flushPromises()

  expect(wrapper.text()).toContain('This product changed since you opened it. Reopen it and try again.')
  expect(wrapper.text()).not.toContain('This record changed or already exists.')
  wrapper.unmount()
})
