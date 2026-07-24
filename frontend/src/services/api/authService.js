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

    logout: async () => {
        try {
            await apiClient.post('/auth/logout');
        } catch (error) {
            console.error('[AuthService] Logout error:', error);
        } finally {
            localStorage.removeItem('token');
            localStorage.removeItem('role');
            localStorage.removeItem('user');
        }
    },

    ping: async () => {
        try {
            await apiClient.post('/auth/ping');
        } catch (error) {
            console.error('[AuthService] Ping error:', error);
        }
    }
};
