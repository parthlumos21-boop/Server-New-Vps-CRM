const { AppError } = require('../utils/appError')
const logger = require('../utils/logger')

const isDatabaseConnectionError = (error) => {
  if (!error) return false

  const knownCodes = new Set(['28P01', '3D000', 'ECONNREFUSED', 'ENOTFOUND'])
  if (knownCodes.has(error.code)) {
    return true
  }

  const message = String(error.message || '').toLowerCase()
  return (
    message.includes('password authentication failed')
    || message.includes('connect econnrefused')
    || message.includes('database system is starting up')
    || message.includes('database does not exist')
  )
}

const isDuplicateRecordError = (error) => String(error?.code || '') === '23505'
const isInvalidInputSyntaxError = (error) => String(error?.code || '') === '22P02'
const isForeignKeyError = (error) => String(error?.code || '') === '23503'
const isNotNullViolationError = (error) => String(error?.code || '') === '23502'

const getDuplicateRecordMessage = (error) => {
  const constraint = String(error?.constraint || '')

  if (constraint === 'idx_leads_account_no' || constraint === 'leads_account_no_key') {
    return 'Account number mapping requires the latest account-number database update.'
  }

  if (constraint === 'quotations_quote_number_key' || constraint === 'idx_quotations_quote_number') {
    return 'A quotation with this quotation number already exists.'
  }

  return 'A record with this value already exists.'
}

const getInvalidInputSyntaxMessage = () => (
  'One or more fields contain an invalid number or ID. Leave optional numeric fields empty or enter a valid value.'
)

const getForeignKeyMessage = (error) => {
  const constraint = String(error?.constraint || '').toLowerCase()

  if (constraint.includes('account_id')) {
    return 'The selected account could not be linked. Please refresh the page and choose the account again.'
  }

  if (constraint.includes('deal_id') || constraint.includes('source_deal_id')) {
    return 'The selected deal could not be linked. Please refresh the page and choose the deal again.'
  }

  if (constraint.includes('quotation')) {
    return 'The selected quotation could not be linked. Please refresh and choose the quotation again.'
  }

  if (constraint.includes('owner') || constraint.includes('assigned')) {
    return 'The selected owner or assignee could not be linked. Please refresh and choose a valid user.'
  }

  return 'A linked record could not be saved because it no longer exists or is not available.'
}

const getNotNullViolationMessage = (error) => {
  const column = String(error?.column || '').replace(/_/g, ' ').trim()
  if (column) {
    return `${column.charAt(0).toUpperCase()}${column.slice(1)} is required.`
  }

  return 'A required field is missing.'
}

const notFoundHandler = (req, _res, next) => {
  next(new AppError(`Route not found: ${req.method} ${req.originalUrl}`, 404))
}

const errorHandler = (error, req, res, _next) => {
  void _next
  const duplicateRecordError = !(error instanceof AppError) && isDuplicateRecordError(error)
  const invalidInputSyntaxError = !(error instanceof AppError) && isInvalidInputSyntaxError(error)
  const foreignKeyError = !(error instanceof AppError) && isForeignKeyError(error)
  const notNullViolationError = !(error instanceof AppError) && isNotNullViolationError(error)
  const databaseConnectionError = !(error instanceof AppError) && isDatabaseConnectionError(error)
  const statusCode = databaseConnectionError
    ? 503
    : duplicateRecordError
      ? 409
      : invalidInputSyntaxError || foreignKeyError || notNullViolationError
        ? 400
        : (error instanceof AppError ? error.statusCode : (error?.status || 500))
  const requestId = req?.id || req?.headers?.['x-request-id'] || null

  if (statusCode >= 500) {
    const log = req?.log || logger
    log.error({ err: error, requestId, path: req?.originalUrl }, 'Unhandled server error')
  } else if (statusCode >= 400) {
    const log = req?.log || logger
    log.warn({ status: statusCode, requestId, message: error.message, path: req?.originalUrl }, 'Client error')
  }

  const body = {
    success: false,
    message: databaseConnectionError
      ? 'Database connection is not ready. Start MongoDB and restart the backend.'
      : duplicateRecordError
        ? getDuplicateRecordMessage(error)
        : invalidInputSyntaxError
          ? getInvalidInputSyntaxMessage(error)
          : foreignKeyError
            ? getForeignKeyMessage(error)
            : notNullViolationError
              ? getNotNullViolationMessage(error)
              : (error.message || 'Something went wrong.'),
    code: databaseConnectionError
      ? 'DATABASE_UNAVAILABLE'
      : duplicateRecordError
        ? 'DUPLICATE_RECORD'
        : invalidInputSyntaxError
          ? 'INVALID_FIELD_VALUE'
          : foreignKeyError
            ? 'RELATIONSHIP_ERROR'
            : notNullViolationError
              ? 'REQUIRED_FIELD_MISSING'
              : (error.code || (statusCode >= 500 ? 'SERVER_ERROR' : 'CLIENT_ERROR')),
    requestId,
  }

  if (error.details) body.details = error.details
  if (process.env.NODE_ENV !== 'production' && statusCode >= 500 && error?.stack) {
    body.stack = error.stack
  }

  res.status(statusCode).json(body)
}

module.exports = {
  notFoundHandler,
  errorHandler,
}
