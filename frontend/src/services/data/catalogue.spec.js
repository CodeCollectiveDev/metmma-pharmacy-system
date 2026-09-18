import { beforeEach, expect, it, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { mount, flushPromises } from '@vue/test-utils'
import { getAll, save, clearCollection } from '@/pouchdb'
import apiClient from '../api/apiClient'
import { useInventoryStore } from '@/modules/inventory/store/inventoryStore'
import { usePosStore } from '@/modules/pos/store/posStore'
import Dashboard from '@/modules/dashboard/views/Dashboard.vue'

vi.mock('@/pouchdb', () => ({ getAll: vi.fn(), save: vi.fn(), clearCollection: vi.fn(), remove: vi.fn() }))
vi.mock('../api/apiClient', () => ({ default: { get: vi.fn() } }))

beforeEach(() => {
    vi.resetAllMocks()
    setActivePinia(createPinia())
    vi.spyOn(window.navigator, 'onLine', 'get').mockReturnValue(true)
    const collections = new Map()
    getAll.mockImplementation(async collection => [...(collections.get(collection)?.values() || [])])
    save.mockImplementation(async (collection, item) => {
        if (!collections.has(collection)) collections.set(collection, new Map())
        collections.get(collection).set(item._id, item)
        return { ok: true }
    })
    clearCollection.mockImplementation(async collection => collections.set(collection, new Map()))
    const products = Array.from({ length: 103 }, (_, index) => ({
        id: index + 1, name: `Product ${index + 1}`, quantity: index === 102 ? 2 : 100,
        sellingPrice: 10, reorderLevel: 10, category: 'Test'
    }))
    apiClient.get.mockImplementation(async (path, options) => {
        if (path !== '/products') return { data: { data: [] } }
        const page = options.params.page
        return { data: { data: products.slice((page - 1) * 50, page * 50), pagination: { page, hasMore: page < 3 } } }
    })
})

it('makes the last page searchable at POS and includes it in inventory counts and low stock', async () => {
    const inventory = useInventoryStore()
    await inventory.fetchProducts()
    expect(inventory.products).toHaveLength(103)
    expect(inventory.lowStockProducts.map(product => product.id)).toEqual([103])
    const pos = usePosStore()
    await pos.fetchProducts()
    pos.searchQuery = 'Product 103'
    expect(pos.filteredProducts.map(product => product.id)).toEqual([103])
    vi.spyOn(window.navigator, 'onLine', 'get').mockReturnValue(false)
    await pos.fetchProducts()
    expect(pos.filteredProducts.map(product => product.id)).toEqual([103])
})

it('uses the full catalogue for dashboard counts and low-stock summaries', async () => {
    const wrapper = mount(Dashboard, { global: { stubs: {
        MainLayout: { template: '<main><slot /></main>' }, RouterLink: { template: '<a><slot /></a>' }
    } } })
    await flushPromises()
    expect(wrapper.text()).toContain('103')
    expect(wrapper.text()).toContain('Product 103')
    expect(wrapper.text()).toMatch(/Low Stock Alerts\s*1/)
    wrapper.unmount()
})
