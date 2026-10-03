export const toSalePayload = sale => ({
  idempotencyKey: sale.idempotencyKey,
  items: sale.items.map(item => ({ productId: item.productId, quantity: item.quantity, unitPrice: item.unitPrice, subtotal: item.subtotal ?? item.total })),
  totalAmount: sale.totalAmount ?? sale.total,
  ...(sale.amountReceived !== undefined ? { amountReceived: sale.amountReceived } : {}),
  paymentMethod: sale.paymentMethod,
  customerName: sale.customerName,
  userId: sale.userId
})
