import React, { useState } from 'react'
import { Navigate, useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import Spinner from '../../components/common/Spinner'
import Button from '../../components/common/Button'
import './Login.css'

const Logout = () => {
  const { logout, isAuthenticated } = useAuth()
  const navigate = useNavigate()
  const [isLoggingOut, setIsLoggingOut] = useState(false)

  const handleLogout = async () => {
    setIsLoggingOut(true)
    await logout()
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />
  }

  if (isLoggingOut) {
    return <Spinner fullScreen text="Signing you out..." />
  }

  return (
    <div className="login-shell">
      <section className="logout-confirm-card">
        <h1 className="login-title">Are you sure logout?</h1>
        <div className="logout-confirm-actions">
          <Button type="button" variant="secondary" onClick={() => navigate(-1)}>
            Cancel
          </Button>
          <Button type="button" variant="primary" onClick={handleLogout}>
            Logout
          </Button>
        </div>
      </section>
    </div>
  )
}

export default Logout
