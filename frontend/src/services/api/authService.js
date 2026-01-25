import apiClient from './apiClient';

export const authService = {
    login: async (username, password) => {
        try {
            const response = await apiClient.post('/auth/login', { username, password });
            return response.data;
        } catch (error) {
            console.error('[AuthService] Login error:', error);
            throw error;
        }
    },

    register: async (userData) => {
        try {
            const response = await apiClient.post('/auth/register', userData);
            return response.data;
        } catch (error) {
            console.error('[AuthService] Registration error:', error);
            throw error;
        }
    },

    logout: () => {
        localStorage.removeItem('token');
        localStorage.removeItem('role');
        localStorage.removeItem('user');
    }
};
