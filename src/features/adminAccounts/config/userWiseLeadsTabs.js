import { getCrmOwnerLabels } from '../../users/crmUserDirectory'

const toSlug = (value) => String(value || '')
  .trim()
  .toLowerCase()
  .replace(/[^a-z0-9]+/g, '-')
  .replace(/^-+|-+$/g, '')

const USER_NAME_ALIASES = {
  'Keval V Shah': ['Keval Shah'],
}

export const getUserWiseLeadsTabs = () => getCrmOwnerLabels().map((name, index) => ({
  key: toSlug(name),
  label: name,
  order: index + 1,
  visible: true,
  userNames: [name, ...(USER_NAME_ALIASES[name] || [])],
  emptyStateText: `No leads are assigned to ${name} right now.`,
}))

const normalizeValue = (value) =>
  String(value || '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, ' ')

export const getUserWiseLeadsTabMatch = (record) => {
  const candidateValues = [
    record.accountOwner,
    record.addedBy,
    record.raw?.accountOwner,
    record.raw?.ownerName,
    record.raw?.addedBy,
  ].map(normalizeValue).filter(Boolean)

  if (candidateValues.length === 0) {
    return null
  }

  return getUserWiseLeadsTabs().find((tab) =>
    tab.userNames.some((userName) => candidateValues.includes(normalizeValue(userName)))
  ) || null
}
