import axios from 'axios'
import { getApiBaseUrl } from './runtimeUrls'

const API_BASE_URL = getApiBaseUrl()

class ApiService {
  constructor() {
    this.client = axios.create({
      baseURL: API_BASE_URL,
      timeout: 10000,
      headers: {
        'Content-Type': 'application/json'
      }
    })

    // Request interceptor
    this.client.interceptors.request.use(
      (config) => {
        const user = JSON.parse(localStorage.getItem('crm_user') || '{}')
        if (user.id) {
          config.headers['X-User-Id'] = user.id
          config.headers['X-User-Role'] = user.role
        }
        return config
      },
      (error) => Promise.reject(error)
    )

    // Response interceptor
    this.client.interceptors.response.use(
      (response) => response.data,
      (error) => {
        if (error.response?.status === 401) {
          localStorage.removeItem('crm_user')
          window.location.href = '/login'
        }
        return Promise.reject(error)
      }
    )
  }

  // Generic methods
  async get(endpoint, params = {}) {
    return this.client.get(endpoint, { params })
  }

  async post(endpoint, data) {
    return this.client.post(endpoint, data)
  }

  async put(endpoint, data) {
    return this.client.put(endpoint, data)
  }

  async delete(endpoint) {
    return this.client.delete(endpoint)
  }

  // Health check
  async healthCheck() {
    try {
      return await this.get('/health')
    } catch {
      return { status: 'offline' }
    }
  }
}

export const apiService = new ApiService()
