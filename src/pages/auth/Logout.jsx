import React, { useState } from 'react'
import { Navigate, useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { FiShield, FiUser } from 'react-icons/fi'
import { useAuth } from '../../context/AuthContext'
import Spinner from '../../components/common/Spinner'
import './Login.css'

const Logout = () => {
  const { user, logout, isAuthenticated, isAdmin } = useAuth()
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

  const isUserAdmin = isAdmin || user?.role === 'admin' || user?.role === 'super_admin'
  const displayName = user?.name || user?.username || (isUserAdmin ? 'Administrator' : 'Sales User')
  const initials = displayName
    .split(' ')
    .filter(Boolean)
    .map((word) => word[0])
    .join('')
    .substring(0, 2)
    .toUpperCase() || 'U'

  return (
    <div className={`logout-shell ${isUserAdmin ? 'logout-shell--admin' : 'logout-shell--user'}`}>
      <motion.div
        className={`logout-card-container ${isUserAdmin ? 'logout-card-container--admin' : 'logout-card-container--user'}`}
        initial={{ opacity: 0, scale: 0.92, y: 14 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
      >
        {/* User Avatar & Role Badge */}
        <div className="logout-avatar-wrapper">
          <div className={`logout-avatar-ring ${isUserAdmin ? '' : 'logout-avatar-ring--user'}`}>
            <div className={`logout-avatar-inner ${isUserAdmin ? '' : 'logout-avatar-inner--user'}`}>
              {user?.avatar ? (
                <img src={user.avatar} alt={displayName} className="logout-avatar-img" />
              ) : (
                <span>{initials}</span>
              )}
            </div>
          </div>
          <div className={`logout-role-badge ${isUserAdmin ? 'logout-role-badge--admin' : 'logout-role-badge--user'}`}>
            {isUserAdmin ? <FiShield size={12} /> : <FiUser size={12} />}
            <span>{isUserAdmin ? 'ADMIN' : 'USER'}</span>
          </div>
        </div>

        {/* User Identity & Question */}
        <div className="logout-title-group">
          <h2 className="logout-user-name">{displayName}</h2>
          <h3 className="logout-main-heading">Are you sure logout?</h3>
        </div>

        {/* Action Buttons */}
        <div className="logout-card-actions">
          <button
            type="button"
            className="logout-btn-stay"
            onClick={() => navigate(-1)}
          >
            Cancel
          </button>
          <button
            type="button"
            className={`logout-btn-confirm ${isUserAdmin ? '' : 'logout-btn-confirm--user'}`}
            onClick={handleLogout}
          >
            Logout
          </button>
        </div>
      </motion.div>
    </div>
  )
}

export default Logout

