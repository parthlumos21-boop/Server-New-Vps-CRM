import React from 'react'

const inputClasses =
  'legacy-form-control w-full rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-800 bg-white outline-none transition duration-150 ease-in-out focus:border-[#c60016] focus:ring-1 focus:ring-[#c60016]/20'

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
  icon = null,
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

  const errorClasses = error ? 'border-[#c60016] ring-1 ring-[#c60016]/20 focus:border-[#c60016]' : ''
  
  const control =
    type === 'textarea' ? (
      <textarea
        id={name}
        name={name}
        rows={textareaRows}
        value={value}
        onChange={handleChange}
        placeholder={placeholder}
        className={`${inputClasses} ${errorClasses} min-h-[74px] resize-none leading-5 ${className} ${fieldClassName}`.trim()}
      />
    ) : type === 'select' ? (
      <select
        id={name}
        name={name}
        value={normalizedValue}
        onChange={handleChange}
        className={`${inputClasses} ${errorClasses} min-h-[38px] appearance-none ${className} ${fieldClassName}`.trim()}
      >
        <option value="">Select</option>
        {resolvedOptions.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    ) : type === 'range' ? (
      <div className="flex items-center gap-3">
        <input
          id={name}
          name={name}
          type={type}
          min={0}
          max={100}
          value={value || 0}
          onChange={handleChange}
          className={`flex-1 ${className} ${fieldClassName}`.trim()}
        />
        <span className="text-sm font-semibold text-gray-700 min-w-[3rem]">{value || 0}%</span>
      </div>
    ) : (
      <input
        id={name}
        name={name}
        type={type}
        value={value}
        onChange={handleChange}
        placeholder={placeholder}
        className={`${inputClasses} ${errorClasses} min-h-[38px] ${className} ${fieldClassName}`.trim()}
      />
    )

  if (layout === 'inline') {
    return (
      <div className={`legacy-form-row ${rowClassName}`.trim()}>
        <label
          htmlFor={name}
          className={`legacy-form-label ${labelClassName}`.trim()}
        >
          {icon ? (
            <span className="legacy-form-icon-wrap">
              {icon}
            </span>
          ) : null}
          <span className="legacy-form-label-text">
            {label}
            {required && <span className="legacy-form-required-marker ml-1 text-red-600">*</span>}
          </span>
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
        {icon ? (
          <span className="legacy-form-icon-wrap">
            {icon}
          </span>
        ) : null}
        <span className="legacy-form-label-text">
          {label}
          {required && <span className="legacy-form-required-marker ml-1 text-red-600">*</span>}
        </span>
      </label>

      <div className="space-y-0.5">
        {control}
        {error ? <p className="legacy-form-error-message text-xs text-red-600">{error}</p> : null}
      </div>
    </div>
  )
}

export default LegacyFormField
