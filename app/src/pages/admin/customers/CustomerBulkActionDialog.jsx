import React, { useEffect, useState } from 'react'
import './CustomerBulkActionDialog.css'

const ACTION_COPY = {
  remark: {
    eyebrow: 'Customer Bulk Action',
    title: 'Add Remark',
    description: 'Apply the same latest remark to all selected customers.',
    confirmLabel: 'Apply Remark',
  },
  reassign: {
    eyebrow: 'Customer Bulk Action',
    title: 'Re-Assign Customer',
    description: 'Move all selected customers to a new owner in one step.',
    confirmLabel: 'Re-Assign Customers',
  },
}

const CustomerBulkActionDialog = ({
  actionKey,
  isOpen,
  selectedCount,
  ownerOptions = [],
  onClose,
  onApply,
}) => {
  const [remarkValue, setRemarkValue] = useState('')
  const [ownerValue, setOwnerValue] = useState(ownerOptions[0]?.value || '')
  const [errorMessage, setErrorMessage] = useState('')

  useEffect(() => {
    if (isOpen) {
      setRemarkValue('')
      setOwnerValue(ownerOptions[0]?.value || '')
      setErrorMessage('')
    }
  }, [isOpen, ownerOptions])

  useEffect(() => {
    if (!isOpen) return undefined

    const handleKeyDown = (event) => {
      if (event.key === 'Escape') {
        onClose()
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [isOpen, onClose])

  if (!isOpen) {
    return null
  }

  const copy = ACTION_COPY[actionKey] || ACTION_COPY.remark

  const handleSubmit = (event) => {
    event.preventDefault()
    setErrorMessage('')

    if (actionKey === 'remark') {
      if (!remarkValue.trim()) {
        setErrorMessage('Remark is required.')
        return
      }

      onApply({ remark: remarkValue.trim() })
      return
    }

    if (!ownerValue) {
      setErrorMessage('Customer owner is required.')
      return
    }

    onApply({ customerOwner: ownerValue })
  }

  return (
    <div className="customer-bulk-action-dialog-overlay" onClick={onClose}>
      <div className="customer-bulk-action-dialog" onClick={(event) => event.stopPropagation()}>
        <p className="customer-bulk-action-dialog-eyebrow">{copy.eyebrow}</p>
        <h2>{copy.title}</h2>
        <p className="customer-bulk-action-dialog-description">{copy.description}</p>

        <div className="customer-bulk-action-dialog-count">
          Selected customers: <strong>{selectedCount}</strong>
        </div>

        <form className="customer-bulk-action-dialog-form" onSubmit={handleSubmit}>
          {actionKey === 'remark' ? (
            <label className="customer-bulk-action-dialog-field">
              <span>Remark</span>
              <textarea
                rows={5}
                value={remarkValue}
                onChange={(event) => setRemarkValue(event.target.value)}
                className="customer-bulk-action-dialog-input customer-bulk-action-dialog-textarea"
              />
            </label>
          ) : (
            <label className="customer-bulk-action-dialog-field">
              <span>Customer Owner</span>
              <select
                value={ownerValue}
                onChange={(event) => setOwnerValue(event.target.value)}
                className="customer-bulk-action-dialog-input"
              >
                {ownerOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>
          )}

          {errorMessage ? <div className="customer-bulk-action-dialog-error">{errorMessage}</div> : null}

          <div className="customer-bulk-action-dialog-actions">
            <button
              type="button"
              className="customer-bulk-action-dialog-button customer-bulk-action-dialog-button-secondary"
              onClick={onClose}
            >
              Cancel
            </button>
            <button type="submit" className="customer-bulk-action-dialog-button">
              {copy.confirmLabel}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default CustomerBulkActionDialog
