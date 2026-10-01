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

const CRM_DIRECTORY_USERS = [
  { ownerCode: '1001', name: 'Atish Shah', role: 'user', userGroup: 'Back Office', userType: 'Sales Executive', aliases: [] },
  { ownerCode: '1002', name: 'Hasmukh Chauhan', role: 'user', userGroup: 'Back Office', userType: 'Sales Executive', aliases: [] },
  { ownerCode: '1003', name: 'Jagruti Parmar', role: 'user', userGroup: 'Back Office', userType: 'Sales Executive', aliases: ['Jagurti Parmar'] },
  { ownerCode: '1004', name: 'Jay Pandya', role: 'user', userGroup: 'Back Office', userType: 'Sales Executive', aliases: [] },
  { ownerCode: '1005', name: 'Kanubhai Shah', role: 'user', userGroup: 'Back Office', userType: 'Sales Executive', aliases: ['Kanu Shah'] },
  { ownerCode: '1006', name: 'Keval V Shah', role: 'admin', userGroup: 'Back Office', userType: 'Manager', aliases: [] },
  { ownerCode: '1017', name: 'Kuldeep Nayi', role: 'user', userGroup: 'Back Office', userType: 'Sales Executive', aliases: [] },
  { ownerCode: '1007', name: 'Krunal Patel', role: 'user', userGroup: 'Back Office', userType: 'Sales Executive', aliases: ['Krunal patel'] },
  { ownerCode: '1008', name: 'Monali Pataliya', role: 'user', userGroup: 'Back Office', userType: 'Sales Executive', aliases: [] },
  { ownerCode: '1015', name: 'Naim Vhora', role: 'user', userGroup: 'Back Office', userType: 'Sales Executive', aliases: ['Naim Vohra', 'Naim Vora'] },
  { ownerCode: '1009', name: 'Nita Bhavsar', role: 'admin', userGroup: 'Back Office', userType: 'Manager', aliases: [] },
  { ownerCode: '1016', name: 'Prasenjit Sahana', role: 'user', userGroup: 'Back Office', userType: 'Sales Executive', aliases: [] },
  { ownerCode: '1010', name: 'Rajeshree Parmar', role: 'user', userGroup: 'Back Office', userType: 'Sales Executive', aliases: [] },
  { ownerCode: '1011', name: 'Samir Jha', role: 'user', userGroup: 'Back Office', userType: 'Sales Executive', aliases: [] },
  { ownerCode: '1012', name: 'Support Swati', role: 'user', userGroup: 'Field Staff', userType: 'Support Executive', aliases: [] },
  { ownerCode: '1013', name: 'Tajammul Solkar', role: 'user', userGroup: 'Back Office', userType: 'Sales Executive', aliases: ['Tajamul Rafique Solkar', 'Tajamul Solkar'] },
  { ownerCode: '1014', name: 'Vaibhavi Patel', role: 'user', userGroup: 'Back Office', userType: 'Sales Executive', aliases: [] },
  { ownerCode: '1018', name: 'Bhavesh Prajapati', role: 'user', userGroup: 'Back Office', userType: 'Sales Executive', aliases: [] },
  { ownerCode: '1019', name: 'Samir Seth', role: 'user', userGroup: 'Back Office', userType: 'Sales Executive', aliases: [] },
]

export const CRM_OWNER_DIRECTORY = CRM_DIRECTORY_USERS.map((user) => ({
  ...user,
  ownerDisplayName: user.name,
}))

const CRM_OWNER_RECORDS_BY_CODE = new Map(
  CRM_OWNER_DIRECTORY.map((user) => [user.ownerCode, user])
)

const CRM_OWNER_RECORDS_BY_NAME = new Map(
  CRM_OWNER_DIRECTORY.flatMap((user) => [
    [normalizeCrmUserName(user.name), user],
    ...user.aliases.map((alias) => [normalizeCrmUserName(alias), user]),
  ])
)

export const getCrmOwnerRecord = (value) => {
  const trimmedValue = String(value || '').trim()
  if (!trimmedValue) {
    return null
  }

  return CRM_OWNER_RECORDS_BY_CODE.get(trimmedValue)
    || CRM_OWNER_RECORDS_BY_NAME.get(normalizeCrmUserName(trimmedValue))
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
  // When both values resolve to a known CRM owner (by code, name, or alias),
  // compare on the canonical owner code so that a code ("1006"), a name
  // ("Keval V Shah"), and a code-prefixed name ("1006 - Keval V Shah") all
  // match the same person.
  const leftRecord = getCrmOwnerRecord(leftValue)
  const rightRecord = getCrmOwnerRecord(rightValue)
  if (leftRecord && rightRecord) {
    return leftRecord.ownerCode === rightRecord.ownerCode
  }

  // Fall back to normalized-name comparison for owners outside the directory
  // (e.g. ad-hoc users like "parth").
  const leftNormalizedValue = normalizeCrmUserName(leftValue)
  const rightNormalizedValue = normalizeCrmUserName(rightValue)

  return Boolean(leftNormalizedValue) && leftNormalizedValue === rightNormalizedValue
}

export const CRM_OWNER_LABELS = CRM_OWNER_DIRECTORY.map((user) => user.name)

export const CRM_OWNER_OPTIONS = CRM_OWNER_DIRECTORY.map((user) => ({
  value: user.name,
  label: user.ownerDisplayName,
  ownerCode: user.ownerCode,
  ownerName: user.name,
}))

export const CRM_FILTER_USERS = CRM_OWNER_DIRECTORY.map((user) => ({
  id: `crm-${toSlug(user.name)}`,
  username: toSlug(user.name),
  name: user.name,
  ownerCode: user.ownerCode,
  ownerDisplayName: user.ownerDisplayName,
  email: '',
  role: user.role,
  status: 'approved',
  isApproved: true,
  userGroup: user.userGroup,
  userType: user.userType,
}))

export const isHiddenFilterUser = (user = {}) => {
  const searchable = [
    user.name,
    user.username,
    user.email,
  ].map((value) => String(value || '').trim().toLowerCase())

  return searchable.some((value) => value === 'parth' || value.includes('parth'))
}
