import { format } from 'date-fns'

const emptyValue = '-'
const isAccountNoCodeString = (val, row = {}) => {
  if (!val || typeof val !== 'string') return true
  const trimmed = val.trim()
  if (!trimmed) return true
  if (/^[A-Z]{2,4}\d{4,8}$/i.test(trimmed)) return true
  const raw = row.raw || row || {}
  const codes = [
    row.accountNo, row.accountNumber, row.ownerCode,
    raw.accountNo, raw.accountNumber, raw.ownerCode,
    row.formData?.accountNo, row.formData?.accountNumber, row.formData?.ownerCode,
    raw.formData?.accountNo, raw.formData?.accountNumber, raw.formData?.ownerCode
  ].filter(Boolean)
  return codes.includes(trimmed)
}

const formatAccountNameDisplay = (value, row = {}) => {
  const raw = row.raw || row || {}
  const formData = (row.formData || raw.formData || {})
  const data = (row.data || raw.data || {})

  const candidates = [
    value,
    row.accountName,
    row.customerName,
    row.name,
    raw.accountName,
    raw.customerName,
    raw.name,
    formData.accountName,
    formData.customerName,
    formData.name,
    formData['Account Name'],
    formData['Customer Name'],
    data.accountName,
    data.customerName,
    data.name,
    data['Account Name'],
    data['Customer Name'],
    row.company,
    raw.company,
  ]

  const validName = candidates.find((candidate) => typeof candidate === 'string' && candidate.trim() && !isAccountNoCodeString(candidate, row))
  return validName ? validName.trim() : emptyValue
}
const formatProjectNameDisplay = (value, row = {}) => (
  value
  || row.raw?.projectName
  || row.raw?.formData?.projectName
  || row.productCategory
  || row.raw?.productCategory
  || emptyValue
)
const formatAccountOwnerDisplay = (value, row = {}) => {
  const name = row.accountOwnerDisplay
    || row.accountOwnerName
    || value
    || row.raw?.accountOwner
    || row.raw?.ownerName
    || row.raw?.assignedToName
    || emptyValue

  const code = row.accountOwnerCode || row.raw?.accountOwnerCode || ''
  return code ? `${code} -- ${name}` : name
}
const formatAddedByDisplay = (value, row = {}) => row.addedBy || row.addedByDisplay || value || emptyValue

const formatLegacyBoardDate = (value, row = {}) => {
  const dateVal = value || row.accountDate || row.accountDateDisplay || row.createdAt || row.created_at || row.raw?.accountDate || row.raw?.createdAt || row.raw?.created_at
  if (!dateVal) return emptyValue

  const date = new Date(dateVal)
  if (Number.isNaN(date.getTime())) return String(dateVal)

  return format(date, 'dd-MM-yyyy')
}

export const GROUP_ACCOUNTS_COLUMNS = [
  { key: 'accountNumber', label: 'Account No.', filterPlaceholder: 'Search Account No.', width: '150px', searchable: true, exportable: true, clickable: true },
  { key: 'name', label: 'Account Name', filterPlaceholder: 'Search Account Name', width: '220px', searchable: true, exportable: true, cellFormatter: formatAccountNameDisplay, exportFormatter: formatAccountNameDisplay },
  { key: 'accountDate', label: 'Account Date', filterPlaceholder: 'Search Account Date', width: '150px', searchable: true, exportable: true, cellFormatter: (value, row) => formatLegacyBoardDate(value, row), exportFormatter: (value, row) => formatLegacyBoardDate(value, row) },
  { key: 'accountOwner', label: 'Account Owner', filterPlaceholder: 'Search Account Owner', width: '180px', searchable: true, exportable: true, cellFormatter: formatAccountOwnerDisplay, exportFormatter: formatAccountOwnerDisplay },
  { key: 'accountCategory', label: 'Account Category', filterPlaceholder: 'Search Account Category', width: '180px', searchable: true, exportable: true, cellFormatter: (value) => value || emptyValue },
  { key: 'status', label: 'Account Status', filterPlaceholder: 'Search Account Status', width: '150px', searchable: true, exportable: true },
  { key: 'phone', label: 'Phone', filterPlaceholder: 'Search Phone', width: '155px', searchable: true, exportable: true, cellFormatter: (value) => value || emptyValue },
  { key: 'email', label: 'Email', filterPlaceholder: 'Search Email', width: '165px', searchable: true, exportable: true, cellFormatter: (value) => value || emptyValue },
  { key: 'customerType', label: 'Customer Type', filterPlaceholder: 'Search Customer Type', width: '160px', searchable: true, exportable: true, cellFormatter: (value, row) => value || row.customerType || row.formData?.['Customer Type'] || row.formData?.customerType || emptyValue },
  { key: 'contactPerson', label: 'Contact Person', filterPlaceholder: 'Search Contact Person', width: '165px', searchable: true, exportable: true, cellFormatter: (value) => value || emptyValue },
  { key: 'projectName', label: 'Project Name', filterPlaceholder: 'Search Project Name', width: '210px', searchable: true, exportable: true, cellFormatter: formatProjectNameDisplay, exportFormatter: formatProjectNameDisplay },
  { key: 'consultantName', label: 'Consultant Name', filterPlaceholder: 'Search Consultant Name', width: '190px', searchable: true, exportable: true, cellFormatter: (value, row) => value || row.consultantName || row.formData?.['Consultant Name'] || row.formData?.consultantName || emptyValue },
  { key: 'poValue', label: 'PO Value', filterPlaceholder: 'Search PO Value', width: '155px', searchable: true, exportable: true, cellFormatter: (value, row) => value || row.poValue || row.formData?.['PO Value'] || row.formData?.poValue || emptyValue },
  { key: 'userGroup', label: 'User Group', filterPlaceholder: 'Search User Group', width: '160px', searchable: true, exportable: true, cellFormatter: (value, row) => value || row.userGroup || row.formData?.['User Group'] || row.formData?.userGroup || emptyValue },
  { key: 'jobNo', label: 'Job No', filterPlaceholder: 'Search Job No', width: '155px', searchable: true, exportable: true, cellFormatter: (value) => value || emptyValue },
]

export const MY_GROUP_ACCOUNTS_COLUMNS = GROUP_ACCOUNTS_COLUMNS

export const VIEW_ALL_COLUMNS = [
  { key: 'accountNumber', label: 'Account No.', filterPlaceholder: 'Search Account No.', width: '150px', searchable: true, exportable: true, clickable: true },
  { key: 'accountDate', label: 'Account Date', filterPlaceholder: 'Search Account Date', width: '150px', searchable: true, exportable: true, cellFormatter: (value) => formatLegacyBoardDate(value), exportFormatter: (value) => formatLegacyBoardDate(value) },
  { key: 'name', label: 'Account Name', filterPlaceholder: 'Search Account Name', width: '220px', searchable: true, exportable: true, cellFormatter: formatAccountNameDisplay, exportFormatter: formatAccountNameDisplay },
  { key: 'accountOwner', label: 'Account Owner', filterPlaceholder: 'Search Account Owner', width: '180px', searchable: true, exportable: true, cellFormatter: formatAccountOwnerDisplay, exportFormatter: formatAccountOwnerDisplay },
  { key: 'status', label: 'Account Status', filterPlaceholder: 'Search Account Status', width: '150px', searchable: true, exportable: true },
  { key: 'accountSource', label: 'Account Source', filterPlaceholder: 'Search Account Source', width: '150px', searchable: true, exportable: true },
  { key: 'contactPerson', label: 'Contact Person', filterPlaceholder: 'Search Contact Person', width: '165px', searchable: true, exportable: true, cellFormatter: (value) => value || emptyValue },
  { key: 'phone', label: 'Phone', filterPlaceholder: 'Search Phone', width: '155px', searchable: true, exportable: true, cellFormatter: (value) => value || emptyValue },
  { key: 'email', label: 'Email', filterPlaceholder: 'Search Email', width: '165px', searchable: true, exportable: true, cellFormatter: (value) => value || emptyValue },
  { key: 'addedBy', label: 'Added By', filterPlaceholder: 'Search Added By', width: '150px', searchable: true, exportable: true, cellFormatter: formatAddedByDisplay, exportFormatter: formatAddedByDisplay },
  { key: 'latestRemark', label: 'Latest Remark', filterPlaceholder: 'Search Latest Remark', width: '210px', searchable: true, exportable: true, cellFormatter: (value) => value || emptyValue },
]

export const NO_FOLLOW_LEAD_COLUMNS = [
  { key: 'latestRemark', label: 'Latest Remark', filterPlaceholder: 'Search Latest Remark', width: '210px', searchable: true, exportable: true, cellFormatter: (value) => value || emptyValue },
  { key: 'accountNumber', label: 'Account No.', filterPlaceholder: 'Search Account No.', width: '150px', searchable: true, exportable: true, clickable: true },
  { key: 'name', label: 'Account Name', filterPlaceholder: 'Search Account Name', width: '220px', searchable: true, exportable: true, cellFormatter: formatAccountNameDisplay, exportFormatter: formatAccountNameDisplay },
  { key: 'accountDate', label: 'Account Date', filterPlaceholder: 'Search Account Date', width: '150px', searchable: true, exportable: true, cellFormatter: (value) => formatLegacyBoardDate(value), exportFormatter: (value) => formatLegacyBoardDate(value) },
  { key: 'accountCategory', label: 'Account Category', filterPlaceholder: 'Search Account Category', width: '180px', searchable: true, exportable: true, cellFormatter: (value) => value || emptyValue },
  { key: 'status', label: 'Account Status', filterPlaceholder: 'Search Account Status', width: '150px', searchable: true, exportable: true },
  { key: 'accountSource', label: 'Account Source', filterPlaceholder: 'Search Account Source', width: '150px', searchable: true, exportable: true },
  { key: 'poValue', label: 'PO Value', filterPlaceholder: 'Search PO Value', width: '155px', searchable: true, exportable: true, cellFormatter: (value) => value || emptyValue },
  { key: 'jobNo', label: 'Job No', filterPlaceholder: 'Search Job No', width: '155px', searchable: true, exportable: true, cellFormatter: (value) => value || emptyValue },
  { key: 'reasonForLost', label: 'Reason For Lost', filterPlaceholder: 'Search Reason For Lost', width: '210px', searchable: true, exportable: true, cellFormatter: (value) => value || emptyValue, exportFormatter: (value) => value || '' },
]

export const ACCOUNT_LIST_BOARD_COLUMNS = [
  {
    key: 'accountNumber',
    label: 'Account No.',
    filterPlaceholder: 'Search Account No.',
    width: '150px',
    searchable: true,
    exportable: true,
    clickable: true,
  },
  {
    key: 'name',
    label: 'Account Name',
    filterPlaceholder: 'Search Account Name',
    width: '220px',
    searchable: true,
    exportable: true,
    cellFormatter: formatAccountNameDisplay,
    exportFormatter: formatAccountNameDisplay,
  },
  {
    key: 'accountDate',
    label: 'Account Date',
    filterPlaceholder: 'Search Account Date',
    width: '150px',
    searchable: true,
    exportable: true,
    cellFormatter: (value, row) => formatLegacyBoardDate(value, row),
    exportFormatter: (value, row) => formatLegacyBoardDate(value, row),
  },
  {
    key: 'accountCategory',
    label: 'Account Category',
    filterPlaceholder: 'Search Account Category',
    width: '180px',
    searchable: true,
    exportable: true,
    cellFormatter: (value) => value || emptyValue,
  },
  {
    key: 'accountOwner',
    label: 'Account Owner',
    filterPlaceholder: 'Search Account Owner',
    width: '180px',
    searchable: true,
    exportable: true,
    cellFormatter: formatAccountOwnerDisplay,
    exportFormatter: formatAccountOwnerDisplay,
  },
  {
    key: 'email',
    label: 'Email',
    filterPlaceholder: 'Search Email',
    width: '165px',
    searchable: true,
    exportable: true,
    cellFormatter: (value) => value || emptyValue,
  },
  {
    key: 'customerType',
    label: 'Customer Type',
    filterPlaceholder: 'Search Customer Type',
    width: '160px',
    searchable: true,
    exportable: true,
    cellFormatter: (value, row) => value || row.customerType || row.formData?.['Customer Type'] || row.formData?.customerType || emptyValue,
  },
  {
    key: 'projectName',
    label: 'Project Name',
    filterPlaceholder: 'Search Project Name',
    width: '210px',
    searchable: true,
    exportable: true,
    cellFormatter: formatProjectNameDisplay,
    exportFormatter: formatProjectNameDisplay,
  },
  {
    key: 'consultantName',
    label: 'Consultant Name',
    filterPlaceholder: 'Search Consultant Name',
    width: '190px',
    searchable: true,
    exportable: true,
    cellFormatter: (value, row) => value || row.consultantName || row.formData?.['Consultant Name'] || row.formData?.consultantName || emptyValue,
  },
  {
    key: 'poValue',
    label: 'PO Value',
    filterPlaceholder: 'Search PO Value',
    width: '155px',
    searchable: true,
    exportable: true,
    cellFormatter: (value, row) => value || row.poValue || row.formData?.['PO Value'] || row.formData?.poValue || emptyValue,
  },
  {
    key: 'userGroup',
    label: 'User Group',
    filterPlaceholder: 'Search User Group',
    width: '160px',
    searchable: true,
    exportable: true,
    cellFormatter: (value, row) => value || row.userGroup || row.formData?.['User Group'] || row.formData?.userGroup || emptyValue,
  },
  {
    key: 'reasonForLost',
    label: 'Reason For Lost',
    filterPlaceholder: 'Search Reason For Lost',
    width: '210px',
    searchable: true,
    exportable: true,
    cellFormatter: (value) => value || emptyValue,
    exportFormatter: (value) => value || '',
  },
]

export const DEFAULT_ADMIN_BOARD_COLUMNS = [
  {
    key: 'accountNumber',
    label: 'Account No.',
    filterPlaceholder: 'Search Account No.',
    width: '170px',
    searchable: true,
    exportable: true,
    clickable: true,
  },
  {
    key: 'name',
    label: 'Account Name',
    filterPlaceholder: 'Search Account Name',
    width: '240px',
    searchable: true,
    exportable: true,
    cellFormatter: formatAccountNameDisplay,
    exportFormatter: formatAccountNameDisplay,
  },
  {
    key: 'accountCategory',
    label: 'Account Category',
    filterPlaceholder: 'Search Account Category',
    width: '180px',
    searchable: true,
    exportable: true,
  },
  {
    key: 'projectName',
    label: 'Project Name',
    filterPlaceholder: 'Search Project Name',
    width: '220px',
    searchable: true,
    exportable: true,
    cellFormatter: formatProjectNameDisplay,
    exportFormatter: formatProjectNameDisplay,
  },
  {
    key: 'consultantName',
    label: 'Consultant Name',
    filterPlaceholder: 'Search Consultant Name',
    width: '190px',
    searchable: true,
    exportable: true,
    cellFormatter: (value) => value || emptyValue,
  },
  {
    key: 'reasonForLost',
    label: 'Reason For Lost',
    filterPlaceholder: 'Search Reason For Lost',
    width: '220px',
    searchable: true,
    exportable: true,
    cellFormatter: (value) => value || emptyValue,
    exportFormatter: (value) => value || '',
  },
  {
    key: 'accountDate',
    label: 'Account Date',
    filterPlaceholder: 'Search Account Date',
    width: '150px',
    searchable: true,
    exportable: true,
    cellFormatter: (value) => formatLegacyBoardDate(value),
    exportFormatter: (value) => formatLegacyBoardDate(value),
  },
  {
    key: 'accountOwner',
    label: 'Account Owner',
    filterPlaceholder: 'Search Account Owner',
    width: '170px',
    searchable: true,
    exportable: true,
    cellFormatter: formatAccountOwnerDisplay,
    exportFormatter: formatAccountOwnerDisplay,
  },
]

export const SEARCH_ACCOUNT_BOARD_COLUMNS = [
  {
    key: 'accountNumber',
    label: 'Account No.',
    filterPlaceholder: 'Search Account No.',
    width: '170px',
    searchable: true,
    exportable: true,
    clickable: true,
  },
  {
    key: 'accountDate',
    label: 'Account Date',
    filterPlaceholder: 'Search Account Date',
    width: '140px',
    searchable: true,
    exportable: true,
    cellFormatter: (value) => formatLegacyBoardDate(value),
    exportFormatter: (value) => formatLegacyBoardDate(value),
  },
  {
    key: 'name',
    label: 'Account Name',
    filterPlaceholder: 'Search Account Name',
    width: '210px',
    searchable: true,
    exportable: true,
    cellFormatter: formatAccountNameDisplay,
    exportFormatter: formatAccountNameDisplay,
  },
  {
    key: 'accountOwner',
    label: 'Account Owner',
    filterPlaceholder: 'Search Account Owner',
    width: '160px',
    searchable: true,
    exportable: true,
    cellFormatter: formatAccountOwnerDisplay,
    exportFormatter: formatAccountOwnerDisplay,
  },
  {
    key: 'status',
    label: 'Account Status',
    filterPlaceholder: 'Search Account Status',
    width: '140px',
    searchable: true,
    exportable: true,
  },
  {
    key: 'accountSource',
    label: 'Account Source',
    filterPlaceholder: 'Search Account Source',
    width: '140px',
    searchable: true,
    exportable: true,
  },
  {
    key: 'consultantName',
    label: 'Consultant Name',
    filterPlaceholder: 'Search Consultant Name',
    width: '180px',
    searchable: true,
    exportable: true,
    cellFormatter: (value) => value || emptyValue,
  },
  {
    key: 'contactPerson',
    label: 'Contact Person',
    filterPlaceholder: 'Search Contact Person',
    width: '160px',
    searchable: true,
    exportable: true,
    cellFormatter: (value) => value || emptyValue,
  },
  {
    key: 'phone',
    label: 'Phone',
    filterPlaceholder: 'Search Phone',
    width: '140px',
    searchable: true,
    exportable: true,
    cellFormatter: (value) => value || emptyValue,
  },
  {
    key: 'email',
    label: 'Email',
    filterPlaceholder: 'Search Email',
    width: '170px',
    searchable: true,
    exportable: true,
    cellFormatter: (value) => value || emptyValue,
  },
  {
    key: 'addedBy',
    label: 'Added By',
    filterPlaceholder: 'Search Added By',
    width: '140px',
    searchable: true,
    exportable: true,
    cellFormatter: formatAddedByDisplay,
    exportFormatter: formatAddedByDisplay,
  },
  {
    key: 'latestRemark',
    label: 'Latest Remark',
    filterPlaceholder: 'Search Latest Remark',
    width: '210px',
    searchable: true,
    exportable: true,
    cellFormatter: (value) => value || emptyValue,
  },
  {
    key: 'quotationNumber',
    label: 'Quotation No.',
    filterPlaceholder: 'Search Quotation No.',
    width: '160px',
    searchable: true,
    exportable: true,
    cellFormatter: (value, row) => value || row?.quotationNo || row?.quotationNumber || row?.latestQuotationNo || emptyValue,
  },
  {
    key: 'quotationOwnerName',
    label: 'Quotation Owner Name',
    filterPlaceholder: 'Search Quotation Owner Name',
    width: '180px',
    searchable: true,
    exportable: true,
    cellFormatter: (value, row) => value || row?.quotationOwner || row?.quotationOwnerName || row?.latestQuotationOwner || emptyValue,
  },
  {
    key: 'reasonForLost',
    label: 'Reason Lost',
    filterPlaceholder: 'Search Reason Lost',
    width: '180px',
    searchable: true,
    exportable: true,
    cellFormatter: (value) => value || emptyValue,
  },
]

export const MY_ACCOUNTS_BOARD_COLUMNS = [
  {
    key: 'accountNumber',
    label: 'Account No.',
    filterPlaceholder: 'Search Account No.',
    width: '170px',
    searchable: true,
    exportable: true,
    clickable: true,
  },
  {
    key: 'name',
    label: 'Account Name',
    filterPlaceholder: 'Search Account Name',
    width: '240px',
    searchable: true,
    exportable: true,
    cellFormatter: formatAccountNameDisplay,
    exportFormatter: formatAccountNameDisplay,
  },
  {
    key: 'accountCategory',
    label: 'Account Category',
    filterPlaceholder: 'Search Account Category',
    width: '190px',
    searchable: true,
    exportable: true,
    cellFormatter: (value) => value || emptyValue,
  },
  {
    key: 'projectName',
    label: 'Project Name',
    filterPlaceholder: 'Search Project Name',
    width: '220px',
    searchable: true,
    exportable: true,
    cellFormatter: formatProjectNameDisplay,
    exportFormatter: formatProjectNameDisplay,
  },
  {
    key: 'reasonForLost',
    label: 'Reason For Lost',
    filterPlaceholder: 'Search Reason For Lost',
    width: '210px',
    searchable: true,
    exportable: true,
    cellFormatter: (value) => value || emptyValue,
    exportFormatter: (value) => value || '',
  },
  {
    key: 'accountDate',
    label: 'Account Date',
    filterPlaceholder: 'Search Account Date',
    width: '150px',
    searchable: true,
    exportable: true,
    cellFormatter: (value) => formatLegacyBoardDate(value),
    exportFormatter: (value) => formatLegacyBoardDate(value),
  },
]

export const ACCOUNT_SOURCE_VIEW_COLUMNS = [
  {
    key: 'accountNumber',
    label: 'Account No.',
    filterPlaceholder: 'Search Account No.',
    width: '170px',
    searchable: true,
    exportable: true,
    clickable: true,
  },
  {
    key: 'name',
    label: 'Account Name',
    filterPlaceholder: 'Search Account Name',
    width: '240px',
    searchable: true,
    exportable: true,
    cellFormatter: formatAccountNameDisplay,
    exportFormatter: formatAccountNameDisplay,
  },
  {
    key: 'phone',
    label: 'Phone',
    filterPlaceholder: 'Search Phone',
    width: '170px',
    searchable: true,
    exportable: true,
    cellFormatter: (value) => value || emptyValue,
  },
  {
    key: 'email',
    label: 'Email',
    filterPlaceholder: 'Search Email',
    width: '210px',
    searchable: true,
    exportable: true,
    cellFormatter: (value) => value || emptyValue,
  },
]

export const WEEKLY_REPORTS_ALL_COLUMNS = [
  {
    key: 'accountNumber',
    label: 'Account No.',
    filterPlaceholder: 'Search Account No.',
    width: '160px',
    searchable: true,
    exportable: true,
    clickable: true,
  },
  {
    key: 'name',
    label: 'Account Name',
    filterPlaceholder: 'Search Account Name',
    width: '210px',
    searchable: true,
    exportable: true,
    cellFormatter: formatAccountNameDisplay,
    exportFormatter: formatAccountNameDisplay,
  },
  {
    key: 'accountDate',
    label: 'Account Date',
    filterPlaceholder: 'Search Account Date',
    width: '145px',
    searchable: true,
    exportable: true,
    cellFormatter: (value) => formatLegacyBoardDate(value),
    exportFormatter: (value) => formatLegacyBoardDate(value),
  },
  {
    key: 'accountOwner',
    label: 'Account Owner',
    filterPlaceholder: 'Search Account Owner',
    width: '160px',
    searchable: true,
    exportable: true,
    cellFormatter: formatAccountOwnerDisplay,
    exportFormatter: formatAccountOwnerDisplay,
  },
  {
    key: 'status',
    label: 'Account Status',
    filterPlaceholder: 'Search Account Status',
    width: '145px',
    searchable: true,
    exportable: true,
  },
  {
    key: 'accountSource',
    label: 'Account Source',
    filterPlaceholder: 'Search Account Source',
    width: '145px',
    searchable: true,
    exportable: true,
  },
  {
    key: 'contactPerson',
    label: 'Contact Person',
    filterPlaceholder: 'Search Contact Person',
    width: '165px',
    searchable: true,
    exportable: true,
    cellFormatter: (value) => value || emptyValue,
  },
  {
    key: 'phone',
    label: 'Phone',
    filterPlaceholder: 'Search Phone',
    width: '155px',
    searchable: true,
    exportable: true,
    cellFormatter: (value) => value || emptyValue,
  },
  {
    key: 'email',
    label: 'Email',
    filterPlaceholder: 'Search Email',
    width: '165px',
    searchable: true,
    exportable: true,
    cellFormatter: (value) => value || emptyValue,
  },
  {
    key: 'latestRemark',
    label: 'Latest Remark',
    filterPlaceholder: 'Search Latest Remark',
    width: '210px',
    searchable: true,
    exportable: true,
    cellFormatter: (value) => value || emptyValue,
  },
  {
    key: 'updatedAtDisplay',
    label: 'Last Updated',
    filterPlaceholder: 'Search Last Updated',
    width: '175px',
    searchable: true,
    exportable: true,
  },
]

export const SW_BARODA_MUM_COLUMNS = [
  {
    key: 'accountNumber',
    label: 'Account No.',
    filterPlaceholder: 'Search Account No.',
    width: '150px',
    searchable: true,
    exportable: true,
    clickable: true,
  },
  {
    key: 'name',
    label: 'Account Name',
    filterPlaceholder: 'Search Account Name',
    width: '210px',
    searchable: true,
    exportable: true,
    cellFormatter: formatAccountNameDisplay,
    exportFormatter: formatAccountNameDisplay,
  },
  {
    key: 'accountDate',
    label: 'Account Date',
    filterPlaceholder: 'Search Account Date',
    width: '145px',
    searchable: true,
    exportable: true,
    cellFormatter: (value) => formatLegacyBoardDate(value),
    exportFormatter: (value) => formatLegacyBoardDate(value),
  },
  {
    key: 'status',
    label: 'Account Status',
    filterPlaceholder: 'Search Account Status',
    width: '150px',
    searchable: true,
    exportable: true,
  },
  {
    key: 'accountSource',
    label: 'Account Source',
    filterPlaceholder: 'Search Account Source',
    width: '150px',
    searchable: true,
    exportable: true,
  },
  {
    key: 'contactPerson',
    label: 'Contact Person',
    filterPlaceholder: 'Search Contact Person',
    width: '155px',
    searchable: true,
    exportable: true,
    cellFormatter: (value) => value || emptyValue,
  },
  {
    key: 'projectName',
    label: 'Project Name',
    filterPlaceholder: 'Search Project Name',
    width: '175px',
    searchable: true,
    exportable: true,
    cellFormatter: formatProjectNameDisplay,
    exportFormatter: formatProjectNameDisplay,
  },
  {
    key: 'customerType',
    label: 'Customer Type',
    filterPlaceholder: 'Search Customer Type',
    width: '150px',
    searchable: true,
    exportable: true,
    cellFormatter: (value) => value || emptyValue,
  },
  {
    key: 'poValue',
    label: 'PO Value',
    filterPlaceholder: 'Search PO Value',
    width: '155px',
    searchable: true,
    exportable: true,
    cellFormatter: (value) => value || emptyValue,
  },
  {
    key: 'updatedAtDisplay',
    label: 'Last Updated',
    filterPlaceholder: 'Search Last Updated',
    width: '155px',
    searchable: true,
    exportable: true,
  },
  {
    key: 'latestRemark',
    label: 'Latest Remark',
    filterPlaceholder: 'Search Latest Remark',
    width: '235px',
    searchable: true,
    exportable: true,
    cellFormatter: (value) => value || emptyValue,
  },
]

export const USER_WISE_LEADS_COLUMNS = [
  {
    key: 'accountNumber',
    label: 'Account No.',
    filterPlaceholder: 'Search Account No.',
    width: '160px',
    searchable: true,
    exportable: true,
    clickable: true,
  },
  {
    key: 'name',
    label: 'Account Name',
    filterPlaceholder: 'Search Account Name',
    width: '220px',
    searchable: true,
    exportable: true,
    cellFormatter: formatAccountNameDisplay,
    exportFormatter: formatAccountNameDisplay,
  },
  {
    key: 'accountDate',
    label: 'Account Date',
    filterPlaceholder: 'Search Account Date',
    width: '150px',
    searchable: true,
    exportable: true,
    cellFormatter: (value) => formatLegacyBoardDate(value),
    exportFormatter: (value) => formatLegacyBoardDate(value),
  },
  {
    key: 'status',
    label: 'Account Status',
    filterPlaceholder: 'Search Account Status',
    width: '150px',
    searchable: true,
    exportable: true,
  },
  {
    key: 'accountSource',
    label: 'Account Source',
    filterPlaceholder: 'Search Account Source',
    width: '155px',
    searchable: true,
    exportable: true,
  },
  {
    key: 'poValue',
    label: 'PO Value',
    filterPlaceholder: 'Search PO Value',
    width: '180px',
    searchable: true,
    exportable: true,
    cellFormatter: (value) => value || emptyValue,
  },
  {
    key: 'latestRemark',
    label: 'Latest Remark',
    filterPlaceholder: 'Search Latest Remark',
    width: '235px',
    searchable: true,
    exportable: true,
    cellFormatter: (value) => value || emptyValue,
  },
]

export const CONVERTED_ACCOUNTS_COLUMNS = [
  {
    key: 'accountNumber',
    label: 'Account No.',
    filterPlaceholder: 'Search Account No.',
    width: '160px',
    searchable: true,
    exportable: true,
    clickable: true,
  },
  {
    key: 'name',
    label: 'Account Name',
    filterPlaceholder: 'Search Account Name',
    width: '230px',
    searchable: true,
    exportable: true,
    cellFormatter: formatAccountNameDisplay,
    exportFormatter: formatAccountNameDisplay,
  },
  {
    key: 'accountOwner',
    label: 'Account Owner',
    filterPlaceholder: 'Search Account Owner',
    width: '160px',
    searchable: true,
    exportable: true,
    cellFormatter: formatAccountOwnerDisplay,
    exportFormatter: formatAccountOwnerDisplay,
  },
  {
    key: 'phone',
    label: 'Phone',
    filterPlaceholder: 'Search Phone',
    width: '160px',
    searchable: true,
    exportable: true,
    cellFormatter: (value) => value || emptyValue,
  },
  {
    key: 'email',
    label: 'Email',
    filterPlaceholder: 'Search Email',
    width: '170px',
    searchable: true,
    exportable: true,
    cellFormatter: (value) => value || emptyValue,
  },
  {
    key: 'convertedAs',
    label: 'Converted As',
    filterPlaceholder: 'Search Converted As',
    width: '160px',
    searchable: true,
    exportable: true,
    cellFormatter: (value) => value || emptyValue,
  },
  {
    key: 'convertedContextNumber',
    label: 'Converted Context Number',
    filterPlaceholder: 'Search Converted Context Number',
    width: '180px',
    searchable: true,
    exportable: true,
    cellFormatter: (value) => value || emptyValue,
  },
]

const BOARD_COLUMNS_BY_VARIANT = {
  viewAll: VIEW_ALL_COLUMNS,
  myGroup: MY_GROUP_ACCOUNTS_COLUMNS,
  myAccounts: GROUP_ACCOUNTS_COLUMNS,
  searchAccount: ACCOUNT_LIST_BOARD_COLUMNS,
  accountSourceView: ACCOUNT_SOURCE_VIEW_COLUMNS,
  weeklyReportsAll: WEEKLY_REPORTS_ALL_COLUMNS,
  swBarodaMum: SW_BARODA_MUM_COLUMNS,
  userWiseLeads: USER_WISE_LEADS_COLUMNS,
  convertedAccounts: CONVERTED_ACCOUNTS_COLUMNS,
  dailyFreshLeads: WEEKLY_REPORTS_ALL_COLUMNS,
  noFollowLeads: NO_FOLLOW_LEAD_COLUMNS,
}

export const getAccountBoardColumns = (variantKey = 'myGroup') =>
  BOARD_COLUMNS_BY_VARIANT[variantKey] || DEFAULT_ADMIN_BOARD_COLUMNS

export const getColumnTextValue = (column, row) => {
  const value = row[column.key]

  if (column.exportFormatter) {
    return column.exportFormatter(value, row)
  }

  if (value === null || value === undefined || value === '') {
    return ''
  }

  return String(value)
}
