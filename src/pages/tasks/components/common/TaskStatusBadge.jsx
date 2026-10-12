import React from 'react'

const BADGE_STYLES = {
  // Statuses
  open: { bg: '#eff6ff', text: '#1d4ed8', border: '#bfdbfe', label: 'Open' },
  in_progress: { bg: '#ecfdf5', text: '#047857', border: '#a7f3d0', label: 'In Progress' },
  review: { bg: '#fef3c7', text: '#b45309', border: '#fde68a', label: 'Under Review' },
  completed: { bg: '#f0fdf4', text: '#15803d', border: '#bbf7d0', label: 'Completed' },
  closed: { bg: '#f1f5f9', text: '#475569', border: '#cbd5e1', label: 'Closed' },
  blocked: { bg: '#fef2f2', text: '#b91c1c', border: '#fecaca', label: 'Blocked' },

  // Priorities
  urgent: { bg: '#990011', text: '#ffffff', border: '#80000e', label: 'Urgent' },
  high: { bg: '#fee2e2', text: '#b91c1c', border: '#fca5a5', label: 'High' },
  medium: { bg: '#fef3c7', text: '#b45309', border: '#fde68a', label: 'Medium' },
  low: { bg: '#f1f5f9', text: '#475569', border: '#cbd5e1', label: 'Low' },

  // SLA Statuses
  compliant: { bg: '#f0fdf4', text: '#166534', border: '#bbf7d0', label: 'SLA Compliant' },
  at_risk: { bg: '#fffbeb', text: '#d97706', border: '#fcd34d', label: 'SLA At Risk' },
  breached: { bg: '#fef2f2', text: '#dc2626', border: '#fca5a5', label: 'SLA Breached' },
}

export const TaskStatusBadge = ({ value, type = 'status', className = '' }) => {
  const normalizedKey = String(value || '').trim().toLowerCase().replace(/[\s-]+/g, '_')
  const config = BADGE_STYLES[normalizedKey] || {
    bg: '#f8fafc',
    text: '#475569',
    border: '#e2e8f0',
    label: String(value || 'Pending'),
  }

  return (
    <span
      className={className}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        padding: '0.2rem 0.55rem',
        borderRadius: '12px',
        fontSize: '0.74rem',
        fontWeight: '700',
        backgroundColor: config.bg,
        color: config.text,
        border: `1px solid ${config.border}`,
        whiteSpace: 'nowrap',
        lineHeight: 1.2,
      }}
    >
      {config.label}
    </span>
  )
}

export default TaskStatusBadge
