import React from 'react'
import './Input.css'

const Input = ({ 
  label,
  error,
  helperText,
  icon,
  fullWidth = false,
  className = '',
  ...props 
}) => {
  const classes = [
    'input-wrapper',
    fullWidth && 'input-full-width',
    error && 'input-error',
    className
  ].filter(Boolean).join(' ')

  return (
    <div className={classes}>
      {label && <label className="input-label">{label}</label>}
      <div className="input-container">
        {icon && <span className="input-icon">{icon}</span>}
        <input className="input-field" {...props} />
      </div>
      {error && <span className="input-error-text">{error}</span>}
      {helperText && !error && <span className="input-helper-text">{helperText}</span>}
    </div>
  )
}

export default Input
