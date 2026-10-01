import React from 'react'
import './Card.css'

const hasVisibleContent = (children) => (
  React.Children.toArray(children).some((child) => {
    if (child === null || child === undefined || typeof child === 'boolean') return false
    if (typeof child === 'string') return child.trim().length > 0
    return true
  })
)

const Card = ({ 
  children, 
  title, 
  subtitle,
  actions,
  padding = true,
  hoverable = false,
  className = '',
  ...props 
}) => {
  const hasHeader = Boolean(title || subtitle || actions)
  const hasBody = hasVisibleContent(children)

  if (!hasHeader && !hasBody) return null

  const classes = [
    'card',
    !padding && 'card-no-padding',
    hoverable && 'card-hoverable',
    className
  ].filter(Boolean).join(' ')

  return (
    <div className={classes} {...props}>
      {hasHeader && (
        <div className="card-header">
          <div className="card-header-content">
            {title && <h3 className="card-title">{title}</h3>}
            {subtitle && <p className="card-subtitle">{subtitle}</p>}
          </div>
          {actions && <div className="card-actions">{actions}</div>}
        </div>
      )}
      {hasBody && (
        <div className="card-body">
          {children}
        </div>
      )}
    </div>
  )
}

export default Card
