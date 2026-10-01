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
    if (!rowsByStage[record.stage]) {
      rowsByStage[record.stage] = []
      countsByStage[record.stage] = 0
    }

    rowsByStage[record.stage].push(record)
    countsByStage[record.stage] += 1
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

  // 1) Match by owner code when both sides expose one.
  const userOwnerCode = String(user.ownerCode || '').trim()
  if (userOwnerCode && String(record.accountOwnerCode || '').trim() === userOwnerCode) {
    return true
  }

  // 2) Match by id against any owner/creator id on the raw record.
  const userId = normalizeCompareValue(user.id)
  if (userId) {
    const matchingIds = [
      raw.userId,
      raw.ownerId,
      raw.createdByUserId,
      raw.assignedToUserId,
      raw.assignedTo,
      raw.assignedUserId,
      record.ownerUserId,
      record.ownerId,
      record.assignedTo,
      record.assignedUserId,
    ].map(normalizeCompareValue)

    if (matchingIds.includes(userId)) {
      return true
    }
  }

  // 3) Match by owner / added-by name using CRM-aware comparison so codes,
  //    code-prefixed names, and aliases all resolve to the same person.
  const candidateOwners = [
    record.accountOwner,
    record.accountOwnerDisplay,
    record.accountOwnerName,
    record.ownerName,
    record.assignedUserName,
    record.addedBy,
    record.addedByDisplay,
    raw.accountOwner,
    raw.accountOwnerDisplay,
    raw.accountOwnerName,
    raw.ownerName,
    raw.assignedUserName,
    raw.addedBy,
    raw.addedByName,
  ]

  const userNames = [
    user.name,
    user.ownerDisplayName,
    user.username,
    user.email,
    user.ownerCode,
  ]

  return candidateOwners.some((candidate) => (
    userNames.some((userName) => isSameCrmOwner(candidate, userName))
  ))
}

export const getMyAccountsBoardData = (accounts = [], user = null) => {
  const boardData = getAccountsBoardData(accounts)
  const records = boardData.records.filter((record) => isOwnedByCurrentUser(record, user))
  return buildBoardDataFromRecords(records)
}
