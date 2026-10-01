import { format } from 'date-fns'

const formatExportDate = (value, pattern = 'dd-MM-yyyy') => {
  if (!value) return ''

  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return String(value)

  return format(date, pattern)
}

// Column descriptors used by every account-board export (My Group Account,
// View All Account, My Accounts, Weekly Reports-ALL, Search Account, etc.).
// Each column carries an explicit `type` so Excel applies the right number
// format and alignment instead of falling back to plain text. `width` is in
// "characters of the default font" and overrides the auto-fit calculation.
export const ACCOUNT_EXPORT_COLUMNS = [
  { key: '__serialNumber', label: 'Sr. No.',              align: 'center', width: 8,  type: 'integer' },
  { key: 'stageLabel',     label: 'Stage',                align: 'center', width: 14 },
  { key: 'accountNumber',  label: 'Account No.',       align: 'left',   width: 18 },
  { key: 'accountDate',    label: 'Account Date',         align: 'center', width: 14, type: 'date', formatter: (value) => formatExportDate(value) },
  { key: 'name',           label: 'Account Name',         align: 'left',   width: 32 },
  { key: 'accountOwner',   label: 'Account Owner',        align: 'left',   width: 20 },
  { key: 'status',         label: 'Account Status',       align: 'center', width: 14 },
  { key: 'accountState',   label: 'Account State',        align: 'left',   width: 14 },
  { key: 'accountSource',  label: 'Account Source',       align: 'left',   width: 16 },
  { key: 'contactPerson',  label: 'Contact Person',       align: 'left',   width: 22 },
  { key: 'phone',          label: 'Phone',                align: 'left',   width: 16 },
  { key: 'email',          label: 'Email',                align: 'left',   width: 28 },
  { key: 'addedBy',        label: 'Added By',             align: 'left',   width: 18 },
  { key: 'latestRemark',   label: 'Latest Remark',        align: 'left',   width: 36 },
  { key: 'accountCategory',label: 'Account Category',     align: 'left',   width: 16 },
  { key: 'projectName',    label: 'Project Name',         align: 'left',   width: 24 },
  { key: 'reasonForLost',  label: 'Reason For Lost',      align: 'left',   width: 24 },
  { key: 'accountSubsource', label: 'Account Subsource',  align: 'left',   width: 18 },
  { key: 'contactDesignation', label: 'Contact Designation', align: 'left', width: 20 },
  { key: 'contactEmail',   label: 'Contact Email',        align: 'left',   width: 28 },
  { key: 'contactPhone',   label: 'Contact Phone',        align: 'left',   width: 16 },
  { key: 'contactMobile',  label: 'Contact Mobile',       align: 'left',   width: 16 },
  { key: 'location',       label: 'Location',             align: 'left',   width: 18 },
  { key: 'address',        label: 'Address',              align: 'left',   width: 32 },
  { key: 'alternatePhone', label: 'Alternate Phone',      align: 'left',   width: 16 },
  { key: 'alternateEmail', label: 'Alternate Email',      align: 'left',   width: 28 },
  { key: 'customerType',   label: 'Customer Type',        align: 'left',   width: 16 },
  { key: 'productCategory',label: 'Product Category',     align: 'left',   width: 18 },
  { key: 'industryType',   label: 'Industry Type',        align: 'left',   width: 18 },
  { key: 'customerName',   label: 'Customer Name',        align: 'left',   width: 24 },
  { key: 'customerRefNo',  label: 'Inquiry Ref No.',      align: 'left',   width: 16 },
  { key: 'customerRefDate',label: 'Inquiry Ref Date',     align: 'center', width: 14, type: 'date', formatter: (value) => formatExportDate(value) },
  { key: 'consultantName', label: 'Consultant Name',      align: 'left',   width: 22 },
  { key: 'reminderDate',   label: 'Reminder Date',        align: 'center', width: 14, type: 'date', formatter: (value) => formatExportDate(value) },
  { key: 'reminderMode',   label: 'Reminder Mode',        align: 'center', width: 14 },
  { key: 'description',    label: 'Description',          align: 'left',   width: 36 },
  { key: 'remark',         label: 'Remark',               align: 'left',   width: 36 },
  { key: 'gstin',          label: 'GSTIN',                align: 'left',   width: 18 },
  { key: 'stateCode',      label: 'State Code',           align: 'center', width: 10 },
  { key: 'poValue',        label: 'PO Value',             align: 'right',  width: 16, type: 'currency' },
  { key: 'statusAsPerQuotationGiven', label: 'Status Of Customer As Per Quotation Given', align: 'left', width: 32 },
  { key: 'statusAsPerOrderReceived',  label: 'Status Of Customer As Per Order Received',  align: 'left', width: 32 },
  { key: 'jobNo',          label: 'Job No',               align: 'left',   width: 14 },
  { key: 'createdAt',      label: 'Created At',           align: 'center', width: 20, type: 'datetime', formatter: (value) => formatExportDate(value, 'dd-MM-yyyy hh:mm a') },
  { key: 'updatedAt',      label: 'Updated At',           align: 'center', width: 20, type: 'datetime', formatter: (value) => formatExportDate(value, 'dd-MM-yyyy hh:mm a') },
]

// Compact workbook layout for Excel exports. This avoids repeated contact/
// remark-style fields so the sheet stays short, clear, and easier to read.
export const ACCOUNT_COMPACT_EXPORT_COLUMNS = [
  { key: '__serialNumber', label: 'Sr. No.',      align: 'center', width: 8,  type: 'integer' },
  { key: 'stageLabel',     label: 'Stage',        align: 'center', width: 14 },
  { key: 'accountNumber',  label: 'Account No.',  align: 'left',   width: 16 },
  { key: 'accountDate',    label: 'Date',         align: 'center', width: 14, type: 'date', formatter: (value) => formatExportDate(value) },
  { key: 'name',           label: 'Account Name', align: 'left',   width: 28 },
  { key: 'accountOwner',   label: 'Owner',        align: 'left',   width: 18 },
  { key: 'status',         label: 'Status',       align: 'center', width: 16 },
  { key: 'accountState',   label: 'State',        align: 'left',   width: 14 },
  { key: 'accountSource',  label: 'Source',       align: 'left',   width: 16 },
  { key: 'contactPerson',  label: 'Contact',      align: 'left',   width: 20 },
  { key: 'phone',          label: 'Phone',        align: 'left',   width: 16 },
  { key: 'email',          label: 'Email',        align: 'left',   width: 24 },
  { key: 'location',       label: 'Location',     align: 'left',   width: 16 },
  { key: 'customerName',   label: 'Customer',     align: 'left',   width: 20 },
  { key: 'projectName',    label: 'Project',      align: 'left',   width: 22 },
  { key: 'gstin',          label: 'GSTIN',        align: 'left',   width: 18 },
  { key: 'poValue',        label: 'PO Value',     align: 'right',  width: 14, type: 'currency' },
  { key: 'jobNo',          label: 'Job No.',      align: 'left',   width: 14 },
  { key: 'latestRemark',   label: 'Latest Remark',align: 'left',   width: 28 },
  { key: 'updatedAt',      label: 'Updated At',   align: 'center', width: 20, type: 'datetime', formatter: (value) => formatExportDate(value, 'dd-MM-yyyy hh:mm a') },
]
