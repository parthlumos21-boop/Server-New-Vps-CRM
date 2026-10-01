import { io } from 'socket.io-client'
import { SOCKET_EVENTS } from '../constants/socketEvents'
import { getSocketBaseUrl } from './runtimeUrls'

const stripApiSuffix = (value = '') => value.replace(/\/api\/?$/i, '')

const getSocketUrl = () => {
  if (typeof window !== 'undefined') {
    const hostname = window.location.hostname
    if (hostname === 'localhost' || hostname === '127.0.0.1') {
      return `http://${hostname}:5000`
    }
  }
  return import.meta.env.VITE_SOCKET_URL
    || stripApiSuffix(import.meta.env.VITE_API_URL || '')
    || getSocketBaseUrl()
}

export const SOCKET_SERVER_URL = getSocketUrl()

export const createSocketConnection = (
  userData,
  {
    token = '',
    onConnect,
    onDisconnect,
    onConnectError,
  } = {}
) => {
  const socket = io(SOCKET_SERVER_URL, {
    withCredentials: true,
    auth: {
      token,
    },
    query: {
      userId: userData?.id || '',
      role: userData?.role || '',
      name: userData?.name || '',
    },
    transports: ['polling', 'websocket'],
    upgrade: true,
    reconnection: true,
    reconnectionAttempts: Infinity,
    reconnectionDelay: 1000,
    timeout: 10000,
    forceNew: true,
  })

  if (onConnect) {
    socket.on(SOCKET_EVENTS.CONNECT, onConnect)
  }

  if (onDisconnect) {
    socket.on(SOCKET_EVENTS.DISCONNECT, onDisconnect)
  }

  if (onConnectError) {
    socket.on(SOCKET_EVENTS.CONNECT_ERROR, onConnectError)
  }

  const handlePageHide = () => {
    if (socket.connected) {
      socket.disconnect()
    }
  }

  const handlePageShow = (e) => {
    if (e.persisted && socket.disconnected) {
      socket.connect()
    }
  }

  window.addEventListener('pagehide', handlePageHide)
  window.addEventListener('pageshow', handlePageShow)

  socket._cleanupBfcacheListeners = () => {
    window.removeEventListener('pagehide', handlePageHide)
    window.removeEventListener('pageshow', handlePageShow)
  }

  return socket
}

export const closeSocketConnection = (socket) => {
  if (!socket) return
  if (typeof socket._cleanupBfcacheListeners === 'function') {
    socket._cleanupBfcacheListeners()
  }
  socket.removeAllListeners()
  socket.close()
}
