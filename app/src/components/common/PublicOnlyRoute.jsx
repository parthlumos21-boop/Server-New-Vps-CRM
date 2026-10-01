import React from 'react'
import { Navigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { getDashboardRoute } from '../../utils/constants'

const PublicOnlyRoute = ({ children }) => {
  const { user } = useAuth()

  if (user) {
    return <Navigate to={getDashboardRoute(user.role)} replace />
  }

  return children
}

export default PublicOnlyRoute
