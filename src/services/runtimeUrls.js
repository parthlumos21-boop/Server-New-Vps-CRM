const DEFAULT_BACKEND_PORT = 5000

const getBrowserHostname = () => {
  if (typeof window === 'undefined') {
    return 'localhost'
  }

  return window.location.hostname || 'localhost'
}

export const getApiBaseUrl = () => {
  if (import.meta.env.VITE_API_URL) {
    return import.meta.env.VITE_API_URL
  }

  return '/api'
}

export const getSocketBaseUrl = () => {
  if (import.meta.env.VITE_SOCKET_URL) {
    return import.meta.env.VITE_SOCKET_URL
  }

  return `http://${getBrowserHostname()}:${DEFAULT_BACKEND_PORT}`
}
