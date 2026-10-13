import React, { useState, useRef, useEffect } from 'react'
import { FaTimes, FaTrashAlt, FaPlus, FaSearch, FaChevronDown, FaCheck } from 'react-icons/fa'

const FILTER_FIELDS = [
  { key: 'task', label: 'Task' },
  { key: 'assignee', label: 'Assignee' },
  { key: 'status', label: 'Status' },
  { key: 'priority', label: 'Priority' },
]

const STATUS_OPTIONS = [
  { value: '', label: 'All Statuses' },
  { value: 'draft', label: 'Draft' },
  { value: 'pending', label: 'Pending' },
  { value: 'open', label: 'Open' },
  { value: 'in_progress', label: 'Processing' },
  { value: 'review', label: 'Checking' },
  { value: 'completed', label: 'Completed' },
]

const PRIORITY_OPTIONS = [
  { value: '', label: 'All Priorities' },
  { value: 'urgent', label: 'Urgent' },
  { value: 'high', label: 'High' },
  { value: 'medium', label: 'Medium' },
  { value: 'low', label: 'Low' },
]

export const TaskFilterPopover = ({
  isOpen,
  onClose,
  filterRules = [],
  onFilterRulesChange,
  userList = [],
  anchorRef,
}) => {
  const popoverRef = useRef(null)
  const [assigneeSearchQuery, setAssigneeSearchQuery] = useState('')
  const [activeAssigneeDropdownRowId, setActiveAssigneeDropdownRowId] = useState(null)

  // Close on outside click
  useEffect(() => {
    const handleOutsideClick = (e) => {
      if (
        isOpen &&
        popoverRef.current &&
        !popoverRef.current.contains(e.target) &&
        anchorRef?.current &&
        !anchorRef.current.contains(e.target)
      ) {
        onClose()
      }
    }
    if (isOpen) {
      document.addEventListener('mousedown', handleOutsideClick)
    }
    return () => {
      document.removeEventListener('mousedown', handleOutsideClick)
    }
  }, [isOpen, onClose, anchorRef])

  if (!isOpen) return null

  const handleFieldChange = (id, newField) => {
    const updated = filterRules.map((rule) => {
      if (rule.id === id) {
        return { ...rule, field: newField, value: '' }
      }
      return rule
    })
    onFilterRulesChange(updated)
  }

  const handleValueChange = (id, newValue) => {
    const updated = filterRules.map((rule) => {
      if (rule.id === id) {
        return { ...rule, value: newValue }
      }
      return rule
    })
    onFilterRulesChange(updated)
  }

  const handleRemoveRule = (id) => {
    const updated = filterRules.filter((r) => r.id !== id)
    onFilterRulesChange(updated)
    if (activeAssigneeDropdownRowId === id) {
      setActiveAssigneeDropdownRowId(null)
    }
  }

  const handleAddRule = () => {
    // pick a field not yet used if possible
    const usedFields = new Set(filterRules.map((r) => r.field))
    const nextField = FILTER_FIELDS.find((f) => !usedFields.has(f.key))?.key || 'task'
    const newRule = {
      id: `filter-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
      field: nextField,
      value: '',
    }
    onFilterRulesChange([...filterRules, newRule])
  }

  // Filter user list for assignee picker
  const filteredUsers = userList.filter((u) => {
    if (!assigneeSearchQuery.trim()) return true
    const q = assigneeSearchQuery.toLowerCase()
    const name = String(u.name || `${u.firstName || ''} ${u.lastName || ''}`.trim() || '').toLowerCase()
    const email = String(u.email || '').toLowerCase()
    return name.includes(q) || email.includes(q)
  })

  return (
    <div
      ref={popoverRef}
      style={{
        position: 'absolute',
        top: 'calc(100% + 8px)',
        right: '0',
        zIndex: 1000,
        width: '420px',
        maxWidth: '92vw',
        background: '#ffffff',
        borderRadius: '16px',
        boxShadow: '0 20px 45px -10px rgba(0, 0, 0, 0.15), 0 8px 16px -6px rgba(0, 0, 0, 0.08)',
        border: '1px solid #e2e8f0',
        padding: '1.25rem',
        animation: 'fadeIn 0.15s ease-out',
      }}
    >
      {/* Header */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: '1rem',
          paddingBottom: '0.65rem',
          borderBottom: '1px solid #f1f5f9',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <span style={{ fontWeight: '800', fontSize: '0.95rem', color: '#1e293b' }}>Filters</span>
          {filterRules.length > 0 && (
            <span
              style={{
                fontSize: '0.7rem',
                fontWeight: '700',
                background: '#e0f2fe',
                color: '#0369a1',
                padding: '0.1rem 0.45rem',
                borderRadius: '999px',
              }}
            >
              {filterRules.length} active
            </span>
          )}
        </div>
        <button
          type="button"
          onClick={onClose}
          style={{
            background: 'transparent',
            border: 'none',
            color: '#94a3b8',
            fontSize: '0.9rem',
            cursor: 'pointer',
            padding: '0.2rem',
            borderRadius: '6px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
          title="Close filters"
        >
          <FaTimes />
        </button>
      </div>

      {/* Rules list */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', marginBottom: '1rem' }}>
        {filterRules.length === 0 ? (
          <div
            style={{
              padding: '1rem',
              textAlign: 'center',
              fontSize: '0.8rem',
              color: '#64748b',
              background: '#f8fafc',
              borderRadius: '10px',
            }}
          >
            No filters applied. Click <strong>+ Add Filter</strong> below to filter by Task name, Assignee, Status, or Priority.
          </div>
        ) : (
          filterRules.map((rule) => {
            const isAssigneeDropdownOpen = activeAssigneeDropdownRowId === rule.id
            const selectedUser = userList.find(
              (u) =>
                String(u.email || '').toLowerCase() === String(rule.value || '').toLowerCase() ||
                String(u._id || u.id || '') === String(rule.value || '')
            )
            const selectedUserName =
              selectedUser?.name ||
              `${selectedUser?.firstName || ''} ${selectedUser?.lastName || ''}`.trim() ||
              selectedUser?.email ||
              (rule.value ? rule.value : 'Select Assignee')

            return (
              <div
                key={rule.id}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  position: 'relative',
                }}
              >
                {/* Field Selector */}
                <select
                  value={rule.field}
                  onChange={(e) => handleFieldChange(rule.id, e.target.value)}
                  style={{
                    width: '110px',
                    padding: '0.45rem 0.6rem',
                    borderRadius: '10px',
                    border: '1px solid #cbd5e1',
                    background: '#f8fafc',
                    fontSize: '0.8rem',
                    fontWeight: '600',
                    color: '#334155',
                    cursor: 'pointer',
                    outline: 'none',
                  }}
                >
                  {FILTER_FIELDS.map((f) => (
                    <option key={f.key} value={f.key}>
                      {f.label}
                    </option>
                  ))}
                </select>

                {/* Value Input Widget */}
                <div style={{ flex: 1, position: 'relative' }}>
                  {rule.field === 'task' && (
                    <div style={{ position: 'relative' }}>
                      <FaSearch
                        style={{
                          position: 'absolute',
                          left: '0.65rem',
                          top: '50%',
                          transform: 'translateY(-50%)',
                          color: '#94a3b8',
                          fontSize: '0.75rem',
                        }}
                      />
                      <input
                        type="text"
                        placeholder="Type here to Search"
                        value={rule.value}
                        onChange={(e) => handleValueChange(rule.id, e.target.value)}
                        style={{
                          width: '100%',
                          padding: '0.45rem 0.65rem 0.45rem 1.85rem',
                          borderRadius: '10px',
                          border: '1px solid #cbd5e1',
                          fontSize: '0.8rem',
                          color: '#1e293b',
                          background: '#ffffff',
                          outline: 'none',
                        }}
                      />
                    </div>
                  )}

                  {rule.field === 'assignee' && (
                    <div style={{ position: 'relative' }}>
                      <button
                        type="button"
                        onClick={() =>
                          setActiveAssigneeDropdownRowId(isAssigneeDropdownOpen ? null : rule.id)
                        }
                        style={{
                          width: '100%',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          padding: '0.45rem 0.75rem',
                          borderRadius: '10px',
                          border: '1px solid #cbd5e1',
                          background: '#ffffff',
                          fontSize: '0.8rem',
                          color: rule.value ? '#1e293b' : '#94a3b8',
                          fontWeight: rule.value ? '600' : '400',
                          cursor: 'pointer',
                          outline: 'none',
                          textAlign: 'left',
                        }}
                      >
                        <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {selectedUserName}
                        </span>
                        <FaChevronDown style={{ fontSize: '0.65rem', color: '#94a3b8', flexShrink: 0 }} />
                      </button>

                      {/* Floating Assignee Picker matching Image 1 */}
                      {isAssigneeDropdownOpen && (
                        <div
                          style={{
                            position: 'absolute',
                            top: 'calc(100% + 4px)',
                            left: 0,
                            right: 0,
                            zIndex: 1100,
                            background: '#ffffff',
                            borderRadius: '12px',
                            border: '1px solid #e2e8f0',
                            boxShadow: '0 12px 30px -4px rgba(0, 0, 0, 0.15)',
                            padding: '0.5rem',
                            maxHeight: '230px',
                            display: 'flex',
                            flexDirection: 'column',
                          }}
                        >
                          <div style={{ position: 'relative', marginBottom: '0.45rem' }}>
                            <FaSearch
                              style={{
                                position: 'absolute',
                                left: '0.6rem',
                                top: '50%',
                                transform: 'translateY(-50%)',
                                color: '#94a3b8',
                                fontSize: '0.72rem',
                              }}
                            />
                            <input
                              type="text"
                              placeholder="Write here"
                              value={assigneeSearchQuery}
                              onChange={(e) => setAssigneeSearchQuery(e.target.value)}
                              autoFocus
                              style={{
                                width: '100%',
                                padding: '0.35rem 0.5rem 0.35rem 1.65rem',
                                borderRadius: '8px',
                                border: '1px solid #cbd5e1',
                                fontSize: '0.78rem',
                                outline: 'none',
                                background: '#f8fafc',
                              }}
                            />
                          </div>

                          <div style={{ overflowY: 'auto', maxHeight: '160px', display: 'flex', flexDirection: 'column', gap: '0.15rem' }}>
                            {filteredUsers.length === 0 ? (
                              <div style={{ padding: '0.5rem', fontSize: '0.75rem', color: '#94a3b8', textAlign: 'center' }}>
                                No members found
                              </div>
                            ) : (
                              filteredUsers.map((u) => {
                                const email = String(u.email || '').toLowerCase().trim()
                                const name = u.name || `${u.firstName || ''} ${u.lastName || ''}`.trim() || email
                                const isSel = String(rule.value || '').toLowerCase() === email
                                const initial = (name.charAt(0) || 'U').toUpperCase()

                                return (
                                  <button
                                    key={email || u.id || u._id}
                                    type="button"
                                    onClick={() => {
                                      handleValueChange(rule.id, email)
                                      setActiveAssigneeDropdownRowId(null)
                                      setAssigneeSearchQuery('')
                                    }}
                                    style={{
                                      display: 'flex',
                                      alignItems: 'center',
                                      gap: '0.55rem',
                                      padding: '0.38rem 0.55rem',
                                      borderRadius: '8px',
                                      background: isSel ? '#eff6ff' : 'transparent',
                                      border: 'none',
                                      cursor: 'pointer',
                                      fontSize: '0.78rem',
                                      color: isSel ? '#1d4ed8' : '#334155',
                                      fontWeight: isSel ? '700' : '500',
                                      textAlign: 'left',
                                      transition: 'background 0.12s ease',
                                    }}
                                    onMouseEnter={(e) => {
                                      if (!isSel) e.currentTarget.style.background = '#f8fafc'
                                    }}
                                    onMouseLeave={(e) => {
                                      if (!isSel) e.currentTarget.style.background = 'transparent'
                                    }}
                                  >
                                    <div
                                      style={{
                                        width: '22px',
                                        height: '22px',
                                        borderRadius: '50%',
                                        background: isSel ? '#2563eb' : '#f1f5f9',
                                        color: isSel ? '#ffffff' : '#475569',
                                        fontSize: '0.68rem',
                                        fontWeight: '800',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        flexShrink: 0,
                                      }}
                                    >
                                      {initial}
                                    </div>
                                    <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                      {name}
                                    </span>
                                    {isSel && <FaCheck style={{ fontSize: '0.65rem', color: '#2563eb' }} />}
                                  </button>
                                )
                              })
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {rule.field === 'status' && (
                    <select
                      value={rule.value}
                      onChange={(e) => handleValueChange(rule.id, e.target.value)}
                      style={{
                        width: '100%',
                        padding: '0.45rem 0.65rem',
                        borderRadius: '10px',
                        border: '1px solid #cbd5e1',
                        fontSize: '0.8rem',
                        background: '#ffffff',
                        color: '#1e293b',
                        fontWeight: '500',
                        cursor: 'pointer',
                        outline: 'none',
                      }}
                    >
                      {STATUS_OPTIONS.map((opt) => (
                        <option key={opt.value} value={opt.value}>
                          {opt.label}
                        </option>
                      ))}
                    </select>
                  )}

                  {rule.field === 'priority' && (
                    <select
                      value={rule.value}
                      onChange={(e) => handleValueChange(rule.id, e.target.value)}
                      style={{
                        width: '100%',
                        padding: '0.45rem 0.65rem',
                        borderRadius: '10px',
                        border: '1px solid #cbd5e1',
                        fontSize: '0.8rem',
                        background: '#ffffff',
                        color: '#1e293b',
                        fontWeight: '500',
                        cursor: 'pointer',
                        outline: 'none',
                      }}
                    >
                      {PRIORITY_OPTIONS.map((opt) => (
                        <option key={opt.value} value={opt.value}>
                          {opt.label}
                        </option>
                      ))}
                    </select>
                  )}
                </div>

                {/* Remove Trash Button */}
                <button
                  type="button"
                  onClick={() => handleRemoveRule(rule.id)}
                  title="Remove filter"
                  style={{
                    background: 'transparent',
                    border: 'none',
                    color: '#94a3b8',
                    cursor: 'pointer',
                    padding: '0.35rem',
                    borderRadius: '6px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    transition: 'color 0.15s ease',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.color = '#ef4444'
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.color = '#94a3b8'
                  }}
                >
                  <FaTrashAlt style={{ fontSize: '0.78rem' }} />
                </button>
              </div>
            )
          })
        )}
      </div>

      {/* Footer Actions */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          paddingTop: '0.5rem',
          borderTop: '1px solid #f1f5f9',
        }}
      >
        <button
          type="button"
          onClick={handleAddRule}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.35rem',
            background: 'transparent',
            border: 'none',
            color: '#2563eb',
            fontSize: '0.82rem',
            fontWeight: '700',
            cursor: 'pointer',
            padding: '0.2rem 0',
          }}
        >
          <FaPlus style={{ fontSize: '0.7rem' }} />
          <span>Add Filter</span>
        </button>

        {filterRules.length > 0 && (
          <button
            type="button"
            onClick={() => onFilterRulesChange([])}
            style={{
              background: 'transparent',
              border: 'none',
              color: '#64748b',
              fontSize: '0.76rem',
              fontWeight: '600',
              cursor: 'pointer',
              textDecoration: 'underline',
            }}
          >
            Clear all
          </button>
        )}
      </div>
    </div>
  )
}

export default TaskFilterPopover
