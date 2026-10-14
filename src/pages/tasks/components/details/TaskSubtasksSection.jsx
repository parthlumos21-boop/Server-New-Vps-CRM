import React, { useState } from 'react'
import {
  FaPlus,
  FaTrash,
  FaCheckCircle,
  FaRegCircle,
  FaCalendarAlt,
  FaUser,
  FaTimes,
} from 'react-icons/fa'

export default function TaskSubtasksSection({
  subtasks = [],
  availableUsers = [],
  onAddSubtask,
  onToggleSubtask,
  onDeleteSubtask,
}) {
  const [newTitle, setNewTitle] = useState('')
  const [newStatus, setNewStatus] = useState('Assigned')
  const [newDueDate, setNewDueDate] = useState('')
  const [newAssignee, setNewAssignee] = useState('')
  const [showInputRow, setShowInputRow] = useState(false)

  const handleCreate = (e) => {
    if (e) e.preventDefault()
    const trimmed = String(newTitle || '').trim()
    if (!trimmed) return

    onAddSubtask({
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      title: trimmed,
      status: newStatus || 'Assigned',
      completed: newStatus === 'Done',
      dueDate: newDueDate || '',
      assignedTo: newAssignee || '',
    })

    setNewTitle('')
    setNewStatus('Assigned')
    setNewDueDate('')
    setNewAssignee('')
    setShowInputRow(false)
  }

  const completedCount = subtasks.filter((st) => st.completed).length

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
      {/* Header Bar */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <span
          style={{
            fontSize: '0.72rem',
            fontWeight: '800',
            color: '#64748b',
            textTransform: 'uppercase',
            letterSpacing: '0.04em',
          }}
        >
          SUB TASKS ({completedCount}/{subtasks.length})
        </span>

        {!showInputRow && (
          <button
            type="button"
            onClick={() => setShowInputRow(true)}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.35rem',
              background: 'none',
              border: 'none',
              color: '#c60016',
              fontSize: '0.76rem',
              fontWeight: '700',
              cursor: 'pointer',
              padding: '2px 0',
            }}
          >
            <FaPlus style={{ fontSize: '0.65rem' }} />
            <span>Add Sub task</span>
          </button>
        )}
      </div>

      {/* Subtasks List */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
        {subtasks.length === 0 ? (
          <div
            style={{
              fontSize: '0.76rem',
              color: '#94a3b8',
              fontStyle: 'italic',
              padding: '0.2rem 0',
            }}
          >
            No sub tasks added yet.
          </div>
        ) : (
          subtasks.map((st) => {
            const matchedUser = (availableUsers || []).find((u) => {
              const uEmail = String(u.email || '').toLowerCase()
              const uId = String(u.id || u.legacyId || '')
              const target = String(st.assignedTo || '').toLowerCase()
              return uEmail === target || uId === target
            })
            const assigneeName = matchedUser?.name || st.assignedTo || ''
            const assigneeInitial = assigneeName
              ? assigneeName.charAt(0).toUpperCase()
              : ''

            return (
              <div
                key={st.id}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '0.4rem 0.65rem',
                  borderRadius: '8px',
                  backgroundColor: st.completed ? '#f0fdf4' : '#ffffff',
                  border: '1px solid #f1f5f9',
                  transition: 'background-color 0.1s',
                  gap: '0.5rem',
                }}
              >
                {/* Left: Checkmark + Dot + Title */}
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.55rem',
                    flex: 1,
                    minWidth: 0,
                    cursor: 'pointer',
                  }}
                  onClick={() => onToggleSubtask(st.id)}
                >
                  <button
                    type="button"
                    style={{
                      background: 'none',
                      border: 'none',
                      cursor: 'pointer',
                      padding: 0,
                      display: 'flex',
                      alignItems: 'center',
                      fontSize: '0.88rem',
                      color: st.completed ? '#10b981' : '#cbd5e1',
                      flexShrink: 0,
                    }}
                  >
                    {st.completed ? <FaCheckCircle /> : <FaRegCircle />}
                  </button>

                  <span
                    style={{
                      width: '6px',
                      height: '6px',
                      borderRadius: '2px',
                      backgroundColor: '#f59e0b',
                      flexShrink: 0,
                    }}
                  />

                  <span
                    style={{
                      fontSize: '0.8rem',
                      color: st.completed ? '#64748b' : '#1e293b',
                      textDecoration: st.completed ? 'line-through' : 'none',
                      fontWeight: st.completed ? '500' : '600',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {st.title}
                  </span>
                </div>

                {/* Right: Status Pill + Due Date + Assignee Avatar + Delete */}
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem',
                    flexShrink: 0,
                  }}
                >
                  <span
                    style={{
                      fontSize: '0.68rem',
                      fontWeight: '700',
                      padding: '2px 8px',
                      borderRadius: '6px',
                      backgroundColor: st.completed
                        ? '#dcfce7'
                        : st.status === 'In Progress'
                        ? '#ede9fe'
                        : '#e0f2fe',
                      color: st.completed
                        ? '#166534'
                        : st.status === 'In Progress'
                        ? '#6d28d9'
                        : '#0369a1',
                    }}
                  >
                    {st.completed ? 'Done' : st.status || 'Assigned'}
                  </span>

                  {st.dueDate && (
                    <span
                      style={{
                        fontSize: '0.68rem',
                        color: '#64748b',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.25rem',
                      }}
                      title="Due Date"
                    >
                      <FaCalendarAlt style={{ fontSize: '0.62rem', color: '#94a3b8' }} />
                      {st.dueDate}
                    </span>
                  )}

                  {assigneeInitial && (
                    <div
                      style={{
                        width: '20px',
                        height: '20px',
                        borderRadius: '50%',
                        backgroundColor: '#fee2e2',
                        color: '#c60016',
                        fontSize: '0.62rem',
                        fontWeight: '800',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        flexShrink: 0,
                        border: '1px solid #fca5a5',
                      }}
                      title={`Assigned to: ${assigneeName}`}
                    >
                      {assigneeInitial}
                    </div>
                  )}

                  <button
                    type="button"
                    onClick={() => onDeleteSubtask(st.id)}
                    style={{
                      background: 'none',
                      border: 'none',
                      color: '#cbd5e1',
                      cursor: 'pointer',
                      padding: '3px',
                      fontSize: '0.72rem',
                      display: 'flex',
                      alignItems: 'center',
                    }}
                    title="Delete subtask"
                  >
                    <FaTrash />
                  </button>
                </div>
              </div>
            )
          })
        )}
      </div>

      {/* Inline Creation Row (Matching Reference Design) */}
      {showInputRow && (
        <form
          onSubmit={handleCreate}
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: '0.5rem',
            padding: '0.65rem 0.75rem',
            borderRadius: '10px',
            border: '1px solid #fecdd3',
            backgroundColor: '#fff1f2',
            boxShadow: '0 2px 8px rgba(198, 0, 22, 0.05)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <span
              style={{
                width: '6px',
                height: '6px',
                borderRadius: '2px',
                backgroundColor: '#f59e0b',
                flexShrink: 0,
              }}
            />
            <input
              type="text"
              placeholder="Write your sub task!"
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
              autoFocus
              style={{
                flex: 1,
                border: 'none',
                outline: 'none',
                fontSize: '0.82rem',
                backgroundColor: 'transparent',
                color: '#1e293b',
                fontWeight: '600',
              }}
            />
          </div>

          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '0.5rem',
              flexWrap: 'wrap',
              borderTop: '1px solid #ffe4e6',
              paddingTop: '0.45rem',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', flexWrap: 'wrap' }}>
              {/* Status Select */}
              <select
                value={newStatus}
                onChange={(e) => setNewStatus(e.target.value)}
                style={{
                  fontSize: '0.72rem',
                  fontWeight: '700',
                  border: '1px solid #cbd5e1',
                  borderRadius: '6px',
                  padding: '3px 8px',
                  backgroundColor: '#ffffff',
                  color: '#475569',
                  outline: 'none',
                }}
              >
                <option value="Assigned">Assigned</option>
                <option value="In Progress">In Progress</option>
                <option value="Done">Done</option>
              </select>

              {/* Due Date Input */}
              <input
                type="date"
                value={newDueDate}
                onChange={(e) => setNewDueDate(e.target.value)}
                style={{
                  fontSize: '0.72rem',
                  border: '1px solid #cbd5e1',
                  borderRadius: '6px',
                  padding: '2px 6px',
                  backgroundColor: '#ffffff',
                  color: '#475569',
                  outline: 'none',
                }}
                title="Target Due Date"
              />

              {/* Assignee Select */}
              {availableUsers.length > 0 && (
                <select
                  value={newAssignee}
                  onChange={(e) => setNewAssignee(e.target.value)}
                  style={{
                    fontSize: '0.72rem',
                    border: '1px solid #cbd5e1',
                    borderRadius: '6px',
                    padding: '3px 8px',
                    backgroundColor: '#ffffff',
                    color: '#475569',
                    outline: 'none',
                    maxWidth: '140px',
                  }}
                >
                  <option value="">Assign Member</option>
                  {availableUsers.map((u) => {
                    const email = u.email || ''
                    const name = u.name || email.split('@')[0]
                    return (
                      <option key={email} value={email}>
                        {name}
                      </option>
                    )
                  })}
                </select>
              )}
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
              <button
                type="button"
                onClick={() => setShowInputRow(false)}
                style={{
                  background: 'none',
                  border: 'none',
                  fontSize: '0.74rem',
                  color: '#94a3b8',
                  cursor: 'pointer',
                  padding: '3px 8px',
                }}
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={!newTitle.trim()}
                style={{
                  padding: '4px 12px',
                  fontSize: '0.74rem',
                  fontWeight: '700',
                  backgroundColor: '#c60016',
                  color: '#ffffff',
                  border: 'none',
                  borderRadius: '6px',
                  cursor: newTitle.trim() ? 'pointer' : 'not-allowed',
                }}
              >
                Add
              </button>
            </div>
          </div>
        </form>
      )}
    </div>
  )
}
