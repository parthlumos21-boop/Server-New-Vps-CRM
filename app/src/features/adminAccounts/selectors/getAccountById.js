import { getAccountsBoardData } from './getAccountsBoardData'

export const getAccountById = (recordsOrAccounts, accountId) => {
  if (!accountId) return null

  const records =
    Array.isArray(recordsOrAccounts) && recordsOrAccounts[0]?.detailSections
      ? recordsOrAccounts
      : getAccountsBoardData(recordsOrAccounts).records

  return records.find((record) => record.id === accountId) || null
}

