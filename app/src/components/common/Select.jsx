import React from 'react'
import './Select.css'

const normalizeOptionValue = (value) => (
  value === null || value === undefined ? '' : String(value)
)

const normalizeOptions = (options = []) => {
  const seenValues = new Set()

  return options.reduce((normalizedOptions, option) => {
    const normalizedOption = typeof option === 'object' && option !== null
      ? {
        value: normalizeOptionValue(option.value ?? option.label ?? ''),
        label: String(option.label ?? option.value ?? ''),
      }
      : {
        value: normalizeOptionValue(option),
        label: String(option ?? ''),
      }

    if (seenValues.has(normalizedOption.value)) {
      return normalizedOptions
    }

    seenValues.add(normalizedOption.value)
    normalizedOptions.push(normalizedOption)
    return normalizedOptions
  }, [])
}

const Select = ({ 
  label,
  error,
  options = [],
  placeholder = 'Select...',
  fullWidth = false,
  className = '',
  value = '',
  ...props 
}) => {
  const normalizedValue = normalizeOptionValue(value)
  const normalizedOptions = normalizeOptions(options)
  const hasSelectedOption = normalizedOptions.some((option) => option.value === normalizedValue)
  const resolvedOptions = normalizedValue && !hasSelectedOption
    ? [{ value: normalizedValue, label: normalizedValue }, ...normalizedOptions]
    : normalizedOptions

  const classes = [
    'select-wrapper',
    fullWidth && 'select-full-width',
    error && 'select-error',
    className
  ].filter(Boolean).join(' ')

  return (
    <div className={classes}>
      {label && <label className="select-label">{label}</label>}
      <select className="select-field" {...props} value={normalizedValue}>
        <option value="">{placeholder}</option>
        {resolvedOptions.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
      {error && <span className="select-error-text">{error}</span>}
    </div>
  )
}

export default Select
