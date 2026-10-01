const toOption = (value, label = value) => ({
  value,
  label,
})

export const CUSTOMER_REPORT_VISIBILITY_OPTIONS = [
  toOption('Visible to Me Only', 'Visible to Me Only'),
  toOption('All', 'All'),
]

export const CUSTOMER_REPORT_FIELD_OPTIONS = [
  { key: 'customerNumber', label: 'Customer No.' },
  { key: 'customerName', label: 'Customer Name' },
  { key: 'addedDate', label: 'Added Date' },
  { key: 'customerCategory', label: 'Customer Category' },
  { key: 'customerOwner', label: 'Customer Owner' },
  { key: 'customerStatus', label: 'Customer Status' },
  { key: 'contactPerson', label: 'Contact Person' },
  { key: 'email', label: 'Email' },
  { key: 'phone', label: 'Phone' },
  { key: 'countryCode', label: 'Country Code' },
  { key: 'address', label: 'Address' },
  { key: 'customerType', label: 'Customer Type' },
  { key: 'productCategory', label: 'Product Category' },
  { key: 'designation', label: 'Designation' },
  { key: 'projectName', label: 'Project Name' },
  { key: 'state', label: 'State' },
  { key: 'industryType', label: 'Industry Type' },
  { key: 'gstin', label: 'GSTIN' },
  { key: 'stateCode', label: 'State Code' },
  { key: 'alternateEmail', label: 'Alternate Email' },
  { key: 'alternatePhone', label: 'Alternate Phone' },
  { key: 'jobNo', label: 'Job No' },
  { key: 'addedBy', label: 'Added By' },
  { key: 'updatedAt', label: 'Last Updated' },
  { key: 'ageing', label: 'Ageing' },
  { key: 'latestRemark', label: 'Customer Latest Remark' },
  { key: 'userGroup', label: 'User Group' },
]

export const CUSTOMER_REPORT_GROUP_BY_OPTIONS = [
  toOption('', 'Select'),
  toOption('customerOwner', 'Customer Owner'),
  toOption('customerCategory', 'Customer Category'),
  toOption('customerStatus', 'Customer Status'),
  toOption('customerType', 'Customer Type'),
  toOption('state', 'State'),
]

export const CUSTOMER_REPORT_ORDER_BY_OPTIONS = [
  toOption('', 'Select'),
  ...CUSTOMER_REPORT_FIELD_OPTIONS.map((field) => toOption(field.key, field.label)),
]

export const CUSTOMER_REPORT_AGGREGATE_OPTIONS = [
  toOption('', 'Select'),
  toOption('count', 'Count'),
  toOption('sum', 'Sum'),
  toOption('avg', 'Average'),
]

export const CUSTOMER_REPORT_FILTER_FIELD_OPTIONS = [
  toOption('', 'Select'),
  ...CUSTOMER_REPORT_FIELD_OPTIONS.map((field) => toOption(field.key, field.label)),
]

export const CUSTOMER_REPORT_FILTER_OPERATOR_OPTIONS = [
  toOption('equals', 'equal'),
  toOption('not_equals', 'not equal'),
  toOption('contains', 'contains'),
  toOption('not_contains', 'not contains'),
  toOption('starts_with', 'starts with'),
  toOption('ends_with', 'ends with'),
  toOption('is_empty', 'is empty'),
  toOption('is_not_empty', 'is not empty'),
]
