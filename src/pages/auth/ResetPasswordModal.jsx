import React, { useEffect, useState } from 'react'
import { FiEye, FiEyeOff, FiX } from 'react-icons/fi'
import Button from '../../components/common/Button'
import { authApi } from '../../services/authApi'

const ResetPasswordModal = ({ open, loginValue = '', onClose }) => {
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showNewPassword, setShowNewPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')

  useEffect(() => {
    if (!open) return
    setNewPassword('')
    setConfirmPassword('')
    setShowNewPassword(false)
    setShowConfirmPassword(false)
    setSubmitting(false)
    setMessage('')
    setError('')
  }, [open])

  useEffect(() => {
    if (!open) return undefined
    const handleKeyDown = (event) => {
      if (event.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [onClose, open])

  if (!open) return null

  const validate = () => {
    const loginText = String(loginValue || '').trim()
    if (!loginText) return 'Enter your username or email on the login form first.'
    if (!newPassword || !confirmPassword) return 'New password and confirm password are required.'
    if (newPassword !== confirmPassword) return 'New password and confirm password must match.'
    if (newPassword.length < 8) return 'Password must be at least 8 characters.'
    return ''
  }

  const handleSubmit = async (event) => {
    event.preventDefault()
    setError('')
    setMessage('')

    const validationMessage = validate()
    if (validationMessage) {
      setError(validationMessage)
      return
    }

    setSubmitting(true)
    try {
      const response = await authApi.submitPasswordResetRequest({
        login: loginValue,
        newPassword,
        confirmPassword,
      })
      setMessage(response.message || 'Password reset request submitted for super admin approval.')
      setNewPassword('')
      setConfirmPassword('')
    } catch (requestError) {
      const responseMessage = requestError.response?.data?.message || ''
      setError(
        /authentication token|required/i.test(responseMessage)
          ? 'Password reset does not require sign in. Please refresh the page and try again.'
          : responseMessage || 'Unable to submit password reset request.'
      )
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="login-reset-overlay" role="presentation" onClick={onClose}>
      <div className="login-reset-modal" role="dialog" aria-modal="true" aria-labelledby="login-reset-title" onClick={(event) => event.stopPropagation()}>
        <div className="login-reset-header">
          <div>
            <h2 id="login-reset-title">Reset Password</h2>
            <p>{String(loginValue || '').trim() || 'Use the username or email entered on the login form.'}</p>
          </div>
          <button type="button" className="login-reset-close" onClick={onClose} aria-label="Close reset password">
            <FiX />
          </button>
        </div>

        <form className="login-reset-form" onSubmit={handleSubmit}>
          <label className="login-reset-field">
            <span>New Password</span>
            <div className="login-password-input-wrap">
              <input
                className="input-field login-password-input"
                type={showNewPassword ? 'text' : 'password'}
                value={newPassword}
                onChange={(event) => setNewPassword(event.target.value)}
                placeholder="Enter new password"
                required
              />
              <button
                type="button"
                className="login-password-toggle"
                onClick={() => setShowNewPassword((currentValue) => !currentValue)}
                aria-label={showNewPassword ? 'Hide new password' : 'Show new password'}
              >
                {showNewPassword ? <FiEyeOff /> : <FiEye />}
              </button>
            </div>
          </label>

          <label className="login-reset-field">
            <span>Confirm New Password</span>
            <div className="login-password-input-wrap">
              <input
                className="input-field login-password-input"
                type={showConfirmPassword ? 'text' : 'password'}
                value={confirmPassword}
                onChange={(event) => setConfirmPassword(event.target.value)}
                placeholder="Confirm new password"
                required
              />
              <button
                type="button"
                className="login-password-toggle"
                onClick={() => setShowConfirmPassword((currentValue) => !currentValue)}
                aria-label={showConfirmPassword ? 'Hide confirm password' : 'Show confirm password'}
              >
                {showConfirmPassword ? <FiEyeOff /> : <FiEye />}
              </button>
            </div>
          </label>

          {error ? <div className="login-error">{error}</div> : null}
          {message ? <div className="login-reset-success">{message}</div> : null}

          <div className="login-reset-actions">
            <Button type="button" variant="secondary" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" className="btn-red-theme" loading={submitting}>
              {submitting ? 'Submitting...' : 'Submit Request'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default ResetPasswordModal
