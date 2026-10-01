export const normalizeTextInput = (value) => String(value || '').trim()

export const DEAL_LIFECYCLE_STATUS_OPTIONS = [
  { value: 'Order Received', label: 'Order Received' },
  { value: 'Convert To PO', label: 'Convert To PO' },
  { value: 'Order Lost', label: 'Order Lost' },
  { value: 'Rejected', label: 'Rejected' },
  { value: 'Contracted', label: 'Contracted' },
]

export const CUSTOMER_QUOTATION_STATUS_OPTIONS = [
  { value: 'Pending', label: 'Pending' },
  { value: 'Sent', label: 'Sent' },
  { value: 'Revised', label: 'Revised' },
  { value: 'Won', label: 'Won' },
  { value: 'Lost', label: 'Lost' },
]

export const normalizeDealCity = (value) => {
  const normalizedValue = normalizeTextInput(value).toLowerCase()
  if (normalizedValue === 'ahmadabad' || normalizedValue === 'ahmedabad') return 'Ahmedabad'
  if (normalizedValue === 'vadodara' || normalizedValue === 'baroda') return 'Vadodara'
  return normalizeTextInput(value)
}

export const normalizeOptionalNumberInput = (value) => {
  const normalizedValue = normalizeTextInput(value)
  if (!normalizedValue) return null

  const parsedValue = Number(normalizedValue)
  return Number.isFinite(parsedValue) ? parsedValue : null
}

export const normalizeOptionalIntegerInput = (value) => {
  const normalizedValue = normalizeTextInput(value)
  if (!normalizedValue) return null

  if (!/^-?\d+$/u.test(normalizedValue)) {
    return null
  }

  const parsedValue = Number.parseInt(normalizedValue, 10)
  return Number.isFinite(parsedValue) ? parsedValue : null
}

export const isClosedDealStatus = (status, stage = '') => {
  const normalizedStatus = normalizeTextInput(status).toLowerCase()
  const normalizedStage = normalizeTextInput(stage).toLowerCase()

  return (
    normalizedStatus === 'won'
    || normalizedStatus === 'lost'
    || normalizedStage.includes('closed')
    || normalizedStatus.includes('closed')
  )
}
