export function minor(amount) {
  const text = String(amount ?? '0')
  if (!/^\d+(\.\d{1,2})?$/.test(text)) throw new Error('Invalid amount')
  const [whole, fraction = ''] = text.split('.')
  const value = Number(whole) * 100 + Number(fraction.padEnd(2, '0'))
  if (!Number.isSafeInteger(value)) throw new Error('Invalid amount')
  return value
}
export const decimal = value => `${Math.floor(value / 100)}.${String(value % 100).padStart(2, '0')}`
export const currency = value => new Intl.NumberFormat('en-MW', { style: 'currency', currency: 'MWK', minimumFractionDigits: 2 }).format(value || 0)
export function periodDates(period) {
  const now = new Date(), start = new Date(now)
  if (period === 'week') start.setDate(now.getDate() - ((now.getDay() + 6) % 7))
  if (period === 'month') start.setDate(1)
  const format = d => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
  return { start: format(start), end: format(now) }
}
export const normalizeProduct = p => ({ ...p, _id: String(p.id), stock: p.quantity, price: p.sellingPrice, minStockLevel: p.reorderLevel })
