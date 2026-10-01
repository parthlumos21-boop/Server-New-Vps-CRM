/**
 * Detect duplicate customers based on phone and/or email
 * @param {object[]} records - Customer records to check
 * @param {object} mappings - CSV column to field mappings
 * @param {object} duplicateConfig - Duplicate check configuration
 * @returns {{ duplicates: object[], hasDuplicates: boolean }}
 */
export const detectDuplicates = (records, mappings, duplicateConfig) => {
  const duplicates = []
  const seen = {}

  // Build reverse mapping: field -> csvColumn
  const fieldToColumn = {}
  Object.entries(mappings).forEach(([col, field]) => {
    fieldToColumn[field] = col
  })

  const phoneColumn = fieldToColumn['phone']
  const emailColumn = fieldToColumn['email']

  records.forEach((record, index) => {
    const rowIndex = index + 2 // +2 because headers are row 1, data starts at row 2
    const duplicateReasons = []

    // Check phone duplicate
    if (duplicateConfig.checkPhone && phoneColumn && record[phoneColumn]) {
      const phone = record[phoneColumn].toString().trim()
      if (phone) {
        const key = `phone:${phone}`
        if (seen[key]) {
          duplicateReasons.push('phone')
        } else {
          seen[key] = rowIndex
        }
      }
    }

    // Check email duplicate
    if (duplicateConfig.checkEmail && emailColumn && record[emailColumn]) {
      const email = record[emailColumn].toString().trim().toLowerCase()
      if (email) {
        const key = `email:${email}`
        if (seen[key]) {
          duplicateReasons.push('email')
        } else {
          seen[key] = rowIndex
        }
      }
    }

    if (duplicateReasons.length > 0) {
      duplicates.push({
        rowIndex,
        reasons: duplicateReasons,
        phone: phoneColumn ? record[phoneColumn] : null,
        email: emailColumn ? record[emailColumn] : null,
      })
    }
  })

  return {
    duplicates,
    hasDuplicates: duplicates.length > 0,
  }
}

/**
 * Get duplicate reason description
 * @param {string[]} reasons - Array of duplicate reason codes
 * @returns {string}
 */
export const getDuplicateReasonText = (reasons) => {
  if (!reasons || reasons.length === 0) return ''
  return reasons.map((reason) => (reason === 'phone' ? 'Phone' : 'Email')).join(' & ')
}

/**
 * Get action description
 * @param {string} action - Action code
 * @returns {string}
 */
export const getActionDescriptionText = (action) => {
  const actions = {
    skip: 'Skip duplicate records',
    update: 'Update existing records',
    error: 'Stop import on duplicate',
  }
  return actions[action] || 'Unknown action'
}
