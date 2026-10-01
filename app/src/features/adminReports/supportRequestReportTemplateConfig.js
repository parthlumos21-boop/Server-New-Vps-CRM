const toOption = (value, label = value) => ({
  value,
  label,
})

export const SUPPORT_REQUEST_REPORT_VISIBILITY_OPTIONS = [
  toOption('Visible to Me Only', 'Visible to Me Only'),
  toOption('All', 'All'),
]

export const SUPPORT_REQUEST_REPORT_FIELD_GROUPS = [
  {
    title: 'SR Attributes',
    fields: [
      { key: 'srNumber', label: 'SR Number' },
      { key: 'customerName', label: 'Customer Name' },
      { key: 'customerCompany', label: 'Customer Company' },
      { key: 'requestType', label: 'Request Type' },
      { key: 'title', label: 'Title' },
      { key: 'priority', label: 'Priority' },
      { key: 'status', label: 'Status' },
      { key: 'srDate', label: 'SR Date' },
      { key: 'ownerName', label: 'Owner' },
      { key: 'addedByName', label: 'Added By' },
      { key: 'description', label: 'Description' },
      { key: 'onSiteRequirements', label: 'On Site Requirements' },
      { key: 'onHoldReason', label: 'On Hold Reason' },
      { key: 'postponedReason', label: 'Postponed Reason' },
      { key: 'referenceNumber', label: 'Reference Number' },
      { key: 'reopenedOn', label: 'Reopened On' },
      { key: 'closedOn', label: 'Closed On' },
      { key: 'updatedAt', label: 'Last Updated' },
      { key: 'notes', label: 'Notes' },
    ],
  },
  {
    title: 'Customer',
    fields: [
      { key: 'customerEmail', label: 'Customer Email' },
      { key: 'customerPhone', label: 'Customer Phone' },
      { key: 'customerMobile', label: 'Customer Mobile' },
      { key: 'contactPerson', label: 'Contact Person' },
      { key: 'contactDesignation', label: 'Contact Designation' },
      { key: 'contactEmail', label: 'Contact Email' },
      { key: 'contactPhone', label: 'Contact Phone' },
      { key: 'contactMobile', label: 'Contact Mobile' },
      { key: 'state', label: 'State' },
      { key: 'city', label: 'City' },
      { key: 'address', label: 'Address' },
      { key: 'zipCode', label: 'Zip Code' },
    ],
  },
]

export const SUPPORT_REQUEST_REPORT_FIELD_OPTIONS = SUPPORT_REQUEST_REPORT_FIELD_GROUPS.flatMap(
  (group) => group.fields,
)

export const SUPPORT_REQUEST_REPORT_GROUP_BY_OPTIONS = [
  toOption('', 'Select'),
  toOption('status', 'Status'),
  toOption('priority', 'Priority'),
  toOption('requestType', 'Request Type'),
  toOption('ownerName', 'Owner'),
  toOption('customerName', 'Customer Name'),
  toOption('state', 'State'),
  toOption('city', 'City'),
]

export const SUPPORT_REQUEST_REPORT_ORDER_BY_OPTIONS = [
  toOption('', 'Select'),
  ...SUPPORT_REQUEST_REPORT_FIELD_OPTIONS.map((field) => toOption(field.key, field.label)),
]

export const SUPPORT_REQUEST_REPORT_AGGREGATE_OPTIONS = [
  toOption('', 'Select'),
  toOption('count', 'Count'),
  toOption('sum', 'Sum'),
  toOption('avg', 'Average'),
]

export const SUPPORT_REQUEST_REPORT_FILTER_FIELD_OPTIONS = [
  toOption('', 'Select'),
  ...SUPPORT_REQUEST_REPORT_FIELD_OPTIONS.map((field) => toOption(field.key, field.label)),
]

export const SUPPORT_REQUEST_REPORT_FILTER_OPERATOR_OPTIONS = [
  toOption('equals', 'equal'),
  toOption('not_equals', 'not equal'),
  toOption('contains', 'contains'),
  toOption('not_contains', 'not contains'),
  toOption('starts_with', 'starts with'),
  toOption('ends_with', 'ends with'),
  toOption('is_empty', 'is empty'),
  toOption('is_not_empty', 'is not empty'),
]
