import React, { useState } from 'react'
import { FaEnvelope } from 'react-icons/fa'
import integrationApi from '../../services/integrationApi'
import './ContactIntegrationActions.css'

const ContactIntegrationActions = ({
  email = '',
  targetType = 'account',
  targetId = '',
  emailSubject = 'CRM message',
  emailMessage = '',
  onStatus,
}) => {
  const [busyAction, setBusyAction] = useState('')
  const cleanEmail = String(email || '').trim()

  const emitStatus = (type, message) => {
    if (onStatus) onStatus(type, message)
  }

  const handleOutlook = async () => {
    if (!cleanEmail || !cleanEmail.includes('@')) {
      emitStatus('error', 'A valid email address is required.')
      return
    }

    setBusyAction('outlook')
    try {
      const result = await integrationApi.sendOutlookEmail({
        to: cleanEmail,
        subject: emailSubject,
        message: emailMessage,
        targetType,
        targetId,
      })
      emitStatus('success', result.status === 'sent' ? 'Email sent with Outlook.' : 'Email attempt logged.')
    } catch (error) {
      emitStatus('error', error?.response?.data?.message || 'Unable to send Outlook email.')
    } finally {
      setBusyAction('')
    }
  }

  return (
    <span className="contact-integration-actions">
      <button
        type="button"
        className="contact-integration-action contact-integration-action--outlook"
        onClick={handleOutlook}
        disabled={!cleanEmail || busyAction === 'outlook'}
        title="Send Email"
      >
        <FaEnvelope />
      </button>
    </span>
  )
}

export default ContactIntegrationActions
