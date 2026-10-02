// Both checkout and replay pass through this existing API boundary. Older
// queued receipts used `total` for the header and each line's subtotal.
export const toSalePayload = (sale) => ({
    items: sale.items.map(item => ({
        productId: item.productId,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        subtotal: item.subtotal ?? item.total
    })),
    totalAmount: sale.totalAmount ?? sale.total,
    paymentMethod: sale.paymentMethod,
    customerName: sale.customerName,
    userId: sale.userId
});
