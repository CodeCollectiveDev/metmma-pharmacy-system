import apiClient from './apiClient';

const generateIdempotencyKey = () => {
    if (globalThis.crypto && typeof globalThis.crypto.randomUUID === 'function') {
        return globalThis.crypto.randomUUID();
    }
    return `sale_${Date.now()}_${Math.random().toString(16).slice(2)}`;
};

const withIdempotencyKey = (saleData = {}) => {
    const payload = { ...saleData };
    const key = payload.localSaleId || payload.local_sale_id || payload.idempotencyKey || payload.idempotency_key || generateIdempotencyKey();
    payload.localSaleId = key;
    payload.idempotencyKey = key;
    return { payload, key };
};

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
    recordSale: (saleData) => {
        const { payload, key } = withIdempotencyKey(saleData);
        return apiClient.post('/sales/checkout', payload, {
            headers: {
                'X-Idempotency-Key': key,
            },
        });
    },
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
    getAttendance: (employeeId) => apiClient.get(`/attendance/employee/${employeeId}`),
    getAttendanceByDate: (date) => apiClient.get('/attendance/by-date', { params: { date } }),
    getCurrentLeave: () => apiClient.get('/attendance/leave/current'),
    getLeaveRequests: () => apiClient.get('/attendance/leave/requests'),
    createLeave: (leave) => apiClient.post('/attendance/leave', leave),
    updateLeaveStatus: (id, status) => apiClient.patch(`/attendance/leave/${id}/status`, { status }),
    markAttendance: (record) => apiClient.post('/attendance', record),

    // REPORTS
    getDailySales: () => apiClient.get('/reports/sales-daily'),
    getRecentActivity: () => apiClient.get('/reports/recent-activity'),
};
