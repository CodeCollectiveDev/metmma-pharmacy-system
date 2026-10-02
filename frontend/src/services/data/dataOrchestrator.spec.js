import { beforeEach, expect, it, vi } from 'vitest'
import { getAll, save, clearCollection, remove } from '@/pouchdb'
import { dataOrchestrator } from './dataOrchestrator'
import { syncWorker } from '../sync/syncWorker'
import { dataService } from '../api/dataService'
import apiClient from '../api/apiClient'

vi.mock('@/pouchdb', () => ({ getAll: vi.fn(), save: vi.fn(), clearCollection: vi.fn(), remove: vi.fn() }))
vi.mock('../api/apiClient', () => ({ default: { post: vi.fn(), get: vi.fn() } }))

let records
const sale = { _id: 'local-sale', items: [{ productId: 1, name: 'Product', quantity: 1, unitPrice: 10, subtotal: 10 }], totalAmount: 11.65, paymentMethod: 'cash' }
const serverSale = { ...sale, id: 7, receiptNumber: 'REC-7' }

beforeEach(() => {
    vi.resetAllMocks()
    vi.spyOn(console, 'warn').mockImplementation(() => {})
    records = new Map()
    vi.spyOn(window.navigator, 'onLine', 'get').mockReturnValue(true)
    getAll.mockImplementation(async () => [...records.values()])
    save.mockImplementation(async (_, item) => { records.set(item._id, item); return { ok: true, id: item._id } })
    clearCollection.mockImplementation(async () => records.clear())
    remove.mockImplementation(async (_, item) => records.delete(item._id))
})

it.each([400, 401, 403, 409, 500])('does not queue or claim success after HTTP %i', async (status) => {
    const error = { response: { status }, request: {} }
    await expect(dataOrchestrator.saveItem('transactions', sale, vi.fn().mockRejectedValue(error))).rejects.toBe(error)
    expect(save).not.toHaveBeenCalled()
})

it('retains the confirmed server identity and receipt fields', async () => {
    const result = await dataOrchestrator.saveItem('transactions', sale, vi.fn().mockResolvedValue({ data: { data: serverSale } }))
    expect(result).toMatchObject({ ok: true, offline: false, id: '7', data: { id: 7, receiptNumber: 'REC-7', syncStatus: 'synced' } })
    expect(records.has('local-sale')).toBe(false)
    expect(result.data.total).toBe(11.65)
})

it('normalizes sales history to the same logical fields used by checkout and replay', async () => {
    const result = await dataOrchestrator.fetchCollection('transactions', async () => ({ data: { data: [{
        id: 7, receipt_number: 'REC-7', total_amount: '11.65', payment_method: 'cash', user_id: 1,
        created_at: '2026-01-01', items: [{ product_id: 1, quantity: 1, unit_price: '10.00', subtotal: '10.00' }]
    }] } }))
    expect(result[0]).toMatchObject({ _id: '7', totalAmount: '11.65', total: '11.65', receiptNumber: 'REC-7',
        date: '2026-01-01', paymentMethod: 'cash', userId: 1, items: [{ productId: 1, unitPrice: '10.00', subtotal: '10.00' }] })
})

it('preserves offline sales through history refresh and replays the same API contract', async () => {
    vi.spyOn(window.navigator, 'onLine', 'get').mockReturnValue(false)
    const result = await dataOrchestrator.saveItem('transactions', sale, dataService.recordSale)
    expect(result.offline).toBe(true)
    expect(apiClient.post).not.toHaveBeenCalled()
    vi.spyOn(window.navigator, 'onLine', 'get').mockReturnValue(true)
    await dataOrchestrator.fetchCollection('transactions', async () => ({ data: { data: [] } }))
    expect(records.get('local-sale').syncStatus).toBe('pending')
    apiClient.post.mockResolvedValue({ data: { data: serverSale } })
    await syncWorker.syncCollection('transactions', dataService.recordSale)
    expect(apiClient.post).toHaveBeenCalledWith('/sales/checkout', expect.objectContaining({ totalAmount: 11.65, items: [{ productId: 1, quantity: 1, unitPrice: 10, subtotal: 10 }] }))
    expect(records.get('7')).toMatchObject({ id: 7, receiptNumber: 'REC-7', syncStatus: 'synced' })
    expect(records.has('local-sale')).toBe(false)
})

it('queues a network failure but does not swallow a programming error', async () => {
    expect((await dataOrchestrator.saveItem('transactions', sale, vi.fn().mockRejectedValue({ request: {} }))).offline).toBe(true)
    await expect(dataOrchestrator.saveItem('transactions', sale, vi.fn().mockRejectedValue(new Error('Bad mapping')))).rejects.toThrow('Bad mapping')
})

it('leaves the cached catalogue intact when a later API page fails', async () => {
    records.set('cached', { _id: 'cached' })
    const result = await dataOrchestrator.fetchCollection('products', vi.fn().mockRejectedValue(new Error('Page 2 failed')))
    expect(result).toEqual([{ _id: 'cached' }])
    expect(clearCollection).not.toHaveBeenCalled()
})
