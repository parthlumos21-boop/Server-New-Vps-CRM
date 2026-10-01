const MUTATING_METHODS = new Set(['POST', 'PUT', 'PATCH'])

const isPlainObject = (value) => {
  if (!value || typeof value !== 'object') return false
  if (Array.isArray(value)) return false
  return Object.getPrototypeOf(value) === Object.prototype || Object.getPrototypeOf(value) === null
}

const normalizeStringValue = (value) => {
  const trimmedValue = String(value).trim()
  return trimmedValue === '' ? null : trimmedValue
}

const normalizePayloadValue = (value) => {
  if (typeof value === 'string') {
    return normalizeStringValue(value)
  }

  if (Array.isArray(value)) {
    return value.map((entry) => normalizePayloadValue(entry))
  }

  if (isPlainObject(value)) {
    return Object.entries(value).reduce((nextValue, [key, entry]) => {
      if (entry === undefined) {
        return nextValue
      }

      nextValue[key] = normalizePayloadValue(entry)
      return nextValue
    }, {})
  }

  return value
}

const normalizeRequestBody = (req, _res, next) => {
  if (!MUTATING_METHODS.has(String(req.method || '').toUpperCase())) {
    next()
    return
  }

  if (String(req.originalUrl || '').startsWith('/api/auth/')) {
    next()
    return
  }

  if (!req.body || typeof req.body !== 'object') {
    next()
    return
  }

  req.body = normalizePayloadValue(req.body)
  next()
}

const asTrimmedStringOrNull = (value) => {
  if (value === null || value === undefined) return null
  return normalizeStringValue(value)
}

const asOptionalInteger = (value) => {
  const normalizedValue = asTrimmedStringOrNull(value)
  if (normalizedValue === null) return null

  if (!/^-?\d+$/u.test(normalizedValue)) {
    return null
  }

  const parsedValue = Number.parseInt(normalizedValue, 10)
  return Number.isFinite(parsedValue) ? parsedValue : null
}

const asOptionalNumber = (value) => {
  const normalizedValue = asTrimmedStringOrNull(value)
  if (normalizedValue === null) return null

  const parsedValue = Number(normalizedValue)
  return Number.isFinite(parsedValue) ? parsedValue : null
}

module.exports = {
  normalizePayloadValue,
  normalizeRequestBody,
  asTrimmedStringOrNull,
  asOptionalInteger,
  asOptionalNumber,
}
