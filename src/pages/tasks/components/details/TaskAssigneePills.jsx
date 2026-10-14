import React, { useState } from 'react'
import { FaUserPlus, FaTimes, FaPlus } from 'react-icons/fa'

export default function TaskAssigneePills({
  assignees = [],
  availableUsers = [],
  onAddAssignee,
  onRemoveAssignee,
}) {
  const [showPicker, setShowPicker] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')

  const filteredUsers = availableUsers.filter((u) => {
    const email = String(u.email || '').toLowerCase()
    const name = String(u.name || u.username || '').toLowerCase()
    const query = searchQuery.toLowerCase().trim()
    const isAlreadyAssigned = assignees.some((a) => {
      const aEmail = typeof a === 'string' ? a : a.email || a.id
      return String(aEmail).toLowerCase() === email
    })
    return !isAlreadyAssigned && (name.includes(query) || email.includes(query))
  })

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '0.5rem',
        }}
      >
        {/* Assignee Pills */}
        {assignees.map((assignee) => {
          const email = typeof assignee === 'string' ? assignee : assignee.email || ''
          const name =
            typeof assignee === 'object' && assignee.name
              ? assignee.name
              : availableUsers.find(
                  (u) => String(u.email || '').toLowerCase() === email.toLowerCase()
                )?.name || email.split('@')[0] || 'User'

          const initials = name
            .split(' ')
            .map((n) => n[0])
            .join('')
            .slice(0, 2)
            .toUpperCase()

          return (
            <div
              key={email}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.4rem',
                backgroundColor: '#f1f5f9',
                border: '1px solid #e2e8f0',
                borderRadius: '999px',
                padding: '2px 8px 2px 3px',
                fontSize: '0.74rem',
                color: '#1e293b',
              }}
            >
              <div
                style={{
                  width: '20px',
                  height: '20px',
                  borderRadius: '50%',
                  backgroundColor: '#cbd5e1',
                  color: '#334155',
                  fontSize: '0.62rem',
                  fontWeight: '700',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                {initials}
              </div>
              <span style={{ fontWeight: '600' }}>{name}</span>
              <button
                type="button"
                onClick={() => onRemoveAssignee(email)}
                style={{
                  background: 'none',
                  border: 'none',
                  color: '#94a3b8',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  padding: '2px',
                  marginLeft: '2px',
                  fontSize: '0.65rem',
                }}
                title="Remove"
              >
                <FaTimes />
              </button>
            </div>
          )
        })}

        {/* Add Assignee Button & Popover */}
        <div style={{ position: 'relative' }}>
          <button
            type="button"
            onClick={() => setShowPicker(!showPicker)}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.3rem',
              backgroundColor: '#ffffff',
              border: '1px dashed #cbd5e1',
              borderRadius: '999px',
              padding: '3px 10px',
              fontSize: '0.72rem',
              color: '#64748b',
              cursor: 'pointer',
              fontWeight: '600',
            }}
          >
            <FaPlus style={{ fontSize: '0.6rem', color: '#c60016' }} />
            <span>Assignee</span>
          </button>

          {showPicker && (
            <div
              style={{
                position: 'absolute',
                top: '100%',
                left: 0,
                marginTop: '4px',
                backgroundColor: '#ffffff',
                border: '1px solid #e2e8f0',
                borderRadius: '10px',
                boxShadow: '0 10px 25px rgba(0,0,0,0.15)',
                zIndex: 60,
                width: '210px',
                padding: '0.5rem',
              }}
            >
              <input
                type="text"
                placeholder="Search user..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                autoFocus
                style={{
                  width: '100%',
                  padding: '4px 8px',
                  fontSize: '0.74rem',
                  border: '1px solid #e2e8f0',
                  borderRadius: '6px',
                  outline: 'none',
                  marginBottom: '0.4rem',
                }}
              />
              <div style={{ maxHeight: '150px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '2px' }}>
                {filteredUsers.length === 0 ? (
                  <div style={{ fontSize: '0.7rem', color: '#94a3b8', padding: '0.3rem', textAlign: 'center' }}>
                    No users available
                  </div>
                ) : (
                  filteredUsers.map((u) => {
                    const name = u.name || u.username || u.email
                    const email = u.email || ''
                    return (
                      <button
                        key={email}
                        type="button"
                        onClick={() => {
                          onAddAssignee(email)
                          setShowPicker(false)
                          setSearchQuery('')
                        }}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '0.45rem',
                          padding: '4px 6px',
                          border: 'none',
                          background: 'none',
                          borderRadius: '6px',
                          textAlign: 'left',
                          cursor: 'pointer',
                          fontSize: '0.72rem',
                          color: '#1e293b',
                          transition: 'background 0.1s',
                        }}
                        onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#f1f5f9')}
                        onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
                      >
                        <span
                          style={{
                            width: '18px',
                            height: '18px',
                            borderRadius: '50%',
                            backgroundColor: '#e2e8f0',
                            fontSize: '0.58rem',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontWeight: '700',
                          }}
                        >
                          {(name[0] || 'U').toUpperCase()}
                        </span>
                        <div style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          <span style={{ fontWeight: '600', display: 'block' }}>{name}</span>
                        </div>
                      </button>
                    )
                  })
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
