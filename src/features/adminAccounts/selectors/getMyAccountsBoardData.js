import { getVisibleAccountStages } from '../config/accountStages'
import { isSameCrmOwner } from '../../users/crmUserDirectory'
import { getAccountsBoardData } from './getAccountsBoardData'

const normalizeCompareValue = (value) => String(value || '').trim().toLowerCase()

const buildBoardDataFromRecords = (records = []) => {
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

    // Also display converted records in the 'new' tab so they remain visible
    if ((record.isConverted || record.stage === 'converted') && record.stage !== 'new') {
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

const isOwnedByCurrentUser = (record, user) => {
  if (!user) return false

  const raw = record.raw || {}

  // Match by id against creator id on the raw record.
  const userId = normalizeCompareValue(user.id)
  if (userId) {
    const matchingIds = [
      raw.userId,
      raw.createdByUserId,
      record.convertedBy,
      raw.assignedTo,
      raw.ownerUserId,
      record.assignedUserId,
      record.ownerId,
    ].map(normalizeCompareValue)

    if (matchingIds.includes(userId)) {
      return true
    }
  }

  const userOwnerCode = normalizeCompareValue(user.ownerCode || user.accountOwnerCode || user.employeeId)
  if (userOwnerCode) {
    const matchingOwnerCodes = [
      record.ownerCode,
      record.accountOwnerCode,
      record.accountNumber,
      raw.ownerCode,
      raw.accountOwnerCode,
      raw.accountNumber,
      raw.accountNo,
      raw.formData?.ownerCode,
      raw.formData?.accountOwnerCode,
      raw.formData?.accountNumber,
      raw.formData?.accountNo,
    ].map(normalizeCompareValue)

    if (matchingOwnerCodes.includes(userOwnerCode)) {
      return true
    }
  }

  // Match by added-by name using CRM-aware comparison
  const candidateCreators = [
    record.addedBy,
    record.addedByDisplay,
    raw.addedBy,
    raw.addedByName,
    record.accountOwner,
    record.accountOwnerName,
  ]

  const userNames = [
    user.name,
    user.ownerDisplayName,
    user.username,
    user.email,
  ]

  return candidateCreators.some((candidate) => (
    userNames.some((userName) => isSameCrmOwner(candidate, userName))
  ))
}

export const getMyAccountsBoardData = (accounts = [], user = null) => {
  const boardData = getAccountsBoardData(accounts)
  const records = boardData.records.filter((record) => isOwnedByCurrentUser(record, user))
  return buildBoardDataFromRecords(records)
}
