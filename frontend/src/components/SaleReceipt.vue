<script setup>
import { receiptLabel } from '@/services/api/display'
import { currency } from '@/services/api/money'
import defaultLogo from '@/assets/metmma_pharmacy_logo.svg'
import defaultLogoWhite from '@/assets/metmma_pharmacy_logo_white.svg'
import { computed } from 'vue'
const props = defineProps({ sale: { type: Object, required: true }, profile: { type: Object, default: null } })
const profile = computed(() => ({
  pharmacyName: props.profile?.pharmacyName || 'METMMA Pharmacy',
  phone: props.profile?.phone || '',
  email: props.profile?.email || '',
  address: props.profile?.address || '',
  logoData: props.profile?.logoData || ''
}))
</script>
<template>
<article class="sale-receipt space-y-2">
<header class="text-center space-y-1">
  <img v-if="profile.logoData" :src="profile.logoData" alt="Pharmacy logo" class="h-12 w-auto mx-auto object-contain" />
  <picture v-else><source :srcset="defaultLogoWhite" media="(prefers-color-scheme: dark)" /><img :src="defaultLogo" alt="METMMA Pharmacy logo" class="h-12 w-auto mx-auto object-contain" /></picture>
  <h3 class="text-lg font-bold">{{ profile.pharmacyName }}</h3><p>Sales receipt</p>
</header>
<p class="break-all">{{receiptLabel(sale)}}</p><p>{{new Date(sale.date).toLocaleString()}}</p><p>Served by: {{sale.cashier || 'Staff member'}}</p><p>Customer: {{sale.customerName || 'Walk-in customer'}}</p>
<p v-if="sale.status==='reversed'" class="font-bold">REVERSED — this sale was refunded or voided</p>
<table class="w-full text-sm"><thead><tr class="border-b"><th class="text-left py-2">Item</th><th class="text-right py-2">Amount</th></tr></thead><tbody><tr v-for="item in sale.items" :key="item.productId" class="border-b"><td class="py-2 pr-2">{{item.name}}<span class="block">{{item.quantity}} × {{currency(item.unitPrice)}}</span></td><td class="py-2 text-right align-top">{{currency(item.subtotal)}}</td></tr></tbody></table>
<p class="flex justify-between font-bold"><span>Total</span><span>{{currency(sale.totalAmount)}}</span></p>
<p>Payment: {{(sale.paymentMethod || 'cash').replaceAll('_',' ')}}</p><p v-if="sale.amountReceived != null" class="flex justify-between"><span>Received</span><span>{{currency(sale.amountReceived)}}</span></p><p v-if="sale.changeGiven != null && sale.paymentMethod==='cash'" class="flex justify-between"><span>Change</span><span>{{currency(sale.changeGiven)}}</span></p>
<footer class="text-center text-xs space-y-1"><p v-if="profile.phone">Phone: {{ profile.phone }}</p><p v-if="profile.email">{{ profile.email }}</p><p v-if="profile.address">{{ profile.address }}</p><p>Thank you for your purchase.</p></footer>
</article>
</template>
