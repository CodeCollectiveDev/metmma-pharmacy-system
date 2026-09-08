<template>
  <div class="sales-history">
    <header class="sales-history__header">
      <div>
        <h1 class="sales-history__title">Sales History</h1>
        <p class="sales-history__subtitle">
          View, search and inspect historical sales transactions
        </p>
      </div>
      <router-link to="/dashboard" class="sales-history__back-link">← Dashboard</router-link>
    </header>

    <BaseCard class="sales-history__filters">
      <div class="filters-grid">
        <label class="field field--search">
          <span>Search</span>
          <input
            v-model="filters.search"
            type="search"
            placeholder="Transaction number, cashier, customer..."
            class="field__input"
          />
        </label>

        <label class="field">
          <span>From</span>
          <input v-model="filters.startDate" type="date" class="field__input" />
        </label>

        <label class="field">
          <span>To</span>
          <input v-model="filters.endDate" type="date" class="field__input" />
        </label>

        <label class="field">
          <span>Cashier</span>
          <select v-model="filters.cashierId" class="field__input">
            <option value="">All Cashiers</option>
            <option v-for="cashier in cashiers" :key="cashier.id" :value="String(cashier.id)">
              {{ cashier.name }}
            </option>
          </select>
        </label>

        <label class="field">
          <span>Payment Method</span>
          <select v-model="filters.paymentMethod" class="field__input">
            <option value="">All</option>
            <option value="cash">Cash</option>
            <option value="card">Card</option>
            <option value="mobile_money">Mobile Money</option>
          </select>
        </label>

        <label class="field">
          <span>Status</span>
          <select v-model="filters.status" class="field__input">
            <option value="">All</option>
            <option value="completed">Completed</option>
            <option value="cancelled">Cancelled</option>
            <option value="refunded">Refunded</option>
          </select>
        </label>
      </div>

      <div class="filters-actions">
        <button type="button" class="btn btn--ghost" @click="clearFilters">Clear Filters</button>
      </div>
    </BaseCard>

    <div v-if="error" class="alert alert--error" role="alert">
      <p>{{ error }}</p>
      <button type="button" class="btn btn--ghost" @click="loadSales">Retry</button>
    </div>

    <BaseCard>
      <div v-if="loading" class="state state--loading">
        <div class="skeleton" v-for="n in 5" :key="n" />
        <p>Loading sales transactions...</p>
      </div>

      <div v-else-if="!error && sales.length === 0" class="state state--empty">
        <h2>No transactions found</h2>
        <p>No sales transactions match your current search or filters.</p>
        <button type="button" class="btn btn--primary" @click="clearFilters">Clear Filters</button>
      </div>

      <template v-else-if="sales.length">
        <!-- Desktop table -->
        <div class="table-wrap">
          <table class="sales-table">
            <thead>
              <tr>
                <th>Transaction Number</th>
                <th>Date/Time</th>
                <th>Cashier</th>
                <th>Items</th>
                <th>Total Amount</th>
                <th>Payment Method</th>
                <th>Status</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="sale in sales" :key="sale.id">
                <td data-label="Transaction">{{ sale.transactionNumber }}</td>
                <td data-label="Date/Time">{{ formatDate(sale.date) }}</td>
                <td data-label="Cashier">{{ sale.cashier?.name || '—' }}</td>
                <td data-label="Items">{{ sale.items }}</td>
                <td data-label="Total">{{ formatMoney(sale.totalAmount) }}</td>
                <td data-label="Payment">{{ formatPayment(sale.paymentMethod) }}</td>
                <td data-label="Status">
                  <SaleStatusBadge :status="sale.status" />
                </td>
                <td data-label="Action">
                  <router-link
                    :to="`/sales-history/${sale.id}`"
                    class="btn btn--primary btn--sm"
                  >
                    View Details
                  </router-link>
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <!-- Mobile cards -->
        <div class="sales-cards">
          <article v-for="sale in sales" :key="`card-${sale.id}`" class="sale-card">
            <div class="sale-card__top">
              <strong>{{ sale.transactionNumber }}</strong>
              <SaleStatusBadge :status="sale.status" />
            </div>
            <p>{{ formatDate(sale.date) }}</p>
            <p>Cashier: {{ sale.cashier?.name || '—' }}</p>
            <p>Items: {{ sale.items }} · {{ formatPayment(sale.paymentMethod) }}</p>
            <p class="sale-card__total">{{ formatMoney(sale.totalAmount) }}</p>
            <router-link :to="`/sales-history/${sale.id}`" class="btn btn--primary btn--sm">
              View Details
            </router-link>
          </article>
        </div>

        <SalesPagination
          :page="pagination.page"
          :limit="pagination.limit"
          :total="pagination.total"
          :total-pages="pagination.totalPages"
          @change="goToPage"
        />
      </template>
    </BaseCard>
  </div>
</template>

<script setup>
import { onMounted, reactive, ref, watch } from 'vue';
import BaseCard from '@/modules/shared/components/BaseCard.vue';
import SaleStatusBadge from '@/modules/sales/components/SaleStatusBadge.vue';
import SalesPagination from '@/modules/sales/components/SalesPagination.vue';
import { getCashiers, getSaleHistory } from '@/services/salesService';

const sales = ref([]);
const cashiers = ref([]);
const loading = ref(false);
const error = ref('');
const page = ref(1);
const limit = 20;

const pagination = reactive({
  page: 1,
  limit: 20,
  total: 0,
  totalPages: 0
});

const filters = reactive({
  search: '',
  startDate: '',
  endDate: '',
  cashierId: '',
  paymentMethod: '',
  status: ''
});

let searchTimeout = null;

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

async function loadCashiers() {
  try {
    const response = await getCashiers();
    cashiers.value = response.data || [];
  } catch {
    cashiers.value = [];
  }
}

async function loadSales() {
  loading.value = true;
  error.value = '';

  try {
    const response = await getSaleHistory({
      page: page.value,
      limit,
      search: filters.search.trim() || undefined,
      startDate: filters.startDate || undefined,
      endDate: filters.endDate || undefined,
      cashierId: filters.cashierId || undefined,
      paymentMethod: filters.paymentMethod || undefined,
      status: filters.status || undefined,
      sortBy: 'createdAt',
      sortOrder: 'DESC'
    });

    sales.value = response.data || [];
    Object.assign(pagination, response.pagination || {
      page: page.value,
      limit,
      total: sales.value.length,
      totalPages: 1
    });
  } catch (err) {
    sales.value = [];
    error.value = err.message || 'Sales cannot be loaded.';
  } finally {
    loading.value = false;
  }
}

function clearFilters() {
  filters.search = '';
  filters.startDate = '';
  filters.endDate = '';
  filters.cashierId = '';
  filters.paymentMethod = '';
  filters.status = '';
  page.value = 1;
  loadSales();
}

function goToPage(nextPage) {
  page.value = nextPage;
  loadSales();
}

watch(
  () => filters.search,
  () => {
    clearTimeout(searchTimeout);
    searchTimeout = setTimeout(() => {
      page.value = 1;
      loadSales();
    }, 400);
  }
);

watch(
  () => [
    filters.startDate,
    filters.endDate,
    filters.cashierId,
    filters.paymentMethod,
    filters.status
  ],
  () => {
    page.value = 1;
    loadSales();
  }
);

onMounted(async () => {
  await loadCashiers();
  await loadSales();
});
</script>

<style scoped>
.sales-history {
  max-width: 1200px;
  margin: 0 auto;
  padding: 1.25rem;
  text-align: left;
  color: #1a1a1a;
}

.sales-history__header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 1rem;
  margin-bottom: 1rem;
}

.sales-history__title {
  margin: 0;
  font-size: 1.75rem;
  color: #1b5e20;
}

.sales-history__subtitle {
  margin: 0.35rem 0 0;
  color: #607d8b;
}

.sales-history__back-link {
  color: #2e7d32;
  text-decoration: none;
  font-weight: 600;
  white-space: nowrap;
}

.sales-history__filters {
  margin-bottom: 1rem;
}

.filters-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(160px, 1fr));
  gap: 0.75rem;
}

.field {
  display: flex;
  flex-direction: column;
  gap: 0.3rem;
  font-size: 0.85rem;
  color: #455a64;
}

.field--search {
  grid-column: 1 / -1;
}

.field__input {
  border: 1px solid #cfd8dc;
  border-radius: 0.4rem;
  padding: 0.5rem 0.65rem;
  font: inherit;
  background: #fff;
  color: #212121;
}

.filters-actions {
  margin-top: 0.85rem;
  display: flex;
  justify-content: flex-end;
}

.btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border-radius: 0.4rem;
  border: 1px solid transparent;
  padding: 0.45rem 0.85rem;
  font: inherit;
  cursor: pointer;
  text-decoration: none;
}

.btn--primary {
  background: #2e7d32;
  color: #fff;
}

.btn--primary:hover {
  background: #1b5e20;
}

.btn--ghost {
  background: transparent;
  border-color: #cfd8dc;
  color: #455a64;
}

.btn--sm {
  padding: 0.3rem 0.65rem;
  font-size: 0.85rem;
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
  padding: 2rem 1rem;
  color: #546e7a;
}

.state--empty h2 {
  margin: 0 0 0.5rem;
  color: #37474f;
}

.skeleton {
  height: 2.5rem;
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

.table-wrap {
  overflow-x: auto;
}

.sales-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 0.92rem;
}

.sales-table th,
.sales-table td {
  padding: 0.7rem 0.55rem;
  border-bottom: 1px solid #eceff1;
  text-align: left;
  vertical-align: middle;
}

.sales-table th {
  color: #546e7a;
  font-weight: 600;
  font-size: 0.8rem;
  text-transform: uppercase;
  letter-spacing: 0.02em;
}

.sales-cards {
  display: none;
}

.sale-card {
  border: 1px solid #eceff1;
  border-radius: 0.5rem;
  padding: 0.85rem;
  margin-bottom: 0.75rem;
  text-align: left;
}

.sale-card__top {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 0.5rem;
  margin-bottom: 0.35rem;
}

.sale-card p {
  margin: 0.2rem 0;
  color: #546e7a;
  font-size: 0.9rem;
}

.sale-card__total {
  font-weight: 700;
  color: #1b5e20 !important;
  margin: 0.45rem 0 !important;
}

@media (max-width: 800px) {
  .table-wrap {
    display: none;
  }

  .sales-cards {
    display: block;
  }

  .sales-history__header {
    flex-direction: column;
  }
}
</style>
