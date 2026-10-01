import { getAccountsBoardData } from './getAccountsBoardData'

const DAILY_FRESH_STAGE = {
  key: 'daily_fresh_leads',
  label: 'Daily Fresh Leads',
  order: 1,
  visible: true,
  emptyStateText: 'No accounts have been added today.',
}

const isToday = (value) => {
  if (!value) return false

  const date = new Date(value)
  if (Number.isNaN(date.getTime())) {
    return false
  }

  const today = new Date()
  return (
    date.getFullYear() === today.getFullYear() &&
    date.getMonth() === today.getMonth() &&
    date.getDate() === today.getDate()
  )
}

export const getDailyFreshLeadsBoardData = (accounts = []) => {
  const baseBoardData = getAccountsBoardData(accounts)
  const records = baseBoardData.records.filter((record) => isToday(record.accountDate) || isToday(record.createdAt))

  return {
    records,
    stages: [DAILY_FRESH_STAGE],
    countsByStage: {
      [DAILY_FRESH_STAGE.key]: records.length,
    },
    rowsByStage: {
      [DAILY_FRESH_STAGE.key]: records,
    },
    totalRecords: records.length,
  }
}
