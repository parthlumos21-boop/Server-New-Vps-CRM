import React, { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../../context/AuthContext'
import './SupportRequestAdmin.css'

const getSupportRequestId = (supportRequest = {}) => (
  supportRequest.id || supportRequest._id || supportRequest.srId || ''
)

const buildSupportRequestActions = (basePath, supportRequestId) => [
  { key: 'view-sr', label: 'View SR', path: `${basePath}/details/${supportRequestId}` },
  { key: 'add-note-remarks', label: 'Add Note/Remarks', path: `${basePath}/actions/add-note-remarks/${supportRequestId}` },
  { key: 'add-reminder', label: 'Add Reminder', path: `${basePath}/actions/add-reminder/${supportRequestId}` },
  { key: 'add-document', label: 'Add Document', path: `${basePath}/actions/add-document/${supportRequestId}` },
  { key: 'manage-sr', label: 'Manage SR', path: `${basePath}/manage/${supportRequestId}` },
  { key: 'view-sr-report-pdf', label: 'View SR Report (PDF)', path: `${basePath}/report/${supportRequestId}?print=1` },
]

const SupportRequestRowActionMenu = ({
  supportRequest,
  compact = false,
  basePath = '/admin/support-requests',
  triggerLabel = 'Action',
}) => {
  const navigate = useNavigate()
  const { user } = useAuth()
  const menuRef = useRef(null)
  const [open, setOpen] = useState(false)
  const supportRequestId = getSupportRequestId(supportRequest)
  const actions = buildSupportRequestActions(basePath, supportRequestId)
  const canUseActions = Boolean(user && supportRequestId)

  useEffect(() => {
    if (!open) return undefined

    const handleDocumentClick = (event) => {
      if (!menuRef.current?.contains(event.target)) {
        setOpen(false)
      }
    }

    document.addEventListener('mousedown', handleDocumentClick)
    return () => document.removeEventListener('mousedown', handleDocumentClick)
  }, [open])

  const handleNavigate = (path) => {
    setOpen(false)

    if (canUseActions) {
      navigate(path)
    }
  }

  return (
    <div ref={menuRef} className={`support-request-row-menu ${compact ? 'support-request-row-menu-compact' : ''}`}>
      <button
        type="button"
        className="support-request-row-menu-trigger"
        onClick={() => {
          if (canUseActions) {
            setOpen((current) => !current)
          }
        }}
        disabled={!canUseActions}
        aria-haspopup="menu"
        aria-expanded={open}
      >
        <span>{triggerLabel}</span>
        <span className="support-request-row-menu-caret">v</span>
      </button>

      {open ? (
        <div className="support-request-row-menu-dropdown" role="menu">
          {actions.map((action) => (
            <button
              key={action.key}
              type="button"
              role="menuitem"
              onClick={() => handleNavigate(action.path)}
            >
              {action.label}
            </button>
          ))}
        </div>
      ) : null}
    </div>
  )
}

export default SupportRequestRowActionMenu
