import React from 'react'
import { FaStar, FaRegStar } from 'react-icons/fa'

export const WorkloadUserRow = ({
  user,
  isSelected,
  onSelect,
  isFavorite,
  onToggleFavorite,
}) => {
  const name = user.name || user.username || user.email || 'Team Member'
  const email = user.email || ''
  const role = user.role || 'User'
  const department = user.department || 'Operations'
  const estimatedHours = user.estimatedHours || 0
  const capacityHours = user.weeklyCapacityHours || 40
  const workloadPercent = user.workloadPercent || Math.min(Math.round((estimatedHours / capacityHours) * 100), 200)

  // Status color for capacity bar
  const isOverloaded = workloadPercent > 100
  const isOptimal = workloadPercent >= 50 && workloadPercent <= 100
  const barColor = isOverloaded ? '#dc2626' : isOptimal ? '#15803d' : '#2563eb'

  // User initials
  const initials = name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join('') || name.slice(0, 2).toUpperCase()

  return (
    <div
      onClick={() => onSelect(user)}
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: '0.45rem',
        padding: '0.65rem 0.75rem',
        borderRadius: '10px',
        cursor: 'pointer',
        transition: 'all 0.15s ease',
        backgroundColor: isSelected ? '#fef2f2' : '#ffffff',
        borderLeft: isSelected ? '3.5px solid #c60016' : '3.5px solid transparent',
        borderTop: isSelected ? '1px solid #fee2e2' : '1px solid #f1f5f9',
        borderRight: isSelected ? '1px solid #fee2e2' : '1px solid #f1f5f9',
        borderBottom: isSelected ? '1px solid #fee2e2' : '1px solid #f1f5f9',
        boxShadow: isSelected ? '0 2px 8px rgba(198, 0, 22, 0.08)' : 'none',
      }}
      onMouseEnter={(e) => {
        if (!isSelected) {
          e.currentTarget.style.backgroundColor = '#fafafa'
          e.currentTarget.style.borderColor = '#e2e8f0'
        }
      }}
      onMouseLeave={(e) => {
        if (!isSelected) {
          e.currentTarget.style.backgroundColor = '#ffffff'
          e.currentTarget.style.borderColor = '#f1f5f9'
        }
      }}
    >
      {/* Top Row: Avatar, Name, Favorite Star */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.5rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.55rem', minWidth: 0, flex: 1 }}>
          {/* Avatar with Online Presence Dot */}
          <div style={{ position: 'relative', flexShrink: 0 }}>
            <div
              style={{
                width: '32px',
                height: '32px',
                borderRadius: '50%',
                backgroundColor: isSelected ? '#c60016' : '#e2e8f0',
                color: isSelected ? '#ffffff' : '#334155',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '0.78rem',
                fontWeight: '700',
                textTransform: 'uppercase',
                boxShadow: isSelected ? '0 2px 6px rgba(198, 0, 22, 0.25)' : 'none',
              }}
            >
              {initials}
            </div>
            {/* Active presence dot */}
            <span
              style={{
                position: 'absolute',
                bottom: 0,
                right: 0,
                width: '8px',
                height: '8px',
                borderRadius: '50%',
                backgroundColor: '#16a34a',
                border: '1.5px solid #ffffff',
              }}
              title="Active in workspace"
            />
          </div>

          {/* Name & Dept */}
          <div style={{ minWidth: 0, flex: 1 }}>
            <div
              style={{
                fontSize: '0.82rem',
                fontWeight: isSelected ? '800' : '700',
                color: isSelected ? '#1e293b' : '#334155',
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
              }}
              title={name}
            >
              {name}
            </div>
            <div
              style={{
                fontSize: '0.7rem',
                color: '#64748b',
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                textTransform: 'capitalize',
              }}
            >
              {role}
            </div>
          </div>
        </div>

        {/* Favorite Star (Optimistic toggle) */}
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation()
            onToggleFavorite(email)
          }}
          style={{
            background: 'none',
            border: 'none',
            color: isFavorite ? '#f59e0b' : '#cbd5e1',
            cursor: 'pointer',
            padding: '4px',
            fontSize: '0.85rem',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            transition: 'color 0.15s ease, transform 0.15s ease',
          }}
          title={isFavorite ? 'Remove from favorites' : 'Mark as favorite'}
        >
          {isFavorite ? <FaStar /> : <FaRegStar />}
        </button>
      </div>

      {/* Bottom Row: Workload Capacity Bar */}
      <div>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            fontSize: '0.68rem',
            color: '#64748b',
            marginBottom: '0.2rem',
          }}
        >
          <span>
            {estimatedHours}h / {capacityHours}h
          </span>
          <span style={{ fontWeight: '700', color: barColor }}>
            {workloadPercent}%
          </span>
        </div>
        <div
          style={{
            width: '100%',
            height: '4px',
            borderRadius: '2px',
            backgroundColor: '#e2e8f0',
            overflow: 'hidden',
          }}
        >
          <div
            style={{
              width: `${Math.min(workloadPercent, 100)}%`,
              height: '100%',
              backgroundColor: barColor,
              borderRadius: '2px',
              transition: 'width 0.3s ease',
            }}
          />
        </div>
      </div>
    </div>
  )
}

export default WorkloadUserRow
