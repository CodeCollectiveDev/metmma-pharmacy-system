import apiClient, { clearSession, storeSession } from './apiClient';

const persistAuth = (data) => {
    storeSession({
        token: data.token,
        refreshToken: data.refreshToken,
        role: data.user ? String(data.user.role).toLowerCase() : undefined,
        user: data.user,
    });
};

export const authService = {
    login: async (username, password) => {
        try {
            const response = await apiClient.post('/auth/login', { username, password });
            if (response.data && response.data.token) {
                persistAuth(response.data);
            }
            return response.data;
        } catch (error) {
            console.error('[AuthService] Login error:', error);
            throw error;
        }
    },

    refresh: async () => {
        const refreshToken = localStorage.getItem('refreshToken');
        if (!refreshToken) {
            throw new Error('No refresh token available');
        }
        const response = await apiClient.post('/auth/refresh', { refreshToken });
        if (response.data && response.data.token) {
            persistAuth(response.data);
        }
        return response.data;
    },

    logout: async () => {
        try {
            await apiClient.post('/auth/logout');
        } catch (error) {
            // Best-effort: the refresh/revoke flow may already have cleared the
            // session; local cleanup happens regardless.
            console.warn('[AuthService] Logout request failed:', error);
        } finally {
            clearSession();
        }
    },

    getMySessions: async () => {
        const response = await apiClient.get('/auth/sessions/me');
        return response.data.data;
    },

    revokeAllSessions: async () => {
        const response = await apiClient.post('/auth/sessions/revoke-all');
        return response.data;
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
    }
};