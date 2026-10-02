import axios from 'axios'
import { userError } from './errors'
import { sessionExpired } from '@/composables/useFeedback'
const apiClient = axios.create({ baseURL: import.meta.env.VITE_API_BASE_URL || '/api', timeout: 10000, headers: { 'Content-Type': 'application/json' } })
apiClient.interceptors.request.use(config => {
  const token = localStorage.getItem('token')
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})
apiClient.interceptors.response.use(response => response, error => {
  error.friendlyError = userError(error)
  if (error.friendlyError.code === 'SESSION_EXPIRED' && !error.config?.url?.includes('/auth/login')) sessionExpired.value = true
  return Promise.reject(error)
})
export default apiClient
