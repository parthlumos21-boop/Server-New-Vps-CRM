import { normalizeAccountRecord } from '../adapters/normalizeAccountRecord'
import { getVisibleAccountStages } from '../config/accountStages'

export const compareAccountsByNumberAsc = (left = {}, right = {}) => {
  const leftNumber = Number(left.accountNumber || left.accountNo || left.account_no || 0)
  const rightNumber = Number(right.accountNumber || right.accountNo || right.account_no || 0)

  if (leftNumber !== rightNumber) {
    return leftNumber - rightNumber
  }

  const leftId = Number(left.id) || 0
  const rightId = Number(right.id) || 0
  if (leftId !== rightId) {
    return leftId - rightId
  }

  return String(left.name || '').localeCompare(String(right.name || ''))
}

export const getAccountsBoardData = (accounts = []) => {
  const records = accounts.map((account, index) =>
    normalizeAccountRecord(account, index, { recordSource: 'live' })
  ).sort(compareAccountsByNumberAsc)
    .map((record, index) => ({
      ...record,
      originalAccountNumber: record.originalAccountNumber || record.accountNumber,
      accountNumber: String(1001 + index),
    }))

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
    if (!countsByStage[record.stage]) {
      countsByStage[record.stage] = 0
      rowsByStage[record.stage] = []
    }

    countsByStage[record.stage] += 1
    rowsByStage[record.stage].push(record)
  })

  return {
    records,
    stages,
    countsByStage,
    rowsByStage,
    totalRecords: records.length,
  }
}
