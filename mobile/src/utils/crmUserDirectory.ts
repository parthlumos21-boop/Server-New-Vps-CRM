// @ts-nocheck
// @ts-nocheck
const toSlug = (value) => String(value || '')
  .trim()
  .toLowerCase()
  .replace(/[^a-z0-9]+/g, '-')
  .replace(/^-+|-+$/g, '')

const stripOwnerCodePrefix = (value) => String(value || '')
  .trim()
  .replace(/^\d{4,}\s*-\s*/u, '')

export const normalizeCrmUserName = (value) => stripOwnerCodePrefix(value)
  .trim()
  .toLowerCase()
  .replace(/\s+/g, ' ')

import { userApi } from '../api/userApi'

let CRM_DIRECTORY_USERS = []
let CRM_OWNER_DIRECTORY = []
let CRM_OWNER_RECORDS_BY_CODE = new Map()
let CRM_OWNER_RECORDS_BY_NAME = new Map()
let CRM_OWNER_LABELS = []
let CRM_OWNER_OPTIONS = []
let CRM_FILTER_USERS = []

export const loadCrmDirectory = async (token) => {
  try {
    const data = await userApi.listDirectory(token)
    // ensure data is array
    const users = Array.isArray(data) ? data : (data.data || [])
    
    CRM_DIRECTORY_USERS = users.map((user) => ({
      ...user,
      ownerCode: String(user.ownerCode || user.id || ''),
      name: user.name || user.username || '',
      role: user.role || 'user',
      userGroup: user.userGroup || 'Back Office',
      userType: user.userType || 'Sales Executive',
      aliases: user.aliases || [],
    })).filter(u => Boolean(u.ownerCode) && Boolean(u.name))

    CRM_OWNER_DIRECTORY = CRM_DIRECTORY_USERS.map((user) => ({
      ...user,
      ownerDisplayName: user.name,
    }))

    CRM_OWNER_RECORDS_BY_CODE = new Map(
      CRM_OWNER_DIRECTORY.map((user) => [user.ownerCode, user])
    )

    CRM_OWNER_RECORDS_BY_NAME = new Map(
      CRM_OWNER_DIRECTORY.flatMap((user) => [
        [normalizeCrmUserName(user.name), user],
        ...user.aliases.map((alias) => [normalizeCrmUserName(alias), user]),
      ])
    )

    CRM_OWNER_LABELS = CRM_OWNER_DIRECTORY.map((user) => user.name)

    CRM_OWNER_OPTIONS = CRM_OWNER_DIRECTORY.map((user) => ({
      value: user.name,
      label: user.ownerDisplayName,
      ownerCode: user.ownerCode,
      ownerName: user.name,
    }))

    CRM_FILTER_USERS = CRM_OWNER_DIRECTORY.map((user) => ({
      id: `crm-${toSlug(user.name)}`,
      username: toSlug(user.name),
      name: user.name,
      ownerCode: user.ownerCode,
      ownerDisplayName: user.ownerDisplayName,
      email: user.email || '',
      role: user.role,
      status: 'approved',
      isApproved: true,
      userGroup: user.userGroup,
      userType: user.userType,
    }))
  } catch (error) {
    console.error('Failed to load CRM directory', error)
  }
}

export const getCrmOwnerRecord = (value) => {
  const trimmedValue = String(value || '').trim()
  if (!trimmedValue) {
    return null
  }

  const emailPrefix = trimmedValue.includes('@') ? trimmedValue.split('@')[0] : ''

  return CRM_OWNER_RECORDS_BY_CODE.get(trimmedValue)
    || CRM_OWNER_RECORDS_BY_NAME.get(normalizeCrmUserName(trimmedValue))
    || (emailPrefix ? CRM_OWNER_RECORDS_BY_NAME.get(normalizeCrmUserName(emailPrefix)) : null)
    || null
}

export const getCanonicalCrmUserName = (value) => getCrmOwnerRecord(value)?.name || ''

export const getCrmOwnerCode = (value) => getCrmOwnerRecord(value)?.ownerCode || ''

export const getCrmOwnerDisplay = (value, fallbackValue = '') => {
  const ownerRecord = getCrmOwnerRecord(value)
  if (ownerRecord) {
    return ownerRecord.ownerDisplayName
  }

  const fallbackRecord = getCrmOwnerRecord(fallbackValue)
  if (fallbackRecord) {
    return fallbackRecord.ownerDisplayName
  }

  const resolvedValue = String(value || fallbackValue || '').trim()
  return resolvedValue
}

export const isSameCrmOwner = (leftValue, rightValue) => {
  const leftRecord = getCrmOwnerRecord(leftValue)
  const rightRecord = getCrmOwnerRecord(rightValue)
  if (leftRecord && rightRecord) {
    return leftRecord.ownerCode === rightRecord.ownerCode
  }

  const leftNormalizedValue = normalizeCrmUserName(leftValue)
  const rightNormalizedValue = normalizeCrmUserName(rightValue)

  return Boolean(leftNormalizedValue) && leftNormalizedValue === rightNormalizedValue
}

export const getCrmOwnerLabels = () => CRM_OWNER_LABELS

export const getCrmOwnerOptions = () => CRM_OWNER_OPTIONS

export const getCrmFilterUsers = () => CRM_FILTER_USERS

export const isHiddenFilterUser = (user = {}) => {
  const searchable = [
    user.name,
    user.username,
    user.email,
  ].map((value) => String(value || '').trim().toLowerCase())

  return searchable.some((value) => value === 'parth' || value.includes('parth'))
}


