import apiClient from './apiClient';
import { toSalePayload } from './salePayload';

export const dataService = {
    // PRODUCTS
    getProductPage: (params = {}) => apiClient.get('/products', { params }),
    // Existing views and offline search need the complete catalogue. Keep each
    // request at the backend's normal page size and publish only a full result.
    getProducts: async () => {
        const products = [];
        let page = 1;
        let response;
        do {
            response = await dataService.getProductPage({ page });
            const { data, pagination } = response.data;
            if (!Array.isArray(data) || !pagination || pagination.page !== page || typeof pagination.hasMore !== 'boolean' ||
                (pagination.hasMore && data.length === 0)) {
                throw new Error('Incomplete product pagination response');
            }
            products.push(...data);
            if (!pagination.hasMore) break;
            page++;
        } while (true);
        return { ...response, data: { success: true, count: products.length, data: products } };
    },
    addProduct: (product) => apiClient.post('/products', product),
    updateProduct: (product) => {
        const productId = product.id || product._id;
        return apiClient.put(`/products/${productId}`, product);
    },
    deleteProduct: (product) => {
        const productId = product.id || product._id;
        return apiClient.delete(`/products/${productId}`);
    },

    // SALES
    recordSale: (saleData) => apiClient.post('/sales/checkout', toSalePayload(saleData)),
    getSalesHistory: () => apiClient.get('/sales/history'),

    // EMPLOYEES
    getEmployees: () => apiClient.get('/employees'),
    addEmployee: (employee) => apiClient.post('/employees', employee),
    updateEmployee: (employee) => {
        const empId = employee.id || employee._id;
        return apiClient.put(`/employees/${empId}`, employee);
    },
    deleteEmployee: (employee) => {
        const empId = employee.id || employee._id;
        return apiClient.delete(`/employees/${empId}`);
    },

    // ATTENDANCE
    getAttendance: (employeeId) => apiClient.get(`/attendance/${employeeId}`),
    markAttendance: (record) => apiClient.post('/attendance', record),

    // REPORTS
    getDailySales: () => apiClient.get('/reports/sales-daily'),
    getRecentActivity: () => apiClient.get('/reports/recent-activity'),
};
