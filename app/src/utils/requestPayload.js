const isPlainObject = (value) => {
  if (!value || typeof value !== 'object') return false
  if (Array.isArray(value)) return false
  if (typeof FormData !== 'undefined' && value instanceof FormData) return false
  if (typeof Blob !== 'undefined' && value instanceof Blob) return false
  return Object.getPrototypeOf(value) === Object.prototype || Object.getPrototypeOf(value) === null
}

const normalizeStringValue = (value) => {
  const trimmedValue = String(value).trim()
  return trimmedValue === '' ? null : trimmedValue
}

export const normalizeRequestPayload = (value) => {
  if (typeof value === 'string') {
    return normalizeStringValue(value)
  }

  if (Array.isArray(value)) {
    return value.map((entry) => normalizeRequestPayload(entry))
  }

  if (isPlainObject(value)) {
    return Object.entries(value).reduce((nextValue, [key, entry]) => {
      if (entry === undefined) {
        return nextValue
      }

      nextValue[key] = normalizeRequestPayload(entry)
      return nextValue
    }, {})
  }

  return value
}
