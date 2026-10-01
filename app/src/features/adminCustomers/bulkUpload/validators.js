import {
  BULK_UPLOAD_CUSTOMER_CONSTRAINTS,
  BULK_UPLOAD_CUSTOMER_REQUIRED_FIELDS,
} from './constants'

/**
 * Validate file before processing
 * @param {File} file - File object
 * @returns {{ isValid: boolean, error: string | null }}
 */
export const validateCustomerFile = (file) => {
  if (!file) {
    return { isValid: false, error: 'No file selected' }
  }

  const extension = file.name.split('.').pop().toLowerCase()
  if (!BULK_UPLOAD_CUSTOMER_CONSTRAINTS.ALLOWED_EXTENSIONS.includes(extension)) {
    return { isValid: false, error: 'Only CSV files are allowed' }
  }

  if (file.size > BULK_UPLOAD_CUSTOMER_CONSTRAINTS.MAX_FILE_SIZE) {
    return {
      isValid: false,
      error: `File size exceeds ${BULK_UPLOAD_CUSTOMER_CONSTRAINTS.MAX_FILE_SIZE / 1024 / 1024}MB limit`,
    }
  }

  return { isValid: true, error: null }
}

/**
 * Validate CSV headers
 * @param {string[]} headers - CSV headers
 * @returns {{ isValid: boolean, errors: string[] }}
 */
export const validateCustomerHeaders = (headers) => {
  const errors = []

  if (!headers || headers.length === 0) {
    errors.push('CSV file has no headers')
    return { isValid: false, errors }
  }

  const uniqueHeaders = new Set(headers)
  if (uniqueHeaders.size !== headers.length) {
    errors.push('CSV contains duplicate column headers')
  }

  return { isValid: errors.length === 0, errors }
}

/**
 * Validate field mappings for customers
 * @param {object} mappings - Column to field mappings
 * @param {string[]} csvHeaders - Original CSV headers
 * @returns {{ isValid: boolean, errors: string[] }}
 */
export const validateCustomerMappings = (mappings, csvHeaders) => {
  const errors = []

  BULK_UPLOAD_CUSTOMER_REQUIRED_FIELDS.forEach((requiredField) => {
    const isMapped = Object.values(mappings).includes(requiredField)
    if (!isMapped) {
      errors.push(`Required field '${requiredField}' is not mapped`)
    }
  })

  if (Object.keys(mappings).length === 0) {
    errors.push('At least one field must be mapped')
  }

  return { isValid: errors.length === 0, errors }
}

/**
 * Validate customer data records
 * @param {object[]} records - Data records to validate
 * @param {object} mappings - Column to field mappings
 * @returns {{ isValid: boolean, errors: string[] }}
 */
export const validateCustomerRecords = (records, mappings) => {
  const errors = []

  if (!records || records.length === 0) {
    errors.push('No data records found')
    return { isValid: false, errors }
  }

  if (records.length > BULK_UPLOAD_CUSTOMER_CONSTRAINTS.MAX_ROWS) {
    errors.push(
      `Number of records exceeds ${BULK_UPLOAD_CUSTOMER_CONSTRAINTS.MAX_ROWS} limit`
    )
  }

  records.forEach((record, index) => {
    BULK_UPLOAD_CUSTOMER_REQUIRED_FIELDS.forEach((requiredField) => {
      const csvColumn = Object.keys(mappings).find((col) => mappings[col] === requiredField)
      if (csvColumn && !record[csvColumn]) {
        errors.push(`Row ${index + 2}: Required field '${requiredField}' is empty`)
      }
    })
  })

  return { isValid: errors.length === 0, errors }
}

/**
 * Validate duplicate configuration
 * @param {object} duplicateConfig - Duplicate check config
 * @returns {{ isValid: boolean, errors: string[] }}
 */
export const validateDuplicateConfig = (duplicateConfig) => {
  const errors = []

  if (!duplicateConfig.checkPhone && !duplicateConfig.checkEmail) {
    errors.push('Select at least one duplicate check method')
  }

  if (!duplicateConfig.action) {
    errors.push('Select an action for duplicate records')
  }

  return { isValid: errors.length === 0, errors }
}
