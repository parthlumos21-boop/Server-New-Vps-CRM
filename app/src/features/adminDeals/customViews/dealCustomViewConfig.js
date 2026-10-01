import { ADMIN_DEAL_BASE_VIEW_OPTIONS, ADMIN_DEAL_VIEW_MAP } from '../config/adminDealViews'

export const DEAL_CUSTOM_VIEW_STEPS = [
  { key: 'context', label: 'Context with View Type' },
  { key: 'classification', label: 'Classification' },
  { key: 'filters', label: 'Additional Filters' },
  { key: 'fields', label: 'View Fields' },
]

export const DEAL_CUSTOM_VIEW_CLASSIFICATIONS = ADMIN_DEAL_BASE_VIEW_OPTIONS.map((option) => ({
  key: option.value,
  label: option.label,
}))

export const DEAL_CUSTOM_VIEW_FIELD_DEFINITIONS = {
  dealNumber: { key: 'dealNumber', label: 'Deal No.', filterPlaceholder: 'Search Deal No.' },
  customerName: { key: 'customerName', label: 'Customer Name', filterPlaceholder: 'Search Customer Name' },
  customerNumber: { key: 'customerNumber', label: 'Customer No.', filterPlaceholder: 'Search Customer No.' },
  dealDate: { key: 'dealDate', label: 'Deal Date', filterPlaceholder: 'Search Deal Date' },
  dealName: { key: 'dealName', label: 'Deal Name', filterPlaceholder: 'Search Deal Name' },
  dealOwner: { key: 'dealOwner', label: 'Deal Owner', filterPlaceholder: 'Search Deal Owner' },
  dealType: { key: 'dealType', label: 'Deal Type', filterPlaceholder: 'Search Deal Type' },
  dealStatus: { key: 'dealStatus', label: 'Deal Status', filterPlaceholder: 'Search Deal Status' },
  location: { key: 'location', label: 'Location', filterPlaceholder: 'Search Location' },
  quotationCustomerStatus: { key: 'quotationCustomerStatus', label: 'Status Of Customer as per Quotation Given', filterPlaceholder: 'Search Quotation Status' },
  orderCustomerStatus: { key: 'orderCustomerStatus', label: 'Status Of Customer as per Order Received', filterPlaceholder: 'Search Order Status' },
  dealValue: { key: 'dealValue', label: 'Deal Value', filterPlaceholder: 'Search Deal Value' },
  projectName: { key: 'projectName', label: 'Project Name', filterPlaceholder: 'Search Project Name' },
  consultantName: { key: 'consultantName', label: 'Consultant Name', filterPlaceholder: 'Search Consultant Name' },
  jobNo: { key: 'jobNo', label: 'Job No', filterPlaceholder: 'Search Job No' },
  poValue: { key: 'poValue', label: 'PO Value', filterPlaceholder: 'Search PO Value' },
  reasonForLost: { key: 'reasonForLost', label: 'Reason For Lost', filterPlaceholder: 'Search Reason For Lost' },
  latestRemark: { key: 'latestRemark', label: 'Latest Remark', filterPlaceholder: 'Search Latest Remark' },
  address: { key: 'address', label: 'Address', filterPlaceholder: 'Search Address' },
}

export const DEAL_CUSTOM_VIEW_FIELD_OPTIONS = [
  'dealNumber',
  'customerName',
  'dealDate',
  'dealName',
  'dealOwner',
  'dealType',
  'dealStatus',
  'location',
  'quotationCustomerStatus',
  'orderCustomerStatus',
  'dealValue',
  'projectName',
  'consultantName',
  'jobNo',
  'poValue',
  'reasonForLost',
  'latestRemark',
  'address',
].map((fieldKey) => ({
  key: fieldKey,
  label: DEAL_CUSTOM_VIEW_FIELD_DEFINITIONS[fieldKey].label,
}))

const TABULAR_DEFAULT_FIELDS = [
  'dealNumber',
  'customerName',
  'dealDate',
  'dealName',
  'dealStatus',
  'location',
  'quotationCustomerStatus',
  'orderCustomerStatus',
  'dealValue',
]

const GRID_DEFAULT_FIELDS = [
  'dealNumber',
  'customerName',
  'dealName',
  'dealOwner',
  'dealStatus',
  'location',
  'quotationCustomerStatus',
  'orderCustomerStatus',
  'projectName',
]

export const buildDefaultDealCustomViewDraft = () => ({
  viewName: '',
  context: 'deal',
  viewType: 'tabular',
  baseViewKey: 'view',
  filters: {
    ownerIn: [],
    cityIn: [],
    statusIn: [],
    dealTypeIn: [],
    hasProjectName: false,
    hasPoValue: false,
    projectNameContains: '',
    jobNoContains: '',
    reasonForLostContains: '',
  },
  visibleFields: TABULAR_DEFAULT_FIELDS,
  addToHomePage: false,
})

export const getDefaultDealVisibleFields = (viewType = 'tabular') =>
  viewType === 'grid' ? GRID_DEFAULT_FIELDS : TABULAR_DEFAULT_FIELDS

export const buildDealCustomViewColumns = (visibleFields = []) => {
  const uniqueKeys = Array.from(new Set(['dealNumber', ...visibleFields]))

  return uniqueKeys
    .map((key) => DEAL_CUSTOM_VIEW_FIELD_DEFINITIONS[key])
    .filter(Boolean)
}

export const getDealCustomViewClassificationLabel = (baseViewKey) =>
  DEAL_CUSTOM_VIEW_CLASSIFICATIONS.find((option) => option.key === baseViewKey)?.label
  || ADMIN_DEAL_VIEW_MAP[baseViewKey]?.label
  || 'View Deals'
