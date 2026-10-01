import { getAccountsBoardData } from './getAccountsBoardData'
import { getMyAccountsBoardData } from './getMyAccountsBoardData'
import { getWeeklyReportsAllBoardData } from './getWeeklyReportsAllBoardData'
import { getVisibleAccountStages } from '../config/accountStages'

const normalizeValue = (value) => String(value || '').trim().toLowerCase()
const EMPTY_GROUP_KEY = '__not_available__'
const EMPTY_GROUP_LABEL = 'Not Available'

const applyAdditionalFilters = (record, filters = {}) => {
  const {
    stageIn = [],
    accountSourceIn = [],
    accountStateIn = [],
    accountOwnerIn = [],
    statusIn = [],
    hasEmail = false,
    hasPhone = false,
  } = filters

  if (stageIn.length > 0 && !stageIn.includes(record.stage)) {
    return false
  }

  if (accountSourceIn.length > 0 && !accountSourceIn.some((value) => normalizeValue(value) === normalizeValue(record.accountSource))) {
    return false
  }

  if (accountStateIn.length > 0 && !accountStateIn.some((value) => normalizeValue(value) === normalizeValue(record.accountState))) {
    return false
  }

  if (accountOwnerIn.length > 0 && !accountOwnerIn.some((value) => normalizeValue(value) === normalizeValue(record.accountOwner))) {
    return false
  }

  if (statusIn.length > 0 && !statusIn.some((value) => normalizeValue(value) === normalizeValue(record.status))) {
    return false
  }

  if (hasEmail && !record.email) {
    return false
  }

  if (hasPhone && !record.phone) {
    return false
  }

  return true
}

const getBaseRecords = (accounts = [], user = null, classification = 'all_accounts') => {
  switch (classification) {
    case 'my_accounts':
      return getMyAccountsBoardData(accounts, user).records
    case 'recent_accounts':
      return getWeeklyReportsAllBoardData(accounts).records
    case 'my_group_accounts':
    case 'all_accounts':
    default:
      return getAccountsBoardData(accounts).records
  }
}

export const getCustomViewRecords = (accounts = [], user = null, definition = {}) => {
  const baseRecords = getBaseRecords(accounts, user, definition.classification)
  return baseRecords.filter((record) => applyAdditionalFilters(record, definition.filters))
}

const buildGroupDescriptor = (record, groupByField) => {
  if (groupByField === 'stage') {
    return {
      key: record.stage || EMPTY_GROUP_KEY,
      label: record.stageLabel || EMPTY_GROUP_LABEL,
    }
  }

  const rawValue = record[groupByField]
  const label = rawValue ? String(rawValue).trim() : EMPTY_GROUP_LABEL

  return {
    key: rawValue ? normalizeValue(rawValue) : EMPTY_GROUP_KEY,
    label,
  }
}

export const buildCustomViewGroups = (records = [], groupByField = 'accountSource') => {
  const stages = getVisibleAccountStages()
  const stageOrder = stages.reduce((lookup, stage) => {
    lookup[stage.key] = stage.order
    return lookup
  }, {})

  const groups = new Map()

  records.forEach((record) => {
    const descriptor = buildGroupDescriptor(record, groupByField)
    const existingGroup = groups.get(descriptor.key)

    if (existingGroup) {
      existingGroup.records.push(record)
      existingGroup.count += 1
      return
    }

    groups.set(descriptor.key, {
      key: descriptor.key,
      label: descriptor.label,
      count: 1,
      records: [record],
      sortOrder: groupByField === 'stage'
        ? (stageOrder[descriptor.key] ?? Number.MAX_SAFE_INTEGER)
        : null,
    })
  })

  return Array.from(groups.values()).sort((left, right) => {
    if (groupByField === 'stage') {
      if (left.sortOrder !== right.sortOrder) {
        return left.sortOrder - right.sortOrder
      }
    }

    return left.label.localeCompare(right.label)
  })
}
