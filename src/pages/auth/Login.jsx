import React, { useMemo, useState, useEffect } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { FiArrowRight, FiEye, FiEyeOff, FiLock, FiShield, FiUser } from 'react-icons/fi'
import { useAuth } from '../../context/AuthContext'
import Button from '../../components/common/Button'
import Input from '../../components/common/Input'
import { setupApi } from '../../services/setupApi'
import { APP_VERSION, getDashboardRoute } from '../../utils/constants'
import swatiLogo from '../../assets/swati-logo.png'
import lumosLogo from '../../assets/lumos-logo.svg'
import ResetPasswordModal from './ResetPasswordModal'
import './Login.css'

const panelMotion = {
  duration: 0.6,
  ease: [0.22, 1, 0.36, 1],
}

const LUMOS_ONLY_USERS = [
  "sahana prasenjit",
  "kuldeep nayi",
  "manish patel",
  "vishal vandra",
  "amiha purohit",
  "vihal memaria",
  "jaydip chavda",
  "dhara",
  "demo"
]

const isLumosLoginValue = (value = '') => {
  const normalized = String(value).trim().toLowerCase()
  if (normalized === 'keval v shah' || normalized === 'keval@swatiswitchgears.com') {
    return false
  }
  return LUMOS_ONLY_USERS.includes(normalized) || 
         normalized.includes('@lumossolution.com') ||
         normalized.includes('@gmail.com')
}

const LoginBrandHeader = ({
  title = '',
  showLogoImage,
  setShowLogoImage,
  hideLogo = false,
  onLogoClick,
  logoHint = '',
  glowColor,
  logoSrc = swatiLogo,
  logoAlt = 'Swati Switchgears logo',
  fallbackText = 'SWATI',
  logoClassName = '',
  markClassName = '',
  forceShowHint = false,
}) => {
  const LogoWrapper = onLogoClick ? 'button' : 'div'
  const wrapperProps = onLogoClick ? {
    type: 'button',
    className: `login-brand-mark login-brand-mark--center login-brand-mark--button ${markClassName}`.trim(),
    onClick: onLogoClick,
    'aria-label': logoHint || 'Go back to options',
    title: logoHint || undefined
  } : {
    className: `login-brand-mark login-brand-mark--center ${markClassName}`.trim()
  }

  return (
    <div className="login-brand-heading">
      {!hideLogo && (
        <LogoWrapper {...wrapperProps}>
          {showLogoImage ? (
            <img
              src={logoSrc}
              alt={logoAlt}
              className={`login-brand-image ${logoClassName}`.trim()}
              onError={() => setShowLogoImage(false)}
            />
          ) : (
            <div className="login-brand-fallback">{fallbackText}</div>
          )}
          {logoHint ? <span className={`login-brand-hint ${forceShowHint ? 'login-brand-hint--force' : ''}`.trim()}>{logoHint}</span> : null}
        </LogoWrapper>
      )}
      <div className="login-brand-crm" style={glowColor ? { '--crm-glow-color': glowColor } : undefined}>CRM</div>
      {title ? <h1 className="login-brand-login-title">{title}</h1> : null}
    </div>
  )
}

const Login = () => {
  const location = useLocation()
  const navigate = useNavigate()
  const queryParams = useMemo(() => new URLSearchParams(location.search), [location.search])
  const [showAdminHint, setShowAdminHint] = useState(true)

  useEffect(() => {
    const timer = setTimeout(() => {
      setShowAdminHint(false)
    }, 60000)
    return () => clearTimeout(timer)
  }, [])
  
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', 'light')
  }, [])
  const [error, setError] = useState('')
  const [fieldErrors, setFieldErrors] = useState({})
  const [showPassword, setShowPassword] = useState(false)
  const [showLogoImage, setShowLogoImage] = useState(true)
  const [setupStatus, setSetupStatus] = useState(null)
  const [setupNotice, setSetupNotice] = useState('')
  const [resetPasswordOpen, setResetPasswordOpen] = useState(false)

  const { login, user } = useAuth()
  const isLumosLogo = isLumosLoginValue(username)
  const loginLogoSrc = isLumosLogo ? lumosLogo : swatiLogo
  const loginLogoAlt = isLumosLogo ? 'Lumos Solution logo' : 'Swati Switchgears logo'
  const loginLogoFallback = isLumosLogo ? 'LUMOS' : 'SWATI'

  useEffect(() => {
    setShowLogoImage(true)
  }, [loginLogoSrc])

  React.useEffect(() => {
    let isMounted = true

    document.documentElement.setAttribute('data-theme', 'light')

    const loadSetupStatus = async () => {
      try {
        const data = await setupApi.getPublicSetupStatus()
        if (!isMounted) return
        setSetupStatus(data)
        setSetupNotice('')
      } catch (requestError) {
        if (!isMounted) return
        setSetupStatus(null)
        setSetupNotice(
          requestError.response?.data?.message
            || 'Backend is not reachable. Start MongoDB and the server to enable login.'
        )
      }
    }

    loadSetupStatus()
    return () => {
      isMounted = false
    }
  }, [])

  React.useEffect(() => {
    if (!user) return
    navigate(getDashboardRoute(user.role), { replace: true })
  }, [navigate, user])

  React.useEffect(() => {
    const microsoftStatus = queryParams.get('microsoft')
    if (microsoftStatus !== 'failed') return

    setError(queryParams.get('message') || 'Microsoft login failed. Please use your CRM credentials or contact admin.')
  }, [queryParams])

  const isSetupBlocked = setupStatus && !setupStatus.ready

  const validateForm = (nextUsername = username, nextPassword = password) => {
    const nextErrors = {}
    const loginValue = String(nextUsername || '').trim()
    const passwordValue = String(nextPassword || '')

    if (!loginValue) {
      nextErrors.username = 'Email or username is required.'
    } else if (loginValue.includes('@')) {
      const emailDomain = loginValue.toLowerCase()
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(loginValue)) {
        nextErrors.username = 'Enter a valid email address.'
      } else if (!emailDomain.endsWith('@swatiswitchgears.com') && !emailDomain.endsWith('@lumossolution.com') && !emailDomain.endsWith('@support.com')) {
        nextErrors.username = 'Email must belong to @swatiswitchgears.com, @lumossolution.com, or @support.com domains.'
      }
    }

    if (!passwordValue) {
      nextErrors.password = 'Password is required.'
    } else if (passwordValue.length < 8) {
      nextErrors.password = 'Password must be at least 8 characters.'
    }

    return nextErrors
  }

  const handleUsernameChange = (event) => {
    const nextValue = event.target.value
    setUsername(nextValue)
    setFieldErrors(validateForm(nextValue, password))
  }

  const handlePasswordChange = (event) => {
    const nextValue = event.target.value
    setPassword(nextValue)
    setFieldErrors(validateForm(username, nextValue))
  }

  const navigateAfterLogin = (result) => {
    const loginUser = result?.user || {}
    const userRole = loginUser.role
    const normalizedUserName = String(loginUser.name || loginUser.username || loginUser.email || '').trim().toLowerCase()
    const isKevalVShah = normalizedUserName === 'keval v shah'
      || normalizedUserName === 'keval@swatiswitchgears.com'
    const fallbackRoute = getDashboardRoute(userRole)
    const fromLocation = location.state?.from
    const fromPath = [
      fromLocation?.pathname,
      fromLocation?.search,
      fromLocation?.hash,
    ].filter(Boolean).join('')
    const isAdminUser = userRole === 'admin' || userRole === 'super_admin'
    const canReturnToFromPath = fromLocation?.pathname
      && fromLocation.pathname !== '/login'
      && fromLocation.pathname !== '/admin/login'

    navigate(canReturnToFromPath ? fromPath : (isAdminUser && isKevalVShah ? '/admin/launchpad' : fallbackRoute), { replace: true })
  }

  const handleSubmit = async (event) => {
    event.preventDefault()
    setError('')
    const nextErrors = validateForm()
    setFieldErrors(nextErrors)
    if (Object.keys(nextErrors).length > 0) {
      return
    }
    setLoading(true)

    try {
      const result = await login(username, password, 'user', { rememberMe: false })
      if (result.success) {
        navigateAfterLogin(result)
      } else {
        setError(result.message || 'Login failed.')
      }
    } finally {
      setLoading(false)
    }
  }



  return (
    <div className="login-page-container">
      {/* Background Decorative Circles */}
      <div className="login-bg-shape login-bg-shape--top-right" />
      <div className="login-bg-shape login-bg-shape--mid-left" />
      <div className="login-bg-shape login-bg-shape--bottom" />

      {/* Desktop Bounding Box Card */}
      <motion.div
        className="login-desktop-card"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
      >
        {setupNotice ? (
          <div className="login-setup-banner login-setup-banner--warning">
            <strong>Setup Notice:</strong> {setupNotice}
          </div>
        ) : null}

        {isSetupBlocked ? (
          <div className="login-setup-card">
            <strong>Current login blocker</strong>
            <p>{setupStatus.lastError || 'MongoDB setup is incomplete.'}</p>
            <ul className="login-setup-list">
              {(setupStatus.nextSteps || []).map((step) => (
                <li key={step}>{step}</li>
              ))}
            </ul>
          </div>
        ) : null}

        {/* Brand Header */}
        <div className="login-card-header">
          <div className="login-logo-badge">
            {showLogoImage ? (
              <img
                src={loginLogoSrc}
                alt={loginLogoAlt}
                className="login-logo-img"
                onError={() => setShowLogoImage(false)}
              />
            ) : (
              <span className="login-logo-text">{loginLogoFallback}</span>
            )}
          </div>
          <h1 className="login-card-title">Sales CRM</h1>

          {/* Role Switcher Tabs */}
          <div className="login-role-tabs">
            <button
              type="button"
              className="login-role-tab login-role-tab--active"
            >
              User Login
            </button>
            <button
              type="button"
              className="login-role-tab"
              onClick={() => navigate('/admin/login')}
            >
              Admin Login
            </button>
          </div>
        </div>

        {/* Form */}
        <form className="login-card-form" onSubmit={handleSubmit}>
          {/* Username / Email Input */}
          <div className="login-pill-field-group">
            <div className={`login-pill-input-wrap ${fieldErrors.username ? 'login-pill-input-wrap--error' : ''}`}>
              <FiUser className="login-pill-icon-left" />
              <input
                type="text"
                className="login-pill-input"
                placeholder="Username or Email"
                value={username}
                onChange={handleUsernameChange}
                required
              />
            </div>
            {fieldErrors.username ? (
              <div className="login-field-error">{fieldErrors.username}</div>
            ) : null}
          </div>

          {/* Password Input */}
          <div className="login-pill-field-group">
            <div className={`login-pill-input-wrap ${fieldErrors.password ? 'login-pill-input-wrap--error' : ''}`}>
              <FiLock className="login-pill-icon-left" />
              <input
                type={showPassword ? 'text' : 'password'}
                className="login-pill-input"
                placeholder="Password"
                value={password}
                onChange={handlePasswordChange}
                required
              />
              <button
                type="button"
                className="login-pill-toggle-btn"
                onClick={() => setShowPassword((prev) => !prev)}
                aria-label={showPassword ? 'Hide password' : 'Show password'}
              >
                {showPassword ? <FiEyeOff /> : <FiEye />}
              </button>
            </div>
            {fieldErrors.password ? (
              <div className="login-field-error">{fieldErrors.password}</div>
            ) : null}
          </div>

          {error ? <div className="login-error-alert">{error}</div> : null}

          {/* Submit Button */}
          <button
            type="submit"
            className="login-pill-submit-btn"
            disabled={loading}
          >
            <span>{loading ? 'Signing in...' : 'Log In'}</span>
            {!loading && <FiArrowRight className="login-btn-arrow" />}
          </button>

          <div className="login-form-actions login-form-actions--center">
            <button
              type="button"
              className="login-reset-link"
              onClick={() => setResetPasswordOpen(true)}
            >
              Reset Password
            </button>
          </div>
        </form>
      </motion.div>

      <ResetPasswordModal
        open={resetPasswordOpen}
        loginValue={username}
        onClose={() => setResetPasswordOpen(false)}
      />
    </div>
  )
}

export default Login
