import React, { useState, useRef, useEffect } from 'react'
import { FaChevronDown } from 'react-icons/fa'

const STATUS_CONFIGS = {
  draft: {
    label: 'Draft',
    bg: '#eff6ff',
    color: '#1d4ed8',
    border: '#bfdbfe',
  },
  pending: {
    label: 'Pending',
    bg: '#fffbeb',
    color: '#b45309',
    border: '#fde68a',
  },
  checking: {
    label: 'Checking',
    bg: '#fef2f2',
    color: '#dc2626',
    border: '#fecaca',
  },
  review: {
    label: 'Checking',
    bg: '#fef2f2',
    color: '#dc2626',
    border: '#fecaca',
  },
  processing: {
    label: 'Processing',
    bg: '#f5f3ff',
    color: '#6d28d9',
    border: '#ddd6fe',
  },
  in_progress: {
    label: 'Processing',
    bg: '#f5f3ff',
    color: '#6d28d9',
    border: '#ddd6fe',
  },
  open: {
    label: 'Pending',
    bg: '#fffbeb',
    color: '#b45309',
    border: '#fde68a',
  },
  completed: {
    label: 'Completed',
    bg: '#f0fdf4',
    color: '#15803d',
    border: '#bbf7d0',
  },
  closed: {
    label: 'Completed',
    bg: '#f0fdf4',
    color: '#15803d',
    border: '#bbf7d0',
  },
}

const SELECTABLE_STATUSES = [
  { key: 'draft', label: 'Draft' },
  { key: 'pending', label: 'Pending' },
  { key: 'checking', label: 'Checking' },
  { key: 'processing', label: 'Processing' },
  { key: 'completed', label: 'Completed' },
]

export const TaskStatusPill = ({ status = 'pending', onStatusChange, disabled = false }) => {
  const [isOpen, setIsOpen] = useState(false)
  const containerRef = useRef(null)

  const normalized = String(status || 'pending').toLowerCase()
  const config = STATUS_CONFIGS[normalized] || STATUS_CONFIGS.pending

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setIsOpen(false)
      }
    }
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside)
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [isOpen])

  const handleSelect = (key, e) => {
    e.stopPropagation()
    setIsOpen(false)
    if (onStatusChange && key !== normalized) {
      onStatusChange(key)
    }
  }

  return (
    <div
      ref={containerRef}
      style={{
        position: 'relative',
        display: 'inline-block',
      }}
      onClick={(e) => e.stopPropagation()}
    >
      <button
        type="button"
        disabled={disabled}
        onClick={(e) => {
          e.stopPropagation()
          if (!disabled) setIsOpen(!isOpen)
        }}
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '0.35rem',
          padding: '0.22rem 0.65rem',
          borderRadius: '999px',
          background: config.bg,
          color: config.color,
          border: `1px solid ${config.border}`,
          fontSize: '0.74rem',
          fontWeight: '700',
          cursor: disabled ? 'default' : 'pointer',
          transition: 'all 0.15s ease',
          outline: 'none',
          whiteSpace: 'nowrap',
          boxShadow: '0 1px 2px rgba(0, 0, 0, 0.04)',
        }}
      >
        <span>{config.label}</span>
        <FaChevronDown style={{ fontSize: '0.55rem', opacity: 0.8 }} />
      </button>

      {isOpen && (
        <div
          style={{
            position: 'absolute',
            top: 'calc(100% + 4px)',
            right: 0,
            zIndex: 99,
            background: '#ffffff',
            borderRadius: '10px',
            border: '1px solid #e2e8f0',
            boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.06)',
            padding: '0.3rem',
            minWidth: '120px',
            display: 'flex',
            flexDirection: 'column',
            gap: '0.2rem',
          }}
        >
          {SELECTABLE_STATUSES.map((item) => {
            const itemCfg = STATUS_CONFIGS[item.key]
            const isCurrent = normalized === item.key || (normalized === 'open' && item.key === 'pending') || (normalized === 'in_progress' && item.key === 'processing') || (normalized === 'review' && item.key === 'checking')
            return (
              <button
                key={item.key}
                type="button"
                onClick={(e) => handleSelect(item.key, e)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.45rem',
                  padding: '0.35rem 0.55rem',
                  borderRadius: '6px',
                  background: isCurrent ? itemCfg.bg : 'transparent',
                  color: isCurrent ? itemCfg.color : '#334155',
                  border: 'none',
                  fontSize: '0.74rem',
                  fontWeight: isCurrent ? '700' : '500',
                  textAlign: 'left',
                  cursor: 'pointer',
                  transition: 'background 0.12s ease',
                }}
                onMouseEnter={(e) => {
                  if (!isCurrent) e.currentTarget.style.background = '#f8fafc'
                }}
                onMouseLeave={(e) => {
                  if (!isCurrent) e.currentTarget.style.background = 'transparent'
                }}
              >
                <span
                  style={{
                    width: '6px',
                    height: '6px',
                    borderRadius: '50%',
                    background: itemCfg.color,
                  }}
                />
                <span>{item.label}</span>
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}

export default TaskStatusPill
