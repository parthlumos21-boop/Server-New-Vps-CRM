import React, { useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { FaCheckCircle, FaTimes } from 'react-icons/fa'
import { useData } from '../../context/DataContext'
import { useAuth } from '../../context/AuthContext'
import '../admin/support-requests/AddSupportRequest.css'

const TICKET_TYPE_OPTIONS = [
  { value: '', label: 'Select' },
  { value: 'general', label: 'General' },
  { value: 'user-permissions', label: 'User Permissions' },
  { value: 'reports', label: 'Reports' },
  { value: 'integrations', label: 'Integrations' },
  { value: 'additional-user-logins', label: 'Additional User Logins' },
  { value: 'billing', label: 'Billing' },
  { value: 'other', label: 'Other' },
]

const AddTicketPage = ({ basePath = '/tickets' }) => {
  const navigate = useNavigate()
  const { user } = useAuth()
  const { addNotification, createSupportRequest } = useData()
  const fileInputRef = useRef(null)
  const [saving, setSaving] = useState(false)
  const [errors, setErrors] = useState({})
  const [selectedFiles, setSelectedFiles] = useState([])
  const [formData, setFormData] = useState({
    requestType: '',
    title: '',
    description: '',
  })

  const attachmentSummary = useMemo(
    () => selectedFiles.map((file) => file.name).join(', '),
    [selectedFiles]
  )

  const handleChange = (field, value) => {
    setFormData((currentValue) => ({ ...currentValue, [field]: value }))
    if (errors[field]) {
      setErrors((currentErrors) => {
        const nextErrors = { ...currentErrors }
        delete nextErrors[field]
        return nextErrors
      })
    }
  }

  const handleFileSelection = (event) => {
    setSelectedFiles(Array.from(event.target.files || []))
  }

  const validate = () => {
    const nextErrors = {}

    if (!formData.requestType) {
      nextErrors.requestType = 'Please select CRM Support Related To.'
    }

    if (!formData.title.trim()) {
      nextErrors.title = 'Subject is required.'
    }

    if (!formData.description.trim()) {
      nextErrors.description = 'Description is required.'
    }

    setErrors(nextErrors)
    return Object.keys(nextErrors).length === 0
  }

  const handleSubmit = async (event) => {
    event.preventDefault()

    if (!validate()) {
      addNotification('error', 'Required Fields', 'Please complete all required fields.')
      return
    }

    setSaving(true)

    const result = await createSupportRequest({
      requestType: formData.requestType,
      title: formData.title.trim(),
      description: formData.description.trim(),
      status: 'open',
      customerName: user?.name || 'CRM Support',
      customerEmail: user?.email || '',
      contactPerson: user?.name || '',
      ownerId: user?.id || '',
      ownerName: user?.name || user?.username || '',
      attachmentNames: selectedFiles.map((file) => file.name),
      notes: attachmentSummary,
    })

    setSaving(false)

    if (!result.success) {
      addNotification('error', 'Send Failed', result.message || 'Unable to submit CRM support request.')
      return
    }

    addNotification('success', 'CRM Support Created', 'Your CRM support request was submitted successfully.')
    navigate(basePath)
  }

  return (
    <div className="sr-new-page ticket-new-page">
      <div className="sr-new-shell ticket-new-shell">
        <form className="sr-new-card ticket-new-card" onSubmit={handleSubmit}>
          <div className="sr-new-header">
            <div>
              <h1>New CRM Support</h1>
            </div>

            <div className="sr-new-header-actions">
              <button
                type="button"
                className="sr-new-btn sr-new-btn--cancel"
                onClick={() => navigate(basePath)}
              >
                <FaTimes />
                <span>Cancel</span>
              </button>
              <button
                type="submit"
                className="sr-new-btn sr-new-btn--send"
                disabled={saving}
              >
                <FaCheckCircle />
                <span>{saving ? 'Sending...' : 'Send'}</span>
              </button>
            </div>
          </div>

          <div className="sr-new-form-grid ticket-new-form-grid">
            <label className="sr-new-field">
              <span>Support Related To*</span>
              <select
                value={formData.requestType}
                onChange={(event) => handleChange('requestType', event.target.value)}
              >
                {TICKET_TYPE_OPTIONS.map((option) => (
                  <option key={option.value || 'select'} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
              {errors.requestType ? <small>{errors.requestType}</small> : null}
            </label>

            <label className="sr-new-field">
              <span>Subject*</span>
              <input
                type="text"
                value={formData.title}
                onChange={(event) => handleChange('title', event.target.value)}
              />
              {errors.title ? <small>{errors.title}</small> : null}
            </label>

            <label className="sr-new-field ticket-new-description-field">
              <span>Description*</span>
              <textarea
                rows="7"
                value={formData.description}
                onChange={(event) => handleChange('description', event.target.value)}
              />
              {errors.description ? <small>{errors.description}</small> : null}
            </label>

            <div className="sr-new-field ticket-new-upload-field">
              <span>File Attachments</span>
              <div className="sr-new-upload-row">
                <input
                  type="text"
                  readOnly
                  value={attachmentSummary}
                  placeholder="No file selected"
                />
                <button
                  type="button"
                  className="sr-new-upload-btn"
                  onClick={() => fileInputRef.current?.click()}
                >
                  Browse
                </button>
              </div>
              <input
                ref={fileInputRef}
                type="file"
                multiple
                className="sr-new-file-input"
                onChange={handleFileSelection}
              />
            </div>
          </div>
        </form>
      </div>
    </div>
  )
}

export default AddTicketPage
