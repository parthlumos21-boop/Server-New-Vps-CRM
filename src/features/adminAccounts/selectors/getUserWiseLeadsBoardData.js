import { getUserWiseLeadsTabs, getUserWiseLeadsTabMatch } from '../config/userWiseLeadsTabs'
import { getAccountsBoardData } from './getAccountsBoardData'

export const getUserWiseLeadsBoardData = (accounts = []) => {
  const tabs = getUserWiseLeadsTabs()
  const baseBoardData = getAccountsBoardData(accounts)
  const countsByStage = tabs.reduce((lookup, tab) => {
    lookup[tab.key] = 0
    return lookup
  }, {})

  const rowsByStage = tabs.reduce((lookup, tab) => {
    lookup[tab.key] = []
    return lookup
  }, {})

  const records = baseBoardData.records.reduce((filteredRecords, record) => {
    const userTab = getUserWiseLeadsTabMatch(record)
    if (!userTab) {
      return filteredRecords
    }

    const nextRecord = {
      ...record,
      userBucketKey: userTab.key,
      userBucketLabel: userTab.label,
    }

    rowsByStage[userTab.key].push(nextRecord)
    countsByStage[userTab.key] += 1
    filteredRecords.push(nextRecord)
    return filteredRecords
  }, [])

  return {
    records,
    stages: tabs,
    countsByStage,
    rowsByStage,
    totalRecords: records.length,
  }
}
