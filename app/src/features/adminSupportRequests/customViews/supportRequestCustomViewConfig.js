import { formatDateTime, formatShortDate, formatSupportRequestType } from '../../../pages/admin/support-requests/SupportRequestShared'

const emptyValue = '-'

export const SUPPORT_REQUEST_CUSTOM_VIEW_STEPS = [
  { key: 'context', label: 'Context with View Type' },
  { key: 'classification', label: 'Classification' },
  { key: 'filters', label: 'Additional Filters' },
  { key: 'fields', label: 'View Fields' },
]

export const SUPPORT_REQUEST_CUSTOM_VIEW_CLASSIFICATIONS = [
  { key: 'all_requests', label: 'All Support Requests' },
  { key: 'open_requests', label: 'Open Support Requests' },
  { key: 'closed_requests', label: 'Closed Support Requests' },
  { key: 'my_requests', label: 'My Support Requests' },
  { key: 'recently_updated', label: 'Recently Updated' },
]

export const SUPPORT_REQUEST_CUSTOM_VIEW_FIELD_DEFINITIONS = {
  srNumber: {
    key: 'srNumber',
    label: 'SR Number',
    filterPlaceholder: 'Search SR Number',
    searchable: true,
  },
  customerName: {
    key: 'customerName',
    label: 'Customer Name',
    filterPlaceholder: 'Search Customer Name',
    searchable: true,
  },
  requestType: {
    key: 'requestType',
    label: 'Request Type',
    filterPlaceholder: 'Search Request Type',
    searchable: true,
    cellFormatter: (value) => formatSupportRequestType(value),
  },
  title: {
    key: 'title',
    label: 'Title',
    filterPlaceholder: 'Search Title',
    searchable: true,
  },
  priority: {
    key: 'priority',
    label: 'Priority',
    filterPlaceholder: 'Search Priority',
    searchable: true,
    cellFormatter: (value) => value || emptyValue,
  },
  status: {
    key: 'status',
    label: 'Status',
    filterPlaceholder: 'Search Status',
    searchable: true,
    cellFormatter: (value) => value || emptyValue,
  },
  srDate: {
    key: 'srDate',
    label: 'SR Date',
    filterPlaceholder: 'Search SR Date',
    searchable: true,
    cellFormatter: (value) => formatShortDate(value),
  },
  ownerName: {
    key: 'ownerName',
    label: 'Owner',
    filterPlaceholder: 'Search Owner',
    searchable: true,
  },
  city: {
    key: 'city',
    label: 'City',
    filterPlaceholder: 'Search City',
    searchable: true,
  },
  state: {
    key: 'state',
    label: 'State',
    filterPlaceholder: 'Search State',
    searchable: true,
  },
  contactPerson: {
    key: 'contactPerson',
    label: 'Contact Person',
    filterPlaceholder: 'Search Contact Person',
    searchable: true,
  },
  contactMobile: {
    key: 'contactMobile',
    label: 'Contact Mobile',
    filterPlaceholder: 'Search Contact Mobile',
    searchable: true,
    cellFormatter: (value, record) => value || record.contactPhone || emptyValue,
  },
  addedByName: {
    key: 'addedByName',
    label: 'Added By',
    filterPlaceholder: 'Search Added By',
    searchable: true,
  },
  createdAt: {
    key: 'createdAt',
    label: 'Added On',
    filterPlaceholder: 'Search Added On',
    searchable: true,
    cellFormatter: (value) => formatDateTime(value),
  },
  updatedAt: {
    key: 'updatedAt',
    label: 'Last Updated',
    filterPlaceholder: 'Search Last Updated',
    searchable: true,
    cellFormatter: (value) => formatDateTime(value),
  },
  closedOn: {
    key: 'closedOn',
    label: 'Closed On',
    filterPlaceholder: 'Search Closed On',
    searchable: true,
    cellFormatter: (value) => formatDateTime(value),
  },
}

export const SUPPORT_REQUEST_CUSTOM_VIEW_FIELD_OPTIONS = [
  'srNumber',
  'customerName',
  'requestType',
  'title',
  'priority',
  'status',
  'srDate',
  'ownerName',
  'city',
  'state',
  'contactPerson',
  'contactMobile',
  'addedByName',
  'createdAt',
  'updatedAt',
  'closedOn',
].map((fieldKey) => ({
  key: fieldKey,
  label: SUPPORT_REQUEST_CUSTOM_VIEW_FIELD_DEFINITIONS[fieldKey].label,
}))

const TABULAR_DEFAULT_FIELDS = [
  'srNumber',
  'customerName',
  'requestType',
  'title',
  'ownerName',
  'updatedAt',
]

const GRID_DEFAULT_FIELDS = [
  'srNumber',
  'customerName',
  'title',
  'status',
  'srDate',
  'ownerName',
  'city',
  'contactPerson',
]

export const buildDefaultSupportRequestCustomViewDraft = () => ({
  viewName: '',
  context: 'supportRequest',
  viewType: 'tabular',
  classification: 'all_requests',
  filters: {
    ownerIn: [],
    statusIn: [],
    priorityIn: [],
    requestTypeIn: [],
    cityIn: [],
    stateIn: [],
    addedByIn: [],
    hasContactEmail: false,
    hasContactMobile: false,
    hasOnSiteRequirements: false,
    customerNameContains: '',
    titleContains: '',
    contactPersonContains: '',
    referenceNumberContains: '',
  },
  visibleFields: TABULAR_DEFAULT_FIELDS,
  addToHomePage: false,
})

export const getDefaultSupportRequestVisibleFields = (viewType = 'tabular') =>
  viewType === 'grid' ? GRID_DEFAULT_FIELDS : TABULAR_DEFAULT_FIELDS

export const buildSupportRequestCustomViewColumns = (visibleFields = []) => {
  const uniqueKeys = Array.from(new Set(['srNumber', ...visibleFields]))

  return uniqueKeys
    .map((key) => SUPPORT_REQUEST_CUSTOM_VIEW_FIELD_DEFINITIONS[key])
    .filter(Boolean)
}

export const getSupportRequestCustomViewClassificationLabel = (classification) =>
  SUPPORT_REQUEST_CUSTOM_VIEW_CLASSIFICATIONS.find((option) => option.key === classification)?.label || 'All Support Requests'

export const formatSupportRequestCustomViewFieldValue = (fieldKey, record) => {
  const definition = SUPPORT_REQUEST_CUSTOM_VIEW_FIELD_DEFINITIONS[fieldKey]
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
