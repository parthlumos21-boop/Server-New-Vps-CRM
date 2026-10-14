import React, { useState } from 'react'
import {
  FaPlus,
  FaCheckCircle,
  FaRegCircle,
  FaCalendarAlt,
  FaRegCommentDots,
  FaTrash,
} from 'react-icons/fa'

export default function TaskChecklistSection({
  checklist = [],
  groupTitle = 'General Checklist',
  isMandatory = false,
  onToggleItem,
  onAddItem,
  onDeleteItem,
}) {
  const [newItemTitle, setNewItemTitle] = useState('')
  const [showInput, setShowInput] = useState(false)

  const handleCreate = (e) => {
    if (e) e.preventDefault()
    const trimmed = String(newItemTitle || '').trim()
    if (!trimmed) return
    onAddItem({
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      title: trimmed,
      completed: false,
      dueDate: '',
    })
    setNewItemTitle('')
    setShowInput(false)
  }

  const completedCount = checklist.filter((i) => i.completed).length

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
      {/* Header Bar */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '0.5rem',
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
          CHECKLIST ({completedCount}/{checklist.length})
        </span>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <label
            style={{
              fontSize: '0.7rem',
              color: '#475569',
              fontWeight: '600',
              display: 'flex',
              alignItems: 'center',
              gap: '0.35rem',
              cursor: 'pointer',
            }}
          >
            <input
              type="checkbox"
              checked={Boolean(isMandatory)}
              readOnly
              style={{ accentColor: '#c60016' }}
            />
            <span>Mark as mandatory</span>
          </label>

          {!showInput && (
            <button
              type="button"
              onClick={() => setShowInput(true)}
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
              <span>Add Checklist</span>
            </button>
          )}
        </div>
      </div>

      {/* Group Title */}
      <div style={{ fontSize: '0.78rem', fontWeight: '700', color: '#1e293b' }}>
        {groupTitle}
      </div>

      {/* Checklist Items */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
        {checklist.length === 0 ? (
          <div style={{ fontSize: '0.76rem', color: '#94a3b8', fontStyle: 'italic', padding: '0.2rem 0' }}>
            No checklist items defined.
          </div>
        ) : (
          checklist.map((item) => (
            <div
              key={item.id}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '0.35rem 0.5rem',
                borderRadius: '8px',
                backgroundColor: item.completed ? '#f0fdf4' : '#ffffff',
                border: '1px solid #f1f5f9',
                gap: '0.65rem',
              }}
            >
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.55rem',
                  flex: 1,
                  minWidth: 0,
                  cursor: 'pointer',
                }}
                onClick={() => onToggleItem(item.id)}
              >
                {item.completed ? (
                  <FaCheckCircle style={{ color: '#10b981', fontSize: '0.88rem', flexShrink: 0 }} />
                ) : (
                  <FaRegCircle style={{ color: '#cbd5e1', fontSize: '0.88rem', flexShrink: 0 }} />
                )}

                <span
                  style={{
                    fontSize: '0.8rem',
                    color: item.completed ? '#64748b' : '#1e293b',
                    textDecoration: item.completed ? 'line-through' : 'none',
                    fontWeight: item.completed ? '500' : '600',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {item.title}
                </span>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '0.55rem', flexShrink: 0 }}>
                {item.dueDate && (
                  <span
                    style={{
                      fontSize: '0.68rem',
                      color: '#94a3b8',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.25rem',
                    }}
                  >
                    <FaCalendarAlt style={{ fontSize: '0.62rem' }} />
                    {item.dueDate}
                  </span>
                )}

                <button
                  type="button"
                  onClick={() => onDeleteItem(item.id)}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: '#cbd5e1',
                    cursor: 'pointer',
                    padding: '2px',
                    fontSize: '0.7rem',
                  }}
                  title="Delete item"
                >
                  <FaTrash />
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Inline Creation */}
      {showInput && (
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
            placeholder="Add checklist item..."
            value={newItemTitle}
            onChange={(e) => setNewItemTitle(e.target.value)}
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
          <button
            type="submit"
            disabled={!newItemTitle.trim()}
            style={{
              padding: '3px 10px',
              fontSize: '0.72rem',
              fontWeight: '700',
              backgroundColor: '#c60016',
              color: '#ffffff',
              border: 'none',
              borderRadius: '6px',
              cursor: newItemTitle.trim() ? 'pointer' : 'not-allowed',
            }}
          >
            Add
          </button>
          <button
            type="button"
            onClick={() => setShowInput(false)}
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
      )}
    </div>
  )
}
