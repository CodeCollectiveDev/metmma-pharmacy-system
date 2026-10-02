import { beforeEach, expect, it, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { mount, flushPromises } from '@vue/test-utils'
import PosView from './PosView.vue'
import { usePosStore } from '../store/posStore'
import { dataOrchestrator } from '@/services/data/dataOrchestrator'

vi.mock('vue-router', async importOriginal => ({
    ...await importOriginal(),
    useRouter: () => ({ push: vi.fn() })
}))
vi.mock('@/services/data/dataOrchestrator', () => ({ dataOrchestrator: { fetchCollection: vi.fn(), saveItem: vi.fn() } }))
vi.mock('@/services/api/dataService', () => ({ dataService: { getProducts: vi.fn(), recordSale: vi.fn() } }))
vi.mock('@/pouchdb', () => ({ save: vi.fn().mockResolvedValue({ ok: true }) }))

beforeEach(() => {
    vi.clearAllMocks()
    setActivePinia(createPinia())
    vi.spyOn(window, 'alert').mockImplementation(() => {})
    vi.spyOn(console, 'error').mockImplementation(() => {})
    localStorage.setItem('user', JSON.stringify({ id: 1, name: 'Cashier' }))
    dataOrchestrator.fetchCollection.mockResolvedValue([{ _id: '1', id: 1, name: 'Product', stock: 10, price: 10 }])
})

const checkout = async () => {
    const wrapper = mount(PosView, { global: { stubs: { MainLayout: { template: '<main><slot /></main>' } } } })
    await flushPromises()
    const store = usePosStore()
    store.addToCart(store.products[0])
    await wrapper.vm.$nextTick()
    await wrapper.findAll('button').find(button => button.text() === 'Complete Sale').trigger('click')
    await flushPromises()
    return { wrapper, store }
}

it('shows the confirmed server receipt after successful checkout', async () => {
    dataOrchestrator.saveItem.mockImplementation(async (_, sale) => ({ ok: true, offline: false, data: { ...sale, receiptNumber: 'REC-confirmed' } }))
    const { wrapper, store } = await checkout()
    expect(wrapper.text()).toContain('Sales Receipt')
    expect(wrapper.text()).toContain('REC-confirmed')
    expect(store.cart).toHaveLength(0)
    wrapper.unmount()
})

it('shows a validation failure without a receipt or clearing the cart', async () => {
    dataOrchestrator.saveItem.mockRejectedValue({ response: { data: { errors: [{ message: 'quantity must be positive' }] } } })
    const { wrapper, store } = await checkout()
    expect(wrapper.text()).not.toContain('Sales Receipt')
    expect(window.alert).toHaveBeenCalledWith('Payment failed: quantity must be positive')
    expect(store.cart).toHaveLength(1)
    wrapper.unmount()
})

it('labels an offline sale as pending and does not show a confirmed receipt', async () => {
    dataOrchestrator.saveItem.mockImplementation(async (_, sale) => ({ ok: true, offline: true, data: sale }))
    const { wrapper } = await checkout()
    expect(wrapper.text()).not.toContain('Sales Receipt')
    expect(window.alert).toHaveBeenCalledWith(expect.stringContaining('awaiting synchronization'))
    wrapper.unmount()
})
