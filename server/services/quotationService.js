const quotationRepository = require('../repositories/quotationRepository')
const { createCrudService } = require('./crudServiceFactory')
const { AppError } = require('../utils/appError')
const { getNextCounterSequence } = require('../models/mongoModels')

const DEFAULT_QUOTATION_NUMBER_START = 1001

const computeTotals = (lineItems = []) => {
  let total = 0
  let tax = 0
  let discount = 0
  lineItems.forEach((item) => {
    const qty = Number(item?.quantity ?? 1) || 0
    const rate = Number(item?.rate ?? item?.price ?? 0) || 0
    const lineTotal = qty * rate
    total += lineTotal
    tax += Number(item?.tax ?? 0) || 0
    discount += Number(item?.discount ?? 0) || 0
  })
  return { total, tax, discount }
}

const parseQuotationNumber = (quotationNumber = '') => {
  const match = String(quotationNumber).match(/(\d+)$/)
  return match ? Number.parseInt(match[1], 10) : NaN
}

const buildQuotationNumber = (sequence, referenceDate) => {
  const year = new Date(referenceDate || Date.now()).getFullYear()
  return `SSIPL/${year}/${String(sequence).padStart(4, '0')}`
}

const getQuotationSequenceMonth = (referenceDate) => {
  const date = new Date(referenceDate || Date.now())
  const validDate = Number.isNaN(date.getTime()) ? new Date() : date
  const year = validDate.getFullYear()
  const month = String(validDate.getMonth() + 1).padStart(2, '0')
  return `${year}-${month}`
}

const isUploadQuotationPayload = (body = {}) => Boolean(
  body.quoteFile
  || body.quoteFileName
  || body.quotationFileName
  || body.uploadedQuotationFileName
)

const isInSequenceWindow = (sequence) => (
  Number.isFinite(sequence)
  && sequence >= DEFAULT_QUOTATION_NUMBER_START
  && sequence < 10000
)

const hasExplicitValue = (value) => value !== undefined && value !== null && value !== ''

const toExplicitNumber = (value) => (
  hasExplicitValue(value) && Number.isFinite(Number(value)) ? Number(value) : undefined
)

const getExplicitRevisionAmount = (source = {}, code) => {
  const data = source.data || {}
  const revisionAmounts = source.quotationRevisionAmounts || data.quotationRevisionAmounts || {}
  const key = `${String(code).toLowerCase()}Amount`

  // revisionAmountR* is historically written as 0 for every unused slot.
  // A revision is real only when the revision map/history or its raw r*Amount
  // field explicitly contains it.
  if (Object.prototype.hasOwnProperty.call(revisionAmounts, code) && hasExplicitValue(revisionAmounts[code])) {
    return revisionAmounts[code]
  }
  if (Object.prototype.hasOwnProperty.call(data.quotationRevisionAmounts || {}, code) && hasExplicitValue(data.quotationRevisionAmounts[code])) {
    return data.quotationRevisionAmounts[code]
  }
  const hasRawRevisionField = Object.prototype.hasOwnProperty.call(source, key) || Object.prototype.hasOwnProperty.call(data, key)
  if (Object.prototype.hasOwnProperty.call(source, key) && hasExplicitValue(source[key])) return source[key]
  if (Object.prototype.hasOwnProperty.call(data, key) && hasExplicitValue(data[key])) return data[key]
  // Legacy revisionAmountR* fields are only valid when no raw r*Amount field
  // exists. Old documents use zero/nonzero placeholders in these fields.
  if (!hasRawRevisionField && hasExplicitValue(source[`revisionAmount${code}`]) && Number(source[`revisionAmount${code}`]) !== 0) return source[`revisionAmount${code}`]
  if (!hasRawRevisionField && hasExplicitValue(data[`revisionAmount${code}`]) && Number(data[`revisionAmount${code}`]) !== 0) return data[`revisionAmount${code}`]
  return ''
}

const parseRevisionNumber = (code) => {
  const parsed = Number.parseInt(String(code || '').replace(/\D/g, ''), 10)
  return Number.isNaN(parsed) ? null : parsed
}

const getSavedRevisionNumbers = (record = {}) => {
  const revisions = Array.isArray(record.revisions)
    ? record.revisions
    : (Array.isArray(record.data?.revisions) ? record.data.revisions : [])
  const revisionNumbers = new Set()

  ;['R0', 'R1', 'R2', 'R3'].forEach((code) => {
    if (hasExplicitValue(getExplicitRevisionAmount(record, code))) {
      const revNo = parseRevisionNumber(code)
      if (revNo !== null) revisionNumbers.add(revNo)
    }
  })

  revisions.forEach((revision) => {
    const code = revision.revisionCode || (revision.revisionNo === 0 ? 'R0' : revision.revisionNo ? `R${revision.revisionNo}` : '')
    const revNo = parseRevisionNumber(code)
    if (revNo !== null && hasExplicitValue(revision.amount)) {
      revisionNumbers.add(revNo)
    }
  })

  return Array.from(revisionNumbers).sort((a, b) => a - b)
}

const buildSafeMongoIdQuery = (targetId, extraStringFields = []) => {
  const strVal = String(targetId || '').trim()
  if (!strVal) return null

  const mongoose = require('mongoose')
  const numVal = Number(strVal)
  const isNum = !Number.isNaN(numVal)
  const conditions = [
    { id: strVal },
    { legacyId: strVal },
    ...extraStringFields.map((field) => ({ [field]: strVal })),
  ]

  if (isNum) {
    conditions.push({ id: numVal })
    conditions.push({ legacyId: numVal })
    extraStringFields.forEach((field) => conditions.push({ [field]: numVal }))
  }

  if (mongoose.Types.ObjectId.isValid(strVal)) {
    conditions.push({ _id: strVal })
  }

  return { $or: conditions }
}

const getRecordSequenceMonth = (record = {}) => (
  record.quotationSequenceMonth
  || record.data?.quotationSequenceMonth
  || getQuotationSequenceMonth(record.quotationDate || record.data?.quotationDate || record.createdAt)
)

const getNextQuotationSequenceForMonth = (records = [], sequenceMonth) => {
  const maxSequence = records.reduce((currentMax, record) => {
    if (getRecordSequenceMonth(record) !== sequenceMonth) return currentMax

    const parsedValue = parseQuotationNumber(
      record?.quoteNumber
      || record?.quotationNumber
      || record?.data?.quoteNumber
      || record?.data?.quotationNumber
    )

    return isInSequenceWindow(parsedValue)
      ? Math.max(currentMax, parsedValue)
      : currentMax
  }, DEFAULT_QUOTATION_NUMBER_START - 1)

  return maxSequence + 1
}

const parseJsonValue = (value) => {
  try {
    return JSON.parse(value)
  } catch (_error) {
    return null
  }
}

const toLineItemSource = (lineItems) => {
  if (Array.isArray(lineItems)) return lineItems
  if (lineItems && typeof lineItems === 'object') return [lineItems]
  if (typeof lineItems !== 'string') return []

  const parsedValue = parseJsonValue(lineItems.trim())
  if (Array.isArray(parsedValue)) return parsedValue
  if (parsedValue && typeof parsedValue === 'object') return [parsedValue]
  return []
}

const normalizeLineItem = (lineItem, index) => {
  if (typeof lineItem === 'string') {
    const parsedValue = parseJsonValue(lineItem.trim())
    return normalizeLineItem(parsedValue, index)
  }

  if (!lineItem || typeof lineItem !== 'object' || Array.isArray(lineItem)) {
    return null
  }

  const description = String(lineItem.description ?? lineItem.product ?? '').trim()
  if (!description) {
    return null
  }

  const quantity = String(lineItem.quantity ?? '1').trim() || '1'
  const rate = String(lineItem.rate ?? lineItem.price ?? '0').trim() || '0'
  const amount = Number(lineItem.amount)
  const computedAmount = (Number(quantity) || 0) * (Number(rate) || 0)

  return {
    ...lineItem,
    id: lineItem.id || `line-item-${index + 1}`,
    description,
    quantity,
    unit: String(lineItem.unit ?? 'Nos').trim() || 'Nos',
    rate,
    amount: Number.isFinite(amount) ? amount : computedAmount,
  }
}

const normalizeLineItems = (lineItems = []) => (
  toLineItemSource(lineItems)
    .map((lineItem, index) => normalizeLineItem(lineItem, index))
    .filter(Boolean)
)

const getNextQuotationSequence = (records = [], referenceDate) => {
  const sequenceMonth = getQuotationSequenceMonth(referenceDate)
  const maxSequence = records.reduce((currentMax, record) => {
    if (getRecordSequenceMonth(record) !== sequenceMonth) return currentMax

    const parsedValue = parseQuotationNumber(
      record?.quoteNumber
      || record?.quotationNumber
      || record?.data?.quoteNumber
      || record?.data?.quotationNumber
    )

    return isInSequenceWindow(parsedValue)
      ? Math.max(currentMax, parsedValue)
      : currentMax
  }, DEFAULT_QUOTATION_NUMBER_START - 1)

  return maxSequence + 1
}

const resolveQuoteNumber = async (body, existing, actor) => {
  const requestedQuoteNumber = String(body.quoteNumber || body.quotationNumber || '').trim()
  const referenceDate = body.quotationDate || body.createdAt || existing?.quotationDate || existing?.createdAt
  const quotationSequenceMonth = getQuotationSequenceMonth(referenceDate)

  if (existing) {
    const retainedQuoteNumber = requestedQuoteNumber || existing.quoteNumber || existing.data?.quotationNumber || buildQuotationNumber(DEFAULT_QUOTATION_NUMBER_START, referenceDate)
    return {
      quoteNumber: retainedQuoteNumber,
      quotationSequenceMonth: existing.quotationSequenceMonth || existing.data?.quotationSequenceMonth || quotationSequenceMonth,
      quotationSequence: existing.quotationSequence || existing.data?.quotationSequence || parseQuotationNumber(retainedQuoteNumber),
    }
  }

  const existingRecords = quotationRepository.listForActor
    ? await quotationRepository.listForActor(actor, { companyWide: true })
    : await quotationRepository.listAll()
  const existingNumbers = new Set(
    existingRecords
      .map((record) => String(record.quoteNumber || record.data?.quotationNumber || '').trim())
      .filter(Boolean)
  )

  if (requestedQuoteNumber && isUploadQuotationPayload(body) && !existingNumbers.has(requestedQuoteNumber)) {
    return {
      quoteNumber: requestedQuoteNumber,
      quotationSequenceMonth,
      quotationSequence: parseQuotationNumber(requestedQuoteNumber),
    }
  }

  const counterKey = `quotations:${actor.companyId || 'default'}:${quotationSequenceMonth}`
  const minimumSequence = getNextQuotationSequenceForMonth(existingRecords, quotationSequenceMonth) - 1
  const quotationSequence = await getNextCounterSequence(counterKey, minimumSequence)
  const quoteNumber = buildQuotationNumber(quotationSequence, referenceDate)

  return {
    quoteNumber,
    quotationSequence,
    quotationSequenceMonth,
  }
}

// ── Duplicate detection ────────────────────────────────────────────────
const normalizeText = (value) => String(value || '').trim().toLowerCase().replace(/\s+/g, ' ')

const roundCurrency = (value) => Math.round((Number(value) || 0) * 100) / 100

const buildLineItemSignature = (items = []) => (
  items
    .map((item) => [
      normalizeText(item.description),
      String(item.quantity ?? '').trim(),
      String(item.rate ?? item.price ?? '').trim(),
    ].join('|'))
    .sort()
    .join('||')
)

const pickQuotationField = (record, ...keys) => {
  for (const key of keys) {
    const value = record?.[key] ?? record?.data?.[key]
    if (value !== undefined && value !== null && String(value).trim() !== '') {
      return value
    }
  }
  return ''
}

const buildQuotationFingerprint = (record, candidateLineItems) => {
  const lineItems = candidateLineItems
    || (Array.isArray(record?.lineItems) ? record.lineItems : null)
    || (Array.isArray(record?.data?.lineItems) ? record.data.lineItems : [])

  return {
    customer:    normalizeText(pickQuotationField(record, 'customerName', 'companyName', 'clientName')),
    project:     normalizeText(pickQuotationField(record, 'projectName')),
    architect:   normalizeText(pickQuotationField(record, 'architectName')),
    pmc:         normalizeText(pickQuotationField(record, 'pmcName')),
    title:       normalizeText(pickQuotationField(record, 'title', 'quotationSubject')),
    total:       roundCurrency(pickQuotationField(record, 'totalAmount', 'amount')),
    tax:         roundCurrency(pickQuotationField(record, 'taxAmount', 'gstAmount')),
    discount:    roundCurrency(pickQuotationField(record, 'discountAmount', 'discount')),
    lineItems:   buildLineItemSignature(lineItems),
  }
}

const fingerprintsMatch = (a, b) => (
  a.customer === b.customer
  && a.project === b.project
  && a.architect === b.architect
  && a.pmc === b.pmc
  && a.title === b.title
  && a.total === b.total
  && a.tax === b.tax
  && a.discount === b.discount
  && a.lineItems === b.lineItems
  // Require at least one meaningful field to avoid blocking empty payloads
  && (a.customer || a.project || a.title)
  && a.lineItems
)

const findDuplicateQuotation = async (actor, candidate) => {
  const existingRecords = quotationRepository.listForActor
    ? await quotationRepository.listForActor(actor, { companyWide: true })
    : await quotationRepository.listAll()
  return existingRecords.find((record) => (
    fingerprintsMatch(buildQuotationFingerprint(record), candidate)
    && String(record.status || '').toLowerCase() !== 'cancelled'
  )) || null
}

const buildPayload = async (body, actor, existing) => {
  const requestedLineItems = Object.prototype.hasOwnProperty.call(body || {}, 'lineItems')
    ? body.lineItems
    : existing?.lineItems
  const lineItems = normalizeLineItems(requestedLineItems || [])
  const computed = computeTotals(lineItems)

  const existingQuotations = quotationRepository.listAll
    ? await quotationRepository.listAll()
    : []

  const candidateCustomerId = String(body.customerId ?? body.selectedAccountId ?? existing?.customerId ?? '').trim()
  const candidateDealId = String(body.dealId ?? existing?.dealId ?? '').trim()
  const candidateQuoteNumber = String(body.quoteNumber ?? body.quotationNumber ?? existing?.quoteNumber ?? '').trim()

  const matchingQuotations = existingQuotations.filter((rec) => {
    if (existing && String(rec.id) === String(existing.id)) return false
    const recCustId = String(rec.customerId || rec.data?.selectedAccountId || '').trim()
    const recDealId = String(rec.dealId || rec.data?.dealId || '').trim()
    const recQuoteNo = String(rec.quoteNumber || rec.quotationNumber || rec.data?.quotationNumber || '').trim()

    if (candidateQuoteNumber && recQuoteNo === candidateQuoteNumber) return true
    if (candidateDealId && recDealId === candidateDealId) return true
    if (candidateCustomerId && recCustId === candidateCustomerId) return true
    return false
  }).sort((a, b) => new Date(a.createdAt || 0) - new Date(b.createdAt || 0))

  const isExplicitRevision = Boolean(body.isRevision || body.parentQuotationId || body.revisionCode)
  const hasRevisionAmountChange = Boolean(
    body.quotationRevisionAmounts ||
    body.revisionAmountR1 || body.revisionAmountR2 || body.revisionAmountR3 ||
    body.r1Amount || body.r2Amount || body.r3Amount ||
    body.revisions
  )
  const isRevision = isExplicitRevision || hasRevisionAmountChange || (matchingQuotations.length > 0 && !existing)

  let revisionNo = existing?.revisionNo || (matchingQuotations.length > 0 ? matchingQuotations.length + 1 : 1)
  let revisionCode = existing?.revisionCode || (matchingQuotations.length > 0 ? `R${matchingQuotations.length + 1}` : 'R1')
  if (revisionCode === 'Normal') revisionCode = 'R1'
  let parentQuotationId = body.parentQuotationId || existing?.parentQuotationId || null

  if (!existing && isRevision && matchingQuotations.length > 0) {
    if (!parentQuotationId) {
      parentQuotationId = matchingQuotations[0].id || matchingQuotations[0]._id
    }
  }

  // Duplicate detection runs before quote-number allocation only if NOT a revision and NOT an upload payload
  if (!existing && !isRevision && !isUploadQuotationPayload(body)) {
    const candidateFingerprint = buildQuotationFingerprint({
      customerName: body.customerName ?? body.companyName ?? body.clientName,
      projectName: body.projectName,
      architectName: body.architectName,
      pmcName: body.pmcName,
      title: body.title ?? body.quotationSubject,
      totalAmount: body.totalAmount ?? body.amount ?? computed.total,
      taxAmount: body.taxAmount ?? body.gstAmount ?? computed.tax,
      discountAmount: body.discountAmount ?? body.discount ?? computed.discount,
    }, lineItems)

    // Do not throw duplicate error when creating or updating quotation revisions for an Account or Deal
    /*
    const duplicate = await findDuplicateQuotation(actor, candidateFingerprint)
    if (duplicate) {
      const existingQuoteNumber = pickQuotationField(duplicate, 'quoteNumber', 'quotationNumber') || 'unknown'
      const customerLabel = pickQuotationField(duplicate, 'customerName', 'companyName', 'clientName') || '-'
      const projectLabel = pickQuotationField(duplicate, 'projectName') || pickQuotationField(duplicate, 'title') || '-'
      const message = `Duplicate quotation found: Quotation No. ${existingQuoteNumber} already exists for ${customerLabel} / ${projectLabel}. Please change the title, project, or quotation details before generating again.`

      const duplicateError = new AppError(message, 409, {
        code: 'DUPLICATE_QUOTATION',
        existingQuoteNumber,
        existingQuotationId: duplicate.id,
        customerName: customerLabel,
        projectName: projectLabel,
      })
      duplicateError.code = 'DUPLICATE_QUOTATION'
      throw duplicateError
    }
    */
  }

  const {
    quoteNumber,
    quotationSequence,
    quotationSequenceMonth,
  } = await resolveQuoteNumber(body, existing, actor)
  const customerName = body.customerName
    ?? body.companyName
    ?? body.clientName
    ?? existing?.customerName
    ?? existing?.data?.companyName
    ?? null
  const customerId = body.customerId
    ?? body.selectedAccountId
    ?? existing?.customerId
    ?? existing?.data?.selectedAccountId
    ?? null
  const totalAmount = body.totalAmount ?? body.amount ?? existing?.totalAmount ?? computed.total
  const taxAmount = body.taxAmount ?? body.gstAmount ?? existing?.taxAmount ?? computed.tax
  const discountAmount = body.discountAmount ?? body.discount ?? existing?.discountAmount ?? computed.discount
  const notes = body.notes ?? body.quotationNotes ?? existing?.notes ?? existing?.data?.quotationNotes ?? ''

  const revisionReason = body.revisionReason || existing?.revisionReason || ''

  return {
    quoteNumber,
    quotationNumber: quoteNumber,
    quotationSequence,
    quotationSequenceMonth,
    title: body.title ?? body.quotationSubject ?? body.projectName ?? existing?.title ?? 'Quotation',
    customerName,
    customerId,
    dealId: body.dealId ?? existing?.dealId ?? null,
    status: body.status ?? existing?.status ?? 'draft',
    totalAmount,
    taxAmount,
    discountAmount,
    currency: body.currency ?? existing?.currency ?? 'INR',
    validUntil: body.validUntil ?? existing?.validUntil ?? null,
    lineItems,
    notes,
    revisionNo,
    revisionCode,
    parentQuotationId,
    revisionReason,
    ttaOrg: body.ttaOrg ?? existing?.ttaOrg ?? '',
    assignedTo: body.assignedTo ?? existing?.assignedTo ?? (actor.role === 'user' ? actor.id : null),
    createdBy: existing?.createdBy ?? actor.id,
    data: {
      ...(existing?.data || {}),
      ...body,
      quoteNumber,
      quotationNumber: quoteNumber,
      quotationSequence,
      quotationSequenceMonth,
      customerName,
      customerId,
      amount: totalAmount,
      totalAmount,
      taxAmount,
      discountAmount,
      lineItems,
      notes,
      revisionNo,
      revisionCode,
      parentQuotationId,
      revisionReason,
      ttaOrg: body.ttaOrg ?? existing?.data?.ttaOrg ?? existing?.ttaOrg ?? '',
      quotationNotes: body.quotationNotes ?? existing?.data?.quotationNotes ?? notes,
      createdBy: existing?.createdBy ?? actor.id,
      userId: body.userId ?? existing?.data?.userId ?? existing?.createdBy ?? actor.id,
    },
  }
}

const syncQuotationToLeadsAndDeals = async (quotationRecord) => {
  try {
    const { getMongoModel } = require('../models/mongoModels')
    const Lead = getMongoModel('leads')
    const Deal = getMongoModel('deals')
    const quotationRepo = require('../repositories/quotationRepository')

    const customerId = quotationRecord.customerId || quotationRecord.data?.selectedAccountId
    const dealId = quotationRecord.dealId || quotationRecord.data?.dealId

    const allQuotes = await quotationRepo.listAll()
    const siblingQuotes = allQuotes.filter((q) => {
      const qCust = String(q.customerId || q.data?.selectedAccountId || '').trim()
      const qDeal = String(q.dealId || q.data?.dealId || '').trim()
      const qNo = String(q.quoteNumber || q.quotationNumber || '').trim()
      const thisNo = String(quotationRecord.quoteNumber || quotationRecord.quotationNumber || '').trim()

      if (thisNo && qNo === thisNo) return true
      if (dealId && qDeal === String(dealId).trim()) return true
      if (customerId && qCust === String(customerId).trim()) return true
      return false
    }).sort((a, b) => (a.revisionNo ?? 0) - (b.revisionNo ?? 0))

    const revisionAmounts = {}
    const revisionHistory = []

    siblingQuotes.forEach((sq) => {
      const code = sq.revisionCode || (sq.revisionNo === 0 ? 'R0' : sq.revisionNo ? `R${sq.revisionNo}` : 'R0')
      const explicitAmount = getExplicitRevisionAmount(sq, code)
      const amt = hasExplicitValue(explicitAmount) ? Number(explicitAmount) : 0
      revisionAmounts[code] = amt
      revisionHistory.push({
        revisionCode: code,
        revisionNo: sq.revisionNo ?? (parseInt(code.replace(/\D/g, ''), 10) || 0),
        amount: amt,
        date: sq.quotationDate || sq.createdAt || new Date().toISOString().slice(0, 10),
        status: sq.status || 'draft',
      })
    })

    const isApproved = String(quotationRecord.status || '').toLowerCase() === 'approved'

    if (isApproved && siblingQuotes.length > 1) {
      for (const sq of siblingQuotes) {
        if (String(sq.id) !== String(quotationRecord.id)) {
          try {
            await quotationRepo.update(sq.id, { status: 'SUPERSEDED', data: { ...sq.data, status: 'SUPERSEDED' } })
          } catch (e) {
            // ignore
          }
        }
      }
    }

    const productName = quotationRecord.productName || quotationRecord.product || quotationRecord.data?.productName || quotationRecord.data?.product || ''
    const productGroup = quotationRecord.productGroup || quotationRecord.data?.productGroup || ''
    const hsn = quotationRecord.hsn || quotationRecord.data?.hsn || ''
    const projectName = quotationRecord.projectName || quotationRecord.data?.projectName || ''
    const architectName = quotationRecord.architectName || quotationRecord.data?.architectName || ''
    const pmcName = quotationRecord.pmcName || quotationRecord.data?.pmcName || ''

    const syncPayload = {
      latestQuotationNumber: quotationRecord.quotationNumber || quotationRecord.quoteNumber,
      latestQuotationAmount: hasExplicitValue(getExplicitRevisionAmount(quotationRecord, quotationRecord.revisionCode || 'R0'))
        ? Number(getExplicitRevisionAmount(quotationRecord, quotationRecord.revisionCode || 'R0'))
        : quotationRecord.amount,
      quotationRevisionCode: quotationRecord.revisionCode || 'R0',
      quotationRevisionNo: quotationRecord.revisionNo ?? 0,
      quotationRevisionAmounts: quotationRecord.quotationRevisionAmounts || revisionAmounts,
      quotationRevisionHistory: quotationRecord.revisions || revisionHistory,
      quotationStatus: quotationRecord.status || 'draft',
      productName,
      productGroup,
      hsn,
      projectName,
      architectName,
      pmcName,
      updatedAt: new Date().toISOString(),
    }

    if (customerId) {
      const customerQuery = buildSafeMongoIdQuery(customerId, ['accountNumber'])
      if (customerQuery) {
      await Lead.updateOne(
        customerQuery,
        {
          $set: {
            'formData.latestQuotationNumber': syncPayload.latestQuotationNumber,
            'formData.latestQuotationAmount': syncPayload.latestQuotationAmount,
            'formData.quotationRevisionCode': syncPayload.quotationRevisionCode,
            'formData.quotationRevisionNo': syncPayload.quotationRevisionNo,
            'formData.quotationRevisionAmounts': syncPayload.quotationRevisionAmounts,
            'formData.quotationRevisionHistory': syncPayload.quotationRevisionHistory,
            'formData.quotationStatus': syncPayload.quotationStatus,
            ...(productName ? { 'formData.productName': productName, productName, productCategory: productGroup || productName } : {}),
            ...(productGroup ? { 'formData.productGroup': productGroup, productGroup } : {}),
            ...(hsn ? { 'formData.hsn': hsn, hsn } : {}),
            ...(projectName ? { 'formData.projectName': projectName, projectName } : {}),
            ...(architectName ? { 'formData.architectName': architectName, architectName } : {}),
            ...(pmcName ? { 'formData.pmcName': pmcName, pmcName } : {}),
            latestQuotationNumber: syncPayload.latestQuotationNumber,
            latestQuotationAmount: syncPayload.latestQuotationAmount,
            quotationRevisionCode: syncPayload.quotationRevisionCode,
            quotationRevisionAmounts: syncPayload.quotationRevisionAmounts,
            quotationRevisionHistory: syncPayload.quotationRevisionHistory,
            quotationStatus: syncPayload.quotationStatus,
          }
        }
      )
      }
    }

    if (dealId) {
      const dealQuery = buildSafeMongoIdQuery(dealId, ['dealNumber'])
      if (dealQuery) {
      await Deal.updateOne(
        dealQuery,
        {
          $set: {
            'data.latestQuotationNumber': syncPayload.latestQuotationNumber,
            'data.latestQuotationAmount': syncPayload.latestQuotationAmount,
            'data.quotationRevisionCode': syncPayload.quotationRevisionCode,
            'data.quotationRevisionNo': syncPayload.quotationRevisionNo,
            'data.quotationRevisionAmounts': syncPayload.quotationRevisionAmounts,
            'data.quotationRevisionHistory': syncPayload.quotationRevisionHistory,
            'data.quotationStatus': syncPayload.quotationStatus,
            ...(productName ? { 'data.productName': productName, productName } : {}),
            ...(productGroup ? { 'data.productGroup': productGroup, productGroup } : {}),
            ...(hsn ? { 'data.hsn': hsn, hsn } : {}),
            ...(projectName ? { 'data.projectName': projectName, projectName } : {}),
            ...(architectName ? { 'data.architectName': architectName, architectName } : {}),
            ...(pmcName ? { 'data.pmcName': pmcName, pmcName } : {}),
            latestQuotationNumber: syncPayload.latestQuotationNumber,
            latestQuotationAmount: syncPayload.latestQuotationAmount,
            quotationRevisionCode: syncPayload.quotationRevisionCode,
            quotationRevisionAmounts: syncPayload.quotationRevisionAmounts,
            quotationRevisionHistory: syncPayload.quotationRevisionHistory,
            quotationStatus: syncPayload.quotationStatus,
          }
        }
      )
      }
    }
  } catch (syncErr) {
    console.warn('Could not sync quotation revision to leads/deals collections:', syncErr)
  }
}

const quotationService = createCrudService({
  repository: quotationRepository,
  entityLabel: 'Quotation',
  entityType: 'quotation',
  buildPayload,
})

const applyStrictIsolation = (actor) => {
  const email = String(actor?.email || '').toLowerCase().trim()
  if (email === 'keval@swatiswitchgears.com') return { ...actor, role: 'admin' }
  return { ...actor, role: 'user' }
}

module.exports = {
  ...quotationService,
  create: async (actor, payload) => {
    const allQuotes = await quotationRepository.listAll()
    const targetCustId = String(payload.customerId || payload.selectedAccountId || payload.data?.selectedAccountId || payload.data?.customerId || '').trim()
    const targetQuoteNo = String(payload.quoteNumber || payload.quotationNumber || payload.data?.quotationNumber || payload.data?.quoteNumber || '').trim()
    const targetDealId = String(payload.dealId || payload.data?.dealId || payload.sourceDealId || payload.data?.sourceDealId || payload.dealNumber || payload.data?.dealNumber || '').trim()
    const targetAccNum = String(payload.clientAccountNumber || payload.data?.clientAccountNumber || '').trim().toLowerCase()
    const targetCompName = String(payload.companyName || payload.customerName || payload.data?.companyName || payload.data?.customerName || '').trim().toLowerCase()
    const targetContext = String(payload.quotationContext || payload.data?.quotationContext || (targetDealId ? 'deal' : 'account')).trim().toLowerCase()

    const existingMatch = allQuotes.find((q) => {
      const qCust = String(q.customerId || q.selectedAccountId || q.data?.selectedAccountId || q.data?.customerId || '').trim()
      const qNo = String(q.quoteNumber || q.quotationNumber || q.data?.quotationNumber || '').trim()
      const qDeal = String(q.dealId || q.data?.dealId || q.sourceDealId || q.data?.sourceDealId || q.dealNumber || q.data?.dealNumber || '').trim()
      const qAccNum = String(q.clientAccountNumber || q.data?.clientAccountNumber || '').trim().toLowerCase()
      const qCompName = String(q.companyName || q.customerName || q.data?.companyName || q.data?.customerName || '').trim().toLowerCase()
      const hasStrongTarget = Boolean(targetDealId || targetCustId || targetAccNum)
      const qContext = String(q.quotationContext || q.data?.quotationContext || (qDeal ? 'deal' : 'account')).trim().toLowerCase()

      if (targetContext === 'deal') {
        if (targetDealId && qDeal === targetDealId) return true
        return false
      }

      if (qContext === 'deal') return false

      if (targetCustId) return Boolean(qCust && qCust === targetCustId)
      if (targetAccNum && qAccNum && qAccNum === targetAccNum) return true
      if (!hasStrongTarget && targetQuoteNo && qNo === targetQuoteNo) return true
      if (!hasStrongTarget && targetCompName && qCompName && qCompName === targetCompName) return true
      return false
    })

    if (existingMatch) {
      const existingStatus = String(existingMatch.status || existingMatch.data?.status || '').toLowerCase()
      if (existingStatus === 'approved') {
        throw new AppError('This quotation is already approved and cannot receive another revision.', 409)
      }
      const existingRevAmounts = existingMatch.quotationRevisionAmounts || existingMatch.data?.quotationRevisionAmounts || {}
      const existingRevisions = Array.isArray(existingMatch.revisions)
        ? existingMatch.revisions
        : (Array.isArray(existingMatch.data?.revisions) ? existingMatch.data.revisions : [])

      const savedRevisionNumbers = getSavedRevisionNumbers(existingMatch)
      const currentRevNo = savedRevisionNumbers.length > 0 ? Math.max(...savedRevisionNumbers) : -1
      const nextRevNo = currentRevNo + 1
      const nextRevCode = `R${nextRevNo}`
      const newAmount = toExplicitNumber(payload[`r${nextRevNo}Amount`])
      if (newAmount === undefined) {
        throw new AppError(`${nextRevCode} Amount is required to create the next quotation revision.`, 400)
      }

      const resolveRevisionAmount = (code) => {
        const payloadValue = toExplicitNumber(payload[`${code.toLowerCase()}Amount`])
        if (payloadValue !== undefined) return payloadValue
        const existingValue = toExplicitNumber(getExplicitRevisionAmount(existingMatch, code))
        return existingValue
      }

      const r0Amt = resolveRevisionAmount('R0')
      const r1Amt = resolveRevisionAmount('R1')
      const r2Amt = resolveRevisionAmount('R2')
      const r3Amt = resolveRevisionAmount('R3')

      const updatedRevAmounts = {
        ...existingRevAmounts,
        ...(r0Amt !== undefined && r0Amt !== null && r0Amt !== '' ? { R0: Number(r0Amt) } : {}),
        ...(r1Amt !== undefined && r1Amt !== null && r1Amt !== '' ? { R1: Number(r1Amt) } : {}),
        ...(r2Amt !== undefined && r2Amt !== null && r2Amt !== '' ? { R2: Number(r2Amt) } : {}),
        ...(r3Amt !== undefined && r3Amt !== null && r3Amt !== '' ? { R3: Number(r3Amt) } : {}),
        [nextRevCode]: newAmount,
      }

      const updatedRevisionsList = [...existingRevisions]
      if (updatedRevisionsList.length === 0 && r0Amt !== undefined && r0Amt !== null && r0Amt !== '') {
        updatedRevisionsList.push({
          revisionCode: 'R0',
          amount: Number(r0Amt),
          date: existingMatch.quotationDate || existingMatch.data?.quotationDate || existingMatch.createdAt || new Date().toISOString().slice(0, 10),
          status: existingMatch.status || 'Open',
        })
      }
      const nextRevisionEntry = {
        revisionCode: nextRevCode,
        amount: newAmount,
        date: new Date().toISOString().slice(0, 10),
        status: 'Open',
      }
      const existingRevisionIndex = updatedRevisionsList.findIndex((revision) => {
        const code = revision.revisionCode || (revision.revisionNo === 0 ? 'R0' : revision.revisionNo ? `R${revision.revisionNo}` : '')
        return code === nextRevCode
      })
      if (existingRevisionIndex >= 0) {
        updatedRevisionsList[existingRevisionIndex] = {
          ...updatedRevisionsList[existingRevisionIndex],
          ...nextRevisionEntry,
        }
      } else {
        updatedRevisionsList.push(nextRevisionEntry)
      }

      const updatePayload = {
        ...payload,
        revisionCode: nextRevCode,
        revisionNo: nextRevNo,
        r0Amount: r0Amt !== undefined ? String(r0Amt) : existingMatch.data?.r0Amount,
        r1Amount: r1Amt !== undefined ? String(r1Amt) : existingMatch.data?.r1Amount,
        r2Amount: r2Amt !== undefined ? String(r2Amt) : existingMatch.data?.r2Amount,
        r3Amount: r3Amt !== undefined ? String(r3Amt) : existingMatch.data?.r3Amount,
        revisionAmountR0: r0Amt !== undefined ? Number(r0Amt) : existingMatch.revisionAmountR0,
        revisionAmountR1: r1Amt !== undefined ? Number(r1Amt) : existingMatch.revisionAmountR1,
        revisionAmountR2: r2Amt !== undefined ? Number(r2Amt) : existingMatch.revisionAmountR2,
        revisionAmountR3: r3Amt !== undefined ? Number(r3Amt) : existingMatch.revisionAmountR3,
        [`revisionAmount${nextRevCode}`]: newAmount,
        quotationRevisionAmounts: updatedRevAmounts,
        revisions: updatedRevisionsList,
        status: 'Open',
      }

      const updatedResult = await quotationService.update(actor, existingMatch.id, updatePayload)
      await syncQuotationToLeadsAndDeals(updatedResult)
      return updatedResult
    }

    const initialAmount = toExplicitNumber(payload.r0Amount) ?? toExplicitNumber(payload.revisionAmountR0)
    if (initialAmount === undefined) {
      throw new AppError('R0 Amount is required to create the first quotation revision.', 400)
    }
    const initialRevCode = payload.revisionCode || 'R0'
    const initialRevNo = payload.revisionNo ?? 0
    const result = await quotationService.create(actor, {
      ...payload,
      status: 'Open',
      revisionCode: initialRevCode,
      revisionNo: initialRevNo,
      revisionAmountR0: payload.revisionAmountR0 ?? (initialRevCode === 'R0' ? initialAmount : 0),
      quotationRevisionAmounts: payload.quotationRevisionAmounts || { [initialRevCode]: initialAmount },
      revisions: payload.revisions || [{ revisionCode: initialRevCode, amount: initialAmount, date: new Date().toISOString().slice(0, 10), status: 'Open' }],
    })
    await syncQuotationToLeadsAndDeals(result)
    try {
      const { findUserById } = require('../repositories/userRepository')
      const assignedUserId = result.assignedTo || actor.id
      const userRecord = assignedUserId ? await findUserById(assignedUserId) : null
      const ownerName = userRecord?.name || result.data?.selectedAccountOwner || result.data?.quotationOwner || ''
      const ownerCode = userRecord?.ownerCode || result.ownerCode || result.data?.ownerCode || result.data?.customerOwnerCode || ''

      const customerService = require('./customerService')
      const customerPayload = {
        name: result.customerName || result.companyName || result.title || 'Quotation Customer',
        accountId: result.customerId || null,
        email: result.data?.email || result.data?.organizationEmail || null,
        phone: result.data?.telephone || result.data?.phone || result.data?.organizationPhone || null,
        company: result.companyName || result.customerName || null,
        assignedTo: assignedUserId,
        customerOwner: ownerName,
        customerOwnerName: ownerName,
        customerOwnerDisplay: ownerName,
        customerOwnerCode: ownerCode,
        customerStatus: 'pending',
        customerCategory: 'SWATI',
        contacts: [],
        documents: []
      };
      
      delete customerPayload.data;
      
      await customerService.create(actor, customerPayload)
    } catch (err) {
      console.warn('Could not auto-create customer upon quotation generation', err)
    }
    return result
  },
  approveQuotation: async (actor, id, payload = {}) => {
    const existing = await quotationService.get(actor, id)
    if (!existing) {
      throw new AppError('Quotation not found.', 404)
    }

    const targetRevCode = payload.revisionCode || existing.revisionCode || 'R1'
    const updatedRevisions = Array.isArray(existing.revisions)
      ? [...existing.revisions]
      : (Array.isArray(existing.data?.revisions) ? [...existing.data.revisions] : [])

    if (updatedRevisions.length > 0) {
      updatedRevisions.forEach((rev) => {
        if (rev.revisionCode === targetRevCode || (!payload.revisionCode && rev.revisionCode === existing.revisionCode)) {
          rev.status = 'Approved'
        }
      })
    } else {
      const approvedAmount = getExplicitRevisionAmount(existing, targetRevCode)
      updatedRevisions.push({
        revisionCode: targetRevCode,
        amount: hasExplicitValue(approvedAmount) ? Number(approvedAmount) : 0,
        date: new Date().toISOString().slice(0, 10),
        status: 'Approved',
      })
    }

    const updateData = {
      status: 'Approved',
      revisionCode: targetRevCode,
      revisions: updatedRevisions,
      data: {
        ...(existing.data || {}),
        status: 'Approved',
        revisionCode: targetRevCode,
        revisions: updatedRevisions,
      },
      updatedAt: new Date().toISOString(),
    }

    const result = await quotationService.update(actor, id, updateData)
    await syncQuotationToLeadsAndDeals(result)
    return result
  },
  update: async (actor, id, payload) => {
    const result = await quotationService.update(actor, id, payload)
    await syncQuotationToLeadsAndDeals(result)
    return result
  },
  list: (actor, filters = {}) => quotationService.list(applyStrictIsolation(actor), filters),
  get: (actor, id) => quotationService.get(applyStrictIsolation(actor), id),
  search: (actor, query) => quotationService.search(applyStrictIsolation(actor), query),
  getQuotationContextDetails: async (actor, queryParams = {}) => {
    const { getMongoModel } = require('../models/mongoModels')
    const Lead = getMongoModel('leads')
    const Deal = getMongoModel('deals')
    const Customer = getMongoModel('customers')
    const quotationRepo = require('../repositories/quotationRepository')

    const targetAccountId = String(queryParams.accountId || queryParams.selectedAccountId || '').trim()
    const targetAccountNumber = String(queryParams.accountNumber || queryParams.accountNo || '').trim()
    const targetDealId = String(queryParams.dealId || queryParams.sourceDealId || queryParams.dealNumber || '').trim()
    const context = queryParams.quotationContext || (targetDealId ? 'deal' : 'account')

    const buildIdQuery = (targetId, extraStringFields = []) => {
      return buildSafeMongoIdQuery(targetId, extraStringFields)
    }

    let accountDoc = null
    const accQuery = buildIdQuery(targetAccountId || targetAccountNumber, ['accountNumber', 'accountNo'])
    if (accQuery) {
      accountDoc = await Lead.findOne(accQuery).lean()
      if (!accountDoc) {
        accountDoc = await Customer.findOne(accQuery).lean()
      }
    }

    let dealDoc = null
    const dealQuery = buildIdQuery(targetDealId, ['dealNumber'])
    if (dealQuery) {
      dealDoc = await Deal.findOne(dealQuery).lean()
    }

    if (!accountDoc && dealDoc) {
      const linkedAccId = dealDoc.accountId || dealDoc.data?.accountId || dealDoc.customerId || dealDoc.data?.customerId
      const linkedAccQuery = buildIdQuery(linkedAccId, ['accountNumber'])
      if (linkedAccQuery) {
        accountDoc = await Lead.findOne(linkedAccQuery).lean()
        if (!accountDoc) {
          accountDoc = await Customer.findOne(linkedAccQuery).lean()
        }
      }
    }

    const accNum = accountDoc?.accountNumber || accountDoc?.accountNo || accountDoc?.formData?.accountNumber || targetAccountNumber

    const dealIdCandidates = new Set()
    if (targetDealId) dealIdCandidates.add(targetDealId)
    if (dealDoc) {
      if (dealDoc._id) dealIdCandidates.add(String(dealDoc._id))
      if (dealDoc.id) dealIdCandidates.add(String(dealDoc.id))
      if (dealDoc.legacyId) dealIdCandidates.add(String(dealDoc.legacyId))
      if (dealDoc.dealNumber) dealIdCandidates.add(String(dealDoc.dealNumber))
    }

    const allQuotes = await quotationRepo.listAll()
    const targetCompName = String(accountDoc?.name || accountDoc?.company || accountDoc?.formData?.name || '').trim().toLowerCase()

    const matchingQuotes = allQuotes.filter((q) => {
      const qDealId = String(q.dealId || q.data?.dealId || q.sourceDealId || q.data?.sourceDealId || q.dealNumber || q.data?.dealNumber || q.raw?.dealId || '').trim()
      const qAccId = String(q.customerId || q.selectedAccountId || q.data?.selectedAccountId || q.data?.customerId || '').trim()
      const qAccNum = String(q.clientAccountNumber || q.data?.clientAccountNumber || '').trim()
      const qCompName = String(q.companyName || q.customerName || q.data?.companyName || q.data?.customerName || '').trim().toLowerCase()
      const qContext = String(q.quotationContext || q.data?.quotationContext || (qDealId ? 'deal' : 'account')).trim().toLowerCase()

      if (context === 'deal') {
        if (qDealId && dealIdCandidates.size > 0 && dealIdCandidates.has(qDealId)) return true
        return false
      }

      if (qContext === 'deal') return false

      if (targetAccountId) return Boolean(qAccId && qAccId === targetAccountId)
      if (accNum && qAccNum && qAccNum === accNum) return true
      if (!targetAccountId && !accNum && targetCompName && qCompName && qCompName === targetCompName) return true
      return false
    }).sort((a, b) => (a.revisionNo ?? 0) - (b.revisionNo ?? 0))

    const savedRevisions = {}

    matchingQuotes.forEach((q) => {
      getSavedRevisionNumbers(q).forEach((revisionNumber) => {
        const code = `R${revisionNumber}`
        const explicitAmount = getExplicitRevisionAmount(q, code)
        if (hasExplicitValue(explicitAmount)) savedRevisions[code] = explicitAmount
      })
    })

    const isR0Locked = hasExplicitValue(savedRevisions.R0)
    const isR1Locked = hasExplicitValue(savedRevisions.R1)
    const isR2Locked = hasExplicitValue(savedRevisions.R2)
    const isR3Locked = hasExplicitValue(savedRevisions.R3)

    const latestQuote = matchingQuotes.length > 0 ? matchingQuotes[matchingQuotes.length - 1] : null
    const savedRevisionNumbers = Object.keys(savedRevisions)
      .map((code) => parseRevisionNumber(code))
      .filter((number) => number !== null)
    const currentRevisionNumber = savedRevisionNumbers.length > 0 ? Math.max(...savedRevisionNumbers) : null
    const currentRevisionCode = currentRevisionNumber === null ? null : `R${currentRevisionNumber}`
    const quotationStatus = String(latestQuote?.status || latestQuote?.data?.status || 'Open')
    const isApproved = quotationStatus.toLowerCase() === 'approved'
    const nextRevisionCode = isApproved
      ? null
      : `R${currentRevisionNumber === null ? 0 : currentRevisionNumber + 1}`

    const productName = latestQuote?.productName || latestQuote?.data?.productName || dealDoc?.productName || dealDoc?.data?.productName || accountDoc?.productName || accountDoc?.formData?.productName || accountDoc?.productCategory || ''
    const productGroup = latestQuote?.productGroup || latestQuote?.data?.productGroup || dealDoc?.productGroup || dealDoc?.data?.productGroup || accountDoc?.productGroup || accountDoc?.formData?.productGroup || 'Non TTA'
    const ttaOrg = latestQuote?.ttaOrg || latestQuote?.data?.ttaOrg || dealDoc?.ttaOrg || dealDoc?.data?.ttaOrg || accountDoc?.ttaOrg || accountDoc?.formData?.ttaOrg || 'Abp'
    const hsn = latestQuote?.hsn || latestQuote?.data?.hsn || dealDoc?.hsn || dealDoc?.data?.hsn || accountDoc?.hsn || accountDoc?.formData?.hsn || ''
    const projectName = latestQuote?.projectName || latestQuote?.data?.projectName || dealDoc?.projectName || dealDoc?.data?.projectName || accountDoc?.projectName || accountDoc?.formData?.projectName || accountDoc?.name || ''
    const architectName = latestQuote?.architectName || latestQuote?.data?.architectName || dealDoc?.architectName || dealDoc?.data?.architectName || accountDoc?.architectName || accountDoc?.formData?.architectName || ''
    const pmcName = latestQuote?.pmcName || latestQuote?.data?.pmcName || dealDoc?.pmcName || dealDoc?.data?.pmcName || accountDoc?.pmcName || accountDoc?.formData?.pmcName || ''

    return {
      savedRevisions,
      locks: {
        isR0Locked,
        isR1Locked,
        isR2Locked,
        isR3Locked,
      },
      autofill: {
        productName,
        productGroup,
        ttaOrg,
        hsn,
        projectName,
        architectName,
        pmcName,
        clientAccountNumber: accountDoc?.accountNumber || accountDoc?.formData?.accountNumber || '',
        companyName: accountDoc?.name || accountDoc?.company || accountDoc?.formData?.name || '',
        contactPerson: accountDoc?.contactPerson || accountDoc?.formData?.contactPerson || '',
        telephone: accountDoc?.contactMobile || accountDoc?.contactPhone || accountDoc?.phone || accountDoc?.formData?.phone || '',
        email: accountDoc?.contactEmail || accountDoc?.email || accountDoc?.formData?.email || '',
        gstin: accountDoc?.gstin || accountDoc?.formData?.gstin || '',
        stateCode: accountDoc?.stateCode || accountDoc?.formData?.stateCode || '',
      },
      existingQuotesCount: matchingQuotes.length,
      currentRevisionCode,
      currentRevisionNumber,
      quotationStatus,
      nextRevisionCode,
      nextRevisionAllowed: !isApproved,
    }
  },
}
module.exports.normalizeLineItems = normalizeLineItems
