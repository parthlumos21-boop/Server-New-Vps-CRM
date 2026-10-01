import { SW_BARODA_MUM_TABS, getSwBarodaMumTabMatch } from '../config/swBarodaMumTabs'
import { getAccountsBoardData } from './getAccountsBoardData'

export const getSwBarodaMumBoardData = (accounts = []) => {
  const baseBoardData = getAccountsBoardData(accounts)
  const countsByStage = SW_BARODA_MUM_TABS.reduce((lookup, tab) => {
    lookup[tab.key] = 0
    return lookup
  }, {})

  const rowsByStage = SW_BARODA_MUM_TABS.reduce((lookup, tab) => {
    lookup[tab.key] = []
    return lookup
  }, {})

  const records = baseBoardData.records.reduce((filteredRecords, record) => {
    const ownerTab = getSwBarodaMumTabMatch(record.accountOwner)
    if (!ownerTab) {
      return filteredRecords
    }

    const nextRecord = {
      ...record,
      ownerBucketKey: ownerTab.key,
      ownerBucketLabel: ownerTab.label,
    }

    rowsByStage[ownerTab.key].push(nextRecord)
    countsByStage[ownerTab.key] += 1
    filteredRecords.push(nextRecord)
    return filteredRecords
  }, [])

  return {
    records,
    stages: SW_BARODA_MUM_TABS,
    countsByStage,
    rowsByStage,
    totalRecords: records.length,
  }
}
