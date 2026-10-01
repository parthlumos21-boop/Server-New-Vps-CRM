import { format } from 'date-fns'

const emptyValue = '-'

const formatBoardDate = (value, pattern = 'dd-MM-yyyy') => {
  if (!value) return emptyValue

  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return emptyValue

  return format(date, pattern)
}

export const CUSTOM_VIEW_STEPS = [
  { key: 'context', label: 'Context with View Type' },
  { key: 'classification', label: 'Classification' },
  { key: 'filters', label: 'Additional Filters' },
  { key: 'fields', label: 'View Fields' },
]

export const CUSTOM_VIEW_CLASSIFICATIONS = [
  { key: 'all_accounts', label: 'All Accounts' },
  { key: 'my_accounts', label: 'My Accounts' },
  { key: 'my_group_accounts', label: 'My Group Accounts' },
  { key: 'recent_accounts', label: 'Recent Accounts' },
]

export const CUSTOM_VIEW_GROUP_BY_OPTIONS = [
  { key: 'stage', label: 'Stage' },
  { key: 'accountSource', label: 'Account Source' },
  { key: 'status', label: 'Account Status' },
  { key: 'accountOwner', label: 'Account Owner' },
  { key: 'productCategory', label: 'Product Category' },
]

export const DEFAULT_CUSTOM_VIEW_GROUP_BY = 'accountSource'

export const CUSTOM_VIEW_FIELD_DEFINITIONS = {
  accountNumber: {
    key: 'accountNumber',
    label: 'Account No.',
    filterPlaceholder: 'Search Account No.',
    width: '165px',
    searchable: true,
    clickable: true,
  },
  name: {
    key: 'name',
    label: 'Account Name',
    filterPlaceholder: 'Search Account Name',
    width: '220px',
    searchable: true,
  },
  accountOwner: {
    key: 'accountOwner',
    label: 'Account Owner',
    filterPlaceholder: 'Search Account Owner',
    width: '170px',
    searchable: true,
  },
  accountDate: {
    key: 'accountDate',
    label: 'Account Date',
    filterPlaceholder: 'Search Account Date',
    width: '150px',
    searchable: true,
    cellFormatter: (value) => formatBoardDate(value),
    exportFormatter: (value) => formatBoardDate(value),
    cardFormatter: (value) => formatBoardDate(value),
  },
  status: {
    key: 'status',
    label: 'Account Status',
    filterPlaceholder: 'Search Account Status',
    width: '155px',
    searchable: true,
  },
  accountSource: {
    key: 'accountSource',
    label: 'Account Source',
    filterPlaceholder: 'Search Account Source',
    width: '155px',
    searchable: true,
  },
  // accountState label updated below

  phone: {
    key: 'phone',
    label: 'Phone',
    filterPlaceholder: 'Search Phone',
    width: '155px',
    searchable: true,
    cellFormatter: (value) => value || emptyValue,
  },
  email: {
    key: 'email',
    label: 'Email',
    filterPlaceholder: 'Search Email',
    width: '190px',
    searchable: true,
    cellFormatter: (value) => value || emptyValue,
  },
  projectName: {
    key: 'projectName',
    label: 'Project Name',
    filterPlaceholder: 'Search Project Name',
    width: '190px',
    searchable: true,
  },
  productCategory: {
    key: 'productCategory',
    label: 'Product Category',
    filterPlaceholder: 'Search Product Category',
    width: '175px',
    searchable: true,
    cellFormatter: (value) => value || emptyValue,
  },
  latestRemark: {
    key: 'latestRemark',
    label: 'Latest Remark',
    filterPlaceholder: 'Search Latest Remark',
    width: '230px',
    searchable: true,
    cellFormatter: (value) => value || emptyValue,
  },
  addInquiry: {
    key: 'addInquiry',
    label: 'Replace cutomer add Inquiry',
    filterPlaceholder: 'Search Inquiry',
    width: '210px',
    searchable: false,
    clickable: true,
    cellFormatter: (value) => value || emptyValue,
  },
  customerRefNo: {
    key: 'customerRefNo',
    label: 'Inquiry Ref No.',
    filterPlaceholder: 'Search Inquiry Ref No.',
    width: '190px',
    searchable: true,
    cellFormatter: (value) => value || emptyValue,
  },
  customerRefDate: {
    key: 'customerRefDate',
    label: 'Inquiry Ref Date',
    filterPlaceholder: 'Search Inquiry Ref Date',
    width: '180px',
    searchable: true,
    cellFormatter: (value) => formatBoardDate(value),
    exportFormatter: (value) => formatBoardDate(value),
    cardFormatter: (value) => formatBoardDate(value),
  },
  removeInquiry: {
    key: 'removeInquiry',
    label: 'cutomer remove add Inquiry',
    filterPlaceholder: 'Search Inquiry',
    width: '210px',
    searchable: false,
    clickable: true,
    cellFormatter: (value) => value || emptyValue,
  },
}

export const CUSTOM_VIEW_FIELD_OPTIONS = [
  'accountNumber',
  'name',
  'accountOwner',
  'accountDate',
  'status',
  'accountSource',
  'phone',
  'email',
  'projectName',
  'productCategory',
  'latestRemark',
  'addInquiry',
  'customerRefNo',
  'customerRefDate',
  'removeInquiry',
]
  .map((fieldKey) => {
    const definition = CUSTOM_VIEW_FIELD_DEFINITIONS[fieldKey]
    if (!definition) return null
    return {
      key: fieldKey,
      label: definition.label,
    }
  })
  .filter(Boolean)

const TABULAR_DEFAULT_FIELDS = [
  'accountNumber',
  'name',
  'accountOwner',
  'accountDate',
  'status',
  'accountSource',
]

const GRID_DEFAULT_FIELDS = [
  'accountNumber',
  'name',
  'accountOwner',
  'status',
  'email',
  'phone',
]

export const buildDefaultCustomViewDraft = () => ({
  viewName: '',
  context: 'account',
  viewType: 'tabular',
  classification: 'all_accounts',
  groupByField: DEFAULT_CUSTOM_VIEW_GROUP_BY,
  filters: {
    stageIn: [],
    accountSourceIn: [],
    accountStateIn: [],
    accountOwnerIn: [],
    statusIn: [],
    hasEmail: false,
    hasPhone: false,
  },
  visibleColumns: TABULAR_DEFAULT_FIELDS,
  addToHomePage: false,
})

export const getDefaultVisibleColumns = (viewType = 'tabular') =>
  viewType === 'grid' ? GRID_DEFAULT_FIELDS : TABULAR_DEFAULT_FIELDS

export const isValidCustomViewGroupByField = (value) =>
  CUSTOM_VIEW_GROUP_BY_OPTIONS.some((option) => option.key === value)

export const buildCustomViewColumns = (visibleColumns = []) => {
  const uniqueKeys = Array.from(new Set(['accountNumber', ...visibleColumns]))

  return uniqueKeys
    .map((key) => CUSTOM_VIEW_FIELD_DEFINITIONS[key])
    .filter(Boolean)
}

export const getCustomViewClassificationLabel = (classification) =>
  CUSTOM_VIEW_CLASSIFICATIONS.find((option) => option.key === classification)?.label || 'All Accounts'

export const getCustomViewGroupByLabel = (groupByField) =>
  CUSTOM_VIEW_GROUP_BY_OPTIONS.find((option) => option.key === groupByField)?.label || 'Account Source'

export const formatCustomViewFieldValue = (fieldKey, record) => {
  const definition = CUSTOM_VIEW_FIELD_DEFINITIONS[fieldKey]
  const rawValue = record?.[fieldKey]

  if (!definition) {
    return rawValue || emptyValue
  }

  if (definition.cardFormatter) {
    return definition.cardFormatter(rawValue, record)
  }

  if (definition.cellFormatter) {
    return definition.cellFormatter(rawValue, record)
  }

  return rawValue || emptyValue
}
