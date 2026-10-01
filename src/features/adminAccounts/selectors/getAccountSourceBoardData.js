import { ACCOUNT_SOURCE_TABS, getAccountSourceBucket } from '../config/accountSourceTabs'
import { getAccountsBoardData } from './getAccountsBoardData'

export const getAccountSourceBoardData = (accounts = []) => {
  const baseBoardData = getAccountsBoardData(accounts)
  const countsByStage = ACCOUNT_SOURCE_TABS.reduce((lookup, tab) => {
    lookup[tab.key] = 0
    return lookup
  }, {})

  const rowsByStage = ACCOUNT_SOURCE_TABS.reduce((lookup, tab) => {
    lookup[tab.key] = []
    return lookup
  }, {})

  const records = baseBoardData.records.reduce((filteredRecords, record) => {
    const sourceBucket = getAccountSourceBucket(record.accountSource || record.source)
    if (!sourceBucket) {
      return filteredRecords
    }

    const nextRecord = {
      ...record,
      sourceBucketKey: sourceBucket.key,
      sourceBucketLabel: sourceBucket.label,
    }

    rowsByStage[sourceBucket.key].push(nextRecord)
    countsByStage[sourceBucket.key] += 1
    filteredRecords.push(nextRecord)
    return filteredRecords
  }, [])

  return {
    records,
    stages: ACCOUNT_SOURCE_TABS,
    countsByStage,
    rowsByStage,
    totalRecords: records.length,
  }
}
