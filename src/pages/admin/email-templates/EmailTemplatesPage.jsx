import React, { useEffect, useRef, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { FaBold, FaEdit, FaEye, FaImage, FaItalic, FaListUl, FaPlus, FaSave, FaTrash, FaUnderline } from 'react-icons/fa'
import emailTemplateApi from '../../../services/emailTemplateApi'
import { DEFAULT_COMPANY_SIGNATURE } from '../../../constants/defaultSignature'
import './EmailTemplatesPage.css'

const EMPTY_FORM = {
  id: '',
  name: '',
  description: '',
  category: 'general',
  subject: '',
  bodyHtml: '',
  status: 'active',
  isDefault: false,
  signatureImage: null,
}

const CATEGORIES = ['general', 'account', 'deal']

const looksLikeHtml = (value) => /<\/?[a-z][\s\S]*>/i.test(String(value || ''))

const escapeHtml = (value) => String(value || '')
  .replace(/&/g, '&amp;')
  .replace(/</g, '&lt;')
  .replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;')
  .replace(/'/g, '&#39;')

const normalizeTextSpacing = (value) => String(value || '')
  .replace(/\r\n/g, '\n')
  .replace(/\r/g, '\n')
  .replace(/[ \t]+$/gm, '')
  .replace(/\n{3,}/g, '\n\n')
  .trim()

const htmlToPlainText = (value) => {
  const body = String(value || '')
  if (!body) return ''
  if (!looksLikeHtml(body)) return normalizeTextSpacing(body)
  const converted = body
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

const buildTemplateBodyHtml = (value) => {
  const raw = String(value || '').trim()
  if (!raw) return ''

  const hasFormattingTags = /<(b|strong|i|em|u|ul|ol|li)\b/i.test(raw)

  let cleanContent = ''
  if (hasFormattingTags) {
    let html = raw
      .replace(/<style[\s\S]*?<\/style>/gi, '')
      .replace(/<script[\s\S]*?<\/script>/gi, '')
      .replace(/<br\s*\/?>/gi, '\n')
      .replace(/<(div|p)[^>]*>\s*(?:<br\/?>|\s*)\s*<\/(div|p)>/gi, '\n\n')
      .replace(/<(div|p)[^>]*>/gi, '\n')
      .replace(/<\/(div|p)>/gi, '')
      .replace(/<(?!(\/?(b|strong|i|em|u|ul|ol|li|a)\b))[^>]+>/gi, '')
      .replace(/\r\n/g, '\n')
      .replace(/\r/g, '\n')
      .replace(/[ \t]+$/gm, '')
      .replace(/\n{3,}/g, '\n\n')
      .trim()

    const paragraphs = html.split(/\n\n+/)
    const pTags = paragraphs.map((p) => {
      const cleanP = p.trim()
      if (!cleanP) return ''
      if (cleanP.startsWith('<ul') || cleanP.startsWith('<ol')) {
        return cleanP
      }
      const lines = cleanP.split('\n')
      return `<p style="margin:0 0 12px 0;">${lines.join('<br/>')}</p>`
    }).filter(Boolean)

    cleanContent = pTags.join('')
  } else {
    const plainText = htmlToPlainText(raw)
    const paragraphs = plainText.split(/\n\n+/)
    const pTags = paragraphs.map((p) => {
      const cleanP = p.trim()
      if (!cleanP) return ''
      const lines = cleanP.split('\n').map((line) => escapeHtml(line))
      return `<p style="margin:0 0 12px 0;">${lines.join('<br/>')}</p>`
    }).filter(Boolean)

    cleanContent = pTags.join('')
  }

  return `<div style="font-family:Arial,sans-serif;font-size:14px;line-height:1.5;color:#111827;">${cleanContent}</div>`
}

const renderBodyPreview = (value) => {
  const body = String(value || '')
  if (!body) return <div className="email-template-preview-body">No body</div>
  return <div className="email-template-preview-html" dangerouslySetInnerHTML={{ __html: buildTemplateBodyHtml(body) }} />
}

const EmailTemplatesPage = () => {
  const navigate = useNavigate()
  const location = useLocation()
  const editorRef = useRef(null)
  const [templates, setTemplates] = useState([])
  const [form, setForm] = useState(EMPTY_FORM)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [uploadingSignature, setUploadingSignature] = useState(false)
  const [message, setMessage] = useState(null)

  const [companySignature, setCompanySignature] = useState(DEFAULT_COMPANY_SIGNATURE)

  const load = async () => {
    setLoading(true)
    try {
      const [templateList, settings] = await Promise.all([
        emailTemplateApi.list(),
        emailTemplateApi.settings().catch(() => null),
      ])
      setTemplates(Array.isArray(templateList) ? templateList : [])
      if (settings?.signature?.images && settings.signature.images.length > 0) {
        setCompanySignature(settings.signature.images[0])
      } else {
        setCompanySignature(DEFAULT_COMPANY_SIGNATURE)
      }
    } catch (error) {
      setMessage({ type: 'error', text: error?.response?.data?.message || 'Unable to load email templates.' })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
  }, [])

  useEffect(() => {
    if (editorRef.current && form.id && !editorRef.current.innerHTML) {
      editorRef.current.innerHTML = form.bodyHtml
    }
  }, [form.id])

  useEffect(() => {
    if (location.state?.template) {
      editTemplate(location.state.template)
      navigate(location.pathname, { replace: true, state: null })
    }
  }, [location.state, location.pathname, navigate])

  const updateField = (key, value) => {
    setForm((current) => ({ ...current, [key]: value }))
  }

  const updateEditorBody = () => {
    const rawContent = editorRef.current?.innerHTML || editorRef.current?.innerText || ''
    updateField('bodyHtml', rawContent)
  }

  const applyEditorCommand = (command) => {
    editorRef.current?.focus()
    document.execCommand(command, false, null)
    updateEditorBody()
  }

  const handleEditorPaste = (e) => {
    e.preventDefault()
    const text = (e.clipboardData || window.clipboardData)?.getData('text/plain') || ''
    document.execCommand('insertText', false, text)
    updateEditorBody()
  }

  const editTemplate = (template) => {
    const rawHtml = template.bodyHtml || ''
    setForm({
      id: template.id,
      name: template.name || '',
      description: template.description || '',
      category: template.category || 'general',
      subject: template.subject || '',
      bodyHtml: rawHtml,
      status: template.status || 'active',
      isDefault: Boolean(template.isDefault),
      signatureImage: template.signatureImage || null,
    })
    if (editorRef.current) {
      editorRef.current.innerHTML = rawHtml
    }
    setMessage(null)
  }

  const resetForm = () => {
    setForm(EMPTY_FORM)
    if (editorRef.current) {
      editorRef.current.innerHTML = ''
    }
    setMessage(null)
  }

  const saveTemplate = async (event) => {
    event.preventDefault()
    setSaving(true)
    setMessage(null)
    try {
      const payload = {
        ...form,
        bodyHtml: buildTemplateBodyHtml(form.bodyHtml),
      }
      let savedTemplate = null
      if (form.id) {
        savedTemplate = await emailTemplateApi.update(form.id, payload)
      } else {
        savedTemplate = await emailTemplateApi.create(payload)
      }
      setMessage({ type: 'success', text: 'Email template saved.' })
      if (savedTemplate?.id) editTemplate(savedTemplate)
      await load()
    } catch (error) {
      setMessage({ type: 'error', text: error?.response?.data?.message || 'Unable to save email template.' })
    } finally {
      setSaving(false)
    }
  }

  const toggleStatus = async (template) => {
    try {
      await emailTemplateApi.updateStatus(template.id, {
        status: template.status === 'active' ? 'inactive' : 'active',
      })
      await load()
    } catch (error) {
      setMessage({ type: 'error', text: error?.response?.data?.message || 'Unable to update status.' })
    }
  }

  const deleteTemplate = async (template) => {
    if (!window.confirm(`Delete "${template.name}"?`)) return
    try {
      await emailTemplateApi.remove(template.id)
      await load()
    } catch (error) {
      setMessage({ type: 'error', text: error?.response?.data?.message || 'Unable to delete template.' })
    }
  }

  const handleSignatureUpload = (event) => {
    const file = event.target.files?.[0]
    event.target.value = ''
    if (!file) return
    if (!file.type.startsWith('image/')) {
      setMessage({ type: 'error', text: 'Please upload an image file for the signature.' })
      return
    }

    const reader = new FileReader()
    reader.onload = async () => {
      setUploadingSignature(true)
      setMessage(null)
      try {
        const contentBytes = String(reader.result || '').split(',')[1] || ''
        const imagePayload = {
          fileName: file.name,
          name: file.name,
          contentType: file.type,
          size: file.size,
          contentBytes,
        }

        if (form.id) {
          const updatedTemplate = await emailTemplateApi.uploadSignatureImage({
            ...imagePayload,
            templateId: form.id,
          })
          editTemplate(updatedTemplate)
          await load()
          setMessage({ type: 'success', text: 'Template signature image saved.' })
        } else {
          try {
            await emailTemplateApi.uploadSignatureImage(imagePayload)
          } catch (_) {}
          setForm((current) => ({
            ...current,
            signatureImage: imagePayload,
          }))
          setCompanySignature(imagePayload)
          setMessage({ type: 'success', text: 'Company signature image saved and attached to new template.' })
        }
      } catch (error) {
        setMessage({ type: 'error', text: error?.response?.data?.message || 'Unable to upload signature image.' })
      } finally {
        setUploadingSignature(false)
      }
    }
    reader.readAsDataURL(file)
  }

  const signatureImage = form.signatureImage || companySignature || null

  return (
    <section className="email-templates-page">
      <header className="email-templates-header">
        <div>
          <span>Email</span>
          <h1>Email Templates</h1>
        </div>
        <button type="button" className="email-template-secondary" onClick={resetForm}>
          <FaPlus /> New Template
        </button>
      </header>

      {message ? <div className={`email-template-alert email-template-alert--${message.type}`}>{message.text}</div> : null}

      <div className="email-templates-layout">
        <form className="email-template-form" onSubmit={saveTemplate}>
          <div className="email-template-form-head">
            <h2>{form.id ? 'Edit Template' : 'Create Template'}</h2>
            <button type="submit" className="email-template-primary" disabled={saving}>
              <FaSave /> {saving ? 'Saving...' : 'Save'}
            </button>
          </div>

          <label>
            <span>Name</span>
            <input value={form.name} onChange={(event) => updateField('name', event.target.value)} required />
          </label>

          <label>
            <span>Description</span>
            <input value={form.description} onChange={(event) => updateField('description', event.target.value)} />
          </label>

          <div className="email-template-grid">
            <label>
              <span>Category</span>
              <select value={form.category} onChange={(event) => updateField('category', event.target.value)}>
                {CATEGORIES.map((category) => <option key={category} value={category}>{category}</option>)}
              </select>
            </label>

            <label>
              <span>Status</span>
              <select value={form.status} onChange={(event) => updateField('status', event.target.value)}>
                <option value="active">active</option>
                <option value="inactive">inactive</option>
              </select>
            </label>
          </div>

          <label className="email-template-checkbox">
            <input type="checkbox" checked={form.isDefault} onChange={(event) => updateField('isDefault', event.target.checked)} />
            <span>Set as default for this category</span>
          </label>

          <label>
            <span>Subject</span>
            <input value={form.subject} onChange={(event) => updateField('subject', event.target.value)} required />
          </label>

          <div className="email-template-editor-field">
            <span>HTML Body</span>
            <div className="email-template-editor-toolbar">
              <button type="button" onClick={() => applyEditorCommand('bold')} title="Bold"><FaBold /></button>
              <button type="button" onClick={() => applyEditorCommand('italic')} title="Italic"><FaItalic /></button>
              <button type="button" onClick={() => applyEditorCommand('underline')} title="Underline"><FaUnderline /></button>
              <button type="button" onClick={() => applyEditorCommand('insertUnorderedList')} title="List"><FaListUl /></button>
            </div>
            <div
              ref={editorRef}
              className="email-template-editor"
              contentEditable
              suppressContentEditableWarning
              onInput={updateEditorBody}
              onBlur={updateEditorBody}
              onPaste={handleEditorPaste}
            />
            <textarea className="email-template-generated-html" rows={6} value={buildTemplateBodyHtml(form.bodyHtml)} readOnly />
          </div>
          {signatureImage ? (
            <div className="email-template-body-signature-preview">
              <span>Signature image attached to this template</span>
              <img src={`data:${signatureImage.contentType};base64,${signatureImage.contentBytes}`} alt="Template signature" />
            </div>
          ) : null}

          <details className="email-template-preview">
            <summary><FaEye /> Preview</summary>
            <div className="email-template-preview-subject">{form.subject || 'No subject'}</div>
            {renderBodyPreview(form.bodyHtml)}
            {signatureImage ? (
              <div className="email-template-preview-signature">
                <img src={`data:${signatureImage.contentType};base64,${signatureImage.contentBytes}`} alt="Template signature" />
              </div>
            ) : null}
          </details>
        </form>

        <aside className="email-template-side">
          <div className="email-template-panel">
            <h2>Company Signature</h2>
            <p className="email-template-muted">Upload the company logo or signature image used with email templates.</p>
            {signatureImage ? (
              <div className="email-template-signature-preview">
                <img src={`data:${signatureImage.contentType};base64,${signatureImage.contentBytes}`} alt="Company signature" />
                <span>{signatureImage.fileName}</span>
              </div>
            ) : (
              <div className="email-template-empty">No signature image uploaded.</div>
            )}
            <label className="email-template-upload">
              <FaImage />
              <span>{uploadingSignature ? 'Uploading...' : 'Add Attachment'}</span>
              <input type="file" accept="image/*" onChange={handleSignatureUpload} disabled={uploadingSignature} />
            </label>
          </div>
        </aside>
      </div>

      <div className="email-template-list">
        <div className="email-template-list-head">
          <h2>Templates</h2>
          <button type="button" className="email-template-secondary" onClick={() => navigate('/admin/email-templates/all')}>
            View All
          </button>
        </div>
        {loading ? <div className="email-template-empty">Loading templates...</div> : null}
        {!loading && templates.length === 0 ? <div className="email-template-empty">No templates created yet.</div> : null}
        {templates.slice(0, 4).map((template) => (
          <div key={template.id} className="email-template-row">
            <div>
              <strong>{template.name}</strong>
              <span>{template.category} {template.isDefault ? 'default' : ''}</span>
              <p>{template.subject}</p>
            </div>
            <div className="email-template-row-actions">
              <button type="button" onClick={() => editTemplate(template)}><FaEdit /> Edit</button>
              <button type="button" onClick={() => toggleStatus(template)}>{template.status === 'active' ? 'Deactivate' : 'Activate'}</button>
              <button type="button" className="danger" onClick={() => deleteTemplate(template)}><FaTrash /> Delete</button>
            </div>
          </div>
        ))}
      </div>
    </section>
  )
}

export default EmailTemplatesPage
