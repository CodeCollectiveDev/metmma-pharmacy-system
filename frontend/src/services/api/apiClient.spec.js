import { afterEach, expect, it, vi } from 'vitest'

afterEach(() => {
  vi.unstubAllEnvs()
  localStorage.clear()
})

it.each([
  [undefined, '/api'],
  ['', '/api'],
  ['   ', '/api'],
  ['/api', '/api'],
  ['https://api.metmmapharmacy.com', 'https://api.metmmapharmacy.com/api'],
  [' https://api.metmmapharmacy.com/ ', 'https://api.metmmapharmacy.com/api'],
  ['https://api.metmmapharmacy.com/api', 'https://api.metmmapharmacy.com/api'],
  ['https://api.metmmapharmacy.com/api/', 'https://api.metmmapharmacy.com/api'],
  ['https://staging.example.com/custom/api/', 'https://staging.example.com/custom/api'],
])('routes login and authenticated requests using API environment %s', async (value, baseURL) => {
  vi.stubEnv('VITE_API_BASE_URL', value)
  vi.resetModules()
  const { default: apiClient } = await import('./apiClient')
  const { authService } = await import('./authService')
  const requests = []
  apiClient.defaults.adapter = async config => {
    requests.push({ url: apiClient.getUri(config), authorization: config.headers.Authorization })
    return { data: { success: true }, status: 200, statusText: 'OK', headers: {}, config }
  }

  await authService.login('test-user', 'test-password')
  localStorage.setItem('token', 'test-token')
  await apiClient.get('/products')

  expect(requests).toEqual([
    { url: `${baseURL}/auth/login`, authorization: undefined },
    { url: `${baseURL}/products`, authorization: 'Bearer test-token' },
  ])
})
