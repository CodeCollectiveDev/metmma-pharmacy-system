import { describe, it, expect } from 'vitest'
import { receiptFileName, receiptText } from './receiptExport'

const sale = {
  id: 123,
  date: '2026-10-03T10:00:00Z',
  cashier: 'Cashier',
  paymentMethod: 'cash',
  totalAmount: '11.65',
  amountReceived: '20.00',
  changeGiven: '8.35',
  items: [{ productId: 1, name: 'Medicine', quantity: 1, unitPrice: '10.00', subtotal: '10.00' }]
}

describe('receipt export', () => {
  it('includes customer contact details only when they were provided', () => {
    expect(receiptText({ ...sale, customerContact: '0999123456' })).toContain('Contact: 0999123456')
    expect(receiptText(sale)).not.toContain('Contact:')
  })

  it('names the downloaded file after the receipt', () => {
    expect(receiptFileName(sale)).toBe('R-000123.png')
    expect(receiptFileName({ receiptNumber: 'REC-42' })).toBe('REC-42.png')
  })
})
