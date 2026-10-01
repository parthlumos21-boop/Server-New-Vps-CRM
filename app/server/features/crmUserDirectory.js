const normalizeCrmUserName = (value) => String(value || '')
  .trim()
  .replace(/^\d{4,}\s*-\s*/u, '')
  .toLowerCase()
  .replace(/\s+/g, ' ')

const CRM_OWNER_DIRECTORY = [
  { ownerCode: 1001, name: 'Atish Shah', userGroup: 'Back Office' },
  { ownerCode: 1002, name: 'Hasmukh Chauhan', userGroup: 'Back Office' },
  { ownerCode: 1003, name: 'Jagurti Parmar', userGroup: 'Back Office', aliases: ['Jagruti Parmar'] },
  { ownerCode: 1004, name: 'Jay Pandya', userGroup: 'Back Office' },
  { ownerCode: 1005, name: 'Kanu Shah', userGroup: 'Back Office' },
  { ownerCode: 1006, name: 'Keval V Shah', userGroup: 'Back Office' },
  { ownerCode: 1007, name: 'Krunal Patel', userGroup: 'Back Office', aliases: ['Krunal patel'] },
  { ownerCode: 1008, name: 'Monali Pataliya', userGroup: 'Back Office' },
  { ownerCode: 1015, name: 'Naim Vhora', userGroup: 'Back Office', aliases: ['Naim Vohra'] },
  { ownerCode: 1009, name: 'Nita Bhavsar', userGroup: 'Back Office' },
  { ownerCode: 1010, name: 'Rajeshree Parmar', userGroup: 'Back Office' },
  { ownerCode: 1011, name: 'Samir Jha', userGroup: 'Back Office' },
  { ownerCode: 1012, name: 'Support Swati', userGroup: 'Field Staff' },
  { ownerCode: 1013, name: 'Tajamul Rafique Solkar', userGroup: 'Back Office', aliases: ['Tajamul Solkar'] },
  { ownerCode: 1014, name: 'Vaibhavi Patel', userGroup: 'Back Office' },
]

const OWNER_BY_CODE = new Map(CRM_OWNER_DIRECTORY.map((entry) => [Number(entry.ownerCode), entry]))

const OWNER_BY_NAME = new Map(
  CRM_OWNER_DIRECTORY.flatMap((entry) => [
    [normalizeCrmUserName(entry.name), entry],
    ...(entry.aliases || []).map((alias) => [normalizeCrmUserName(alias), entry]),
  ])
)

const getCrmOwnerRecord = (value) => {
  const numericValue = Number.parseInt(String(value || ''), 10)
  if (Number.isFinite(numericValue) && OWNER_BY_CODE.has(numericValue)) {
    return OWNER_BY_CODE.get(numericValue)
  }

  return OWNER_BY_NAME.get(normalizeCrmUserName(value)) || null
}

const getCrmGroupOwnerCodesForUser = (user = {}) => {
  const ownerRecord = getCrmOwnerRecord(user.ownerCode || user.owner_code || user.name || user.username)
  if (!ownerRecord?.userGroup) {
    const ownCode = Number.parseInt(String(user.ownerCode || user.owner_code || ''), 10)
    return Number.isFinite(ownCode) ? [ownCode] : []
  }

  return CRM_OWNER_DIRECTORY
    .filter((entry) => entry.userGroup === ownerRecord.userGroup)
    .map((entry) => entry.ownerCode)
}

module.exports = {
  CRM_OWNER_DIRECTORY,
  getCrmGroupOwnerCodesForUser,
  getCrmOwnerRecord,
  normalizeCrmUserName,
}
