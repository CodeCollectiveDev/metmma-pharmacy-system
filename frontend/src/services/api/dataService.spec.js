import { beforeEach, describe, expect, it, vi } from 'vitest'
import apiClient from './apiClient'
import { dataService } from './dataService'
import { createRequire } from 'node:module'

vi.mock('./apiClient', () => ({ default: { get: vi.fn(), post: vi.fn() } }))
const { saleSchema } = createRequire(import.meta.url)('../../../../backend/api/validators/salesValidator.js')

beforeEach(() => vi.resetAllMocks())

describe('checkout API boundary', () => {
    it.each(['subtotal', 'total'])('sends accepted payloads for current and legacy queued %s lines', async (lineField) => {
        const sale = {
            _id: 'local-sale', syncStatus: 'pending', date: '2026-01-01', cashier: 'User',
            items: [{ productId: 3, name: 'Product', quantity: 2, unitPrice: 10, [lineField]: 20 }],
            [lineField === 'total' ? 'total' : 'totalAmount']: 23.3,
            paymentMethod: 'cash', userId: 1, tax: 3.3
        }
        await dataService.recordSale(sale)
        const [url, payload] = apiClient.post.mock.calls[0]
        expect(url).toBe('/sales/checkout')
        expect(payload).toEqual({ items: [{ productId: 3, quantity: 2, unitPrice: 10, subtotal: 20 }], totalAmount: 23.3, paymentMethod: 'cash', userId: 1, customerName: undefined })
        expect(saleSchema.validate(payload).error).toBeUndefined()
    })
})

describe('product pages', () => {
    it('keeps page metadata when a caller explicitly requests a page', async () => {
        const response = { data: { data: [], pagination: { page: 2, hasMore: false } } }
        apiClient.get.mockResolvedValue(response)
        expect(await dataService.getProductPage({ page: 2, search: 'Later' })).toBe(response)
        expect(apiClient.get).toHaveBeenCalledWith('/products', { params: { page: 2, search: 'Later' } })
    })

    it.each([0, 50, 51, 103])('retrieves all %i products without raising the page limit', async (count) => {
        const products = Array.from({ length: count }, (_, id) => ({ id: id + 1 }))
        apiClient.get.mockImplementation(async (_, { params: { page } }) => ({ data: {
            data: products.slice((page - 1) * 50, page * 50),
            pagination: { page, limit: 50, total: count, hasMore: page * 50 < count }
        } }))
        const result = await dataService.getProducts()
        expect(result.data.data).toEqual(products)
        expect(result.data.count).toBe(count)
        expect(apiClient.get).toHaveBeenCalledTimes(Math.max(1, Math.ceil(count / 50)))
        for (const [, options] of apiClient.get.mock.calls) expect(options.params.limit).toBeUndefined()
        expect(result.data.pagination).toBeUndefined()
    })

    it('fails the whole fetch when a later page fails', async () => {
        apiClient.get.mockResolvedValueOnce({ data: { data: [{ id: 1 }], pagination: { page: 1, hasMore: true } } })
            .mockRejectedValueOnce(new Error('Network lost'))
        await expect(dataService.getProducts()).rejects.toThrow('Network lost')
    })

    it('rejects missing or stalled metadata instead of returning a partial catalogue', async () => {
        apiClient.get.mockResolvedValue({ data: { data: [] } })
        await expect(dataService.getProducts()).rejects.toThrow('pagination')
        apiClient.get.mockResolvedValue({ data: { data: [{ id: 1 }], pagination: { page: 1 } } })
        await expect(dataService.getProducts()).rejects.toThrow('pagination')
        apiClient.get.mockResolvedValue({ data: { data: [], pagination: { page: 1, hasMore: true } } })
        await expect(dataService.getProducts()).rejects.toThrow('pagination')
    })
})
