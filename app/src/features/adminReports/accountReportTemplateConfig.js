import { ACCOUNT_EXPORT_COLUMNS } from '../adminAccounts/config/accountExportColumns'
import { CUSTOM_VIEW_GROUP_BY_OPTIONS } from '../adminAccounts/customViews/customViewConfig'

const toOption = (value, label = value) => ({
  value,
  label,
})

export const ACCOUNT_REPORT_CONTEXT_OPTIONS = [
  toOption('account', 'Account'),
]

export const ACCOUNT_REPORT_VISIBILITY_OPTIONS = [
  toOption('Visible to Me Only', 'Visible to Me Only'),
  toOption('All', 'All'),
]

export const ACCOUNT_REPORT_ORDER_BY_OPTIONS = [
  toOption('', 'Select'),
  ...ACCOUNT_EXPORT_COLUMNS.map((column) => toOption(column.key, column.label)),
]

export const ACCOUNT_REPORT_GROUP_BY_OPTIONS = [
  toOption('', 'Select'),
  ...CUSTOM_VIEW_GROUP_BY_OPTIONS.map((option) => toOption(option.key, option.label)),
]

export const ACCOUNT_REPORT_AGGREGATE_OPTIONS = [
  toOption('', 'Select'),
  toOption('count', 'Count'),
  toOption('sum', 'Sum'),
  toOption('avg', 'Average'),
]

export const ACCOUNT_REPORT_FILTER_FIELD_OPTIONS = [
  toOption('', 'Select'),
  ...ACCOUNT_EXPORT_COLUMNS.map((column) => toOption(column.key, column.label)),
]

export const ACCOUNT_REPORT_FILTER_OPERATOR_OPTIONS = [
  toOption('equals', 'equal'),
  toOption('not_equals', 'not equal'),
  toOption('contains', 'contains'),
  toOption('not_contains', 'not contains'),
  toOption('starts_with', 'starts with'),
  toOption('ends_with', 'ends with'),
  toOption('is_empty', 'is empty'),
  toOption('is_not_empty', 'is not empty'),
]

export const ACCOUNT_REPORT_FIELD_OPTIONS = ACCOUNT_EXPORT_COLUMNS
  .filter((column) => column.key !== '__serialNumber')
  .map((column) => ({
    key: column.key,
    label: column.label,
  }))
