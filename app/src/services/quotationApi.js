import apiClient from './apiClient'

const toNumber = (value, fallback = 0) => {
  const parsedValue = Number.parseFloat(value)
  return Number.isFinite(parsedValue) ? parsedValue : fallback
}

const normalizeLineItem = (lineItem = {}, index = 0) => {
  const quantity = String(lineItem.quantity ?? '')
  const rate = String(lineItem.rate ?? lineItem.price ?? '')
  const amount = toNumber(lineItem.amount, toNumber(quantity) * toNumber(rate))

  return {
    ...lineItem,
    id: lineItem.id || `line-item-${index + 1}`,
    quantity,
    rate,
    amount,
  }
}

export const normalizeQuotationRecord = (quotation = {}) => {
  const persistedData = quotation.data && typeof quotation.data === 'object'
    ? quotation.data
    : {}

  const mergedQuotation = {
    ...quotation,
    ...persistedData,
  }

  const lineItemsSource = Array.isArray(mergedQuotation.lineItems)
    ? mergedQuotation.lineItems
    : Array.isArray(quotation.lineItems)
      ? quotation.lineItems
      : []

  const normalizedQuotationNumber = String(
    mergedQuotation.quotationNumber
    || mergedQuotation.quoteNumber
    || quotation.quoteNumber
    || quotation.quotationNumber
    || ''
  ).trim()

  const normalizedAmount = toNumber(
    mergedQuotation.amount,
    toNumber(quotation.totalAmount, lineItemsSource.reduce((sum, item) => {
      const quantity = toNumber(item.quantity)
      const rate = toNumber(item.rate ?? item.price)
      return sum + (toNumber(item.amount, quantity * rate))
    }, 0))
  )

  return {
    ...mergedQuotation,
    id: quotation.id || mergedQuotation.id,
    quotationNumber: normalizedQuotationNumber,
    quoteNumber: normalizedQuotationNumber,
    clientName: mergedQuotation.clientName || quotation.customerName || mergedQuotation.customerName || '',
    companyName: mergedQuotation.companyName || quotation.customerName || mergedQuotation.customerName || '',
    customerName: mergedQuotation.customerName || quotation.customerName || mergedQuotation.companyName || '',
    customerId: mergedQuotation.customerId || quotation.customerId || mergedQuotation.selectedAccountId || '',
    projectName: mergedQuotation.projectName || mergedQuotation.quotationSubject || '',
    architectName: mergedQuotation.architectName || '',
    pmcName: mergedQuotation.pmcName || '',
    amount: normalizedAmount,
    totalAmount: toNumber(quotation.totalAmount, normalizedAmount),
    taxAmount: toNumber(mergedQuotation.taxAmount, toNumber(quotation.taxAmount, 0)),
    discountAmount: toNumber(mergedQuotation.discountAmount, toNumber(quotation.discountAmount, 0)),
    status: mergedQuotation.status || quotation.status || 'draft',
    currency: mergedQuotation.currency || quotation.currency || 'INR',
    validUntil: mergedQuotation.validUntil || quotation.validUntil || '',
    lineItems: lineItemsSource.map(normalizeLineItem),
    notes: mergedQuotation.notes || quotation.notes || mergedQuotation.quotationNotes || '',
    quotationNotes: mergedQuotation.quotationNotes || quotation.notes || '',
    userId: mergedQuotation.userId || quotation.createdBy || mergedQuotation.createdBy || '',
    createdBy: mergedQuotation.createdBy || quotation.createdBy || '',
    createdAt: mergedQuotation.createdAt || quotation.createdAt || '',
    updatedAt: mergedQuotation.updatedAt || quotation.updatedAt || '',
    data: {
      ...persistedData,
      quotationNumber: normalizedQuotationNumber,
      quoteNumber: normalizedQuotationNumber,
    },
  }
}

export const quotationApi = {
  async getQuotations() {
    const response = await apiClient.get('/quotations')
    return (response.data || []).map(normalizeQuotationRecord)
  },

  async getQuotationById(id) {
    const response = await apiClient.get(`/quotations/${encodeURIComponent(id)}`)
    return normalizeQuotationRecord(response.data)
  },

  async createQuotation(payload) {
    const response = await apiClient.post('/quotations', payload)
    return normalizeQuotationRecord(response.data)
  },

  async updateQuotation(id, payload) {
    const response = await apiClient.put(`/quotations/${encodeURIComponent(id)}`, payload)
    return normalizeQuotationRecord(response.data)
  },

  async deleteQuotation(id) {
    const response = await apiClient.delete(`/quotations/${encodeURIComponent(id)}`)
    return response.data
  },
}
