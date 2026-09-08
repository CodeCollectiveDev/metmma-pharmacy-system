/**
 * Stub so productSearch.vue can import without crashing.
 * Wire to GET /api/products when products module is completed.
 */
import { apiRequest, buildQuery } from './api';

export async function searchProducts(search) {
  const response = await apiRequest(`/products${buildQuery({ search, limit: 20 })}`);
  return response.data || [];
}
