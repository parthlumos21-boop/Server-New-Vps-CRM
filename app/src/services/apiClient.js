import axios from 'axios'
import { getApiBaseUrl } from './runtimeUrls'
import { normalizeRequestPayload } from '../utils/requestPayload'

export const AUTH_TOKEN_STORAGE_KEY = 'crm_token'
export const AUTH_UNAUTHORIZED_EVENT = 'crm:auth-unauthorized'

const API_BASE_URL = getApiBaseUrl()

const apiClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: 15000,
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
  },
})

export const getStoredAuthToken = () => localStorage.getItem(AUTH_TOKEN_STORAGE_KEY) || ''

export const setStoredAuthToken = (token) => {
  if (token) {
    localStorage.setItem(AUTH_TOKEN_STORAGE_KEY, token)
    return
  }

  localStorage.removeItem(AUTH_TOKEN_STORAGE_KEY)
}

export const clearStoredAuth = () => {
  localStorage.removeItem(AUTH_TOKEN_STORAGE_KEY)
  localStorage.removeItem('crm_user')
  localStorage.removeItem('crm_users_directory')
}

const decodeJwtPayload = (token) => {
  try {
    const encodedPayload = String(token || '').split('.')[1]
    if (!encodedPayload) return null

    const normalizedPayload = encodedPayload
      .replace(/-/g, '+')
      .replace(/_/g, '/')
    const paddedPayload = normalizedPayload.padEnd(
      normalizedPayload.length + ((4 - (normalizedPayload.length % 4)) % 4),
      '='
    )

    return JSON.parse(window.atob(paddedPayload))
  } catch {
    return null
  }
}

export const isAuthTokenExpired = (token) => {
  const payload = decodeJwtPayload(token)
  if (!payload?.exp) return false

  return payload.exp * 1000 <= Date.now()
}

apiClient.interceptors.request.use((config) => {
  const token = getStoredAuthToken()
  if (token && isAuthTokenExpired(token)) {
    clearStoredAuth()
    config.__authToken = ''
    return config
  }

  config.__authToken = token || ''
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }

  const method = String(config.method || 'get').toUpperCase()
  const requestUrl = String(config.url || '')
  const isMutatingRequest = method === 'POST' || method === 'PUT' || method === 'PATCH'
  const shouldNormalizePayload = isMutatingRequest && !requestUrl.startsWith('/auth/')

  if (shouldNormalizePayload && config.data && typeof config.data === 'object') {
    config.data = normalizeRequestPayload(config.data)
  }

  return config
})

apiClient.interceptors.response.use(
  (response) => response.data,
  async (error) => {
    if (error.response?.status === 401) {
      const requestUrl = String(error.config?.url || '')
      const requestHadToken = Boolean(error.config?.__authToken)
      const isInitialSessionProbe = requestUrl.includes('/auth/me') && !requestHadToken
      const isLoginRequest = requestUrl.includes('/auth/login')
      const isPasswordResetRequest = requestUrl.includes('/auth/password-reset-requests')
        || requestUrl.includes('/auth/forgot-password')
      const isRefreshRequest = requestUrl.includes('/auth/refresh')
      const isLogoutRequest = requestUrl.includes('/auth/logout')
      if (isInitialSessionProbe || isLoginRequest || isPasswordResetRequest || isRefreshRequest || isLogoutRequest) {
        return Promise.reject(error)
      }

      if (!error.config?.__isRetryRequest) {
        try {
          await apiClient.post('/auth/refresh', undefined, {
            __isRetryRequest: true,
          })

          return apiClient({
            ...error.config,
            __isRetryRequest: true,
          })
        } catch {
          // Fall through to local session cleanup below.
        }
      }

      const hadToken = Boolean(getStoredAuthToken())
      clearStoredAuth()

      if ((hadToken || requestHadToken || !isInitialSessionProbe) && typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent(AUTH_UNAUTHORIZED_EVENT))
      }
    }

    return Promise.reject(error)
  }
)

export default apiClient
