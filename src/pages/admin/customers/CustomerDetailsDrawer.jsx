import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import {
  FaBell,
  FaClock,
  FaEdit,
  FaEnvelope,
  FaExchangeAlt,
  FaExternalLinkAlt,
  FaFileAlt,
  FaHome,
  FaMapMarkerAlt,
  FaPhoneAlt,
  FaStickyNote,
  FaTimes,
  FaUser,
} from 'react-icons/fa'
import ContactIntegrationActions from '../../../components/integrations/ContactIntegrationActions'
import { getCrmOwnerDisplay } from '../../../features/users/crmUserDirectory'
import { calendarApi } from '../../../services/calendarApi'
import './CustomerDetailsDrawer.css'

const CUSTOMER_STATUS_OPTIONS = [
  { value: '', label: 'Select' },
  { value: 'New', label: 'New' },
  { value: 'Active', label: 'Active' },
  { value: 'Future Prospect', label: 'Future Prospect' },
  { value: 'Rejected', label: 'Rejected' },
  { value: 'OLD', label: 'OLD' },
]
const REMINDER_MODES = [
  { value: '', label: 'Select' },
  { value: 'Call', label: 'Call' },
  { value: 'Email', label: 'Email' },
  { value: 'Meeting', label: 'Meeting' },
  { value: 'Visit', label: 'Visit' },
]

const DRAWER_ACTIONS = [
  { key: 'add-note-remarks', label: 'Add Notes/Remarks', icon: FaStickyNote },
  { key: 'add-reminder', label: 'Add Reminder', icon: FaBell },
  { key: 'change-status', label: 'Change Status', icon: FaClock },
  { key: 'add-document', label: 'Add Document', icon: FaFileAlt },
  { key: 're-assign-customer', label: 'Re-Assign Customer', icon: FaExchangeAlt },
  { key: 'send-mail', label: 'Send Mail', icon: FaEnvelope },
  { key: 'generate-quotation', label: 'Generate Quotation', icon: FaFileAlt },
  { key: 'manage-customer', label: 'Manage Customer', icon: FaExternalLinkAlt },
]

const QUICK_ACTIONS = [
  { key: 'manage-customer', title: 'Manage Customer', icon: FaHome },
  { key: 'add-note-remarks', title: 'Add Notes/Remarks', icon: FaEdit },
  { key: 'add-reminder', title: 'Add Reminder', icon: FaBell },
  { key: 'add-document', title: 'Add Document', icon: FaFileAlt },
  { key: 'send-mail', title: 'Send Mail', icon: FaEnvelope },
]

const DRAWER_ACTION_MENU_WIDTH = 248
const DRAWER_ACTION_MENU_ITEM_HEIGHT = 43
const DRAWER_ACTION_MENU_VIEWPORT_PADDING = 8

const getTextValue = (value, fallback = 'Not Available') => {
  const stringValue = String(value || '').trim()
  return stringValue || fallback
}

const formatDateValue = (value) => {
  const textValue = String(value || '').trim()
  if (!textValue) return 'Not Available'

  const parsedValue = new Date(textValue)
  if (Number.isNaN(parsedValue.getTime())) {
    return textValue
  }

  return parsedValue.toLocaleDateString('en-GB')
}

const formatDateTimeValue = (value) => {
  const textValue = String(value || '').trim()
  if (!textValue) return 'Not Available'

  const parsedValue = new Date(textValue)
  if (Number.isNaN(parsedValue.getTime())) {
    return textValue
  }

  return parsedValue.toLocaleString('en-GB', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

const isMissing = (value) => !String(value || '').trim()
const getTodayDateValue = () => new Date().toISOString().slice(0, 10)

const createCustomerCalendarReminder = async (customer, { reminderDate, reminderMode }) => {
  if (!customer?.id || !reminderDate) return

  await calendarApi.createEvent({
    title: `${customer.customerName || 'Customer'} reminder`,
    description: reminderMode ? `Reminder mode: ${reminderMode}` : '',
    startAt: `${reminderDate}T09:00:00`,
    category: 'Reminder',
    relatedEntityType: 'customer',
    relatedEntityId: customer.id,
    assignedTo: customer.assignedTo || customer.ownerUserId || customer.customerOwner || customer.customerOwnerName || '',
  }).catch(() => null)
}

const CustomerDetailsDrawer = ({
  customer,
  isOpen,
  initialActionKey = '',
  showActions = true,
  ownerOptions = [],
  onClose,
  onSaveCustomerUpdates,
  onManageCustomer,
  onGenerateQuotation,
  onSendMail,
}) => {
  const actionsRef = useRef(null)
  const actionsMenuRef = useRef(null)
  const actionsTriggerRef = useRef(null)
  const fileInputRef = useRef(null)
  const [isActionsMenuOpen, setIsActionsMenuOpen] = useState(false)
  const [actionsMenuPosition, setActionsMenuPosition] = useState(null)
  const [activeActionKey, setActiveActionKey] = useState('')
  const [remarkValue, setRemarkValue] = useState('')
  const [reminderDate, setReminderDate] = useState('')
  const [reminderMode, setReminderMode] = useState('')
  const [statusValue, setStatusValue] = useState('New')
  const [ownerValue, setOwnerValue] = useState('')
  const [emailSubject, setEmailSubject] = useState('')
  const [emailMessage, setEmailMessage] = useState('')
  const [documentName, setDocumentName] = useState('')
  const [documentFileName, setDocumentFileName] = useState('')
  const [errorMessage, setErrorMessage] = useState('')
  const [successMessage, setSuccessMessage] = useState('')
  const [isEditMode, setIsEditMode] = useState(false)
  const [editDraft, setEditDraft] = useState({})
  const [isSavingEdit, setIsSavingEdit] = useState(false)

  const primaryContact = customer?.contacts?.[0] || {}
  const availableOwnerOptions = ownerOptions.length > 0
    ? ownerOptions
    : [{ value: customer?.customerOwner || '', label: customer?.customerOwnerDisplay || getCrmOwnerDisplay(customer?.customerOwner) || 'Unassigned' }]
  const selectedAction = useMemo(
    () => DRAWER_ACTIONS.find((action) => action.key === activeActionKey) || null,
    [activeActionKey]
  )

  const positionActionsMenu = useCallback(() => {
    const triggerElement = actionsTriggerRef.current
    if (!triggerElement) {
      setActionsMenuPosition(null)
      return
    }

    const rect = triggerElement.getBoundingClientRect()
    const menuWidth = Math.min(
      DRAWER_ACTION_MENU_WIDTH,
      Math.max(180, window.innerWidth - (DRAWER_ACTION_MENU_VIEWPORT_PADDING * 2))
    )
    const menuHeight = DRAWER_ACTIONS.length * DRAWER_ACTION_MENU_ITEM_HEIGHT + 2
    const availableBelow = window.innerHeight - rect.bottom
    const top = availableBelow >= menuHeight + DRAWER_ACTION_MENU_VIEWPORT_PADDING
      ? rect.bottom + 6
      : Math.max(DRAWER_ACTION_MENU_VIEWPORT_PADDING, rect.top - menuHeight - 6)
    const maxLeft = Math.max(
      DRAWER_ACTION_MENU_VIEWPORT_PADDING,
      window.innerWidth - menuWidth - DRAWER_ACTION_MENU_VIEWPORT_PADDING
    )
    const left = Math.min(
      Math.max(DRAWER_ACTION_MENU_VIEWPORT_PADDING, rect.right - menuWidth),
      maxLeft
    )

    setActionsMenuPosition({ top, left, width: menuWidth })
  }, [])

  useEffect(() => {
    if (!customer) return

    setRemarkValue(customer.remark || '')
    setReminderDate(customer.reminderDate || getTodayDateValue())
    setReminderMode(customer.reminderMode || '')
    setStatusValue(customer.customerStatus || '')
    setOwnerValue(customer.customerOwner || availableOwnerOptions[0]?.value || '')
    setEmailSubject(`Regarding ${customer.customerName || 'Customer'}`)
    setEmailMessage('')
    setDocumentName('')
    setDocumentFileName('')
    setErrorMessage('')
    setSuccessMessage('')
  }, [availableOwnerOptions, customer])

  useEffect(() => {
    if (!isOpen) {
      setIsActionsMenuOpen(false)
      setActionsMenuPosition(null)
      setActiveActionKey('')
      setErrorMessage('')
      setSuccessMessage('')
      setIsEditMode(false)
      setEditDraft({})
      setIsSavingEdit(false)
    }
  }, [isOpen])

  useEffect(() => {
    if (isOpen) {
      setActiveActionKey(initialActionKey || '')
      setErrorMessage('')
      setSuccessMessage('')
    }
  }, [initialActionKey, isOpen])

  useEffect(() => {
    if (!isOpen) return undefined

    const handleKeyDown = (event) => {
      if (event.key === 'Escape') {
        if (activeActionKey) {
          setActiveActionKey('')
          setErrorMessage('')
          setSuccessMessage('')
          return
        }

        onClose()
      }
    }

    const handlePointerDown = (event) => {
      if (
        actionsRef.current &&
        !actionsRef.current.contains(event.target) &&
        !actionsMenuRef.current?.contains(event.target)
      ) {
        setIsActionsMenuOpen(false)
        setActionsMenuPosition(null)
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    document.addEventListener('mousedown', handlePointerDown)

    return () => {
      document.removeEventListener('keydown', handleKeyDown)
      document.removeEventListener('mousedown', handlePointerDown)
    }
  }, [activeActionKey, isOpen, onClose])

  useEffect(() => {
    if (!isActionsMenuOpen) {
      setActionsMenuPosition(null)
      return undefined
    }

    positionActionsMenu()
    window.addEventListener('resize', positionActionsMenu)
    window.addEventListener('scroll', positionActionsMenu, true)

    return () => {
      window.removeEventListener('resize', positionActionsMenu)
      window.removeEventListener('scroll', positionActionsMenu, true)
    }
  }, [isActionsMenuOpen, positionActionsMenu])

  if (!isOpen || !customer) {
    return null
  }

  const detailsRows = [
    { label: 'Customer Name', value: customer.customerName, icon: FaUser, fieldKey: 'customerName', editable: true, inputType: 'text' },
    { label: 'Phone', value: primaryContact.mobile || primaryContact.phone, icon: FaPhoneAlt, fieldKey: 'phone', editable: true, inputType: 'tel' },
    { label: 'Email', value: primaryContact.email, icon: FaEnvelope, fieldKey: 'email', editable: true, inputType: 'email' },
    { label: 'Customer Category', value: customer.customerCategory, icon: FaStickyNote, fieldKey: 'customerCategory', editable: true, inputType: 'text' },
    { label: 'Customer Status', value: customer.customerStatus, icon: FaClock, fieldKey: 'customerStatus', editable: true, inputType: 'select', options: CUSTOMER_STATUS_OPTIONS },
    { label: 'Added Date', value: formatDateValue(customer.addedDate), icon: FaStickyNote },
    { label: 'Added By', value: customer.customerOwnerName || customer.customerOwner || 'Unassigned', icon: FaUser },
    { label: 'Last Updated', value: formatDateTimeValue(customer.updatedAt), icon: FaClock },
  ]

  const buildEditDraft = () => ({
    customerName: customer.customerName || '',
    phone: primaryContact.mobile || primaryContact.phone || '',
    email: primaryContact.email || '',
    customerCategory: customer.customerCategory || '',
    customerStatus: customer.customerStatus || '',
  })

  const handleStartEdit = () => {
    setEditDraft(buildEditDraft())
    setIsEditMode(true)
    setActiveActionKey('')
    setIsActionsMenuOpen(false)
    setErrorMessage('')
    setSuccessMessage('')
  }

  const handleCancelEdit = () => {
    setIsEditMode(false)
    setEditDraft({})
    setErrorMessage('')
  }

  const handleEditFieldChange = (fieldKey, nextValue) => {
    setEditDraft((currentValue) => ({ ...currentValue, [fieldKey]: nextValue }))
  }

  const handleSaveEdit = async () => {
    if (!onSaveCustomerUpdates) {
      setErrorMessage('Save is not available right now.')
      return
    }

    const baseline = buildEditDraft()
    const updates = Object.keys(editDraft).reduce((accumulator, key) => {
      if (String(editDraft[key] ?? '').trim() !== String(baseline[key] ?? '').trim()) {
        accumulator[key] = String(editDraft[key] ?? '').trim()
      }
      return accumulator
    }, {})

    if (Object.keys(updates).length === 0) {
      setIsEditMode(false)
      return
    }

    setIsSavingEdit(true)
    setErrorMessage('')

    try {
      await onSaveCustomerUpdates(customer.id, updates)
      setSuccessMessage('Customer details updated.')
      setIsEditMode(false)
      setEditDraft({})
    } catch (error) {
      setErrorMessage(error?.message || 'Unable to save customer details.')
    } finally {
      setIsSavingEdit(false)
    }
  }

  const otherDetailsRows = [
    { label: 'Contact Person', value: primaryContact.contactPerson },
    { label: 'Designation', value: primaryContact.designation },
    { label: 'Customer Type', value: customer.customerType },
    { label: 'Job No', value: customer.jobNo },
    { label: 'Alternate Email', value: customer.alternateEmail },
    { label: 'Alternate Phone', value: customer.alternatePhone },
  ]

  const savedDocuments = Array.isArray(customer.documents) ? customer.documents : []

  const handleOpenAction = (actionKey) => {
    setIsActionsMenuOpen(false)
    setActionsMenuPosition(null)
    setActiveActionKey(actionKey)
    setErrorMessage('')
    setSuccessMessage('')

    if (actionKey === 'manage-customer') {
      onManageCustomer(customer.id)
      return
    }

    if (actionKey === 'generate-quotation') {
      onGenerateQuotation?.(customer)
      return
    }

    if (actionKey === 'send-mail') {
      onSendMail?.(customer)
    }
  }

  const actionsMenuPortal = isActionsMenuOpen && actionsMenuPosition && typeof document !== 'undefined'
    ? createPortal((
      <div
        ref={actionsMenuRef}
        className="customer-details-drawer-actions-menu"
        style={{
          top: actionsMenuPosition.top,
          left: actionsMenuPosition.left,
          width: actionsMenuPosition.width,
        }}
        role="menu"
      >
        {DRAWER_ACTIONS.map((action) => {
          const Icon = action.icon

          return (
            <button
              key={action.key}
              type="button"
              className="customer-details-drawer-actions-item"
              role="menuitem"
              onClick={() => handleOpenAction(action.key)}
            >
              <Icon className="customer-details-drawer-actions-item-icon" />
              <span>{action.label}</span>
            </button>
          )
        })}
      </div>
    ), document.body)
    : null

  const handleSaveAction = async (event) => {
    event.preventDefault()
    setErrorMessage('')
    setSuccessMessage('')

    if (activeActionKey === 'add-note-remarks') {
      if (!remarkValue.trim()) {
        setErrorMessage('Remark is required.')
        return
      }

      await onSaveCustomerUpdates(customer.id, { remark: remarkValue.trim() })
      setSuccessMessage('Customer remark updated.')
      return
    }

    if (activeActionKey === 'add-reminder') {
      if (!reminderDate) {
        setErrorMessage('Reminder date is required.')
        return
      }

      if (!reminderMode) {
        setErrorMessage('Reminder mode is required.')
        return
      }

      await onSaveCustomerUpdates(customer.id, { reminderDate, reminderMode })
      await createCustomerCalendarReminder(customer, { reminderDate, reminderMode })
      setSuccessMessage('Customer reminder updated.')
      return
    }

    if (activeActionKey === 'change-status') {
      if (!statusValue) {
        setErrorMessage('Customer status is required.')
        return
      }

      await onSaveCustomerUpdates(customer.id, { customerStatus: statusValue })
      setSuccessMessage('Customer status updated.')
      return
    }

    if (activeActionKey === 're-assign-customer') {
      if (!ownerValue) {
        setErrorMessage('Customer owner is required.')
        return
      }

      await onSaveCustomerUpdates(customer.id, { customerOwner: ownerValue })
      setSuccessMessage('Customer owner updated.')
      return
    }

    if (activeActionKey === 'add-document') {
      const nextDocumentName = getTextValue(documentName || documentFileName, '')
      if (!nextDocumentName) {
        setErrorMessage('Document name is required.')
        return
      }

      await onSaveCustomerUpdates(customer.id, {
        documents: [
          ...savedDocuments,
          {
            id: `document-${Date.now()}`,
            name: nextDocumentName,
            addedAt: new Date().toISOString(),
          },
        ],
      })
      setSuccessMessage('Document reference added to customer.')
      setDocumentName('')
      setDocumentFileName('')
      if (fileInputRef.current) {
        fileInputRef.current.value = ''
      }
      return
    }

    if (activeActionKey === 'send-mail') {
      const recipientEmail = String(primaryContact.email || '').trim()
      if (!recipientEmail) {
        setErrorMessage('Primary contact email is not available for this customer.')
        return
      }

      window.location.href = `mailto:${encodeURIComponent(recipientEmail)}?subject=${encodeURIComponent(emailSubject)}&body=${encodeURIComponent(emailMessage)}`
      setSuccessMessage('Opening your mail client.')
    }
  }

  const renderActionPanel = () => {
    if (!selectedAction || selectedAction.key === 'manage-customer') {
      return null
    }

    return (
      <form className="customer-details-drawer-action-card" onSubmit={handleSaveAction}>
        <div className="customer-details-drawer-action-header">
          <div>
            <p className="customer-details-drawer-action-kicker">Customer Action</p>
            <h2>{selectedAction.label}</h2>
          </div>

          <button
            type="button"
            className="customer-details-drawer-action-close"
            onClick={() => {
              setActiveActionKey('')
              setErrorMessage('')
              setSuccessMessage('')
            }}
          >
            Close
          </button>
        </div>

        {activeActionKey === 'add-note-remarks' ? (
          <label className="customer-details-drawer-form-field">
            <span>Remark</span>
            <textarea
              rows={4}
              value={remarkValue}
              onChange={(event) => setRemarkValue(event.target.value)}
              className="customer-details-drawer-form-input customer-details-drawer-form-textarea"
            />
          </label>
        ) : null}

        {activeActionKey === 'add-reminder' ? (
          <div className="customer-details-drawer-form-grid">
            <label className="customer-details-drawer-form-field">
              <span>Reminder Date</span>
              <input
                type="date"
                value={reminderDate}
                onChange={(event) => setReminderDate(event.target.value)}
                className="customer-details-drawer-form-input"
              />
            </label>

            <label className="customer-details-drawer-form-field">
              <span>Reminder Mode</span>
              <select
                value={reminderMode}
                onChange={(event) => setReminderMode(event.target.value)}
                className="customer-details-drawer-form-input"
              >
                {REMINDER_MODES.map((option) => (
                  <option key={option.value || 'empty-reminder-mode'} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>
          </div>
        ) : null}

        {activeActionKey === 'change-status' ? (
          <label className="customer-details-drawer-form-field">
            <span>Customer Status</span>
            <select
              value={statusValue}
              onChange={(event) => setStatusValue(event.target.value)}
              className="customer-details-drawer-form-input"
            >
              {CUSTOMER_STATUS_OPTIONS.map((statusOption) => (
                <option key={statusOption.value || 'select'} value={statusOption.value}>
                  {statusOption.label}
                </option>
              ))}
            </select>
          </label>
        ) : null}

        {activeActionKey === 're-assign-customer' ? (
          <label className="customer-details-drawer-form-field">
            <span>Customer Owner</span>
            <select
              value={ownerValue}
              onChange={(event) => setOwnerValue(event.target.value)}
              className="customer-details-drawer-form-input"
            >
              {availableOwnerOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>
        ) : null}

        {activeActionKey === 'add-document' ? (
          <div className="customer-details-drawer-form-grid">
            <label className="customer-details-drawer-form-field">
              <span>Document Name</span>
              <input
                type="text"
                value={documentName}
                onChange={(event) => setDocumentName(event.target.value)}
                className="customer-details-drawer-form-input"
                placeholder="Proposal.pdf"
              />
            </label>

            <label className="customer-details-drawer-form-field">
              <span>Choose File</span>
              <input
                ref={fileInputRef}
                type="file"
                onChange={(event) => setDocumentFileName(event.target.files?.[0]?.name || '')}
                className="customer-details-drawer-form-input"
              />
            </label>
          </div>
        ) : null}

        {activeActionKey === 'send-mail' ? (
          <div className="customer-details-drawer-form-grid">
            <label className="customer-details-drawer-form-field">
              <span>To</span>
              <input
                type="email"
                value={primaryContact.email || ''}
                readOnly
                className="customer-details-drawer-form-input customer-details-drawer-form-input-readonly"
              />
            </label>

            <label className="customer-details-drawer-form-field">
              <span>Subject</span>
              <input
                type="text"
                value={emailSubject}
                onChange={(event) => setEmailSubject(event.target.value)}
                className="customer-details-drawer-form-input"
              />
            </label>

            <label className="customer-details-drawer-form-field customer-details-drawer-form-field-full">
              <span>Message</span>
              <textarea
                rows={5}
                value={emailMessage}
                onChange={(event) => setEmailMessage(event.target.value)}
                className="customer-details-drawer-form-input customer-details-drawer-form-textarea"
              />
            </label>
          </div>
        ) : null}

        {errorMessage ? <div className="customer-details-drawer-message customer-details-drawer-message-error">{errorMessage}</div> : null}
        {successMessage ? <div className="customer-details-drawer-message customer-details-drawer-message-success">{successMessage}</div> : null}

        <div className="customer-details-drawer-action-footer">
          <button type="button" className="customer-details-drawer-secondary-btn" onClick={() => setActiveActionKey('')}>
            Cancel
          </button>
          <button type="submit" className="customer-details-drawer-primary-btn">
            {activeActionKey === 'send-mail' ? 'Open Mail' : 'Save'}
          </button>
        </div>
      </form>
    )
  }

  return (
    <div className="customer-details-drawer-overlay" onClick={onClose}>
      <aside className="customer-details-drawer" onClick={(event) => event.stopPropagation()}>
        <div className="customer-details-drawer-header">
          <div>
            <h1>{customer.customerName || 'Customer Details'}</h1>
          </div>

          <button
            type="button"
            className="customer-details-drawer-close"
            onClick={onClose}
            aria-label="Close customer details"
          >
            <FaTimes />
          </button>
        </div>

        <div className="customer-details-drawer-toolbar">
          <div className="customer-details-drawer-number">
            Customer No.: <strong>{customer.customerNumber}</strong>
          </div>

          <div className="customer-details-drawer-toolbar-right">
            {showActions ? (
              <div className="customer-details-drawer-quick-actions">
                {QUICK_ACTIONS.map((action) => {
                  const Icon = action.icon

                  return (
                    <button
                      key={action.key}
                      type="button"
                      className="customer-details-drawer-quick-action"
                      title={action.title}
                      onClick={() => handleOpenAction(action.key)}
                    >
                      <Icon />
                    </button>
                  )
                })}
              </div>
            ) : null}

            {showActions && !isEditMode ? (
              <button
                type="button"
                className="customer-details-drawer-edit-toggle"
                onClick={handleStartEdit}
              >
                <FaEdit />
                <span>Edit</span>
              </button>
            ) : null}

            {showActions && isEditMode ? (
              <div className="customer-details-drawer-edit-controls">
                <button
                  type="button"
                  className="customer-details-drawer-edit-save"
                  onClick={handleSaveEdit}
                  disabled={isSavingEdit}
                >
                  {isSavingEdit ? 'Saving...' : 'Save'}
                </button>
                <button
                  type="button"
                  className="customer-details-drawer-edit-cancel"
                  onClick={handleCancelEdit}
                  disabled={isSavingEdit}
                >
                  Cancel
                </button>
              </div>
            ) : null}

            {showActions ? (
              <div className="customer-details-drawer-actions" ref={actionsRef}>
                <button
                  ref={actionsTriggerRef}
                  type="button"
                  className="customer-details-drawer-actions-trigger"
                  onClick={() => setIsActionsMenuOpen((currentValue) => !currentValue)}
                  aria-expanded={isActionsMenuOpen}
                  aria-haspopup="menu"
                >
                  <span>Actions</span>
                  <span className="customer-details-drawer-actions-caret">v</span>
                </button>
              </div>
            ) : null}
          </div>
        </div>
        {actionsMenuPortal}

        {renderActionPanel()}

        {errorMessage && isEditMode ? (
          <div className="customer-details-drawer-edit-error">{errorMessage}</div>
        ) : null}

        <div className="customer-details-drawer-summary-grid">
          {detailsRows.map((field) => {
            const Icon = field.icon
            const missing = isMissing(field.value) || field.value === 'Not Available'
            const showEditor = isEditMode && field.editable
            const draftValue = showEditor ? (editDraft[field.fieldKey] ?? '') : ''

            return (
              <div key={field.label} className="customer-details-drawer-summary-card">
                <div className="customer-details-drawer-summary-label">
                  <Icon />
                  <span>{field.label}</span>
                </div>
                {showEditor ? (
                  field.inputType === 'select' ? (
                    <select
                      className="customer-details-drawer-summary-input"
                      value={draftValue}
                      onChange={(event) => handleEditFieldChange(field.fieldKey, event.target.value)}
                      disabled={isSavingEdit}
                    >
                      {field.options.map((option) => {
                        const optionValue = typeof option === 'object' ? option.value : option
                        const optionLabel = typeof option === 'object' ? option.label : option

                        return (
                          <option key={optionValue || 'select'} value={optionValue}>
                            {optionLabel}
                          </option>
                        )
                      })}
                    </select>
                  ) : field.inputType === 'textarea' ? (
                    <textarea
                      className="customer-details-drawer-summary-input customer-details-drawer-summary-input-textarea"
                      value={draftValue}
                      onChange={(event) => handleEditFieldChange(field.fieldKey, event.target.value)}
                      disabled={isSavingEdit}
                      rows={2}
                    />
                  ) : (
                    <input
                      type={field.inputType || 'text'}
                      className="customer-details-drawer-summary-input"
                      value={draftValue}
                      onChange={(event) => handleEditFieldChange(field.fieldKey, event.target.value)}
                      disabled={isSavingEdit}
                    />
                  )
                ) : (
                  <div className={`customer-details-drawer-summary-value ${missing ? 'customer-details-drawer-summary-value-missing' : ''}`}>
                    {getTextValue(field.value)}
                    {!missing && ['phone', 'email'].includes(field.fieldKey) ? (
                      <ContactIntegrationActions
                        phone={primaryContact.mobile || primaryContact.phone || ''}
                        email={primaryContact.email || ''}
                        targetType="customer"
                        targetId={customer.id}
                        defaultMessage={`Hello ${customer.customerName || ''}`.trim()}
                        emailSubject={`Regarding ${customer.customerName || 'Customer'}`}
                        onStatus={(type, message) => {
                          setErrorMessage(type === 'error' ? message : '')
                          setSuccessMessage(type === 'success' ? message : '')
                        }}
                      />
                    ) : null}
                  </div>
                )}
              </div>
            )
          })}
        </div>

        <section className="customer-details-drawer-section">
          <h2>Other Details</h2>

          <div className="customer-details-drawer-other-grid">
            {otherDetailsRows.map((field) => {
              const missing = isMissing(field.value)

              return (
                <div key={field.label} className="customer-details-drawer-other-item">
                  <span>{field.label}</span>
                  <strong className={missing ? 'customer-details-drawer-summary-value-missing' : ''}>
                    {getTextValue(field.value)}
                  </strong>
                </div>
              )
            })}
          </div>
        </section>

        <section className="customer-details-drawer-section">
          <h2>Documents</h2>

          {savedDocuments.length > 0 ? (
            <ul className="customer-details-drawer-document-list">
              {savedDocuments.map((document) => (
                <li key={document.id}>
                  <span>{document.name}</span>
                  <strong>{formatDateTimeValue(document.addedAt)}</strong>
                </li>
              ))}
            </ul>
          ) : (
            <div className="customer-details-drawer-empty-state">No customer documents added yet.</div>
          )}
        </section>
      </aside>
    </div>
  )
}

export default CustomerDetailsDrawer
