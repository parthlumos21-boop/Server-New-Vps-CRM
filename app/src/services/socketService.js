import { io } from 'socket.io-client'
import { SOCKET_EVENTS } from '../constants/socketEvents'
import { getSocketBaseUrl } from './runtimeUrls'

const stripApiSuffix = (value = '') => value.replace(/\/api\/?$/i, '')

export const SOCKET_SERVER_URL =
  import.meta.env.VITE_SOCKET_URL
  || stripApiSuffix(import.meta.env.VITE_API_URL || '')
  || getSocketBaseUrl()

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

  return socket
}

export const closeSocketConnection = (socket) => {
  if (!socket) return
  socket.removeAllListeners()
  socket.close()
}
