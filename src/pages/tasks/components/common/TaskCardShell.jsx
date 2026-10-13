import React from 'react'

export const TaskCardShell = ({
  title,
  icon,
  subtitle,
  action,
  children,
  className = '',
  headerClassName = '',
  style = {},
}) => {
  return (
    <div className={`ap-dashboard-card ${className}`.trim()} style={{ borderRadius: '20px', overflow: 'hidden', ...style }}>
      {(title || action || icon) && (
        <div className={`ap-dashboard-card-header ${headerClassName}`.trim()} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.75rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
            {icon && <span style={{ color: '#c60016', fontSize: '1rem', display: 'inline-flex' }}>{icon}</span>}
            {title && <span className="ap-dashboard-card-title">{title}</span>}
          </div>
          {action && <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>{action}</div>}
        </div>
      )}
      <div className="ap-dashboard-card-body">
        {subtitle && <p className="ap-dashboard-subtitle" style={{ marginBottom: '1rem' }}>{subtitle}</p>}
        {children}
      </div>
    </div>
  )
}

export default TaskCardShell
