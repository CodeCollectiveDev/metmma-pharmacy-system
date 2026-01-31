import { describe, it, expect, beforeEach, vi } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { usePosStore } from '../store/posStore'

// Mock the DB service
vi.mock('@/pouchdb', () => ({
    getAll: vi.fn(),
    save: vi.fn(),
    remove: vi.fn()
}))

import { getAll } from '@/pouchdb'

describe('POS Store', () => {
    beforeEach(() => {
        setActivePinia(createPinia())
        vi.clearAllMocks()

        // Mock return value for products
        getAll.mockResolvedValue([
            { _id: '1', name: 'Test Product', price: 10, stock: 100 },
            { _id: '2', name: 'P2', price: 5, stock: 50 },
            { _id: '3', name: 'Low Stock', price: 20, stock: 0 }
        ])
    })

    it('fetches products on init', async () => {
        const store = usePosStore()
        await store.fetchProducts()

        expect(getAll).toHaveBeenCalledWith('products')
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
})
