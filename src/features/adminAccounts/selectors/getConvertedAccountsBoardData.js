import { getAccountsBoardData } from './getAccountsBoardData'

const isConvertedRecord = (record) => {
  if (record.stage === 'converted') {
    return true
  }

  return Boolean(
    record.convertedAs ||
    record.convertedContextNumber ||
    record.raw?.convertedAs ||
    record.raw?.convertedContextNumber
  )
}

export const getConvertedAccountsBoardData = (accounts = []) => {
  const baseBoardData = getAccountsBoardData(accounts)
  const records = baseBoardData.records.filter(isConvertedRecord)

  return {
    records,
    stages: [],
    countsByStage: {},
    rowsByStage: {},
    totalRecords: records.length,
  }
}
