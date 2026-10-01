import React, { useState } from 'react'
import { FaEnvelope } from 'react-icons/fa'
import OutlookEmailComposerModal from './OutlookEmailComposerModal'
import './ContactIntegrationActions.css'

const ContactIntegrationActions = ({
  email = '',
  targetType = 'account',
  targetId = '',
  emailSubject = 'CRM Message',
  emailMessage = '',
  onStatus,
}) => {
  const [isModalOpen, setIsModalOpen] = useState(false)
  const cleanEmail = String(email || '').trim()

  const emitStatus = (type, message) => {
    if (onStatus) onStatus(type, message)
  }

  const handleOpenComposer = () => {
    if (!cleanEmail || !cleanEmail.includes('@')) {
      emitStatus('error', 'A valid email address is required.')
      return
    }
    setIsModalOpen(true)
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

      <OutlookEmailComposerModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        recipientEmail={cleanEmail}
        targetType={targetType}
        targetId={targetId}
        defaultSubject={emailSubject}
        defaultMessage={emailMessage}
        onSuccess={() => emitStatus('success', 'Email message sent successfully via Outlook!')}
      />
    </>
  )
}

export default ContactIntegrationActions
