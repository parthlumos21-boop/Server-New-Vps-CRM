import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from 'react'
import { authService } from '../services/authService'
import { authApi } from '../services/authApi'
import { auditClient } from '../services/auditClient'
import {
  AUTH_UNAUTHORIZED_EVENT,
  clearStoredAuth,
  getStoredAuthToken,
  isAuthTokenExpired,
  setStoredAuthToken,
} from '../services/apiClient'
import { userApi } from '../services/userApi'
import {
  closeSocketConnection,
  createSocketConnection,
} from '../services/socketService'

const AuthContext = createContext(null)

export const useAuth = () => {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider')
  }
  return context
}

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null)
  const [socket, setSocket] = useState(null)
  const [socketId, setSocketId] = useState('')
  const [loading, setLoading] = useState(true)
  const [isOnline, setIsOnline] = useState(navigator.onLine)
  const socketRef = useRef(null)

  const teardownSocket = useCallback(() => {
    if (!socketRef.current) return

    closeSocketConnection(socketRef.current)
    socketRef.current = null
    setSocket(null)
    setSocketId('')
  }, [])

  const initializeSocket = useCallback((userData, authToken) => {
    teardownSocket()

    const nextSocket = createSocketConnection(userData, {
      token: authToken,
      onConnect: () => {
        setIsOnline(true)
        setSocketId(nextSocket.id)
      },
      onDisconnect: () => {
        setIsOnline(false)
        setSocketId('')
      },
      onConnectError: (error) => {
        if (import.meta.env.DEV) {
          console.error('Socket connection error:', error)
        }
      },
    })

    socketRef.current = nextSocket
    setSocket(nextSocket)
    return nextSocket
  }, [teardownSocket])

  const syncAvailableUsers = useCallback(async () => {
    try {
      const users = await userApi.listDirectory()
      authService.saveAvailableUsers(users)
    } catch {
      authService.saveAvailableUsers([])
    }
  }, [])

  useEffect(() => {
    const bootstrapAuth = async () => {
      let savedToken = getStoredAuthToken()

      if (savedToken && isAuthTokenExpired(savedToken)) {
        clearStoredAuth()
        savedToken = ''
      }

      try {
        let result = await authApi.getCurrentUser()
        const hasSavedLoginState = Boolean(savedToken || authService.getCurrentUser())
        if (!result.user && hasSavedLoginState) {
          try {
            await authApi.refreshSession()
            result = await authApi.getCurrentUser()
          } catch {
            // Normal signed-out path continues below.
          }
        }
        const nextUser = result.user
        if (!nextUser) {
          clearStoredAuth()
          authService.logout()
          setUser(null)
          return
        }

        const nextToken = ''
        setStoredAuthToken('')
        setUser(nextUser)
        authService.saveUser(nextUser)
        await syncAvailableUsers()
        initializeSocket(nextUser, nextToken)
      } catch {
        if (!savedToken && getStoredAuthToken()) {
          return
        }

        clearStoredAuth()
        authService.logout()
        setUser(null)
      } finally {
        setLoading(false)
      }
    }

    bootstrapAuth()

    const handleOnline = () => setIsOnline(true)
    const handleOffline = () => setIsOnline(false)

    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)

    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
      teardownSocket()
    }
  }, [initializeSocket, syncAvailableUsers, teardownSocket])

  const login = async (username, password, role = 'user', options = {}) => {
    try {
      const result = await authApi.login(username, password, role, options)

      if (!result.success) {
        return { success: false, message: result.message }
      }

      setStoredAuthToken('')
      authService.saveUser(result.user)
      setUser(result.user)
      await syncAvailableUsers()
      teardownSocket()
      initializeSocket(result.user, '')
      auditClient.record('frontend.auth.login_success', {
        actorMode: result.user?.role === 'admin' || result.user?.role === 'super_admin' ? 'admin' : 'user',
        role: result.user?.role,
        actualRole: result.user?.actualRole,
        userId: result.user?.id,
      })
      return { success: true, user: result.user }
    } catch (error) {
      return {
        success: false,
        message: error.response?.data?.message || 'Login failed. Please try again.',
      }
    }
  }

  const logout = useCallback(async () => {
    if (user) {
      auditClient.record('frontend.auth.logout', {
        actorMode: user.role === 'admin' || user.role === 'super_admin' ? 'admin' : 'user',
        role: user.role,
        actualRole: user.actualRole,
        userId: user.id,
      })
    }
    teardownSocket()
    try {
      await authApi.logout()
    } catch {
      // Local logout must still complete if the session is already expired.
    }
    clearStoredAuth()
    authService.logout()
    setUser(null)
  }, [teardownSocket, user])

  const getSessions = useCallback(async () => {
    const result = await authApi.getSessions()
    return result.sessions || []
  }, [])

  const logoutSession = useCallback(async (sessionId) => {
    await authApi.logoutSession(sessionId)
  }, [])

  const logoutAllSessions = useCallback(async () => {
    teardownSocket()
    try {
      await authApi.logoutAllSessions()
    } finally {
      clearStoredAuth()
      authService.logout()
      setUser(null)
    }
  }, [teardownSocket])

  useEffect(() => {
    const handleUnauthorized = () => {
      teardownSocket()
      clearStoredAuth()
      authService.logout()
      setUser(null)
    }

    window.addEventListener(AUTH_UNAUTHORIZED_EVENT, handleUnauthorized)
    return () => window.removeEventListener(AUTH_UNAUTHORIZED_EVENT, handleUnauthorized)
  }, [teardownSocket])

  const updateUser = (updates) => {
    const updatedUser = { ...user, ...updates }
    setUser(updatedUser)
    authService.saveUser(updatedUser)
  }

  const value = {
    user,
    socket,
    socketId,
    isOnline,
    loading,
    login,
    logout,
    getSessions,
    logoutSession,
    logoutAllSessions,
    updateUser,
    isAuthenticated: !!user,
    isAdmin: user?.role === 'admin',
  }

  return (
    <AuthContext.Provider value={value}>
      {!loading && children}
    </AuthContext.Provider>
  )
}
