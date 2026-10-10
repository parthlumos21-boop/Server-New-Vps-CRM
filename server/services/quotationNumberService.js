const { getMongoModel } = require('../models/mongoModels')
const userRepository = require('../repositories/userRepository')

/**
 * Determines the Indian Financial Year (starts April 1, ends March 31).
 * Example:
 *   31-03-2026 -> 2025
 *   01-04-2026 -> 2026
 *   31-03-2027 -> 2026
 *   01-04-2027 -> 2027
 */
const getFinancialYear = (referenceDate) => {
  const date = new Date(referenceDate || Date.now())
  const validDate = Number.isNaN(date.getTime()) ? new Date() : date
  const year = validDate.getFullYear()
  const month = validDate.getMonth() + 1 // 1-indexed: 1 = Jan, 4 = Apr
  return month >= 4 ? year : year - 1
}

/**
 * Resolves ownerCode for the authenticated user / actor.
 * Looks up the user document in MongoDB 'users' collection.
 */
const resolveOwnerCode = async (actor) => {
  let ownerCode = null
  if (actor?.id) {
    try {
      const userRecord = await userRepository.findUserById(actor.id)
      if (userRecord) {
        ownerCode = userRecord.ownerCode || userRecord.owner_code || userRecord.employeeId || null
      }
    } catch (_err) {
      // Fallback to actor context
    }
  }

  if (!ownerCode && actor) {
    ownerCode = actor.ownerCode || actor.owner_code || actor.employeeId || null
  }

  return String(ownerCode || '1001').trim()
}

/**
 * Generates the next atomic global quotation number for the given financial year.
 * Format: SSIPL/{FinancialYear}/{5-DigitSequence}-{OwnerCode}
 * Example: SSIPL/2026/00001-1016
 */
const generateQuotationNumber = async (actor, referenceDate) => {
  const financialYear = getFinancialYear(referenceDate)
  const QuotationNumberCounter = getMongoModel('quotation_number_counters')

  const counterDoc = await QuotationNumberCounter.findOneAndUpdate(
    { financialYear },
    {
      $inc: { sequence: 1 },
      $setOnInsert: { createdAt: new Date() },
      $set: { updatedAt: new Date() },
    },
    {
      upsert: true,
      new: true,
      setDefaultsOnInsert: true,
    }
  ).lean()

  const sequenceNumber = counterDoc ? counterDoc.sequence : 1
  const paddedSequence = String(sequenceNumber).padStart(5, '0')
  const ownerCode = await resolveOwnerCode(actor)

  const quoteNumber = `SSIPL/${financialYear}/${paddedSequence}-${ownerCode}`
  return {
    quoteNumber,
    financialYear,
    sequence: sequenceNumber,
    ownerCode,
  }
}

/**
 * Formats a base quotation number with an active revision code suffix (e.g. -R1, -R2).
 */
const formatQuotationNumberWithRevision = (baseNumber, revisionCode = 'R0') => {
  if (!baseNumber) return ''
  const cleanBase = String(baseNumber).replace(/-R\d+$/i, '').trim()
  const cleanRev = String(revisionCode || '').trim()
  if (!cleanRev || cleanRev === 'R0' || cleanRev.toLowerCase() === 'normal') {
    return cleanBase
  }
  return `${cleanBase}-${cleanRev.toUpperCase()}`
}

/**
 * Strictly checks if a quotation number matches the new dynamic format:
 * Format: SSIPL/{FinancialYear}/{5-DigitSequence}-{OwnerCode}[-Rx]
 * Example: SSIPL/2026/00001-1016 or SSIPL/2026/00001-1016-R1
 */
const isNewQuotationNumberFormat = (quotationNumber = '') => {
  return /^SSIPL\/\d{4}\/\d{5}-\d+/i.test(String(quotationNumber || '').trim())
}

/**
 * Resolves or allocates a standardized SSIPL series quotation number for legacy/old records.
 * Maintains atomic counter uniqueness using 'quotation_number_counters'.
 */
const resolveOrAllocateQuotationNumber = async (record, actor) => {
  if (!record) return ''

  const existingNum = String(
    record.quoteNumber || record.quotationNumber || record.data?.quotationNumber || record.data?.quoteNumber || ''
  ).trim()

  // If already in new series format (SSIPL/YYYY/XXXXX-ownerCode[-Rx]), retain it to prevent re-numbering
  if (existingNum && isNewQuotationNumberFormat(existingNum)) {
    return existingNum
  }

  // Atomically allocate next sequence number from counter
  const referenceDate = record.quotationDate || record.createdAt || Date.now()
  const generated = await generateQuotationNumber(actor || { id: record.createdBy }, referenceDate)

  const revCode = record.revisionCode || (record.revisionNo ? `R${record.revisionNo}` : 'R0')
  const newFormattedNumber = formatQuotationNumberWithRevision(generated.quoteNumber, revCode)

  // Persist updated number back to MongoDB quotation record if ID exists
  if (record.id || record._id) {
    try {
      const QuotationModel = getMongoModel('quotations')
      const targetId = record.id || record._id
      await QuotationModel.updateOne(
        { $or: [{ id: targetId }, { _id: targetId }] },
        {
          $set: {
            quoteNumber: newFormattedNumber,
            quotationNumber: newFormattedNumber,
            'data.quoteNumber': newFormattedNumber,
            'data.quotationNumber': newFormattedNumber,
            updatedAt: new Date(),
          },
        }
      )
    } catch (_updateErr) {
      // Ignored non-blocking update
    }
  }

  return newFormattedNumber
}

module.exports = {
  getFinancialYear,
  resolveOwnerCode,
  generateQuotationNumber,
  formatQuotationNumberWithRevision,
  isNewQuotationNumberFormat,
  resolveOrAllocateQuotationNumber,
}

