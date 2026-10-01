const userRepository = require('../repositories/userRepository')
const { getCrmGroupOwnerCodesForUser } = require('../features/crmUserDirectory')
const { isPrivilegedRole, toNumberOrNull } = require('./accessScope')

const uniqueNumbers = (values = []) => Array.from(new Set(
  values
    .map((value) => toNumberOrNull(value))
    .filter((value) => value !== null)
))

const resolveCrmGroupScope = async (actor = {}) => {
  if (!actor || isPrivilegedRole(actor.role)) {
    return {
      actor,
      queryOptions: { companyWide: true },
      scopeOwnerCodes: [],
      scopeUserIds: uniqueNumbers([actor?.id]),
    }
  }

  const scopeOwnerCodes = uniqueNumbers(getCrmGroupOwnerCodesForUser(actor))
  const groupUsers = scopeOwnerCodes.length > 0
    ? await userRepository.findUsersByOwnerCodes(scopeOwnerCodes, actor.companyId)
    : []
  const scopeUserIds = uniqueNumbers([
    actor.id,
    ...groupUsers.map((entry) => entry.id),
  ])

  return {
    actor: {
      ...actor,
      scopeOwnerCodes,
      scopeUserIds,
    },
    queryOptions: { scopeUserIds },
    scopeOwnerCodes,
    scopeUserIds,
  }
}

module.exports = {
  resolveCrmGroupScope,
}
