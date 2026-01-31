import apiClient from './apiClient';

export const dataService = {
    // PRODUCTS
    getProducts: () => apiClient.get('/products'),
    addProduct: (product) => apiClient.post('/products', product),

    // SALES
    recordSale: (saleData) => apiClient.post('/sales', saleData),

    // EMPLOYEES
    getEmployees: () => apiClient.get('/emplyees'), // Path intentional as per contract

    // REPORTS
    getDailySales: () => apiClient.get('/reports/sales-daily'),
};
