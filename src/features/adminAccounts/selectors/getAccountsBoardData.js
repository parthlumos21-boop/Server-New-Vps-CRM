import { normalizeAccountRecord } from '../adapters/normalizeAccountRecord'
import { getVisibleAccountStages } from '../config/accountStages'

export const compareAccountsByNumberAsc = (left = {}, right = {}) => {
  const timeA = new Date(left.createdAt || left.accountDate || left.date || 0).getTime()
  const timeB = new Date(right.createdAt || right.accountDate || right.date || 0).getTime()
  if (timeA !== timeB) return timeB - timeA

  const leftNumber = Number(resolveAccountOwnerSeriesNumber(left) || 0)
  const rightNumber = Number(resolveAccountOwnerSeriesNumber(right) || 0)

  if (leftNumber !== rightNumber) {
    return rightNumber - leftNumber
  }

  const leftId = Number(left.id) || 0
  const rightId = Number(right.id) || 0
  if (leftId !== rightId) {
    return rightId - leftId
  }

  return String(right.name || '').localeCompare(String(left.name || ''))
}

const resolveAccountOwnerSeriesNumber = (record = {}) => {
  const ownerCode = record.accountOwnerCode
    || record.raw?.accountOwnerCode
    || record.raw?.formData?.accountOwnerCode
    || record.raw?.formData?.ownerCode
    || record.ownerCode
    || record.raw?.ownerCode

  return String(ownerCode || '').trim()
}

const resolveStoredAccountNumber = (record = {}, index = 0) => {
  const ownerCode = record.accountOwnerCode
    || record.raw?.accountOwnerCode
    || record.raw?.formData?.accountOwnerCode
    || record.raw?.formData?.ownerCode

  if (ownerCode) {
    return String(ownerCode).trim()
  }

  const storedValue = record.originalAccountNumber
    || record.accountNumber
    || record.accountNo
    || record.account_no
    || record.raw?.accountNumber
    || record.raw?.accountNo
    || record.raw?.account_no

  if (storedValue) {
    return String(storedValue)
  }

  const ownerSeriesNumber = resolveAccountOwnerSeriesNumber(record)
  return String(ownerSeriesNumber || 1001 + index)
}

export const getAccountsBoardData = (accounts = []) => {
  const records = accounts
    .map((account, index) => normalizeAccountRecord(account, index, { recordSource: 'live' }))
    .filter(Boolean)
    .map((record, index) => ({
      ...record,
      originalAccountNumber: record.originalAccountNumber || record.accountNumber,
      accountNumber: resolveStoredAccountNumber(record, index),
    }))
    .sort((left, right) => {
      const timeA = new Date(left.createdAt || left.accountDate || left.date || 0).getTime()
      const timeB = new Date(right.createdAt || right.accountDate || right.date || 0).getTime()
      if (timeA !== timeB) return timeB - timeA
      const leftId = Number(left.id) || 0
      const rightId = Number(right.id) || 0
      return rightId - leftId
    })

  const stages = getVisibleAccountStages()
  const countsByStage = stages.reduce((lookup, stage) => {
    lookup[stage.key] = 0
    return lookup
  }, {})

  const rowsByStage = stages.reduce((lookup, stage) => {
    lookup[stage.key] = []
    return lookup
  }, {})

  records.forEach((record) => {
    const addToStage = (targetStage) => {
      if (!countsByStage[targetStage]) {
        countsByStage[targetStage] = 0
        rowsByStage[targetStage] = []
      }
      
      if (!rowsByStage[targetStage].some(r => r.id === record.id)) {
        countsByStage[targetStage] += 1
        rowsByStage[targetStage].push(record)
      }
    }

    // Add to its primary stage
    addToStage(record.stage)

    // Also display converted and rejected records in the 'new' tab so they remain visible
    if ((record.isConverted || record.stage === 'converted' || record.stage === 'rejected') && record.stage !== 'new') {
      addToStage('new')
    }
  })

  return {
    records,
    stages,
    countsByStage,
    rowsByStage,
    totalRecords: records.length,
  }
}
