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
import './Login.css'

const panelMotion = {
  duration: 0.6,
  ease: [0.22, 1, 0.36, 1],
}

const LoginBrandHeader = ({ title = '', showLogoImage, setShowLogoImage, hideLogo = false, onLogoClick, glowColor }) => {
  const LogoWrapper = onLogoClick ? 'button' : 'div'
  const wrapperProps = onLogoClick ? {
    type: 'button',
    className: 'login-brand-mark login-brand-mark--center login-brand-mark--button',
    onClick: onLogoClick,
    'aria-label': 'Go back to options'
  } : {
    className: 'login-brand-mark login-brand-mark--center'
  }

  return (
    <div className="login-brand-heading">
      {!hideLogo && (
        <LogoWrapper {...wrapperProps}>
          {showLogoImage ? (
            <img
              src={swatiLogo}
              alt="Swati Switchgears logo"
              className="login-brand-image"
              onError={() => setShowLogoImage(false)}
            />
          ) : (
            <div className="login-brand-fallback">SWATI</div>
          )}
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

  const { login, user } = useAuth()

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
    } else if (loginValue.includes('@') && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(loginValue)) {
      nextErrors.username = 'Enter a valid email address.'
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
    <div className="login-shell login-shell--single">
      <div className="login-layout login-layout--single">
        <motion.section
          className="login-panel login-panel--form"
          initial={{ opacity: 0, x: 24 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ ...panelMotion, delay: 0.08 }}
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

          <div className="login-form-header">
            <LoginBrandHeader
              showLogoImage={showLogoImage}
              setShowLogoImage={setShowLogoImage}
              onLogoClick={() => navigate('/admin/login')}
              glowColor={setupStatus?.loginBrandGlowColor}
            />
            <h2>User Login</h2>
          </div>

          <form className="login-form" onSubmit={handleSubmit}>
            <Input
              label="Username / Email"
              type="text"
              value={username}
              onChange={handleUsernameChange}
              placeholder="Enter username or email"
              fullWidth
              required
            />
            {fieldErrors.username ? <div className="login-field-error">{fieldErrors.username}</div> : null}

            <div className="login-password-field input-wrapper input-full-width">
              <label className="input-label" htmlFor="login-password-input">Password</label>
              <div className="login-password-input-wrap">
                <input
                  id="login-password-input"
                  className="input-field login-password-input"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={handlePasswordChange}
                  placeholder="Enter your password"
                  required
                />
                <button
                  type="button"
                  className="login-password-toggle"
                  onClick={() => setShowPassword((currentValue) => !currentValue)}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                  aria-pressed={showPassword}
                >
                  {showPassword ? <FiEyeOff /> : <FiEye />}
                </button>
              </div>
            </div>
            {fieldErrors.password ? <div className="login-field-error">{fieldErrors.password}</div> : null}

            {error ? <div className="login-error">{error}</div> : null}

            <Button
              type="submit"
              variant="primary"
              size="large"
              fullWidth
              loading={loading}
            >
              {loading ? 'Signing in...' : 'Sign In'}
            </Button>
          </form>

          <div className="login-footer">
            <p className="login-footer-note">
              Version {APP_VERSION} - Copyright {new Date().getFullYear()}. Need an account? Contact your administrator.
            </p>
          </div>
        </motion.section>
      </div>
    </div>
  )
}

export default Login
