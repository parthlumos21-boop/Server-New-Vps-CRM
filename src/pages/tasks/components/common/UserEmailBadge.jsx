import React from 'react'

export const UserEmailBadge = ({ email, name, role, size = 'normal', showEmail = false }) => {
  const cleanEmail = String(email || '').trim()
  const isEmailAddress = cleanEmail.includes('@')
  const displayName = name || (isEmailAddress ? cleanEmail.split('@')[0] : cleanEmail) || 'Unassigned'
  const initial = (displayName.charAt(0) || 'U').toUpperCase()

  const avatarSize = size === 'small' ? '1.5rem' : '1.85rem'
  const fontSize = size === 'small' ? '0.7rem' : '0.78rem'

  return (
    <div
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '0.45rem',
        maxWidth: '100%',
      }}
      title={`${displayName}${isEmailAddress ? ` (${cleanEmail})` : ''}`}
    >
      <div
        style={{
          width: avatarSize,
          height: avatarSize,
          borderRadius: '50%',
          background: 'linear-gradient(135deg, #c60016 0%, #990011 100%)',
          color: '#ffffff',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: fontSize,
          fontWeight: '800',
          flexShrink: 0,
          boxShadow: '0 2px 6px rgba(198, 0, 22, 0.25)',
        }}
      >
        {initial}
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', minWidth: 0 }}>
        <span
          style={{
            fontSize: '0.8rem',
            fontWeight: '700',
            color: '#1e293b',
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
          }}
        >
          {displayName}
        </span>
        {showEmail && isEmailAddress && (
          <span style={{ fontSize: '0.68rem', color: '#64748b' }}>
            {cleanEmail.toLowerCase()}
          </span>
        )}
      </div>
      {role && (
        <span
          style={{
            fontSize: '0.65rem',
            padding: '0.1rem 0.35rem',
            borderRadius: '6px',
            background: '#f1f5f9',
            color: '#475569',
            fontWeight: '600',
            textTransform: 'uppercase',
          }}
        >
          {role}
        </span>
      )}
    </div>
  )
}

export default UserEmailBadge
