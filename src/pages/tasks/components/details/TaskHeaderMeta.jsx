import React, { useState } from 'react'
import {
  FaRegClock,
  FaProjectDiagram,
  FaLink,
  FaEllipsisV,
  FaCheckCircle,
} from 'react-icons/fa'

const STATUS_OPTIONS = [
  { value: 'draft', label: 'Draft', bg: '#f1f5f9', color: '#475569' },
  { value: 'open', label: 'Pending', bg: '#fef3c7', color: '#b45309' },
  { value: 'checking', label: 'Checking', bg: '#fee2e2', color: '#b91c1c' },
  { value: 'in_progress', label: 'Processing', bg: '#ede9fe', color: '#6d28d9' },
  { value: 'completed', label: 'Completed', bg: '#dcfce7', color: '#15803d' },
]

export default function TaskHeaderMeta({
  task = {},
  creatorName = 'Admin',
  creatorAvatar = '',
  progress = 0,
  status = 'open',
  priority = 'medium',
  onUpdateStatus,
  onCopyLink,
}) {
  const [showStatusMenu, setShowStatusMenu] = useState(false)

  const currentStatusObj =
    STATUS_OPTIONS.find((s) => s.value === status) || {
      value: status,
      label: status ? status.replace('_', ' ').toUpperCase() : 'Pending',
      bg: '#ede9fe',
      color: '#6d28d9',
    }

  const initials = (creatorName || 'User')
    .split(' ')
    .map((n) => n[0])
    .join('')
    .slice(0, 2)
    .toUpperCase()

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '0.9rem 1.4rem',
        borderBottom: '1px solid #f1f5f9',
        backgroundColor: '#ffffff',
        gap: '0.75rem',
        flexWrap: 'wrap',
      }}
    >
      {/* Creator Info */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
        <div
          style={{
            width: '32px',
            height: '32px',
            borderRadius: '50%',
            backgroundColor: '#fef08a',
            color: '#854d0e',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '0.76rem',
            fontWeight: '800',
            border: '1px solid #fde047',
            overflow: 'hidden',
          }}
        >
          {creatorAvatar ? (
            <img
              src={creatorAvatar}
              alt={creatorName}
              style={{ width: '100%', height: '100%', objectFit: 'cover' }}
            />
          ) : (
            initials
          )}
        </div>
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          <span style={{ fontSize: '0.68rem', color: '#94a3b8', lineHeight: 1.1 }}>
            Created by
          </span>
          <span style={{ fontSize: '0.82rem', fontWeight: '700', color: '#1e293b' }}>
            {creatorName}
          </span>
        </div>
      </div>

      {/* Progress & Quick Actions */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
        {/* Progress Bar */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
          <span style={{ fontSize: '0.68rem', color: '#64748b', fontWeight: '600' }}>
            Progress
          </span>
          <div
            style={{
              width: '54px',
              height: '5px',
              backgroundColor: '#e2e8f0',
              borderRadius: '999px',
              overflow: 'hidden',
            }}
          >
            <div
              style={{
                width: `${Math.min(100, Math.max(0, progress))}%`,
                height: '100%',
                backgroundColor: '#10b981',
                borderRadius: '999px',
                transition: 'width 0.3s ease',
              }}
            />
          </div>
          <span style={{ fontSize: '0.74rem', fontWeight: '800', color: '#0f172a' }}>
            {progress}%
          </span>
        </div>

        {/* Status Dropdown Pill */}
        <div style={{ position: 'relative' }}>
          <button
            type="button"
            onClick={() => setShowStatusMenu(!showStatusMenu)}
            style={{
              backgroundColor: currentStatusObj.bg,
              color: currentStatusObj.color,
              border: 'none',
              padding: '0.28rem 0.65rem',
              borderRadius: '6px',
              fontSize: '0.74rem',
              fontWeight: '700',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '0.35rem',
              outline: 'none',
            }}
          >
            <span>{currentStatusObj.label}</span>
            <span style={{ fontSize: '0.62rem' }}>▾</span>
          </button>

          {showStatusMenu && (
            <div
              style={{
                position: 'absolute',
                top: '100%',
                right: 0,
                marginTop: '4px',
                backgroundColor: '#ffffff',
                border: '1px solid #e2e8f0',
                borderRadius: '8px',
                boxShadow: '0 8px 20px rgba(0,0,0,0.12)',
                zIndex: 50,
                minWidth: '120px',
                overflow: 'hidden',
                padding: '4px 0',
              }}
            >
              {STATUS_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => {
                    onUpdateStatus(opt.value)
                    setShowStatusMenu(false)
                  }}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.45rem',
                    width: '100%',
                    padding: '0.4rem 0.75rem',
                    backgroundColor: status === opt.value ? '#f1f5f9' : 'transparent',
                    border: 'none',
                    textAlign: 'left',
                    fontSize: '0.74rem',
                    fontWeight: '600',
                    color: opt.color,
                    cursor: 'pointer',
                  }}
                >
                  <span
                    style={{
                      width: '7px',
                      height: '7px',
                      borderRadius: '50%',
                      backgroundColor: opt.color,
                    }}
                  />
                  <span>{opt.label}</span>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
