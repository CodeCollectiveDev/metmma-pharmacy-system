export function receiptLabel(sale) {
  const id = sale?.saleId || sale?.id
  return id ? `R-${String(id).padStart(6, '0')}` : sale?.receiptNumber || 'Receipt'
}
export function dateLabel(value) {
  if (!value) return '—'
  const date = new Date(String(value).slice(0, 10) + 'T12:00:00')
  return Number.isNaN(date.getTime()) ? '—' : date.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
}
export const paymentLabel = value => ({ cash: 'Cash', card: 'Card', mobile_money: 'Mobile money', bank_transfer: 'Bank transfer' })[value] || 'Other'
