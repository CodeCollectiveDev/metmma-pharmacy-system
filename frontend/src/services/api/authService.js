import apiClient from './apiClient'
export const authService = {
  login: async (username, password) => (await apiClient.post('/auth/login', { username, password })).data,
  register: async userData => (await apiClient.post('/auth/register', userData)).data,
  logout: () => { ['token', 'role', 'user'].forEach(key => localStorage.removeItem(key)) }
}
