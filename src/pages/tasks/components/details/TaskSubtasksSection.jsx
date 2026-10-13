import React, { useState } from 'react'
import { FaPlus, FaTrash, FaCheck, FaCalendarAlt, FaUser } from 'react-icons/fa'

export default function TaskSubtasksSection({
  subtasks = [],
  onAddSubtask,
  onToggleSubtask,
  onDeleteSubtask,
}) {
  const [newTitle, setNewTitle] = useState('')
  const [newStatus, setNewStatus] = useState('Assigned')
  const [showInputRow, setShowInputRow] = useState(false)

  const handleCreate = (e) => {
    if (e) e.preventDefault()
    const trimmed = String(newTitle || '').trim()
    if (!trimmed) return
    onAddSubtask({
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      title: trimmed,
      status: newStatus,
      completed: false,
      dueDate: '',
    })
    setNewTitle('')
    setShowInputRow(false)
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
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
          SUB TASKS ({subtasks.length})
        </span>
      </div>

      {/* Subtasks List */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
        {subtasks.map((st) => (
          <div
            key={st.id}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '0.35rem 0.5rem',
              borderRadius: '8px',
              backgroundColor: st.completed ? '#f8fafc' : '#ffffff',
              border: '1px solid #f1f5f9',
              transition: 'background-color 0.1s',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.55rem', flex: 1, minWidth: 0 }}>
              <button
                type="button"
                onClick={() => onToggleSubtask(st.id)}
                style={{
                  width: '16px',
                  height: '16px',
                  borderRadius: '4px',
                  border: st.completed ? '1px solid #10b981' : '1.5px solid #cbd5e1',
                  backgroundColor: st.completed ? '#10b981' : '#ffffff',
                  color: '#ffffff',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '0.6rem',
                  cursor: 'pointer',
                  padding: 0,
                  flexShrink: 0,
                }}
              >
                {st.completed && <FaCheck />}
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
                  color: st.completed ? '#94a3b8' : '#1e293b',
                  textDecoration: st.completed ? 'line-through' : 'none',
                  fontWeight: '500',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                }}
              >
                {st.title}
              </span>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexShrink: 0 }}>
              <span
                style={{
                  fontSize: '0.68rem',
                  fontWeight: '700',
                  padding: '2px 8px',
                  borderRadius: '6px',
                  backgroundColor: st.completed ? '#dcfce7' : '#e0f2fe',
                  color: st.completed ? '#166534' : '#0369a1',
                }}
              >
                {st.completed ? 'Done' : st.status || 'Assigned'}
              </span>

              {st.dueDate && (
                <span style={{ fontSize: '0.68rem', color: '#94a3b8' }}>
                  {st.dueDate}
                </span>
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
                  fontSize: '0.7rem',
                  display: 'flex',
                  alignItems: 'center',
                }}
                title="Delete subtask"
              >
                <FaTrash />
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Inline Creation Row */}
      {showInputRow ? (
        <form
          onSubmit={handleCreate}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            padding: '0.35rem 0.6rem',
            borderRadius: '8px',
            border: '1px dashed #cbd5e1',
            backgroundColor: '#fafbfc',
          }}
        >
          <input
            type="text"
            placeholder="Write your sub task..."
            value={newTitle}
            onChange={(e) => setNewTitle(e.target.value)}
            autoFocus
            style={{
              flex: 1,
              border: 'none',
              outline: 'none',
              fontSize: '0.78rem',
              backgroundColor: 'transparent',
              color: '#1e293b',
            }}
          />
          <select
            value={newStatus}
            onChange={(e) => setNewStatus(e.target.value)}
            style={{
              fontSize: '0.7rem',
              border: '1px solid #e2e8f0',
              borderRadius: '6px',
              padding: '2px 6px',
              backgroundColor: '#ffffff',
              color: '#475569',
              outline: 'none',
            }}
          >
            <option value="Assigned">Assigned</option>
            <option value="In Progress">In Progress</option>
            <option value="Done">Done</option>
          </select>
          <button
            type="submit"
            disabled={!newTitle.trim()}
            style={{
              padding: '3px 10px',
              fontSize: '0.72rem',
              fontWeight: '700',
              backgroundColor: '#2563eb',
              color: '#ffffff',
              border: 'none',
              borderRadius: '6px',
              cursor: newTitle.trim() ? 'pointer' : 'not-allowed',
            }}
          >
            Add
          </button>
          <button
            type="button"
            onClick={() => setShowInputRow(false)}
            style={{
              background: 'none',
              border: 'none',
              fontSize: '0.72rem',
              color: '#94a3b8',
              cursor: 'pointer',
            }}
          >
            Cancel
          </button>
        </form>
      ) : (
        <button
          type="button"
          onClick={() => setShowInputRow(true)}
          style={{
            alignSelf: 'flex-start',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.35rem',
            background: 'none',
            border: 'none',
            color: '#2563eb',
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
  )
}
