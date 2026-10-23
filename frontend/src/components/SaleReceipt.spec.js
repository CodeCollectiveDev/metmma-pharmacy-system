import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import SaleReceipt from './SaleReceipt.vue'

const sale = { receiptNumber: 'REC-42', date: '2026-10-03T10:00:00Z', cashier: 'Cashier', paymentMethod: 'cash', totalAmount: '11.65', amountReceived: '20.00', changeGiven: '8.35', items: [{ productId: 1, name: 'Medicine', quantity: 1, unitPrice: '10.00', subtotal: '10.00' }] }

describe('SaleReceipt', () => {
  it('renders configured contact details when they are set', () => {
    const text = mount(SaleReceipt, { props: { sale, profile: { pharmacyName: 'Main Branch', phone: '+265 999 123 456', email: 'hello@example.com', address: 'Plot 42, Lilongwe' } } }).text()
    expect(text).toContain('Main Branch')
    expect(text).toContain('Phone: +265 999 123 456')
    expect(text).toContain('hello@example.com')
    expect(text).toContain('Plot 42, Lilongwe')
  })

  it('omits optional contact lines that are empty', () => {
    const text = mount(SaleReceipt, { props: { sale, profile: { pharmacyName: 'Main Branch', phone: '', email: null, address: '' } } }).text()
    expect(text).not.toContain('Phone:')
    expect(text).not.toContain('example.com')
    expect(text).not.toContain('Plot 42')
  })
})
