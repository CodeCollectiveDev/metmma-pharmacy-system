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

it('shows the batch number in upper case as it is typed on the add form', async () => {
  const wrapper = mountView()
  await flushPromises()
  await wrapper.findAll('button').find(button => button.text() === 'Add product').trigger('click')
  await flushPromises()

  await wrapper.get('input[name="batchNumber"]').setValue('abc-01')
  expect(wrapper.get('input[name="batchNumber"]').element.value).toBe('ABC-01')
  wrapper.unmount()
})

it('sends the purchase price and supplier invoice when adding a product', async () => {
  dataService.addProduct.mockResolvedValue({ data: { data: { ...product, id: 9 } } })
  const wrapper = mountView()
  await flushPromises()
  await wrapper.findAll('button').find(button => button.text() === 'Add product').trigger('click')
  await flushPromises()

  await wrapper.get('input[name="name"]').setValue('Amoxicillin 500 mg')
  await wrapper.get('input[name="batchNumber"]').setValue('amox-01')
  await wrapper.get('input[name="expiryDate"]').setValue('2030-01-01')
  await wrapper.get('input[name="sellingPrice"]').setValue('30')
  await wrapper.get('input[name="quantity"]').setValue('6')
  await wrapper.get('input[name="costPrice"]').setValue('12.50')
  await wrapper.get('input[name="supplierInvoice"]').setValue('INV-77')
  await wrapper.get('form').trigger('submit')
  await flushPromises()

  expect(dataService.addProduct).toHaveBeenCalledWith(expect.objectContaining({
    name: 'Amoxicillin 500 mg',
    batchNumber: 'AMOX-01',
    quantity: 6,
    sellingPrice: 30,
    unitPrice: 30,
    costPrice: '12.5',
    supplierInvoice: 'INV-77'
  }))
  wrapper.unmount()
})

it('omits empty purchase details when adding a product', async () => {
  dataService.addProduct.mockResolvedValue({ data: { data: { ...product, id: 9 } } })
  const wrapper = mountView()
  await flushPromises()
  await wrapper.findAll('button').find(button => button.text() === 'Add product').trigger('click')
  await flushPromises()

  await wrapper.get('input[name="name"]').setValue('Amoxicillin 500 mg')
  await wrapper.get('input[name="batchNumber"]').setValue('amox-01')
  await wrapper.get('input[name="expiryDate"]').setValue('2030-01-01')
  await wrapper.get('input[name="sellingPrice"]').setValue('30')
  await wrapper.get('form').trigger('submit')
  await flushPromises()

  const payload = dataService.addProduct.mock.calls[0][0]
  expect(payload).not.toHaveProperty('costPrice')
  expect(payload).not.toHaveProperty('supplierInvoice')
  wrapper.unmount()
})

it('sends the purchase price and supplier invoice when adding stock', async () => {
  dataService.restockProduct.mockResolvedValue({ data: { data: product } })
  const wrapper = mountView()
  await flushPromises()
  await wrapper.findAll('button').find(button => button.text() === 'Add stock').trigger('click')
  await flushPromises()

  await wrapper.get('input[name="quantity"]').setValue('4')
  await wrapper.get('input[name="purchasePrice"]').setValue('12.50')
  await wrapper.get('input[name="supplierInvoice"]').setValue('INV-2048')
  await wrapper.get('input[name="reason"]').setValue('Supplier delivery')
  await wrapper.get('form').trigger('submit')
  await flushPromises()

  expect(dataService.restockProduct).toHaveBeenCalledWith(7, {
    idempotencyKey: expect.any(String),
    quantity: 4,
    reason: 'Supplier delivery',
    costPrice: '12.5',
    supplierInvoice: 'INV-2048'
  })
  wrapper.unmount()
})

it('offers to add stock to the existing record when a batch already exists', async () => {
  dataService.addProduct.mockResolvedValue({ data: { data: { ...product, id: 9 }, duplicateBatch: {
    id: 7, name: 'Paracetmol', productCode: 'P-1', batchNumber: 'B-1', expiryDate: '2030-01-01', quantity: 5
  } } })
  const wrapper = mountView()
  await flushPromises()
  await wrapper.findAll('button').find(button => button.text() === 'Add product').trigger('click')
  await flushPromises()
  await wrapper.get('input[name="name"]').setValue('Paracetmol')
  await wrapper.get('input[name="batchNumber"]').setValue('b-1')
  await wrapper.get('input[name="expiryDate"]').setValue('2030-01-01')
  await wrapper.get('input[name="sellingPrice"]').setValue('10')
  await wrapper.get('form').trigger('submit')
  await flushPromises()

  expect(wrapper.text()).toContain('This batch already exists — do you want to add units to it instead?')
  await wrapper.findAll('button').find(button => button.text() === 'Add stock').trigger('click')
  await flushPromises()
  expect(wrapper.text()).toContain('Record a delivery of Paracetmol')
  wrapper.unmount()
})
