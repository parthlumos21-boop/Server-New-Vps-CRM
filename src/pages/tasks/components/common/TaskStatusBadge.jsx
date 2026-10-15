import React from 'react'

const BADGE_STYLES = {
  // Statuses
  open: { bg: '#ffffff', text: '#1d4ed8', border: '#bfdbfe', label: 'Pending' },
  pending: { bg: '#ffffff', text: '#b45309', border: '#fde68a', label: 'Pending' },
  checking: { bg: '#ffffff', text: '#b91c1c', border: '#fca5a5', label: 'Checking' },
  in_progress: { bg: '#ffffff', text: '#6d28d9', border: '#ddd6fe', label: 'Processing' },
  processing: { bg: '#ffffff', text: '#6d28d9', border: '#ddd6fe', label: 'Processing' },
  review: { bg: '#ffffff', text: '#b45309', border: '#fde68a', label: 'Under Review' },
  completed: { bg: '#ffffff', text: '#15803d', border: '#bbf7d0', label: 'Completed' },
  closed: { bg: '#ffffff', text: '#475569', border: '#cbd5e1', label: 'Closed' },
  blocked: { bg: '#ffffff', text: '#b91c1c', border: '#fca5a5', label: 'Blocked' },
  draft: { bg: '#ffffff', text: '#475569', border: '#cbd5e1', label: 'Draft' },

  // Priorities
  urgent: { bg: '#ffffff', text: '#990011', border: '#fca5a5', label: 'Urgent' },
  high: { bg: '#ffffff', text: '#b91c1c', border: '#fca5a5', label: 'High' },
  medium: { bg: '#ffffff', text: '#b45309', border: '#fde68a', label: 'Medium' },
  low: { bg: '#ffffff', text: '#475569', border: '#cbd5e1', label: 'Low' },

  // SLA Statuses
  compliant: { bg: 'transparent', text: '#166534', border: 'none', label: 'SLA Compliant' },
  sla_compliant: { bg: 'transparent', text: '#166534', border: 'none', label: 'SLA Compliant' },
  at_risk: { bg: '#ffffff', text: '#d97706', border: '#fcd34d', label: 'SLA At Risk' },
  sla_at_risk: { bg: '#ffffff', text: '#d97706', border: '#fcd34d', label: 'SLA At Risk' },
  breached: { bg: 'transparent', text: '#dc2626', border: 'none', label: 'SLA Breached' },
  sla_breached: { bg: 'transparent', text: '#dc2626', border: 'none', label: 'SLA Breached' },
}

export const TaskStatusBadge = ({ value, type = 'status', className = '' }) => {
  const normalizedKey = String(value || '').trim().toLowerCase().replace(/[\s-]+/g, '_')
  const config = BADGE_STYLES[normalizedKey] || {
    bg: '#ffffff',
    text: '#475569',
    border: '#cbd5e1',
    label: String(value || 'Pending'),
  }

  const hasBorder = config.border && config.border !== 'none' && config.border !== 'transparent'

  return (
    <span
      className={className}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        padding: '0.18rem 0.55rem',
        borderRadius: '12px',
        fontSize: '0.74rem',
        fontWeight: '700',
        backgroundColor: config.bg || 'transparent',
        background: config.bg || 'transparent',
        color: config.text,
        border: hasBorder ? `1px solid ${config.border}` : 'none',
        whiteSpace: 'nowrap',
        lineHeight: 1.2,
      }}
    >
      {config.label}
    </span>
  )
}

export default TaskStatusBadge
