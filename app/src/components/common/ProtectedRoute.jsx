import React from 'react'
import { Navigate, useLocation } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { getDashboardRoute } from '../../utils/constants'
import Spinner from './Spinner'

const ProtectedRoute = ({ children, requireAdmin = false, allowedRoles = null }) => {
  const { user, loading } = useAuth()
  const location = useLocation()

  if (loading) {
    return <Spinner fullScreen text="Loading..." />
  }

  if (!user) {
    return (
      <Navigate
        to="/login"
        state={{ from: location }}
        replace
      />
    )
  }

  const effectiveRoles = allowedRoles && allowedRoles.length > 0
    ? allowedRoles
    : (requireAdmin ? ['admin', 'super_admin'] : null)

  if (effectiveRoles && !effectiveRoles.includes(user.role)) {
    return <Navigate to={getDashboardRoute(user.role)} replace />
  }

  return children
}

export default ProtectedRoute
