import React, { useCallback, useEffect, useMemo, useState } from 'react'
import { createPortal } from 'react-dom'
import {
  FaArrowLeft,
  FaArrowRight,
  FaBell,
  FaChevronDown,
  FaEdit,
  FaEllipsisV,
  FaEnvelope,
  FaFileExport,
  FaFileAlt,
  FaFilter,
  FaListAlt,
  FaListUl,
  FaPlus,
  FaSave,
  FaSearch,
  FaSyncAlt,
  FaTable,
  FaTimes,
  FaTrash,
  FaUser,
} from 'react-icons/fa'
import { useLocation, useNavigate } from 'react-router-dom'
import { useData } from '../../context/DataContext'
import { useAuth } from '../../context/AuthContext'
import { useModal, useSearch, useFilter } from '../../hooks'
import Badge from '../../components/common/Badge'
import Button from '../../components/common/Button'
import Card from '../../components/common/Card'
import Input from '../../components/common/Input'
import Modal from '../../components/common/Modal'
import Select from '../../components/common/Select'
import Table from '../../components/common/Table'
import { buildAdminAccountsBoardUrl } from '../../features/adminAccounts/config/accountBoardViews'
import { ADMIN_DEAL_VIEW_MAP, buildAdminDealDetailUrl, buildAdminManageDealUrl } from '../../features/adminDeals/config/adminDealViews'
import { DEAL_CITY_OPTIONS } from '../../features/adminDeals/config/dealCityOptions'
import { isClosedDealStatus, normalizeDealCity, normalizeOptionalNumberInput } from '../../features/adminDeals/config/dealUtils'
import { buildCrmDealActionUrl } from '../admin/crm-actions/CRMActionPage'
import { buildDealCustomViewColumns } from '../../features/adminDeals/customViews/dealCustomViewConfig'
import { getCustomViewDeals } from '../../features/adminDeals/customViews/getCustomViewDeals'
import { getAccountCategoryLogo } from '../../features/accounts/config/accountCategoryLogo'
import { getCrmOwnerDisplay, normalizeCrmUserName } from '../../features/users/crmUserDirectory'
import { authService } from '../../services/authService'
import { customerService } from '../../services/customerService'
import { reminderApi } from '../../services/reminderApi'
import { calendarApi } from '../../services/calendarApi'
import { exportCsvWorkbook, exportExcelWorkbook } from '../../utils/excelExport'
import { capitalize, formatCurrency, formatDate, formatNumber, getStatusColor } from '../../utils/helpers'
import { DEAL_STATUS } from '../../utils/constants'
import './Deals.css'

const REMINDER_MODE_OPTIONS = [
  { value: '', label: 'Select Reminder Mode' },
  { value: 'Call', label: 'Call' },
  { value: 'Email', label: 'Email' },
  { value: 'Meeting', label: 'Meeting' },
  { value: 'Visit', label: 'Visit' },
]

const REMINDER_TIME_OPTIONS = ['09:00', '10:00', '11:00', '12:00', '13:00', '14:00', '15:00', '16:00', '17:00']

const DEAL_TYPE_OPTIONS = [
  { value: 'LUMOS', label: 'LUMOS' },
  { value: 'SWATI', label: 'SWATI' },
  { value: 'PURCHASE ENQUIRY', label: 'PURCHASE ENQUIRY' },
  { value: 'TENDER ENQUIRY', label: 'TENDER ENQUIRY' },
]

const DEAL_SOURCE_OPTIONS = [
  'LUMOS',
  'SWATI',
  'PURCHASE ENQUIRY',
  'TENDER ENQUIRY',
]

const DEAL_CONTACT_PREFIX_OPTIONS = [
  { value: 'Mr.', label: 'Mr.' },
  { value: 'Mrs.', label: 'Mrs.' },
  { value: 'Ms.', label: 'Ms.' },
  { value: 'Dr.', label: 'Dr.' },
]

const LOST_ORDER_REASON_OPTIONS = [
  { value: '', label: 'Select Reason', shortLabel: 'Select Reason' },
  { value: 'Intense Competition', label: 'A - Intense Competition', shortLabel: 'A - Intense Com' },
  { value: 'On Hold', label: 'B - On Hold', shortLabel: 'B - On Hold' },
  { value: 'Payment Terms not matching.', label: 'C - Payment Terms not matching.', shortLabel: 'C - Payment' },
  { value: 'Delivery not matching.', label: 'D - Delivery not matching.', shortLabel: 'D - Delivery' },
  { value: 'Budgetory Offer.', label: 'E - Budgetory Offer.', shortLabel: 'E - Budgetory' },
]

const LOST_ORDER_DUPLICATE_MESSAGE = 'A deal with the same title already exists for this account or customer.'
const LOST_ORDER_REASON_LABELS = LOST_ORDER_REASON_OPTIONS.reduce((lookup, option) => ({
  ...lookup,
  [option.value]: option.label,
}), {})

const normalizeDealMarketingValue = (value = '') => {
  const normalized = String(value || '').trim().toUpperCase()
  if (normalized === 'MARKETING-LUMOS') return 'LUMOS'
  if (normalized === 'MARKETING-SWATI') return 'SWATI'
  return String(value || '').trim()
}

const parseAndDeduplicateMessages = (message, fallback = 'An error occurred') => {
  let parsedMessages = []
  if (Array.isArray(message)) {
    parsedMessages = message.map(String)
  } else if (typeof message === 'string') {
    parsedMessages = message.split(/(?:\r?\n|,)/)
  } else {
    parsedMessages = [String(message || fallback)]
  }
  const uniqueMessages = [...new Set(parsedMessages.map(s => s.trim()).filter(Boolean))]
  return uniqueMessages.join(' | ') || fallback
}

const DEAL_SEARCH_FIELD_CATALOG = [
  { key: 'dealNumber', label: 'Deal No.', placeholder: 'Search Deal No.', sourceField: 'deal_number' },
  { key: 'quotationNumber', label: 'Quotation Number', placeholder: 'Search Quotation No.', sourceField: 'quotation_number' },
  { key: 'dealDate', label: 'Quotation Date', placeholder: 'Search Quotation Date', sourceField: 'quotation_date' },
  { key: 'dealOwner', label: 'Quotation Owner', placeholder: 'Search Quotation Owner', sourceField: 'owner' },
  { key: 'companyCustomerName', label: 'Company / Customer Name', placeholder: 'Search Company / Customer', sourceField: 'company_customer_name' },
  { key: 'companyName', label: 'Company Name', placeholder: 'Search Company Name', sourceField: 'company_name' },
  { key: 'customerName', label: 'Customer Name', placeholder: 'Search Customer Name', sourceField: 'customer_name' },
  { key: 'projectName', label: 'Project Name', placeholder: 'Search Project Name', sourceField: 'project_name' },
  { key: 'dealValue', label: 'Amount', placeholder: 'Search Amount', sourceField: 'deal_value' },
  { key: 'dealStatus', label: 'Status', placeholder: 'Search Status', sourceField: 'status' },
  { key: 'orderCustomerStatusOld', label: 'Old', groupLabel: 'Customer Order Status', placeholder: 'Search Old Status', sourceField: 'order_customer_status_old' },
  { key: 'orderCustomerStatusNew', label: 'New', groupLabel: 'Customer Order Status', placeholder: 'Search New Status', sourceField: 'order_customer_status_new' },
  { key: 'convertToPo', label: 'Convert to PO', placeholder: 'Search Convert to PO', sourceField: 'convert_to_po' },
  { key: 'poValue', label: 'PO Value', placeholder: 'Search PO Value', sourceField: 'po_value' },
  { key: 'jobNo', label: 'Job No.', placeholder: 'Search Job No.', sourceField: 'job_no' },
  { key: 'reasonForLostOrder', label: 'Lost Order Reason', placeholder: 'Search Lost Order Reason', sourceField: 'reason_for_lost_order' },
  { key: 'customerNumber', label: 'Customer No.', placeholder: 'Search Customer No.', sourceField: 'customer_number' },
  { key: 'dealType', label: 'Deal Type', placeholder: 'Search Deal Type', sourceField: 'deal_type' },
  { key: 'dealName', label: 'Deal Name', placeholder: 'Search Deal Name', sourceField: 'deal_name' },
  { key: 'address', label: 'Address', placeholder: 'Search Address', sourceField: 'address' },
  { key: 'dealCoOwners', label: 'Deal Co-Owners', placeholder: 'Search Deal Co-Owners', sourceField: 'deal_co_owners' },
  { key: 'actualClosureDate', label: 'Actual Closure Date', placeholder: 'Search Actual Closure Date', sourceField: 'actual_closure_date' },
  { key: 'expectedClosureDate', label: 'Expected Closure Date', placeholder: 'Search Expected Closure Date', sourceField: 'expected_closure_date' },
  { key: 'probability', label: 'Probability', placeholder: 'Search Probability', sourceField: 'probability' },
  { key: 'dealScore', label: 'Deal Score', placeholder: 'Search Deal Score', sourceField: 'deal_score' },
  { key: 'description', label: 'Description', placeholder: 'Search Description', sourceField: 'description' },
  { key: 'productCategory', label: 'Product Category', placeholder: 'Search Product Category', sourceField: 'product_category' },
  { key: 'consultantName', label: 'Consultant Name', placeholder: 'Search Consultant Name', sourceField: 'consultant_name' },
  { key: 'contactName', label: 'Contact Name', placeholder: 'Search Contact Name', sourceField: 'contact_name' },
  { key: 'gstin', label: 'GSTIN', placeholder: 'Search GSTIN', sourceField: 'gstin' },
  { key: 'phone', label: 'Phone', placeholder: 'Search Phone', sourceField: 'phone' },
  { key: 'email', label: 'Email', placeholder: 'Search Email', sourceField: 'email' },
  { key: 'quotationCustomerStatus', label: 'Status Of Customer as per Quotation Given', placeholder: 'Search Quotation Status', sourceField: 'quotation_customer_status' },
  { key: 'orderCustomerStatus', label: 'Status Of Customer as per Order Received', placeholder: 'Search Order Status', sourceField: 'order_customer_status' },
  { key: 'accountName', label: 'Linked Account Name', placeholder: 'Search Linked Account Name', sourceField: 'account_name' },
  { key: 'accountNumber', label: 'Account No.', placeholder: 'Search Account No.', sourceField: 'account_number' },
  { key: 'city', label: 'City', placeholder: 'Search City', sourceField: 'city' },
  { key: 'companyProfile', label: 'Company Profile', placeholder: 'Search Company Profile', sourceField: 'company_profile' },
  { key: 'latestRemark', label: 'Latest Remark', placeholder: 'Search Latest Remark', sourceField: 'latest_remark' },
  { key: 'createdDate', label: 'Created Date', placeholder: 'Search Created Date', sourceField: 'created_at' },
  { key: 'location', label: 'Location', placeholder: 'Search Location', sourceField: 'location' },
]

const DEAL_GRID_COLUMNS = [
  { key: 'dealNumber', label: 'Deal No.', placeholder: 'Search Deal No.' },
  { key: 'quotationNumber', label: 'Quotation Number', placeholder: 'Search Quotation No.' },
  { key: 'dealDate', label: 'Quotation Date', placeholder: 'Search Quotation Date' },
  { key: 'dealOwner', label: 'Quotation Owner', placeholder: 'Search Quotation Owner' },
  { key: 'companyCustomerName', label: 'Company / Customer Name', placeholder: 'Search Company / Customer' },
  { key: 'projectName', label: 'Project Name', placeholder: 'Search Project Name' },
  { key: 'dealValue', label: 'Amount', placeholder: 'Search Amount' },
  { key: 'dealStatus', label: 'Status', placeholder: 'Search Status' },
  { key: 'quotationCustomerStatus', label: 'Quotation Status', placeholder: 'Search Quotation Status' },
  { key: 'orderCustomerStatusOld', label: 'Old', groupLabel: 'Customer Order Status', placeholder: 'Search Old Status' },
  { key: 'orderCustomerStatusNew', label: 'New', groupLabel: 'Customer Order Status', placeholder: 'Search New Status' },
  { key: 'convertToPo', label: 'Convert to PO', placeholder: 'Search Convert to PO' },
  { key: 'poValue', label: 'PO Value', placeholder: 'Search PO Value' },
  { key: 'jobNo', label: 'Job No.', placeholder: 'Search Job No' },
  { key: 'reasonForLostOrder', label: 'Lost Order Reason', placeholder: 'Search Reason' },
]

const VIEW_DEAL_GRID_COLUMNS = [
  { key: 'dealNumber', label: 'Deal No.', placeholder: 'Search Deal No.' },
  { key: 'quotationNumber', label: 'Quotation Number', placeholder: 'Search Quotation No.' },
  { key: 'dealDate', label: 'Quotation Date', placeholder: 'Search Quotation Date' },
  { key: 'dealOwner', label: 'Quotation Owner', placeholder: 'Search Quotation Owner' },
  { key: 'companyCustomerName', label: 'Company / Customer Name', placeholder: 'Search Company / Customer' },
  { key: 'projectName', label: 'Project Name', placeholder: 'Search Project Name' },
  { key: 'dealValue', label: 'Amount', placeholder: 'Search Amount' },
  { key: 'dealStatus', label: 'Status', placeholder: 'Search Status' },
  { key: 'quotationCustomerStatus', label: 'Quotation Status', placeholder: 'Search Quotation Status' },
  { key: 'orderCustomerStatusOld', label: 'Old', groupLabel: 'Customer Order Status', placeholder: 'Search Old Status' },
  { key: 'orderCustomerStatusNew', label: 'New', groupLabel: 'Customer Order Status', placeholder: 'Search New Status' },
  { key: 'convertToPo', label: 'Convert to PO (Yes / No)', placeholder: 'Search Convert to PO' },
  { key: 'poValue', label: 'PO Value', placeholder: 'Search PO Value' },
  { key: 'jobNo', label: 'Job No.', placeholder: 'Search Job No' },
  { key: 'reasonForLostOrder', label: 'Lost Order Reason', placeholder: 'Search Reason' },
]

const CUSTOM_LOCATION_SELECT_OPTIONS = [
  { value: '', label: 'Select Location' },
  { value: 'Ahmedabad', label: 'Ahmedabad Deal' },
  { value: 'Vadodara', label: 'Vadodara Deal' },
]

const SEARCH_DEAL_REQUIRED_GRID_KEYS = [
  'dealNumber',
  'quotationNumber',
  'dealDate',
  'dealOwner',
  'companyCustomerName',
  'projectName',
  'dealValue',
  'dealStatus',
  'quotationCustomerStatus',
  'orderCustomerStatusOld',
  'orderCustomerStatusNew',
  'convertToPo',
  'poValue',
  'jobNo',
  'reasonForLostOrder',
]

const OWNER_WISE_COLUMNS = [
  ...VIEW_DEAL_GRID_COLUMNS,
]

const PROJECT_DETAILS_COLUMNS = [
  ...VIEW_DEAL_GRID_COLUMNS,
]

const AHMADABAD_COLUMNS = [
  ...VIEW_DEAL_GRID_COLUMNS,
]

const VADODARA_COLUMNS = [
  ...VIEW_DEAL_GRID_COLUMNS,
]

// Explicit column-type metadata for the deal export. Replaces the previous
// label-substring heuristic, which was fragile (matched any column whose label
// contained "value", "date", etc.). Add new keys here when a new field type
// matters Ã¢â‚¬â€ anything not listed renders as plain wrapped text.
const DEAL_EXPORT_FIELD_META = {
  // Currency
  dealValue:        { type: 'currency', width: 18 },
  poValue:          { type: 'currency', width: 18 },
  // Percent
  probability:      { type: 'percent',  width: 12 },
  // Integer / number
  dealScore:        { type: 'integer',  width: 10 },
  ageing:           { type: 'integer',  width: 10 },
  // Dates
  dealDate:            { type: 'date',     width: 14 },
  actualClosureDate:   { type: 'date',     width: 16 },
  expectedClosureDate: { type: 'date',     width: 16 },
  lastUpdated:         { type: 'date',     width: 14 },
  reminderDate:        { type: 'date',     width: 14 },
  customerRefDate:     { type: 'date',     width: 14 },
  // Datetimes
  createdAt:        { type: 'datetime', width: 18 },
  updatedAt:        { type: 'datetime', width: 18 },
  // Wider text columns that should always wrap
  customerName:     { width: 28 },
  companyName:      { width: 28 },
  companyCustomerName: { width: 34 },
  dealName:         { width: 28 },
  projectName:      { width: 24 },
  accountOwner:     { width: 22 },
  dealOwner:        { width: 22 },
  accountName:      { width: 24 },
  description:      { width: 36 },
  latestRemark:     { width: 36 },
  address:          { width: 32 },
  reasonForLost:    { width: 28 },
  email:            { width: 24 },
  consultantName:   { width: 22 },
}

const DEAL_BOARD_COLUMNS = [
  { key: 'new', label: 'New', headerClassName: 'deals-board-column-header-new' },
  { key: 'closedWon', label: 'Closed Won', headerClassName: 'deals-board-column-header-won' },
  { key: 'closedLost', label: 'Closed Lost', headerClassName: 'deals-board-column-header-lost' },
  { key: 'quotationSent', label: 'Quotation Sent', headerClassName: 'deals-board-column-header-sent' },
  { key: 'quotationRevision', label: 'Quotation Revision', headerClassName: 'deals-board-column-header-revision' },
]

const DEAL_STATUS_FILTER_OPTIONS = [
  { key: 'all', label: 'All Deal Status' },
  ...DEAL_BOARD_COLUMNS.map((column) => ({ key: column.key, label: column.label })),
]

const ROWS_PER_PAGE = 6
const BOARD_INITIAL_LIMIT = 8
const BOARD_LOAD_MORE_COUNT = 6
let dealContactSequence = 0

const createDealContact = (overrides = {}) => {
  dealContactSequence += 1

  return {
    id: overrides.id || `deal-contact-${dealContactSequence}`,
    included: overrides.included ?? true,
    isPrimary: overrides.isPrimary ?? false,
    prefix: overrides.prefix || 'Mr.',
    name: overrides.name || overrides.contactPerson || '',
    designation: overrides.designation || overrides.contactDesignation || '',
    phone: overrides.phone || overrides.contactMobile || overrides.contactPhone || '',
    email: overrides.email || overrides.contactEmail || '',
  }
}

const normalizeDealContacts = (contacts = [], fallbackContact = {}) => {
  const sourceContacts = Array.isArray(contacts) ? contacts : []
  const normalizedContacts = sourceContacts
    .map((contact) => createDealContact(contact))
    .filter((contact) => contact.name || contact.phone || contact.email || contact.designation)

  if (normalizedContacts.length === 0 && (
    fallbackContact.name
    || fallbackContact.phone
    || fallbackContact.email
    || fallbackContact.designation
  )) {
    normalizedContacts.push(createDealContact({
      ...fallbackContact,
      included: true,
      isPrimary: true,
    }))
  }

  if (normalizedContacts.length === 0) {
    return [createDealContact({ included: true, isPrimary: true })]
  }

  const hasPrimaryContact = normalizedContacts.some((contact) => contact.isPrimary && contact.included)

  return normalizedContacts.map((contact, index) => ({
    ...contact,
    included: contact.included ?? true,
    isPrimary: hasPrimaryContact ? Boolean(contact.isPrimary) : index === 0,
  }))
}

const getPrimaryDealContact = (contacts = []) => {
  const includedContacts = contacts.filter((contact) =>
    contact.included && (contact.name || contact.phone || contact.email || contact.designation)
  )

  return includedContacts.find((contact) => contact.isPrimary) || includedContacts[0] || null
}

const buildInitialFormData = (overrides = {}) => {
  const todayDate = new Date().toISOString().slice(0, 10)

  return {
    dealDate: todayDate,
    name: '',
    dealType: '',
    dealSource: '',
    dealSubsource: '',
    expectedClosureDate: todayDate,
    value: '',
    valueCurrency: 'INR',
    status: 'new',
    stage: '',
    closeDate: todayDate,
    projectName: '',
    city: '',
    description: '',
    address: '',
    dealCoOwners: '',
    dealScore: '',
    consultantName: '',
    customerQuotationStatus: '',
    probability: '',
    productCategory: '',
    customerRefNo: '',
    customerRefDate: todayDate,
    gstin: '',
    jobNo: '',
    customerOrderStatusOld: '',
    customerOrderStatusNew: '',
    convertToPo: '',
    poValueJobNo: '',
    reasonForLostOrder: '',
    contacts: normalizeDealContacts(),
    ownerUserId: '',
    ...overrides,
  }
}

const buildInitialGridFilters = () => (
  DEAL_SEARCH_FIELD_CATALOG.reduce((accumulator, column) => ({
    ...accumulator,
    [column.key]: '',
  }), {})
)

const DEAL_FILTER_OPERATORS = [
  { value: 'empty', label: 'empty' },
  { value: 'equals', label: 'equal to' },
  { value: 'contains', label: 'contains' },
  { value: 'startsWith', label: 'starts with' },
  { value: 'endsWith', label: 'end with' },
]

const DEAL_OWNER_FILTER_OPERATORS = [
  { value: 'empty', label: 'empty' },
  { value: 'equals', label: 'equal to' },
  { value: 'contains', label: 'contains' },
  { value: 'startsWith', label: 'starts with' },
  { value: 'endsWith', label: 'end with' },
]

const DEAL_FILTER_ACTION_OPTIONS = [
  { key: 'viewDeal', label: 'View Deal' },
  { key: 'manageDeal', label: 'Manage Deal' },
  { key: 'addRemark', label: 'Add Remark' },
  { key: 'changeStatus', label: 'Change Status' },
  { key: 'generateQuotation', label: 'Generate Quotation' },
  { key: 'uploadQuotation', label: 'Upload Quotation' },
  { key: 'reassignDeal', label: 'Re-Assign Deal' },
  { key: 'addReminder', label: 'Add Reminder' },
  { key: 'sendMail', label: 'Send Mail' },
]

const DEFAULT_DEAL_FILTER_ACTION_KEYS = ['viewDeal', 'manageDeal', 'addRemark', 'changeStatus', 'generateQuotation', 'uploadQuotation', 'reassignDeal', 'addReminder']
const DEFAULT_GRID_SORT_CONFIG = {
  key: 'dealNumber',
  direction: 'asc',
}

let dealFilterRowSequence = 0

const createDealFilterRow = ({
  fieldKey = '',
  operator = '',
  value = '',
  negated = false,
} = {}) => {
  dealFilterRowSequence += 1

  return {
    id: `deal-filter-row-${dealFilterRowSequence}`,
    fieldKey,
    operator,
    value,
    negated,
  }
}

const buildFilterRowsFromFilters = (filters = {}) => {
  const rows = DEAL_SEARCH_FIELD_CATALOG
    .filter((column) => normalizeSearchValue(filters[column.key]) !== '')
    .map((column) => createDealFilterRow({
      fieldKey: column.key,
      operator: 'contains',
      value: filters[column.key],
    }))

  return rows.length > 0 ? rows : [createDealFilterRow()]
}

const buildFilterRowsFromRules = (rules = []) => {
  const rows = Array.isArray(rules)
    ? rules
      .map((rule) => createDealFilterRow({
        fieldKey: rule.fieldKey,
        operator: rule.operator || 'contains',
        value: rule.value || '',
        negated: Boolean(rule.negated),
      }))
      .filter((row) => row.fieldKey)
    : []

  return rows.length > 0 ? rows : [createDealFilterRow()]
}

const buildFilterRulesFromRows = (rows = []) => (
  rows
    .map((row) => ({
      fieldKey: String(row.fieldKey || '').trim(),
      operator: String(row.operator || 'contains').trim() || 'contains',
      value: String(row.value || '').trim(),
      negated: Boolean(row.negated),
    }))
    .filter((rule) => rule.fieldKey && (rule.operator === 'empty' || rule.value))
)

const hasAnyRuleFilters = (rules = []) => (
  Array.isArray(rules) && rules.some((rule) => rule?.fieldKey && (rule.operator === 'empty' || normalizeSearchValue(rule.value) !== ''))
)

const getGridSortConfigForKey = (columnKey) => {
  if (!columnKey) {
    return DEFAULT_GRID_SORT_CONFIG
  }

  return {
    key: columnKey,
    direction: 'asc',
  }
}

const matchGridFilterRule = (row, rule) => {
  if (isOwnerFilterField(rule.fieldKey)) {
    const rowValue = normalizeSearchValue(
      rule.fieldKey === 'dealOwner'
        ? row?.dealOwner
        : rule.fieldKey === 'ownerUserId'
          ? row?.rawDeal?.ownerUserId || row?.ownerUserId
          : row?.[rule.fieldKey]
    )
    const filterValue = normalizeSearchValue(rule.value)
    let matches = true

    if (rule.operator === 'equals') {
      matches = rowValue === filterValue
    } else if (rule.operator === 'startsWith') {
      matches = rowValue.startsWith(filterValue)
    } else if (rule.operator === 'endsWith') {
      matches = rowValue.endsWith(filterValue)
    } else if (rule.operator === 'empty') {
      matches = rowValue === ''
    } else {
      matches = rowValue.includes(filterValue)
    }

    return rule.negated ? !matches : matches
  }

  const rowValue = normalizeSearchValue(row?.[rule.fieldKey])
  const filterValue = normalizeSearchValue(rule.value)

  let matches = true

  if (rule.operator === 'equals') {
    matches = rowValue === filterValue
  } else if (rule.operator === 'notEquals') {
    matches = rowValue !== filterValue
  } else if (rule.operator === 'startsWith') {
    matches = rowValue.startsWith(filterValue)
  } else if (rule.operator === 'endsWith') {
    matches = rowValue.endsWith(filterValue)
  } else if (rule.operator === 'empty') {
    matches = rowValue === ''
  } else {
    matches = rowValue.includes(filterValue)
  }

  return rule.negated ? !matches : matches
}

const buildInitialOwnerScopedFilters = () => (
  [...OWNER_WISE_COLUMNS, ...PROJECT_DETAILS_COLUMNS, ...AHMADABAD_COLUMNS, ...VADODARA_COLUMNS].reduce((accumulator, column) => ({
    ...accumulator,
    [column.key]: '',
  }), {})
)

const buildInitialBoardVisibleCounts = () => (
  DEAL_BOARD_COLUMNS.reduce((accumulator, column) => ({
    ...accumulator,
    [column.key]: BOARD_INITIAL_LIMIT,
  }), {})
)

const normalizeSearchValue = (value) => String(value || '').trim().replace(/\s+/g, ' ').toLowerCase()
const COMPANY_CUSTOMER_FILTER_KEYS = new Set(['companyCustomerName', 'companyName', 'customerName', 'accountName'])
const getCompanyCustomerFilterText = (row = {}) => {
  const rawDeal = row.rawDeal || {}

  return normalizeSearchValue([
    row.companyCustomerName,
    row.companyName,
    row.customerName,
    row.accountName,
    row.accountNumber,
    row.customerNumber,
    rawDeal.companyCustomerName,
    rawDeal.companyName,
    rawDeal.customerName,
    rawDeal.linkedAccountName,
    rawDeal.accountName,
    rawDeal.linkedAccountNumber,
    rawDeal.accountNumber,
    rawDeal.customerNumber,
  ].filter(Boolean).join(' '))
}
const getDealGridFilterText = (row = {}, columnKey = '') => (
  COMPANY_CUSTOMER_FILTER_KEYS.has(columnKey)
    ? getCompanyCustomerFilterText(row)
    : normalizeSearchValue(row[columnKey])
)
const matchesDealGridFilterText = (row = {}, columnKey = '', filterValue = '') => (
  getDealGridFilterText(row, columnKey).includes(filterValue)
)
const matchesOwnerScopedFilterText = (row = {}, filterableRow = {}, columnKey = '', filterValue = '') => (
  matchesDealGridFilterText(row, columnKey, filterValue)
  || matchesDealGridFilterText(filterableRow, columnKey, filterValue)
)
const DEAL_TABLE_SYSTEM_ONLY_KEYS = new Set([
  'actions',
  'id',
  'dealId',
  'dealNumber',
  'dealDate',
  'createdDate',
  'updatedDate',
  'lastUpdated',
  'dealOwner',
  'accountOwner',
  'dealCoOwners',
  'dealStatus',
  'quotationCustomerStatus',
  'orderCustomerStatus',
  'orderCustomerStatusOld',
  'orderCustomerStatusNew',
  'convertToPo',
])
const isFilledDealTableValue = (value) => {
  const normalizedValue = String(value ?? '').trim()
  if (!normalizedValue) return false
  return !['-', '0', '0.0', '0.00', 'select reason'].includes(normalizedValue.toLowerCase())
}
const hasDealTableData = (row = {}, columns = []) => {
  const columnKeys = columns.length > 0
    ? columns.map((column) => column.key)
    : Object.keys(row)

  return columnKeys.some((key) => (
    !DEAL_TABLE_SYSTEM_ONLY_KEYS.has(key)
    && isFilledDealTableValue(row[key])
  ))
}
const normalizeOwnerValue = (value) => normalizeCrmUserName(value)
const OWNER_FILTER_FIELD_KEYS = ['dealOwner', 'dealCoOwners']
const isOwnerFilterField = (fieldKey) => OWNER_FILTER_FIELD_KEYS.includes(String(fieldKey || '').trim())
const getNormalizedOwnerTokens = (value) => (
  String(value || '')
    .split(/[,;\n/|]+/)
    .map((entry) => normalizeOwnerValue(entry))
    .filter(Boolean)
)
const getOwnerTokenSet = (value) => new Set(getNormalizedOwnerTokens(value))
const getResolvedOwnerName = (row = {}) => (
  row.dealOwner
  || row.ownerName
  || row.accountOwner
  || row.rawDeal?.dealOwner
  || row.rawDeal?.ownerName
  || row.rawDeal?.accountOwner
  || ''
)
const getResolvedCoOwnerValue = (row = {}) => (
  row.dealCoOwners
  || row.rawDeal?.dealCoOwners
  || ''
)
const matchesOwnerSelection = (row, ownerUserId, ownerName = '') => {
  if (!ownerUserId || ownerUserId === 'all') {
    return true
  }

  const rowOwnerId = String(
    row.ownerUserId
    || row.rawDeal?.ownerUserId
    || row.rawDeal?.assignedTo
    || row.rawDeal?.ownerId
    || row.rawDeal?.assignedUserId
    || ''
  )
  const normalizedOwnerName = normalizeOwnerValue(ownerName)
  const normalizedRowOwnerName = normalizeOwnerValue(getResolvedOwnerName(row))
  const coOwnerTokenSet = getOwnerTokenSet(getResolvedCoOwnerValue(row))

  return rowOwnerId === String(ownerUserId)
    || (Boolean(normalizedOwnerName) && (normalizedRowOwnerName === normalizedOwnerName || coOwnerTokenSet.has(normalizedOwnerName)))
    || (Boolean(normalizedRowOwnerName) && normalizeOwnerValue(ownerUserId) === normalizedRowOwnerName)
}
const hasAnyActiveFilters = (filters = {}) => Object.values(filters).some((value) => normalizeSearchValue(value) !== '')
const DEAL_SEARCH_PREFERENCES_KEY = 'crm_search_deal_preferences'
const CLASSIFICATION_FILTER_OWNER_NAMES = [
  'Atish Shah',
  'Hasmukh Chauhan',
  'Jagurti Parmar',
  'Jay Pandya',
  'Vaibhavi Patel',
  'Keval V Shah',
  'Krunal Patel',
  'Bhavesh Prajapati',
  'Naim Vhora',
  'Nita Bhavsar',
  'Rajeshree Parmar',
  'Samir Sheth',
  'Tajamul Rafique Solkar',
]

const loadDealSearchPreferences = () => {
  if (typeof window === 'undefined') {
    return null
  }

  try {
    const rawValue = window.localStorage.getItem(DEAL_SEARCH_PREFERENCES_KEY)
    return rawValue ? JSON.parse(rawValue) : null
  } catch {
    return null
  }
}

const saveDealSearchPreferences = (preferences) => {
  if (typeof window === 'undefined') {
    return
  }

  try {
    window.localStorage.setItem(DEAL_SEARCH_PREFERENCES_KEY, JSON.stringify(preferences))
  } catch {
    // Ignore preference persistence failures and keep the table usable.
  }
}

const orderColumnsByKeys = (columns = [], orderedKeys = []) => {
  const columnLookup = columns.reduce((lookup, column) => {
    lookup[column.key] = column
    return lookup
  }, {})

  return orderedKeys.map((key) => columnLookup[key]).filter(Boolean)
}

const normalizeVisibleColumnKeys = (columnKeys = [], availableColumns = []) => {
  const availableKeys = availableColumns.map((column) => column.key)
  const availableKeySet = new Set(availableKeys)
  const uniqueKeys = []

  columnKeys.forEach((key) => {
    if (availableKeySet.has(key) && !uniqueKeys.includes(key)) {
      uniqueKeys.push(key)
    }
  })

  const nextKeys = uniqueKeys.length > 0 ? uniqueKeys : availableKeys

  if (!availableKeySet.has('dealNumber')) {
    return nextKeys
  }

  return nextKeys.includes('dealNumber')
    ? ['dealNumber', ...nextKeys.filter((key) => key !== 'dealNumber')]
    : ['dealNumber', ...nextKeys]
}

const buildVisiblePages = (currentPage, totalPages) => {
  if (totalPages <= 5) {
    return Array.from({ length: totalPages }, (_, index) => index + 1)
  }

  if (currentPage <= 3) {
    return [1, 2, 3, 4, 5]
  }

  if (currentPage >= totalPages - 2) {
    return [totalPages - 4, totalPages - 3, totalPages - 2, totalPages - 1, totalPages]
  }

  return [currentPage - 2, currentPage - 1, currentPage, currentPage + 1, currentPage + 2]
}

const resolveDealCompanyProfile = (deal, linkedAccount) => (
  deal.companyProfile
  || linkedAccount?.company
  || linkedAccount?.name
  || linkedAccount?.customerName
  || linkedAccount?.accountCategory
  || linkedAccount?.customerType
  || deal.accountName
  || deal.companyName
  || ''
)

const renderDealBrandBadge = (deal) => {
  const badgeLabel = deal.companyProfile || deal.companyName || ''
  if (!badgeLabel) return null

  const logo = deal.companyLogo ? { src: deal.companyLogo, alt: `${badgeLabel} logo` } : getAccountCategoryLogo(badgeLabel)

  return (
    <span className="deals-company-badge">
      {logo ? <img src={logo.src} alt={logo.alt} className="deals-company-badge-logo" /> : null}
      <span>{badgeLabel}</span>
    </span>
  )
}

const formatGridDate = (value) => {
  if (!value) return ''
  const date = new Date(value)

  if (Number.isNaN(date.getTime())) {
    return String(value)
  }

  const day = String(date.getDate()).padStart(2, '0')
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const year = date.getFullYear()
  return `${day}-${month}-${year}`
}

const toDealGridValue = (value, { uppercase = false, numeric = false } = {}) => {
  if (value === null || value === undefined || value === '') {
    return ''
  }

  if (numeric) {
    const numericValue = Number(value)
    return Number.isFinite(numericValue) ? formatNumber(numericValue) : String(value)
  }

  const stringValue = String(value)
  return uppercase ? stringValue.toUpperCase() : stringValue
}

const getQuotationNumberFromRecord = (record = {}) => (
  String(
    record.quotationNumber
    || record.quoteNumber
    || record.latestQuotationNumber
    || record.latestQuoteNumber
    || record.data?.quotationNumber
    || record.data?.quoteNumber
    || ''
  ).trim()
)

const isDealNumberFallback = (value = '', deal = {}) => {
  const normalizedValue = normalizeSearchValue(value)
  return normalizedValue && normalizedValue === normalizeSearchValue(deal.dealNumber)
}

const getDealQuotationNumber = (deal = {}, quotationNumberByDealId = {}, quotationNumberByDealNumber = {}) => {
  const directCandidates = [
    deal.quotationNumber,
    deal.quoteNumber,
    deal.latestQuotationNumber,
    deal.latestQuoteNumber,
    ...(Array.isArray(deal.quotationHistory)
      ? deal.quotationHistory.map((entry) => getQuotationNumberFromRecord(entry))
      : []),
  ]

  const directQuotationNumber = directCandidates
    .map((value) => String(value || '').trim())
    .find((value) => value && !isDealNumberFallback(value, deal))

  if (directQuotationNumber) return directQuotationNumber

  const lookupQuotationNumber = (
    quotationNumberByDealId[String(deal.id || '')]
    || quotationNumberByDealNumber[String(deal.dealNumber || '')]
    || ''
  )

  return lookupQuotationNumber && !isDealNumberFallback(lookupQuotationNumber, deal)
    ? lookupQuotationNumber
    : '-'
}

const cleanDealNameCellValue = (value = '') => (
  String(value || '')
    .trim()
    .replace(/^\s*#?\d+\s*[-:|]\s*/, '')
    .replace(/\s*[-:|]\s*#?\d+\s*$/, '')
    .replace(/\b#?\d{3,}\b/g, '')
    .replace(/\s{2,}/g, ' ')
    .trim()
)

const getApiIntegerId = (value) => {
  const normalizedValue = String(value || '').trim()
  return /^\d+$/.test(normalizedValue) ? normalizedValue : ''
}

const getDealCustomerName = (deal = {}, linkedCustomer = null) => (
  cleanDealNameCellValue(deal.customerName || linkedCustomer?.customerName || '')
)

const getDealCompanyName = (deal = {}, linkedCustomer = null) => (
  cleanDealNameCellValue(deal.companyName || linkedCustomer?.companyName || '')
)

const getDealCompanyCustomerName = (deal = {}, linkedCustomer = null) => (
  [...new Set([
    getDealCompanyName(deal, linkedCustomer),
    getDealCustomerName(deal, linkedCustomer),
    cleanDealNameCellValue(deal.linkedAccountName || deal.accountName || ''),
  ].filter(Boolean))].join(' / ')
)

const getDealBranchLocation = (deal = {}, linkedCustomer = null) => normalizeDealCity(
  deal.city
  || deal.location
  || deal.branch
  || deal.branchLocation
  || deal.projectLocation
  || linkedCustomer?.city
  || linkedCustomer?.location
  || ''
)

const getDealPoConversionValue = (deal = {}) => {
  const explicitValue = deal.convertToPo ?? deal.convertPo ?? ''
  if (String(explicitValue || '').trim()) return toDealGridValue(explicitValue)
  return (deal.poValue || deal.jobNo || deal.poValueJobNo) ? 'Yes' : 'No'
}

const getDealPoValueJobNo = (deal = {}) => {
  if (deal.poValueJobNo) return toDealGridValue(deal.poValueJobNo)
  const poValue = toDealGridValue(deal.poValue, { numeric: true })
  const jobNo = toDealGridValue(deal.jobNo)
  if (poValue && jobNo) return `${poValue} / ${jobNo}`
  return poValue || jobNo
}

const normalizeLostOrderReason = (value = '') => {
  const normalizedValue = String(value || '').trim()
  const matchedOption = LOST_ORDER_REASON_OPTIONS.find((option) => (
    normalizeSearchValue(option.value) === normalizeSearchValue(normalizedValue)
    || normalizeSearchValue(option.label) === normalizeSearchValue(normalizedValue)
    || normalizeSearchValue(option.shortLabel) === normalizeSearchValue(normalizedValue)
  ))
  return matchedOption?.value || normalizedValue
}

const getLostOrderReasonLabel = (value = '') => {
  const normalized = normalizeLostOrderReason(value)
  return LOST_ORDER_REASON_LABELS[normalized] || (normalized ? String(value).trim() : 'Select Reason')
}

const buildDealViewConfig = (variantKey, customViewDefinition) => {
  const baseConfig = {
    title: 'Deals',
    subtitle: 'Manage the complete deal pipeline in one place.',
    searchPlaceholder: 'Search deals...',
    emptyMessage: 'No deals found',
    filterFn: () => true,
    sortFn: (left, right) => new Date(right.updatedAt || 0).getTime() - new Date(left.updatedAt || 0).getTime(),
  }

  const configs = {
    all: {
      ...baseConfig,
      title: 'All Deals',
      subtitle: 'Review every deal in the current pipeline with live account and owner data.',
    },
    open: {
      ...baseConfig,
      title: 'Open Deals',
      subtitle: 'Focus on deals that are still active and need follow-up.',
      filterFn: (deal) => !isClosedDealStatus(deal.status, deal.stage),
    },
    closed: {
      ...baseConfig,
      title: 'Closed Deals',
      subtitle: 'Review deals that have already been won or lost.',
      filterFn: (deal) => isClosedDealStatus(deal.status, deal.stage),
    },
    add: {
      ...baseConfig,
      title: 'Add Deal',
      subtitle: 'Create a new admin deal and return to the full deals view after saving.',
    },
    search: {
      ...baseConfig,
      title: 'Deals',
      subtitle: 'Search across deal number, account, customer, contact details, owner, type, and job details.',
    },
    view: {
      ...baseConfig,
      title: 'View Deal',
      subtitle: 'Review all admin deals in one consolidated listing.',
    },
    ownerWise: {
      ...baseConfig,
      title: 'Owner Wise Deal',
      subtitle: 'Review deals grouped and sorted by assigned owner.',
      sortFn: (left, right) =>
        (left.dealOwner || '').localeCompare(right.dealOwner || '') || (left.name || '').localeCompare(right.name || ''),
    },
    projectDetails: {
      ...baseConfig,
      title: 'Project Details',
      subtitle: 'Use this view to review project-linked deal information quickly.',
      sortFn: (left, right) =>
        (left.projectName || '').localeCompare(right.projectName || '') || (left.name || '').localeCompare(right.name || ''),
    },
    ahmadabad: {
      ...baseConfig,
      title: 'Ahmedabad Deal',
      subtitle: 'This view shows only deals tagged for Ahmedabad.',
      filterFn: (deal) => getDealBranchLocation(deal) === 'Ahmedabad',
    },
    vadodara: {
      ...baseConfig,
      title: 'Vadodara Deal',
      subtitle: 'This view shows only deals tagged for Vadodara.',
      filterFn: (deal) => getDealBranchLocation(deal) === 'Vadodara',
    },
  }

  const resolvedConfig = configs[variantKey] || baseConfig

  if (!customViewDefinition) {
    return resolvedConfig
  }

  const baseView = configs[customViewDefinition.baseViewKey] || configs.view
  return {
    ...baseView,
    title: customViewDefinition.name,
    subtitle: `Saved custom deal view based on ${ADMIN_DEAL_VIEW_MAP[customViewDefinition.baseViewKey]?.label || 'View Deal'}.`,
  }
}

const getDealBoardStatusKey = (deal) => {
  const status = normalizeSearchValue(deal.status)
  const stage = normalizeSearchValue(deal.stage)
  const quotationStatus = normalizeSearchValue(deal.quotationCustomerStatus)
  const orderStatus = normalizeSearchValue(deal.orderCustomerStatus)

  if (status === 'won' || status.includes('closed-won') || status.includes('closed won')) {
    return 'closedWon'
  }

  if (status === 'lost' || status.includes('closed-lost') || status.includes('closed lost')) {
    return 'closedLost'
  }

  if (stage.includes('revision') || quotationStatus.includes('revision') || orderStatus.includes('revision')) {
    return 'quotationRevision'
  }

  if (
    stage.includes('quotation sent')
    || quotationStatus.includes('sent')
    || status === 'proposal'
    || status === 'negotiation'
    || status === 'qualified'
    || status === 'contacted'
  ) {
    return 'quotationSent'
  }

  return 'new'
}

const isConvertedDealRecord = (deal = {}) => Boolean(
  deal?.isConvertedDeal
  || deal?.recordType === 'convertedDeal'
  || deal?.sourceType === 'convertedDeal'
)

const Deals = ({ isAdmin = false, variantKey = 'default', customViewDefinition = null }) => {
  const location = useLocation()
  const navigate = useNavigate()
  const { accounts, deals, quotations, createDeal, updateDeal, deleteDeal, createConvertedDeal, addNotification, refreshData } = useData()
  const { user } = useAuth()
  const { isOpen, data, open, close } = useModal()
  const [hasAutoOpened, setHasAutoOpened] = useState(false)
  const [formData, setFormData] = useState(() => buildInitialFormData({ ownerUserId: String(user?.id || '') }))
  const [dealFormStep, setDealFormStep] = useState(0)
  const [formErrors, setFormErrors] = useState({})
  const [gridFilters, setGridFilters] = useState(buildInitialGridFilters)
  const [ownerScopedFilters, setOwnerScopedFilters] = useState(buildInitialOwnerScopedFilters)
  const [showGridFilters] = useState(true)
  const [compactGrid, setCompactGrid] = useState(true)
  const [currentPage, setCurrentPage] = useState(1)
  const [ownerScopedPage, setOwnerScopedPage] = useState(1)
  const [boardVisibleCounts, setBoardVisibleCounts] = useState(buildInitialBoardVisibleCounts)
  const [openBoardActionMenuDealId, setOpenBoardActionMenuDealId] = useState('')
  const [expandedBoardCardId, setExpandedBoardCardId] = useState('')
  const [dealTableMenuPosition, setDealTableMenuPosition] = useState(null)
  const [boardActionModal, setBoardActionModal] = useState({ type: '', deal: null })
  const [changeTypeValue, setChangeTypeValue] = useState('')
  const [reminderForm, setReminderForm] = useState({ reminderDate: '', reminderTime: '09:00', reminderMode: '', reminderNote: '' })
  const [reassignOwnerId, setReassignOwnerId] = useState('')
  const [reassignReminderAction, setReassignReminderAction] = useState('retain')
  const [reassignAddReminder, setReassignAddReminder] = useState(false)
  const [boardDragDealId, setBoardDragDealId] = useState('')
  const [boardDragOverColumnKey, setBoardDragOverColumnKey] = useState('')
  const [isBoardClassificationOpen, setIsBoardClassificationOpen] = useState(false)
  const [pendingBoardStatuses, setPendingBoardStatuses] = useState(() => DEAL_BOARD_COLUMNS.map((column) => column.key))
  const [appliedBoardStatuses, setAppliedBoardStatuses] = useState(() => DEAL_BOARD_COLUMNS.map((column) => column.key))
  const [isBoardOwnershipOpen, setIsBoardOwnershipOpen] = useState(false)
  const [boardOwnership, setBoardOwnership] = useState('overall')
  const [dealStatusTableFilter, setDealStatusTableFilter] = useState('all')

  const viewConfig = useMemo(
    () => buildDealViewConfig(customViewDefinition ? customViewDefinition.baseViewKey : variantKey, customViewDefinition),
    [customViewDefinition, variantKey]
  )
  const effectiveVariantKey = customViewDefinition ? customViewDefinition.baseViewKey : variantKey
  const customViewColumns = useMemo(
    () => customViewDefinition?.viewType === 'tabular'
      ? buildDealCustomViewColumns(customViewDefinition.visibleFields)
      : [],
    [customViewDefinition]
  )
  const isBoardView = effectiveVariantKey === 'view' && customViewDefinition?.viewType === 'board'
  const isSearchAdminView = effectiveVariantKey === 'search' && !customViewDefinition
  const isViewAdminView = effectiveVariantKey === 'view' && !customViewDefinition
  const isOwnerScopedAdminView = isAdmin && (
    effectiveVariantKey === 'ownerWise'
    || effectiveVariantKey === 'projectDetails'
    || effectiveVariantKey === 'ahmadabad'
    || effectiveVariantKey === 'vadodara'
  )
  const baseGridColumns = useMemo(
    () => (customViewColumns.length > 0 ? customViewColumns : isViewAdminView ? VIEW_DEAL_GRID_COLUMNS : DEAL_SEARCH_FIELD_CATALOG),
    [customViewColumns, isViewAdminView]
  )
  const [visibleGridColumnKeys, setVisibleGridColumnKeys] = useState(() => {
    const savedPreferences = loadDealSearchPreferences()
    const defaultKeys = Array.from(
      new Set(
        [
          ...DEAL_GRID_COLUMNS,
          ...OWNER_WISE_COLUMNS,
          ...PROJECT_DETAILS_COLUMNS,
          ...AHMADABAD_COLUMNS,
          ...VADODARA_COLUMNS,
        ].map((column) => column.key)
      )
    )
    const savedKeys = Array.isArray(savedPreferences?.visibleGridColumnKeys)
      ? savedPreferences.visibleGridColumnKeys.filter((key) => defaultKeys.includes(key))
      : []

    const nextKeys = savedKeys.length > 0 ? savedKeys : defaultKeys
    return normalizeVisibleColumnKeys(nextKeys, [
      ...DEAL_SEARCH_FIELD_CATALOG,
      ...OWNER_WISE_COLUMNS,
      ...PROJECT_DETAILS_COLUMNS,
      ...AHMADABAD_COLUMNS,
      ...VADODARA_COLUMNS,
    ])
  })
  const [isFieldSelectorOpen, setIsFieldSelectorOpen] = useState(false)
  const [pendingVisibleGridColumnKeys, setPendingVisibleGridColumnKeys] = useState(() => DEAL_GRID_COLUMNS.map((column) => column.key))
  const [appliedClassificationOwners, setAppliedClassificationOwners] = useState(() => {
    const savedPreferences = loadDealSearchPreferences()
    return Array.isArray(savedPreferences?.classificationOwners) ? savedPreferences.classificationOwners : []
  })
  const [pendingClassificationOwners, setPendingClassificationOwners] = useState(() => {
    const savedPreferences = loadDealSearchPreferences()
    return Array.isArray(savedPreferences?.classificationOwners) ? savedPreferences.classificationOwners : []
  })
  const [draggedSelectedFieldKey, setDraggedSelectedFieldKey] = useState('')
  const [isFilterDialogOpen, setIsFilterDialogOpen] = useState(false)
  const [gridFilterRules, setGridFilterRules] = useState([])
  const [pendingFilterRows, setPendingFilterRows] = useState(() => buildFilterRowsFromFilters())
  const [appliedOwnerWiseOwnerId, setAppliedOwnerWiseOwnerId] = useState(() => {
    const savedPreferences = loadDealSearchPreferences()
    return savedPreferences?.ownerWiseOwnerId ? String(savedPreferences.ownerWiseOwnerId) : 'all'
  })
  const [pendingOwnerWiseOwnerId, setPendingOwnerWiseOwnerId] = useState(() => {
    const savedPreferences = loadDealSearchPreferences()
    return savedPreferences?.ownerWiseOwnerId ? String(savedPreferences.ownerWiseOwnerId) : 'all'
  })
  const [selectedDealFilterActionKeys, setSelectedDealFilterActionKeys] = useState(() => {
    const savedPreferences = loadDealSearchPreferences()
    const allowedKeys = new Set(DEAL_FILTER_ACTION_OPTIONS.map((entry) => entry.key))
    const savedKeys = Array.isArray(savedPreferences?.filterActionKeys)
      ? savedPreferences.filterActionKeys.filter((key) => allowedKeys.has(key))
      : []

    return savedKeys.length > 0 ? savedKeys : DEFAULT_DEAL_FILTER_ACTION_KEYS
  })
  const [pendingDealFilterActionKeys, setPendingDealFilterActionKeys] = useState(() => DEFAULT_DEAL_FILTER_ACTION_KEYS)
  const [pendingOrderByKey, setPendingOrderByKey] = useState(() => {
    const savedPreferences = loadDealSearchPreferences()
    return DEAL_SEARCH_FIELD_CATALOG.some((column) => column.key === savedPreferences?.sortKey)
      ? savedPreferences.sortKey
      : ''
  })
  const [gridSortConfig, setGridSortConfig] = useState(DEFAULT_GRID_SORT_CONFIG)
  const [dashboardDealDrilldown, setDashboardDealDrilldown] = useState(null)

  const availableUsers = useMemo(
    () => authService.getAvailableUsers().filter((entry) => entry.name !== 'System Administrator'),
    []
  )
  const ownerFilterOptions = useMemo(
    () => [
      { value: 'all', label: 'All Owners' },
      ...availableUsers.map((entry) => ({ value: String(entry.id), label: entry.ownerDisplayName || entry.name })),
    ],
    [availableUsers]
  )
  const ownerWiseDialogOptions = useMemo(
    () => [
      { value: '', label: 'Select Owner' },
      ...ownerFilterOptions,
    ],
    [ownerFilterOptions]
  )
  const ownerRuleOptions = useMemo(
    () => [
      { value: '', label: 'Select Owner' },
      ...availableUsers.map((entry) => ({ value: entry.ownerDisplayName || entry.name, label: entry.ownerDisplayName || entry.name })),
    ],
    [availableUsers]
  )
  const classificationOwnerNames = useMemo(() => {
    const dynamicOwners = Array.from(
      new Set(
        availableUsers
          .map((entry) => String(entry.ownerDisplayName || entry.name || '').trim())
          .filter(Boolean)
      )
    )

    return dynamicOwners.length > 0 ? dynamicOwners : CLASSIFICATION_FILTER_OWNER_NAMES
  }, [availableUsers])
  const customerDirectory = useMemo(() => (
    customerService.getCustomers().reduce((lookup, customer) => {
      lookup[customer.id] = customer
      return lookup
    }, {})
  ), [])
  const accountDirectory = useMemo(() => (
    (accounts || []).reduce((lookup, account) => {
      if (account?.id) {
        lookup[String(account.id)] = account
      }
      return lookup
    }, {})
  ), [accounts])

  const accountNameDirectory = useMemo(() => (
    (accounts || []).reduce((lookup, account) => {
      const normalizedName = normalizeSearchValue(account?.name || account?.customerName || '')
      if (normalizedName && !lookup[normalizedName]) {
        lookup[normalizedName] = account
      }
      return lookup
    }, {})
  ), [accounts])

  const userDirectory = useMemo(() => (
    availableUsers.reduce((lookup, entry) => {
      lookup[entry.id] = entry.name
      return lookup
    }, {})
  ), [availableUsers])
  const ownerNameById = useMemo(() => (
    availableUsers.reduce((lookup, entry) => {
      lookup[String(entry.id)] = entry.ownerDisplayName || entry.name
      return lookup
    }, {})
  ), [availableUsers])
  const quotationNumberByDealId = useMemo(() => (
    (quotations || []).reduce((lookup, quotation) => {
      const quotationNumber = getQuotationNumberFromRecord(quotation)
      if (!quotationNumber) return lookup

      const linkedDealIds = [
        quotation.dealId,
        quotation.selectedDealId,
        quotation.linkedDealId,
        quotation.sourceDealId,
        quotation.data?.dealId,
        quotation.data?.selectedDealId,
        quotation.data?.linkedDealId,
      ]

      linkedDealIds.forEach((dealId) => {
        const key = String(dealId || '').trim()
        if (key && !lookup[key]) {
          lookup[key] = quotationNumber
        }
      })

      return lookup
    }, {})
  ), [quotations])
  const quotationNumberByDealNumber = useMemo(() => (
    (quotations || []).reduce((lookup, quotation) => {
      const quotationNumber = getQuotationNumberFromRecord(quotation)
      if (!quotationNumber) return lookup

      const linkedDealNumbers = [
        quotation.dealNumber,
        quotation.selectedDealNumber,
        quotation.linkedDealNumber,
        quotation.data?.dealNumber,
        quotation.data?.selectedDealNumber,
        quotation.data?.linkedDealNumber,
      ]

      linkedDealNumbers.forEach((dealNumber) => {
        const key = String(dealNumber || '').trim()
        if (key && !lookup[key]) {
          lookup[key] = quotationNumber
        }
      })

      return lookup
    }, {})
  ), [quotations])
  const classificationOwnerIdLookup = useMemo(
    () => availableUsers.reduce((lookup, entry) => {
      const normalizedName = normalizeOwnerValue(entry.ownerDisplayName || entry.name)
      if (!lookup[normalizedName]) {
        lookup[normalizedName] = []
      }
      lookup[normalizedName].push(String(entry.id))
      return lookup
    }, {}),
    [availableUsers]
  )

  const scopedDeals = useMemo(() => {
    const sourceDeals = deals || []

    const normalizedDeals = sourceDeals
      .map((deal) => {
        const linkedAccount = accountDirectory[String(deal.accountId || '')]
          || accountNameDirectory[normalizeSearchValue(deal.accountName || deal.customerName || '')]
          || null
        const linkedCustomer = customerDirectory[deal.customerId] || null
        const resolvedCompanyProfile = resolveDealCompanyProfile(deal, linkedAccount)
        const resolvedOwnerUserId = String(
          deal.ownerUserId
          || deal.ownerId
          || deal.assignedTo
          || deal.assignedUserId
          || deal.userId
          || ''
        )
        const resolvedOwnerName = deal.dealOwner
          || deal.ownerName
          || userDirectory[resolvedOwnerUserId]
          || userDirectory[deal.userId]
          || 'Unassigned'

        return {
          ...deal,
          projectName: deal.projectName || linkedAccount?.projectName || '',
          accountOwner: deal.accountOwnerDisplay || deal.accountOwner || linkedAccount?.accountOwnerDisplay || linkedAccount?.accountOwnerName || linkedAccount?.accountOwner || deal.customerOwnerDisplay || deal.customerOwner || '',
          city: normalizeDealCity(deal.city || deal.location || deal.branch || deal.branchLocation || deal.projectLocation || linkedAccount?.raw?.city || linkedAccount?.location || linkedCustomer?.city || linkedCustomer?.location || ''),
          ownerUserId: resolvedOwnerUserId,
          ownerId: resolvedOwnerUserId,
          assignedTo: String(deal.assignedTo || deal.assignedUserId || resolvedOwnerUserId || ''),
          assignedUserId: String(deal.assignedUserId || deal.assignedTo || resolvedOwnerUserId || ''),
          ownerName: deal.ownerName || resolvedOwnerName,
          dealOwner: resolvedOwnerName,
          dealNumber: deal.dealNumber || '',
          dealDate: deal.dealDate || deal.createdAt || '',
          dealType: deal.dealType || deal.customerCategory || linkedAccount?.accountCategory || deal.stage || '',
          quotationCustomerStatus: deal.quotationCustomerStatus || '',
          orderCustomerStatus: deal.orderCustomerStatus || '',
          poValue: deal.poValue || '',
          jobNo: deal.jobNo || linkedAccount?.jobNo || '',
          consultantName: deal.consultantName || linkedAccount?.consultantName || '',
          reasonForLost: deal.reasonForLost || '',
          reminderDate: deal.reminderDate || '',
          reminderTime: deal.reminderTime || '09:00',
          reminderMode: deal.reminderMode || '',
          reminderNote: deal.reminderNote || '',
          customerName: getDealCustomerName(deal, linkedCustomer),
          accountName: deal.linkedAccountName || deal.accountName || linkedAccount?.name || deal.customerName || '',
          accountNumber: deal.linkedAccountNumber || deal.accountNumber || linkedAccount?.accountNumber || '',
          companyName: getDealCompanyName(deal, linkedCustomer) || cleanDealNameCellValue(linkedAccount?.company || linkedAccount?.raw?.companyName || ''),
          companyProfile: resolvedCompanyProfile,
          companyLogo: deal.companyLogo || linkedAccount?.companyLogo || linkedAccount?.raw?.companyLogo || '',
          contactPerson: deal.contactPerson || linkedAccount?.contactPerson || '',
          contactPhone: deal.contactPhone || linkedAccount?.contactPhone || '',
          contactMobile: deal.contactMobile || linkedAccount?.contactMobile || linkedAccount?.phone || '',
          contactEmail: deal.contactEmail || linkedAccount?.contactEmail || linkedAccount?.email || '',
          address: deal.address || linkedAccount?.address || customerDirectory[deal.customerId]?.address || '',
        }
      })

    const variantDeals = normalizedDeals.filter(viewConfig.filterFn)
    const customViewDeals = customViewDefinition
      ? getCustomViewDeals(variantDeals, customViewDefinition)
      : variantDeals

    return customViewDeals.sort(viewConfig.sortFn)
  }, [accountDirectory, accountNameDirectory, customViewDefinition, customerDirectory, deals, userDirectory, viewConfig.filterFn, viewConfig.sortFn])
  const roleSelectionOptions = useMemo(() => {
    const availableUserByOwnerName = availableUsers.reduce((lookup, entry) => {
      const normalizedName = normalizeOwnerValue(entry.ownerDisplayName || entry.name)
      if (normalizedName && !lookup[normalizedName]) {
        lookup[normalizedName] = entry
      }
      return lookup
    }, {})
    const normalizedOptionLabels = new Set(
      ownerFilterOptions.map((option) => normalizeOwnerValue(option.label))
    )
    const rowOwnerOptions = scopedDeals
      .map((deal) => getResolvedOwnerName(deal))
      .map((ownerName) => getCrmOwnerDisplay(ownerName) || ownerName)
      .map((ownerName) => String(ownerName || '').trim())
      .filter((ownerName) => ownerName && ownerName !== 'Unassigned' && ownerName !== '-')
      .reduce((options, ownerName) => {
        const normalizedOwnerName = normalizeOwnerValue(ownerName)
        if (!normalizedOwnerName || normalizedOptionLabels.has(normalizedOwnerName)) {
          return options
        }
        normalizedOptionLabels.add(normalizedOwnerName)
        const matchedUser = availableUserByOwnerName[normalizedOwnerName]
        options.push({
          value: matchedUser?.id ? String(matchedUser.id) : ownerName,
          label: matchedUser?.ownerDisplayName || ownerName,
        })
        return options
      }, [])
      .sort((left, right) => left.label.localeCompare(right.label, undefined, { sensitivity: 'base' }))

    return [
      ...ownerFilterOptions,
      ...rowOwnerOptions,
    ]
  }, [availableUsers, ownerFilterOptions, scopedDeals])
  const drilldownScopedDeals = useMemo(() => {
    const dealIds = Array.isArray(dashboardDealDrilldown?.dealIds)
      ? dashboardDealDrilldown.dealIds.map((dealId) => String(dealId))
      : []

    if (dealIds.length === 0) {
      return scopedDeals
    }

    const idSet = new Set(dealIds)
    return scopedDeals.filter((deal) => idSet.has(String(deal.id)))
  }, [dashboardDealDrilldown, scopedDeals])

  const searchKeys = [
    'id',
    'name',
    'dealNumber',
    'dealOwner',
    'dealType',
    'jobNo',
    'projectName',
    'city',
    'customerName',
    'customerNumber',
    'accountName',
    'accountNumber',
    'companyName',
    'companyProfile',
    'contactPerson',
    'contactPhone',
    'contactMobile',
    'contactEmail',
  ]

  const { searchTerm, setSearchTerm, filteredItems: searchedDeals } = useSearch(drilldownScopedDeals, searchKeys)

  useEffect(() => {
    const dealLookup = location.state?.quotationDealLookup
    if (!dealLookup) return

    const nextSearchTerm = (
      dealLookup.dealNumber
      || dealLookup.projectName
      || dealLookup.companyName
      || ''
    ).trim()

    if (nextSearchTerm) {
      setSearchTerm(nextSearchTerm)
    }

    navigate(location.pathname, { replace: true, state: {} })
  }, [location.pathname, location.state, navigate, setSearchTerm])

  useEffect(() => {
    const dashboardFilter = location.state?.dashboardDealDrilldown
    if (!dashboardFilter) return

    setDashboardDealDrilldown(dashboardFilter)
    setCurrentPage(1)
    setOwnerScopedPage(1)

    addNotification(
      'info',
      'Dashboard drilldown applied',
      `${dashboardFilter.monthLabel || 'Selected month'} ${dashboardFilter.statusType === 'won' ? 'won' : dashboardFilter.statusType === 'lost' ? 'lost' : 'closed'} deals opened from ${dashboardFilter.sourceTabName || 'dashboard'}.`
    )

    navigate(`${location.pathname}${location.search || ''}`, { replace: true, state: {} })
  }, [addNotification, location.pathname, location.search, location.state, navigate])

  const { filters, filteredItems, setFilter } = useFilter(searchedDeals, {
    status: 'all',
    ownerUserId: 'all',
  })
  const appliedClassificationOwnerNameSet = useMemo(
    () => new Set(appliedClassificationOwners.map((ownerName) => normalizeSearchValue(ownerName))),
    [appliedClassificationOwners]
  )
  const appliedClassificationOwnerIds = useMemo(
    () => Array.from(
      new Set(
        appliedClassificationOwners.flatMap(
          (ownerName) => classificationOwnerIdLookup[normalizeOwnerValue(ownerName)] || []
        )
      )
    ),
    [appliedClassificationOwners, classificationOwnerIdLookup]
  )
  const classificationFilteredDeals = useMemo(() => {
    if (appliedClassificationOwners.length === 0) {
      return filteredItems
    }

    const ownerIdSet = new Set(appliedClassificationOwnerIds.map((ownerId) => String(ownerId)))

    return filteredItems.filter((deal) => {
      const ownerId = String(deal.ownerUserId || deal.assignedTo || deal.ownerId || '')
      const ownerLabel = normalizeSearchValue(
        deal.dealOwner
        || deal.ownerName
        || userDirectory[ownerId]
        || ''
      )

      return ownerIdSet.has(ownerId) || appliedClassificationOwnerNameSet.has(ownerLabel)
    })
  }, [appliedClassificationOwnerIds, appliedClassificationOwnerNameSet, appliedClassificationOwners.length, filteredItems, userDirectory])

  const displayedDeals = useMemo(
    () => [...classificationFilteredDeals].sort(viewConfig.sortFn),
    [classificationFilteredDeals, viewConfig.sortFn]
  )

  const adminGridRows = useMemo(() => (
    displayedDeals.map((deal) => {
      const linkedCustomer = customerDirectory[deal.customerId] || null

      return {
        id: deal.id,
        rawDeal: deal,
        dealId: deal.id || '',
        dealNumber: deal.dealNumber || '',
        quotationNumber: getDealQuotationNumber(deal, quotationNumberByDealId, quotationNumberByDealNumber),
        location: deal.city || deal.location || linkedCustomer?.city || linkedCustomer?.location || '',
        customerNumber: deal.customerNumber || linkedCustomer?.customerNumber || '',
        accountName: deal.linkedAccountName || deal.accountName || '',
        accountNumber: deal.accountNumber || '',
        dealName: deal.name || '',
        dealDate: formatGridDate(deal.quotationDate || deal.dealDate || deal.createdAt || ''),
        createdDate: formatGridDate(deal.createdAt || ''),
        dealOwner: deal.dealOwnerDisplay || getCrmOwnerDisplay(deal.dealOwner || deal.ownerName || '') || deal.dealOwner || deal.ownerName || '',
        dealType: toDealGridValue(deal.dealType || deal.customerCategory || deal.stage || '', { uppercase: true }),
        dealStatus: capitalize(String(deal.status || '').replace(/_/g, ' ')),
        dealValue: toDealGridValue(deal.value ?? deal.dealValue ?? deal.amount, { numeric: true }),
        actualClosureDate: formatGridDate(deal.actualClosureDate || ''),
        expectedClosureDate: formatGridDate(deal.expectedClosureDate || deal.closeDate || ''),
        probability: toDealGridValue(deal.probability, { numeric: true }),
        dealScore: toDealGridValue(deal.dealScore, { numeric: true }),
        description: deal.description || '',
        productCategory: deal.productCategory || deal.customerCategory || '',
        projectName: deal.projectName || '',
        consultantName: deal.consultantName || '',
        quotationCustomerStatus: toDealGridValue(deal.quotationCustomerStatus, { uppercase: true }),
        orderCustomerStatus: toDealGridValue(deal.orderCustomerStatus, { uppercase: true }),
        orderCustomerStatusOld: toDealGridValue(deal.orderCustomerStatusOld || deal.oldStatus, { uppercase: true }),
        orderCustomerStatusNew: toDealGridValue(deal.orderCustomerStatusNew || deal.newStatus, { uppercase: true }),
        convertToPo: getDealPoConversionValue(deal),
        poValueJobNo: getDealPoValueJobNo(deal),
        reasonForLostOrder: normalizeLostOrderReason(deal.reasonForLostOrder || deal.reasonForLost),
        poValue: toDealGridValue(deal.poValue ?? deal.po_value, { numeric: true }),
        jobNo: toDealGridValue(deal.jobNo),
        dealCoOwners: deal.dealCoOwners || '',
        reasonForLost: deal.reasonForLost || '',
        companyCustomerName: getDealCompanyCustomerName(deal, linkedCustomer),
        companyName: getDealCompanyName(deal, linkedCustomer),
        customerName: getDealCustomerName(deal, linkedCustomer),
        companyProfile: deal.companyProfile || '',
        companyLogo: deal.companyLogo || '',
        contactPerson: deal.contactPerson || '',
        contactName: deal.contactName || deal.contactPerson || '',
        contactPhone: deal.contactPhone || '',
        phone: deal.phone || deal.contactPhone || deal.contactMobile || '',
        contactMobile: deal.contactMobile || '',
        contactEmail: deal.contactEmail || '',
        email: deal.email || deal.contactEmail || '',
        gstin: deal.gstin || '',
        latestRemark: deal.remark || deal.description || linkedCustomer?.remark || '',
        address: deal.address || linkedCustomer?.address || '',
        updatedDate: formatGridDate(deal.updatedAt || deal.lastUpdated || deal.createdAt || ''),
      }
    })
  ), [customerDirectory, displayedDeals, quotationNumberByDealId, quotationNumberByDealNumber])
  const adminGridRowById = useMemo(
    () => adminGridRows.reduce((lookup, row) => {
      lookup[row.id] = row
      return lookup
    }, {}),
    [adminGridRows]
  )

  useEffect(() => {
    const availableColumns = isOwnerScopedAdminView
      ? (
        customViewColumns.length > 0
          ? customViewColumns
          : effectiveVariantKey === 'projectDetails'
            ? PROJECT_DETAILS_COLUMNS
            : effectiveVariantKey === 'ahmadabad'
              ? AHMADABAD_COLUMNS
              : effectiveVariantKey === 'vadodara'
                ? VADODARA_COLUMNS
                : OWNER_WISE_COLUMNS
      )
      : baseGridColumns
    const availableKeys = availableColumns.map((column) => column.key)

    setVisibleGridColumnKeys((currentValue) => {
      const filteredKeys = currentValue.filter((key) => availableKeys.includes(key))
      const nextKeys = filteredKeys.length > 0 ? filteredKeys : availableKeys
      return normalizeVisibleColumnKeys(nextKeys, availableColumns)
    })
  }, [baseGridColumns, customViewColumns, effectiveVariantKey, isOwnerScopedAdminView])

  useEffect(() => {
    if (!isSearchAdminView) {
      return
    }

    saveDealSearchPreferences({
      visibleGridColumnKeys,
      filterActionKeys: selectedDealFilterActionKeys,
      sortKey: gridSortConfig.key,
      sortDirection: gridSortConfig.direction,
      ownerWiseOwnerId: appliedOwnerWiseOwnerId,
      classificationOwners: appliedClassificationOwners,
    })
  }, [
    appliedClassificationOwners,
    appliedOwnerWiseOwnerId,
    gridSortConfig.direction,
    gridSortConfig.key,
    isSearchAdminView,
    selectedDealFilterActionKeys,
    visibleGridColumnKeys,
  ])

  const activeGridColumns = useMemo(() => {
    if (!isSearchAdminView) {
      return baseGridColumns
    }

    return DEAL_GRID_COLUMNS
  }, [baseGridColumns, isSearchAdminView])
  const filteredGridRows = useMemo(() => (
    adminGridRows.filter((row) => {
      const selectedOwnerName = ownerNameById[String(appliedOwnerWiseOwnerId)] || ''

      return (
        matchesOwnerSelection(row, appliedOwnerWiseOwnerId, selectedOwnerName)
        && (dealStatusTableFilter === 'all' || getDealBoardStatusKey(row.rawDeal || row) === dealStatusTableFilter)
        && Object.entries(gridFilters).every(([columnKey, rawFilterValue]) => {
          const filterValue = normalizeSearchValue(rawFilterValue)
          if (!filterValue) return true

          return matchesDealGridFilterText(row, columnKey, filterValue)
        })
        && gridFilterRules.every((rule) => matchGridFilterRule(row, rule))
      )
    })
  ), [adminGridRows, appliedOwnerWiseOwnerId, dealStatusTableFilter, gridFilterRules, gridFilters, ownerNameById])
  const displayGridRows = useMemo(
    () => filteredGridRows.filter((row) => hasDealTableData(row, activeGridColumns)),
    [activeGridColumns, filteredGridRows]
  )

  const getGridSortValue = (row, columnKey) => {
    const rawDeal = row.rawDeal || {}

    if (columnKey === 'dealDate') {
      return new Date(rawDeal.quotationDate || rawDeal.dealDate || rawDeal.createdAt || 0).getTime()
    }

    if (columnKey === 'createdDate') {
      return new Date(rawDeal.createdAt || 0).getTime()
    }

    if (columnKey === 'actualClosureDate') {
      return new Date(rawDeal.actualClosureDate || 0).getTime()
    }

    if (columnKey === 'expectedClosureDate') {
      return new Date(rawDeal.expectedClosureDate || rawDeal.closeDate || 0).getTime()
    }

    if (columnKey === 'dealValue') {
      return Number(rawDeal.value || 0)
    }

    if (columnKey === 'poValue') {
      return Number(rawDeal.poValue || 0)
    }

    if (columnKey === 'probability') {
      return Number(rawDeal.probability || 0)
    }

    if (columnKey === 'dealScore') {
      return Number(rawDeal.dealScore || 0)
    }

    return normalizeSearchValue(row[columnKey])
  }

  const sortedGridRows = useMemo(() => {
    const activeSortKey = activeGridColumns.some((column) => column.key === gridSortConfig.key)
      ? gridSortConfig.key
      : activeGridColumns[0]?.key

    if (!activeSortKey) {
      return displayGridRows
    }

    const sortDirectionMultiplier = gridSortConfig.direction === 'asc' ? 1 : -1

    return [...displayGridRows].sort((left, right) => {
      const leftValue = getGridSortValue(left, activeSortKey)
      const rightValue = getGridSortValue(right, activeSortKey)

      if (typeof leftValue === 'number' && typeof rightValue === 'number') {
        return (leftValue - rightValue) * sortDirectionMultiplier
      }

      return String(leftValue).localeCompare(String(rightValue), undefined, { numeric: true, sensitivity: 'base' }) * sortDirectionMultiplier
    })
  }, [activeGridColumns, displayGridRows, gridSortConfig.direction, gridSortConfig.key])

  const getDealUpdatesForBoardColumn = (columnKey) => {
    switch (columnKey) {
      case 'closedWon': return { status: 'won', stage: 'closed-won' }
      case 'closedLost': return { status: 'lost', stage: 'closed-lost' }
      case 'quotationSent': return { status: 'proposal', stage: 'quotation sent', quotationCustomerStatus: 'sent' }
      case 'quotationRevision': return { status: 'proposal', stage: 'revision', quotationCustomerStatus: 'revision' }
      case 'new':
      default: return { status: 'new', stage: '', quotationCustomerStatus: '' }
    }
  }

  const handleBoardCardDragStart = (event, dealId) => {
    setBoardDragDealId(String(dealId))
    setOpenBoardActionMenuDealId('')
    try {
      event.dataTransfer.effectAllowed = 'move'
      event.dataTransfer.setData('text/plain', String(dealId))
    } catch { /* some browsers throw on setData in non-dragstart contexts */ }
  }

  const handleBoardCardDragEnd = () => {
    setBoardDragDealId('')
    setBoardDragOverColumnKey('')
  }

  const handleBoardColumnDragOver = (event, columnKey) => {
    if (!boardDragDealId) return
    event.preventDefault()
    try { event.dataTransfer.dropEffect = 'move' } catch { /* ignore */ }
    if (boardDragOverColumnKey !== columnKey) {
      setBoardDragOverColumnKey(columnKey)
    }
  }

  const handleBoardColumnDragLeave = (columnKey) => {
    setBoardDragOverColumnKey((current) => current === columnKey ? '' : current)
  }

  const handleBoardColumnDrop = async (event, columnKey) => {
    event.preventDefault()
    const draggedId = boardDragDealId || event.dataTransfer.getData('text/plain')
    setBoardDragDealId('')
    setBoardDragOverColumnKey('')
    if (!draggedId) return

    const draggedDeal = scopedDeals.find((entry) => String(entry.id) === String(draggedId))
    if (!draggedDeal) return
    if (getDealBoardStatusKey(draggedDeal) === columnKey) return

    const updates = getDealUpdatesForBoardColumn(columnKey)
    try {
      const result = await updateDeal(draggedDeal.id, updates)
      if (result && result.success === false) {
        addNotification('error', 'Move Deal', result.message || 'Unable to move this deal right now')
        return
      }
      addNotification('success', 'Deal Moved', `Moved to ${DEAL_BOARD_COLUMNS.find((column) => column.key === columnKey)?.label || columnKey}`)
    } catch (error) {
      addNotification('error', 'Move Deal', error?.message || 'Unable to move this deal right now')
    }
  }

  const handleBoardActionMenuItem = (action, deal) => {
    setOpenBoardActionMenuDealId('')
    switch (action) {
      case 'view': handleViewDeal(deal); return
      case 'manage': handleManageDeal(deal); return
      case 'linkedAccount': handleOpenLinkedAccountFromMenu(deal); return
      case 'generateQuotation': handleGenerateQuotationForDeal(deal); return
      case 'uploadQuotation':
        handleOpenDealActionPage('upload-deal-quotation', deal)
        return
      case 'reassign':
        handleOpenDealActionPage('re-assign-deal', deal)
        return
      case 'reminder':
      case 'delete':
        handleOpenBoardActionModal(action, deal); return
      case 'sendMail': {
        handleOpenDealActionPage('send-mail', deal)
        return
      }
      default:
        addNotification('info', 'Deal Action', `${action} is not available for this deal view.`)
    }
  }

  const boardColumns = useMemo(() => {
    const groupedDeals = DEAL_BOARD_COLUMNS.reduce((lookup, column) => {
      lookup[column.key] = []
      return lookup
    }, {})

    const currentUserId = String(user?.id || '')
    const currentUserName = normalizeSearchValue(user?.name || '')
    const ownershipFilteredDeals = displayedDeals.filter((deal) => {
      if (boardOwnership === 'overall') return true
      const dealOwnerId = String(deal.userId || deal.ownerUserId || deal.ownerId || deal.assignedTo || deal.assignedUserId || '')
      const dealOwnerName = normalizeOwnerValue(deal.dealOwner || deal.ownerName || '')
      const coOwnerTokens = getOwnerTokenSet(getResolvedCoOwnerValue(deal))
      const isOwnedByMe = currentUserId && dealOwnerId === currentUserId
        || (currentUserName && dealOwnerName === currentUserName)
      const isCoOwnedByMe = currentUserName && coOwnerTokens.has(currentUserName)
      if (boardOwnership === 'me') return Boolean(isOwnedByMe)
      if (boardOwnership === 'coOwned') return Boolean(isCoOwnedByMe)
      return true
    })

    ownershipFilteredDeals.forEach((deal) => {
      groupedDeals[getDealBoardStatusKey(deal)].push(deal)
    })

    const visibleStatusSet = new Set(appliedBoardStatuses)
    return DEAL_BOARD_COLUMNS
      .filter((column) => visibleStatusSet.has(column.key))
      .map((column) => ({
        ...column,
        deals: groupedDeals[column.key] || [],
      }))
  }, [appliedBoardStatuses, boardOwnership, displayedDeals, user?.id, user?.name])

  const ownerWiseAllRows = useMemo(() => (
    displayedDeals.map((deal) => {
      const linkedCustomer = customerDirectory[deal.customerId] || null

      return {
        id: deal.id,
        rawDeal: deal,
        ownerKey: deal.dealOwnerDisplay || getCrmOwnerDisplay(deal.dealOwner || deal.ownerName || '') || deal.dealOwner || deal.ownerName || '',
        dealId: deal.id || '',
        dealNumber: deal.dealNumber || '',
        quotationNumber: getDealQuotationNumber(deal, quotationNumberByDealId, quotationNumberByDealNumber),
        location: getDealBranchLocation(deal, linkedCustomer),
        customerName: getDealCustomerName(deal, linkedCustomer),
        customerNumber: deal.customerNumber || linkedCustomer?.customerNumber || '',
        companyName: getDealCompanyName(deal, linkedCustomer),
        companyCustomerName: getDealCompanyCustomerName(deal, linkedCustomer),
        companyProfile: deal.companyProfile || '',
        dealDate: formatGridDate(deal.quotationDate || deal.dealDate || deal.createdAt || ''),
        dealOwner: deal.dealOwnerDisplay || getCrmOwnerDisplay(deal.dealOwner || deal.ownerName || '') || deal.dealOwner || deal.ownerName || '',
        dealType: toDealGridValue(deal.dealType || deal.customerCategory || deal.stage || '', { uppercase: true }),
        dealName: deal.name || '',
        dealCoOwners: deal.dealCoOwners || '',
        dealStatus: capitalize(String(deal.status || '').replace(/_/g, ' ')),
        dealValue: toDealGridValue(deal.value, { numeric: true }),
        quotationCustomerStatus: toDealGridValue(deal.quotationCustomerStatus, { uppercase: true }),
        orderCustomerStatusOld: toDealGridValue(deal.orderCustomerStatusOld || deal.oldStatus, { uppercase: true }),
        orderCustomerStatusNew: toDealGridValue(deal.orderCustomerStatusNew || deal.newStatus, { uppercase: true }),
        convertToPo: getDealPoConversionValue(deal),
        poValueJobNo: getDealPoValueJobNo(deal),
        reasonForLostOrder: normalizeLostOrderReason(deal.reasonForLostOrder || deal.reasonForLost),
        projectName: deal.projectName || '',
        accountOwner: deal.accountOwnerDisplay || getCrmOwnerDisplay(deal.accountOwner || '') || deal.accountOwner || '',
        consultantName: deal.consultantName || '',
        jobNo: toDealGridValue(deal.jobNo),
        poValue: toDealGridValue(deal.poValue, { numeric: true }),
        reasonForLost: deal.reasonForLost || '',
        address: deal.address || linkedCustomer?.address || '',
        lastUpdated: deal.updatedAt ? formatDate(deal.updatedAt, 'long') : '',
        latestRemark: deal.remark || deal.description || linkedCustomer?.remark || '',
      }
    })
  ), [customerDirectory, displayedDeals, quotationNumberByDealId, quotationNumberByDealNumber])

  const projectDetailsAllRows = useMemo(() => (
    displayedDeals
      .filter((deal) => String(deal.projectName || '').trim() !== '')
      .map((deal) => {
        const linkedCustomer = customerDirectory[deal.customerId] || null

        return {
          id: deal.id,
          rawDeal: deal,
          ownerKey: deal.dealOwnerDisplay || getCrmOwnerDisplay(deal.dealOwner || deal.ownerName || '') || deal.dealOwner || deal.ownerName || '',
          dealId: deal.id || '',
          dealNumber: deal.dealNumber || '',
          quotationNumber: getDealQuotationNumber(deal, quotationNumberByDealId, quotationNumberByDealNumber),
          location: deal.city || deal.location || linkedCustomer?.city || linkedCustomer?.location || '',
          customerName: getDealCustomerName(deal, linkedCustomer),
          customerNumber: deal.customerNumber || linkedCustomer?.customerNumber || '',
          companyName: getDealCompanyName(deal, linkedCustomer),
          companyCustomerName: getDealCompanyCustomerName(deal, linkedCustomer),
          companyProfile: deal.companyProfile || '',
          dealDate: formatGridDate(deal.quotationDate || deal.dealDate || deal.createdAt || ''),
          dealOwner: deal.dealOwnerDisplay || getCrmOwnerDisplay(deal.dealOwner || deal.ownerName || '') || deal.dealOwner || deal.ownerName || '',
          dealType: toDealGridValue(deal.dealType || deal.customerCategory || deal.stage || '', { uppercase: true }),
          dealName: deal.name || '',
          dealCoOwners: deal.dealCoOwners || '',
          dealStatus: capitalize(String(deal.status || '').replace(/_/g, ' ')),
          dealValue: toDealGridValue(deal.value, { numeric: true }),
          quotationCustomerStatus: toDealGridValue(deal.quotationCustomerStatus, { uppercase: true }),
          orderCustomerStatusOld: toDealGridValue(deal.orderCustomerStatusOld || deal.oldStatus, { uppercase: true }),
          orderCustomerStatusNew: toDealGridValue(deal.orderCustomerStatusNew || deal.newStatus, { uppercase: true }),
          convertToPo: getDealPoConversionValue(deal),
          reasonForLostOrder: normalizeLostOrderReason(deal.reasonForLostOrder || deal.reasonForLost),
          jobNo: toDealGridValue(deal.jobNo),
          projectName: deal.projectName || '',
          accountOwner: deal.accountOwnerDisplay || getCrmOwnerDisplay(deal.accountOwner || '') || deal.accountOwner || '',
          consultantName: deal.consultantName || '',
          poValue: toDealGridValue(deal.poValue, { numeric: true }),
          reasonForLost: deal.reasonForLost || '',
          address: deal.address || linkedCustomer?.address || '',
          latestRemark: deal.remark || deal.description || linkedCustomer?.remark || '',
        }
      })
  ), [customerDirectory, displayedDeals, quotationNumberByDealId, quotationNumberByDealNumber])

  const ahmadabadAllRows = useMemo(() => (
    displayedDeals.map((deal) => {
      const linkedCustomer = customerDirectory[deal.customerId] || null

      return {
        id: deal.id,
        rawDeal: deal,
        ownerKey: deal.dealOwnerDisplay || getCrmOwnerDisplay(deal.dealOwner || deal.ownerName || '') || deal.dealOwner || deal.ownerName || '',
        dealId: deal.id || '',
        dealNumber: deal.dealNumber || '',
        quotationNumber: getDealQuotationNumber(deal, quotationNumberByDealId, quotationNumberByDealNumber),
        location: getDealBranchLocation(deal, linkedCustomer),
        customerName: getDealCustomerName(deal, linkedCustomer),
        customerNumber: deal.customerNumber || linkedCustomer?.customerNumber || '',
        companyName: getDealCompanyName(deal, linkedCustomer),
        companyCustomerName: getDealCompanyCustomerName(deal, linkedCustomer),
        companyProfile: deal.companyProfile || '',
        dealDate: formatGridDate(deal.quotationDate || deal.dealDate || deal.createdAt || ''),
        dealOwner: deal.dealOwnerDisplay || getCrmOwnerDisplay(deal.dealOwner || deal.ownerName || '') || deal.dealOwner || deal.ownerName || '',
        dealType: toDealGridValue(deal.dealType || deal.customerCategory || deal.stage || '', { uppercase: true }),
        dealName: deal.name || '',
        dealCoOwners: deal.dealCoOwners || '',
        dealStatus: capitalize(String(deal.status || '').replace(/_/g, ' ')),
        dealValue: toDealGridValue(deal.value, { numeric: true }),
        quotationCustomerStatus: toDealGridValue(deal.quotationCustomerStatus, { uppercase: true }),
        orderCustomerStatusOld: toDealGridValue(deal.orderCustomerStatusOld || deal.oldStatus, { uppercase: true }),
        orderCustomerStatusNew: toDealGridValue(deal.orderCustomerStatusNew || deal.newStatus, { uppercase: true }),
        convertToPo: getDealPoConversionValue(deal),
        poValueJobNo: getDealPoValueJobNo(deal),
        reasonForLostOrder: normalizeLostOrderReason(deal.reasonForLostOrder || deal.reasonForLost),
        projectName: deal.projectName || '',
        accountOwner: deal.accountOwnerDisplay || getCrmOwnerDisplay(deal.accountOwner || '') || deal.accountOwner || '',
        consultantName: deal.consultantName || '',
        jobNo: toDealGridValue(deal.jobNo),
        poValue: toDealGridValue(deal.poValue, { numeric: true }),
        reasonForLost: deal.reasonForLost || '',
        address: deal.address || linkedCustomer?.address || '',
        latestRemark: deal.remark || deal.description || linkedCustomer?.remark || '',
      }
    })
  ), [customerDirectory, displayedDeals, quotationNumberByDealId, quotationNumberByDealNumber])

  const vadodaraAllRows = useMemo(() => (
    displayedDeals.map((deal) => {
      const linkedCustomer = customerDirectory[deal.customerId] || null

      return {
        id: deal.id,
        rawDeal: deal,
        ownerKey: deal.dealOwnerDisplay || getCrmOwnerDisplay(deal.dealOwner || deal.ownerName || '') || deal.dealOwner || deal.ownerName || '',
        dealId: deal.id || '',
        dealNumber: deal.dealNumber || '',
        quotationNumber: getDealQuotationNumber(deal, quotationNumberByDealId, quotationNumberByDealNumber),
        location: getDealBranchLocation(deal, linkedCustomer),
        customerName: getDealCustomerName(deal, linkedCustomer),
        customerNumber: deal.customerNumber || linkedCustomer?.customerNumber || '',
        companyName: getDealCompanyName(deal, linkedCustomer),
        companyCustomerName: getDealCompanyCustomerName(deal, linkedCustomer),
        companyProfile: deal.companyProfile || '',
        dealDate: formatGridDate(deal.quotationDate || deal.dealDate || deal.createdAt || ''),
        dealOwner: deal.dealOwnerDisplay || getCrmOwnerDisplay(deal.dealOwner || deal.ownerName || '') || deal.dealOwner || deal.ownerName || '',
        dealType: toDealGridValue(deal.dealType || deal.customerCategory || deal.stage || '', { uppercase: true }),
        dealName: deal.name || '',
        dealCoOwners: deal.dealCoOwners || '',
        dealStatus: capitalize(String(deal.status || '').replace(/_/g, ' ')),
        dealValue: toDealGridValue(deal.value, { numeric: true }),
        quotationCustomerStatus: toDealGridValue(deal.quotationCustomerStatus, { uppercase: true }),
        orderCustomerStatusOld: toDealGridValue(deal.orderCustomerStatusOld || deal.oldStatus, { uppercase: true }),
        orderCustomerStatusNew: toDealGridValue(deal.orderCustomerStatusNew || deal.newStatus, { uppercase: true }),
        convertToPo: getDealPoConversionValue(deal),
        poValueJobNo: getDealPoValueJobNo(deal),
        reasonForLostOrder: normalizeLostOrderReason(deal.reasonForLostOrder || deal.reasonForLost),
        projectName: deal.projectName || '',
        accountOwner: deal.accountOwnerDisplay || getCrmOwnerDisplay(deal.accountOwner || '') || deal.accountOwner || '',
        consultantName: deal.consultantName || '',
        jobNo: toDealGridValue(deal.jobNo),
        poValue: toDealGridValue(deal.poValue, { numeric: true }),
        reasonForLost: deal.reasonForLost || '',
        address: deal.address || linkedCustomer?.address || '',
        latestRemark: deal.remark || deal.description || linkedCustomer?.remark || '',
      }
    })
  ), [customerDirectory, displayedDeals, quotationNumberByDealId, quotationNumberByDealNumber])

  const ownerScopedColumns = useMemo(
    () => {
      if (customViewColumns.length > 0) return customViewColumns
      if (effectiveVariantKey === 'projectDetails') return PROJECT_DETAILS_COLUMNS
      if (effectiveVariantKey === 'ahmadabad') return AHMADABAD_COLUMNS
      if (effectiveVariantKey === 'vadodara') return VADODARA_COLUMNS
      return OWNER_WISE_COLUMNS
    },
    [customViewColumns, effectiveVariantKey]
  )
  const activeOwnerScopedColumns = useMemo(() => {
    if (
      effectiveVariantKey === 'ownerWise'
      || effectiveVariantKey === 'projectDetails'
      || effectiveVariantKey === 'ahmadabad'
      || effectiveVariantKey === 'vadodara'
    ) {
      return ownerScopedColumns
    }

    const normalizedColumnKeys = normalizeVisibleColumnKeys(visibleGridColumnKeys, ownerScopedColumns)
    const shouldForceOwnerColumns = effectiveVariantKey === 'projectDetails'
    const nextColumnKeys = shouldForceOwnerColumns && normalizedColumnKeys.includes('projectName')
      ? [
        ...normalizedColumnKeys.filter((key) => !['accountOwner', 'dealOwner'].includes(key)).flatMap((key) => (
          key === 'projectName' ? [key, 'accountOwner', 'dealOwner'] : [key]
        )),
      ]
      : normalizedColumnKeys
    const filteredColumns = orderColumnsByKeys(
      ownerScopedColumns,
      nextColumnKeys
    )
    return filteredColumns.length > 0 ? filteredColumns : ownerScopedColumns
  }, [effectiveVariantKey, ownerScopedColumns, visibleGridColumnKeys])
  const fieldSelectorColumns = isOwnerScopedAdminView ? ownerScopedColumns : DEAL_SEARCH_FIELD_CATALOG
  const selectedFieldSelectorColumns = useMemo(
    () => orderColumnsByKeys(fieldSelectorColumns, pendingVisibleGridColumnKeys),
    [fieldSelectorColumns, pendingVisibleGridColumnKeys]
  )
  const filterDialogColumns = useMemo(() => {
    const columns = isOwnerScopedAdminView ? activeOwnerScopedColumns : activeGridColumns
    return [...columns].sort((left, right) => left.label.localeCompare(right.label, undefined, { sensitivity: 'base' }))
  }, [activeGridColumns, activeOwnerScopedColumns, isOwnerScopedAdminView])

  const ownerScopedAllRows = useMemo(
    () => {
      if (effectiveVariantKey === 'projectDetails') return projectDetailsAllRows
      if (effectiveVariantKey === 'ahmadabad') return ahmadabadAllRows
      if (effectiveVariantKey === 'vadodara') return vadodaraAllRows
      return ownerWiseAllRows
    },
    [ahmadabadAllRows, effectiveVariantKey, ownerWiseAllRows, projectDetailsAllRows, vadodaraAllRows]
  )

  const ownerScopedRows = useMemo(() => ownerScopedAllRows, [ownerScopedAllRows])

  const filteredOwnerScopedRows = useMemo(() => (
    ownerScopedRows.filter((row) => {
      const selectedOwnerName = ownerNameById[String(appliedOwnerWiseOwnerId)] || ''
      const filterableRow = adminGridRowById[row.id] || row

      return (
        matchesOwnerSelection(filterableRow, appliedOwnerWiseOwnerId, selectedOwnerName)
        && activeOwnerScopedColumns.every((column) => {
        const filterValue = normalizeSearchValue(ownerScopedFilters[column.key])
        if (!filterValue) return true
        return matchesOwnerScopedFilterText(row, filterableRow, column.key, filterValue)
      })
        && DEAL_SEARCH_FIELD_CATALOG.every((column) => {
        const filterValue = normalizeSearchValue(gridFilters[column.key])
        if (!filterValue) return true
        return matchesOwnerScopedFilterText(row, filterableRow, column.key, filterValue)
      })
        && gridFilterRules.every((rule) => matchGridFilterRule(filterableRow, rule))
      )
    })
  ), [activeOwnerScopedColumns, adminGridRowById, appliedOwnerWiseOwnerId, gridFilterRules, gridFilters, ownerNameById, ownerScopedFilters, ownerScopedRows])
  const displayOwnerScopedRows = useMemo(
    () => filteredOwnerScopedRows.filter((row) => hasDealTableData(row, activeOwnerScopedColumns)),
    [activeOwnerScopedColumns, filteredOwnerScopedRows]
  )

  const sortedOwnerScopedRows = useMemo(() => {
    const activeSortKey = activeOwnerScopedColumns.some((column) => column.key === gridSortConfig.key)
      ? gridSortConfig.key
      : 'dealNumber'
    const sortDirectionMultiplier = gridSortConfig.direction === 'asc' ? 1 : -1

    return [...displayOwnerScopedRows].sort((left, right) => {
      const leftValue = normalizeSearchValue(left[activeSortKey])
      const rightValue = normalizeSearchValue(right[activeSortKey])
      const leftNumeric = Number(String(left[activeSortKey] || '').replace(/,/g, ''))
      const rightNumeric = Number(String(right[activeSortKey] || '').replace(/,/g, ''))

      if (Number.isFinite(leftNumeric) && Number.isFinite(rightNumeric) && leftValue && rightValue) {
        return (leftNumeric - rightNumeric) * sortDirectionMultiplier
      }

      return leftValue.localeCompare(rightValue) * sortDirectionMultiplier
    })
  }, [activeOwnerScopedColumns, displayOwnerScopedRows, gridSortConfig.direction, gridSortConfig.key])

  const ownerScopedTotalPages = Math.max(1, Math.ceil(sortedOwnerScopedRows.length / ROWS_PER_PAGE))
  const ownerScopedCurrentPageSafe = Math.min(ownerScopedPage, ownerScopedTotalPages)
  const paginatedOwnerScopedRows = useMemo(() => {
    const startIndex = (ownerScopedCurrentPageSafe - 1) * ROWS_PER_PAGE
    return sortedOwnerScopedRows.slice(startIndex, startIndex + ROWS_PER_PAGE)
  }, [sortedOwnerScopedRows, ownerScopedCurrentPageSafe])
  const visibleOwnerScopedPages = useMemo(
    () => buildVisiblePages(ownerScopedCurrentPageSafe, ownerScopedTotalPages),
    [ownerScopedCurrentPageSafe, ownerScopedTotalPages]
  )

  const totalPages = Math.max(1, Math.ceil(sortedGridRows.length / ROWS_PER_PAGE))
  const currentPageSafe = Math.min(currentPage, totalPages)
  const paginatedGridRows = useMemo(() => {
    const startIndex = (currentPageSafe - 1) * ROWS_PER_PAGE
    return sortedGridRows.slice(startIndex, startIndex + ROWS_PER_PAGE)
  }, [currentPageSafe, sortedGridRows])
  const visiblePages = useMemo(() => buildVisiblePages(currentPageSafe, totalPages), [currentPageSafe, totalPages])
  const requiredVisibleFieldKeys = isSearchAdminView ? SEARCH_DEAL_REQUIRED_GRID_KEYS : ['dealNumber']
  const isRequiredVisibleFieldKey = (key) => requiredVisibleFieldKeys.includes(key)

  useEffect(() => {
    setCurrentPage(1)
  }, [appliedClassificationOwners, appliedOwnerWiseOwnerId, dealStatusTableFilter, gridFilters, gridFilterRules, variantKey, customViewDefinition?.id])

  useEffect(() => {
    setOwnerScopedPage(1)
  }, [appliedClassificationOwners, appliedOwnerWiseOwnerId, filters.ownerUserId, gridFilterRules, ownerScopedFilters, variantKey, customViewDefinition?.id])

  useEffect(() => {
    setBoardVisibleCounts(buildInitialBoardVisibleCounts())
    setOpenBoardActionMenuDealId('')
    setDealTableMenuPosition(null)
  }, [searchTerm, variantKey, customViewDefinition?.id])

  useEffect(() => {
    if (isAdmin && variantKey === 'add' && !hasAutoOpened) {
      setHasAutoOpened(true)
      setFormData(buildInitialFormData({ ownerUserId: String(user?.id || '') }))
      setDealFormStep(0)
      setFormErrors({})
      open()
    }
  }, [hasAutoOpened, isAdmin, open, user?.id, variantKey])

  useEffect(() => {
    const handlePointerDown = (event) => {
      if (!event.target.closest('[data-deal-card-menu]')) {
        setOpenBoardActionMenuDealId('')
        setDealTableMenuPosition(null)
      }
      if (!event.target.closest('[data-board-ownership-menu]')) {
        setIsBoardOwnershipOpen(false)
      }
    }

    document.addEventListener('mousedown', handlePointerDown)
    document.addEventListener('touchstart', handlePointerDown)

    return () => {
      document.removeEventListener('mousedown', handlePointerDown)
      document.removeEventListener('touchstart', handlePointerDown)
    }
  }, [])

  const persistDealSearchSettings = useCallback((overrides = {}) => {
    saveDealSearchPreferences({
      visibleGridColumnKeys,
      filterActionKeys: selectedDealFilterActionKeys,
      sortKey: gridSortConfig.key,
      sortDirection: gridSortConfig.direction,
      ownerWiseOwnerId: appliedOwnerWiseOwnerId,
      classificationOwners: appliedClassificationOwners,
      ...overrides,
    })
  }, [
    appliedClassificationOwners,
    appliedOwnerWiseOwnerId,
    gridSortConfig.direction,
    gridSortConfig.key,
    selectedDealFilterActionKeys,
    visibleGridColumnKeys,
  ])

  const resetForm = () => {
    setFormData(buildInitialFormData({ ownerUserId: String(user?.id || '') }))
    setDealFormStep(0)
    setFormErrors({})
  }

  const handleModalClose = () => {
    close()
    resetForm()

    if (isAdmin && variantKey === 'add') {
      navigate('/admin/deals/view', { replace: true })
    }
  }

  const handleFormFieldChange = (field, value) => {
    setFormData((currentValue) => ({
      ...currentValue,
      [field]: value,
    }))
    setFormErrors((currentValue) => {
      if (!currentValue[field]) {
        return currentValue
      }

      const nextErrors = { ...currentValue }
      delete nextErrors[field]
      return nextErrors
    })
  }

  const handleContactFieldChange = (contactId, field, value) => {
    setFormData((currentValue) => ({
      ...currentValue,
      contacts: currentValue.contacts.map((contact) => (
        contact.id === contactId
          ? { ...contact, [field]: value }
          : contact
      )),
    }))
    setFormErrors((currentValue) => {
      const errorKey = `${field}-${contactId}`
      if (!currentValue[errorKey] && !(field === 'included' && currentValue.contacts) && !(field === 'isPrimary' && currentValue.primaryContact)) {
        return currentValue
      }

      const nextErrors = { ...currentValue }
      delete nextErrors[errorKey]
      delete nextErrors.contacts
      delete nextErrors.primaryContact
      return nextErrors
    })
  }

  const handleAddDealContact = () => {
    setFormData((currentValue) => ({
      ...currentValue,
      contacts: [
        ...currentValue.contacts,
        createDealContact(),
      ],
    }))
    setFormErrors((currentValue) => {
      const nextErrors = { ...currentValue }
      delete nextErrors.contacts
      return nextErrors
    })
  }

  const handleRemoveDealContact = (contactId) => {
    setFormData((currentValue) => {
      const nextContacts = currentValue.contacts.filter((contact) => contact.id !== contactId)
      const normalizedContacts = normalizeDealContacts(nextContacts)

      return {
        ...currentValue,
        contacts: normalizedContacts,
      }
    })
  }

  const handleToggleDealContact = (contactId, included) => {
    setFormData((currentValue) => {
      const nextContacts = currentValue.contacts.map((contact) => (
        contact.id === contactId
          ? { ...contact, included }
          : contact
      ))
      const hasIncludedPrimary = nextContacts.some((contact) => contact.included && contact.isPrimary)

      return {
        ...currentValue,
        contacts: nextContacts.map((contact, index) => (
          hasIncludedPrimary
            ? contact
            : { ...contact, isPrimary: contact.included && index === nextContacts.findIndex((entry) => entry.included) }
        )),
      }
    })
    setFormErrors((currentValue) => {
      const nextErrors = { ...currentValue }
      delete nextErrors.contacts
      delete nextErrors.primaryContact
      return nextErrors
    })
  }

  const handlePrimaryDealContactChange = (contactId) => {
    setFormData((currentValue) => ({
      ...currentValue,
      contacts: currentValue.contacts.map((contact) => ({
        ...contact,
        included: contact.id === contactId ? true : contact.included,
        isPrimary: contact.id === contactId,
      })),
    }))
    setFormErrors((currentValue) => {
      const nextErrors = { ...currentValue }
      delete nextErrors.primaryContact
      return nextErrors
    })
  }

  const validateDealDetailsStep = () => {
    const nextErrors = {}
    const normalizedDealValue = normalizeOptionalNumberInput(formData.value)
    const normalizedDealScore = normalizeOptionalNumberInput(formData.dealScore)
    const normalizedProbability = normalizeOptionalNumberInput(formData.probability)

    if (!formData.name.trim()) nextErrors.name = 'Please provide Deal Name.'
    if (!formData.description.trim()) nextErrors.description = 'Please provide Description.'
    if (!formData.dealType.trim()) nextErrors.dealType = 'Please select Deal Type.'
    if (!formData.dealSource.trim()) nextErrors.dealSource = 'Please select Deal Source.'
    if (!formData.expectedClosureDate) {
      nextErrors.expectedClosureDate = 'Please provide Expected Closure Date.'
    } else if (formData.dealDate && formData.expectedClosureDate < formData.dealDate) {
      nextErrors.expectedClosureDate = 'Expected Closure Date should not be older than Deal Date.'
    }
    if (normalizedDealValue === null) nextErrors.value = 'Deal Value is required.'
    if (String(formData.dealScore || '').trim() && normalizedDealScore === null) {
      nextErrors.dealScore = 'Deal Score must be a valid number.'
    }
    if (String(formData.probability || '').trim() && normalizedProbability === null) {
      nextErrors.probability = 'Probability must be a valid number.'
    } else if (normalizedProbability !== null && (normalizedProbability < 0 || normalizedProbability > 100)) {
      nextErrors.probability = 'Probability must be between 0 and 100.'
    }
    if (!formData.status) nextErrors.status = 'Status is required.'
    if (isAdmin && !String(formData.ownerUserId || '').trim()) {
      nextErrors.ownerUserId = 'Please select Deal Owner.'
    }

    setFormErrors((currentValue) => {
      const nextValue = { ...currentValue }
      ;[
        'name',
        'description',
        'dealType',
        'dealSource',
        'expectedClosureDate',
        'value',
        'dealScore',
        'probability',
        'status',
        'ownerUserId',
      ].forEach((key) => {
        delete nextValue[key]
      })
      return {
        ...nextValue,
        ...nextErrors,
      }
    })

    return Object.keys(nextErrors).length === 0
  }

  const validateContactsStep = () => {
    const nextErrors = {}
    const selectedContacts = formData.contacts.filter((contact) => contact.included)

    if (selectedContacts.length === 0) {
      nextErrors.contacts = 'Please add at least one contact before finishing.'
    }

    const primaryContact = getPrimaryDealContact(formData.contacts)
    if (!primaryContact) {
      nextErrors.primaryContact = 'Please mark one Primary Deal Contact.'
    }

    selectedContacts.forEach((contact) => {
      if (!contact.name.trim()) {
        nextErrors[`name-${contact.id}`] = 'Contact name is required.'
      }
      if (!contact.phone.trim() && !contact.email.trim()) {
        nextErrors[`phone-${contact.id}`] = 'Provide phone or email.'
      }
    })

    setFormErrors((currentValue) => {
      const nextValue = Object.fromEntries(
        Object.entries(currentValue).filter(([key]) => (
          key !== 'contacts'
          && key !== 'primaryContact'
          && !key.startsWith('name-')
          && !key.startsWith('phone-')
        ))
      )

      return {
        ...nextValue,
        ...nextErrors,
      }
    })

    return Object.keys(nextErrors).length === 0
  }

  const handleNextDealFormStep = () => {
    if (dealFormStep === 0 && !validateDealDetailsStep()) {
      return
    }

    setDealFormStep((currentValue) => Math.min(currentValue + 1, 1))
  }

  const handlePreviousDealFormStep = () => {
    setDealFormStep((currentValue) => Math.max(currentValue - 1, 0))
  }

  const handleSubmit = async (event) => {
    event.preventDefault()
    if (dealFormStep === 0) {
      handleNextDealFormStep()
      return
    }

    if (!validateContactsStep()) {
      return
    }

    const selectedOwner = availableUsers.find((entry) => String(entry.id) === String(formData.ownerUserId || user?.id || ''))
    const resolvedOwnerId = String(selectedOwner?.id || user?.id || '')
    const resolvedOwnerName = selectedOwner?.name || userDirectory[resolvedOwnerId] || data?.dealOwnerName || data?.dealOwner || data?.ownerName || user?.name || ''
    const apiOwnerId = getApiIntegerId(resolvedOwnerId)
    const normalizedDealValue = normalizeOptionalNumberInput(formData.value)
    const normalizedDealScore = normalizeOptionalNumberInput(formData.dealScore)
    const normalizedProbability = normalizeOptionalNumberInput(formData.probability)
    const selectedContacts = formData.contacts.filter((contact) =>
      contact.included && (contact.name || contact.phone || contact.email || contact.designation)
    )
    const primaryContact = getPrimaryDealContact(selectedContacts)

    if (normalizedDealValue === null) {
      setFormErrors((currentValue) => ({
        ...currentValue,
        value: 'Deal Value is required.',
      }))
      return
    }

    const dealData = {
      dealDate: formData.dealDate,
      name: formData.name.trim(),
      dealType: normalizeDealMarketingValue(formData.dealType),
      dealSource: normalizeDealMarketingValue(formData.dealSource),
      source: normalizeDealMarketingValue(formData.dealSource),
      dealSubsource: formData.dealSubsource.trim(),
      subsource: formData.dealSubsource.trim(),
      expectedClosureDate: formData.expectedClosureDate,
      closeDate: formData.expectedClosureDate || formData.closeDate,
      value: normalizedDealValue,
      valueCurrency: formData.valueCurrency || 'INR',
      userId: resolvedOwnerId,
      ...(apiOwnerId ? {
        ownerUserId: apiOwnerId,
        ownerId: apiOwnerId,
        assignedTo: apiOwnerId,
        assignedUserId: apiOwnerId,
      } : {}),
      ownerName: resolvedOwnerName,
      dealOwner: resolvedOwnerName,
      status: formData.status,
      stage: formData.stage.trim(),
      projectName: formData.projectName.trim(),
      city: normalizeDealCity(formData.city),
      description: formData.description.trim(),
      address: formData.address.trim(),
      dealCoOwners: formData.dealCoOwners.trim(),
      dealScore: normalizedDealScore,
      consultantName: formData.consultantName.trim(),
      quotationCustomerStatus: formData.customerQuotationStatus.trim(),
      probability: normalizedProbability,
      productCategory: formData.productCategory.trim(),
      customerRefNo: formData.customerRefNo.trim(),
      customerRefDate: formData.customerRefDate,
      gstin: formData.gstin.trim(),
      jobNo: formData.jobNo.trim(),
      orderCustomerStatusOld: formData.customerOrderStatusOld.trim(),
      orderCustomerStatusNew: formData.customerOrderStatusNew.trim(),
      convertToPo: formData.convertToPo.trim(),
      poValueJobNo: formData.poValueJobNo.trim(),
      reasonForLostOrder: formData.reasonForLostOrder.trim(),
      contactPerson: primaryContact?.name || '',
      contactName: primaryContact?.name || '',
      contactMobile: primaryContact?.phone || '',
      contactPhone: primaryContact?.phone || '',
      phone: primaryContact?.phone || '',
      contactEmail: primaryContact?.email || '',
      email: primaryContact?.email || '',
      contactDesignation: primaryContact?.designation || '',
      contacts: selectedContacts.map((contact) => ({
        prefix: contact.prefix,
        contactPerson: contact.name.trim(),
        designation: contact.designation.trim(),
        phone: contact.phone.trim(),
        mobile: contact.phone.trim(),
        email: contact.email.trim(),
        isPrimary: Boolean(contact.isPrimary),
      })),
    }

    const result = data
      ? await updateDeal(data.id, dealData)
      : await createDeal(dealData)

    if (result.success) {
      addNotification('success', 'Success', `Deal ${data ? 'updated' : 'created'} successfully`)
      handleModalClose()
    } else {
      const finalMessage = parseAndDeduplicateMessages(result.message, 'Unable to save deal.')

      setFormErrors((currentValue) => ({
        ...currentValue,
        submit: finalMessage,
      }))
      setDealFormStep(0)
      addNotification('error', 'Error', finalMessage)
    }
  }

  const handleEdit = (deal) => {
    if (isConvertedDealRecord(deal?.rawDeal || deal)) {
      handleViewDeal(deal)
      return
    }

    setFormData({
      dealDate: deal.dealDate || new Date().toISOString().slice(0, 10),
      name: deal.name || '',
      dealType: normalizeDealMarketingValue(deal.dealType || ''),
      dealSource: normalizeDealMarketingValue(deal.dealSource || deal.source || ''),
      dealSubsource: deal.dealSubsource || deal.subsource || '',
      expectedClosureDate: deal.expectedClosureDate || deal.closeDate || '',
      value: deal.value ?? '',
      valueCurrency: deal.valueCurrency || 'INR',
      status: deal.status || deal.stage || 'new',
      stage: deal.stage || '',
      closeDate: deal.closeDate || '',
      projectName: deal.projectName || '',
      city: normalizeDealCity(deal.city),
      description: deal.description || '',
      address: deal.address || '',
      dealCoOwners: deal.dealCoOwners || '',
      dealScore: deal.dealScore ?? '',
      consultantName: deal.consultantName || '',
      customerQuotationStatus: deal.quotationCustomerStatus || '',
      probability: deal.probability ?? '',
      productCategory: deal.productCategory || '',
      customerRefNo: deal.customerRefNo || deal.customerReferenceNumber || '',
      customerRefDate: deal.customerRefDate || deal.customerReferenceDate || '',
      gstin: deal.gstin || '',
      jobNo: deal.jobNo || '',
      customerOrderStatusOld: deal.orderCustomerStatusOld || '',
      customerOrderStatusNew: deal.orderCustomerStatusNew || '',
      convertToPo: deal.convertToPo || '',
      poValueJobNo: deal.poValueJobNo || '',
      reasonForLostOrder: normalizeLostOrderReason(deal.reasonForLostOrder || deal.reasonForLost),
      contacts: normalizeDealContacts(deal.contacts, {
        name: deal.contactPerson || deal.contactName || '',
        phone: deal.contactMobile || deal.contactPhone || deal.phone || '',
        email: deal.contactEmail || deal.email || '',
        designation: deal.contactDesignation || '',
      }),
      ownerUserId: String(
        deal.ownerUserId
        || deal.ownerId
        || deal.assignedTo
        || deal.assignedUserId
        || deal.userId
        || user?.id
        || ''
      ),
    })
    setDealFormStep(0)
    setFormErrors({})
    open(deal)
  }

  const handleToggleDealMenu = (event, dealId) => {
    const nextDealId = String(dealId || '')
    if (!nextDealId) return

    const triggerRect = event.currentTarget.getBoundingClientRect()
    const popupWidth = 188
    const popupHeight = 320
    const viewportPadding = 8
    const nextLeft = Math.min(
      Math.max(viewportPadding, triggerRect.right - popupWidth),
      window.innerWidth - popupWidth - viewportPadding
    )
    const spaceBelow = window.innerHeight - triggerRect.bottom
    const nextTop = spaceBelow >= popupHeight + viewportPadding
      ? triggerRect.bottom + 4
      : Math.max(viewportPadding, triggerRect.top - popupHeight - 4)

    setOpenBoardActionMenuDealId((currentValue) => {
      const isClosingCurrentMenu = currentValue === nextDealId

      if (isClosingCurrentMenu) {
        setDealTableMenuPosition(null)
        return ''
      }

      setDealTableMenuPosition({
        top: nextTop,
        left: nextLeft,
      })
      return nextDealId
    })
  }

  const handleViewDeal = (deal) => {
    const activeDeal = deal?.rawDeal || deal
    if (isConvertedDealRecord(activeDeal)) {
      const sourceDeal = activeDeal.sourceDealId
        ? deals.find((entry) => String(entry.id) === String(activeDeal.sourceDealId))
        : null

      if (sourceDeal?.id) {
        if (!isAdmin) {
          navigate(`/deals/view/${encodeURIComponent(sourceDeal.id)}`, {
            state: {
              fromPath: `${location.pathname}${location.search || ''}`,
              dealSnapshot: sourceDeal,
            },
          })
          return
        }

        navigate(buildAdminDealDetailUrl(sourceDeal.id), {
          state: {
            fromPath: `${location.pathname}${location.search || ''}`,
            dealSnapshot: sourceDeal,
          },
        })
        return
      }

      if (isAdmin) {
        navigate('/admin/deals/converted', {
          state: {
            convertedDealId: activeDeal.convertedDealId || activeDeal.id,
            convertedDealSearch: activeDeal.dealNumber || activeDeal.name || activeDeal.accountName || activeDeal.customerName || '',
          },
        })
        return
      }

      navigate('/deals/search', {
        state: {
          quotationDealLookup: {
            dealNumber: activeDeal.dealNumber || activeDeal.name || '',
            projectName: activeDeal.projectName || '',
            companyName: activeDeal.accountName || activeDeal.customerName || '',
          },
        },
      })
      return
    }

    if (!activeDeal?.id) {
      addNotification('error', 'Error', 'Unable to open this deal right now')
      return
    }

    if (!isAdmin) {
      navigate(`/deals/view/${encodeURIComponent(activeDeal.id)}`, {
        state: {
          fromPath: `${location.pathname}${location.search || ''}`,
          dealSnapshot: activeDeal,
        },
      })
      return
    }

    navigate(buildAdminDealDetailUrl(activeDeal.id), {
      state: {
        fromPath: `${location.pathname}${location.search || ''}`,
        dealSnapshot: activeDeal,
      },
    })
  }

  const handleManageDeal = (deal) => {
    const activeDeal = deal?.rawDeal || deal
    setOpenBoardActionMenuDealId('')
    setDealTableMenuPosition(null)
    if (isConvertedDealRecord(activeDeal)) {
      handleViewDeal(activeDeal)
      return
    }

    if (!activeDeal?.id) {
      addNotification('error', 'Error', 'Unable to open manage deal right now')
      return
    }

    navigate(buildAdminManageDealUrl(activeDeal.id), {
      state: {
        fromPath: `${location.pathname}${location.search || ''}`,
        dealSnapshot: activeDeal,
      },
    })
  }

  const resolveLinkedAccountRecord = (deal) => {
    if (!deal) return null

    const accountId = String(deal.accountId || deal.customerId || '').trim()
    const normalizedAccountName = normalizeSearchValue(
      deal.accountName
      || deal.companyName
      || deal.customerName
      || ''
    )

    return (
      accountDirectory[accountId]
      || accountNameDirectory[normalizedAccountName]
      || null
    )
  }

  const handleOpenLinkedAccount = (deal) => {
    const linkedAccount = resolveLinkedAccountRecord(deal)

    if (!linkedAccount?.id) {
      addNotification('error', 'Error', 'No linked account was found for this deal')
      return
    }

    closeBoardActionModal()
    navigate(buildAdminAccountsBoardUrl('myGroup', `?accountId=${encodeURIComponent(linkedAccount.id)}`))
  }

  const handleOpenLinkedAccountFromMenu = (deal) => {
    setOpenBoardActionMenuDealId('')
    setDealTableMenuPosition(null)
    handleOpenLinkedAccount(deal)
  }

  const handleGenerateQuotationForDeal = (deal) => {
    const activeDeal = deal?.rawDeal || deal
    if (!activeDeal || isConvertedDealRecord(activeDeal)) return

    setOpenBoardActionMenuDealId('')
    setDealTableMenuPosition(null)
    closeBoardActionModal()
    navigate('/admin/quotations', {
      state: {
        openGenerator: true,
        preselectedDeal: activeDeal,
      },
    })
  }

  const handleCreateConvertedDealFromMenu = async (deal) => {
    const activeDeal = deal?.rawDeal || deal
    if (!activeDeal?.id || isConvertedDealRecord(activeDeal)) return

    setOpenBoardActionMenuDealId('')
    setDealTableMenuPosition(null)
    closeBoardActionModal()

    const payload = {
      title: activeDeal.title || activeDeal.name || activeDeal.projectName || 'Converted Deal',
      name: activeDeal.name || activeDeal.title || activeDeal.projectName || 'Converted Deal',
      accountId: activeDeal.accountId || activeDeal.customerId || '',
      sourceDealId: activeDeal.id,
      accountName: activeDeal.accountName || activeDeal.linkedAccountName || activeDeal.companyName || '',
      customerName: activeDeal.customerName || activeDeal.accountName || activeDeal.companyName || '',
      amount: activeDeal.amount ?? activeDeal.value ?? activeDeal.dealValue ?? null,
      value: activeDeal.value ?? activeDeal.amount ?? activeDeal.dealValue ?? null,
      currency: activeDeal.currency || activeDeal.valueCurrency || 'INR',
      stage: 'converted',
      status: 'converted',
      ownerName: activeDeal.ownerName || activeDeal.dealOwner || '',
      ...(getApiIntegerId(activeDeal.assignedTo || activeDeal.ownerUserId || activeDeal.ownerId) ? {
        assignedTo: getApiIntegerId(activeDeal.assignedTo || activeDeal.ownerUserId || activeDeal.ownerId),
        ownerUserId: getApiIntegerId(activeDeal.ownerUserId || activeDeal.assignedTo || activeDeal.ownerId),
      } : {}),
      convertedAt: new Date().toISOString(),
      notes: activeDeal.notes || activeDeal.description || '',
      orderCustomerStatusOld: activeDeal.orderCustomerStatusOld || '',
      orderCustomerStatusNew: activeDeal.orderCustomerStatusNew || '',
      convertToPo: activeDeal.convertToPo || '',
      poValueJobNo: activeDeal.poValueJobNo || '',
      reasonForLostOrder: normalizeLostOrderReason(activeDeal.reasonForLostOrder || activeDeal.reasonForLost),
    }

    const result = await createConvertedDeal(payload)
    if (!result.success) {
      addNotification('error', 'Converted Deal failed', result.message || 'Unable to add this deal to Converted Deals.')
      return
    }

    await updateDeal(activeDeal.id, {
      status: 'converted',
      stage: 'converted',
      convertedFromAction: true,
    })

    addNotification('success', 'Converted Deal added', 'Deal was added to the Converted Deals table.')
    navigate('/admin/deals/converted', {
      state: {
        convertedDealId: result.data?.id,
        convertedDealSearch: result.data?.dealNumber || result.data?.name || result.data?.accountName || activeDeal.dealNumber || '',
      },
    })
  }

  const handleOpenDealActionPage = (actionKey, deal) => {
    const activeDeal = deal?.rawDeal || deal
    if (!activeDeal?.id || isConvertedDealRecord(activeDeal)) return

    setOpenBoardActionMenuDealId('')
    setDealTableMenuPosition(null)
    closeBoardActionModal()
    const returnTo = `${location.pathname}${location.search || ''}`
    if (isAdmin) {
      navigate(buildCrmDealActionUrl(actionKey, activeDeal.id, returnTo))
      return
    }

    const actionParams = new URLSearchParams({ module: 'deal', dealId: String(activeDeal.id), returnTo })
    navigate(`/deals/actions/${actionKey}?${actionParams.toString()}`)
  }

  const handleOpenDealModalActionFromMenu = (type, deal) => {
    setOpenBoardActionMenuDealId('')
    setDealTableMenuPosition(null)
    handleOpenBoardActionModal(type, deal?.rawDeal || deal)
  }

  const handleLaunchDealEdit = () => {
    const activeDeal = boardActionModal.deal
    if (!activeDeal) return

    closeBoardActionModal()
    handleManageDeal(activeDeal)
  }

  useEffect(() => {
    const editDealId = location.state?.editDealId
    if (!editDealId) {
      return
    }

    const matchedDeal = scopedDeals.find((entry) => String(entry.id) === String(editDealId))

    if (matchedDeal) {
      setFormData({
        dealDate: matchedDeal.dealDate || new Date().toISOString().slice(0, 10),
        name: matchedDeal.name || '',
        dealType: normalizeDealMarketingValue(matchedDeal.dealType || ''),
        dealSource: normalizeDealMarketingValue(matchedDeal.dealSource || matchedDeal.source || ''),
        dealSubsource: matchedDeal.dealSubsource || matchedDeal.subsource || '',
        expectedClosureDate: matchedDeal.expectedClosureDate || matchedDeal.closeDate || '',
        value: matchedDeal.value ?? '',
        valueCurrency: matchedDeal.valueCurrency || 'INR',
        status: matchedDeal.status || matchedDeal.stage || 'new',
        stage: matchedDeal.stage || '',
        closeDate: matchedDeal.closeDate || '',
        projectName: matchedDeal.projectName || '',
        city: normalizeDealCity(matchedDeal.city),
        description: matchedDeal.description || '',
        address: matchedDeal.address || '',
        dealCoOwners: matchedDeal.dealCoOwners || '',
        dealScore: matchedDeal.dealScore ?? '',
        consultantName: matchedDeal.consultantName || '',
        customerQuotationStatus: matchedDeal.quotationCustomerStatus || '',
        probability: matchedDeal.probability ?? '',
        productCategory: matchedDeal.productCategory || '',
        customerRefNo: matchedDeal.customerRefNo || matchedDeal.customerReferenceNumber || '',
        customerRefDate: matchedDeal.customerRefDate || matchedDeal.customerReferenceDate || '',
        gstin: matchedDeal.gstin || '',
        jobNo: matchedDeal.jobNo || '',
        customerOrderStatusOld: matchedDeal.orderCustomerStatusOld || '',
        customerOrderStatusNew: matchedDeal.orderCustomerStatusNew || '',
        convertToPo: matchedDeal.convertToPo || '',
        poValueJobNo: matchedDeal.poValueJobNo || '',
        reasonForLostOrder: normalizeLostOrderReason(matchedDeal.reasonForLostOrder || matchedDeal.reasonForLost),
        contacts: normalizeDealContacts(matchedDeal.contacts, {
          name: matchedDeal.contactPerson || matchedDeal.contactName || '',
          phone: matchedDeal.contactMobile || matchedDeal.contactPhone || matchedDeal.phone || '',
          email: matchedDeal.contactEmail || matchedDeal.email || '',
          designation: matchedDeal.contactDesignation || '',
        }),
        ownerUserId: String(
          matchedDeal.ownerUserId
          || matchedDeal.ownerId
          || matchedDeal.assignedTo
          || matchedDeal.assignedUserId
          || matchedDeal.userId
          || user?.id
          || ''
        ),
      })
      setDealFormStep(0)
      setFormErrors({})
      open(matchedDeal)
    } else {
      addNotification('error', 'Error', 'The requested deal could not be found')
    }

    navigate(`${location.pathname}${location.search || ''}`, { replace: true, state: {} })
  }, [addNotification, location.pathname, location.search, location.state, navigate, open, scopedDeals, user?.id])

  useEffect(() => {
    const dealAction = location.state?.dealAction
    const dealActionId = location.state?.dealActionId
    if (!dealAction || !dealActionId) {
      return
    }

    const matchedDeal = scopedDeals.find((entry) => String(entry.id) === String(dealActionId))

    if (matchedDeal) {
      setBoardActionModal({ type: dealAction, deal: matchedDeal })
    } else {
      addNotification('error', 'Error', 'The requested deal could not be found')
    }

    navigate(`${location.pathname}${location.search || ''}`, { replace: true, state: {} })
  }, [addNotification, location.pathname, location.search, location.state, navigate, scopedDeals])

  const handleGridFilterChange = (key, value) => {
    setGridFilters((currentValue) => ({
      ...currentValue,
      [key]: value,
    }))
  }

  const handleGridSort = (columnKey) => {
    setGridSortConfig({
      key: columnKey,
      direction: 'asc',
    })
  }

  const handleOwnerFilterChange = (ownerUserId) => {
    const nextOwnerUserId = ownerUserId || 'all'
    setFilter('ownerUserId', nextOwnerUserId)
    setAppliedOwnerWiseOwnerId(nextOwnerUserId)
    setPendingOwnerWiseOwnerId(nextOwnerUserId)
    setCurrentPage(1)
    setOwnerScopedPage(1)
  }

  const handleRefreshDeals = async () => {
    try {
      await refreshData()
      addNotification('success', 'Success', 'Deal data refreshed successfully')
    } catch (error) {
      addNotification('error', 'Error', error?.message || 'Unable to refresh deals right now')
    }
  }

  const handleExportDeals = (format = 'excel') => {
    const exportColumns = (isOwnerScopedAdminView ? activeOwnerScopedColumns : activeGridColumns) || []
    const filteredRows = isOwnerScopedAdminView ? sortedOwnerScopedRows : sortedGridRows
    const fallbackRows = isOwnerScopedAdminView ? ownerScopedAllRows : adminGridRows
    const exportRows = (filteredRows && filteredRows.length > 0) ? filteredRows : fallbackRows

    if (!exportColumns.length) {
      addNotification('error', 'Export Deals', 'No columns are selected for export. Open Select Deal Fields and choose at least one column.')
      return
    }

    if (!exportRows || !exportRows.length) {
      addNotification('error', 'Export Deals', 'No deals are available to export in this view yet')
      return
    }

    const timestamp = new Date().toISOString().slice(0, 10)
    const baseName = viewConfig.title || (isSearchAdminView ? 'Search Deal' : 'View Deal')
    const workbookColumns = exportColumns.map((column) => {
      const meta = DEAL_EXPORT_FIELD_META[column.key]
      const type = meta?.type
      const align = meta?.align
        || (type === 'currency' || type === 'number' || type === 'integer' ? 'right'
            : type === 'date' || type === 'datetime' || type === 'percent' ? 'center'
            : undefined)

      return {
        key: column.key,
        label: column.label,
        type,
        align,
        width: meta?.width,
      }
    })

    const totalValueAggregate = exportRows.reduce((sum, row) => {
      const numeric = Number(row?.dealValue)
      return Number.isFinite(numeric) ? sum + numeric : sum
    }, 0)
    const branchLabel = effectiveVariantKey === 'vadodara'
      ? 'Vadodara'
      : effectiveVariantKey === 'ahmadabad'
        ? 'Ahmedabad'
        : ''
    const selectedOwnerName = ownerNameById[String(appliedOwnerWiseOwnerId)] || ''
    const ownerLabel = isOwnerScopedAdminView && selectedOwnerName ? selectedOwnerName : ''

    // Metadata order follows the standard layout diagram:
    //   View Ã¢â€ â€™ Branch (deals only) Ã¢â€ â€™ Owner (when filtered) Ã¢â€ â€™ Total Records Ã¢â€ â€™ Total Deal Value
    // (auto-added by the util: Company Name, Report Title, Export Date, Generated By)
    const baseMetadata = [
      { label: 'View', value: baseName },
    ]
    if (branchLabel) baseMetadata.push({ label: 'Branch', value: branchLabel })
    if (ownerLabel)  baseMetadata.push({ label: 'Owner',  value: ownerLabel })
    baseMetadata.push({ label: 'Total Records', value: String(exportRows.length) })
    if (totalValueAggregate > 0) {
      baseMetadata.push({ label: 'Total Deal Value', value: totalValueAggregate.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) })
    }

    const hasDealValueColumn = workbookColumns.some((column) => column.key === 'dealValue')
    const hasPoValueColumn   = workbookColumns.some((column) => column.key === 'poValue')
    const displayExportRows = exportRows.map((row) => ({
      ...row,
      reasonForLostOrder: getLostOrderReasonLabel(row.reasonForLostOrder),
    }))

    const sharedOptions = {
      title: `${baseName} Report`,
      subtitle: `${baseName} export`,
      sheetName: 'Deals',
      metadata: baseMetadata,
      columns: workbookColumns,
      rows: displayExportRows,
      summary: [
        ...(hasDealValueColumn ? [{ label: 'Total Deal Value', key: 'dealValue', type: 'currency' }] : []),
        ...(hasPoValueColumn   ? [{ label: 'Total PO Value',   key: 'poValue',   type: 'currency' }] : []),
      ],
    }

    const fileBase = `${baseName.replace(/\s+/g, '_')}_${timestamp}`

    if (format === 'csv') {
      exportCsvWorkbook({ ...sharedOptions, filename: `${fileBase}.csv` })
      addNotification('success', 'Export Deals', `Exported ${exportRows.length} deal(s) to CSV`)
      return
    }

    exportExcelWorkbook({ ...sharedOptions, filename: `${fileBase}.xlsx` })
    addNotification('success', 'Export Deals', `Exported ${exportRows.length} deal(s) to Excel`)
  }

  const openFieldSelector = () => {
    const visibleColumns = isOwnerScopedAdminView ? activeOwnerScopedColumns : activeGridColumns
    setPendingVisibleGridColumnKeys(visibleColumns.map((column) => column.key))
    setPendingClassificationOwners(appliedClassificationOwners)
    setDraggedSelectedFieldKey('')
    setIsFieldSelectorOpen(true)
  }

  const handleCloseFieldSelector = () => {
    const visibleColumns = isOwnerScopedAdminView ? activeOwnerScopedColumns : activeGridColumns
    setPendingVisibleGridColumnKeys(visibleColumns.map((column) => column.key))
    setPendingClassificationOwners(appliedClassificationOwners)
    setDraggedSelectedFieldKey('')
    setIsFieldSelectorOpen(false)
  }

  const handleToggleVisibleGridColumn = (columnKey) => {
    if (isRequiredVisibleFieldKey(columnKey)) {
      return
    }

    setPendingVisibleGridColumnKeys((currentValue) => (
      currentValue.includes(columnKey)
        ? currentValue.filter((key) => key !== columnKey)
        : [...currentValue, columnKey]
    ))
  }

  const handleRemoveVisibleGridColumn = (columnKey) => {
    if (isRequiredVisibleFieldKey(columnKey)) {
      return
    }

    setPendingVisibleGridColumnKeys((currentValue) => currentValue.filter((key) => key !== columnKey))
  }

  const handleToggleClassificationOwner = (ownerName) => {
    setPendingClassificationOwners((currentValue) => (
      currentValue.includes(ownerName)
        ? currentValue.filter((value) => value !== ownerName)
        : [...currentValue, ownerName]
    ))
  }

  const handleToggleAllClassificationOwners = () => {
    setPendingClassificationOwners((currentValue) => (
      currentValue.length === classificationOwnerNames.length ? [] : [...classificationOwnerNames]
    ))
  }

  const handleLoadClassificationOwners = ({ persistPreferences = false } = {}) => {
    setAppliedClassificationOwners(pendingClassificationOwners)
    setCurrentPage(1)
    setOwnerScopedPage(1)

    if (persistPreferences) {
      persistDealSearchSettings({ classificationOwners: pendingClassificationOwners })
    }

    addNotification(
      'success',
      'Success',
      pendingClassificationOwners.length > 0
        ? 'Deal owner classification filter loaded successfully'
        : 'Classification filter cleared successfully'
    )
  }

  const applyOwnerWiseDealFilter = ({ persistPreferences = false } = {}) => {
    const nextOwnerUserId = pendingOwnerWiseOwnerId || 'all'
    setAppliedOwnerWiseOwnerId(nextOwnerUserId)
    setFilter('ownerUserId', nextOwnerUserId)
    setCurrentPage(1)
    setOwnerScopedPage(1)

    if (persistPreferences) {
      persistDealSearchSettings({ ownerWiseOwnerId: nextOwnerUserId })
    }

    addNotification(
      'success',
      'Success',
      nextOwnerUserId && nextOwnerUserId !== 'all'
        ? 'Owner wise deal filter applied successfully'
        : 'Owner wise deal filter cleared successfully'
    )
    setIsFilterDialogOpen(false)
  }

  const handleCloseFilterDialog = () => {
    setPendingOwnerWiseOwnerId(appliedOwnerWiseOwnerId)
    setPendingClassificationOwners(appliedClassificationOwners)
    setPendingDealFilterActionKeys(selectedDealFilterActionKeys)
    setPendingOrderByKey(gridSortConfig.key || '')
    setPendingFilterRows(
      hasAnyRuleFilters(gridFilterRules)
        ? buildFilterRowsFromRules(gridFilterRules)
        : buildFilterRowsFromFilters(gridFilters)
    )
    setIsFilterDialogOpen(false)
  }

  const handleReorderSelectedField = (draggedKey, targetKey) => {
    if (
      !draggedKey
      || !targetKey
      || draggedKey === targetKey
      || isRequiredVisibleFieldKey(draggedKey)
      || isRequiredVisibleFieldKey(targetKey)
    ) {
      return
    }

    setPendingVisibleGridColumnKeys((currentValue) => {
      const requiredKeys = requiredVisibleFieldKeys.filter((key) => currentValue.includes(key))
      const movableKeys = currentValue.filter((key) => !requiredVisibleFieldKeys.includes(key))
      const draggedIndex = movableKeys.indexOf(draggedKey)
      const targetIndex = movableKeys.indexOf(targetKey)

      if (draggedIndex === -1 || targetIndex === -1) {
        return currentValue
      }

      const nextKeys = [...movableKeys]
      const [movedKey] = nextKeys.splice(draggedIndex, 1)
      nextKeys.splice(targetIndex, 0, movedKey)

      return [...requiredKeys, ...nextKeys]
    })
  }

  const applyVisibleGridColumns = (persistPreferences = false) => {
    const availableColumns = isOwnerScopedAdminView ? ownerScopedColumns : DEAL_SEARCH_FIELD_CATALOG
    const nextKeys = normalizeVisibleColumnKeys(pendingVisibleGridColumnKeys, availableColumns)

    setVisibleGridColumnKeys(nextKeys)

    if (persistPreferences) {
      persistDealSearchSettings({ visibleGridColumnKeys: nextKeys })
      addNotification('success', 'Success', 'Deal field preferences saved successfully')
    }

    setDraggedSelectedFieldKey('')
    setIsFieldSelectorOpen(false)
  }

  const handleApplyVisibleGridColumns = () => {
    applyVisibleGridColumns(false)
  }

  const handleSaveAndApplyVisibleGridColumns = () => {
    applyVisibleGridColumns(true)
  }

  const openFilterDialog = () => {
    setPendingFilterRows(
      hasAnyRuleFilters(gridFilterRules)
        ? buildFilterRowsFromRules(gridFilterRules)
        : buildFilterRowsFromFilters(gridFilters)
    )
    setPendingOwnerWiseOwnerId(appliedOwnerWiseOwnerId)
    setPendingClassificationOwners(appliedClassificationOwners)
    setPendingDealFilterActionKeys(selectedDealFilterActionKeys)
    setPendingOrderByKey(gridSortConfig.key || '')
    setIsFilterDialogOpen(true)
  }

  const handleApplyFilterDialog = () => {
    const nextOwnerUserId = pendingOwnerWiseOwnerId || 'all'
    setGridFilterRules(buildFilterRulesFromRows(pendingFilterRows))
    setAppliedOwnerWiseOwnerId(nextOwnerUserId)
    setPendingOwnerWiseOwnerId(nextOwnerUserId)
    setFilter('ownerUserId', nextOwnerUserId)
    setAppliedClassificationOwners(pendingClassificationOwners)
    setSelectedDealFilterActionKeys(pendingDealFilterActionKeys)
    setGridSortConfig((currentValue) => (
      pendingOrderByKey
        ? getGridSortConfigForKey(
          pendingOrderByKey
        )
        : currentValue
    ))
    setCurrentPage(1)
    setOwnerScopedPage(1)
    setIsFilterDialogOpen(false)
  }

  const handleSaveAndApplyFilterDialog = () => {
    handleApplyFilterDialog()
  }

  const handleClearFilterDialog = () => {
    const clearedFilters = buildInitialGridFilters()
    setGridFilters(clearedFilters)
    setGridFilterRules([])
    setPendingFilterRows([createDealFilterRow()])
    setDashboardDealDrilldown(null)
    setAppliedOwnerWiseOwnerId('all')
    setPendingOwnerWiseOwnerId('all')
    setFilter('ownerUserId', 'all')
    setAppliedClassificationOwners([])
    setPendingClassificationOwners([])
    setCurrentPage(1)
    setOwnerScopedPage(1)
  }

  const handlePendingFilterRowChange = (rowId, updates) => {
    setPendingFilterRows((currentValue) => currentValue.map((row) => (
      row.id === rowId
        ? {
          ...row,
          ...updates,
          negated: Object.prototype.hasOwnProperty.call(updates, 'fieldKey') && isOwnerFilterField(updates.fieldKey)
            ? false
            : updates.negated !== undefined
              ? updates.negated
              : row.negated,
          value: Object.prototype.hasOwnProperty.call(updates, 'operator') && updates.operator === 'empty'
            ? ''
            : updates.value !== undefined
              ? updates.value
              : row.value,
        }
        : row
    )))
  }

  const handleAddPendingFilterRow = () => {
    setPendingFilterRows((currentValue) => [...currentValue, createDealFilterRow()])
  }

  const handleRemovePendingFilterRow = (rowId) => {
    setPendingFilterRows((currentValue) => {
      if (currentValue.length <= 1) {
        return [createDealFilterRow()]
      }

      return currentValue.filter((row) => row.id !== rowId)
    })
  }

  const handleTogglePendingFilterAction = (actionKey) => {
    setPendingDealFilterActionKeys((currentValue) => (
      currentValue.includes(actionKey)
        ? currentValue.filter((key) => key !== actionKey)
        : [...currentValue, actionKey]
    ))
  }

  const handleApplyPendingOrderBy = () => {
    if (!pendingOrderByKey) {
      return
    }

    setGridSortConfig((currentValue) => (
      getGridSortConfigForKey(
        pendingOrderByKey
      )
    ))
  }

  const handleClearPendingOrderBy = () => {
    setPendingOrderByKey('')
    setGridSortConfig(DEFAULT_GRID_SORT_CONFIG)
  }

  const handleOpenBoardActionModal = (type, deal) => {
    setOpenBoardActionMenuDealId('')

    if (type === 'reminder') {
      setReminderForm({
        reminderDate: deal.reminderDate || '',
        reminderTime: deal.reminderTime || '09:00',
        reminderMode: deal.reminderMode || '',
        reminderNote: deal.reminderNote || '',
      })
    }

    if (type === 'reassign') {
      const currentOwner = availableUsers.find((entry) => normalizeOwnerValue(entry.name) === normalizeOwnerValue(deal.dealOwner || deal.ownerName))
      setReassignOwnerId(currentOwner?.id || deal.userId || '')
      setReassignReminderAction('retain')
      setReassignAddReminder(false)
    }

    if (type === 'changeType') {
      setChangeTypeValue(normalizeDealMarketingValue(deal.dealType || deal.customerCategory || ''))
    }

    setBoardActionModal({ type, deal })
  }

  const closeBoardActionModal = () => {
    setBoardActionModal({ type: '', deal: null })
    setReminderForm({ reminderDate: '', reminderTime: '09:00', reminderMode: '', reminderNote: '' })
    setReassignOwnerId('')
    setReassignReminderAction('retain')
    setReassignAddReminder(false)
    setChangeTypeValue('')
  }

  const handleSaveReminder = async (event) => {
    event.preventDefault()
    const activeDeal = boardActionModal.deal

    if (!activeDeal) return

    const result = await updateDeal(activeDeal.id, {
      reminderDate: reminderForm.reminderDate,
      reminderTime: reminderForm.reminderTime || '09:00',
      reminderMode: reminderForm.reminderMode,
      reminderNote: reminderForm.reminderNote.trim(),
    })

    if (result.success) {
      if (reminderForm.reminderDate) {
        const reminderTime = reminderForm.reminderTime || '09:00'
        const remindAt = `${reminderForm.reminderDate}T${reminderTime}:00`
        const reminderTitle = `${activeDeal.name || activeDeal.dealName || 'Deal'} reminder`
        const assignedTo = activeDeal.assignedTo || activeDeal.ownerUserId || activeDeal.userId || user?.id

        await Promise.allSettled([
          reminderApi.createReminder({
            title: reminderTitle,
            message: reminderForm.reminderNote.trim(),
            remindAt,
            status: 'scheduled',
            relatedEntityType: 'deal',
            relatedEntityId: activeDeal.id,
            assignedTo,
            reminderDate: reminderForm.reminderDate,
            reminderTime,
            reminderMode: reminderForm.reminderMode,
          }),
          calendarApi.createEvent({
            title: reminderTitle,
            description: reminderForm.reminderNote.trim(),
            startAt: remindAt,
            category: 'Reminder',
            relatedEntityType: 'deal',
            relatedEntityId: activeDeal.id,
            assignedTo,
          }),
        ])
      }
      addNotification('success', 'Success', 'Deal reminder updated successfully')
      closeBoardActionModal()
    } else {
      addNotification('error', 'Error', result.message)
    }
  }

  const handleReassignDeal = async (event) => {
    event.preventDefault()
    const activeDeal = boardActionModal.deal
    const nextOwner = availableUsers.find((entry) => entry.id === reassignOwnerId)

    if (!activeDeal || !nextOwner) {
      addNotification('error', 'Error', 'Please select a valid owner')
      return
    }

    const result = await updateDeal(activeDeal.id, {
      userId: nextOwner.id,
      ownerUserId: nextOwner.id,
      ownerId: nextOwner.id,
      assignedTo: nextOwner.id,
      assignedUserId: nextOwner.id,
      ownerName: nextOwner.name,
      dealOwner: nextOwner.name,
      reminderAction: reassignReminderAction,
      addReminderToNewOwner: reassignAddReminder,
    })

    if (result.success) {
      addNotification('success', 'Success', 'Deal reassigned successfully')
      closeBoardActionModal()
    } else {
      addNotification('error', 'Error', result.message)
    }
  }

  const handleDeleteDeal = async () => {
    const activeDeal = boardActionModal.deal

    if (!activeDeal) return

    const result = await deleteDeal(activeDeal.id)

    if (result.success) {
      addNotification('success', 'Success', 'Deal deleted successfully')
      closeBoardActionModal()
    } else {
      addNotification('error', 'Error', result.message)
    }
  }

  const handleSaveDealType = async (event) => {
    event.preventDefault()
    const activeDeal = boardActionModal.deal
    const nextDealType = normalizeDealMarketingValue(changeTypeValue)

    if (!activeDeal) return
    if (!nextDealType) {
      addNotification('error', 'Change Type', 'Please select a deal type.')
      return
    }

    const result = await updateDeal(activeDeal.id, {
      dealType: nextDealType,
      customerCategory: nextDealType,
      updatedAt: new Date().toISOString(),
    })

    if (result.success) {
      addNotification('success', 'Change Type', `Deal type changed to ${nextDealType}.`)
      closeBoardActionModal()
    } else {
      addNotification('error', 'Change Type', result.message || 'Unable to change deal type.')
    }
  }

  const defaultColumns = [
    { key: 'id', label: 'ID', width: '120px' },
    { key: 'name', label: 'Deal Name' },
    {
      key: 'value',
      label: 'Value',
      width: '150px',
      render: (value) => formatCurrency(value),
    },
    {
      key: 'status',
      label: 'Status',
      width: '120px',
      render: (value) => (
        <Badge variant={getStatusColor(value)}>{value}</Badge>
      ),
    },
    {
      key: 'closeDate',
      label: 'Close Date',
      width: '150px',
      render: (value) => value ? formatDate(value) : '-',
    },
    {
      key: 'actions',
      label: 'Actions',
      width: '100px',
      render: (_, row) => (
        <Button size="small" variant="outline" onClick={() => (isConvertedDealRecord(row) ? handleViewDeal(row) : handleEdit(row))}>
          {isConvertedDealRecord(row) ? 'View' : 'Edit'}
        </Button>
      ),
    },
  ]

  const searchColumns = [
    {
      key: 'dealNumber',
      label: 'Deal No.',
      render: (_, row) => (
        <div className="deals-crm-number-menu" data-deal-card-menu>
          <button
            type="button"
            className="deals-crm-number-button deals-crm-number-button-label"
            onClick={() => handleViewDeal(row)}
          >
            <span className="deals-crm-number-button-content">
              <span>{row.dealNumber || ''}</span>
            </span>
          </button>
          {renderInlineDealActionMenu(row)}
        </div>
      ),
    },
    { key: 'name', label: 'Deal Name' },
    {
      key: 'dealDate',
      label: 'Deal Date',
      render: (value, row) => formatDate(value || row.createdAt || '') || '-',
    },
    {
      key: 'dealOwner',
      label: 'Deal Owner',
      render: (_, row) => row.dealOwnerDisplay || row.dealOwner || row.ownerName || '-',
    },
    { key: 'dealType', label: 'Deal Type' },
    {
      key: 'status',
      label: 'Deal Status',
      width: '120px',
      render: (value) => (
        <Badge variant={getStatusColor(value)}>{value}</Badge>
      ),
    },
    {
      key: 'value',
      label: 'Deal Value',
      render: (value, row) => value !== null && value !== undefined && value !== '' ? formatCurrency(value, row.currency) : '-',
    },
    { key: 'quotationCustomerStatus', label: 'Status Of Customer as per Quotation Given' },
    { key: 'orderCustomerStatus', label: 'Status Of Customer as per Order Received' },
    {
      key: 'poValue',
      label: 'PO Value',
      render: (value, row) => value !== null && value !== undefined && value !== '' ? formatCurrency(value, row.currency) : '-',
    },
    { key: 'jobNo', label: 'Job No.' },
    { key: 'customerName', label: 'Customer Name' },
  ]

  const columns = effectiveVariantKey === 'search' ? searchColumns : defaultColumns

  const totalValue = displayedDeals.reduce((sum, deal) => sum + (deal.value || 0), 0)

  const renderInlineDealActionMenu = (deal) => {
    const activeDeal = deal?.rawDeal || deal
    const isMenuOpen = openBoardActionMenuDealId === String(activeDeal?.id || '')
    const isConvertedDeal = isConvertedDealRecord(activeDeal)

    return (
      <>
        <button
          type="button"
          className="deals-crm-number-button deals-crm-number-button-arrow"
          aria-label={`Deal ${activeDeal?.dealNumber || ''}`}
          onClick={(event) => handleToggleDealMenu(event, activeDeal?.id)}
        >
          <FaEllipsisV />
        </button>

        {isMenuOpen && dealTableMenuPosition ? createPortal(
          (
            <div
              data-deal-card-menu
              className="deals-crm-row-action-menu deals-board-card-action-menu deals-crm-row-action-menu-portal"
              style={{
                position: 'fixed',
                top: `${dealTableMenuPosition.top}px`,
                left: `${dealTableMenuPosition.left}px`,
                right: 'auto',
                width: '188px',
                zIndex: 2147483600,
              }}
            >
              <button type="button" className="deals-board-card-action-item" onClick={() => handleViewDeal(activeDeal)}>
                <FaTable />
                <span>{isConvertedDeal ? 'View Converted Deal' : 'View Deal'}</span>
              </button>
              {effectiveVariantKey === 'view' || effectiveVariantKey === 'search' ? null : (
                <button type="button" className="deals-board-card-action-item" onClick={() => handleManageDeal(activeDeal)} disabled={isConvertedDeal}>
                  <FaEdit />
                  <span>Manage Deal</span>
                </button>
              )}
              <button type="button" className="deals-board-card-action-item deals-board-card-action-item-orange" onClick={() => handleOpenDealModalActionFromMenu('reminder', activeDeal)} disabled={isConvertedDeal}>
                <FaBell />
                <span>Add Reminder</span>
              </button>
              <button type="button" className="deals-board-card-action-item" onClick={() => handleOpenDealActionPage('change-status', activeDeal)} disabled={isConvertedDeal}>
                <FaSyncAlt />
                <span>Change Status</span>
              </button>
              <button type="button" className="deals-board-card-action-item" onClick={() => handleGenerateQuotationForDeal(activeDeal)} disabled={isConvertedDeal}>
                <FaFileAlt />
                <span>Generate Quotation</span>
              </button>
              <button type="button" className="deals-board-card-action-item" onClick={() => handleOpenDealActionPage('re-assign-deal', activeDeal)} disabled={isConvertedDeal}>
                <FaUser />
                <span>Re-Assign Deal</span>
              </button>
            </div>
          ),
          document.body
        ) : null}
      </>
    )
  }

  const renderDealGridCellContent = (row, columnKey) => {
    if (columnKey === 'reasonForLostOrder') {
      const selectedReason = normalizeLostOrderReason(row.reasonForLostOrder)
      return (
        <span className="deals-crm-lost-reason-display" title={getLostOrderReasonLabel(selectedReason)}>
          <span className="deals-crm-lost-reason-label">
            {selectedReason ? getLostOrderReasonLabel(selectedReason) : ''}
          </span>
        </span>
      )
    }

    return row[columnKey] || ''
  }

  const renderOwnerScopedCell = (row, columnKey) => {
    if (columnKey === 'dealNumber') {
      return (
        <td className="deals-crm-number-cell">
          <div className="deals-crm-number-menu" data-deal-card-menu>
            <button
              type="button"
              className="deals-crm-number-button deals-crm-number-button-label"
              onClick={() => handleViewDeal(row)}
            >
              <span className="deals-crm-number-button-content">
                <span>{row.dealNumber}</span>
              </span>
            </button>
            {renderInlineDealActionMenu(row)}
          </div>
        </td>
      )
    }

    return <td>{renderDealGridCellContent(row, columnKey)}</td>
  }

  const hasActiveAdvancedFilters = (
    hasAnyActiveFilters(gridFilters)
    || hasAnyRuleFilters(gridFilterRules)
    || Array.isArray(dashboardDealDrilldown?.dealIds)
    && dashboardDealDrilldown.dealIds.length > 0
    || Boolean(appliedOwnerWiseOwnerId && appliedOwnerWiseOwnerId !== 'all')
    || appliedClassificationOwners.length > 0
  )
  const showInlineGridFilters = showGridFilters

  const renderDealToolModals = () => (
    <>
      <Modal
        isOpen={isFieldSelectorOpen}
        onClose={handleCloseFieldSelector}
        size="large"
        showClose={false}
      >
        <div className="deals-tool-panel">
          <section className="deals-tool-popup-section">
            <div className="deals-tool-popup-header">
              <span>Classification Filter</span>
              <button
                type="button"
                className="deals-tool-popup-close"
                onClick={handleCloseFieldSelector}
                aria-label="Close classification filter"
              >
                <FaTimes />
              </button>
            </div>

            <div className="deals-tool-popup-body">
              <div className="deals-tool-classification-box">
                <div className="deals-tool-classification-box-label">Deal Owner</div>

                <div className="deals-tool-classification-list">
                  <label className="deals-tool-checkbox deals-tool-checkbox-compact">
                    <input
                      type="checkbox"
                      checked={pendingClassificationOwners.length === classificationOwnerNames.length && classificationOwnerNames.length > 0}
                      onChange={handleToggleAllClassificationOwners}
                    />
                    <span>Check All</span>
                  </label>

                  {classificationOwnerNames.map((ownerName) => (
                    <label key={ownerName} className="deals-tool-checkbox deals-tool-checkbox-compact">
                      <input
                        type="checkbox"
                        checked={pendingClassificationOwners.includes(ownerName)}
                        onChange={() => handleToggleClassificationOwner(ownerName)}
                      />
                      <span>{ownerName}</span>
                    </label>
                  ))}
                </div>

                <div className="deals-tool-classification-actions">
                  <Button
                    type="button"
                    variant="success"
                    size="small"
                    icon={<FaArrowRight />}
                    onClick={handleLoadClassificationOwners}
                  >
                    Lead
                  </Button>
                </div>
              </div>
            </div>
          </section>

          <section className="deals-tool-popup-section">
            <div className="deals-tool-popup-header">
              <span>Select Deal Fields</span>
            </div>

            <div className="deals-tool-popup-body">
              <div className="deals-tool-panel-copy">
                Choose which columns should stay visible in {isOwnerScopedAdminView ? viewConfig.title : 'Search Deal'}.
              </div>

              <div className="deals-tool-field-selector-layout">
                <div className="deals-tool-field-card">
                  <div className="deals-tool-field-card-header">
                    <div>
                      <div className="deals-tool-field-card-title">Deal Fields</div>
                      <div className="deals-tool-field-card-hint">Available columns for this view</div>
                    </div>
                    <button
                      type="button"
                      className="deals-tool-text-action"
                      onClick={() => setPendingVisibleGridColumnKeys(fieldSelectorColumns.map((column) => column.key))}
                    >
                      Select All
                    </button>
                  </div>

                  <div className="deals-tool-field-list">
                    {fieldSelectorColumns.map((column) => {
                      const isRequiredColumn = isRequiredVisibleFieldKey(column.key)

                      return (
                        <label key={column.key} className={`deals-tool-checkbox ${isRequiredColumn ? 'deals-tool-checkbox-required' : ''}`}>
                          <input
                            type="checkbox"
                            checked={pendingVisibleGridColumnKeys.includes(column.key)}
                            onChange={() => handleToggleVisibleGridColumn(column.key)}
                            disabled={isRequiredColumn}
                          />
                          <span className="deals-tool-checkbox-icon"><FaListUl /></span>
                          <span className="deals-tool-checkbox-text">{column.label}</span>
                        </label>
                      )
                    })}
                  </div>
                </div>

                <div className="deals-tool-field-card">
                  <div className="deals-tool-field-card-header">
                    <div>
                      <div className="deals-tool-field-card-title">Selected Fields</div>
                      <div className="deals-tool-field-card-hint">Drag and drop to reorder visible columns</div>
                    </div>
                  </div>

                  <div className="deals-tool-field-list">
                    {selectedFieldSelectorColumns.length > 0 ? (
                      selectedFieldSelectorColumns.map((column) => {
                        const isRequiredColumn = isRequiredVisibleFieldKey(column.key)
                        const isDragging = draggedSelectedFieldKey === column.key

                        return (
                          <div
                            key={column.key}
                            className={`deals-tool-selected-row ${isRequiredColumn ? 'deals-tool-selected-row-required' : ''} ${isDragging ? 'deals-tool-selected-row-dragging' : ''}`}
                            draggable={!isRequiredColumn}
                            onDragStart={() => setDraggedSelectedFieldKey(column.key)}
                            onDragEnd={() => setDraggedSelectedFieldKey('')}
                            onDragOver={(event) => event.preventDefault()}
                            onDrop={() => {
                              handleReorderSelectedField(draggedSelectedFieldKey, column.key)
                              setDraggedSelectedFieldKey('')
                            }}
                          >
                            <span className="deals-tool-selected-grip">::</span>
                            <span className="deals-tool-selected-label">{column.label}</span>
                            {isRequiredColumn ? <span className="deals-tool-selected-badge">Required</span> : null}
                            {!isRequiredColumn ? (
                              <button
                                type="button"
                                className="deals-tool-selected-remove"
                                onClick={(event) => {
                                  event.stopPropagation()
                                  handleRemoveVisibleGridColumn(column.key)
                                }}
                                aria-label={`Remove ${column.label}`}
                                title={`Remove ${column.label}`}
                              >
                                <FaTimes />
                              </button>
                            ) : null}
                          </div>
                        )
                      })
                    ) : (
                      <div className="deals-tool-selected-empty">Select at least one field to keep the deal grid visible.</div>
                    )}
                  </div>
                </div>
              </div>

              <div className="deals-tool-field-actions">
                <Button type="button" variant="danger" size="small" onClick={handleCloseFieldSelector}>
                  Close
                </Button>
                <Button type="button" size="small" onClick={handleApplyVisibleGridColumns}>
                  Apply
                </Button>
                <Button type="button" variant="success" size="small" onClick={handleSaveAndApplyVisibleGridColumns}>
                  Save & Apply
                </Button>
              </div>
            </div>
          </section>
        </div>
      </Modal>

        <Modal
        isOpen={isFilterDialogOpen}
        onClose={handleCloseFilterDialog}
        title={isOwnerScopedAdminView ? `Filter ${viewConfig.title}` : 'Filter Search Deal'}
        size="large"
        showClose={false}
        headerActions={(
          <>
            <Button type="button" variant="danger" size="small" onClick={handleCloseFilterDialog}>
              Close
            </Button>
            <Button type="button" size="small" onClick={handleApplyFilterDialog}>
              Apply
            </Button>
            <Button type="button" variant="success" size="small" onClick={handleSaveAndApplyFilterDialog}>
              Save & Apply
            </Button>
          </>
        )}
      >
        <div className="deals-tool-panel">
          <div className="deals-tool-panel-copy">Set order, filters, and action options together in one Search Deal setup panel.</div>

          <section className="deals-tool-config-section">
            <div className="deals-tool-config-heading">
              <span>Add Order By</span>
              <span className="deals-tool-config-pill">YES</span>
            </div>
            <div className="deals-tool-config-card">
              <div className="deals-tool-config-titlebar">Order By</div>
              <div className="deals-tool-config-body">
                <div className="deals-tool-order-row">
                  <label className="deals-board-action-field deals-tool-filter-field-compact deals-tool-order-field">
                    <span className="sr-only">Order By Field</span>
                    <select
                      value={pendingOrderByKey}
                      onChange={(event) => setPendingOrderByKey(event.target.value)}
                      aria-label="Order By Field"
                    >
                      <option value="">Select</option>
                      {filterDialogColumns.map((column) => (
                        <option key={column.key} value={column.key}>
                          {column.label}
                        </option>
                      ))}
                    </select>
                  </label>

                  <div className="deals-tool-filter-actions">
                    <button
                      type="button"
                      className="deals-tool-filter-action-button"
                      onClick={handleApplyPendingOrderBy}
                      aria-label="Apply order by"
                      title="Apply order by"
                    >
                      <FaSave />
                    </button>
                    <button
                      type="button"
                      className="deals-tool-filter-action-button deals-tool-filter-action-button-danger"
                      onClick={handleClearPendingOrderBy}
                      aria-label="Clear order by"
                      title="Clear order by"
                    >
                      <FaTimes />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </section>

          <section className="deals-tool-config-section">
            <div className="deals-tool-config-heading">
              <span>Owner Wise Deal</span>
              <span className="deals-tool-config-pill">YES</span>
            </div>

            <section className="deals-tool-popup-section">
              <div className="deals-tool-popup-header">
                <span>Owner Wise Deal</span>
                <button
                  type="button"
                  className="deals-tool-popup-close"
                  onClick={handleCloseFilterDialog}
                  aria-label="Close owner wise filter"
                >
                  <FaTimes />
                </button>
              </div>

              <div className="deals-tool-popup-body">
                <div className="deals-tool-classification-box">
                  <div className="deals-tool-classification-box-label">Deal Owner</div>

                  <label className="deals-board-action-field deals-tool-filter-field-compact deals-tool-ownerwise-select">
                    <span className="sr-only">Select Owner</span>
                    <select
                      value={pendingOwnerWiseOwnerId}
                      onChange={(event) => setPendingOwnerWiseOwnerId(event.target.value)}
                      aria-label="Select owner wise deal owner"
                    >
                      {ownerWiseDialogOptions.map((option) => (
                        <option key={option.value || 'select-owner'} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                  </label>

                  <div className="deals-tool-field-actions deals-tool-ownerwise-actions">
                    <Button type="button" size="small" onClick={() => applyOwnerWiseDealFilter()}>
                      Apply
                    </Button>
                    <Button type="button" variant="success" size="small" onClick={() => applyOwnerWiseDealFilter({ persistPreferences: true })}>
                      Save & Apply
                    </Button>
                    <Button type="button" variant="danger" size="small" onClick={handleCloseFilterDialog}>
                      Close
                    </Button>
                  </div>
                </div>
              </div>
            </section>
          </section>

          <section className="deals-tool-config-section">
            <div className="deals-tool-config-heading">
              <span>Owner Classification</span>
              <span className="deals-tool-config-pill">YES</span>
            </div>

            <section className="deals-tool-popup-section">
              <div className="deals-tool-popup-header">
                <span>Classification Filter</span>
              </div>

              <div className="deals-tool-popup-body">
                <div className="deals-tool-classification-box">
                  <div className="deals-tool-classification-box-label">Deal Owner</div>

                  <div className="deals-tool-classification-list">
                    <label className="deals-tool-checkbox deals-tool-checkbox-compact">
                      <input
                        type="checkbox"
                        checked={pendingClassificationOwners.length === classificationOwnerNames.length && classificationOwnerNames.length > 0}
                        onChange={handleToggleAllClassificationOwners}
                      />
                      <span>Check All</span>
                    </label>

                    {classificationOwnerNames.map((ownerName) => (
                      <label key={`filter-classification-${ownerName}`} className="deals-tool-checkbox deals-tool-checkbox-compact">
                        <input
                          type="checkbox"
                          checked={pendingClassificationOwners.includes(ownerName)}
                          onChange={() => handleToggleClassificationOwner(ownerName)}
                        />
                        <span>{ownerName}</span>
                      </label>
                    ))}
                  </div>

                  <div className="deals-tool-classification-actions">
                    <Button
                      type="button"
                      variant="success"
                      size="small"
                      icon={<FaArrowRight />}
                      onClick={handleLoadClassificationOwners}
                    >
                    Lead
                    </Button>
                  </div>
                </div>
              </div>
            </section>
          </section>

          <section className="deals-tool-config-section">
            <div className="deals-tool-config-heading">
              <span>Add Additional Filters</span>
              <span className="deals-tool-config-pill">YES</span>
            </div>
            <div className="deals-tool-config-card">
              <div className="deals-tool-config-titlebar">Configure Filters</div>
              <div className="deals-tool-config-body">
                <div className="deals-tool-filter-grid">
                  {pendingFilterRows.map((row, index) => {
                    const selectedColumn = filterDialogColumns.find((column) => column.key === row.fieldKey) || null
                    const isOwnerRule = isOwnerFilterField(row.fieldKey)
                    const operatorOptions = isOwnerRule ? DEAL_OWNER_FILTER_OPERATORS : DEAL_FILTER_OPERATORS
                    const selectedFieldKeys = new Set(
                      pendingFilterRows
                        .filter((entry) => entry.id !== row.id)
                        .map((entry) => entry.fieldKey)
                        .filter(Boolean)
                    )

                    return (
                      <div key={row.id} className="deals-tool-filter-row">
                        <div className="deals-tool-filter-prefix">{index === 0 ? 'If' : 'And'}</div>

                        <label className="deals-board-action-field deals-tool-filter-field deals-tool-filter-field-compact">
                          <span className="sr-only">Select Field</span>
                          <select
                            value={row.fieldKey}
                            onChange={(event) => handlePendingFilterRowChange(row.id, {
                              fieldKey: event.target.value,
                              operator: '',
                              value: '',
                              negated: false,
                            })}
                            aria-label="Select Field"
                          >
                            <option value="">Select</option>
                            {filterDialogColumns.map((column) => (
                              <option
                                key={column.key}
                                value={column.key}
                                disabled={selectedFieldKeys.has(column.key)}
                              >
                                {column.label}
                              </option>
                            ))}
                          </select>
                        </label>

                        <div className="deals-tool-filter-operator-copy">{isOwnerRule ? '' : 'is'}</div>

                        {isOwnerRule ? <div className="deals-tool-filter-negation deals-tool-filter-negation-hidden" aria-hidden="true" /> : (
                          <label className="deals-tool-filter-negation">
                            <input
                              type="checkbox"
                              checked={row.negated}
                              onChange={(event) => handlePendingFilterRowChange(row.id, { negated: event.target.checked })}
                              aria-label="Not"
                            />
                            <span>not</span>
                          </label>
                        )}

                        <label className="deals-board-action-field deals-tool-filter-mode deals-tool-filter-field-compact">
                          <span className="sr-only">Filter Condition</span>
                          <select
                            value={row.operator}
                            onChange={(event) => handlePendingFilterRowChange(row.id, {
                              operator: event.target.value,
                            })}
                            disabled={!row.fieldKey}
                            aria-label="Filter Condition"
                          >
                            <option value="">Select</option>
                            {operatorOptions.map((entry) => (
                              <option key={entry.value} value={entry.value}>
                                {entry.label}
                              </option>
                            ))}
                          </select>
                        </label>

                        {row.operator && row.operator !== 'empty' ? (
                          <label className="deals-board-action-field deals-tool-filter-value deals-tool-filter-field-compact">
                            <span className="sr-only">Filter Value</span>
                            {isOwnerRule ? (
                              <select
                                value={row.value}
                                onChange={(event) => handlePendingFilterRowChange(row.id, { value: event.target.value })}
                                disabled={!row.fieldKey || !row.operator}
                                aria-label="Owner Filter Value"
                              >
                                {ownerRuleOptions.map((option) => (
                                  <option key={`${row.id}-${option.value || 'select-owner'}`} value={option.value}>
                                    {option.label}
                                  </option>
                                ))}
                              </select>
                            ) : (
                              <input
                                type="text"
                                value={row.value}
                                onChange={(event) => handlePendingFilterRowChange(row.id, { value: event.target.value })}
                                placeholder={`Search ${selectedColumn?.label || 'Value'}`}
                                disabled={!row.fieldKey || !row.operator}
                                aria-label="Filter Value"
                              />
                            )}
                          </label>
                        ) : null}

                        <div className="deals-tool-filter-actions">
                          <button
                            type="button"
                            className="deals-tool-filter-action-button"
                            onClick={handleAddPendingFilterRow}
                            aria-label="Add filter row"
                            title="Add filter row"
                          >
                            <FaPlus />
                          </button>
                          <button
                            type="button"
                            className="deals-tool-filter-action-button deals-tool-filter-action-button-danger"
                            onClick={() => handleRemovePendingFilterRow(row.id)}
                            aria-label="Remove filter row"
                            title="Remove filter row"
                          >
                            <FaTrash />
                          </button>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            </div>
          </section>

          <section className="deals-tool-config-section">
            <div className="deals-tool-config-heading">
              <span>Actions</span>
            </div>
            <div className="deals-tool-actions-grid">
              {DEAL_FILTER_ACTION_OPTIONS.map((action) => (
                <label key={action.key} className="deals-tool-action-toggle">
                  <input
                    type="checkbox"
                    checked={pendingDealFilterActionKeys.includes(action.key)}
                    onChange={() => handleTogglePendingFilterAction(action.key)}
                  />
                  <span>{action.label}</span>
                </label>
              ))}
            </div>
          </section>

          <div className="modal-actions">
            <Button type="button" variant="outline" onClick={handleClearFilterDialog}>
              Clear Filters
            </Button>
            <Button type="button" variant="outline" onClick={handleCloseFilterDialog}>
              Cancel
            </Button>
          </div>
        </div>
      </Modal>
    </>
  )

  if (isOwnerScopedAdminView) {
    const recordTitle = `${viewConfig.title} - ${sortedOwnerScopedRows.length} records`
    const emptyStateMessage = effectiveVariantKey === 'projectDetails'
      ? 'No project-linked deals match the current filters.'
      : effectiveVariantKey === 'ahmadabad'
        ? 'No Ahmedabad deals match the current filters.'
        : effectiveVariantKey === 'vadodara'
          ? 'No Vadodara deals match the current filters.'
        : 'No owner-wise deals match the current filters.'

    return (
      <div className="deals-page deals-ownerwise-page">
        <section className="deals-ownerwise-shell">
          <div className="deals-ownerwise-topbar">
            <h1>{recordTitle}</h1>

            <div className="deals-ownerwise-toolbar">
              <button type="button" className="deals-ownerwise-toolbar-icon deals-ownerwise-toolbar-icon-orange" onClick={() => navigate('/admin/deals/add')} aria-label="Add deal" title="Add Deal">
                <FaPlus />
              </button>
              <button
                type="button"
                className={`deals-ownerwise-toolbar-icon deals-ownerwise-toolbar-icon-green ${hasActiveAdvancedFilters ? 'deals-ownerwise-toolbar-icon-active' : ''}`}
                onClick={openFilterDialog}
                aria-label="Filter"
                title="Filter"
              >
                <FaFilter />
              </button>
              <button
                type="button"
                className="deals-ownerwise-toolbar-icon deals-ownerwise-toolbar-icon-orange"
                onClick={handleRefreshDeals}
                aria-label="Refresh"
                title="Refresh"
              >
                <FaSyncAlt />
              </button>
              <button
                type="button"
                className="deals-ownerwise-toolbar-icon deals-ownerwise-toolbar-icon-orange"
                onClick={() => handleExportDeals('excel')}
                aria-label="Export"
                title="Export"
              >
                <FaFileExport />
              </button>
            </div>
          </div>

          <div className="deals-ownerwise-filters">
            <label className="deals-ownerwise-owner-filter">
              <span>Role Selection</span>
              <select value={appliedOwnerWiseOwnerId || filters.ownerUserId || 'all'} onChange={(event) => handleOwnerFilterChange(event.target.value)} aria-label="Filter deals by owner">
                {roleSelectionOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>
          </div>

          <div className="deals-ownerwise-summary">
            {effectiveVariantKey === 'projectDetails' ? (
              <>
                <div className="deals-ownerwise-summary-line">Criteria: <strong>Project Name is not empty</strong></div>
                <div className="deals-ownerwise-summary-line">Total Records: <strong>{sortedOwnerScopedRows.length}</strong></div>
              </>
            ) : (
              <div className="deals-ownerwise-summary-line">Total Records: <strong>{sortedOwnerScopedRows.length}</strong></div>
            )}
          </div>

          <div className={`deals-crm-grid-shell ${compactGrid ? 'deals-crm-grid-shell-compact' : ''}`}>
              <div className="deals-crm-table-wrap">
                <table
                  className={`deals-crm-table deals-ownerwise-table ${
                    effectiveVariantKey === 'projectDetails'
                      ? 'deals-projectdetails-table'
                      : effectiveVariantKey === 'ahmadabad'
                        ? 'deals-ahmadabad-table'
                        : effectiveVariantKey === 'vadodara'
                          ? 'deals-vadodara-table'
                        : ''
                  }`}
                >
                  <thead>
                    {activeOwnerScopedColumns.some((col) => col.groupLabel) ? (
                      <>
                        <tr className="deals-crm-head-row">
                          {activeOwnerScopedColumns.map((column, index, arr) => {
                            if (column.groupLabel) {
                              if (index === 0 || arr[index - 1].groupLabel !== column.groupLabel) {
                                const colSpan = arr.filter((c) => c.groupLabel === column.groupLabel).length;
                                return (
                                  <th key={`group-${column.groupLabel}`} colSpan={colSpan} title={column.groupLabel} style={{ textAlign: 'center' }}>
                                    {column.groupLabel}
                                  </th>
                                );
                              }
                              return null;
                            }
                            return (
                              <th key={column.key} title={column.label} rowSpan={2}>
                                <button
                                  type="button"
                                  className={`deals-crm-sort-button ${column.key === 'reasonForLostOrder' ? 'deals-crm-sort-button-no-indicator' : ''} ${gridSortConfig.key === column.key ? 'deals-crm-sort-button-active' : ''}`}
                                  onClick={() => handleGridSort(column.key)}
                                >
                                  <span>{column.label}</span>
                                  <span className="deals-crm-sort-indicator">
                                    {gridSortConfig.key === column.key
                                      ? (gridSortConfig.direction === 'asc' ? '▲' : '▼')
                                      : '↕'}
                                  </span>
                                </button>
                              </th>
                            );
                          })}
                        </tr>
                        <tr className="deals-crm-head-row">
                          {activeOwnerScopedColumns.map((column) => {
                            if (column.groupLabel) {
                              return (
                                <th key={column.key} title={column.label}>
                                  <button
                                    type="button"
                                    className={`deals-crm-sort-button ${column.key === 'reasonForLostOrder' ? 'deals-crm-sort-button-no-indicator' : ''} ${gridSortConfig.key === column.key ? 'deals-crm-sort-button-active' : ''}`}
                                    onClick={() => handleGridSort(column.key)}
                                  >
                                    <span>{column.label}</span>
                                    <span className="deals-crm-sort-indicator">
                                      {gridSortConfig.key === column.key
                                        ? (gridSortConfig.direction === 'asc' ? '▲' : '▼')
                                        : '↕'}
                                    </span>
                                  </button>
                                </th>
                              );
                            }
                            return null;
                          })}
                        </tr>
                      </>
                    ) : (
                      <tr className="deals-crm-head-row">
                        {activeOwnerScopedColumns.map((column) => (
                          <th key={column.key} title={column.label}>
                            <button
                              type="button"
                              className={`deals-crm-sort-button ${column.key === 'reasonForLostOrder' ? 'deals-crm-sort-button-no-indicator' : ''} ${gridSortConfig.key === column.key ? 'deals-crm-sort-button-active' : ''}`}
                              onClick={() => handleGridSort(column.key)}
                            >
                              <span>{column.label}</span>
                              <span className="deals-crm-sort-indicator">
                                {gridSortConfig.key === column.key
                                  ? (gridSortConfig.direction === 'asc' ? '▲' : '▼')
                                  : '↕'}
                              </span>
                            </button>
                          </th>
                        ))}
                      </tr>
                    )}

                    {showInlineGridFilters ? (
                      <tr className="deals-crm-filter-row">
                        {activeOwnerScopedColumns.map((column) => (
                          <th key={column.key}>
                            {column.key === 'location' || column.key === 'city' ? (
                              <select
                                value={ownerScopedFilters[column.key] || ''}
                                onChange={(event) => setOwnerScopedFilters((currentValue) => ({
                                  ...currentValue,
                                  [column.key]: event.target.value,
                                }))}
                                className="deals-crm-filter-input"
                              >
                                {CUSTOM_LOCATION_SELECT_OPTIONS.map((option) => (
                                  <option key={option.value || 'empty-city'} value={option.value}>{option.label}</option>
                                ))}
                              </select>
                            ) : (
                              <input
                                type="text"
                                value={ownerScopedFilters[column.key] || ''}
                                onChange={(event) => setOwnerScopedFilters((currentValue) => ({
                                  ...currentValue,
                                  [column.key]: event.target.value,
                                }))}
                                placeholder={`Search ${column.label}`}
                                className="deals-crm-filter-input"
                              />
                            )}
                          </th>
                        ))}
                      </tr>
                    ) : null}
                  </thead>

                  <tbody>
                    {paginatedOwnerScopedRows.length === 0 ? (
                      <tr className="deals-crm-row">
                        <td colSpan={activeOwnerScopedColumns.length} className="deals-crm-empty-table-cell">
                          No Records Found
                        </td>
                      </tr>
                    ) : paginatedOwnerScopedRows.map((row) => (
                      <tr key={row.id} className="deals-crm-row">
                        {activeOwnerScopedColumns.map((column) => (
                          <React.Fragment key={`${row.id}-${column.key}`}>
                            {renderOwnerScopedCell(row, column.key)}
                          </React.Fragment>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="deals-crm-footer">
                <div className="deals-crm-legend">
                  <span className="deals-crm-legend-title">Legend:</span>
                  <span className="deals-crm-legend-item">
                    <span className="deals-crm-legend-swatch deals-crm-legend-swatch-primary" />
                    Deals
                  </span>
                  <span className="deals-crm-legend-item">
                    <span className="deals-crm-legend-swatch deals-crm-legend-swatch-secondary" />
                    You Co-Owned Deals
                  </span>
                </div>

                <div className="deals-crm-footer-right">
                  <div className="deals-crm-footer-total">
                    Total records: <strong>{sortedOwnerScopedRows.length}</strong>
                  </div>

                  <div className="deals-crm-pagination">
                    <button
                      type="button"
                      className="deals-crm-pagination-button"
                      disabled={ownerScopedCurrentPageSafe === 1}
                      onClick={() => setOwnerScopedPage((currentValue) => Math.max(1, currentValue - 1))}
                    >
                      <span>prev</span>
                    </button>

                    {visibleOwnerScopedPages.map((pageNumber) => (
                      <button
                        key={pageNumber}
                        type="button"
                        className={`deals-crm-page-number ${pageNumber === ownerScopedCurrentPageSafe ? 'deals-crm-page-number-active' : ''}`}
                        onClick={() => setOwnerScopedPage(pageNumber)}
                      >
                        {pageNumber}
                      </button>
                    ))}

                    <button
                      type="button"
                      className="deals-crm-pagination-button"
                      disabled={ownerScopedCurrentPageSafe === ownerScopedTotalPages}
                      onClick={() => setOwnerScopedPage((currentValue) => Math.min(ownerScopedTotalPages, currentValue + 1))}
                    >
                      <span>next</span>
                    </button>
                  </div>
                </div>
              </div>
            </div>
        </section>

        {renderDealToolModals()}
      </div>
    )
  }

  if (isBoardView) {
    const allBoardStatusesSelected = pendingBoardStatuses.length === DEAL_BOARD_COLUMNS.length
    const boardOwnershipLabel = boardOwnership === 'me'
      ? 'Deals Owned By Me'
      : boardOwnership === 'coOwned'
        ? 'Deals Co-Owned By Me'
        : 'OverAll'

    const openBoardClassification = () => {
      setPendingBoardStatuses(appliedBoardStatuses)
      setIsBoardClassificationOpen(true)
    }
    const handleToggleBoardStatus = (columnKey) => {
      setPendingBoardStatuses((current) => (
        current.includes(columnKey) ? current.filter((key) => key !== columnKey) : [...current, columnKey]
      ))
    }
    const handleToggleAllBoardStatuses = () => {
      setPendingBoardStatuses((current) => (
        current.length === DEAL_BOARD_COLUMNS.length ? [] : DEAL_BOARD_COLUMNS.map((column) => column.key)
      ))
    }
    const handleLoadBoardClassification = () => {
      setAppliedBoardStatuses(pendingBoardStatuses)
      setIsBoardClassificationOpen(false)
      addNotification('success', 'Filter Applied', pendingBoardStatuses.length === DEAL_BOARD_COLUMNS.length
        ? 'Showing all deal classifications'
        : `Showing ${pendingBoardStatuses.length} classification(s)`)
    }
    const handleSelectBoardOwnership = (value) => {
      setBoardOwnership(value)
      setIsBoardOwnershipOpen(false)
    }

    const visibleBoardDealCount = boardColumns.reduce((sum, column) => sum + column.deals.length, 0)
    const boardOwnershipHeading = boardOwnership === 'me'
      ? 'Owned By Me'
      : boardOwnership === 'coOwned'
        ? 'Co Owned By Me'
        : 'Overall'

    return (
      <div className="deals-page deals-board-page">
        <section className="deals-board-shell">
          <div className="deals-board-topbar">
            <h1>{customViewDefinition ? `${viewConfig.title} - ${visibleBoardDealCount} records` : `View Deal - ${boardOwnershipHeading} - ${visibleBoardDealCount} records`}</h1>

            <div className="deals-board-toolbar">
              <button type="button" className="deals-board-toolbar-button" onClick={() => navigate('/admin/deals/add')}>
                <FaPlus />
                <span>Add Deal</span>
              </button>
              <button
                type="button"
                className={`deals-board-toolbar-icon deals-board-toolbar-icon-panel ${appliedBoardStatuses.length !== DEAL_BOARD_COLUMNS.length ? 'deals-board-toolbar-icon-active' : ''}`}
                onClick={openBoardClassification}
                aria-label="Filter by deal classification"
                title="Filter by deal classification"
              >
                <FaListAlt />
              </button>
              <div
                className="deals-board-ownership-menu"
                data-board-ownership-menu
              >
                <button
                  type="button"
                  className={`deals-board-toolbar-icon deals-board-toolbar-icon-green ${boardOwnership !== 'overall' ? 'deals-board-toolbar-icon-active' : ''}`}
                  onClick={() => setIsBoardOwnershipOpen((value) => !value)}
                  aria-haspopup="menu"
                  aria-expanded={isBoardOwnershipOpen}
                  aria-label="Filter deals by ownership"
                  title={`Ownership: ${boardOwnershipLabel}`}
                >
                  <FaFilter />
                </button>
                {isBoardOwnershipOpen ? (
                  <div className="deals-board-ownership-popup" role="menu">
                    <button
                      type="button"
                      role="menuitem"
                      className={`deals-board-ownership-item ${boardOwnership === 'me' ? 'deals-board-ownership-item-active' : ''}`}
                      onClick={() => handleSelectBoardOwnership('me')}
                    >
                      Deals Owned By Me
                    </button>
                    <button
                      type="button"
                      role="menuitem"
                      className={`deals-board-ownership-item ${boardOwnership === 'coOwned' ? 'deals-board-ownership-item-active' : ''}`}
                      onClick={() => handleSelectBoardOwnership('coOwned')}
                    >
                      Deals Co-Owned By Me
                    </button>
                    <button
                      type="button"
                      role="menuitem"
                      className={`deals-board-ownership-item ${boardOwnership === 'overall' ? 'deals-board-ownership-item-active' : ''}`}
                      onClick={() => handleSelectBoardOwnership('overall')}
                    >
                      OverAll
                    </button>
                  </div>
                ) : null}
              </div>
            </div>
          </div>

          <div className="deals-board-searchbar">
            <FaSearch />
            <input
              type="text"
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
              placeholder="Search in Deal No., Deal Name, Account Name, Customer Name, Contact, Job No, Project Name, Deal Owner"
            />
          </div>

          <div className="deals-board-columns">
            {boardColumns.map((column) => {
              const visibleCount = boardVisibleCounts[column.key] || BOARD_INITIAL_LIMIT
              const visibleDeals = column.deals.slice(0, visibleCount)
              const canLoadMore = column.deals.length > visibleCount

              const isColumnDropTarget = boardDragOverColumnKey === column.key && boardDragDealId

              return (
                <section
                  key={column.key}
                  className={`deals-board-column ${isColumnDropTarget ? 'deals-board-column-drop-target' : ''}`}
                  onDragOver={(event) => handleBoardColumnDragOver(event, column.key)}
                  onDragLeave={() => handleBoardColumnDragLeave(column.key)}
                  onDrop={(event) => handleBoardColumnDrop(event, column.key)}
                >
                  <header className={`deals-board-column-header ${column.headerClassName}`}>
                    <button type="button" className="deals-board-column-edge">
                      <FaChevronDown />
                    </button>
                    <h2>{column.label}</h2>
                    <span className="deals-board-column-count">({column.deals.length})</span>
                  </header>

                  <div className="deals-board-column-body">
                    {visibleDeals.map((deal) => {
                      const isActionMenuOpen = openBoardActionMenuDealId === deal.id
                      const isCoOwned = deal.userId && deal.userId !== user?.id
                      const isDragging = boardDragDealId === String(deal.id)
                      const isExpanded = expandedBoardCardId === String(deal.id)
                      const compactPrimary = deal.accountName || deal.customerName || deal.projectName || 'No account linked'
                      const compactDate = formatGridDate(deal.dealDate || deal.createdAt)

                      return (
                        <article
                          key={deal.id}
                          className={`deals-board-card deals-board-card-compact ${isExpanded ? 'deals-board-card-expanded' : ''} ${isCoOwned ? 'deals-board-card-coowned' : ''} ${isDragging ? 'deals-board-card-dragging' : ''}`}
                          draggable
                          onDragStart={(event) => handleBoardCardDragStart(event, deal.id)}
                          onDragEnd={handleBoardCardDragEnd}
                        >
                          <div className="deals-board-card-header">
                            <div className="deals-board-card-meta">
                              <span>{deal.dealNumber}</span>
                              {renderDealBrandBadge(deal)}
                              <strong>{formatCurrency(deal.value || 0)}</strong>
                            </div>

                            <div className="deals-board-card-header-actions">
                              <button
                                type="button"
                                className="deals-board-card-expand-toggle"
                                onClick={() => setExpandedBoardCardId((currentValue) => currentValue === String(deal.id) ? '' : String(deal.id))}
                                aria-expanded={isExpanded}
                                aria-label={isExpanded ? `Collapse details for ${deal.dealNumber}` : `Expand details for ${deal.dealNumber}`}
                              >
                                <FaChevronDown className={`deals-board-card-expand-icon ${isExpanded ? 'deals-board-card-expand-icon-open' : ''}`} />
                              </button>

                              <div className="deals-board-card-actions" data-deal-card-menu>
                                <button
                                  type="button"
                                  className="deals-board-card-action-trigger deals-board-card-action-trigger-kebab"
                                  onClick={(event) => handleToggleDealMenu(event, deal.id)}
                                  aria-label={`Open actions for ${deal.dealNumber}`}
                                >
                                  <FaEllipsisV />
                                </button>

                                {isActionMenuOpen && dealTableMenuPosition ? createPortal(
                                  (
                                    <div
                                      data-deal-card-menu
                                      className="deals-board-card-action-menu deals-board-card-action-menu-portal"
                                      style={{
                                        position: 'fixed',
                                        top: `${dealTableMenuPosition.top}px`,
                                        left: `${dealTableMenuPosition.left}px`,
                                        right: 'auto',
                                        width: '188px',
                                        zIndex: 2147483600,
                                      }}
                                    >
                                      <button type="button" className="deals-board-card-action-item deals-board-card-action-item-orange" onClick={() => handleBoardActionMenuItem('reminder', deal)}>
                                        <FaBell />
                                        <span>Add Reminder</span>
                                      </button>
                                      <button type="button" className="deals-board-card-action-item deals-board-card-action-item-green" onClick={() => handleBoardActionMenuItem('generateQuotation', deal)}>
                                        <FaFileAlt />
                                        <span>Generate Quotation</span>
                                      </button>
                                      <button type="button" className="deals-board-card-action-item" onClick={() => handleBoardActionMenuItem('uploadQuotation', deal)}>
                                        <FaFileAlt />
                                        <span>Upload Quotation</span>
                                      </button>
                                      <button type="button" className="deals-board-card-action-item deals-board-card-action-item-green" onClick={() => handleBoardActionMenuItem('reassign', deal)}>
                                        <FaUser />
                                        <span>Re-Assign Deal</span>
                                      </button>
                                      <button type="button" className="deals-board-card-action-item" onClick={() => handleBoardActionMenuItem('sendMail', deal)}>
                                        <FaEnvelope />
                                        <span>Send Mail</span>
                                      </button>
                                      <button type="button" className="deals-board-card-action-item deals-board-card-action-item-danger" onClick={() => handleBoardActionMenuItem('delete', deal)}>
                                        <FaTrash />
                                        <span>Delete Deal</span>
                                      </button>
                                    </div>
                                  ),
                                  document.body
                                ) : null}
                              </div>
                            </div>
                          </div>

                          <div className="deals-board-card-summary" title={compactPrimary}>
                            <span className="deals-board-card-summary-primary">{compactPrimary}</span>
                            <span className="deals-board-card-summary-meta">
                              <span title={deal.dealOwner || 'Unassigned'}>{deal.dealOwnerDisplay || getCrmOwnerDisplay(deal.dealOwner) || deal.dealOwner || 'Unassigned'}</span>
                              <span aria-hidden="true">Ã‚Â·</span>
                              <span title={compactDate}>{compactDate}</span>
                            </span>
                          </div>

                          {isExpanded ? (
                            <div className="deals-board-card-main">
                              <div className="deals-board-card-avatar">
                                {(deal.name || 'D').charAt(0).toUpperCase()}
                              </div>

                              <div className="deals-board-card-content">
                                <div className="deals-board-card-title" title={deal.name || 'Untitled Deal'}>
                                  {deal.name || 'Untitled Deal'}
                                </div>

                                <ul className="deals-board-card-details">
                                  {deal.customerName && deal.customerName !== deal.accountName ? (
                                    <li title={deal.customerName}>{deal.customerName}</li>
                                  ) : null}
                                  {deal.contactPerson || deal.contactMobile ? (
                                    (() => {
                                      const contactLine = [deal.contactPerson, deal.contactMobile].filter(Boolean).join(' | ')
                                      return <li title={contactLine}>{contactLine}</li>
                                    })()
                                  ) : null}
                                  <li title={deal.dealType || 'No deal type'}>{deal.dealType || 'No deal type'}</li>
                                  <li title={deal.city || 'No city'}>{deal.city || 'No city'}</li>
                                  {deal.jobNo ? <li title={deal.jobNo}>{deal.jobNo}</li> : null}
                                </ul>
                              </div>
                            </div>
                          ) : null}
                        </article>
                      )
                    })}
                  </div>

                  <button
                    type="button"
                    className="deals-board-load-more"
                    disabled={!canLoadMore}
                    onClick={() => setBoardVisibleCounts((currentValue) => ({
                      ...currentValue,
                      [column.key]: currentValue[column.key] + BOARD_LOAD_MORE_COUNT,
                    }))}
                  >
                    {canLoadMore ? 'Load more' : 'End less'}
                  </button>
                </section>
              )
            })}
          </div>

          <div className="deals-board-footer">
            <span className="deals-board-footer-title">Legend:</span>
            <span className="deals-board-footer-item">
              <span className="deals-board-footer-swatch deals-board-footer-swatch-primary" />
              Deals
            </span>
            <span className="deals-board-footer-item">
              <span className="deals-board-footer-swatch deals-board-footer-swatch-secondary" />
              You Co-Owned Deals
            </span>
          </div>
        </section>

        <Modal
          isOpen={Boolean(boardActionModal.type && boardActionModal.deal)}
          onClose={closeBoardActionModal}
          title={
            boardActionModal.type === 'actions'
              ? 'Deal Actions'
              : boardActionModal.type === 'reminder'
              ? 'Add Reminder'
              : boardActionModal.type === 'reassign'
                ? 'Re-Assign Deal'
                : boardActionModal.type === 'changeType'
                  ? 'Change Type'
                : 'Delete Deal'
          }
          size="medium"
        >
          {boardActionModal.type === 'actions' ? (
            <div className="deals-board-action-form">
              <Button type="button" onClick={() => handleViewDeal(boardActionModal.deal)}>
                View Deal
              </Button>
              <Button type="button" variant="outline" onClick={() => handleOpenBoardActionModal('reminder', boardActionModal.deal)}>
                Add Reminder
              </Button>
              <Button type="button" variant="outline" onClick={() => handleGenerateQuotationForDeal(boardActionModal.deal)}>
                Generate Quotation
              </Button>
              <Button type="button" variant="outline" onClick={() => handleOpenDealActionPage('upload-deal-quotation', boardActionModal.deal)}>
                Upload Quotation
              </Button>
              <Button type="button" variant="outline" onClick={() => handleOpenDealActionPage('re-assign-deal', boardActionModal.deal)}>
                Re-Assign Deal
              </Button>
              <Button type="button" variant="outline" onClick={() => handleOpenBoardActionModal('changeType', boardActionModal.deal)}>
                Change Type
              </Button>
              <Button type="button" variant="outline" onClick={() => handleOpenBoardActionModal('delete', boardActionModal.deal)}>
                Delete Deal
              </Button>
            </div>
          ) : null}

          {boardActionModal.type === 'changeType' ? (
            <form onSubmit={handleSaveDealType} className="deals-board-action-form">
              <label className="deals-board-action-field">
                <span>Deal Type</span>
                <select value={changeTypeValue} onChange={(event) => setChangeTypeValue(event.target.value)}>
                  <option value="">Select deal type</option>
                  {DEAL_TYPE_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </label>

              <div className="deals-board-action-footer">
                <Button type="button" variant="outline" onClick={closeBoardActionModal}>
                  Cancel
                </Button>
                <Button type="submit">
                  Save Type
                </Button>
              </div>
            </form>
          ) : null}

          {boardActionModal.type === 'reminder' ? (
            <form onSubmit={handleSaveReminder} className="deals-board-action-form">
              <label className="deals-board-action-field">
                <span>Reminder Date</span>
                <input
                  type="date"
                  value={reminderForm.reminderDate}
                  onChange={(event) => setReminderForm((currentValue) => ({ ...currentValue, reminderDate: event.target.value }))}
                />
              </label>

              <label className="deals-board-action-field">
                <span>Reminder Mode</span>
                <select
                  value={reminderForm.reminderMode}
                  onChange={(event) => setReminderForm((currentValue) => ({ ...currentValue, reminderMode: event.target.value }))}
                >
                  {REMINDER_MODE_OPTIONS.map((option) => (
                    <option key={option.value || 'empty-mode'} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </label>

              <div className="deals-board-action-field">
                <span>Reminder Time</span>
                <div className="deals-board-reminder-time-row">
                  {REMINDER_TIME_OPTIONS.map((time) => (
                    <button
                      key={time}
                      type="button"
                      className={`deals-board-reminder-time-chip${reminderForm.reminderTime === time ? ' deals-board-reminder-time-chip--active' : ''}`}
                      onClick={() => setReminderForm((currentValue) => ({ ...currentValue, reminderTime: time }))}
                    >
                      {time}
                    </button>
                  ))}
                </div>
                <input
                  type="time"
                  value={reminderForm.reminderTime}
                  onChange={(event) => setReminderForm((currentValue) => ({ ...currentValue, reminderTime: event.target.value }))}
                />
              </div>

              <label className="deals-board-action-field">
                <span>Reminder Note</span>
                <textarea
                  rows={5}
                  value={reminderForm.reminderNote}
                  onChange={(event) => setReminderForm((currentValue) => ({ ...currentValue, reminderNote: event.target.value }))}
                />
              </label>

              <div className="deals-board-action-footer">
                <Button type="button" variant="outline" onClick={closeBoardActionModal}>
                  Cancel
                </Button>
                <Button type="submit">
                  Save Reminder
                </Button>
              </div>
            </form>
          ) : null}

          {boardActionModal.type === 'reassign' ? (
            <form onSubmit={handleReassignDeal} className="deals-board-action-form">
              <label className="deals-board-action-field">
                <span>Select Owner</span>
                <select value={reassignOwnerId} onChange={(event) => setReassignOwnerId(event.target.value)}>
                  <option value="">Select owner</option>
                  {availableUsers.map((entry) => (
                    <option key={entry.id} value={entry.id}>
                      {entry.name}
                    </option>
                  ))}
                </select>
              </label>

              <fieldset className="deals-board-reassign-reminders">
                <legend>Action on existing Reminders</legend>
                <div className="deals-board-reassign-reminders-options">
                  {[
                    { value: 'close', label: 'Close existing reminders' },
                    { value: 'move', label: 'Move to new Deal Owner' },
                    { value: 'retain', label: 'Retain with existing Deal Owner' },
                  ].map((option) => (
                    <label key={option.value} className="deals-board-reassign-reminders-option">
                      <input
                        type="radio"
                        name="reassignReminderAction"
                        value={option.value}
                        checked={reassignReminderAction === option.value}
                        onChange={(event) => setReassignReminderAction(event.target.value)}
                      />
                      <span>{option.label}</span>
                    </label>
                  ))}
                </div>
              </fieldset>

              <label className="deals-board-reassign-add-reminder">
                <input
                  type="checkbox"
                  checked={reassignAddReminder}
                  onChange={(event) => setReassignAddReminder(event.target.checked)}
                />
                <span>Add a reminder to new Deal Owner?</span>
              </label>

              <div className="deals-board-action-footer">
                <Button type="button" variant="outline" onClick={closeBoardActionModal}>
                  Cancel
                </Button>
                <Button type="submit">
                  Re-Assign Deal
                </Button>
              </div>
            </form>
          ) : null}

          {boardActionModal.type === 'delete' ? (
            <div className="deals-board-delete-confirm">
              <p>Delete deal <strong>{boardActionModal.deal?.dealNumber}</strong> from the board?</p>
              <p>This action removes the deal permanently.</p>

              <div className="deals-board-action-footer">
                <Button type="button" variant="outline" onClick={closeBoardActionModal}>
                  Cancel
                </Button>
                <Button type="button" onClick={handleDeleteDeal}>
                  Delete Deal
                </Button>
              </div>
            </div>
          ) : null}
        </Modal>

        <Modal
          isOpen={isBoardClassificationOpen}
          onClose={() => setIsBoardClassificationOpen(false)}
          title="Classification Filter"
          size="small"
        >
          <div className="deals-board-classification-panel">
            <div className="deals-board-classification-box">
              <label className="deals-board-classification-check">
                <input
                  type="checkbox"
                  checked={allBoardStatusesSelected}
                  onChange={handleToggleAllBoardStatuses}
                />
                <span>Check All</span>
              </label>

              {DEAL_BOARD_COLUMNS.map((column) => (
                <label key={column.key} className="deals-board-classification-check">
                  <input
                    type="checkbox"
                    checked={pendingBoardStatuses.includes(column.key)}
                    onChange={() => handleToggleBoardStatus(column.key)}
                  />
                  <span>{column.label}</span>
                </label>
              ))}
            </div>

            <div className="deals-board-classification-actions">
              <Button
                type="button"
                variant="success"
                size="small"
                icon={<FaArrowRight />}
                onClick={handleLoadBoardClassification}
              >
                Load
              </Button>
            </div>
          </div>
        </Modal>
      </div>
    )
  }

  if ((isAdmin && variantKey !== 'default' && variantKey !== 'add') || isSearchAdminView || isViewAdminView) {
    const drilldownStatusLabel = dashboardDealDrilldown?.statusType === 'won'
      ? 'Closed-Won'
      : dashboardDealDrilldown?.statusType === 'lost'
        ? 'Closed-Lost'
        : 'Closed Won-Lost Deal'
    const drilldownTitle = dashboardDealDrilldown?.monthLabel
      ? `${drilldownStatusLabel} : Deal Date - ${dashboardDealDrilldown.monthLabel}`
      : drilldownStatusLabel
    return (
      <div className="deals-page">
        <section className="deals-crm-card">
          {dashboardDealDrilldown ? (
            <div className="deals-crm-drilldown-banner">
              <button
                type="button"
                className="deals-crm-drilldown-back"
                onClick={() => setDashboardDealDrilldown(null)}
                aria-label="Clear dashboard drilldown"
                title="Back to all deals"
              >
                <FaArrowLeft />
              </button>
              <span className="deals-crm-drilldown-title">{drilldownTitle}</span>
            </div>
          ) : null}
      <div className="deals-crm-header">
            <h1>{viewConfig.title} - {sortedGridRows.length} records</h1>

            <div className="deals-crm-toolbar">
              {isAdmin ? (
                <button
                  type="button"
                  className="deals-crm-toolbar-icon deals-crm-toolbar-icon-orange"
                  onClick={() => navigate('/admin/deals/add')}
                  aria-label="Add deal"
                  title="Add Deal"
                >
                  <FaPlus />
                </button>
              ) : null}
              <button
                type="button"
                className={`deals-crm-toolbar-icon deals-crm-toolbar-icon-green ${hasActiveAdvancedFilters ? 'deals-crm-toolbar-icon-active' : ''}`}
                onClick={openFilterDialog}
                aria-label="Filter"
                title="Filter"
              >
                <FaFilter />
              </button>
              <button
                type="button"
                className="deals-crm-toolbar-icon deals-crm-toolbar-icon-orange"
                onClick={handleRefreshDeals}
                aria-label="Refresh"
                title="Refresh"
              >
                <FaSyncAlt />
              </button>
              <button
                type="button"
                className="deals-crm-toolbar-icon deals-crm-toolbar-icon-orange"
                onClick={() => handleExportDeals('excel')}
                aria-label="Export"
                title="Export"
              >
                <FaFileExport />
              </button>
            </div>
          </div>

          <div className="deals-crm-owner-filter-bar">
            <label className="deals-crm-owner-filter">
              <span>Role Selection</span>
              <select value={appliedOwnerWiseOwnerId || filters.ownerUserId || 'all'} onChange={(event) => handleOwnerFilterChange(event.target.value)} aria-label="Filter deals by owner">
                {roleSelectionOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>
            <label className="deals-crm-owner-filter">
              <span>Deal Status</span>
              <select value={dealStatusTableFilter} onChange={(event) => setDealStatusTableFilter(event.target.value)} aria-label="Filter deals by status">
                {DEAL_STATUS_FILTER_OPTIONS.map((option) => (
                  <option key={option.key} value={option.key}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>
          </div>

          <div className={`deals-crm-grid-shell ${compactGrid ? 'deals-crm-grid-shell-compact' : ''}`}>
              <div className="deals-crm-table-wrap">
                <table className="deals-crm-table">
                  <thead>
                    {activeGridColumns.some((col) => col.groupLabel) ? (
                      <>
                        <tr className="deals-crm-head-row">
                          {activeGridColumns.map((column, index, arr) => {
                            if (column.groupLabel) {
                              if (index === 0 || arr[index - 1].groupLabel !== column.groupLabel) {
                                const colSpan = arr.filter((c) => c.groupLabel === column.groupLabel).length;
                                return (
                                  <th key={`group-${column.groupLabel}`} colSpan={colSpan} title={column.groupLabel} style={{ textAlign: 'center' }}>
                                    {column.groupLabel}
                                  </th>
                                );
                              }
                              return null;
                            }
                            return (
                              <th key={column.key} title={column.label} rowSpan={2}>
                                <button
                                  type="button"
                                  className={`deals-crm-sort-button ${column.key === 'reasonForLostOrder' ? 'deals-crm-sort-button-no-indicator' : ''} ${gridSortConfig.key === column.key ? 'deals-crm-sort-button-active' : ''}`}
                                  onClick={() => handleGridSort(column.key)}
                                  title={column.label}
                                >
                                  <span>{column.label}</span>
                                  <span className="deals-crm-sort-indicator" aria-hidden="true">
                                    {gridSortConfig.key === column.key
                                      ? (gridSortConfig.direction === 'asc' ? '▲' : '▼')
                                      : '↕'}
                                  </span>
                                </button>
                              </th>
                            );
                          })}
                        </tr>
                        <tr className="deals-crm-head-row">
                          {activeGridColumns.map((column) => {
                            if (column.groupLabel) {
                              return (
                                <th key={column.key} title={column.label}>
                                  <button
                                    type="button"
                                    className={`deals-crm-sort-button ${column.key === 'reasonForLostOrder' ? 'deals-crm-sort-button-no-indicator' : ''} ${gridSortConfig.key === column.key ? 'deals-crm-sort-button-active' : ''}`}
                                    onClick={() => handleGridSort(column.key)}
                                    title={column.label}
                                  >
                                    <span>{column.label}</span>
                                    <span className="deals-crm-sort-indicator" aria-hidden="true">
                                      {gridSortConfig.key === column.key
                                        ? (gridSortConfig.direction === 'asc' ? '▲' : '▼')
                                        : '↕'}
                                    </span>
                                  </button>
                                </th>
                              );
                            }
                            return null;
                          })}
                        </tr>
                      </>
                    ) : (
                      <tr className="deals-crm-head-row">
                        {activeGridColumns.map((column) => {
                          if (column.key === 'actions') {
                            return (
                              <th key={column.key} title={column.label}>
                                <div className="deals-crm-sort-button">
                                  <span>{column.label}</span>
                                </div>
                              </th>
                            )
                          }
                          return (
                            <th key={column.key} title={column.label}>
                              <button
                                type="button"
                                className={`deals-crm-sort-button ${column.key === 'reasonForLostOrder' ? 'deals-crm-sort-button-no-indicator' : ''} ${gridSortConfig.key === column.key ? 'deals-crm-sort-button-active' : ''}`}
                                onClick={() => handleGridSort(column.key)}
                                title={column.label}
                              >
                                <span>{column.label}</span>
                                <span className="deals-crm-sort-indicator" aria-hidden="true">
                                  {gridSortConfig.key === column.key
                                    ? (gridSortConfig.direction === 'asc' ? '▲' : '▼')
                                    : '⇵'}
                                </span>
                              </button>
                            </th>
                          )
                        })}
                      </tr>
                    )}

                    {showInlineGridFilters ? (
                      <tr className="deals-crm-filter-row">
                        {activeGridColumns.map((column) => (
                          <th key={column.key}>
                            {column.key === 'actions' ? null : column.key === 'location' || column.key === 'city' ? (
                              <select
                                value={gridFilters[column.key] || ''}
                                onChange={(event) => handleGridFilterChange(column.key, event.target.value)}
                                className="deals-crm-filter-input"
                              >
                                {CUSTOM_LOCATION_SELECT_OPTIONS.map((option) => (
                                  <option key={option.value || 'empty-city'} value={option.value}>{option.label}</option>
                                ))}
                              </select>
                            ) : (
                              <input
                                type="text"
                                value={gridFilters[column.key] || ''}
                                onChange={(event) => handleGridFilterChange(column.key, event.target.value)}
                                placeholder={column.placeholder || `Search ${column.label}`}
                                className="deals-crm-filter-input"
                              />
                            )}
                          </th>
                        ))}
                      </tr>
                    ) : null}
                  </thead>

                  <tbody>
                    {paginatedGridRows.length === 0 ? (
                      <tr className="deals-crm-row">
                        <td colSpan={activeGridColumns.length} className="deals-crm-empty-table-cell">
                          No Records Found
                        </td>
                      </tr>
                    ) : paginatedGridRows.map((row) => (
                      <tr key={row.id} className="deals-crm-row">
                        {activeGridColumns.map((column) => {
                          if (column.key === 'dealNumber') {
                            return (
                              <td key={`${row.id}-${column.key}`} className="deals-crm-number-cell">
                                <div className="deals-crm-number-menu" data-deal-card-menu>
                                  <button
                                    type="button"
                                    className="deals-crm-number-button deals-crm-number-button-label"
                                    onClick={() => handleViewDeal(row)}
                                  >
                                    <span className="deals-crm-number-button-content">
                                      <span>{row[column.key] || ''}</span>
                                    </span>
                                  </button>
                                  {renderInlineDealActionMenu(row)}
                                </div>
                              </td>
                            )
                          }
                          return <td key={`${row.id}-${column.key}`}>{renderDealGridCellContent(row, column.key)}</td>
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="deals-crm-footer">
                <div className="deals-crm-legend">
                  <span className="deals-crm-legend-title">Legend:</span>
                  <span className="deals-crm-legend-item">
                    <span className="deals-crm-legend-swatch deals-crm-legend-swatch-primary" />
                    Deals
                  </span>
                  <span className="deals-crm-legend-item">
                    <span className="deals-crm-legend-swatch deals-crm-legend-swatch-secondary" />
                    You Co-Owned Deals
                  </span>
                </div>

                <div className="deals-crm-footer-right">
                  <div className="deals-crm-footer-total">
                    Total records: <strong>{sortedGridRows.length}</strong>
                  </div>

                  <div className="deals-crm-pagination">
                    <button
                      type="button"
                      className="deals-crm-pagination-button"
                      disabled={currentPageSafe === 1}
                      onClick={() => setCurrentPage((currentValue) => Math.max(1, currentValue - 1))}
                    >
                      <span>prev</span>
                    </button>

                    {visiblePages.map((pageNumber) => (
                      <button
                        key={pageNumber}
                        type="button"
                        className={`deals-crm-page-number ${pageNumber === currentPageSafe ? 'deals-crm-page-number-active' : ''}`}
                        onClick={() => setCurrentPage(pageNumber)}
                      >
                        {pageNumber}
                      </button>
                    ))}

                    <button
                      type="button"
                      className="deals-crm-pagination-button"
                      disabled={currentPageSafe === totalPages}
                      onClick={() => setCurrentPage((currentValue) => Math.min(totalPages, currentValue + 1))}
                    >
                      <span>next</span>
                    </button>
                  </div>
                </div>
              </div>
            </div>
        </section>

        {renderDealToolModals()}
      </div>
    )
  }

  const cardActions = isAdmin
    ? (
      variantKey === 'add'
        ? (
          <Button variant="outline" onClick={() => navigate('/admin/deals/view')}>
            Back To View Deal
          </Button>
        )
        : (
          <Button onClick={() => navigate('/admin/deals/add')}>
            + Add Deal
          </Button>
        )
    )
    : (
      <Button onClick={() => { resetForm(); open() }}>
        + Add Deal
      </Button>
    )

  return (
    <div className="deals-page">
      <Card
        title={viewConfig.title}
        subtitle={`${displayedDeals.length} deals | ${formatCurrency(totalValue)} total value. ${viewConfig.subtitle}`}
        actions={cardActions}
      >
        <div className="deals-filters">
          <Input
            placeholder={viewConfig.searchPlaceholder}
            value={searchTerm}
            onChange={(event) => setSearchTerm(event.target.value)}
            className="search-input"
          />

          <Select
            value={filters.status}
            onChange={(event) => setFilter('status', event.target.value)}
            options={[
              { value: 'all', label: 'All Status' },
              ...DEAL_STATUS,
            ]}
          />
        </div>

        <Table
          columns={columns}
          data={displayedDeals}
          emptyMessage={viewConfig.emptyMessage}
          className={effectiveVariantKey === 'search' ? 'deals-search-table' : ''}
        />
      </Card>

      {renderDealToolModals()}

      <Modal
        isOpen={isOpen}
        onClose={handleModalClose}
        title={data ? 'Edit Deal' : 'Add Deal'}
      >
        <form onSubmit={handleSubmit} className="deal-form">
          <div className="deal-form-stepper">
            <button
              type="button"
              className={`deal-form-step ${dealFormStep === 0 ? 'deal-form-step-active' : ''}`}
              onClick={() => setDealFormStep(0)}
            >
              <span>1</span>
              <strong>Deal Details</strong>
            </button>
            <button
              type="button"
              className={`deal-form-step ${dealFormStep === 1 ? 'deal-form-step-active' : ''}`}
              onClick={() => {
                if (dealFormStep === 0 && !validateDealDetailsStep()) {
                  return
                }
                setDealFormStep(1)
              }}
            >
              <span>2</span>
              <strong>Contacts</strong>
            </button>
          </div>

          {formErrors.submit ? <div className="deal-form-alert">{formErrors.submit}</div> : null}

          {dealFormStep === 0 ? (
            <div className="deal-form-section">
              <div className="deal-form-grid">
                <Input
                  label="Deal Date *"
                  type="date"
                  value={formData.dealDate}
                  onChange={(event) => handleFormFieldChange('dealDate', event.target.value)}
                  error={formErrors.dealDate}
                  fullWidth
                />

                <Input
                  label="Expected Closure Date *"
                  type="date"
                  value={formData.expectedClosureDate}
                  onChange={(event) => handleFormFieldChange('expectedClosureDate', event.target.value)}
                  error={formErrors.expectedClosureDate}
                  fullWidth
                />

                <Input
                  label="Deal Name *"
                  value={formData.name}
                  onChange={(event) => handleFormFieldChange('name', event.target.value)}
                  error={formErrors.name}
                  fullWidth
                />

                <Select
                  label="Deal Type *"
                  value={formData.dealType}
                  onChange={(event) => handleFormFieldChange('dealType', event.target.value)}
                  options={DEAL_TYPE_OPTIONS}
                  error={formErrors.dealType}
                  fullWidth
                />

                <div className="deal-form-value-row">
                  <Select
                    label="Currency"
                    value={formData.valueCurrency}
                    onChange={(event) => handleFormFieldChange('valueCurrency', event.target.value)}
                    options={['INR', 'USD', 'AED', 'NZ$', 'CAD', 'SEK', 'SGD', 'AUD', 'JPY', 'Euro', 'GBP', 'QAR', 'SAR', 'OMR']}
                    fullWidth
                  />
                  <Input
                    label="Deal Value *"
                    type="number"
                    value={formData.value}
                    onChange={(event) => handleFormFieldChange('value', event.target.value)}
                    error={formErrors.value}
                    fullWidth
                  />
                </div>

                <Select
                  label="Deal Source *"
                  value={formData.dealSource}
                  onChange={(event) => handleFormFieldChange('dealSource', event.target.value)}
                  options={DEAL_SOURCE_OPTIONS}
                  error={formErrors.dealSource}
                  fullWidth
                />

                <Select
                  label="Status *"
                  value={formData.status}
                  onChange={(event) => handleFormFieldChange('status', event.target.value)}
                  options={DEAL_STATUS}
                  error={formErrors.status}
                  fullWidth
                />

                <Input
                  label="Deal Subsource"
                  value={formData.dealSubsource}
                  onChange={(event) => handleFormFieldChange('dealSubsource', event.target.value)}
                  fullWidth
                />

                <Input
                  label="Stage"
                  value={formData.stage}
                  onChange={(event) => handleFormFieldChange('stage', event.target.value)}
                  fullWidth
                />

                <Input
                  label="Project Name"
                  value={formData.projectName}
                  onChange={(event) => handleFormFieldChange('projectName', event.target.value)}
                  fullWidth
                />

                <Input
                  label="Consultant Name"
                  value={formData.consultantName}
                  onChange={(event) => handleFormFieldChange('consultantName', event.target.value)}
                  fullWidth
                />

                <Input
                  label="Job No"
                  value={formData.jobNo}
                  onChange={(event) => handleFormFieldChange('jobNo', event.target.value)}
                  fullWidth
                />

                <Input
                  label="Order Status (Old)"
                  value={formData.customerOrderStatusOld}
                  onChange={(event) => handleFormFieldChange('customerOrderStatusOld', event.target.value)}
                  fullWidth
                />

                <Input
                  label="Order Status (New)"
                  value={formData.customerOrderStatusNew}
                  onChange={(event) => handleFormFieldChange('customerOrderStatusNew', event.target.value)}
                  fullWidth
                />

                <Select
                  label="Convert to PO"
                  value={formData.convertToPo}
                  onChange={(event) => handleFormFieldChange('convertToPo', event.target.value)}
                  options={[
                    { value: '', label: 'Select...' },
                    { value: 'Yes', label: 'Yes' },
                    { value: 'No', label: 'No' },
                  ]}
                  fullWidth
                />

                <Input
                  label="If Yes, PO Value/Job No."
                  value={formData.poValueJobNo}
                  onChange={(event) => handleFormFieldChange('poValueJobNo', event.target.value)}
                  fullWidth
                />

                <Select
                  label="If No, Reason for Lost Order"
                  value={formData.reasonForLostOrder}
                  onChange={(event) => handleFormFieldChange('reasonForLostOrder', event.target.value)}
                  options={LOST_ORDER_REASON_OPTIONS}
                  fullWidth
                />

                <Select
                  label="City"
                  value={formData.city}
                  onChange={(event) => handleFormFieldChange('city', event.target.value)}
                  options={DEAL_CITY_OPTIONS}
                  fullWidth
                />

                {isAdmin ? (
                  <Select
                    label="Owner *"
                    value={formData.ownerUserId}
                    onChange={(event) => handleFormFieldChange('ownerUserId', event.target.value)}
                    options={availableUsers.map((entry) => ({ value: String(entry.id), label: entry.name }))}
                    error={formErrors.ownerUserId}
                    fullWidth
                  />
                ) : null}

                <label className={`deal-form-textarea ${formErrors.description ? 'deal-form-textarea-error' : ''}`}>
                  <span>Description *</span>
                  <textarea
                    rows={4}
                    value={formData.description}
                    onChange={(event) => handleFormFieldChange('description', event.target.value)}
                  />
                  {formErrors.description ? <small>{formErrors.description}</small> : null}
                </label>

                <label className="deal-form-textarea">
                  <span>Address</span>
                  <textarea
                    rows={3}
                    value={formData.address}
                    onChange={(event) => handleFormFieldChange('address', event.target.value)}
                  />
                </label>
              </div>
            </div>
          ) : (
            <div className="deal-form-section">
              <div className="deal-form-contacts-header">
                <div>
                  <h3>Select or add contacts to associate with the Deal</h3>
                  <p>Choose the main deal contact and add phone or email details.</p>
                </div>
                <Button type="button" variant="outline" onClick={handleAddDealContact}>
                  <FaPlus />
                  <span>Add Contact</span>
                </Button>
              </div>

              {formErrors.contacts ? <div className="deal-form-alert">{formErrors.contacts}</div> : null}
              {formErrors.primaryContact ? <div className="deal-form-alert">{formErrors.primaryContact}</div> : null}

              <div className="deal-form-contact-grid">
                {formData.contacts.map((contact, index) => (
                  <div key={contact.id} className={`deal-form-contact-card ${contact.isPrimary ? 'deal-form-contact-card-primary' : ''}`}>
                    <div className="deal-form-contact-toprow">
                      <label className="deal-form-contact-checkbox">
                        <input
                          type="checkbox"
                          checked={contact.included}
                          onChange={(event) => {
                            handleToggleDealContact(contact.id, event.target.checked)
                            handleContactFieldChange(contact.id, 'included', event.target.checked)
                          }}
                        />
                        <span>Use</span>
                      </label>

                      <div className="deal-form-contact-name-row">
                        <select
                          value={contact.prefix}
                          onChange={(event) => handleContactFieldChange(contact.id, 'prefix', event.target.value)}
                        >
                          {DEAL_CONTACT_PREFIX_OPTIONS.map((option) => (
                            <option key={option.value} value={option.value}>{option.label}</option>
                          ))}
                        </select>
                        <input
                          type="text"
                          value={contact.name}
                          onChange={(event) => handleContactFieldChange(contact.id, 'name', event.target.value)}
                          placeholder="Contact name"
                        />
                      </div>

                      {formData.contacts.length > 1 ? (
                        <button
                          type="button"
                          className="deal-form-contact-remove"
                          onClick={() => handleRemoveDealContact(contact.id)}
                          aria-label={`Remove contact ${index + 1}`}
                        >
                          <FaTrash />
                        </button>
                      ) : null}
                    </div>

                    <div className="deal-form-contact-fields">
                      <input
                        type="text"
                        value={contact.designation}
                        onChange={(event) => handleContactFieldChange(contact.id, 'designation', event.target.value)}
                        placeholder="Designation"
                      />
                      <input
                        type="tel"
                        value={contact.phone}
                        onChange={(event) => handleContactFieldChange(contact.id, 'phone', event.target.value)}
                        placeholder="Phone"
                      />
                      <input
                        type="email"
                        value={contact.email}
                        onChange={(event) => handleContactFieldChange(contact.id, 'email', event.target.value)}
                        placeholder="Email"
                      />
                    </div>

                    {formErrors[`name-${contact.id}`] ? <small className="deal-form-contact-error">{formErrors[`name-${contact.id}`]}</small> : null}
                    {formErrors[`phone-${contact.id}`] ? <small className="deal-form-contact-error">{formErrors[`phone-${contact.id}`]}</small> : null}

                    <label className="deal-form-contact-primary">
                      <input
                        type="radio"
                        name="primary-deal-contact"
                        checked={contact.isPrimary}
                        onChange={() => handlePrimaryDealContactChange(contact.id)}
                      />
                      <span>Primary Deal Contact?</span>
                    </label>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="modal-actions">
            <Button type="button" variant="outline" onClick={handleModalClose}>
              Cancel
            </Button>
            {dealFormStep === 1 ? (
              <Button type="button" variant="outline" onClick={handlePreviousDealFormStep}>
                Back
              </Button>
            ) : null}
            <Button type={dealFormStep === 1 ? 'submit' : 'button'} variant="primary" onClick={dealFormStep === 1 ? undefined : handleNextDealFormStep}>
              {dealFormStep === 1 ? `${data ? 'Update' : 'Create'} Deal` : 'Next'}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  )
}

export default Deals
