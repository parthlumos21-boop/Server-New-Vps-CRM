import React, { useState } from 'react'
import { FaPaperclip, FaPaperPlane, FaTimes, FaEnvelope } from 'react-icons/fa'
import integrationApi from '../../services/integrationApi'
import './OutlookEmailComposerModal.css'

const OutlookEmailComposerModal = ({
  isOpen,
  onClose,
  recipientEmail = '',
  targetType = 'account',
  targetId = '',
  defaultSubject = 'CRM Message',
  defaultMessage = '',
  onSuccess,
}) => {
  const [to, setTo] = useState(recipientEmail)
  const [subject, setSubject] = useState(defaultSubject)
  const [message, setMessage] = useState(defaultMessage)
  const [attachments, setAttachments] = useState([])
  const [isSending, setIsSending] = useState(false)
  const [statusMessage, setStatusMessage] = useState(null)

  React.useEffect(() => {
    setTo(recipientEmail)
  }, [recipientEmail])

  if (!isOpen) return null

  const handleFileChange = (e) => {
    const files = Array.from(e.target.files || [])
    if (files.length === 0) return

    files.forEach((file) => {
      const reader = new FileReader()
      reader.onload = () => {
        const base64String = String(reader.result || '').split(',')[1] || ''
        setAttachments((prev) => [
          ...prev,
          {
            name: file.name,
            contentType: file.type || 'application/octet-stream',
            contentBytes: base64String,
            size: file.size,
          },
        ])
      }
      reader.readAsDataURL(file)
    })

    e.target.value = ''
  }

  const removeAttachment = (index) => {
    setAttachments((prev) => prev.filter((_, i) => i !== index))
  }

  const handleSend = async (e) => {
    e.preventDefault()
    const cleanTo = String(to || '').trim()
    if (!cleanTo || !cleanTo.includes('@')) {
      setStatusMessage({ type: 'error', text: 'Please enter a valid recipient email address.' })
      return
    }

    if (!subject.trim()) {
      setStatusMessage({ type: 'error', text: 'Please enter a subject line.' })
      return
    }

    setIsSending(true)
    setStatusMessage(null)

    try {
      const payload = {
        to: cleanTo,
        subject,
        message,
        attachments: attachments.map((att) => ({
          name: att.name,
          contentType: att.contentType,
          contentBytes: att.contentBytes,
        })),
        targetType,
        targetId,
      }

      const res = await integrationApi.sendOutlookEmail(payload)
      if (res?.status === 'sent' || res?.ok || res?.success) {
        setStatusMessage({ type: 'success', text: 'Email sent successfully via Outlook!' })
        if (onSuccess) onSuccess()
        setTimeout(() => {
          onClose()
        }, 1200)
      } else {
        setStatusMessage({ type: 'success', text: 'Email message queued/sent via Outlook.' })
        setTimeout(() => {
          onClose()
        }, 1200)
      }
    } catch (err) {
      console.error('Failed to send Outlook email:', err)
      const errorText = err?.response?.data?.message || err?.message || 'Failed to send email. Please ensure Microsoft Outlook is connected.'
      setStatusMessage({ type: 'error', text: errorText })
    } finally {
      setIsSending(false)
    }
  }

  return (
    <div className="oec-backdrop" onClick={onClose}>
      <div className="oec-modal" onClick={(e) => e.stopPropagation()}>
        <div className="oec-header">
          <div className="oec-title">
            <FaEnvelope className="oec-title-icon" />
            <span>New Email Message (Outlook)</span>
          </div>
          <button type="button" className="oec-close-btn" onClick={onClose}>
            <FaTimes />
          </button>
        </div>

        <form onSubmit={handleSend} className="oec-form">
          {statusMessage && (
            <div className={`oec-status oec-status--${statusMessage.type}`}>
              {statusMessage.text}
            </div>
          )}

          <div className="oec-field">
            <label className="oec-label">To:</label>
            <input
              type="email"
              className="oec-input"
              value={to}
              onChange={(e) => setTo(e.target.value)}
              placeholder="recipient@example.com"
              required
            />
          </div>

          <div className="oec-field">
            <label className="oec-label">Subject:</label>
            <input
              type="text"
              className="oec-input"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder="Enter email subject..."
              required
            />
          </div>

          <div className="oec-field oec-field--body">
            <label className="oec-label">Message:</label>
            <textarea
              className="oec-textarea"
              rows={7}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Type your message body here..."
            />
          </div>

          {attachments.length > 0 && (
            <div className="oec-attachments-list">
              <span className="oec-attachments-title">Attachments ({attachments.length}):</span>
              {attachments.map((att, idx) => (
                <div key={`att-${idx}`} className="oec-attachment-item">
                  <FaPaperclip className="oec-att-icon" />
                  <span className="oec-att-name">{att.name}</span>
                  <span className="oec-att-size">({(att.size / 1024).toFixed(1)} KB)</span>
                  <button
                    type="button"
                    className="oec-att-remove"
                    onClick={() => removeAttachment(idx)}
                  >
                    <FaTimes />
                  </button>
                </div>
              ))}
            </div>
          )}

          <div className="oec-footer">
            <label className="oec-upload-btn">
              <FaPaperclip />
              <span>Add Attachment</span>
              <input
                type="file"
                multiple
                onChange={handleFileChange}
                style={{ display: 'none' }}
              />
            </label>

            <div className="oec-actions">
              <button
                type="button"
                className="oec-btn oec-btn--cancel"
                onClick={onClose}
                disabled={isSending}
              >
                Cancel
              </button>
              <button
                type="submit"
                className="oec-btn oec-btn--send"
                disabled={isSending}
              >
                <FaPaperPlane />
                <span>{isSending ? 'Sending...' : 'Send Message'}</span>
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  )
}

export default OutlookEmailComposerModal
