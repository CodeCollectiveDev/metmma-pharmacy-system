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

    createUser: async (userData) => {
        try {
            const response = await apiClient.post('/auth/users', userData);
            return response.data;
        } catch (error) {
            console.error('[AuthService] Create user error:', error);
            throw error;
        }
    },

    getUsers: async () => {
        try {
            const response = await apiClient.get('/auth/users');
            return response.data;
        } catch (error) {
            console.error('[AuthService] List users error:', error);
            throw error;
        }
    },

    setUserActive: async (id, isActive) => {
        try {
            const response = await apiClient.patch(`/auth/users/${id}/active`, { is_active: isActive });
            return response.data;
        } catch (error) {
            console.error('[AuthService] Toggle user error:', error);
            throw error;
        }
    },

    setUserPassword: async (id, password) => {
        try {
            const response = await apiClient.patch(`/auth/users/${id}/password`, { password });
            return response.data;
        } catch (error) {
            console.error('[AuthService] Set password error:', error);
            throw error;
        }
    },

    logout: () => {
        localStorage.removeItem('token');
        localStorage.removeItem('role');
        localStorage.removeItem('user');
    }
};