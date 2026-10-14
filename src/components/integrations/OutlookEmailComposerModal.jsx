import React, { useState } from 'react'
import { FaPaperclip, FaPaperPlane, FaTimes, FaEnvelope } from 'react-icons/fa'
import integrationApi from '../../services/integrationApi'
import emailTemplateApi from '../../services/emailTemplateApi'
import { DEFAULT_COMPANY_SIGNATURE } from '../../constants/defaultSignature'
import './OutlookEmailComposerModal.css'

const escapeHtml = (value) => String(value || '')
  .replace(/&/g, '&amp;')
  .replace(/</g, '&lt;')
  .replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;')
  .replace(/'/g, '&#39;')

const looksLikeHtml = (value) => /<\/?[a-z][\s\S]*>/i.test(String(value || ''))

const normalizeTextSpacing = (value) => String(value || '')
  .replace(/\r\n/g, '\n')
  .replace(/\r/g, '\n')
  .replace(/[ \t]+$/gm, '')
  .replace(/\n{3,}/g, '\n\n')
  .trim()

const htmlToPlainText = (value) => {
  const body = String(value || '')
  if (!body) return ''

  let str = body
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&amp;/gi, '&')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/&nbsp;/gi, ' ')

  if (!looksLikeHtml(str)) return normalizeTextSpacing(str)

  const converted = str
    .replace(/<style[\s\S]*?<\/style>/gi, '')
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<(div|p)[^>]*>\s*(?:<br\/?>|\s*)\s*<\/(div|p)>/gi, '\n\n')
    .replace(/<(div|p|tr|h[1-6])[^>]*>/gi, '\n')
    .replace(/<\/(div|p|tr|h[1-6])>/gi, '')
    .replace(/<li[^>]*>/gi, '- ')
    .replace(/<\/li>/gi, '\n')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")

  return normalizeTextSpacing(converted)
}

const buildBodyHtml = (value) => {
  const plainText = htmlToPlainText(value)
  if (!plainText) return ''
  const paragraphs = plainText.split(/\n\n+/)
  const pTags = paragraphs.map((p) => {
    const cleanP = p.trim()
    if (!cleanP) return ''
    const lines = cleanP.split('\n').map((line) => escapeHtml(line))
    return `<p style="margin:0 0 12px 0;font-family:Arial,sans-serif;font-size:14px;line-height:1.5;color:#111827;">${lines.join('<br/>')}</p>`
  }).filter(Boolean)

  return `<div style="font-family:Arial,sans-serif;font-size:14px;line-height:1.5;color:#111827;">${pTags.join('')}</div>`
}

const CRM_DOMAIN = 'https://swaticrm.com'

const resolveCompanyLinkUrl = () => {
  if (typeof window === 'undefined') return 'https://swaticrm.com'
  const isLocal = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
  return isLocal ? window.location.origin : 'https://swaticrm.com'
}

const getPublicSignatureUrl = (templateId) => {
  const isLocal = typeof window !== 'undefined' &&
    (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1')
  const baseDomain = isLocal ? CRM_DOMAIN : (window.location.origin || CRM_DOMAIN)
  return templateId
    ? `${baseDomain}/api/email-templates/public/signature-image/${templateId}`
    : `${baseDomain}/api/email-templates/public/signature-image`
}

const buildSignatureHtml = (signatureImage, srcUrl) => {
  if (!signatureImage || !srcUrl) return ''
  const companyUrl = resolveCompanyLinkUrl()
  return `<div style="margin-top:16px;"><a href="${companyUrl}" target="_blank" rel="noopener noreferrer" style="display:inline-block;text-decoration:none;border:0;outline:none;"><img src="${escapeHtml(srcUrl)}" alt="Email Signature" style="max-width:560px;width:100%;height:auto;display:block;border:0;" /></a></div>`
}

const buildEmailHtml = (message, signatureImage, signatureSrc) => (
  `${buildBodyHtml(message || '')}${buildSignatureHtml(signatureImage, signatureSrc)}`
)

const renderComposerPreview = (value, signatureImage) => {
  const hasBody = Boolean(String(value || ''))
  const sig = signatureImage || DEFAULT_COMPANY_SIGNATURE
  const previewSrc = sig && sig.contentBytes
    ? `data:${sig.contentType || 'image/png'};base64,${sig.contentBytes}`
    : ''
  const previewHtml = buildEmailHtml(value, sig, previewSrc)
  if (!hasBody && !sig) return <div className="oec-message-preview-text">No message body</div>
  return <div className="oec-message-preview-html" dangerouslySetInnerHTML={{ __html: previewHtml }} />
}

const OutlookEmailComposerModal = ({
  isOpen,
  onClose,
  recipientEmail = '',
  targetType = 'account',
  targetId = '',
  defaultSubject = 'CRM Message',
  defaultMessage = '',
  onSuccess,
  pageMode = false,
}) => {
  const [to, setTo] = useState(recipientEmail)
  const [subject, setSubject] = useState(defaultSubject)
  const [message, setMessage] = useState(() => htmlToPlainText(defaultMessage))
  const [attachments, setAttachments] = useState([])
  const [templates, setTemplates] = useState([])
  const [selectedTemplateId, setSelectedTemplateId] = useState('')
  const [selectedTemplate, setSelectedTemplate] = useState(null)
  const [signatureImage, setSignatureImage] = useState(DEFAULT_COMPANY_SIGNATURE)
  const [isLoadingTemplates, setIsLoadingTemplates] = useState(false)
  const [isSending, setIsSending] = useState(false)
  const [statusMessage, setStatusMessage] = useState(null)

  React.useEffect(() => {
    setTo(recipientEmail)
  }, [recipientEmail])

  React.useEffect(() => {
    if (defaultMessage) {
      setMessage(htmlToPlainText(defaultMessage))
    }
  }, [defaultMessage])

  React.useEffect(() => {
    if (!isOpen) return
    let alive = true
    setIsLoadingTemplates(true)
    emailTemplateApi.available({ category: targetType || 'general' })
      .then((list) => {
        if (!alive) return
        const nextTemplates = Array.isArray(list) ? list : []
        setTemplates(nextTemplates)
        const defaultTemplate = nextTemplates.find((template) => template.isDefault) || nextTemplates[0] || null
        if (defaultTemplate) {
          setSelectedTemplateId(defaultTemplate.id)
          setSelectedTemplate(defaultTemplate)
          return emailTemplateApi.resolve({
            templateId: defaultTemplate.id,
            entityType: targetType,
            entityId: targetId,
          })
        }
        setSelectedTemplateId('')
        setSelectedTemplate(null)
        setSignatureImage(DEFAULT_COMPANY_SIGNATURE)
        return null
      })
      .then(async (resolved) => {
        if (!alive) return
        if (resolved) {
          setSubject(resolved.subject || defaultSubject)
          setMessage(htmlToPlainText(resolved.bodyHtml || defaultMessage))
          let sig = resolved.signatureImage || null
          if (!sig) {
            try {
              const settings = await emailTemplateApi.settings()
              if (settings?.signature?.images && settings.signature.images.length > 0) {
                sig = settings.signature.images[0]
              }
            } catch (_) {}
          }
          if (alive) setSignatureImage(sig || DEFAULT_COMPANY_SIGNATURE)
        } else {
          try {
            const settings = await emailTemplateApi.settings()
            if (alive && settings?.signature?.images && settings.signature.images.length > 0) {
              setSignatureImage(settings.signature.images[0])
            } else if (alive) {
              setSignatureImage(DEFAULT_COMPANY_SIGNATURE)
            }
          } catch (_) {
            if (alive) setSignatureImage(DEFAULT_COMPANY_SIGNATURE)
          }
        }
      })
      .catch(() => {
        if (alive) setTemplates([])
      })
      .finally(() => {
        if (alive) setIsLoadingTemplates(false)
      })

    return () => {
      alive = false
    }
  }, [isOpen, targetType, targetId, defaultSubject, defaultMessage])

  const handleTemplateChange = async (templateId) => {
    setSelectedTemplateId(templateId)
    const template = templates.find((entry) => entry.id === templateId) || null
    setSelectedTemplate(template)
    if (!templateId) {
      try {
        const settings = await emailTemplateApi.settings()
        if (settings?.signature?.images && settings.signature.images.length > 0) {
          setSignatureImage(settings.signature.images[0])
          return
        }
      } catch (_) {}
      setSignatureImage(DEFAULT_COMPANY_SIGNATURE)
      return
    }
    setIsLoadingTemplates(true)
    setStatusMessage(null)
    try {
      const resolved = await emailTemplateApi.resolve({
        templateId,
        entityType: targetType,
        entityId: targetId,
      })
      setSubject(resolved.subject || '')
      setMessage(htmlToPlainText(resolved.bodyHtml || ''))
      let sig = resolved.signatureImage || null
      if (!sig) {
        try {
          const settings = await emailTemplateApi.settings()
          if (settings?.signature?.images && settings.signature.images.length > 0) {
            sig = settings.signature.images[0]
          }
        } catch (_) {}
      }
      setSignatureImage(sig || DEFAULT_COMPANY_SIGNATURE)
    } catch (error) {
      setStatusMessage({ type: 'error', text: error?.response?.data?.message || 'Unable to apply selected template.' })
    } finally {
      setIsLoadingTemplates(false)
    }
  }

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
      const inlineImage = signatureImage || DEFAULT_COMPANY_SIGNATURE

      const outgoingMessage = buildEmailHtml(
        message || '',
        inlineImage,
        'cid:email-signature-img'
      )
      const outgoingAttachments = attachments.map((att) => ({
        name: att.name,
        contentType: att.contentType,
        contentBytes: String(att.contentBytes || '').replace(/^data:[^;]+;base64,/, ''),
        isInline: false,
      }))

      if (inlineImage && inlineImage.contentBytes) {
        outgoingAttachments.push({
          name: 'email-signature-img',
          contentType: inlineImage.contentType || 'image/png',
          contentBytes: String(inlineImage.contentBytes).replace(/^data:[^;]+;base64,/, ''),
          isInline: true,
          contentId: 'email-signature-img',
        })
      }

      const payload = {
        to: cleanTo,
        subject,
        message: outgoingMessage,
        attachments: outgoingAttachments,
        targetType,
        targetId,
        isHtml: true,
        templateId: selectedTemplate?.id || '',
        templateName: selectedTemplate?.name || '',
        templateSubject: selectedTemplate?.subject || '',
        templateBodyHtml: selectedTemplate?.bodyHtml || '',
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
    <div className={pageMode ? 'oec-page-shell' : 'oec-backdrop'} onClick={pageMode ? undefined : onClose}>
      <div className={pageMode ? 'oec-page-card' : 'oec-modal'} onClick={(e) => e.stopPropagation()}>
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
            <label className="oec-label">Template:</label>
            <select
              className="oec-input"
              value={selectedTemplateId}
              onChange={(e) => handleTemplateChange(e.target.value)}
              disabled={isLoadingTemplates}
            >
              <option value="">{isLoadingTemplates ? 'Loading templates...' : 'No template'}</option>
              {templates.map((template) => (
                <option key={template.id} value={template.id}>
                  {template.name}{template.isDefault ? ' (Default)' : ''}
                </option>
              ))}
            </select>
          </div>

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

          <div className="oec-message-preview">
            <span className="oec-signature-title">Preview</span>
            {renderComposerPreview(message, signatureImage)}
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
