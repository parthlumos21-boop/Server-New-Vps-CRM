import React, { useState } from 'react'
import { FaEnvelope, FaLock, FaTimes, FaSpinner } from 'react-icons/fa'
import { integrationApi } from '../../services/integrationApi'
import { useData } from '../../context/DataContext'
import './Microsoft365ConnectModal.css'

const Microsoft365ConnectModal = ({ isOpen, onClose, onConnected }) => {
  const { addNotification } = useData()
  const [email, setEmail] = useState('')
  const [appPassword, setAppPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [showTroubleshoot, setShowTroubleshoot] = useState(false)
  
  if (!isOpen) return null

  const handleClose = () => {
    setEmail('')
    setAppPassword('')
    setShowTroubleshoot(false)
    onClose()
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!email.trim() || !appPassword.trim()) {
      addNotification('warning', 'Missing Details', 'Please enter your Microsoft 365 Email and App Password.')
      return
    }

    setLoading(true)
    try {
      await integrationApi.connectMicrosoft365({ email: email.trim(), appPassword: appPassword.trim() })
      addNotification('success', 'Legacy SMTP Connected', 'Microsoft 365 SMTP connected successfully.')
      if (onConnected) onConnected()
      handleClose()
    } catch (error) {
      addNotification('error', 'Legacy SMTP Connection Failed', error.response?.data?.message || 'Use Connect Outlook for normal Microsoft sign-in, or enter a Microsoft app password for SMTP.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="m365-modal-overlay" role="dialog" aria-modal="true">
      <div className="m365-modal-card">
        <div className="m365-modal-head">
          <div>
            <div className="m365-modal-kicker">INTEGRATIONS</div>
            <h2 className="m365-modal-title">Advanced (Legacy) SMTP</h2>
          </div>
          <button type="button" className="m365-modal-close" onClick={handleClose}>
            <FaTimes />
          </button>
        </div>

        <form className="m365-modal-body" onSubmit={handleSubmit} id="m365-connect-form">
          <div className="m365-modal-section">
            <p className="m365-modal-desc">
              Requires a Microsoft App Password. Normal Microsoft passwords are not supported.
            </p>
          </div>

          <div className="m365-modal-section">
            <label className="m365-modal-label" htmlFor="m365-email">Microsoft 365 Email</label>
            <div className="m365-modal-input-wrap">
              <FaEnvelope className="m365-modal-icon" />
              <input
                id="m365-email"
                type="email"
                className="m365-modal-input"
                placeholder="you@company.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoFocus
              />
            </div>
          </div>

          <div className="m365-modal-section">
            <label className="m365-modal-label" htmlFor="m365-password">App Password</label>
            <div className="m365-modal-input-wrap">
              <FaLock className="m365-modal-icon" />
              <input
                id="m365-password"
                type="password"
                className="m365-modal-input"
                placeholder="16-character app password"
                value={appPassword}
                onChange={(e) => setAppPassword(e.target.value)}
                required
              />
            </div>
          </div>

          <div className="m365-modal-section">
            <button
              type="button"
              className="m365-troubleshoot-toggle"
              onClick={() => setShowTroubleshoot(!showTroubleshoot)}
            >
              {showTroubleshoot ? 'Hide Troubleshooting' : 'Having trouble connecting?'}
            </button>
            {showTroubleshoot && (
              <div className="m365-troubleshoot-box">
                <h4>Troubleshooting connection issues</h4>
                <ul>
                  <li>
                    <strong>Recommended:</strong> Use Connect Outlook for Microsoft sign-in. CRM will save the encrypted OAuth token after Microsoft returns successfully.
                  </li>
                  <li>
                    <strong>Legacy SMTP fallback:</strong> Use a Microsoft app password, not the normal mailbox password. 
                    If it fails, your Microsoft 365 Admin must enable "Authenticated SMTP" for your mailbox in the 
                    <a href="https://admin.microsoft.com" target="_blank" rel="noopener noreferrer" style={{color: 'var(--color-primary)', textDecoration: 'underline', marginLeft: '4px'}}>
                      Microsoft 365 Admin Center
                    </a>.
                  </li>
                </ul>
              </div>
            )}
          </div>
        </form>

        <div className="m365-modal-foot">
          <div className="m365-foot-spacer" />
          <button type="button" className="m365-btn m365-btn-outline" onClick={handleClose}>Cancel</button>
          <button type="submit" form="m365-connect-form" className="m365-btn m365-btn-primary" disabled={loading}>
            {loading ? <><FaSpinner className="m365-spin" /> Verifying...</> : 'Connect Legacy SMTP'}
          </button>
        </div>
      </div>
    </div>
  )
}

export default Microsoft365ConnectModal
