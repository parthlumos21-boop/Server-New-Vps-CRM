import { getAccountsBoardData } from './getAccountsBoardData'

const NO_FOLLOW_STAGE = {
  key: 'no_follow_leads',
  label: 'No Follow Leads',
  order: 1,
  visible: true,
  emptyStateText: 'No accounts are without follow-up reminders.',
}

const isNoFollow = (record) => {
  const hasReminder = record.reminderDate && String(record.reminderDate).trim() !== ''
  const isClosedOrConverted = ['converted', 'closed', 'rejected', 'order_lost'].includes(record.stage)
  return !hasReminder && !isClosedOrConverted
}

export const getNoFollowLeadsBoardData = (accounts = []) => {
  const baseBoardData = getAccountsBoardData(accounts)
  const records = baseBoardData.records.filter(isNoFollow)

  return {
    records,
    stages: [NO_FOLLOW_STAGE],
    countsByStage: {
      [NO_FOLLOW_STAGE.key]: records.length,
    },
    rowsByStage: {
      [NO_FOLLOW_STAGE.key]: records,
    },
    totalRecords: records.length,
  }
}
