import { apiRequest, buildQuery } from './api';

/**
 * Fetch paginated sales history with optional filters.
 */
export function getSaleHistory(params = {}) {
  return apiRequest(`/sales/history${buildQuery(params)}`);
}

/**
 * Fetch a single sale with line items.
 */
export function getSaleById(id) {
  return apiRequest(`/sales/${id}`);
}

/**
 * Cashiers for the filter dropdown.
 */
export function getCashiers() {
  return apiRequest('/sales/cashiers');
}
