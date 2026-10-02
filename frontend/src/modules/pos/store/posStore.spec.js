import { describe, it, expect, beforeEach, vi } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { usePosStore } from '../store/posStore'
import { dataOrchestrator } from '@/services/data/dataOrchestrator'
import { dataService } from '@/services/api/dataService'
import { save } from '@/pouchdb'

vi.mock('@/services/data/dataOrchestrator', () => ({
    dataOrchestrator: { fetchCollection: vi.fn(), saveItem: vi.fn() }
}))
vi.mock('@/services/api/dataService', () => ({
    dataService: { getProducts: vi.fn(), recordSale: vi.fn() }
}))

// Mock the DB service
vi.mock('@/pouchdb', () => ({
    getAll: vi.fn(),
    save: vi.fn(),
    remove: vi.fn()
}))


describe('POS Store', () => {
    beforeEach(() => {
        setActivePinia(createPinia())
        vi.resetAllMocks()
        localStorage.setItem('user', JSON.stringify({ id: 3, name: 'Cashier' }))
        dataOrchestrator.saveItem.mockImplementation(async (collection, item) => ({
            ok: true, offline: false, data: { ...item, id: 9, receiptNumber: 'REC-9' }
        }))

        // Mock return value for products
        dataOrchestrator.fetchCollection.mockResolvedValue([
            { _id: '1', name: 'Test Product', price: 10, stock: 100 },
            { _id: '2', name: 'P2', price: 5, stock: 50 },
            { _id: '3', name: 'Low Stock', price: 20, stock: 0 }
        ])
    })

    it('fetches products on init', async () => {
        const store = usePosStore()
        await store.fetchProducts()

        expect(dataOrchestrator.fetchCollection).toHaveBeenCalledWith('products', dataService.getProducts)
        expect(store.products).toHaveLength(3)
    })

    it('adds items to cart', async () => {
        const store = usePosStore()
        await store.fetchProducts()
        const product = store.products.find(p => p._id === '1')

        store.addToCart(product)

        expect(store.cart).toHaveLength(1)
        expect(store.cart[0].quantity).toBe(1)
    })

    it('prevents adding out of stock items', async () => {
        const store = usePosStore()
        await store.fetchProducts()
        const product = store.products.find(p => p._id === '3')

        window.alert = vi.fn()
        store.addToCart(product)

        expect(store.cart).toHaveLength(0)
        expect(window.alert).toHaveBeenCalled()
    })

    it('calculates total correctly', async () => {
        const store = usePosStore()
        await store.fetchProducts()

        store.addToCart(store.products[0])
        store.addToCart(store.products[0])
        store.addToCart(store.products[1])

        expect(store.cartTotal).toBe(25)
    })
    it('checks out with database IDs and canonical money fields, then refreshes stock', async () => {
        const store = usePosStore()
        await store.fetchProducts()
        store.addToCart({ ...store.products[0], _id: 'legacy-local-key', id: 1 })
        const result = await store.checkout('card')
        const [collection, sale, method] = dataOrchestrator.saveItem.mock.calls[0]
        expect(collection).toBe('transactions')
        expect(method).toBe(dataService.recordSale)
        expect(sale).toMatchObject({ totalAmount: 11.65, userId: 3, paymentMethod: 'card' })
        expect(sale.items[0]).toMatchObject({ productId: 1, unitPrice: 10, subtotal: 10, quantity: 1 })
        expect(result.transaction.receiptNumber).toBe('REC-9')
        expect(save).not.toHaveBeenCalled()
        expect(store.cart).toHaveLength(0)
        expect(dataOrchestrator.fetchCollection).toHaveBeenCalledTimes(2)
    })

    it('keeps the cart on API rejection and does not write stock', async () => {
        const store = usePosStore()
        await store.fetchProducts()
        store.addToCart(store.products[0])
        dataOrchestrator.saveItem.mockRejectedValue(new Error('Insufficient stock'))
        await expect(store.checkout('cash')).rejects.toThrow('Insufficient stock')
        expect(store.cart).toHaveLength(1)
        expect(save).not.toHaveBeenCalled()
    })

    it('refuses to sell a product with only an unsynchronized local identifier', async () => {
        const store = usePosStore()
        store.addToCart({ _id: 'products_local', name: 'Local', price: 10, stock: 10 })
        await expect(store.checkout('cash')).rejects.toThrow('must be synchronized')
        expect(dataOrchestrator.saveItem).not.toHaveBeenCalled()
    })

    it('queues offline sales and changes only the cached stock without a product API write', async () => {
        const store = usePosStore()
        await store.fetchProducts()
        store.addToCart(store.products[0])
        dataOrchestrator.saveItem.mockImplementation(async (collection, item) => ({ ok: true, offline: true, data: item }))
        const result = await store.checkout('cash')
        expect(result.offline).toBe(true)
        expect(save).toHaveBeenCalledWith('products', expect.objectContaining({ _id: '1', stock: 99, quantity: 99 }))
        expect(dataOrchestrator.saveItem).toHaveBeenCalledTimes(1)
        expect(dataOrchestrator.fetchCollection).toHaveBeenCalledTimes(1)
    })

})
