const toOption = (value, label = value) => ({
  value,
  label,
})

export const DEAL_REPORT_VISIBILITY_OPTIONS = [
  toOption('Visible to Me Only', 'Visible to Me Only'),
  toOption('All', 'All'),
]

export const DEAL_REPORT_FIELD_GROUPS = [
  {
    title: 'Deal Attributes',
    fields: [
      { key: 'dealNumber', label: 'Deal No.' },
      { key: 'dealDate', label: 'Deal Date' },
      { key: 'name', label: 'Deal Name' },
      { key: 'dealOwner', label: 'Deal Owner' },
      { key: 'dealType', label: 'Deal Type' },
      { key: 'status', label: 'Deal Status' },
      { key: 'value', label: 'Deal Value' },
      { key: 'description', label: 'Description' },
      { key: 'projectName', label: 'Project Name' },
      { key: 'consultantName', label: 'Consultant Name' },
      { key: 'jobNo', label: 'Job No' },
      { key: 'city', label: 'City' },
      { key: 'closeDate', label: 'Deal Closed On' },
      { key: 'reasonForLost', label: 'Reason For Lost' },
      { key: 'createdAt', label: 'Added On' },
      { key: 'updatedAt', label: 'Last Updated' },
    ],
  },
  {
    title: 'Customer',
    fields: [
      { key: 'customerName', label: 'Customer Name' },
      { key: 'customerNumber', label: 'Customer No.' },
      { key: 'customerOwner', label: 'Customer Owner' },
      { key: 'customerCategory', label: 'Customer Category' },
      { key: 'contactPerson', label: 'Contact Person' },
      { key: 'contactDesignation', label: 'Contact Designation' },
      { key: 'contactPhone', label: 'Phone' },
      { key: 'contactMobile', label: 'Contact Mobile' },
      { key: 'contactEmail', label: 'Email' },
    ],
  },
  {
    title: 'Deal Products',
    fields: [
      { key: 'quotationCustomerStatus', label: 'Quotation Customer Status' },
      { key: 'orderCustomerStatus', label: 'Order Customer Status' },
      { key: 'poValue', label: 'PO Value' },
    ],
  },
]

export const DEAL_REPORT_FIELD_OPTIONS = DEAL_REPORT_FIELD_GROUPS.flatMap((group) => group.fields)

export const DEAL_REPORT_GROUP_BY_OPTIONS = [
  toOption('', 'Select'),
  toOption('dealOwner', 'Deal Owner'),
  toOption('dealType', 'Deal Type'),
  toOption('status', 'Deal Status'),
  toOption('customerName', 'Customer Name'),
  toOption('city', 'City'),
  toOption('consultantName', 'Consultant Name'),
]

export const DEAL_REPORT_ORDER_BY_OPTIONS = [
  toOption('', 'Select'),
  ...DEAL_REPORT_FIELD_OPTIONS.map((field) => toOption(field.key, field.label)),
]

export const DEAL_REPORT_AGGREGATE_OPTIONS = [
  toOption('', 'Select'),
  toOption('count', 'Count'),
  toOption('sum', 'Sum'),
  toOption('avg', 'Average'),
]

export const DEAL_REPORT_FILTER_FIELD_OPTIONS = [
  toOption('', 'Select'),
  ...DEAL_REPORT_FIELD_OPTIONS.map((field) => toOption(field.key, field.label)),
]

export const DEAL_REPORT_FILTER_OPERATOR_OPTIONS = [
  toOption('equals', 'equal'),
  toOption('not_equals', 'not equal'),
  toOption('contains', 'contains'),
  toOption('not_contains', 'not contains'),
  toOption('starts_with', 'starts with'),
  toOption('ends_with', 'ends with'),
  toOption('is_empty', 'is empty'),
  toOption('is_not_empty', 'is not empty'),
]
