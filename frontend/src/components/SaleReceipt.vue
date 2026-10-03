<script setup>
import { currency } from '@/services/api/money'
defineProps({sale:{type:Object,required:true}})
</script>
<template>
<article class="sale-receipt space-y-3">
<header class="text-center"><h3 class="text-xl font-bold">METMMA Pharmacy</h3><p>Sales receipt</p></header>
<p class="break-all">{{sale.receiptNumber}}</p><p>{{new Date(sale.date).toLocaleString()}}</p><p>Served by: {{sale.cashier || 'Staff member'}}</p><p>Customer: {{sale.customerName || 'Walk-in customer'}}</p>
<p v-if="sale.status==='reversed'" class="font-bold">REVERSED — this sale was refunded or voided</p>
<table class="w-full text-sm"><thead><tr class="border-b"><th class="text-left py-2">Item</th><th class="text-right py-2">Amount</th></tr></thead><tbody><tr v-for="item in sale.items" :key="item.productId" class="border-b"><td class="py-2 pr-2">{{item.name}}<span class="block">{{item.quantity}} × {{currency(item.unitPrice)}}</span></td><td class="py-2 text-right align-top">{{currency(item.subtotal)}}</td></tr></tbody></table>
<p class="flex justify-between"><span>Subtotal</span><span>{{currency(sale.subtotal)}}</span></p><p class="flex justify-between"><span>VAT</span><span>{{currency(sale.tax)}}</span></p><p class="flex justify-between font-bold"><span>Total</span><span>{{currency(sale.totalAmount)}}</span></p>
<p>Payment: {{(sale.paymentMethod || 'cash').replaceAll('_',' ')}}</p><p v-if="sale.amountReceived != null" class="flex justify-between"><span>Received</span><span>{{currency(sale.amountReceived)}}</span></p><p v-if="sale.changeGiven != null && sale.paymentMethod==='cash'" class="flex justify-between"><span>Change</span><span>{{currency(sale.changeGiven)}}</span></p><p class="text-center text-sm">Thank you for your purchase.</p>
</article>
</template>
