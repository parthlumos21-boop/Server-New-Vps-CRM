import React, { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import Button from '../../components/common/Button'
import Input from '../../components/common/Input'
import apiClient from '../../services/apiClient'
import { APP_NAME } from '../../utils/constants'
import swatiLogo from '../../assets/swati-logo.png'
import './Login.css'

const panelMotion = {
  duration: 0.6,
  ease: [0.22, 1, 0.36, 1],
}

const Register = () => {
  const navigate = useNavigate()

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', 'dark')
  }, [])
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [showLogoImage, setShowLogoImage] = useState(true)

  React.useEffect(() => {
    document.documentElement.setAttribute('data-theme', 'dark')
  }, [])

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')

    if (!name.trim() || !email.trim() || !password) {
      setError('All fields are required.')
      return
    }

    if (password.length < 6) {
      setError('Password must be at least 6 characters.')
      return
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match.')
      return
    }

    setLoading(true)
    try {
      await apiClient.post('/auth/register', {
        name: name.trim(),
        email: email.trim(),
        password,
      })
      navigate('/login?pending=1', { replace: true })
    } catch (err) {
      const message = err?.response?.data?.message
        || err?.message
        || 'Registration failed. Please try again.'
      setError(message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="login-page">
      <div className="login-layout login-layout--register">
        <motion.section
          className="login-panel login-panel--intro"
          initial={{ opacity: 0, x: -24 }}
          animate={{ opacity: 1, x: 0 }}
          transition={panelMotion}
        >
          <div className="login-brand-mark login-brand-mark--left">
            {showLogoImage ? (
              <img
                src={swatiLogo}
                alt={`${APP_NAME} logo`}
                className="login-brand-image"
                onError={() => setShowLogoImage(false)}
              />
            ) : (
              <div className="login-brand-fallback">{APP_NAME}</div>
            )}
          </div>

          <span className="login-kicker">{APP_NAME} Account Request</span>
          <h1 className="login-title">Create your account</h1>
          <p className="login-subtitle">
            New accounts require administrator approval before login.
          </p>
        </motion.section>

        <motion.section
          className="login-panel login-panel--form"
          initial={{ opacity: 0, x: 24 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ ...panelMotion, delay: 0.08 }}
        >
          <div className="login-form-header">
            <h2>Register</h2>
            <p>New accounts require administrator approval before login.</p>
          </div>

          <form className="login-form" onSubmit={handleSubmit}>
            <Input
              label="Full Name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Enter your full name"
              fullWidth
              required
            />

            <Input
              label="Email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Enter your email"
              fullWidth
              required
            />

            <Input
              label="Password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Choose a password (min 6 characters)"
              fullWidth
              required
            />

            <Input
              label="Confirm Password"
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="Re-enter your password"
              fullWidth
              required
            />

            {error && <div className="login-error">{error}</div>}

            <Button
              type="submit"
              variant="primary"
              size="large"
              fullWidth
              loading={loading}
            >
              {loading ? 'Submitting...' : 'Register'}
            </Button>
          </form>

          <div className="login-footer">
            <p>
              Already have an account? <Link to="/login">Sign in</Link>
            </p>
          </div>
        </motion.section>
      </div>
    </div>
  )
}

export default Register
