<template>
  <div class="sale-detail">
    <header class="sale-detail__header">
      <div>
        <h1 class="sale-detail__title">Transaction Details</h1>
        <p class="sale-detail__subtitle">Complete information for this sales transaction</p>
      </div>
      <router-link to="/sales-history" class="btn btn--ghost">← Back to Sales History</router-link>
    </header>

    <div v-if="error" class="alert alert--error" role="alert">
      <p>{{ error }}</p>
      <button type="button" class="btn btn--ghost" @click="loadSale">Retry</button>
    </div>

    <BaseCard v-if="loading" class="state state--loading">
      <div class="skeleton" v-for="n in 4" :key="n" />
      <p>Loading transaction details...</p>
    </BaseCard>

    <template v-else-if="sale">
      <BaseCard class="section">
        <h2>Transaction Information</h2>
        <dl class="info-grid">
          <div>
            <dt>Transaction Number</dt>
            <dd>{{ sale.transactionNumber }}</dd>
          </div>
          <div>
            <dt>Date / Time</dt>
            <dd>{{ formatDate(sale.date) }}</dd>
          </div>
          <div>
            <dt>Cashier</dt>
            <dd>{{ sale.cashier?.name || '—' }}</dd>
          </div>
          <div>
            <dt>Status</dt>
            <dd><SaleStatusBadge :status="sale.status" /></dd>
          </div>
          <div>
            <dt>Payment Method</dt>
            <dd>{{ formatPayment(sale.paymentMethod) }}</dd>
          </div>
          <div>
            <dt>Customer</dt>
            <dd>{{ sale.customerName || '—' }}</dd>
          </div>
        </dl>
      </BaseCard>

      <BaseCard class="section">
        <h2>Items</h2>

        <div v-if="!sale.items?.length" class="state">
          <p>No line items recorded for this transaction.</p>
        </div>

        <div v-else class="table-wrap">
          <table class="items-table">
            <thead>
              <tr>
                <th>Product</th>
                <th>Quantity</th>
                <th>Unit Price</th>
                <th>Total Price</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="item in sale.items" :key="item.id">
                <td>
                  <strong>{{ item.productName }}</strong>
                  <span v-if="item.productCode" class="muted">{{ item.productCode }}</span>
                </td>
                <td>{{ item.quantity }}</td>
                <td>{{ formatMoney(item.unitPrice) }}</td>
                <td>{{ formatMoney(item.totalPrice) }}</td>
              </tr>
            </tbody>
          </table>
        </div>

        <div class="items-cards">
          <article v-for="item in sale.items" :key="`item-${item.id}`" class="item-card">
            <strong>{{ item.productName }}</strong>
            <p v-if="item.productCode" class="muted">{{ item.productCode }}</p>
            <p>Qty: {{ item.quantity }} × {{ formatMoney(item.unitPrice) }}</p>
            <p class="item-card__total">{{ formatMoney(item.totalPrice) }}</p>
          </article>
        </div>
      </BaseCard>

      <BaseCard class="section">
        <h2>Financial Information</h2>
        <dl class="finance-list">
          <div>
            <dt>Subtotal</dt>
            <dd>{{ formatMoney(sale.financial?.subtotal) }}</dd>
          </div>
          <div>
            <dt>Discount</dt>
            <dd>{{ formatMoney(sale.financial?.discount) }}</dd>
          </div>
          <div>
            <dt>Tax</dt>
            <dd>{{ formatMoney(sale.financial?.tax) }}</dd>
          </div>
          <div class="finance-list__total">
            <dt>Total Amount</dt>
            <dd>{{ formatMoney(sale.financial?.totalAmount) }}</dd>
          </div>
        </dl>
      </BaseCard>
    </template>
  </div>
</template>

<script setup>
import { onMounted, ref, watch } from 'vue';
import { useRoute } from 'vue-router';
import BaseCard from '@/modules/shared/components/BaseCard.vue';
import SaleStatusBadge from '@/modules/sales/components/SaleStatusBadge.vue';
import { getSaleById } from '@/services/salesService';

const route = useRoute();
const sale = ref(null);
const loading = ref(false);
const error = ref('');

function formatDate(value) {
  if (!value) return '—';
  return new Date(value).toLocaleString();
}

function formatMoney(amount) {
  const num = Number(amount) || 0;
  return num.toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  });
}

function formatPayment(method) {
  const map = {
    cash: 'Cash',
    card: 'Card',
    mobile_money: 'Mobile Money'
  };
  return map[String(method || '').toLowerCase()] || method || '—';
}

async function loadSale() {
  loading.value = true;
  error.value = '';
  sale.value = null;

  try {
    const response = await getSaleById(route.params.id);
    sale.value = response.data;
  } catch (err) {
    error.value = err.message || 'Transaction details cannot be loaded.';
  } finally {
    loading.value = false;
  }
}

watch(() => route.params.id, loadSale);
onMounted(loadSale);
</script>

<style scoped>
.sale-detail {
  max-width: 900px;
  margin: 0 auto;
  padding: 1.25rem;
  text-align: left;
  color: #1a1a1a;
}

.sale-detail__header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 1rem;
  margin-bottom: 1rem;
}

.sale-detail__title {
  margin: 0;
  font-size: 1.75rem;
  color: #1b5e20;
}

.sale-detail__subtitle {
  margin: 0.35rem 0 0;
  color: #607d8b;
}

.section {
  margin-bottom: 1rem;
}

.section h2 {
  margin: 0 0 0.85rem;
  font-size: 1.1rem;
  color: #37474f;
}

.info-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
  gap: 0.85rem;
  margin: 0;
}

.info-grid dt {
  font-size: 0.8rem;
  color: #78909c;
  margin-bottom: 0.2rem;
}

.info-grid dd {
  margin: 0;
  font-weight: 600;
}

.items-table {
  width: 100%;
  border-collapse: collapse;
}

.items-table th,
.items-table td {
  padding: 0.65rem 0.45rem;
  border-bottom: 1px solid #eceff1;
  text-align: left;
}

.items-table th {
  color: #546e7a;
  font-size: 0.8rem;
  text-transform: uppercase;
}

.muted {
  display: block;
  color: #90a4ae;
  font-size: 0.8rem;
  font-weight: 400;
}

.finance-list {
  margin: 0;
}

.finance-list > div {
  display: flex;
  justify-content: space-between;
  padding: 0.45rem 0;
  border-bottom: 1px solid #f5f5f5;
}

.finance-list dt {
  color: #607d8b;
}

.finance-list dd {
  margin: 0;
  font-weight: 600;
}

.finance-list__total {
  border-bottom: none;
  margin-top: 0.35rem;
  font-size: 1.05rem;
}

.finance-list__total dd {
  color: #1b5e20;
}

.btn {
  display: inline-flex;
  align-items: center;
  border-radius: 0.4rem;
  border: 1px solid #cfd8dc;
  padding: 0.45rem 0.85rem;
  font: inherit;
  cursor: pointer;
  text-decoration: none;
  color: #455a64;
  background: #fff;
}

.alert {
  margin-bottom: 1rem;
  padding: 0.85rem 1rem;
  border-radius: 0.5rem;
}

.alert--error {
  background: #ffebee;
  color: #b71c1c;
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 0.75rem;
}

.state {
  text-align: center;
  color: #546e7a;
  padding: 1rem 0;
}

.skeleton {
  height: 2.25rem;
  margin-bottom: 0.5rem;
  border-radius: 0.4rem;
  background: linear-gradient(90deg, #eceff1 25%, #f5f5f5 50%, #eceff1 75%);
  background-size: 200% 100%;
  animation: shimmer 1.2s infinite;
}

@keyframes shimmer {
  0% { background-position: 200% 0; }
  100% { background-position: -200% 0; }
}

.items-cards {
  display: none;
}

.item-card {
  border: 1px solid #eceff1;
  border-radius: 0.5rem;
  padding: 0.75rem;
  margin-bottom: 0.65rem;
}

.item-card p {
  margin: 0.25rem 0;
  color: #546e7a;
}

.item-card__total {
  font-weight: 700;
  color: #1b5e20 !important;
}

@media (max-width: 700px) {
  .sale-detail__header {
    flex-direction: column;
  }

  .table-wrap {
    display: none;
  }

  .items-cards {
    display: block;
  }
}
</style>
