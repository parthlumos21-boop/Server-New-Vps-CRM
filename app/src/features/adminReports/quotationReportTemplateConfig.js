const toOption = (value, label = value) => ({
  value,
  label,
})

const slug = (value) => String(value || '')
  .toLowerCase()
  .replace(/[^a-z0-9]+/g, '_')
  .replace(/^_+|_+$/g, '')

const FIELD_KEY_LABEL_ALIASES = {
  'Account No.': 'Account Number',
  'Customer No.': 'Customer Number',
  'Deal No.': 'Deal Number',
  'Quotation No.': 'Quotation Number',
}

const toFields = (prefix, labels) => labels.map((label) => ({
  key: `${prefix}_${slug(FIELD_KEY_LABEL_ALIASES[label] || label)}`,
  label,
}))

// Report Context options shown in the "Generate Quotation Report" builder.
export const QUOTATION_REPORT_CONTEXT_OPTIONS = [
  {
    value: 'account',
    label: 'Account Quotation',
    reportName: 'Account Quotation Report',
    description: 'Account Quotation Report Template',
  },
  {
    value: 'deal',
    label: 'Deal Quotation',
    reportName: 'Deal Quotation Report',
    description: 'Deal Quotation Report Template',
  },
]

export const QUOTATION_REPORT_VISIBILITY_OPTIONS = [
  toOption('Visible to Me Only', 'Visible to Me Only'),
  toOption('All', 'All'),
]

// Common quotation fields (everything after the leading Account/Deal No. field).
const QUOTATION_COMMON_TAIL = [
  'Quotation No.',
  'Quotation Date',
  'Company Name',
  'Contact Person',
  'Quotation Valid Until',
  'Product Total Before Discount',
  'Service Total Before Discount',
  'Product Discount Amount',
  'Service Discount Amount',
  'Product Tax',
  'Service Tax',
  'Product Total',
  'Other Product Total',
  'Service Total',
  'Other Service Total',
  'Quotation Total',
  'Product Discount(%)',
  'Service Discount(%)',
  'Status',
  'Profile Name',
  'Quotation Currency',
  'Quotation Added By',
  'Revision',
]

const QUOTE_ITEM_FIELDS = [
  'Quote Item Type',
  'Quote Item ID',
  'Quote Item Name',
  'Quote Item Quantity',
  'Quote Item UOM',
  'Quote Item Unit Price',
  'Quote Item Discount Percentage',
  'Quote Item Tax Amount',
  'Quote Item Total',
]

const DEAL_FIELDS = [
  'PO Value',
  'Customer No.',
  'Deal Date',
  'Deal Type',
  'Deal Name',
  'Deal Owner',
  'Deal Status',
  'Address',
  'Deal Co-Owners',
  'Actual Closure Date',
  'Expected Closure Date',
  'Deal Value',
  'Probability',
  'Deal Score',
  'Description',
  'Product Category',
  'Consultant Name',
  'Customer Ref. Date',
  'Customer Ref. No.',
  'Contact Name',
  'GSTIN',
  'Phone',
  'Country Code',
  'Email',
  'Deal Value Currency',
  'Project Name',
  'Job No',
  'Status Of Customer as per quotation Given',
  'Status of Customer as per Order Received',
  'Deal Source',
  'Reason For Lost',
  'Ageing',
  'Deal Latest Remark',
]

const ACCOUNT_FIELDS = [
  'Account Name',
  'Account Date',
  'Account Category',
  'Account Owner',
  'Account Status',
  'Account Source',
  'Account State',
  'Contact Person',
  'Phone',
  'Country Code',
  'Email',
  'Alternate Phone',
  'Alternate Email',
  'Customer Type',
  'Project Name',
  'Product Category',
  'State',
  'Location',
  'Description',
  'Industry type',
  'Customer Ref. No.',
  'Customer Ref. Date',
  'Consultant Name',
  'PO Value',
  'Status of Customer as per Order Received',
  'Status Of Customer as per quotation Given',
  'GSTIN',
  'State Code',
  'Job No',
  'Reason For Lost',
  'Customer Name',
  'Ageing',
  'Account Latest Remark',
]

// Field groups differ by report context: Account Quotation surfaces Account
// attributes, Deal Quotation surfaces Deal attributes (per the source CRM).
export const getQuotationReportFieldGroups = (context = 'account') => {
  if (context === 'deal') {
    return [
      { title: 'Quotation', fields: toFields('q', ['Deal No.', ...QUOTATION_COMMON_TAIL]) },
      { title: 'Quote Item', fields: toFields('qi', QUOTE_ITEM_FIELDS) },
      { title: 'Deal', fields: toFields('deal', DEAL_FIELDS) },
    ]
  }

  return [
    { title: 'Quotation', fields: toFields('q', ['Account No.', ...QUOTATION_COMMON_TAIL]) },
    { title: 'Quote Item', fields: toFields('qi', QUOTE_ITEM_FIELDS) },
    { title: 'Account', fields: toFields('acct', ACCOUNT_FIELDS) },
  ]
}

export const getQuotationReportFieldOptions = (context = 'account') => (
  getQuotationReportFieldGroups(context).flatMap((group) => group.fields)
)

const buildSelectOptions = (context) => ([
  toOption('', 'Select'),
  ...getQuotationReportFieldOptions(context).map((field) => toOption(field.key, field.label)),
])

export const getQuotationReportFilterFieldOptions = (context = 'account') => buildSelectOptions(context)

export const getQuotationReportGroupByOptions = (context = 'account') => buildSelectOptions(context)

export const getQuotationReportOrderByOptions = (context = 'account') => buildSelectOptions(context)

export const QUOTATION_REPORT_AGGREGATE_OPTIONS = [
  toOption('', 'Select'),
  toOption('count', 'Count'),
  toOption('sum', 'Sum'),
  toOption('avg', 'Average'),
]

export const QUOTATION_REPORT_FILTER_OPERATOR_OPTIONS = [
  toOption('equals', 'equal'),
  toOption('not_equals', 'not equal'),
  toOption('contains', 'contains'),
  toOption('not_contains', 'not contains'),
  toOption('starts_with', 'starts with'),
  toOption('ends_with', 'ends with'),
  toOption('is_empty', 'is empty'),
  toOption('is_not_empty', 'is not empty'),
]
