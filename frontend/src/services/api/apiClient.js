import axios from 'axios';

const apiClient = axios.create({
    baseURL: '/api',
    headers: {
        'Content-Type': 'application/json',
    },
});

// --- Session helpers -------------------------------------------------------
const getToken = () => localStorage.getItem('token');
const getRefreshToken = () => localStorage.getItem('refreshToken');

export const clearSession = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('refreshToken');
    localStorage.removeItem('role');
    localStorage.removeItem('user');
};

export const storeSession = ({ token, refreshToken, role, user }) => {
    if (token) localStorage.setItem('token', token);
    if (refreshToken) localStorage.setItem('refreshToken', refreshToken);
    if (role) localStorage.setItem('role', role);
    if (user) localStorage.setItem('user', typeof user === 'string' ? user : JSON.stringify(user));
};

const redirectToLogin = () => {
    const current = window.location.pathname;
    if (current && !current.startsWith('/login')) {
        window.location.href = '/login';
    }
};

// --- Request interceptor: attach JWT access token --------------------------
apiClient.interceptors.request.use(
    (config) => {
        const token = getToken();
        if (token) {
            config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
    },
    (error) => Promise.reject(error)
);

// --- Single-flight refresh (only one /auth/refresh at a time) --------------
let isRefreshing = false;
let pendingQueue = [];

const refreshAuthTokens = async () => {
    const refreshToken = getRefreshToken();
    if (!refreshToken) {
        throw new Error('No refresh token available');
    }
    const { data } = await axios.post('/api/auth/refresh', { refreshToken });
    if (!data || !data.token) {
        throw new Error('Refresh response missing token');
    }
    storeSession({
        token: data.token,
        refreshToken: data.refreshToken,
        role: data.user ? String(data.user.role).toLowerCase() : undefined,
        user: data.user,
    });
    return data.token;
};

const enqueueRefresh = () => {
    if (!isRefreshing) {
        isRefreshing = true;
        refreshAuthTokens()
            .then((token) => {
                isRefreshing = false;
                pendingQueue.forEach(({ resolve }) => resolve(token));
                pendingQueue = [];
            })
            .catch((err) => {
                isRefreshing = false;
                pendingQueue.forEach(({ reject }) => reject(err));
                pendingQueue = [];
            });
    }
    return new Promise((resolve, reject) => {
        pendingQueue.push({ resolve, reject });
    });
};

// --- Response interceptor: refresh once, then redirect on failure ----------
apiClient.interceptors.response.use(
    (response) => response,
    async (error) => {
        const original = error.config || {};
        const url = original.url || '';

        const isAuthUrl = url.includes('/auth/login') || url.includes('/auth/refresh') || url.includes('/auth/logout');

        if (!error.response || error.response.status !== 401 || original._retry || isAuthUrl) {
            return Promise.reject(error);
        }

        try {
            const token = await enqueueRefresh();
            original._retry = true;
            original.headers = original.headers || {};
            original.headers.Authorization = `Bearer ${token}`;
            return apiClient(original);
        } catch (refreshError) {
            clearSession();
            redirectToLogin();
            return Promise.reject(refreshError);
        }
    }
);

export default apiClient;
export { getToken, getRefreshToken };