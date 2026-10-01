const normalizeCrmUserName = (value) => String(value || '')
  .trim()
  .replace(/^\d{4,}\s*-\s*/u, '')
  .toLowerCase()
  .replace(/\s+/g, ' ')

const userRepository = require('../repositories/userRepository')



const getCrmOwnerRecord = async (value) => {
  const numericValue = Number.parseInt(String(value || ''), 10)
  if (Number.isFinite(numericValue)) {
    const users = await userRepository.findUsersByOwnerCodes([numericValue])
    if (users.length > 0) return users[0]
  }

  const cleanName = String(value || '').trim().replace(/^\d{4,}\s*-\s*/u, '')
  if (!cleanName) return null

  const user = await userRepository.findUserByName(cleanName)
  if (user) return user

  return null
}

const getCrmGroupOwnerCodesForUser = async (user = {}) => {
  const ownCode = Number.parseInt(String(user.ownerCode || user.owner_code || ''), 10)
  return Number.isFinite(ownCode) ? [ownCode] : []
}

module.exports = {
  getCrmGroupOwnerCodesForUser,
  getCrmOwnerRecord,
  normalizeCrmUserName,
}
