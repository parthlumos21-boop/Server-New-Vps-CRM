import React, { createContext, useContext, useEffect, useMemo, useState } from 'react'
import { authApi } from '../api/authApi'
import { clearTokens, getTokens, saveTokens } from './tokenStorage'

const AuthContext = createContext(null)

export const useAuth = () => {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used inside AuthProvider')
  }
  return context
}

export const AuthProvider = ({ children }) => {
  const [loading, setLoading] = useState(true)
  const [user, setUser] = useState(null)
  const [tokens, setTokens] = useState({ accessToken: '', refreshToken: '' })
  const [route, setRoute] = useState('login')

  useEffect(() => {
    const bootstrap = async () => {
      try {
        const storedTokens = await getTokens()
        if (!storedTokens.accessToken) return

        const result = await authApi.me(storedTokens.accessToken)
        if (result.user) {
          setTokens(storedTokens)
          setUser(result.user)
          setRoute(result.user.role === 'admin' || result.user.role === 'super_admin' ? 'admin' : 'users')
        }
      } catch {
        await clearTokens()
      } finally {
        setLoading(false)
      }
    }

    bootstrap()
  }, [])

  const login = async ({ username, password, role }) => {
    const result = await authApi.login({ username, password, role })
    const nextTokens = {
      accessToken: result.tokens?.accessToken || '',
      refreshToken: result.tokens?.refreshToken || '',
    }

    await saveTokens(nextTokens)
    setTokens(nextTokens)
    setUser(result.user)
    setRoute(result.user?.role === 'admin' || result.user?.role === 'super_admin' ? 'admin' : 'users')
    return result.user
  }

  const logout = async () => {
    try {
      await authApi.logout(tokens)
    } catch {
      // Device cleanup still needs to happen if the server session is already gone.
    }

    await clearTokens()
    setTokens({ accessToken: '', refreshToken: '' })
    setUser(null)
    setRoute('login')
  }

  const value = useMemo(() => ({
    loading,
    user,
    tokens,
    route,
    setRoute,
    login,
    logout,
  }), [loading, route, tokens, user])

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  )
}
