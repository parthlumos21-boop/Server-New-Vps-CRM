import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useLocation, useNavigate, useSearchParams } from 'react-router-dom'
import { createPortal } from 'react-dom'
import { FiChevronDown } from 'react-icons/fi'
import Button from '../../../components/common/Button'
import Modal from '../../../components/common/Modal'
import AccountsStageTabs from '../../../components/admin/accounts/AccountsStageTabs'
import AccountsLegacyBoard from '../../../components/admin/accounts/AccountsLegacyBoard'
import AccountsBoardPagination from '../../../components/admin/accounts/AccountsBoardPagination'
import AccountsExportButton from '../../../components/admin/accounts/AccountsExportButton'
import AccountBoardHeaderActions from '../../../components/admin/accounts/AccountBoardHeaderActions'
import AccountDetailsDrawer from './AccountDetailsDrawer'
import AccountActionModal from './AccountActionModal'
import { useData } from '../../../context/DataContext'
import { useAuth } from '../../../context/AuthContext';
import { userApi } from '../../../services/userApi';
import { getAdminAccountsBoardView } from '../../../features/adminAccounts/config/accountBoardViews'
import { getAccountBoardColumns, getColumnTextValue } from '../../../features/adminAccounts/config/accountBoardColumns'
import { ACCOUNT_ROW_ACTIONS, ACCOUNT_DRAWER_ACTIONS, USER_ACCOUNT_ROW_ACTIONS, USER_ACCOUNT_DRAWER_ACTIONS } from '../../../features/adminAccounts/config/accountActions'
import { DEFAULT_ACCOUNT_STAGE } from '../../../features/adminAccounts/config/accountStages'
import { getAccountById } from '../../../features/adminAccounts/selectors/getAccountById'
import { getAccountsBoardData } from '../../../features/adminAccounts/selectors/getAccountsBoardData'
import { getAccountSourceBoardData } from '../../../features/adminAccounts/selectors/getAccountSourceBoardData'
import { getConvertedAccountsBoardData } from '../../../features/adminAccounts/selectors/getConvertedAccountsBoardData'
import { getMyAccountsBoardData } from '../../../features/adminAccounts/selectors/getMyAccountsBoardData'
import { getSwBarodaMumBoardData } from '../../../features/adminAccounts/selectors/getSwBarodaMumBoardData'
import { getUserWiseLeadsBoardData } from '../../../features/adminAccounts/selectors/getUserWiseLeadsBoardData'
import { getWeeklyReportsAllBoardData } from '../../../features/adminAccounts/selectors/getWeeklyReportsAllBoardData'
import { getDailyFreshLeadsBoardData } from '../../../features/adminAccounts/selectors/getDailyFreshLeadsBoardData'
import { getNoFollowLeadsBoardData } from '../../../features/adminAccounts/selectors/getNoFollowLeadsBoardData'
import { leadApi } from '../../../services/leadApi'
import { dealApi } from '../../../services/dealApi'
import { authService } from '../../../services/authService'
import { getCityForUser } from '../../../features/adminAccounts/config/cityFilters'
import { getCrmOwnerOptions } from '../../../features/users/crmUserDirectory';
import { getCrmOwnerCode } from '../../../features/users/crmUserDirectory';
import './MyGroupAccounts.css'
import { matchesSectionSearch } from '../../../utils/sectionSearch'

const DEFAULT_ROWS_PER_PAGE = 10
const SIX_ROW_ACCOUNT_VARIANTS = new Set(['viewAll', 'myAccounts', 'searchAccount'])
const REQUIRED_ACCOUNT_TABLE_COLUMN_KEYS = ['projectName', 'accountOwner']
const EXACT_ACCOUNT_LIST_VARIANTS = new Set(['viewAll', 'myGroup', 'myAccounts', 'searchAccount'])
const PLAIN_ACCOUNT_OWNER_VARIANTS = new Set(['myGroup', 'myAccounts', 'searchAccount'])
const DEFAULT_CONVERTED_FILTER_RULE = () => ({
  id: `converted-filter-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
  fieldKey: '',
  operator: '',
  value: '',
  not: false,
})

const formatDisplayDate = (value) => {
  if (!value) return '-'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return String(value)

  const day = String(date.getDate()).padStart(2, '0')
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const year = date.getFullYear()
  return `${day}-${month}-${year}`
}

const resolveConvertedAccountsConversionDate = (row = {}) => (
  row.raw?.conversionDate
  || row.raw?.convertedAt
  || row.raw?.convertedDate
  || row.updatedAt
  || row.createdAt
  || ''
)

const buildConvertedAccountsRow = (row = {}) => ({
  ...row,
  accountStatus: row.status || '',
  conversionDateDisplay: formatDisplayDate(resolveConvertedAccountsConversionDate(row)),
  lastUpdated: row.updatedAtDisplay || row.createdAtDisplay || '',
})

const getAccountColumnKeysWithRequiredFields = (columnKeys = [], columns = []) => {
  const availableColumnKeys = columns.map((column) => column.key)
  const availableColumnKeySet = new Set(availableColumnKeys)
  const cleanColumnKeys = columnKeys.filter((key) => availableColumnKeySet.has(key))
  
  let nextColumnKeys = (cleanColumnKeys.length > 0 ? cleanColumnKeys : availableColumnKeys)
    .filter((key) => key !== 'projectName' && key !== 'accountOwner' && key !== 'accountDate')

  const accountNameIndex = nextColumnKeys.indexOf('name')
  const accountNumberIndex = nextColumnKeys.indexOf('accountNumber')
  const insertIndex = accountNameIndex >= 0 ? accountNameIndex + 1 : (accountNumberIndex >= 0 ? accountNumberIndex + 1 : 0)

  if (availableColumnKeySet.has('accountDate')) {
    nextColumnKeys.splice(insertIndex, 0, 'accountDate')
  }

  if (availableColumnKeySet.has('projectName')) {
    const dIndex = nextColumnKeys.indexOf('accountDate')
    const pIndex = dIndex >= 0 ? dIndex + 1 : insertIndex
    nextColumnKeys.splice(pIndex, 0, 'projectName')
  }

  if (availableColumnKeySet.has('accountOwner')) {
    const pIndex = nextColumnKeys.indexOf('projectName')
    const dIndex = nextColumnKeys.indexOf('accountDate')
    const oIndex = pIndex >= 0 ? pIndex + 1 : (dIndex >= 0 ? dIndex + 1 : insertIndex)
    nextColumnKeys.splice(oIndex, 0, 'accountOwner')
  }

  return nextColumnKeys
}

const getAccountRowsWithRequiredFields = (rows = []) => rows.map((row = {}) => {
  const raw = row.raw || {}
  const dealName = row.dealName || raw.dealName || raw.formData?.dealName || row.name || raw.accountName || ''
  const projectName = row.dealName || raw.dealName || raw.formData?.dealName || row.projectName || raw.projectName || raw.formData?.projectName || row.productCategory || raw.productCategory || 'General Enquiry'
  const accountOwner = row.accountOwnerDisplay || row.accountOwnerName || row.accountOwner || raw.accountOwner || raw.ownerName || raw.assignedToName || 'Unassigned'
  const cleanAccountOwner = String(accountOwner || '').trim().toLowerCase() === 'no' ? '-' : accountOwner

  return {
    ...row,
    dealName,
    projectName,
    accountOwner: cleanAccountOwner,
    accountOwnerName: row.accountOwnerName || cleanAccountOwner,
    accountOwnerDisplay: row.accountOwnerDisplay || cleanAccountOwner,
  }
})

const normalizeMatchValue = (value) =>
  String(value || '').trim().toLowerCase()

const getQuotationOwnerName = (quotation = {}, availableUsers = []) => {
  const rawOwner = quotation.quotationOwnerName
    || quotation.quotationOwner
    || quotation.createdByName
    || quotation.ownerName
    || quotation.addedByName
    || ''
  if (rawOwner) return rawOwner

  const userId = String(quotation.userId || quotation.createdBy || '').trim()
  if (!userId) return ''

  const matchedUser = availableUsers.find((entry) => (
    [entry.id, entry._id, entry.legacyId].some((candidate) => String(candidate || '') === userId)
  ))
  return matchedUser?.name || matchedUser?.username || matchedUser?.email || ''
}

const quotationMatchesAccount = (quotation = {}, account = {}) => {
  const raw = account.raw || {}
  const formData = account.formData || raw.formData || {}
  const accountIds = [
    account.id,
    raw.id,
    raw._id,
    account.dealId,
    account.convertedDealId,
  ].map(normalizeMatchValue).filter(Boolean)

  const accountNumbers = [
    account.accountNumber,
    account.accountNo,
    raw.accountNumber,
    raw.accountNo,
    formData.accountNumber,
    formData.accountNo,
    formData['Account No.'],
  ].map(normalizeMatchValue).filter(Boolean)

  const accountNames = [
    account.name,
    account.accountName,
    account.customerName,
    raw.name,
    raw.accountName,
    raw.customerName,
    formData.name,
    formData.accountName,
    formData.customerName,
    formData['Account Name'],
  ].map(normalizeMatchValue).filter(Boolean)

  const quotationIds = [
    quotation.customerId,
    quotation.accountId,
    quotation.leadId,
    quotation.selectedAccountId,
    quotation.dealId,
    quotation.raw?.customerId,
    quotation.raw?.accountId,
    quotation.raw?.leadId,
    quotation.raw?.selectedAccountId,
    quotation.raw?.dealId,
  ].map(normalizeMatchValue).filter(Boolean)

  const quotationNumbers = [
    quotation.clientAccountNumber,
    quotation.accountNumber,
    quotation.customerNumber,
    quotation.raw?.clientAccountNumber,
    quotation.raw?.accountNumber,
    quotation.raw?.customerNumber,
  ].map(normalizeMatchValue).filter(Boolean)

  const quotationNames = [
    quotation.companyName,
    quotation.clientName,
    quotation.customerName,
    quotation.accountName,
    quotation.raw?.companyName,
    quotation.raw?.clientName,
    quotation.raw?.customerName,
    quotation.raw?.accountName,
  ].map(normalizeMatchValue).filter(Boolean)

  return quotationIds.some((value) => accountIds.includes(value))
    || quotationNumbers.some((value) => accountNumbers.includes(value))
    || quotationNames.some((value) => accountNames.includes(value))
}

const enrichBoardDataWithQuotationFields = (boardData, quotations = [], availableUsers = []) => {
  const enrichRow = (row = {}) => {
    if (row.quotationNumber && row.quotationOwnerName) return row

    const matchedQuotations = (quotations || [])
      .filter((quotation) => quotationMatchesAccount(quotation, row))
      .sort((left, right) => new Date(right.updatedAt || right.createdAt || 0).getTime() - new Date(left.updatedAt || left.createdAt || 0).getTime())

    const latestQuotation = matchedQuotations[0]
    if (!latestQuotation) return row

    return {
      ...row,
      quotationNumber: row.quotationNumber || latestQuotation.quotationNumber || latestQuotation.quotationNo || latestQuotation.quoteNumber || '',
      quotationOwnerName: row.quotationOwnerName || getQuotationOwnerName(latestQuotation, availableUsers),
    }
  }

  const records = (boardData.records || []).map(enrichRow)
  const rowLookup = new Map(records.map((row) => [String(row.id), row]))
  const rowsByStage = Object.fromEntries(
    Object.entries(boardData.rowsByStage || {}).map(([stageKey, rows]) => [
      stageKey,
      (rows || []).map((row) => rowLookup.get(String(row.id)) || enrichRow(row)),
    ])
  )

  return { ...boardData, records, rowsByStage }
}

const compareAccountRows = (left = {}, right = {}) => {
  const timeA = new Date(left.createdAt || left.raw?.createdAt || left.accountDate || left.raw?.accountDate || 0).getTime()
  const timeB = new Date(right.createdAt || right.raw?.createdAt || right.accountDate || right.raw?.accountDate || 0).getTime()
  if (timeA !== timeB) return timeB - timeA

  const leftId = Number(left.id || left.raw?.id || left.raw?._id) || 0
  const rightId = Number(right.id || right.raw?.id || right.raw?._id) || 0
  if (leftId !== rightId && leftId > 0 && rightId > 0) return rightId - leftId

  const leftNumber = String(left.accountNumber || left.accountNo || left.raw?.accountNumber || left.raw?.accountNo || '')
  const rightNumber = String(right.accountNumber || right.accountNo || right.raw?.accountNumber || right.raw?.accountNo || '')
  return rightNumber.localeCompare(leftNumber, undefined, { numeric: true, sensitivity: 'base' })
}

const stripOwnerCodePrefix = (value = '') => String(value || '')
  .trim()
  .replace(/^\d{3,}\s*-+\s*/u, '')

const getPlainAccountOwnerName = (_value, row = {}) => {
  const rawOwner = row.accountOwnerDisplay
    || row.accountOwnerName
    || row.accountOwner
    || row.raw?.accountOwner
    || row.raw?.ownerName
    || row.raw?.assignedToName
    || ''

  const ownerName = stripOwnerCodePrefix(rawOwner)
  return ownerName && ownerName.toLowerCase() !== 'no' ? ownerName : '-'
}

const getCreatorOwnerCode = (row = {}) => {
  const ownerName = row.accountOwnerDisplay || row.accountOwnerName || row.accountOwner || row.raw?.accountOwner || row.raw?.ownerName || row.raw?.assignedToName;
  if (ownerName && typeof getCrmOwnerCode === 'function') {
      const code = getCrmOwnerCode(ownerName);
      if (code) return String(code).trim();
  }
  const directCode = row.accountOwnerCode || row.raw?.accountOwnerCode || row.raw?.formData?.accountOwnerCode || row.ownerCode || row.raw?.ownerCode || row.raw?.formData?.ownerCode || row.employeeId || row.raw?.employeeId || row.raw?.formData?.employeeId;
  if (directCode && String(directCode).length <= 5) return String(directCode).trim();
  
  return '';
}
const getCurrentUserOwnerCode = (user = {}) => String(
  user.ownerCode
  || user.owner_code
  || user.accountOwnerCode
  || user.employeeId
  || user.employee_id
  || ''
).trim()

const normalizeUserIdentityValue = (value = '') => String(value || '')
  .trim()
  .replace(/^\d{3,}\s*[-:]\s*/u, '')
  .toLowerCase()
  .replace(/\s+/g, ' ')

const resolveLoggedInUserOwnerCode = (currentUser = {}, users = []) => {
  const currentEmail = normalizeUserIdentityValue(currentUser.email)
  const currentUsername = normalizeUserIdentityValue(currentUser.username)
  const currentName = normalizeUserIdentityValue(currentUser.name || currentUser.ownerDisplayName)

  const matchedUser = (Array.isArray(users) ? users : []).find((entry = {}) => {
    const entryEmail = normalizeUserIdentityValue(entry.email)
    const entryUsername = normalizeUserIdentityValue(entry.username)
    const entryName = normalizeUserIdentityValue(entry.name || entry.ownerDisplayName)

    return Boolean(
      (currentEmail && entryEmail === currentEmail)
      || (currentUsername && entryUsername === currentUsername)
      || (currentName && entryName === currentName)
    )
  })

  return String(
    matchedUser?.ownerCode
    || matchedUser?.owner_code
    || matchedUser?.accountNo
    || currentUser.ownerCode
    || currentUser.owner_code
    || currentUser.accountOwnerCode
    || currentUser.employeeId
    || ''
  ).trim()
}

const getConvertedAccountsFieldText = (row = {}, fieldKey = '') => {
  switch (fieldKey) {
    case 'accountNumber': return row.accountNumber || ''
    case 'name': return row.name || ''
    case 'accountDate': return row.accountDateDisplay || formatDisplayDate(row.accountDate) || formatDisplayDate(row.createdAt) || formatDisplayDate(row.created_at) || ''
    case 'accountCategory': return row.accountCategory || ''
    case 'accountOwner': return row.accountOwnerDisplay || row.accountOwnerName || row.accountOwner || ''
    case 'status':
    case 'accountStatus': return row.accountStatus || row.status || ''
    case 'accountSource': return row.accountSource || ''
    case 'accountState': return row.accountState || ''
    case 'contactPerson': return row.contactPerson || ''
    case 'phone': return row.phone || ''
    case 'email': return row.email || ''
    case 'alternatePhone': return row.alternatePhone || ''
    case 'alternateEmail': return row.alternateEmail || ''
    case 'customerType': return row.customerType || row.formData?.['Customer Type'] || row.formData?.customerType || row.raw?.customerType || ''
    case 'projectName': return row.projectName || ''
    case 'productCategory': return row.productCategory || ''
    case 'state': return row.state || ''
    case 'location': return row.location || ''
    case 'description': return row.description || ''
    case 'industryType': return row.industryType || ''
    case 'customerRefNo': return row.customerRefNo || ''
    case 'address': return row.address || ''
    case 'customerRefDate': return row.customerRefDate || ''
    case 'consultantName': return row.consultantName || row.formData?.['Consultant Name'] || row.formData?.consultantName || row.raw?.consultantName || ''
    case 'poValue': return row.poValue || row.formData?.['PO Value'] || row.formData?.poValue || row.raw?.poValue || ''
    case 'statusAsPerOrderReceived': return row.statusAsPerOrderReceived || ''
    case 'statusAsPerQuotationGiven': return row.statusAsPerQuotationGiven || ''
    case 'gstin': return row.gstin || ''
    case 'stateCode': return row.stateCode || ''
    case 'jobNo': { const val = String(row.jobNo || row.formData?.['Job No'] || row.formData?.jobNo || '').trim(); return val.toLowerCase() === 'email' ? '' : val; }
    case 'reasonForLost': return row.reasonForLost || ''
    case 'customerName': return row.customerName || ''
    case 'accountSubsource': return row.accountSubsource || ''
    case 'addedBy': return row.addedBy || row.addedByDisplay || ''
    case 'addedOn': return row.createdAtDisplay || formatDisplayDate(row.createdAt) || ''
    case 'lastUpdated':
    case 'updatedAtDisplay': return row.updatedAtDisplay || row.lastUpdated || ''
    case 'latestRemark': return row.latestRemark || ''
    case 'userGroup': return row.userGroup || row.formData?.['User Group'] || row.formData?.userGroup || row.raw?.userGroup || ''
    case 'convertedContextNumber': return row.convertedContextNumber || ''
    case 'convertedAs': return row.convertedAs || ''
    case 'conversionDateDisplay': return row.conversionDateDisplay || ''
    default: return row[fieldKey] || ''
  }
}

const CONVERTED_ACCOUNT_FIELD_DEFINITIONS = [
  { key: '', label: 'Select' },
  { key: 'accountNumber', label: 'Account No.' },
  { key: 'name', label: 'Account Name' },
  { key: 'accountDate', label: 'Account Date' },
  { key: 'accountCategory', label: 'Account Category' },
  { key: 'accountOwner', label: 'Account Owner' },
  { key: 'accountStatus', label: 'Account Status' },
  { key: 'accountSource', label: 'Account Source' },
  { key: 'accountState', label: 'Account State' },
  { key: 'contactPerson', label: 'Contact Person' },
  { key: 'phone', label: 'Phone' },
  { key: 'email', label: 'Email' },
  { key: 'customerType', label: 'Customer Type' },
  { key: 'alternatePhone', label: 'Alternate Phone' },
  { key: 'alternateEmail', label: 'Alternate Email' },
  { key: 'projectName', label: 'Project Name' },
  { key: 'productCategory', label: 'Product Category' },
  { key: 'state', label: 'State' },
  { key: 'location', label: 'Location' },
  { key: 'description', label: 'Description' },
  { key: 'industryType', label: 'Industry Type' },
  { key: 'customerRefNo', label: 'Customer Ref. No.' },
  { key: 'address', label: 'Address' },
  { key: 'customerRefDate', label: 'Customer Ref. Date' },
  { key: 'consultantName', label: 'Consultant Name' },
  { key: 'poValue', label: 'PO Value' },
  { key: 'statusAsPerOrderReceived', label: 'Status of Customer as per Order Received' },
  { key: 'statusAsPerQuotationGiven', label: 'Status Of Customer as per quotation Given' },
  { key: 'gstin', label: 'GSTIN' },
  { key: 'jobNo', label: 'Job No' },
  { key: 'reasonForLost', label: 'Reason For Lost' },
  { key: 'customerName', label: 'Customer Name' },
  { key: 'accountSubsource', label: 'Account Subsource' },
  { key: 'addedBy', label: 'Added By' },
  { key: 'addedOn', label: 'Added On' },
  { key: 'lastUpdated', label: 'Last Updated' },
  { key: 'latestRemark', label: 'Latest Remark' },
  { key: 'userGroup', label: 'User Group' },
]

const CONVERTED_ACCOUNT_FILTER_OPERATORS = [
  { value: '', label: 'Select' },
  { value: 'empty', label: 'empty' },
  { value: 'equals', label: 'equal to' },
  { value: 'contains', label: 'contains' },
  { value: 'startsWith', label: 'starts with' },
  { value: 'endsWith', label: 'end with' },
]

const CONVERTED_ACCOUNT_COLUMN_DEFINITIONS = CONVERTED_ACCOUNT_FIELD_DEFINITIONS
  .filter((field) => field.key)
  .map((field) => ({
    key: field.key,
    label: field.label,
    filterPlaceholder: `Search ${field.label}`,
    width: field.key === 'description' || field.key === 'address'
      ? '240px'
      : field.key === 'name'
        ? '230px'
        : field.key === 'email'
          ? '190px'
          : '170px',
    searchable: true,
    exportable: true,
    clickable: field.key === 'accountNumber',
    cellFormatter: (_value, row) => getConvertedAccountsFieldText(row, field.key) || '-',
    exportFormatter: (_value, row) => getConvertedAccountsFieldText(row, field.key) || '',
  }))

const ConvertedAccountsFilterSelect = ({
  value,
  onChange,
  options,
  placeholder = 'Select',
  disabled = false,
  className = '',
}) => {
  const [open, setOpen] = useState(false)
  const [menuStyle, setMenuStyle] = useState({})
  const [openUpward, setOpenUpward] = useState(false)
  const selectRef = useRef(null)
  const menuRef = useRef(null)

  const selectedOption = options.find((option) => String(option.value) === String(value))
    || options[0]
    || { value: '', label: placeholder }

  const updateMenuPosition = useCallback(() => {
    const triggerElement = selectRef.current?.querySelector('.converted-accounts-filter-select__button')
    if (!triggerElement) return

    const rect = triggerElement.getBoundingClientRect()
    const viewportHeight = window.innerHeight || document.documentElement.clientHeight
    const viewportWidth = window.innerWidth || document.documentElement.clientWidth
    const estimatedHeight = Math.min(Math.max(options.length * 40, 120), 280)
    const spaceBelow = viewportHeight - rect.bottom - 12
    const spaceAbove = rect.top - 12
    const shouldOpenUpward = spaceBelow < estimatedHeight && spaceAbove > spaceBelow
    const width = Math.min(Math.max(rect.width, 220), Math.max(220, viewportWidth - 24))
    const left = Math.min(
      Math.max(12, rect.left),
      Math.max(12, viewportWidth - width - 12)
    )
    const maxHeight = Math.max(120, Math.min(320, shouldOpenUpward ? spaceAbove : spaceBelow))

    setOpenUpward(shouldOpenUpward)
    setMenuStyle({
      position: 'fixed',
      ...(shouldOpenUpward
        ? { bottom: `${Math.max(12, viewportHeight - rect.top + 4)}px`, top: 'auto' }
        : { top: `${Math.min(viewportHeight - 12, rect.bottom + 4)}px`, bottom: 'auto' }),
      left: `${left}px`,
      width: `${width}px`,
      maxHeight: `${maxHeight}px`,
    })
  }, [options.length])

  useEffect(() => {
    if (!open) return undefined

    updateMenuPosition()
    const handleOutsideClick = (event) => {
      const clickedInsideSelect = selectRef.current?.contains(event.target)
      const clickedInsideMenu = menuRef.current?.contains(event.target)
      if (!clickedInsideSelect && !clickedInsideMenu) {
        setOpen(false)
      }
    }
    const handleViewportChange = () => updateMenuPosition()

    document.addEventListener('mousedown', handleOutsideClick)
    window.addEventListener('scroll', handleViewportChange, true)
    window.addEventListener('resize', handleViewportChange)
    return () => {
      document.removeEventListener('mousedown', handleOutsideClick)
      window.removeEventListener('scroll', handleViewportChange, true)
      window.removeEventListener('resize', handleViewportChange)
    }
  }, [open, updateMenuPosition])

  return (
    <div className={`converted-accounts-filter-select ${className}`.trim()} ref={selectRef}>
      <button
        type="button"
        className="converted-accounts-filter-select__button"
        onClick={() => !disabled && setOpen((currentValue) => !currentValue)}
        disabled={disabled}
      >
        <span className="converted-accounts-filter-select__label">
          {selectedOption?.label || placeholder}
        </span>
        <FiChevronDown className={`converted-accounts-filter-select__caret${open ? ' converted-accounts-filter-select__caret--open' : ''}`} />
      </button>

      {open ? (
        createPortal(
          <div
            ref={menuRef}
            className={`converted-accounts-filter-select__menu${openUpward ? ' converted-accounts-filter-select__menu--upward' : ''}`}
            style={menuStyle}
          >
            {options.map((option) => (
              <button
                key={`${option.value || 'empty'}-${option.label}`}
                type="button"
                className={`converted-accounts-filter-select__option${String(option.value) === String(value) ? ' converted-accounts-filter-select__option--active' : ''}`}
                onClick={() => {
                  onChange(option.value)
                  setOpen(false)
                }}
              >
                {option.label}
              </button>
            ))}
          </div>,
          document.body
        )
      ) : null}
    </div>
  )
}

const buildInitialFilters = (columns) =>
  columns.reduce((filters, column) => {
    filters[column.key] = ''
    return filters
  }, {})

const getAccountFilterTextValue = (column, row = {}) => {
  const displayValue = getColumnTextValue(column, row)
  const fallbackValues = [
    displayValue,
    row[column.key],
    row.raw?.[column.key],
    row.raw?.formData?.[column.key],
  ]

  if (column.key === 'accountNumber') {
    fallbackValues.push(
      row.accountNumber,
      row.raw?.accountNumber,
      row.raw?.formData?.accountNumber,
      row.ownerCode,
      row.accountOwnerCode,
      row.employeeId,
      row.raw?.ownerCode,
      row.raw?.accountOwnerCode,
      row.raw?.employeeId,
      row.raw?.formData?.ownerCode,
      row.raw?.formData?.accountOwnerCode,
      row.raw?.formData?.employeeId
    )
  }

  if (column.key === 'name') {
    fallbackValues.push(
      row.name,
      row.accountName,
      row.customerName,
      row.raw?.name,
      row.raw?.accountName,
      row.raw?.customerName,
      row.raw?.formData?.name,
      row.raw?.formData?.accountName,
      row.raw?.formData?.customerName
    )
  }

  return fallbackValues
    .filter((value) => value !== null && value !== undefined && value !== '')
    .map((value) => String(value).toLowerCase())
    .join(' ')
}

const matchesColumnFilters = (row, filters, columns) =>
  columns.every((column) => {
    if (!column.searchable) return true
    const filterValue = (filters[column.key] || '').trim().toLowerCase()
    if (!filterValue) return true
    return getAccountFilterTextValue(column, row).includes(filterValue)
  })

const normalizeDropdownValue = (value) =>
  String(value || '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, ' ')

const resolveAccountOwnerFilterValue = (row = {}) => (
  row.accountOwnerDisplay
  || row.accountOwnerName
  || row.accountOwner
  || row.ownerName
  || row.raw?.accountOwner
  || row.raw?.ownerName
  || row.raw?.assignedUserName
  || ''
)

const accountOwnerFilterOptions = [
  { value: 'All', label: 'All' },
  ...getCrmOwnerOptions(),
]

const matchesViewAllDropdownFilters = (row = {}, cityFilter = 'All', ownerFilter = 'All') => {
  const ownerName = resolveAccountOwnerFilterValue(row)
  const cityMatches = cityFilter === 'All' || getCityForUser(ownerName || row.createdByUserName || row.addedBy) === cityFilter
  const ownerMatches = ownerFilter === 'All' || normalizeDropdownValue(ownerName) === normalizeDropdownValue(ownerFilter)

  return cityMatches && ownerMatches
}

const filterBoardDataByHiddenStages = (boardData, hiddenStageKeys = []) => {
  if (!Array.isArray(hiddenStageKeys) || hiddenStageKeys.length === 0) {
    return boardData
  }

  const hiddenStageSet = new Set(hiddenStageKeys)
  const records = (boardData.records || []).filter((record) => !hiddenStageSet.has(record.stage))
  const stages = (boardData.stages || []).filter((stage) => !hiddenStageSet.has(stage.key))
  const countsByStage = Object.fromEntries(
    Object.entries(boardData.countsByStage || {}).filter(([stageKey]) => !hiddenStageSet.has(stageKey))
  )
  const rowsByStage = Object.fromEntries(
    Object.entries(boardData.rowsByStage || {})
      .filter(([stageKey]) => !hiddenStageSet.has(stageKey))
      .map(([stageKey, rows]) => [
        stageKey,
        (rows || []).filter((record) => !hiddenStageSet.has(record.stage)),
      ])
  )

  return {
    ...boardData,
    records,
    stages,
    countsByStage,
    rowsByStage,
    totalRecords: records.length,
  }
}

const MyGroupAccountsPage = ({ variantKey = 'myGroup' }) => {
  const navigate = useNavigate()
  const location = useLocation()
  const addAccountPath = location.pathname.startsWith('/admin') ? '/admin/accounts/new' : '/accounts/new'
  const { accounts, convertedDeals, quotations = [], loading, refreshData, addNotification, updateAccount, deleteAccount, convertAccountToDeal } = useData()
  const { user } = useAuth()
  const [dbMongoUsers, setDbMongoUsers] = useState([]);
  useEffect(() => {
    userApi.listDirectory().then(users => {
      if (Array.isArray(users)) setDbMongoUsers(users);
    }).catch(err => console.error(err));
  }, []);
  const [searchParams, setSearchParams] = useSearchParams()
  const view = getAdminAccountsBoardView(variantKey)
  const isAdminPortal = location.pathname.startsWith('/admin')
  const showStageTabs = view.showStageTabs !== false
  const showAddAccountButton = view.showAddAccountButton === true
  const showRefreshButton = view.showRefreshButton !== false
  // Group Accounts board must always expose the Export CSV button in the toolbar,
  // regardless of variant config drift. Other variants keep their explicit setting.
  const showExportButton = variantKey === 'myGroup' ? true : view.showExportButton !== false
  const showRecordCountInHeroTitle = view.showRecordCountInHeroTitle === true
  const selectedTabField = view.selectedTabField || 'stage'
  const columns = useMemo(() => getAccountBoardColumns(variantKey), [variantKey])
  const isConvertedAccountsView = variantKey === 'convertedAccounts'
  const isSearchAccountView = variantKey === 'searchAccount'
  const useRowOwnerCodeAsAccountNumber = variantKey === 'myGroup' || variantKey === 'searchAccount'
  const useStageDropdown = variantKey === 'myGroup' || variantKey === 'myAccounts'
  const supportsAdvancedFilter = isConvertedAccountsView || isSearchAccountView
  const useExactAccountListTable = EXACT_ACCOUNT_LIST_VARIANTS.has(variantKey)
  const [filters, setFilters] = useState(() => buildInitialFilters(columns))
  const [showFilters, setShowFilters] = useState(true)
  const [visibleColumnKeys, setVisibleColumnKeys] = useState(() => getAccountColumnKeysWithRequiredFields(
    columns.map((column) => column.key),
    columns
  ))
  const [isConvertedFilterModalOpen, setIsConvertedFilterModalOpen] = useState(false)
  const [appliedConvertedFilterEnabled, setAppliedConvertedFilterEnabled] = useState(false)
  const [appliedConvertedFilterRules, setAppliedConvertedFilterRules] = useState(() => [DEFAULT_CONVERTED_FILTER_RULE()])
  const [convertedFilterEnabledDraft, setConvertedFilterEnabledDraft] = useState(false)
  const [convertedFilterRulesDraft, setConvertedFilterRulesDraft] = useState(() => [DEFAULT_CONVERTED_FILTER_RULE()])
  const [convertedColumnDraftValue, setConvertedColumnDraftValue] = useState('')
  const [convertedColumnKeysDraft, setConvertedColumnKeysDraft] = useState(() => getAccountColumnKeysWithRequiredFields(
    columns.map((column) => column.key),
    columns
  ))
  const [visibleSourceStageKeys, setVisibleSourceStageKeys] = useState([])
  const [selectedAccountIds, setSelectedAccountIds] = useState([])
  const [bulkDialog, setBulkDialog] = useState(null)
  const [bulkRemark, setBulkRemark] = useState('')
  const [bulkOwnerId, setBulkOwnerId] = useState('')
  const [bulkSaving, setBulkSaving] = useState(false)
  const [availableUsers, setAvailableUsers] = useState(() => authService.getAvailableUsers())
  const [cityFilter, setCityFilter] = useState('All')
  const [ownerFilter, setOwnerFilter] = useState('All')
  const [activeActionAccount, setActiveActionAccount] = useState(null)
  const [activeActionKey, setActiveActionKey] = useState(null)
  const lastAccountUpdateToastRef = useRef({ key: '', at: 0 })

  const allOwnerNames = useMemo(() => {
    const names = new Set()
    ;(availableUsers || []).forEach((u) => {
      const name = String(u.ownerDisplayName || u.name || u.username || u.email || '').trim()
      if (name) names.add(name)
    })
    ;(dbMongoUsers || []).forEach((u) => {
      const name = String(u.ownerDisplayName || u.name || u.username || u.email || '').trim()
      if (name) names.add(name)
    })
    ;(accounts || []).forEach((acc) => {
      const name = String(acc.accountOwnerDisplay || acc.accountOwnerName || acc.accountOwner || acc.raw?.accountOwner || '').trim()
      if (name && name.toLowerCase() !== 'no' && name !== '-') names.add(name)
    })
    return Array.from(names).sort((a, b) => a.localeCompare(b))
  }, [availableUsers, dbMongoUsers, accounts])

  const boardData = useMemo(() => {
    const nextBoardData = (
      variantKey === 'myAccounts'
        ? getMyAccountsBoardData(accounts, user)
        : variantKey === 'convertedAccounts'
          ? getConvertedAccountsBoardData(accounts)
        : variantKey === 'accountSourceView'
          ? getAccountSourceBoardData(accounts)
        : variantKey === 'swBarodaMum'
          ? getSwBarodaMumBoardData(accounts)
        : variantKey === 'userWiseLeads'
          ? getUserWiseLeadsBoardData(accounts)
        : variantKey === 'weeklyReportsAll'
          ? getWeeklyReportsAllBoardData(accounts)
        : variantKey === 'dailyFreshLeads'
          ? getDailyFreshLeadsBoardData(accounts)
        : variantKey === 'noFollowLeads'
          ? getNoFollowLeadsBoardData(accounts)
        : getAccountsBoardData(accounts)
    )

    return enrichBoardDataWithQuotationFields(
      filterBoardDataByHiddenStages(nextBoardData, view.hiddenStageKeys),
      quotations,
      [...availableUsers, ...dbMongoUsers]
    )
  }, [accounts, availableUsers, dbMongoUsers, quotations, user, variantKey, view.hiddenStageKeys])

  
  const getMongoOwnerCodeOnly = (row) => {
    let code = getCreatorOwnerCode(row);
    const rawOwnerName = String(row.accountOwnerDisplay || row.accountOwnerName || row.accountOwner || row.raw?.accountOwner || row.raw?.ownerName || row.raw?.assignedToName || '').trim();
    const ownerName = rawOwnerName.toLowerCase();
    
    if (ownerName) {
        const users = availableUsers || [];
        const dbUser = users.find(u => String(u.name || '').trim().toLowerCase() === ownerName || String(u.username || '').trim().toLowerCase() === ownerName);
        if (dbUser && dbUser.ownerCode) {
           code = String(dbUser.ownerCode).trim();
        }
    }
    
    // COMPLETELY REMOVED THE DASH!
    // If the user has an owner code, return it.
    // If the user does not have an owner code, return a COMPLETELY BLANK space (no dashes, no ACC00002).
    return code || '';
  };
const activeStageParam = searchParams.get('stage')
  const selectedAccountId = searchParams.get('accountId')
  const requestedPage = Number.parseInt(searchParams.get('page') || '1', 10)
  const visibleStages = useMemo(() => {
    if (!showStageTabs) return []
    if (variantKey !== 'accountSourceView') return boardData.stages

    const filteredStages = boardData.stages.filter((stage) => visibleSourceStageKeys.includes(stage.key))
    return filteredStages.length > 0 ? filteredStages : boardData.stages
  }, [boardData.stages, showStageTabs, variantKey, visibleSourceStageKeys])
  const activeStage =
    visibleStages.find((stage) => stage.key === activeStageParam)?.key ||
    visibleStages[0]?.key ||
    view.defaultStage ||
    DEFAULT_ACCOUNT_STAGE
  const activeStageMeta =
    visibleStages.find((stage) => stage.key === activeStage)
    || boardData.stages.find((stage) => stage.key === activeStage)

  const convertedBoardRecords = useMemo(
    () => getAccountRowsWithRequiredFields(
      isConvertedAccountsView ? boardData.records.map(buildConvertedAccountsRow) : boardData.records
    ),
    [boardData.records, isConvertedAccountsView]
  )
  const stageRows = useMemo(
    () => getAccountRowsWithRequiredFields(boardData.rowsByStage[activeStage] || []),
    [activeStage, boardData.rowsByStage]
  )
  const boardRows = showStageTabs ? stageRows : convertedBoardRecords
  const convertedFieldOptions = useMemo(() => (
    CONVERTED_ACCOUNT_FIELD_DEFINITIONS.filter((field) => field.key)
  ), [])
  const convertedColumnDefinitions = useMemo(() => (
    isConvertedAccountsView ? CONVERTED_ACCOUNT_COLUMN_DEFINITIONS : columns
  ), [columns, isConvertedAccountsView])
  const filterColumnDefinitions = useMemo(() => {
    if (isConvertedAccountsView) return convertedColumnDefinitions

    const myAccountsOwnerCode = resolveLoggedInUserOwnerCode(user, dbMongoUsers.length > 0 ? dbMongoUsers : availableUsers)
    return convertedColumnDefinitions.map((col) => {
      // 🚀 ABSOLUTE OVERRIDE FOR ALL ACCOUNT NUMBERS ACROSS ALL VIEWS!
      if (false) {
        return {
          ...col,
          isOverridden: true,
          cellFormatter: (_value, row) => getMongoOwnerCodeOnly(row),
          exportFormatter: (_value, row) => getMongoOwnerCodeOnly(row)
        };
      }

      if (variantKey === 'myAccounts' && col.key === 'accountNumber') {
        return {
          ...col,
          cellFormatter: () => myAccountsOwnerCode || '',
          exportFormatter: () => myAccountsOwnerCode || '',


        }
      }

      if (useRowOwnerCodeAsAccountNumber && col.key === 'accountNumber') {
        return {
          ...col,
          cellFormatter: (_value, row) => getMongoOwnerCodeOnly(row),
          exportFormatter: (_value, row) => getMongoOwnerCodeOnly(row),
        }
      }

      if (PLAIN_ACCOUNT_OWNER_VARIANTS.has(variantKey) && col.key === 'accountOwner') {
        return {
          ...col,
          exportFormatter: getPlainAccountOwnerName,
        }
      }

      return col
    })
  }, [availableUsers, convertedColumnDefinitions, isConvertedAccountsView, user, useRowOwnerCodeAsAccountNumber, variantKey, dbMongoUsers])
  const defaultConvertedVisibleColumnKeys = useMemo(
    () => getAccountColumnKeysWithRequiredFields(columns.map((column) => column.key), columns),
    [columns]
  )
  const matchesConvertedFilterRules = useCallback((row) => {
    if (!supportsAdvancedFilter || !appliedConvertedFilterEnabled) return true

    const activeRules = appliedConvertedFilterRules.filter((rule) => (
      rule.fieldKey && (rule.operator === 'empty' || String(rule.value || '').trim())
    ))
    if (activeRules.length === 0) return true

    return activeRules.every((rule) => {
      const rowValue = String(getConvertedAccountsFieldText(row, rule.fieldKey) || '').trim().toLowerCase()
      const targetValue = String(rule.value || '').trim().toLowerCase()
      let isMatch = true

      if (rule.operator === 'equals') {
        isMatch = rowValue === targetValue
      } else if (rule.operator === 'startsWith') {
        isMatch = rowValue.startsWith(targetValue)
      } else if (rule.operator === 'endsWith') {
        isMatch = rowValue.endsWith(targetValue)
      } else if (rule.operator === 'empty') {
        isMatch = rowValue === ''
      } else {
        isMatch = rowValue.includes(targetValue)
      }

      return rule.not ? !isMatch : isMatch
    })
  }, [appliedConvertedFilterEnabled, appliedConvertedFilterRules, supportsAdvancedFilter])
  const searchQuery = searchParams.get('query') || new URLSearchParams(location.search).get('query') || ''

  const filteredRows = useMemo(
    () => boardRows
      .filter((row) => matchesSectionSearch(row, [
        'accountNumber', 'accountNo', 'name', 'accountName', 'projectName',
        'accountOwner', 'accountDate', 'accountCategory', 'status', 'accountStatus',
        'accountState', 'phone', 'email', 'contactPerson', 'poValue', 'jobNo',
        'company', 'companyName', 'customerName', 'latestRemark', 'description', 'address',
      ], searchQuery))
      .filter((row) => matchesColumnFilters(row, filters, filterColumnDefinitions))
      .filter(matchesConvertedFilterRules)
      .filter((row) => {
        if (variantKey !== 'viewAll') return true
        return matchesViewAllDropdownFilters(row, cityFilter, ownerFilter)
      })
      .sort(compareAccountRows),
    [boardRows, filterColumnDefinitions, filters, matchesConvertedFilterRules, variantKey, cityFilter, ownerFilter, searchQuery]
  )
  const filteredAllStageRows = useMemo(
    () => convertedBoardRecords
      .filter((row) => matchesSectionSearch(row, [
        'accountNumber', 'accountNo', 'name', 'accountName', 'projectName',
        'accountOwner', 'accountDate', 'accountCategory', 'status', 'accountStatus',
        'accountState', 'phone', 'email', 'contactPerson', 'poValue', 'jobNo',
        'company', 'companyName', 'customerName', 'latestRemark', 'description', 'address',
      ], searchQuery))
      .filter((row) => matchesColumnFilters(row, filters, filterColumnDefinitions))
      .filter(matchesConvertedFilterRules)
      .filter((row) => {
        if (variantKey !== 'viewAll') return true
        return matchesViewAllDropdownFilters(row, cityFilter, ownerFilter)
      })
      .sort(compareAccountRows),
    [convertedBoardRecords, filterColumnDefinitions, filters, matchesConvertedFilterRules, variantKey, cityFilter, ownerFilter, searchQuery]
  )

  const rowsPerPage = DEFAULT_ROWS_PER_PAGE
  const totalPages = Math.max(1, Math.ceil(filteredRows.length / rowsPerPage))
  const currentPage = Number.isFinite(requestedPage) && requestedPage > 0
    ? Math.min(requestedPage, totalPages)
    : 1
  const menuResetKey = `${activeStage}-${currentPage}-${JSON.stringify(filters)}`
  const pageStart = filteredRows.length === 0 ? 0 : ((currentPage - 1) * rowsPerPage) + 1
  const pageEnd = Math.min(filteredRows.length, currentPage * rowsPerPage)
  const paginatedRows = filteredRows.slice(pageStart > 0 ? pageStart - 1 : 0, pageEnd)
  const selectedAccounts = useMemo(() => {
    const selectedIds = new Set(selectedAccountIds.map((id) => String(id)))
    return filteredAllStageRows.filter((row) => selectedIds.has(String(row.id)))
  }, [filteredAllStageRows, selectedAccountIds])
  const isKevalVShah = useMemo(() => {
    const identityValues = [user?.name, user?.username, user?.email]
      .map((value) => String(value || '').trim().toLowerCase())

    return identityValues.some((value) => (
      value === 'keval v shah'
      || value === 'keval v. shah'
      || value.startsWith('keval.v.shah@')
      || value.startsWith('kevalvshah@')
    ))
  }, [user?.email, user?.name, user?.username])
  const [fetchedBackendAccount, setFetchedBackendAccount] = useState(null)

  useEffect(() => {
    if (!selectedAccountId) {
      setFetchedBackendAccount(null)
      return
    }

    let isMounted = true

    const fetchAccountData = async () => {
      try {
        const lead = await leadApi.getLeadById(selectedAccountId)
        if (!isMounted || !lead || !lead.id) return

        let linkedDeal = null
        try {
          linkedDeal = await dealApi.getConvertedDealForAccount(lead.id)
        } catch (e) {
          // ignore if no linked deal
        }

        const normalizedLead = {
          ...lead,
          raw: lead,
          dealId: linkedDeal?.id || lead.dealId || lead.raw?.dealId || null,
          convertedDealId: linkedDeal?.id || lead.convertedDealId || null,
          isConverted: Boolean(linkedDeal?.id || lead.isConverted),
        }

        const formattedRecord = getAccountById([normalizedLead], selectedAccountId)
        if (isMounted && formattedRecord) {
          setFetchedBackendAccount(formattedRecord)
        }
      } catch (err) {
        console.error('Account lookup from MongoDB:', err)
      }
    }

    fetchAccountData()

    return () => {
      isMounted = false
    }
  }, [selectedAccountId])

  const localAccount = useMemo(
    () => getAccountById(boardData.records, selectedAccountId) || getAccountById(accounts, selectedAccountId),
    [boardData.records, accounts, selectedAccountId]
  )

  const selectedAccount = useMemo(
    () => localAccount || fetchedBackendAccount,
    [localAccount, fetchedBackendAccount]
  )

  const updateUrlState = useCallback((updates, replace = false) => {
    const nextParams = new URLSearchParams(searchParams)
    Object.entries(updates).forEach(([key, value]) => {
      if (value === null || value === undefined || value === '') {
        nextParams.delete(key)
        return
      }
      nextParams.set(key, String(value))
    })
    setSearchParams(nextParams, { replace })
  }, [searchParams, setSearchParams])

  useEffect(() => {
    if (activeStageParam !== activeStage) {
      updateUrlState({ stage: activeStage, page: 1 }, true)
    }
  }, [activeStage, activeStageParam, updateUrlState])

  useEffect(() => {
    if (String(currentPage) !== String(searchParams.get('page') || '1')) {
      updateUrlState({ page: currentPage }, true)
    }
  }, [currentPage, searchParams, updateUrlState])

  useEffect(() => {
    setFilters(buildInitialFilters(columns))
  }, [activeStage, columns, showStageTabs])

  useEffect(() => {
    setVisibleColumnKeys(defaultConvertedVisibleColumnKeys)
    setShowFilters(true)
    if (isConvertedAccountsView) {
      setConvertedColumnKeysDraft(defaultConvertedVisibleColumnKeys)
      setAppliedConvertedFilterEnabled(false)
      setAppliedConvertedFilterRules([DEFAULT_CONVERTED_FILTER_RULE()])
      setConvertedFilterEnabledDraft(false)
      setConvertedFilterRulesDraft([DEFAULT_CONVERTED_FILTER_RULE()])
    }
  }, [defaultConvertedVisibleColumnKeys, isConvertedAccountsView, variantKey])

  useEffect(() => {
    if (variantKey !== 'accountSourceView') {
      setVisibleSourceStageKeys([])
      return
    }

    setVisibleSourceStageKeys(boardData.stages.map((stage) => stage.key))
  }, [boardData.stages, variantKey])

  useEffect(() => {
    const visibleIds = new Set(filteredAllStageRows.map((row) => String(row.id)))
    setSelectedAccountIds((currentIds) => currentIds.filter((id) => visibleIds.has(String(id))))
  }, [filteredAllStageRows])

  useEffect(() => {
    setAvailableUsers(authService.getAvailableUsers())
  }, [user])

  const handleStageChange = (stageKey) => {
    updateUrlState({ stage: stageKey, page: 1, accountId: null })
  }

  const handlePageChange = (page) => {
    updateUrlState({ page })
  }

  const handleFilterChange = (key, value) => {
    setFilters((currentFilters) => ({
      ...currentFilters,
      [key]: value,
    }))
    updateUrlState({ page: 1 }, true)
  }

  const handleApplyVisibleColumns = useCallback((nextColumnKeys) => {
    const sourceColumns = isConvertedAccountsView ? convertedColumnDefinitions : columns
    setVisibleColumnKeys(getAccountColumnKeysWithRequiredFields(nextColumnKeys, sourceColumns))
  }, [columns, convertedColumnDefinitions, isConvertedAccountsView])

  const boardStateQuery = `?view=${encodeURIComponent(view.queryValue)}&stage=${encodeURIComponent(activeStage)}&page=${encodeURIComponent(currentPage)}`
  const visibleColumns = useMemo(() => {
    const sourceColumns = isConvertedAccountsView ? convertedColumnDefinitions : columns
    const nextVisibleColumnKeys = getAccountColumnKeysWithRequiredFields(visibleColumnKeys, sourceColumns)
    const sourceColumnMap = new Map(sourceColumns.map((column) => [column.key, column]))
    let filteredColumns = nextVisibleColumnKeys.map((key) => sourceColumnMap.get(key)).filter(Boolean)
    if (filteredColumns.length === 0) {
      filteredColumns = sourceColumns
    }
    const globalMongoOwnerCodeFix = true;
    filteredColumns = filteredColumns.map((col) => {
      if (col.key === 'accountNumber') {
        if (useRowOwnerCodeAsAccountNumber) {
          return {
            ...col,
            cellFormatter: (_value, row) => getMongoOwnerCodeOnly(row),
            exportFormatter: (_value, row) => getMongoOwnerCodeOnly(row),
          }
        }
        if (variantKey !== 'myAccounts') return col
        const myAccountsOwnerCode = resolveLoggedInUserOwnerCode(user, dbMongoUsers.length > 0 ? dbMongoUsers : availableUsers)
        return {
          ...col,
          cellFormatter: () => myAccountsOwnerCode || '',
          exportFormatter: () => myAccountsOwnerCode || '',
        };
      }
      return col;
    });

    const globalAccountNumberFix = true;
    filteredColumns = filteredColumns.map((col) => {
      if (col.key === 'accountNumber') {
        if (useRowOwnerCodeAsAccountNumber) {
          return {
            ...col,
            cellFormatter: (_value, row) => getMongoOwnerCodeOnly(row),
            exportFormatter: (_value, row) => getMongoOwnerCodeOnly(row),
          }
        }
        if (variantKey !== 'myAccounts') return col
        const myAccountsOwnerCode = resolveLoggedInUserOwnerCode(user, dbMongoUsers.length > 0 ? dbMongoUsers : availableUsers)
        return {
          ...col,
          cellFormatter: () => myAccountsOwnerCode || '',


          exportFormatter: () => myAccountsOwnerCode || ''


        };
      }
      return col;
    });


    if (variantKey === 'myAccounts' || PLAIN_ACCOUNT_OWNER_VARIANTS.has(variantKey)) {
      const myAccountsOwnerCode = resolveLoggedInUserOwnerCode(user, dbMongoUsers.length > 0 ? dbMongoUsers : availableUsers)

      return filteredColumns.map((col) => {
        if (variantKey === 'myAccounts' && col.key === 'accountNumber') {
          return {
            ...col,
            cellFormatter: () => myAccountsOwnerCode || '',


            exportFormatter: () => myAccountsOwnerCode || '',


          }
        }

        if (useRowOwnerCodeAsAccountNumber && col.key === 'accountNumber') {
          return {
            ...col,
            cellFormatter: (_value, row) => getMongoOwnerCodeOnly(row),
            exportFormatter: (_value, row) => getMongoOwnerCodeOnly(row),
          }
        }

        if (PLAIN_ACCOUNT_OWNER_VARIANTS.has(variantKey) && col.key === 'accountOwner') {
          return {
            ...col,
            cellFormatter: getPlainAccountOwnerName,
            exportFormatter: getPlainAccountOwnerName,
          }
        }

        return col
      })
    }

    return filteredColumns
  }, [availableUsers, columns, convertedColumnDefinitions, isConvertedAccountsView, user, useRowOwnerCodeAsAccountNumber, visibleColumnKeys, variantKey, dbMongoUsers])
  const rowActionsEnabled = isAdminPortal ? view.rowActionMenuEnabled : true
  const rowActions = useMemo(() => (
    isAdminPortal ? (view.rowActions || ACCOUNT_ROW_ACTIONS) : USER_ACCOUNT_ROW_ACTIONS
  ), [isAdminPortal, view.rowActions])
  const drawerActions = isAdminPortal ? ACCOUNT_DRAWER_ACTIONS : USER_ACCOUNT_DRAWER_ACTIONS

  const handleOpenAccount = (row) => {
    updateUrlState({ accountId: row.id })
  }

  const handleConvertToDeal = (row) => {
    if (!row?.id) return
    setActiveActionAccount(row)
    setActiveActionKey('converted-deal')
  }

  const handleViewLinkedDeal = (row) => {
    const relatedConvertedDeal = (Array.isArray(convertedDeals) ? convertedDeals : [])
      .find((entry) => String(entry.accountId || '') === String(row?.id || row?.raw?.id || ''))
    const dealId = row?.dealId
      || row?.raw?.dealId
      || relatedConvertedDeal?.sourceDealId
      || relatedConvertedDeal?.dealId
      || row?.convertedDealId
      || row?.raw?.convertedDealId
      || ''
    if (!dealId) {
      addNotification('warning', 'Deal not found', 'This account does not have a linked deal yet.')
      return
    }

    if (isAdminPortal) {
      navigate(buildAdminDealDetailUrl(dealId))
      return
    }

    navigate('/deals/search', { state: { editDealId: dealId } })
  }

  const handleDeleteAccount = async (row) => {
    if (!row?.id) return
    const confirmed = window.confirm('Are you sure you want to delete this Account?')
    if (!confirmed) return

    const result = await deleteAccount(row.id)
    if (!result.success) {
      addNotification('error', 'Delete failed', result.message || 'Unable to delete account.')
      return
    }

    updateUrlState({ accountId: null }, true)
    addNotification('success', 'Account deleted', 'Account was removed from the list.')
  }

  const handleDrawerClose = () => {
    updateUrlState({ accountId: null })
  }

  const handleSaveAccountDetails = async (accountId, updates) => {
    const result = await updateAccount(accountId, updates)

    if (result.success) {
      const toastKey = `${accountId}:${JSON.stringify(updates)}`
      const now = Date.now()
      const isDuplicateToast = (
        lastAccountUpdateToastRef.current.key === toastKey
        && now - lastAccountUpdateToastRef.current.at < 2000
      )
      if (!isDuplicateToast) {
        addNotification('success', 'Account updated', 'Account details saved successfully.')
        lastAccountUpdateToastRef.current = { key: toastKey, at: now }
      }
      await refreshData()
      return result
    }

    addNotification('error', 'Update failed', result.message || 'Unable to update account details.')
    return result
  }

  const closeBulkDialog = () => {
    setBulkDialog(null)
    setBulkRemark('')
    setBulkOwnerId('')
  }

  const handleBulkValidationError = (message) => {
    addNotification('warning', 'Bulk Actions', message)
  }

  const handleBulkAddRemark = async () => {
    const remark = bulkRemark.trim()

    if (!remark) {
      addNotification('warning', 'Remark required', 'Please enter remark text.')
      return
    }

    setBulkSaving(true)

    try {
      const result = await leadApi.bulkAddRemarks({
        ids: selectedAccountIds,
        content: remark,
        category: 'general',
      })
      addNotification('success', 'Remarks added', `Remark saved for ${result?.updatedCount || selectedAccountIds.length} account(s).`)
      closeBulkDialog()
      setSelectedAccountIds([])
      await refreshData()
    } catch (error) {
      addNotification('error', 'Bulk remark failed', error.response?.data?.message || error.message)
    } finally {
      setBulkSaving(false)
    }
  }

  const handleBulkReassign = async () => {
    const selectedUser = availableUsers.find((entry) => String(entry.id) === String(bulkOwnerId))

    if (!selectedUser) {
      addNotification('warning', 'User required', 'Please select a user for re-assignment.')
      return
    }

    const confirmed = window.confirm(`Re-assign ${selectedAccountIds.length} selected account(s) to ${selectedUser.name || selectedUser.username}?`)
    if (!confirmed) {
      return
    }

    setBulkSaving(true)

    try {
      const result = await leadApi.bulkReassign({
        ids: selectedAccountIds,
        assignedTo: selectedUser.id,
        ownerName: selectedUser.name || selectedUser.username || selectedUser.email,
      })
      addNotification('success', 'Accounts re-assigned', `${result?.updatedCount || selectedAccountIds.length} account(s) updated.`)
      closeBulkDialog()
      setSelectedAccountIds([])
      await refreshData()
    } catch (error) {
      addNotification('error', 'Re-assign failed', error.response?.data?.message || error.message)
    } finally {
      setBulkSaving(false)
    }
  }

  const openConvertedFilterModal = () => {
    setConvertedFilterEnabledDraft(appliedConvertedFilterEnabled)
    setConvertedFilterRulesDraft(
      appliedConvertedFilterRules.length > 0
        ? appliedConvertedFilterRules.map((rule) => ({ ...rule }))
        : [DEFAULT_CONVERTED_FILTER_RULE()]
    )
    setConvertedColumnKeysDraft(
      getAccountColumnKeysWithRequiredFields(
        visibleColumnKeys.length > 0
          ? visibleColumnKeys
          : defaultConvertedVisibleColumnKeys,
        convertedColumnDefinitions
      )
    )
    setConvertedColumnDraftValue('')
    setIsConvertedFilterModalOpen(true)
  }

  const closeConvertedFilterModal = () => {
    setIsConvertedFilterModalOpen(false)
  }

  const handleConvertedFilterDraftChange = (ruleId, updates) => {
    setConvertedFilterRulesDraft((currentValue) => currentValue.map((rule) => (
      rule.id === ruleId
        ? {
          ...rule,
          ...updates,
          value: updates.operator === 'empty'
            ? ''
            : updates.value !== undefined
              ? updates.value
              : rule.value,
        }
        : rule
    )))
  }

  const addConvertedFilterRule = () => {
    setConvertedFilterRulesDraft((currentValue) => [...currentValue, DEFAULT_CONVERTED_FILTER_RULE()])
  }

  const removeConvertedFilterRule = (ruleId) => {
    setConvertedFilterRulesDraft((currentValue) => (
      currentValue.length <= 1
        ? [DEFAULT_CONVERTED_FILTER_RULE()]
        : currentValue.filter((rule) => rule.id !== ruleId)
    ))
  }

  const addConvertedColumnDraft = () => {
    if (!convertedColumnDraftValue) return

    setConvertedColumnKeysDraft((currentValue) => (
      currentValue.includes(convertedColumnDraftValue)
        ? currentValue
        : getAccountColumnKeysWithRequiredFields([...currentValue, convertedColumnDraftValue], convertedColumnDefinitions)
    ))
    setConvertedColumnDraftValue('')
  }

  const removeConvertedColumnDraft = (fieldKey) => {
    setConvertedColumnKeysDraft((currentValue) => getAccountColumnKeysWithRequiredFields(
      currentValue.filter((entry) => entry !== fieldKey),
      convertedColumnDefinitions
    ))
  }

  const handleApplyConvertedFilterChanges = () => {
    const sanitizedRules = convertedFilterRulesDraft.map((rule) => ({ ...rule }))
    const nextColumnKeys = getAccountColumnKeysWithRequiredFields(
      convertedColumnKeysDraft.length > 0
        ? convertedColumnKeysDraft
        : defaultConvertedVisibleColumnKeys,
      convertedColumnDefinitions
    )

    setAppliedConvertedFilterEnabled(convertedFilterEnabledDraft)
    setAppliedConvertedFilterRules(sanitizedRules)
    setVisibleColumnKeys(nextColumnKeys)
    updateUrlState({ page: 1 }, true)
    setIsConvertedFilterModalOpen(false)
  }

  const handleSaveAndApplyConvertedFilterChanges = () => {
    handleApplyConvertedFilterChanges()
  }

  const handleResetConvertedAccountsView = async () => {
    setFilters(buildInitialFilters(columns))
    setShowFilters(true)
    setVisibleColumnKeys(defaultConvertedVisibleColumnKeys)
    setAppliedConvertedFilterEnabled(false)
    setAppliedConvertedFilterRules([DEFAULT_CONVERTED_FILTER_RULE()])
    setConvertedFilterEnabledDraft(false)
    setConvertedFilterRulesDraft([DEFAULT_CONVERTED_FILTER_RULE()])
    setConvertedColumnDraftValue('')
    setConvertedColumnKeysDraft(defaultConvertedVisibleColumnKeys)
    setIsConvertedFilterModalOpen(false)
    updateUrlState({ page: 1 }, true)
    await refreshData()
  }

  useEffect(() => {
    if (variantKey === 'weeklyReportsAll' && isKevalVShah) {
      navigate('/admin/accounts/my-group-accounts', { replace: true })
    }
  }, [isKevalVShah, navigate, variantKey])

  const pageTitle = showRecordCountInHeroTitle
    ? `${view.heroTitle} - ${boardData.totalRecords} records`
    : view.heroTitle

  if (variantKey === 'weeklyReportsAll' && isKevalVShah) {
    return null
  }

  return (
    <div className={`admin-accounts-page admin-accounts-page--${variantKey}`}>

      {/* â”€â”€ Page title bar â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
      <div className="mga-titlebar">
        <h1 className="mga-titlebar-heading">{pageTitle}</h1>
        <AccountBoardHeaderActions
          view={view}
          currentStageRows={filteredRows}
          allRows={filteredAllStageRows}
          activeStageLabel={activeStageMeta?.label || activeStage}
          visibleColumns={visibleColumns}
          allColumns={isConvertedAccountsView ? convertedColumnDefinitions : columns}
          onApplyVisibleColumns={handleApplyVisibleColumns}
          showFilters={showFilters}
          onToggleFilters={supportsAdvancedFilter ? openConvertedFilterModal : () => setShowFilters((currentValue) => !currentValue)}
          onRefresh={isConvertedAccountsView ? handleResetConvertedAccountsView : refreshData}
          filterButtonTitle={supportsAdvancedFilter ? `Filter ${view.heroTitle}` : undefined}
          refreshButtonTitle={isConvertedAccountsView ? 'Reset Converted Accounts View' : 'Refresh'}
          sourceStageOptions={boardData.stages}
          visibleSourceStageKeys={visibleSourceStageKeys}
          onApplyVisibleSourceStages={setVisibleSourceStageKeys}
          selectedRows={selectedAccounts}
          onBulkAddRemark={() => setBulkDialog('remark')}
          onBulkReAssign={() => setBulkDialog('reassign')}
          onBulkValidationError={handleBulkValidationError}
        />
      </div>

      {/* â”€â”€ Stage tabs â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
      {showStageTabs && useStageDropdown ? (
        <div className="admin-accounts-stage-dropdown-wrapper">
          <label className="admin-accounts-stage-dropdown-label">
            <span>View</span>
            <select
              className="admin-accounts-stage-dropdown-select"
              value={activeStage}
              onChange={(event) => handleStageChange(event.target.value)}
              aria-label={`${view.heroTitle} stage`}
            >
              {visibleStages.map((stage) => (
                <option key={stage.key} value={stage.key}>
                  {stage.label} ({boardData.countsByStage[stage.key] || 0})
                </option>
              ))}
            </select>
          </label>
        </div>
      ) : showStageTabs ? (
        <AccountsStageTabs
          stages={visibleStages}
          activeStage={activeStage}
          countsByStage={boardData.countsByStage}
          onChange={handleStageChange}
        />
      ) : null}

      {/* â”€â”€ Board card â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
      <section className={`admin-accounts-board-card${showStageTabs ? ' admin-accounts-board-card--with-tabs' : ' admin-accounts-board-card--compact'}`}>
        {view.summaryBanner ? (
          <div className="admin-accounts-banner-strip">
            <span>{view.summaryBanner}</span>
          </div>
        ) : null}

        {view.summaryMode === 'weekly' ? (
          <div className="admin-accounts-summary-panel">
            <p><strong>Criteria:</strong> {view.criteriaLabel}</p>
            <p><strong>Total Records:</strong> {filteredRows.length}</p>
          </div>
        ) : null}

        <div className="admin-accounts-board-toolbar">
          <div>
            <p className="admin-accounts-board-subtitle">
              {view.summaryMode === 'source'
                ? `Total ${activeStageMeta?.label || activeStage} Records: ${filteredRows.length}`
                : view.summaryMode === 'converted'
                ? `Showing ${filteredRows.length} converted accounts.`
                : view.summaryMode === 'owner'
                ? `Total Records: ${filteredRows.length}`
                : view.summaryMode === 'weekly'
                ? `Showing ${filteredRows.length} records from the last 7 days.`
                : showStageTabs
                ? `Stage: ${visibleStages.find((s) => s.key === activeStage)?.label || activeStage} - ${filteredRows.length} records`
                : `${filteredRows.length} records`}
            </p>
          </div>

          <div className="admin-accounts-board-toolbar-actions">
            <label className="admin-accounts-toolbar-search-filter">
              <span>Search:</span>
              <input
                type="text"
                className="admin-accounts-toolbar-search-input"
                value={searchParams.get('query') || ''}
                onChange={(event) => updateUrlState({ query: event.target.value, page: 1 }, true)}
                placeholder="Search Account Name, Project Name..."
                aria-label="Search Account Name or Project Name"
              />
            </label>
            {variantKey !== 'viewAll' ? (
              <label className="admin-accounts-toolbar-owner-filter">
                <span>Owner:</span>
                <select
                  className="admin-accounts-toolbar-owner-select"
                  value={filters.accountOwner || ''}
                  onChange={(event) => handleFilterChange('accountOwner', event.target.value)}
                  aria-label="Filter by Owner"
                >
                  <option value="">All Owners</option>
                  {allOwnerNames.map((name) => (
                    <option key={name} value={name}>{name}</option>
                  ))}
                </select>
              </label>
            ) : null}
            {variantKey === 'viewAll' ? (
              <div className="mga-view-all-filter-group" aria-label="View all account filters">
                <label className="mga-view-all-filter">
                  <span>City</span>
                  <select
                    className="mga-view-all-filter-select"
                    value={cityFilter}
                    onChange={(event) => setCityFilter(event.target.value)}
                    aria-label="City"
                  >
                    <option value="All">All</option>
                    <option value="Baroda">Baroda</option>
                    <option value="Ahemedabad">Ahemedabad</option>
                    <option value="Mumbai">Mumbai</option>
                  </select>
                </label>
                <label className="mga-view-all-filter">
                  <span>Owner</span>
                  <select
                    className="mga-view-all-filter-select"
                    value={ownerFilter}
                    onChange={(event) => setOwnerFilter(event.target.value)}
                    aria-label="Owner"
                  >
                    {accountOwnerFilterOptions.map((option) => (
                      <option key={option.value} value={option.value}>{option.label}</option>
                    ))}
                  </select>
                </label>
              </div>
            ) : null}
            {showAddAccountButton ? (
              <Button size="small" onClick={() => navigate(addAccountPath)}>
                Add Account
              </Button>
            ) : null}
            {showRefreshButton ? (
              <Button
                variant="outline"
                size="small"
                className={variantKey === 'myGroup' ? 'admin-accounts-toolbar-refresh-btn' : ''}
                onClick={refreshData}
                loading={loading}
              >
                Refresh
              </Button>
            ) : null}
            {showExportButton ? (
              <AccountsExportButton
                currentStageRows={filteredRows}
                allRows={filteredAllStageRows}
                disabled={
                  variantKey === 'myGroup'
                    ? false
                    : filteredRows.length === 0 && filteredAllStageRows.length === 0
                }
                filePrefix={view.exportFilePrefix}
                boardTitle={view.heroTitle}
                activeStageLabel={activeStageMeta?.label || activeStage}
                exportKind={view.exportKind}
                buttonLabel={view.exportButtonLabel}
              />
            ) : null}
          </div>
        </div>

        <AccountsLegacyBoard
          columns={visibleColumns}
          rows={paginatedRows}
          filters={filters}
          onFilterChange={handleFilterChange}
          showFilters={showFilters}
          onAccountOpen={handleOpenAccount}
          selectedAccountId={selectedAccountId}
          emptyMessage={activeStageMeta?.emptyStateText || (showStageTabs
            ? 'No accounts found for this stage.'
            : 'No accounts found.')}
          boardStateQuery={boardStateQuery}
          menuResetKey={menuResetKey}
          rowActionsEnabled={rowActionsEnabled}
          rowActions={rowActions}
          mainButtonBehavior={view.mainButtonBehavior}
          selectable={!useExactAccountListTable && activeStage !== 'daily_fresh_leads' && activeStage !== 'no_follow_leads' && variantKey !== 'dailyFreshLeads' && variantKey !== 'noFollowLeads' && variantKey !== 'weeklyReportsAll'}
          showSerialNumber={!useExactAccountListTable}
          selectedRowIds={selectedAccountIds}
          onSelectionChange={setSelectedAccountIds}
          serialOffset={pageStart}
          onConvertToDeal={handleConvertToDeal}
          onViewDeal={handleViewLinkedDeal}
          onDeleteAccount={handleDeleteAccount}
          ownerOptions={allOwnerNames}
        />

        <AccountsBoardPagination
          currentPage={currentPage}
          totalPages={totalPages}
          pageStart={pageStart}
          pageEnd={pageEnd}
          totalItems={filteredRows.length}
          onPageChange={handlePageChange}
        />
      </section>

      <AccountDetailsDrawer
        account={selectedAccount}
        isOpen={Boolean(selectedAccountId && selectedAccount)}
        onClose={handleDrawerClose}
        boardStateQuery={boardStateQuery}
        onSaveAccount={handleSaveAccountDetails}
        onRefresh={refreshData}
        onDeleteAccount={handleDeleteAccount}
        canEdit={user?.role === 'admin' || selectedAccount?.recordSource === 'live'}
        actionItems={drawerActions}
        hiddenFieldKeys={(!location.pathname.startsWith('/admin') || variantKey === 'myGroup') ? ['accountState'] : []}
      />

      <Modal
        isOpen={supportsAdvancedFilter && isConvertedFilterModalOpen}
        onClose={closeConvertedFilterModal}
        title={`Filter ${view.heroTitle}`}
        size="large"
        showClose={false}
        headerActions={(
          <>
            <button
              type="button"
              className="converted-accounts-filter-modal-header-btn converted-accounts-filter-modal-header-btn-close"
              onClick={closeConvertedFilterModal}
            >
              Close
            </button>
            <button
              type="button"
              className="converted-accounts-filter-modal-header-btn converted-accounts-filter-modal-header-btn-apply"
              onClick={handleApplyConvertedFilterChanges}
            >
              Apply
            </button>
            <button
              type="button"
              className="converted-accounts-filter-modal-header-btn converted-accounts-filter-modal-header-btn-save"
              onClick={handleSaveAndApplyConvertedFilterChanges}
            >
              Save & Apply
            </button>
          </>
        )}
      >
        <div className="converted-accounts-filter-modal">
          <section className="converted-accounts-filter-section">
            <div className="converted-accounts-filter-section-row">
              <span className="converted-accounts-filter-section-label">Add Additional Filters</span>
              <div className="converted-accounts-filter-toggle">
                <button
                  type="button"
                  className={`converted-accounts-filter-toggle-btn${convertedFilterEnabledDraft ? ' converted-accounts-filter-toggle-btn--active' : ''}`}
                  onClick={() => setConvertedFilterEnabledDraft(true)}
                >
                  YES
                </button>
                <button
                  type="button"
                  className={`converted-accounts-filter-toggle-btn${!convertedFilterEnabledDraft ? ' converted-accounts-filter-toggle-btn--active' : ''}`}
                  onClick={() => setConvertedFilterEnabledDraft(false)}
                >
                  NO
                </button>
              </div>
            </div>
          </section>

          <section className="converted-accounts-filter-section">
            <div className="converted-accounts-filter-section-title">Configure Filters</div>
            <div className={`converted-accounts-filter-rules${convertedFilterEnabledDraft ? '' : ' converted-accounts-filter-rules--disabled'}`}>
              {convertedFilterRulesDraft.map((rule, index) => (
                <div key={rule.id} className="converted-accounts-filter-rule-row">
                  <span className="converted-accounts-filter-rule-prefix">{index === 0 ? 'If' : 'And'}</span>
                  <ConvertedAccountsFilterSelect
                    value={rule.fieldKey}
                    onChange={(value) => handleConvertedFilterDraftChange(rule.id, {
                      fieldKey: value,
                      operator: '',
                      value: '',
                    })}
                    options={CONVERTED_ACCOUNT_FIELD_DEFINITIONS}
                    disabled={!convertedFilterEnabledDraft}
                    className="converted-accounts-filter-rule-field"
                  />
                  <label className="converted-accounts-filter-rule-not">
                    <input
                      type="checkbox"
                      checked={rule.not}
                      disabled={!convertedFilterEnabledDraft}
                      onChange={(event) => handleConvertedFilterDraftChange(rule.id, { not: event.target.checked })}
                    />
                    <span>not</span>
                  </label>
                  <ConvertedAccountsFilterSelect
                    value={rule.operator}
                    onChange={(value) => handleConvertedFilterDraftChange(rule.id, {
                      operator: value,
                      value: value === 'empty' ? '' : rule.value,
                    })}
                    options={CONVERTED_ACCOUNT_FILTER_OPERATORS}
                    disabled={!convertedFilterEnabledDraft || !rule.fieldKey}
                    className="converted-accounts-filter-rule-operator"
                  />
                  {rule.operator === 'empty' ? (
                    <div className="converted-accounts-filter-rule-value converted-accounts-filter-rule-value-empty">
                      No value needed
                    </div>
                  ) : (
                    <label className="converted-accounts-filter-rule-input">
                      <span className="sr-only">Filter Value</span>
                      <input
                        type="text"
                        value={rule.value}
                        onChange={(event) => handleConvertedFilterDraftChange(rule.id, { value: event.target.value })}
                        placeholder={rule.fieldKey ? `Enter ${CONVERTED_ACCOUNT_FIELD_DEFINITIONS.find((field) => field.key === rule.fieldKey)?.label || 'value'}` : 'Enter value'}
                        disabled={!convertedFilterEnabledDraft || !rule.fieldKey || !rule.operator}
                      />
                    </label>
                  )}
                  <button
                    type="button"
                    className="converted-accounts-filter-rule-btn"
                    disabled={!convertedFilterEnabledDraft}
                    onClick={addConvertedFilterRule}
                    aria-label="Add filter row"
                  >
                    +
                  </button>
                  {convertedFilterRulesDraft.length > 1 ? (
                      <button
                        type="button"
                        className="converted-accounts-filter-rule-btn converted-accounts-filter-rule-btn-remove"
                        disabled={!convertedFilterEnabledDraft}
                        onClick={() => removeConvertedFilterRule(rule.id)}
                        aria-label="Remove filter row"
                      >
                        -
                      </button>
                  ) : null}
                </div>
              ))}
            </div>
          </section>

          <section className="converted-accounts-filter-section">
            <div className="converted-accounts-filter-section-title">Add Columns</div>
            <div className="converted-accounts-filter-columns-row">
              <ConvertedAccountsFilterSelect
                value={convertedColumnDraftValue}
                onChange={setConvertedColumnDraftValue}
                options={CONVERTED_ACCOUNT_FIELD_DEFINITIONS}
                className="converted-accounts-filter-columns-select"
              />
              <button
                type="button"
                className="converted-accounts-filter-rule-btn"
                onClick={addConvertedColumnDraft}
                aria-label="Add column"
              >
                +
              </button>
            </div>

            <div className="converted-accounts-filter-columns-list">
              {convertedColumnKeysDraft.length > 0 ? (
                convertedColumnKeysDraft.map((fieldKey) => {
                  const field = convertedFieldOptions.find((entry) => entry.key === fieldKey)
                  if (!field) return null

                  return (
                    <div key={field.key} className="converted-accounts-filter-column-chip">
                      <span>{field.label}</span>
                      <button
                        type="button"
                        className="converted-accounts-filter-column-chip-remove"
                        onClick={() => removeConvertedColumnDraft(field.key)}
                        aria-label={`Remove ${field.label}`}
                      >
                        &times;
                      </button>
                    </div>
                  )
                })
              ) : (
                <div className="converted-accounts-filter-empty">Default converted account columns will be used.</div>
              )}
            </div>
          </section>
        </div>
      </Modal>

      <Modal
        isOpen={bulkDialog === 'remark'}
        onClose={closeBulkDialog}
        title="Add Remark"
        size="medium"
        footer={(
          <>
            <Button variant="outline" onClick={closeBulkDialog} disabled={bulkSaving}>
              Close
            </Button>
            <Button onClick={handleBulkAddRemark} loading={bulkSaving}>
              Add
            </Button>
          </>
        )}
      >
        <div className="admin-accounts-bulk-modal">
          <p className="admin-accounts-bulk-summary">
            Selected accounts: <strong>{selectedAccountIds.length}</strong>
          </p>
          <label className="admin-accounts-bulk-field">
            <span>Remark</span>
            <textarea
              value={bulkRemark}
              onChange={(event) => setBulkRemark(event.target.value)}
              placeholder="Add remark here..."
              rows={6}
            />
          </label>
        </div>
      </Modal>

      <Modal
        isOpen={bulkDialog === 'reassign'}
        onClose={closeBulkDialog}
        title="Re-Assign Accounts"
        size="medium"
        footer={(
          <>
            <Button variant="outline" onClick={closeBulkDialog} disabled={bulkSaving}>
              Close
            </Button>
            <Button onClick={handleBulkReassign} loading={bulkSaving}>
              Save
            </Button>
          </>
        )}
      >
        <div className="admin-accounts-bulk-modal">
          <p className="admin-accounts-bulk-summary">
            Selected accounts: <strong>{selectedAccountIds.length}</strong>
          </p>
          <label className="admin-accounts-bulk-field">
            <span>Assign To</span>
            <select
              value={bulkOwnerId}
              onChange={(event) => setBulkOwnerId(event.target.value)}
            >
              <option value="">Select user</option>
              {availableUsers.map((entry) => (
                <option key={entry.id} value={entry.id}>
                  {entry.ownerDisplayName || entry.name || entry.username || entry.email}
                </option>
              ))}
            </select>
          </label>
          <p className="admin-accounts-bulk-help">
            You will be asked to confirm before selected accounts are updated.
          </p>
        </div>
      </Modal>

      {activeActionAccount && activeActionKey ? (
        <AccountActionModal
          account={activeActionAccount}
          actionKey={activeActionKey}
          onClose={() => {
            setActiveActionAccount(null)
            setActiveActionKey(null)
          }}
          onSaved={async () => {
            await refreshData()
            setActiveActionAccount(null)
            setActiveActionKey(null)
          }}
        />
      ) : null}
    </div>
  )
}

export default MyGroupAccountsPage
