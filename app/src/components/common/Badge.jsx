import React from 'react'
import './Badge.css'

const Badge = ({ 
  children, 
  variant = 'default',
  size = 'medium',
  rounded = false,
  className = ''
}) => {
  const classes = [
    'badge',
    `badge-${variant}`,
    `badge-${size}`,
    rounded && 'badge-rounded',
    className
  ].filter(Boolean).join(' ')

  return (
    <span className={classes}>
      {children}
    </span>
  )
}

export default Badge
