import apiClient from './apiClient';

export const dataService = {
    // PRODUCTS
    getProducts: () => apiClient.get('/products'),
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
    recordSale: (saleData) => apiClient.post('/sales/checkout', saleData),
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
