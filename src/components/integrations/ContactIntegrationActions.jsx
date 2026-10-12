import React from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { FaEnvelope } from 'react-icons/fa'
import './ContactIntegrationActions.css'

const ContactIntegrationActions = ({
  email = '',
  targetType = 'account',
  targetId = '',
  emailSubject = 'CRM Message',
  emailMessage = '',
  onStatus,
}) => {
  const navigate = useNavigate()
  const location = useLocation()
  const cleanEmail = String(email || '').trim()

  const emitStatus = (type, message) => {
    if (onStatus) onStatus(type, message)
  }

  const handleOpenComposer = (event) => {
    event.preventDefault()
    event.stopPropagation()
    if (!cleanEmail || !cleanEmail.includes('@')) {
      emitStatus('error', 'A valid email address is required.')
      return
    }
    const isAdminRoute = location.pathname.startsWith('/admin')
    const basePath = isAdminRoute ? '/admin/email/compose' : '/email/compose'
    const entityType = String(targetType || 'account').trim() || 'account'
    const entityId = encodeURIComponent(String(targetId || '').trim() || 'new')
    const params = new URLSearchParams({
      to: cleanEmail,
      subject: emailSubject || 'CRM Message',
      message: emailMessage || '',
      returnTo: `${location.pathname}${location.search}`,
    })
    navigate(`${basePath}/${entityType}/${entityId}?${params.toString()}`)
  }

  return (
    <>
      <span className="contact-integration-actions">
        {cleanEmail ? (
          <button
            type="button"
            className="contact-integration-action contact-integration-action--outlook"
            onClick={handleOpenComposer}
            title="Compose Email via Outlook"
          >
            <FaEnvelope />
          </button>
        ) : null}
      </span>

    </>
  )
}

export default ContactIntegrationActions
