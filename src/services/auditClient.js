import apiClient from './apiClient'

const MAX_METADATA_STRING_LENGTH = 300
const SENSITIVE_KEY_PATTERN = /password|token|secret|authorization|cookie|otp|api[_-]?key/i

const trimString = (value) => (
  value.length > MAX_METADATA_STRING_LENGTH
    ? `${value.slice(0, MAX_METADATA_STRING_LENGTH)}...`
    : value
)

export const sanitizeAuditMetadata = (value) => {
  if (Array.isArray(value)) {
    return value.slice(0, 20).map((entry) => sanitizeAuditMetadata(entry))
  }

  if (value && typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value)
        .slice(0, 30)
        .map(([key, entryValue]) => [
          key,
          SENSITIVE_KEY_PATTERN.test(key) ? '[REDACTED]' : sanitizeAuditMetadata(entryValue),
        ])
    )
  }

  if (typeof value === 'string') {
    return trimString(value)
  }

  return value
}

export const auditClient = {
  record(eventType, metadata = {}) {
    if (typeof window === 'undefined') return

    const route = `${window.location.pathname}${window.location.search}`
    const payload = {
      eventType,
      route,
      metadata: sanitizeAuditMetadata({
        ...metadata,
        title: document.title,
      }),
    }

    window.setTimeout(() => {
      apiClient.post('/audit/client', payload).catch(() => {
        // Client logging must never interrupt the CRM UI.
      })
    }, 0)
  },
}
