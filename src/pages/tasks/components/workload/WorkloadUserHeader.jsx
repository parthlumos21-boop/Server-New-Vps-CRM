import React from 'react'
import {
  FaSyncAlt,
  FaSlidersH,
} from 'react-icons/fa'
import { TaskStatusBadge } from '../common/TaskStatusBadge'

export const WorkloadUserHeader = ({
  user,
  onRefresh,
  onOpenCapacitySettings,
  isRefreshing = false,
}) => {
  const name = user?.name || user?.username || user?.email || 'Select a user'
  const email = user?.email || ''
  const role = user?.role || 'User'
  const department = user?.department || 'Operations'
  const slaRate = user?.slaComplianceRate ?? 100

  const initials = name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase())
    .join('') || name.slice(0, 2).toUpperCase()

  return (
    <div
      style={{
        backgroundColor: '#ffffff',
        border: '1.5px solid #e2e8f0',
        borderRadius: '16px',
        padding: '0.95rem 1.25rem',
        boxShadow: '0 4px 18px rgba(0, 0, 0, 0.03)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '1rem',
      }}
    >
      {/* User Identity Details */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
        <div
          style={{
            width: '44px',
            height: '44px',
            borderRadius: '50%',
            backgroundColor: '#c60016',
            color: '#ffffff',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '1rem',
            fontWeight: '800',
            textTransform: 'uppercase',
            boxShadow: '0 3px 10px rgba(198, 0, 22, 0.2)',
            flexShrink: 0,
          }}
        >
          {initials}
        </div>

        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.55rem', flexWrap: 'wrap' }}>
            <h2
              style={{
                margin: 0,
                fontSize: '1.15rem',
                fontWeight: '800',
                color: '#1e293b',
                letterSpacing: '-0.01em',
              }}
            >
              {name}
            </h2>

            {/* SLA Badge with small subtext styling */}
            <span style={{ fontSize: '0.72rem', fontWeight: '600', display: 'inline-flex', alignItems: 'center' }}>
              <TaskStatusBadge
                value={slaRate >= 90 ? 'compliant' : slaRate >= 75 ? 'at_risk' : 'breached'}
                type="sla"
              />
            </span>
          </div>

          <div
            style={{
              marginTop: '0.2rem',
              fontSize: '0.76rem',
              color: '#64748b',
              display: 'flex',
              alignItems: 'center',
              gap: '0.45rem',
            }}
          >
            <span style={{ fontWeight: '700', textTransform: 'capitalize', color: '#334155' }}>
              {role}
            </span>
            {email && (
              <>
                <span>&bull;</span>
                <span style={{ color: '#64748b' }}>{email}</span>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Right Controls: Refresh & Capacity Settings */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', flexWrap: 'wrap' }}>
        <button
          type="button"
          onClick={onRefresh}
          disabled={isRefreshing}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.35rem',
            padding: '0.35rem 0.75rem',
            backgroundColor: '#ffffff',
            border: '1px solid #cbd5e1',
            borderRadius: '8px',
            fontSize: '0.74rem',
            fontWeight: '700',
            color: '#334155',
            cursor: isRefreshing ? 'not-allowed' : 'pointer',
            transition: 'all 0.15s ease',
          }}
          title="Refresh analytics"
        >
          <FaSyncAlt className={isRefreshing ? 'ap-spin' : ''} style={{ fontSize: '0.7rem', color: '#c60016' }} />
          <span>{isRefreshing ? 'Updating...' : 'Refresh'}</span>
        </button>

        {onOpenCapacitySettings && (
          <button
            type="button"
            onClick={onOpenCapacitySettings}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.35rem',
              padding: '0.35rem 0.75rem',
              backgroundColor: '#ffffff',
              border: '1px solid #cbd5e1',
              borderRadius: '8px',
              fontSize: '0.74rem',
              fontWeight: '700',
              color: '#334155',
              cursor: 'pointer',
              transition: 'all 0.15s ease',
            }}
            title="Edit weekly capacity hours"
          >
            <FaSlidersH style={{ fontSize: '0.7rem', color: '#c60016' }} />
            <span>Capacity</span>
          </button>
        )}
      </div>
    </div>
  )
}

export default WorkloadUserHeader
