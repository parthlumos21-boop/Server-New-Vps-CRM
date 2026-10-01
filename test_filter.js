
// @ts-nocheck
const toSlug = (value) => String(value || '')
  .trim()
  .toLowerCase()
  .replace(/[^a-z0-9]+/g, '-')
  .replace(/^-+|-+$/g, '')

const stripOwnerCodePrefix = (value) => String(value || '')
  .trim()
  .replace(/^\d{4,}\s*-\s*/u, '')

const normalizeCrmUserName = (value) => stripOwnerCodePrefix(value)
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

const CRM_OWNER_DIRECTORY = CRM_DIRECTORY_USERS.map((user) => ({
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

const getCrmOwnerRecord = (value) => {
  const trimmedValue = String(value || '').trim()
  if (!trimmedValue) {
    return null
  }

  return CRM_OWNER_RECORDS_BY_CODE.get(trimmedValue)
    || CRM_OWNER_RECORDS_BY_NAME.get(normalizeCrmUserName(trimmedValue))
    || null
}

const getCanonicalCrmUserName = (value) => getCrmOwnerRecord(value)?.name || ''

const getCrmOwnerCode = (value) => getCrmOwnerRecord(value)?.ownerCode || ''

const getCrmOwnerDisplay = (value, fallbackValue = '') => {
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

const isSameCrmOwner = (leftValue, rightValue) => {
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

const CRM_OWNER_LABELS = CRM_OWNER_DIRECTORY.map((user) => user.name)

const CRM_OWNER_OPTIONS = CRM_OWNER_DIRECTORY.map((user) => ({
  value: user.name,
  label: user.ownerDisplayName,
  ownerCode: user.ownerCode,
  ownerName: user.name,
}))

const CRM_FILTER_USERS = CRM_OWNER_DIRECTORY.map((user) => ({
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

const isHiddenFilterUser = (user = {}) => {
  const searchable = [
    user.name,
    user.username,
    user.email,
  ].map((value) => String(value || '').trim().toLowerCase())

  return searchable.some((value) => value === 'parth' || value.includes('parth'))
}



﻿


const normalizeCompareValue = (value) => String(value || '').trim().toLowerCase();

const isOwnedByCurrentUser = (record, user) => {
  if (!user) return false;

  const raw = record.raw || {};

  // 1) Match by owner code when both sides expose one.
  const userOwnerCode = String(user.ownerCode || '').trim();
  if (userOwnerCode && String(record.accountOwnerCode || '').trim() === userOwnerCode) {
    return true;
  }

  // 2) Match by id against any owner/creator id on the raw record.
  const userId = normalizeCompareValue(user.id || user._id);
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
      record.createdBy,
    ].map(normalizeCompareValue);

    if (matchingIds.includes(userId)) {
      return true;
    }
  }

  // 3) Match by owner / added-by name using CRM-aware comparison
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
  ];

  const userNames = [
    user.name,
    user.ownerDisplayName,
    user.username,
    user.email,
    user.ownerCode,
  ];

  return candidateOwners.some((candidate) => (
    userNames.some((userName) => isSameCrmOwner(candidate, userName))
  ));
};



const user = { name: 'Marketing', email: 'mkt@swatiswitchgears.com', id: 16 };
const record = { 
  raw: { ownerName: 'Atish Shah', createdByUserId: 1 }, 
  accountOwner: 'Atish Shah', 
  createdBy: 1 
};
console.log('Test 1 (should be false):', isOwnedByCurrentUser(record, user));

const user2 = { name: 'Keval V Shah', email: 'keval@swatiswitchgears.com', id: 10 };
console.log('Test 2 (should be true for Keval?):', isOwnedByCurrentUser(record, user2));
