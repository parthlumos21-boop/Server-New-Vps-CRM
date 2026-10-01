import { getAccountsBoardData } from './getAccountsBoardData'

const WEEKLY_REPORTS_STAGE = {
  key: 'weekly_reports_all',
  label: 'SWATI',
  order: 1,
  visible: true,
  emptyStateText: 'No accounts match the weekly reports criteria.',
}

const DAY_IN_MS = 24 * 60 * 60 * 1000

const isWithinLastSevenDays = (value) => {
  if (!value) return false

  const date = new Date(value)
  if (Number.isNaN(date.getTime())) {
    return false
  }

  const today = new Date()
  const todayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate())
  const valueStart = new Date(date.getFullYear(), date.getMonth(), date.getDate())
  const differenceInDays = Math.floor((todayStart.getTime() - valueStart.getTime()) / DAY_IN_MS)

  return differenceInDays >= 0 && differenceInDays <= 7
}

export const getWeeklyReportsAllBoardData = (accounts = []) => {
  const baseBoardData = getAccountsBoardData(accounts)
  const records = baseBoardData.records.filter((record) => isWithinLastSevenDays(record.accountDate))

  return {
    records,
    stages: [WEEKLY_REPORTS_STAGE],
    countsByStage: {
      [WEEKLY_REPORTS_STAGE.key]: records.length,
    },
    rowsByStage: {
      [WEEKLY_REPORTS_STAGE.key]: records,
    },
    totalRecords: records.length,
  }
}
