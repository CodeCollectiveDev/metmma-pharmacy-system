export const toSalePayload = sale => ({
  idempotencyKey: sale.idempotencyKey,
  items: sale.items.map(item => ({ productId: item.productId, quantity: item.quantity, unitPrice: item.unitPrice, subtotal: item.subtotal ?? item.total })),
  totalAmount: sale.totalAmount ?? sale.total,
  paymentMethod: sale.paymentMethod,
  customerName: sale.customerName,
  userId: sale.userId
})
