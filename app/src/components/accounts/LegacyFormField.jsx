import React from 'react'

const inputClasses =
  'legacy-form-control w-full rounded-xl border border-gray-200 px-4 py-3 text-sm text-slate-700 shadow-sm outline-none transition duration-200 ease-in-out focus:border-blue-400 focus:ring-2 focus:ring-blue-100'

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

const LegacyFormField = ({
  label,
  name,
  value,
  onChange,
  type = 'text',
  required = false,
  error = '',
  options = [],
  textareaRows = 4,
  placeholder = '',
  className = '',
  labelClassName = '',
  fieldClassName = '',
  layout = 'stacked',
  rowClassName = '',
  inputWrapperClassName = '',
}) => {
  const handleChange = (event) => {
    onChange(name, event.target.value)
  }

  const normalizedValue = normalizeOptionValue(value)
  const normalizedOptions = normalizeOptions(options)
  const hasSelectedOption = normalizedOptions.some((option) => option.value === normalizedValue)
  const resolvedOptions = normalizedValue && !hasSelectedOption
    ? [{ value: normalizedValue, label: normalizedValue }, ...normalizedOptions]
    : normalizedOptions

  const control =
    type === 'textarea' ? (
      <textarea
        id={name}
        name={name}
        rows={textareaRows}
        value={value}
        onChange={handleChange}
        placeholder={placeholder}
        className={`${inputClasses} min-h-[74px] resize-none leading-5 ${className} ${fieldClassName}`.trim()}
      />
    ) : type === 'select' ? (
      <select
        id={name}
        name={name}
        value={normalizedValue}
        onChange={handleChange}
        className={`${inputClasses} min-h-[38px] appearance-none ${className} ${fieldClassName}`.trim()}
      >
        <option value="">Select</option>
        {resolvedOptions.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    ) : (
      <input
        id={name}
        name={name}
        type={type}
        value={value}
        onChange={handleChange}
        placeholder={placeholder}
        className={`${inputClasses} min-h-[38px] ${className} ${fieldClassName}`.trim()}
      />
    )

  if (layout === 'inline') {
    return (
      <div className={`legacy-form-row ${rowClassName}`.trim()}>
        <label
          htmlFor={name}
          className={`legacy-form-label ${labelClassName}`.trim()}
        >
          {label}
          {required && <span className="legacy-form-required-marker ml-1 text-red-600">*</span>}
        </label>

        <div className={`space-y-1 ${inputWrapperClassName}`.trim()}>
          {control}
          {error ? <p className="legacy-form-error-message text-xs text-red-600">{error}</p> : null}
        </div>
      </div>
    )
  }

  return (
    <div className={`legacy-form-field-stack ${rowClassName}`.trim()}>
      <label
        htmlFor={name}
        className={`legacy-form-label ${labelClassName}`.trim()}
      >
        {label}
        {required && <span className="legacy-form-required-marker ml-1 text-red-600">*</span>}
      </label>

      <div className="space-y-0.5">
        {control}
        {error ? <p className="legacy-form-error-message text-xs text-red-600">{error}</p> : null}
      </div>
    </div>
  )
}

export default LegacyFormField
