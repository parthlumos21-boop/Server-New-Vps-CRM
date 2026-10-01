import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { useLocation, useNavigate, useParams } from 'react-router-dom'
import {
  FaBell,
  FaBook,
  FaBuilding,
  FaCalendarAlt,
  FaCheck,
  FaChevronDown,
  FaChevronLeft,
  FaChevronRight,
  FaClock,
  FaDesktop,
  FaEdit,
  FaEnvelope,
  FaFileExport,
  FaFilter,
  FaHourglassHalf,
  FaIdBadge,
  FaInfoCircle,
  FaLayerGroup,
  FaLink,
  FaMapMarkerAlt,
  FaPhoneAlt,
  FaPlus,
  FaPuzzlePiece,
  FaThumbsUp,
  FaTimes,
  FaUserPlus,
  FaUserTie,
} from 'react-icons/fa'
import { FiLayers } from 'react-icons/fi'
import { CUSTOMER_ACTION_MAP } from '../../../features/adminCustomers/config/customerActions'

import {
  ACCOUNT_CATEGORY_OPTIONS,
} from '../../../features/accounts/config/accountDropdownOptions'
import { authService } from '../../../services/authService'
import { calendarApi } from '../../../services/calendarApi'
import { customerService } from '../../../services/customerService'
import { useAuth } from '../../../context/AuthContext'
import { useClickOutside } from '../../../hooks'
import { getCrmOwnerDisplay, isSameCrmOwner } from '../../../features/users/crmUserDirectory'
import { exportExcelWorkbook } from '../../../utils/excelExport'
import CustomerBulkActionDialog from './CustomerBulkActionDialog'
import CustomerDetailsDrawer from './CustomerDetailsDrawer'
import './AdminCustomersPage.css'

const steps = [
  { key: 'details', label: 'Customer Details' },
  { key: 'contacts', label: 'Contacts' },
  { key: 'remarks', label: 'Reminder & Remarks' },
]

const customerCategories = [
  { value: '', label: 'Select' },
  ...ACCOUNT_CATEGORY_OPTIONS,
]

const reminderModes = [
  { value: '', label: 'Select' },
  { value: 'Call', label: 'Call' },
  { value: 'Email', label: 'Email' },
  { value: 'Meeting', label: 'Meeting' },
  { value: 'Visit', label: 'Visit' },
]

const searchColumns = [
  { key: 'customerNumber', label: 'Customer Number', placeholder: 'Search here ...' },
  { key: 'customerName', label: 'Customer Name', placeholder: 'Search here ...' },
  { key: 'contactPerson', label: 'Contact Person', placeholder: 'Search here ...' },
  { key: 'email', label: 'Email', placeholder: 'Search here ...' },
  { key: 'phone', label: 'Phone', placeholder: 'Search here ...' },
  { key: 'address', label: 'Address', placeholder: 'Search here ...' },
  { key: 'addedDate', label: 'Added Date', placeholder: 'Search here ...' },
  { key: 'customerCategory', label: 'Customer Category', placeholder: 'Search here ...' },
  { key: 'customerOwner', label: 'Customer Owner', placeholder: 'Search here ...' },
  { key: 'customerStatus', label: 'Customer Status', placeholder: 'Search here ...' },
  { key: 'customerType', label: 'Customer Type', placeholder: 'Search here ...' },
  { key: 'productCategory', label: 'Product Category', placeholder: 'Search here ...' },
  { key: 'designation', label: 'Designation', placeholder: 'Search here ...' },
  { key: 'projectName', label: 'Project Name', placeholder: 'Search here ...' },
  { key: 'state', label: 'State', placeholder: 'Search here ...' },
  { key: 'industryType', label: 'Industry Type', placeholder: 'Search here ...' },
  { key: 'gstin', label: 'GSTIN', placeholder: 'Search here ...' },
  { key: 'stateCode', label: 'State Code', placeholder: 'Search here ...' },
  { key: 'alternateEmail', label: 'Alternate Email', placeholder: 'Search here ...' },
  { key: 'alternatePhone', label: 'Alternate Phone', placeholder: 'Search here ...' },
  { key: 'jobNo', label: 'Job No', placeholder: 'Search here ...' },
  { key: 'addedBy', label: 'Added By', placeholder: 'Search here ...' },
  { key: 'lastUpdated', label: 'Last Updated', placeholder: 'Search here ...' },
  { key: 'latestRemark', label: 'Latest Remark', placeholder: 'Search here ...' },
]

const tableColumnKeys = [
  'customerNumber',
  'customerName',
  'email',
  'phone',
  'addedDate',
  'customerOwner',
  'customerCategory',
  'customerStatus',
  'customerType',
  'latestRemark',
]

const myCustomersTableColumnKeys = [
  'customerNumber',
  'customerName',
  'addedDate',
  'email',
  'phone',
  'customerCategory',
  'customerOwner',
  'customerStatus',
]

const tableSearchColumns = tableColumnKeys.map((key) => searchColumns.find((column) => column.key === key)).filter(Boolean)
const myCustomersTableSearchColumns = myCustomersTableColumnKeys.map((key) => searchColumns.find((column) => column.key === key)).filter(Boolean)

const CUSTOMER_GRID_ACTION_KEYS = [
  'add-note-remarks',
  'add-reminder',
  'change-status',
  're-assign-customer',
  'send-mail',
  'manage-customer',
]


const INLINE_DRAWER_ACTION_KEYS = new Set([
  'view-customer',
  'add-note-remarks',
  'add-reminder',
  'change-status',
  're-assign-customer',
])

const BULK_ACTION_OPTIONS = [
  { key: 'remark', label: 'Add Remark' },
  { key: 'reassign', label: 'Re-Assign Customer' },
]

const ROWS_PER_PAGE = 10
const CUSTOMER_ACTION_MENU_WIDTH = 240
const CUSTOMER_ACTION_MENU_ITEM_HEIGHT = 40
const CUSTOMER_ACTION_MENU_VIEWPORT_PADDING = 8
const getTodayDateValue = () => new Date().toISOString().slice(0, 10)

const buildInitialFormData = (defaultOwner = '') => ({
  customerName: '',
  addedDate: new Date().toISOString().slice(0, 10),
  customerOwner: defaultOwner,
  customerCategory: '',
  address: '',
  contactPerson: '',
  contactPhone: '',
  contactMobile: '',
  contactEmail: '',
  contactDesignation: '',
  reminderDate: getTodayDateValue(),
  reminderMode: '',
  remark: '',
  description: '',
})

const buildFormDataFromCustomer = (customer, defaultOwner = '') => {
  const primaryContact = getPrimaryContact(customer)

  return {
    customerName: customer?.customerName || '',
    addedDate: customer?.addedDate || new Date().toISOString().slice(0, 10),
    customerOwner: customer?.customerOwner || defaultOwner,
    customerCategory: customer?.customerCategory || '',
    address: customer?.address || '',
    contactPerson: primaryContact.contactPerson || '',
    contactPhone: primaryContact.phone || '',
    contactMobile: primaryContact.mobile || '',
    contactEmail: primaryContact.email || '',
    contactDesignation: primaryContact.designation || '',
    reminderDate: customer?.reminderDate || getTodayDateValue(),
    reminderMode: customer?.reminderMode || '',
    remark: customer?.remark || '',
    description: customer?.description || '',
  }
}

const buildInitialFilters = () => (
  searchColumns.reduce((accumulator, column) => ({
    ...accumulator,
    [column.key]: '',
  }), {})
)

const isValidEmail = (value) => !value || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)

const normalizeSearchValue = (value) => String(value || '').trim().toLowerCase()

const isCustomerOwnedByUser = (customer = {}, user = null) => {
  if (!user) return false

  const userId = normalizeSearchValue(user.id)
  const userOwnerCode = String(user.ownerCode || '').trim()
  const ownerIds = [
    customer.ownerUserId,
    customer.ownerId,
    customer.assignedTo,
    customer.assignedUserId,
    customer.userId,
  ].map(normalizeSearchValue)

  if (userId && ownerIds.includes(userId)) {
    return true
  }

  if (userOwnerCode && String(customer.ownerCode || customer.customerOwnerCode || '').trim() === userOwnerCode) {
    return true
  }

  const ownerNames = [
    customer.customerOwner,
    customer.customerOwnerDisplay,
    customer.customerOwnerName,
    customer.ownerName,
    customer.assignedUserName,
    customer.addedBy,
    customer.addedByName,
  ]

  const userNames = [
    user.name,
    user.ownerDisplayName,
    user.username,
    user.email,
    user.ownerCode,
  ]

  return ownerNames.some((ownerName) => (
    userNames.some((userName) => isSameCrmOwner(ownerName, userName))
  ))
}

const createCustomerCalendarReminder = async (customer, { reminderDate, reminderMode }) => {
  if (!customer?.id || !reminderDate) return

  await calendarApi.createEvent({
    title: `${customer.customerName || 'Customer'} reminder`,
    description: reminderMode ? `Reminder mode: ${reminderMode}` : '',
    startAt: `${reminderDate}T09:00:00`,
    category: 'Reminder',
    relatedEntityType: 'customer',
    relatedEntityId: customer.id,
    assignedTo: customer.assignedTo || customer.ownerUserId || customer.customerOwner || customer.customerOwnerName || '',
  }).catch(() => null)
}

const getCustomerSearchName = (customer = {}) => {
  const companyName = String(customer.companyName || customer.company || '').trim()
  const customerName = String(customer.customerName || customer.name || '').trim()
  if (!companyName || normalizeSearchValue(companyName) === normalizeSearchValue(customerName)) {
    return customerName || companyName
  }
  return [companyName, customerName].filter(Boolean).join(' / ')
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

const getPrimaryContact = (customer) => customer.contacts?.[0] || {}

const formatCustomerDate = (value) => {
  if (!value) return '-'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return String(value)
  return [
    String(date.getDate()).padStart(2, '0'),
    String(date.getMonth() + 1).padStart(2, '0'),
    date.getFullYear(),
  ].join('-')
}

const formatCustomerDateTime = (value) => {
  if (!value) return '-'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return String(value)
  const hours = String(date.getHours()).padStart(2, '0')
  const minutes = String(date.getMinutes()).padStart(2, '0')
  return `${formatCustomerDate(value)} ${hours}:${minutes}`
}

const formatManageUpdateTime = (value) => {
  if (!value) return { date: '-', time: '' }
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return { date: String(value), time: '' }
  const time = date.toLocaleTimeString('en-IN', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  }).toLowerCase()
  return {
    date: formatCustomerDate(value),
    time,
  }
}

const getCustomerAgeingDays = (value) => {
  if (!value) return '-'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return '-'
  const dayMs = 24 * 60 * 60 * 1000
  return `${Math.max(0, Math.floor((Date.now() - date.getTime()) / dayMs))} days`
}

const getContactPersonName = (contact = {}, customer = {}) => (
  contact.contactPerson
  || contact.name
  || customer.contactPerson
  || customer.customerName
  || '-'
)

const buildManageProfileData = (customer = {}) => {
  const primaryContact = getPrimaryContact(customer)
  const phone = primaryContact.mobile || primaryContact.phone || customer.phone || ''
  const email = primaryContact.email || customer.email || ''

  return {
    customerName: customer.customerName || '',
    contactPerson: getContactPersonName(primaryContact, customer).replace(/^-$/, ''),
    address: customer.address || '',
    designation: primaryContact.designation || customer.designation || '',
    phone,
    email,
    customerType: customer.customerType || '',
    productCategory: customer.productCategory || '',
    projectName: customer.projectName || customer.customerName || '',
    state: customer.state || '',
    industryType: customer.industryType || customer.industry || '',
    alternateEmail: customer.alternateEmail || '',
    alternatePhone: customer.alternatePhone || '',
    jobNo: customer.jobNo || '',
    gstin: customer.gstin || customer.gstIn || '',
    stateCode: customer.stateCode || '',
  }
}

const getManageDisplayValue = (value = '') => {
  const normalizedValue = String(value ?? '').trim()
  return normalizedValue && normalizedValue !== '-' ? normalizedValue : 'Not Available'
}

const getManageEditValue = (value = '') => String(value ?? '').trim()

const normalizeManageUpdateEntry = (entry = {}, fallbackActor = '') => {
  const timestamp = entry.timestamp || entry.createdAt || entry.updatedAt || entry.date || new Date().toISOString()
  const stamp = formatManageUpdateTime(timestamp)
  return {
    id: entry.id || `${entry.type || 'update'}-${timestamp}-${entry.message || entry.title || ''}`,
    date: stamp.date,
    time: stamp.time,
    type: String(entry.type || entry.category || entry.title || 'SYSTEM').toUpperCase(),
    message: entry.message || entry.description || entry.content || entry.note || 'Customer record updated.',
    by: entry.by || entry.createdByName || entry.updatedByName || entry.actorName || fallbackActor || '-',
    icon: entry.icon || 'system',
  }
}

const buildManageSystemUpdates = (customer = {}, ownerName = '-', contactName = '-') => {
  const actor = customer.addedBy || customer.addedByName || customer.updatedByName || ownerName
  const rawUpdates = [
    ...(Array.isArray(customer.systemUpdates) ? customer.systemUpdates : []),
    ...(Array.isArray(customer.updates) ? customer.updates : []),
    ...(Array.isArray(customer.activityLog) ? customer.activityLog : []),
    ...(Array.isArray(customer.history) ? customer.history : []),
  ].filter(Boolean)

  if (rawUpdates.length > 0) {
    return rawUpdates.map((entry) => normalizeManageUpdateEntry(entry, actor))
  }

  const createdAt = customer.createdAt || customer.addedDate || new Date().toISOString()
  const updatedAt = customer.updatedAt || createdAt
  const currentStatus = customer.customerStatus || 'New'
  const previousStatus = currentStatus === 'Active' ? 'New' : 'Active'
  const dealNumber = customer.dealNumber || customer.dealNo || customer.jobNo || 'DL03069'

  return [
    {
      ...normalizeManageUpdateEntry({
        type: 'MODIFICATION',
        message: `Customer Status changed from ${previousStatus} to ${currentStatus}.`,
        updatedAt,
        icon: 'edit',
      }, actor),
      by: actor,
    },
    {
      ...normalizeManageUpdateEntry({
        type: 'MODIFICATION',
        message: `Customer Status changed from New to Active.`,
        updatedAt,
        icon: 'edit',
      }, actor),
      by: actor,
    },
    {
      ...normalizeManageUpdateEntry({
        type: 'SYSTEM',
        message: `Customer has been added by ${actor}.`,
        createdAt,
        icon: 'system',
      }, actor),
      by: actor,
    },
    {
      ...normalizeManageUpdateEntry({
        type: 'DEAL',
        message: `Deal ( ${dealNumber} ) has been added by ${actor}.`,
        createdAt,
        icon: 'deal',
      }, actor),
      by: actor,
    },
    {
      ...normalizeManageUpdateEntry({
        type: 'SYSTEM',
        message: `New Contact (Name: ${contactName || 'Not Available'}) has been added.`,
        createdAt,
        icon: 'system',
      }, actor),
      by: actor,
    },
  ]
}

const normalizeSelectOptionValue = (value) => (
  value === null || value === undefined ? '' : String(value)
)

const normalizeSelectOptions = (options = []) => {
  const seenValues = new Set()

  return options.reduce((normalizedOptions, option) => {
    const normalizedOption = typeof option === 'object' && option !== null
      ? {
        value: normalizeSelectOptionValue(option.value ?? option.label ?? ''),
        label: String(option.label ?? option.value ?? ''),
      }
      : {
        value: normalizeSelectOptionValue(option),
        label: String(option ?? ''),
      }

    if (seenValues.has(normalizedOption.value)) {
      return normalizedOptions
    }

    seenValues.add(normalizedOption.value)
    normalizedOptions.push(normalizedOption)
    return normalizedOptions
  }, [])
}

const normalizeCustomerRouteBase = (basePath = '/admin/customers') => {
  const normalizedPath = String(basePath || '/admin/customers').trim()
  return normalizedPath.endsWith('/')
    ? normalizedPath.slice(0, -1)
    : normalizedPath
}

const createCustomerRouteHelpers = (basePath = '/admin/customers') => {
  const normalizedBasePath = normalizeCustomerRouteBase(basePath)
  const fallbackGridPath = `${normalizedBasePath}/search`
  const quotationsPath = normalizedBasePath.startsWith('/admin') ? '/admin/quotations' : '/quotations'

  const normalizeReturnTo = (returnTo = '') => (
    String(returnTo || '').startsWith(normalizedBasePath)
      ? String(returnTo)
      : fallbackGridPath
  )

  const buildReturnUrl = (returnTo = '', customerId = '') => {
    const normalizedReturnTo = normalizeReturnTo(returnTo)
    const [pathname, rawQuery = ''] = normalizedReturnTo.split('?')
    const searchParams = new URLSearchParams(rawQuery)

    if (customerId) {
      searchParams.set('customerId', customerId)
    }

    const queryString = searchParams.toString()
    return `${pathname}${queryString ? `?${queryString}` : ''}`
  }

  const buildViewUrl = (customerId, returnTo = '') => {
    const searchParams = new URLSearchParams()
    searchParams.set('returnTo', normalizeReturnTo(returnTo))
    return `${normalizedBasePath}/view/${encodeURIComponent(customerId)}?${searchParams.toString()}`
  }

  const buildActionUrl = (actionKey, customerId, returnTo = '') => {
    const searchParams = new URLSearchParams()

    if (customerId) {
      searchParams.set('customerId', customerId)
    }

    searchParams.set('returnTo', normalizeReturnTo(returnTo))
    return `${normalizedBasePath}/actions/${actionKey}?${searchParams.toString()}`
  }

  const buildManageUrl = (customerId, returnTo = '') => {
    const searchParams = new URLSearchParams()
    searchParams.set('returnTo', normalizeReturnTo(returnTo))
    return `${normalizedBasePath}/manage/${encodeURIComponent(customerId)}?${searchParams.toString()}`
  }

  return {
    normalizedBasePath,
    fallbackGridPath,
    quotationsPath,
    buildReturnUrl,
    buildViewUrl,
    buildActionUrl,
    buildManageUrl,
  }
}

const toSearchRow = (customer) => {
  const primaryContact = getPrimaryContact(customer)

  return {
    id: customer.id,
    customerNumber: customer.customerNumber || '',
    customerName: getCustomerSearchName(customer),
    contactPerson: primaryContact.name || customer.contactPerson || '',
    email: primaryContact.email || '',
    phone: primaryContact.mobile || primaryContact.phone || '',
    address: customer.address || customer.customerAddress || '',
    addedDate: customer.addedDate || '',
    customerOwner: customer.customerOwnerDisplay || getCrmOwnerDisplay(customer.customerOwner) || customer.customerOwner || '',
    customerCategory: customer.customerCategory || '',
    customerStatus: customer.customerStatus || 'New',
    customerType: customer.customerType || '',
    productCategory: customer.productCategory || '',
    designation: primaryContact.designation || customer.designation || '',
    projectName: customer.projectName || '',
    state: customer.state || '',
    industryType: customer.industryType || customer.industry || '',
    gstin: customer.gstin || customer.gstIn || '',
    stateCode: customer.stateCode || '',
    alternateEmail: customer.alternateEmail || '',
    alternatePhone: customer.alternatePhone || '',
    jobNo: customer.jobNo || '',
    addedBy: customer.addedBy || customer.addedByName || '',
    lastUpdated: customer.updatedAt || customer.lastUpdated || '',
    latestRemark: customer.remark || '',
  }
}

const CustomSelect = ({
  name,
  value,
  onChange,
  options,
  error,
  variant = 'default',
  disabled = false,
}) => {
  const [isOpen, setIsOpen] = useState(false)
  const selectRef = useClickOutside(() => setIsOpen(false))
  const normalizedValue = normalizeSelectOptionValue(value)
  const normalizedOptions = useMemo(() => normalizeSelectOptions(options), [options])
  const hasSelectedOption = normalizedOptions.some((option) => option.value === normalizedValue)
  const resolvedOptions = normalizedValue && !hasSelectedOption
    ? [{ value: normalizedValue, label: normalizedValue }, ...normalizedOptions]
    : normalizedOptions
  const selectedLabel = resolvedOptions.find((option) => option.value === normalizedValue)?.label || (normalizedValue || 'Select')
  const isCustomerCategoryVariant = variant === 'customer-category'

  return (
    <div
      ref={selectRef}
      className={`admin-customers-custom-select-wrapper ${isOpen ? 'admin-customers-custom-select-wrapper-open' : ''} ${isCustomerCategoryVariant ? 'admin-customers-custom-select-wrapper-category' : ''}`}
    >
      <button
        type="button"
        className={`admin-customers-custom-select-button ${error ? 'admin-customers-input-error' : ''} ${isOpen ? 'admin-customers-custom-select-open' : ''} ${isCustomerCategoryVariant ? 'admin-customers-custom-select-button-category' : ''}`}
        onClick={() => {
          if (!disabled) {
            setIsOpen((currentValue) => !currentValue)
          }
        }}
        disabled={disabled}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
      >
        <span className="admin-customers-select-label">
          <span className="admin-customers-select-label-text">{selectedLabel}</span>
        </span>
        <span className={`admin-customers-select-arrow ${isOpen ? 'admin-customers-select-arrow-up' : ''} ${isCustomerCategoryVariant ? 'admin-customers-select-arrow-category' : ''}`}>
          <FaChevronDown />
        </span>
      </button>
      {isOpen && (
        <div
          className={`admin-customers-custom-select-dropdown ${isCustomerCategoryVariant ? 'admin-customers-custom-select-dropdown-category' : ''}`}
          role="listbox"
        >
          {resolvedOptions.map((option) => (
            <button
              key={option.value || 'empty-option'}
              type="button"
              className={`admin-customers-custom-select-option ${normalizedValue === option.value ? 'admin-customers-custom-select-option-selected' : ''} ${isCustomerCategoryVariant ? 'admin-customers-custom-select-option-category' : ''}`}
              onClick={() => {
                onChange(name, option.value)
                setIsOpen(false)
              }}
            >
              <span className="admin-customers-option-content">
                <span className="admin-customers-option-name">{option.label}</span>
                {!isCustomerCategoryVariant && normalizedValue === option.value && (
                  <span className="admin-customers-option-checkmark">Selected</span>
                )}
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

const CustomerField = ({
  label,
  required = false,
  type = 'text',
  name,
  value,
  onChange,
  options = [],
  rows = 3,
  error,
  selectVariant = 'default',
  disabled = false,
}) => (
  <div className="admin-customers-form-row">
    <label htmlFor={name} className="admin-customers-form-label">
      {label}
      {required ? <span>*</span> : null}
    </label>
    <div className="admin-customers-form-input-wrap">
      {type === 'select' ? (
        <CustomSelect
          name={name}
          value={value}
          onChange={onChange}
          options={options}
          error={error}
          variant={selectVariant}
          disabled={disabled}
        />
      ) : type === 'textarea' ? (
        <textarea
          id={name}
          name={name}
          rows={rows}
          value={value}
          onChange={(event) => onChange(name, event.target.value)}
          className={`admin-customers-input admin-customers-textarea ${error ? 'admin-customers-input-error' : ''}`}
          disabled={disabled}
        />
      ) : (
        <input
          id={name}
          name={name}
          type={type}
          value={value}
          onChange={(event) => onChange(name, event.target.value)}
          className={`admin-customers-input ${error ? 'admin-customers-input-error' : ''}`}
          disabled={disabled}
        />
      )}
      {error ? <span className="admin-customers-field-error">{error}</span> : null}
    </div>
  </div>
)

const AdminCustomersPage = ({
  variantKey = 'add',
  basePath = '/admin/customers',
  restrictToOwner = false,
  showActionMenu = true,
  ownerOptionsOverride = null,
}) => {
  const navigate = useNavigate()
  const location = useLocation()
  const { customerId: routeCustomerId = '' } = useParams()
  const { user } = useAuth()
  const highlightedRowRef = useRef(null)
  const actionMenuTriggerRef = useRef(null)
  const {
    normalizedBasePath,
    fallbackGridPath,
    quotationsPath,
    buildReturnUrl,
    buildActionUrl,
    buildManageUrl,
  } = useMemo(() => createCustomerRouteHelpers(basePath), [basePath])
  const ownerOptions = useMemo(() => {
    if (Array.isArray(ownerOptionsOverride) && ownerOptionsOverride.length > 0) {
      return ownerOptionsOverride
    }

    const users = authService.getAvailableUsers().filter((entry) => entry.name !== 'System Administrator')
    return users.map((entry) => ({
      value: entry.name,
      label: entry.ownerDisplayName || entry.name,
    }))
  }, [ownerOptionsOverride])
  const defaultOwner = useMemo(() => {
    const loginOwnerName = getCrmOwnerDisplay(user?.ownerDisplayName || user?.name || user?.username || user?.email || '')
      || user?.ownerDisplayName
      || user?.name
      || user?.username
      || user?.email
      || ''

    const matchingOwner = ownerOptions.find((option) => (
      isSameCrmOwner(option.value, loginOwnerName)
      || isSameCrmOwner(option.label, loginOwnerName)
    ))

    if (matchingOwner) {
      return matchingOwner.value
    }

    return loginOwnerName || ownerOptions[0]?.value || ''
  }, [ownerOptions, user?.email, user?.name, user?.ownerDisplayName, user?.username])
  const disableCustomerOwnerField = restrictToOwner && !(Array.isArray(ownerOptionsOverride) && ownerOptionsOverride.length > 0)

  const [currentStep, setCurrentStep] = useState(0)
  const [formData, setFormData] = useState(() => buildInitialFormData(defaultOwner))
  const [errors, setErrors] = useState({})
  const [saveMessage, setSaveMessage] = useState('')
  const [filters, setFilters] = useState(() => buildInitialFilters())
  const [showFilters, setShowFilters] = useState(true)
  const [isFilterDialogOpen, setIsFilterDialogOpen] = useState(false)
  const [filterRules, setFilterRules] = useState([])
  const [filterDraft, setFilterDraft] = useState({ field: '', value: '', not: false })
  const [orderRules, setOrderRules] = useState([])
  const [orderDraft, setOrderDraft] = useState({ field: '', direction: 'asc' })
  const [compactGrid, setCompactGrid] = useState(true)
  const [currentPage, setCurrentPage] = useState(1)
  const [openActionMenuCustomerId, setOpenActionMenuCustomerId] = useState('')
  const [actionMenuPosition, setActionMenuPosition] = useState(null)
  const [selectedCustomerIds, setSelectedCustomerIds] = useState([])
  const [isBulkMenuOpen, setIsBulkMenuOpen] = useState(false)
  const [bulkDialogActionKey, setBulkDialogActionKey] = useState('')
  const [drawerCustomerId, setDrawerCustomerId] = useState('')
  const [drawerInitialActionKey, setDrawerInitialActionKey] = useState('')
  const [customers, setCustomers] = useState(() => customerService.getCustomers())
  const [isCustomersLoading, setIsCustomersLoading] = useState(false)
  const [customersError, setCustomersError] = useState('')
  const [isSavingCustomer, setIsSavingCustomer] = useState(false)
  const [editingProfileField, setEditingProfileField] = useState('')
  const [profileEditData, setProfileEditData] = useState(() => buildManageProfileData())
  const [profileSaveMessage, setProfileSaveMessage] = useState('')
  const [manageRemarkTab, setManageRemarkTab] = useState('feedback')
  const [showManageSystemUpdates, setShowManageSystemUpdates] = useState(false)

  const customerGridActions = useMemo(
    () => CUSTOMER_GRID_ACTION_KEYS.map((actionKey) => CUSTOMER_ACTION_MAP[actionKey]).filter(Boolean),
    []
  )

  useEffect(() => {
    const unsubscribe = customerService.subscribe((nextCustomers) => {
      setCustomers([...nextCustomers])
    })

    setIsCustomersLoading(true)
    setCustomersError('')
    customerService.loadCustomers()
      .then((nextCustomers) => setCustomers([...nextCustomers]))
      .catch((error) => {
        setCustomersError(error?.response?.data?.message || error?.message || 'Unable to load customers from MongoDB.')
      })
      .finally(() => setIsCustomersLoading(false))

    return unsubscribe
  }, [])

  const allCustomers = useMemo(() => {
    return restrictToOwner
      ? customers.filter((customer) => isCustomerOwnedByUser(customer, user))
      : customers
  }, [customers, restrictToOwner, user])
  const myCustomers = useMemo(
    () => customers.filter((customer) => isCustomerOwnedByUser(customer, user)),
    [customers, user]
  )
  const currentCustomer = useMemo(() => {
    if (!routeCustomerId) {
      return null
    }

    const customer = customers.find((entry) => String(entry.id) === String(routeCustomerId)) || null

    if (restrictToOwner && !isCustomerOwnedByUser(customer, user)) {
      return null
    }

    return customer
  }, [customers, restrictToOwner, routeCustomerId, user])
  const drawerCustomer = useMemo(() => {
    if (!drawerCustomerId) {
      return null
    }

    return allCustomers.find((customer) => customer.id === drawerCustomerId) || null
  }, [allCustomers, drawerCustomerId])
  const externalReturnTo = useMemo(() => {
    const searchParams = new URLSearchParams(location.search)
    return searchParams.get('returnTo') || location.state?.returnTo || ''
  }, [location.search, location.state])
  const returnTo = useMemo(() => {
    const searchParams = new URLSearchParams(location.search)
    return searchParams.get('returnTo') || fallbackGridPath
  }, [fallbackGridPath, location.search])
  const returnUrl = useMemo(
    () => buildReturnUrl(returnTo, routeCustomerId || currentCustomer?.id || ''),
    [buildReturnUrl, currentCustomer?.id, returnTo, routeCustomerId]
  )
  const currentGridUrl = useMemo(() => `${location.pathname}${location.search}`, [location.pathname, location.search])
  const currentManageReturnUrl = useCallback((customerId) => (
    `${normalizedBasePath}/manage/${encodeURIComponent(customerId)}?returnTo=${encodeURIComponent(fallbackGridPath)}`
  ), [fallbackGridPath, normalizedBasePath])

  useEffect(() => {
    if (variantKey !== 'manage' || !routeCustomerId) {
      return
    }

    const searchParams = new URLSearchParams(location.search)
    const nestedReturnTo = searchParams.get('returnTo') || ''

    if (!nestedReturnTo.startsWith(`${normalizedBasePath}/manage`)) {
      return
    }

    navigate(buildManageUrl(routeCustomerId, fallbackGridPath), {
      replace: true,
      state: { returnTo: fallbackGridPath, highlightCustomerId: routeCustomerId },
    })
  }, [buildManageUrl, fallbackGridPath, location.search, navigate, normalizedBasePath, routeCustomerId, variantKey])

  const highlightedCustomerId = useMemo(() => {
    const searchParams = new URLSearchParams(location.search)
    return searchParams.get('customerId') || location.state?.highlightCustomerId || ''
  }, [location.search, location.state])

  const handleChange = (name, value) => {
    setFormData((currentValue) => ({
      ...currentValue,
      [name]: value,
    }))

    setErrors((currentErrors) => {
      if (!currentErrors[name]) return currentErrors
      const nextErrors = { ...currentErrors }
      delete nextErrors[name]
      return nextErrors
    })
  }

  const handleFilterChange = (key, value) => {
    setFilters((currentValue) => ({
      ...currentValue,
      [key]: value,
    }))
  }

  useEffect(() => {
    if (variantKey === 'manage' && currentCustomer) {
      setFormData(buildFormDataFromCustomer(currentCustomer, defaultOwner))
    }
  }, [currentCustomer, defaultOwner, variantKey])

  useEffect(() => {
    if (variantKey !== 'manage' || !currentCustomer) {
      return
    }

    setProfileEditData(buildManageProfileData(currentCustomer))
    setEditingProfileField('')
    setProfileSaveMessage('')
  }, [currentCustomer?.id, variantKey])

  useEffect(() => {
    if (variantKey === 'manage' || !defaultOwner) return

    setFormData((currentValue) => (
      currentValue.customerOwner === defaultOwner
        ? currentValue
        : { ...currentValue, customerOwner: defaultOwner }
    ))
  }, [defaultOwner, variantKey])

  const positionCustomerActionMenu = useCallback(() => {
    const triggerElement = actionMenuTriggerRef.current
    if (!triggerElement) {
      setActionMenuPosition(null)
      return
    }

    const rect = triggerElement.getBoundingClientRect()
    const menuHeight = customerGridActions.length * CUSTOMER_ACTION_MENU_ITEM_HEIGHT + 2
    const availableBelow = window.innerHeight - rect.bottom
    const top = availableBelow >= menuHeight + CUSTOMER_ACTION_MENU_VIEWPORT_PADDING
      ? rect.bottom + 4
      : Math.max(CUSTOMER_ACTION_MENU_VIEWPORT_PADDING, rect.top - menuHeight - 4)
    const maxLeft = Math.max(
      CUSTOMER_ACTION_MENU_VIEWPORT_PADDING,
      window.innerWidth - CUSTOMER_ACTION_MENU_WIDTH - CUSTOMER_ACTION_MENU_VIEWPORT_PADDING
    )
    const left = Math.min(
      Math.max(CUSTOMER_ACTION_MENU_VIEWPORT_PADDING, rect.right - CUSTOMER_ACTION_MENU_WIDTH),
      maxLeft
    )

    setActionMenuPosition({ top, left })
  }, [customerGridActions.length])

  useEffect(() => {
    const handlePointerDown = (event) => {
      if (!event.target.closest('[data-customer-action-menu]')) {
        setOpenActionMenuCustomerId('')
        setActionMenuPosition(null)
      }

      if (!event.target.closest('[data-customer-bulk-menu]')) {
        setIsBulkMenuOpen(false)
      }
    }

    document.addEventListener('mousedown', handlePointerDown)
    document.addEventListener('touchstart', handlePointerDown)

    return () => {
      document.removeEventListener('mousedown', handlePointerDown)
      document.removeEventListener('touchstart', handlePointerDown)
    }
  }, [])

  useEffect(() => {
    if (!openActionMenuCustomerId) {
      actionMenuTriggerRef.current = null
      setActionMenuPosition(null)
      return undefined
    }

    positionCustomerActionMenu()
    window.addEventListener('resize', positionCustomerActionMenu)
    window.addEventListener('scroll', positionCustomerActionMenu, true)

    return () => {
      window.removeEventListener('resize', positionCustomerActionMenu)
      window.removeEventListener('scroll', positionCustomerActionMenu, true)
    }
  }, [openActionMenuCustomerId, positionCustomerActionMenu])

  const validateStep = (stepIndex) => {
    const nextErrors = {}

    if (stepIndex === 0) {
      if (!formData.customerName.trim()) nextErrors.customerName = 'Customer Name is required.'
      if (!formData.addedDate) nextErrors.addedDate = 'Added Date is required.'
      if (!formData.customerOwner) nextErrors.customerOwner = 'Customer Owner is required.'
      if (!formData.customerCategory) nextErrors.customerCategory = 'Customer Category is required.'
    }

    if (stepIndex === 1) {
      if (!formData.contactPerson.trim()) nextErrors.contactPerson = 'Contact Person is required.'
      const hasContactMethod = Boolean(
        formData.contactMobile.trim()
        || formData.contactPhone.trim()
        || formData.contactEmail.trim()
      )
      if (!hasContactMethod) {
        nextErrors.contactMobile = 'Provide mobile, phone, or email for the contact.'
      }
      if (formData.contactEmail && !isValidEmail(formData.contactEmail)) {
        nextErrors.contactEmail = 'Enter a valid Contact Email.'
      }
    }

    setErrors(nextErrors)
    return Object.keys(nextErrors).length === 0
  }

  const handleNext = () => {
    if (validateStep(currentStep)) {
      setCurrentStep((currentValue) => Math.min(currentValue + 1, steps.length - 1))
    }
  }

  const handleBack = () => {
    if (variantKey === 'manage' || variantKey === 'view') {
      navigate(returnUrl, { state: { highlightCustomerId: routeCustomerId || currentCustomer?.id || '' } })
      return
    }

    if (currentStep === 0) {
      if (variantKey === 'add' && externalReturnTo.startsWith('/admin/deals/add')) {
        navigate(externalReturnTo)
        return
      }

      navigate(`${normalizedBasePath}/my-customers`)
      return
    }

    setCurrentStep((currentValue) => Math.max(currentValue - 1, 0))
  }

  const handleSave = async () => {
    const firstInvalidStep = [0, 1, 2].find((stepIndex) => !validateStep(stepIndex))
    if (firstInvalidStep !== undefined) {
      setCurrentStep(firstInvalidStep)
      return
    }

    setIsSavingCustomer(true)
    setSaveMessage('')
    setCustomersError('')

    try {
      const savedCustomer = await customerService.saveCustomer({
        id: currentCustomer?.id,
        customerName: formData.customerName.trim(),
        addedDate: formData.addedDate,
        customerOwner: formData.customerOwner,
        customerCategory: formData.customerCategory,
        customerStatus: currentCustomer?.customerStatus || 'New',
        customerType: currentCustomer?.customerType || '',
        address: formData.address.trim(),
        contacts: [
          {
            id: 'primary-contact',
            contactPerson: formData.contactPerson.trim(),
            phone: formData.contactPhone.trim(),
            mobile: formData.contactMobile.trim(),
            email: formData.contactEmail.trim(),
            designation: formData.contactDesignation.trim(),
          },
        ],
        reminderDate: formData.reminderDate,
        reminderMode: formData.reminderMode,
        remark: formData.remark.trim(),
        description: formData.description.trim(),
      })

      const reminderChanged = (
        variantKey !== 'manage'
        || formData.reminderDate !== (currentCustomer?.reminderDate || '')
        || formData.reminderMode !== (currentCustomer?.reminderMode || '')
      )
      if (formData.reminderDate && reminderChanged) {
        await createCustomerCalendarReminder(savedCustomer, {
          reminderDate: formData.reminderDate,
          reminderMode: formData.reminderMode,
        })
      }

      setSaveMessage(variantKey === 'manage' ? 'Customer updated successfully.' : 'Customer saved successfully.')
      let nextUrl = `${fallbackGridPath}?customerId=${encodeURIComponent(savedCustomer.id)}`

      if (variantKey === 'manage') {
        nextUrl = buildReturnUrl(returnTo, savedCustomer.id)
      } else if (variantKey === 'add' && externalReturnTo.startsWith('/admin/deals/add')) {
        const [returnPath, rawReturnQuery = ''] = externalReturnTo.split('?')
        const returnSearchParams = new URLSearchParams(rawReturnQuery)
        returnSearchParams.set('customerId', savedCustomer.id)
        nextUrl = `${returnPath}?${returnSearchParams.toString()}`
      }

      navigate(nextUrl, {
        state: { highlightCustomerId: savedCustomer.id },
      })
    } catch (error) {
      setCustomersError(error?.response?.data?.message || error?.message || 'Unable to save customer to MongoDB.')
    } finally {
      setIsSavingCustomer(false)
    }
  }

  const records = variantKey === 'myCustomers'
    ? myCustomers
    : allCustomers
  const searchRows = useMemo(() => records.map(toSearchRow), [records])
  const filterValueOptions = useMemo(() => {
    if (!filterDraft.field) return []
    return Array.from(new Set(searchRows.map((row) => row[filterDraft.field]).filter(Boolean)))
      .sort((first, second) => String(first).localeCompare(String(second), undefined, { numeric: true }))
  }, [filterDraft.field, searchRows])
  const filteredRows = useMemo(() => (
    searchRows.filter((row) => {
      const matchesColumnFilters = searchColumns.every((column) => {
        const filterValue = normalizeSearchValue(filters[column.key])
        if (!filterValue) return true
        return normalizeSearchValue(row[column.key]).includes(filterValue)
      })
      if (!matchesColumnFilters) return false

      return filterRules.every((rule) => {
        const filterValue = normalizeSearchValue(rule.value)
        if (!rule.field || !filterValue) return true
        const matchesRule = normalizeSearchValue(row[rule.field]).includes(filterValue)
        return rule.not ? !matchesRule : matchesRule
      })
    })
  ), [filterRules, filters, searchRows])
  const orderedRows = useMemo(() => {
    if (orderRules.length === 0) {
      return [...filteredRows].sort((left, right) => (
        String(left.customerNumber || '').localeCompare(String(right.customerNumber || ''), undefined, { numeric: true })
      ))
    }

    return [...filteredRows].sort((left, right) => {
      for (const rule of orderRules) {
        if (!rule.field) continue
        const leftValue = normalizeSearchValue(left[rule.field])
        const rightValue = normalizeSearchValue(right[rule.field])
        const compareResult = leftValue.localeCompare(rightValue, undefined, { numeric: true })
        if (compareResult !== 0) {
          return rule.direction === 'desc' ? -compareResult : compareResult
        }
      }
      return 0
    })
  }, [filteredRows, orderRules])
  const activeTableSearchColumns = variantKey === 'myCustomers'
    ? myCustomersTableSearchColumns
    : tableSearchColumns

  const handleExportCustomers = () => {
    const exportRows = orderedRows.map((row) => ({
      ...row,
      customerOwner: row.customerOwnerDisplay || getCrmOwnerDisplay(row.customerOwner) || row.customerOwner || '',
    }))

    if (exportRows.length === 0) {
      setCustomersError('No customer records are available to export.')
      return
    }

    const exportTitle = variantKey === 'myCustomers' ? 'My Customers' : 'Customers'
    const timestamp = new Date().toISOString().slice(0, 10)

    exportExcelWorkbook({
      filename: `${exportTitle.replace(/\s+/g, '_')}_${timestamp}.xlsx`,
      title: `${exportTitle} Report`,
      subtitle: `${exportTitle} search export`,
      sheetName: 'Customers',
      metadata: [
        { label: 'View', value: exportTitle },
        { label: 'Total Records', value: String(exportRows.length) },
        ...(variantKey === 'myCustomers' ? [{ label: 'Owner', value: user?.name || user?.email || '' }] : []),
      ],
      columns: activeTableSearchColumns.map((column) => ({
        key: column.key,
        label: column.label,
        type: column.key === 'addedDate' ? 'date' : 'text',
        width: column.key === 'customerName' || column.key === 'latestRemark' ? 32 : 18,
      })),
      rows: exportRows,
    })

    setSaveMessage(`${exportRows.length} customer record(s) exported to Excel.`)
  }

  const totalPages = Math.max(1, Math.ceil(orderedRows.length / ROWS_PER_PAGE))
  const currentPageSafe = Math.min(currentPage, totalPages)
  const highlightedRowIndex = useMemo(() => (
    orderedRows.findIndex((row) => row.id === highlightedCustomerId)
  ), [orderedRows, highlightedCustomerId])
  const paginatedRows = useMemo(() => {
    const startIndex = (currentPageSafe - 1) * ROWS_PER_PAGE
    return orderedRows.slice(startIndex, startIndex + ROWS_PER_PAGE)
  }, [currentPageSafe, orderedRows])
  const visiblePages = useMemo(() => buildVisiblePages(currentPageSafe, totalPages), [currentPageSafe, totalPages])
  const selectedCustomers = useMemo(
    () => records.filter((customer) => selectedCustomerIds.includes(customer.id)),
    [records, selectedCustomerIds]
  )
  const selectedCount = selectedCustomers.length
  const currentPageRowIds = useMemo(() => paginatedRows.map((row) => row.id), [paginatedRows])
  const isCurrentPageFullySelected = currentPageRowIds.length > 0 && currentPageRowIds.every((customerId) => selectedCustomerIds.includes(customerId))

  useEffect(() => {
    const validCustomerIds = new Set(records.map((customer) => customer.id))
    setSelectedCustomerIds((currentValue) => currentValue.filter((customerId) => validCustomerIds.has(customerId)))
  }, [records])

  useEffect(() => {
    if (variantKey !== 'search' && variantKey !== 'myCustomers' && highlightedCustomerId) {
      setDrawerCustomerId(highlightedCustomerId)
    }
  }, [highlightedCustomerId, variantKey])

  useEffect(() => {
    setCurrentPage(1)
  }, [filterRules, filters, orderRules, variantKey])

  useEffect(() => {
    if ((variantKey !== 'search' && variantKey !== 'myCustomers') || highlightedRowIndex < 0) {
      return
    }

    setCurrentPage(Math.floor(highlightedRowIndex / ROWS_PER_PAGE) + 1)
  }, [highlightedRowIndex, variantKey])

  useEffect(() => {
    if ((variantKey !== 'search' && variantKey !== 'myCustomers') || !highlightedCustomerId || !highlightedRowRef.current) {
      return
    }

    highlightedRowRef.current.scrollIntoView({
      behavior: 'smooth',
      block: 'center',
    })
  }, [currentPageSafe, highlightedCustomerId, paginatedRows, variantKey])

  const handleOpenCustomerView = (customerId) => {
    if (variantKey === 'search' || variantKey === 'myCustomers') {
      navigate(buildViewUrl(customerId, currentGridUrl), {
        state: { returnTo: currentGridUrl, highlightCustomerId: customerId },
      })
      return
    }

    setDrawerCustomerId(customerId)
    setDrawerInitialActionKey('')
  }

  const handleOpenCustomerAction = (action, customerId) => {
    const actionReturnTo = variantKey === 'manage'
      ? currentManageReturnUrl(customerId)
      : currentGridUrl

    if (action.behavior === 'view') {
      navigate(buildViewUrl(customerId, actionReturnTo), {
        state: { returnTo: actionReturnTo, highlightCustomerId: customerId },
      })
      return
    }

    if (action.behavior === 'manage') {
      navigate(buildManageUrl(customerId, variantKey === 'manage' ? fallbackGridPath : currentGridUrl), {
        state: { returnTo: variantKey === 'manage' ? fallbackGridPath : currentGridUrl, highlightCustomerId: customerId },
      })
      return
    }

    if (INLINE_DRAWER_ACTION_KEYS.has(action.key)) {
      if (variantKey === 'search' || variantKey === 'myCustomers' || variantKey === 'manage') {
        navigate(buildActionUrl(action.key, customerId, actionReturnTo), {
          state: { returnTo: actionReturnTo, highlightCustomerId: customerId },
        })
        return
      }

      setDrawerCustomerId(customerId)
      setDrawerInitialActionKey(action.key)
      return
    }



    if (action.key === 'generate-quotation') {
      navigate(quotationsPath, {
        state: {
          openGenerator: true,
          preselectedCustomer: allCustomers.find((customer) => String(customer.id) === String(customerId)) || null,
        },
      })
      return
    }

    navigate(buildActionUrl(action.key, customerId, actionReturnTo), {
      state: { returnTo: actionReturnTo, highlightCustomerId: customerId },
    })
  }

  const handleToggleCustomerActionMenu = (customerId, triggerElement) => {
    if (openActionMenuCustomerId === customerId) {
      actionMenuTriggerRef.current = null
      setOpenActionMenuCustomerId('')
      setActionMenuPosition(null)
      return
    }

    actionMenuTriggerRef.current = triggerElement
    setOpenActionMenuCustomerId(customerId)
    window.requestAnimationFrame(positionCustomerActionMenu)
  }

  const handleToggleCustomerSelection = (customerId) => {
    setSelectedCustomerIds((currentValue) => (
      currentValue.includes(customerId)
        ? currentValue.filter((entry) => entry !== customerId)
        : [...currentValue, customerId]
    ))
  }

  const handleToggleCurrentPageSelection = () => {
    setSelectedCustomerIds((currentValue) => {
      if (isCurrentPageFullySelected) {
        return currentValue.filter((customerId) => !currentPageRowIds.includes(customerId))
      }

      return Array.from(new Set([...currentValue, ...currentPageRowIds]))
    })
  }

  const handleSaveCustomerUpdates = async (customerId, updates) => {
    const customer = allCustomers.find((entry) => String(entry.id) === String(customerId)) || null
    if (!customer) {
      return
    }

    await customerService.saveCustomer({
      ...customer,
      ...updates,
      id: customer.id,
      customerNumber: customer.customerNumber,
    })
    setSaveMessage('Customer updated successfully.')
  }

  const handleProfileEditChange = (key, value) => {
    setProfileEditData((currentValue) => ({
      ...currentValue,
      [key]: value,
    }))
  }

  const handleStartProfileEdit = (fieldKey = '') => {
    if (!currentCustomer) return
    setProfileEditData(buildManageProfileData(currentCustomer))
    setProfileSaveMessage('')
    setEditingProfileField(fieldKey)
  }

  const handleCancelProfileEdit = () => {
    setProfileEditData(buildManageProfileData(currentCustomer || {}))
    setProfileSaveMessage('')
    setEditingProfileField('')
  }

  const handleSaveProfileField = async (fieldKey = '') => {
    if (!currentCustomer) return
    if (isSavingCustomer) return

    const nextProfileData = {
      ...buildManageProfileData(currentCustomer),
      [fieldKey]: profileEditData[fieldKey],
    }
    const primaryContact = getPrimaryContact(currentCustomer)
    const nextContacts = [
      {
        ...primaryContact,
        id: primaryContact.id || 'primary-contact',
        contactPerson: getManageEditValue(nextProfileData.contactPerson),
        designation: getManageEditValue(nextProfileData.designation),
        phone: getManageEditValue(nextProfileData.phone),
        mobile: getManageEditValue(nextProfileData.phone),
        email: getManageEditValue(nextProfileData.email),
      },
      ...(Array.isArray(currentCustomer.contacts) ? currentCustomer.contacts.slice(1) : []),
    ]

    setIsSavingCustomer(true)
    setProfileSaveMessage('')

    try {
      await customerService.saveCustomer({
        ...currentCustomer,
        customerName: getManageEditValue(nextProfileData.customerName) || currentCustomer.customerName,
        name: getManageEditValue(nextProfileData.customerName) || currentCustomer.customerName,
        contactPerson: getManageEditValue(nextProfileData.contactPerson),
        address: getManageEditValue(nextProfileData.address),
        designation: getManageEditValue(nextProfileData.designation),
        phone: getManageEditValue(nextProfileData.phone),
        email: getManageEditValue(nextProfileData.email),
        customerType: getManageEditValue(nextProfileData.customerType),
        productCategory: getManageEditValue(nextProfileData.productCategory),
        projectName: getManageEditValue(nextProfileData.projectName),
        state: getManageEditValue(nextProfileData.state),
        industryType: getManageEditValue(nextProfileData.industryType),
        alternateEmail: getManageEditValue(nextProfileData.alternateEmail),
        alternatePhone: getManageEditValue(nextProfileData.alternatePhone),
        jobNo: getManageEditValue(nextProfileData.jobNo),
        gstin: getManageEditValue(nextProfileData.gstin),
        gstIn: getManageEditValue(nextProfileData.gstin),
        stateCode: getManageEditValue(nextProfileData.stateCode),
        contacts: nextContacts,
      })
      setProfileSaveMessage('Profile detail updated successfully.')
      setEditingProfileField('')
    } catch (error) {
      setProfileSaveMessage(error?.response?.data?.message || error?.message || 'Unable to update profile details.')
    } finally {
      setIsSavingCustomer(false)
    }
  }

  const handleProfileEditKeyDown = (event, fieldKey) => {
    if (isSavingCustomer) return

    if (event.key === 'Escape') {
      event.preventDefault()
      handleCancelProfileEdit()
      return
    }

    const isTextArea = event.currentTarget?.tagName === 'TEXTAREA'
    const shouldSave = event.key === 'Enter' && (!isTextArea || event.ctrlKey || event.metaKey)
    if (!shouldSave) return

    event.preventDefault()
    handleSaveProfileField(fieldKey)
  }

  const handleOpenBulkActionDialog = (actionKey) => {
    setIsBulkMenuOpen(false)
    setBulkDialogActionKey(actionKey)
  }

  const handleApplyBulkAction = async (payload) => {
    await Promise.all(selectedCustomers.map((customer) => (
      customerService.saveCustomer({
        ...customer,
        ...payload,
        id: customer.id,
        customerNumber: customer.customerNumber,
      })
    )))

    const updatedActionLabel = bulkDialogActionKey === 'remark' ? 'Remark' : 'Customer owner'
    setSaveMessage(`${updatedActionLabel} updated for ${selectedCustomers.length} customers.`)
    setSelectedCustomerIds([])
    setBulkDialogActionKey('')
  }

  const handleAddFilterRule = () => {
    if (!filterDraft.field || !filterDraft.value) return
    setFilterRules((currentRules) => [
      ...currentRules,
      {
        id: `${filterDraft.field}-${Date.now()}`,
        field: filterDraft.field,
        value: filterDraft.value,
        not: filterDraft.not,
      },
    ])
    setFilterDraft({ field: '', value: '', not: false })
  }

  const handleAddOrderRule = () => {
    if (!orderDraft.field) return
    setOrderRules((currentRules) => [
      ...currentRules,
      {
        id: `${orderDraft.field}-${Date.now()}`,
        field: orderDraft.field,
        direction: orderDraft.direction,
      },
    ])
    setOrderDraft({ field: '', direction: 'asc' })
  }

  const handleCloseFilterDialog = () => {
    setIsFilterDialogOpen(false)
    setFilterDraft({ field: '', value: '', not: false })
    setOrderDraft({ field: '', direction: 'asc' })
  }

  if (variantKey === 'search' || variantKey === 'myCustomers') {
    const title = variantKey === 'myCustomers'
      ? `My Customers - ${filteredRows.length} records`
      : `Customers - ${filteredRows.length} records`
    const actionMenuPortal = showActionMenu && openActionMenuCustomerId && actionMenuPosition && typeof document !== 'undefined'
      ? createPortal((
        <div
          className="admin-customers-grid-action-dropdown"
          data-customer-action-menu
          style={{
            top: actionMenuPosition.top,
            left: actionMenuPosition.left,
            width: CUSTOMER_ACTION_MENU_WIDTH,
          }}
          role="menu"
        >
          {customerGridActions.map((action) => (
            <button
              key={action.key}
              type="button"
              className="admin-customers-grid-action-item"
              role="menuitem"
              onClick={() => {
                const customerId = openActionMenuCustomerId
                setOpenActionMenuCustomerId('')
                setActionMenuPosition(null)
                handleOpenCustomerAction(action, customerId)
              }}
            >
              {action.label}
            </button>
          ))}
        </div>
      ), document.body)
      : null

    return (
      <div className="admin-customers-page">
        <section className="admin-customers-card admin-customers-search-card">
          <div className="admin-customers-search-header">
            <h1>{title}</h1>

            <div className="admin-customers-toolbar-actions" data-customer-bulk-menu>
              {showActionMenu ? (
                <div className="admin-customers-toolbar-bulk-wrap">
                  <button
                    type="button"
                    className="admin-customers-toolbar-button admin-customers-toolbar-button-primary admin-customers-toolbar-button-bulk"
                    onClick={() => setIsBulkMenuOpen((currentValue) => !currentValue)}
                    aria-expanded={isBulkMenuOpen}
                  >
                    <FiLayers />
                    <span>Bulk Actions</span>
                  </button>

                  {isBulkMenuOpen ? (
                    <div className="admin-customers-toolbar-bulk-menu">
                      {BULK_ACTION_OPTIONS.map((option) => (
                        <button
                          key={option.key}
                          type="button"
                          className="admin-customers-toolbar-bulk-item"
                          disabled={selectedCount === 0}
                          onClick={() => handleOpenBulkActionDialog(option.key)}
                        >
                          {option.label}
                        </button>
                      ))}
                    </div>
                  ) : null}
                </div>
              ) : null}

              <button
                type="button"
                className="admin-customers-toolbar-icon admin-customers-toolbar-icon-export"
                onClick={handleExportCustomers}
                title="Export customers"
                aria-label="Export customers"
              >
                <FaFileExport />
              </button>
              <button
                type="button"
                className={`admin-customers-toolbar-icon admin-customers-toolbar-icon-filter ${isFilterDialogOpen || filterRules.length || orderRules.length ? 'admin-customers-toolbar-icon-active' : ''}`}
                onClick={() => setIsFilterDialogOpen(true)}
                title="Filter customer"
                aria-label="Filter customer"
                aria-pressed={isFilterDialogOpen}
              >
                <FaFilter />
              </button>
            </div>
          </div>

          {isFilterDialogOpen ? (
            <div className="admin-customers-filter-modal" role="dialog" aria-modal="true" aria-label="Filter Customer">
              <div className="admin-customers-filter-panel">
                <div className="admin-customers-filter-header">
                  <h2>Filter Customer</h2>
                  <div className="admin-customers-filter-header-actions">
                    <button type="button" className="admin-customers-filter-btn admin-customers-filter-btn-danger" onClick={handleCloseFilterDialog}>
                      <FaTimes />
                      <span>Close</span>
                    </button>
                    <button type="button" className="admin-customers-filter-btn admin-customers-filter-btn-success" onClick={() => setIsFilterDialogOpen(false)}>
                      <FaCheck />
                      <span>Apply</span>
                    </button>
                    <button type="button" className="admin-customers-filter-btn admin-customers-filter-btn-success" onClick={() => setIsFilterDialogOpen(false)}>
                      <FaCheck />
                      <span>Save & Apply</span>
                    </button>
                  </div>
                </div>

                <div className="admin-customers-filter-body">
                  <section className="admin-customers-filter-section">
                    <div className="admin-customers-filter-section-title">
                      <span>Add Additional Filters</span>
                      <span className="admin-customers-filter-toggle">YES</span>
                    </div>
                    <div className="admin-customers-filter-box">
                      <div className="admin-customers-filter-box-title">
                        <FaFilter />
                        <span>Configure Filters</span>
                      </div>
                      <div className="admin-customers-filter-row">
                        <span>If</span>
                        <select
                          value={filterDraft.field}
                          onChange={(event) => setFilterDraft({ field: event.target.value, value: '', not: false })}
                        >
                          <option value="">Select</option>
                          {searchColumns.map((column) => (
                            <option key={column.key} value={column.key}>{column.label}</option>
                          ))}
                        </select>
                        <span>is</span>
                        <label className="admin-customers-filter-not">
                          <input
                            type="checkbox"
                            checked={filterDraft.not}
                            onChange={(event) => setFilterDraft((currentValue) => ({ ...currentValue, not: event.target.checked }))}
                          />
                          <span>not</span>
                        </label>
                        <select
                          value={filterDraft.value}
                          onChange={(event) => setFilterDraft((currentValue) => ({ ...currentValue, value: event.target.value }))}
                        >
                          <option value="">select</option>
                          {filterValueOptions.map((value) => (
                            <option key={value} value={value}>{value}</option>
                          ))}
                        </select>
                        <button type="button" className="admin-customers-filter-plus" onClick={handleAddFilterRule} aria-label="Add filter">
                          <FaPlus />
                        </button>
                      </div>
                      {filterRules.length > 0 ? (
                        <div className="admin-customers-filter-chip-row">
                          {filterRules.map((rule) => {
                            const columnLabel = searchColumns.find((column) => column.key === rule.field)?.label || rule.field
                            return (
                              <button
                                key={rule.id}
                                type="button"
                                className="admin-customers-filter-chip"
                                onClick={() => setFilterRules((currentRules) => currentRules.filter((entry) => entry.id !== rule.id))}
                                title="Remove filter"
                              >
                                {columnLabel} {rule.not ? 'is not' : 'is'} {rule.value}
                                <FaTimes />
                              </button>
                            )
                          })}
                        </div>
                      ) : null}
                    </div>
                  </section>

                  <section className="admin-customers-filter-section">
                    <div className="admin-customers-filter-section-title">
                      <span>Add Order By</span>
                      <span className="admin-customers-filter-toggle">YES</span>
                    </div>
                    <div className="admin-customers-filter-box">
                      <div className="admin-customers-filter-box-title">
                        <FiLayers />
                        <span>Order By</span>
                      </div>
                      <div className="admin-customers-filter-row admin-customers-filter-row-order">
                        <select
                          value={orderDraft.field}
                          onChange={(event) => setOrderDraft((currentValue) => ({ ...currentValue, field: event.target.value }))}
                        >
                          <option value="">Select</option>
                          {searchColumns.map((column) => (
                            <option key={column.key} value={column.key}>{column.label}</option>
                          ))}
                        </select>
                        <select
                          value={orderDraft.direction}
                          onChange={(event) => setOrderDraft((currentValue) => ({ ...currentValue, direction: event.target.value }))}
                        >
                          <option value="asc">Ascending</option>
                          <option value="desc">Descending</option>
                        </select>
                        <button type="button" className="admin-customers-filter-plus" onClick={handleAddOrderRule} aria-label="Add order by">
                          <FaPlus />
                        </button>
                      </div>
                      {orderRules.length > 0 ? (
                        <div className="admin-customers-filter-chip-row">
                          {orderRules.map((rule) => {
                            const columnLabel = searchColumns.find((column) => column.key === rule.field)?.label || rule.field
                            return (
                              <button
                                key={rule.id}
                                type="button"
                                className="admin-customers-filter-chip"
                                onClick={() => setOrderRules((currentRules) => currentRules.filter((entry) => entry.id !== rule.id))}
                                title="Remove order"
                              >
                                {columnLabel} {rule.direction === 'desc' ? 'DESC' : 'ASC'}
                                <FaTimes />
                              </button>
                            )
                          })}
                        </div>
                      ) : null}
                    </div>
                  </section>

                  <section className="admin-customers-filter-section">
                    <div className="admin-customers-filter-section-title">Actions</div>
                    <div className="admin-customers-filter-actions-grid">
                      {customerGridActions.map((action) => (
                        <label key={action.key} className="admin-customers-filter-action-check">
                          <input type="checkbox" checked readOnly />
                          <span>{action.label}</span>
                        </label>
                      ))}
                    </div>
                  </section>
                </div>
              </div>
            </div>
          ) : null}

          {showActionMenu && selectedCount > 0 ? (
            <div className="admin-customers-bulk-selection-bar">
              Selected customers: <strong>{selectedCount}</strong>
            </div>
          ) : null}

          {filteredRows.length === 0 ? (
            <div className="admin-customers-empty-state">
              {isCustomersLoading ? 'Loading customers from MongoDB...' : 'No customer records match the current search filters.'}
            </div>
          ) : (
            <div className={`admin-customers-grid-shell ${compactGrid ? 'admin-customers-grid-shell-compact' : ''}`}>
              <div className="admin-customers-grid-table-wrap">
                <table className="admin-customers-grid-table">
                  <thead>
                    <tr className="admin-customers-grid-head-row">
                      {showActionMenu ? (
                        <th className="admin-customers-grid-checkbox-head">
                          <input
                            type="checkbox"
                            className="admin-customers-grid-checkbox"
                            checked={isCurrentPageFullySelected}
                            onChange={handleToggleCurrentPageSelection}
                            aria-label="Select current page customers"
                          />
                        </th>
                      ) : null}
                      {activeTableSearchColumns.map((column) => (
                        <th key={column.key}>{column.label}</th>
                      ))}
                    </tr>
                    {showFilters && (
                      <tr className="admin-customers-grid-filter-row">
                        {showActionMenu ? <th className="admin-customers-grid-filter-spacer" /> : null}
                        {activeTableSearchColumns.map((column) => (
                          <th key={column.key}>
                            <input
                              type="text"
                              value={filters[column.key]}
                              onChange={(event) => handleFilterChange(column.key, event.target.value)}
                              placeholder={column.placeholder}
                              className="admin-customers-grid-filter-input"
                            />
                          </th>
                        ))}
                      </tr>
                    )}
                  </thead>
                  <tbody>
                    {paginatedRows.map((row) => {
                      const isHighlighted = highlightedCustomerId === row.id

                      return (
                        <tr
                          key={row.id}
                          ref={isHighlighted ? highlightedRowRef : null}
                          className={isHighlighted ? 'admin-customers-grid-row admin-customers-grid-row-highlighted' : 'admin-customers-grid-row'}
                        >
                          {showActionMenu ? (
                            <td className="admin-customers-grid-checkbox-cell">
                              <input
                                type="checkbox"
                                className="admin-customers-grid-checkbox"
                                checked={selectedCustomerIds.includes(row.id)}
                                onChange={() => handleToggleCustomerSelection(row.id)}
                                aria-label={`Select ${row.customerNumber}`}
                              />
                            </td>
                          ) : null}
                          {activeTableSearchColumns.map((column) => (
                            <td
                              key={column.key}
                              className={column.key === 'customerNumber' ? 'admin-customers-grid-number-cell admin-customers-grid-name-action-cell' : ''}
                            >
                              {column.key === 'customerNumber' ? (
                                <div className="admin-customers-grid-number-menu" data-customer-action-menu>
                                  <button
                                    type="button"
                                    className="admin-customers-grid-number-button admin-customers-grid-number-button-label"
                                    onClick={() => handleOpenCustomerView(row.id)}
                                  >
                                    <span>{row.customerNumber || '-'}</span>
                                  </button>
                                  {showActionMenu ? (
                                    <button
                                      type="button"
                                      className="admin-customers-grid-number-button admin-customers-grid-number-button-arrow"
                                      onClick={(event) => handleToggleCustomerActionMenu(row.id, event.currentTarget)}
                                      aria-label={`Open actions for ${row.customerNumber}`}
                                      aria-expanded={openActionMenuCustomerId === row.id}
                                      aria-haspopup="menu"
                                    >
                                      <FaChevronDown />
                                    </button>
                                  ) : null}
                                </div>
                              ) : (
                                row[column.key] || '-'
                              )}
                            </td>
                          ))}
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
              {actionMenuPortal}

              <div className="admin-customers-grid-footer">
                <div className="admin-customers-grid-footer-total">
                  Total records: <strong>{filteredRows.length}</strong>
                </div>

                <div className="admin-customers-grid-pagination">
                  <button
                    type="button"
                    className="admin-customers-grid-pagination-button"
                    disabled={currentPageSafe === 1}
                    onClick={() => setCurrentPage((currentValue) => Math.max(1, currentValue - 1))}
                  >
                    <FaChevronLeft />
                    <span>prev</span>
                  </button>

                  {visiblePages.map((pageNumber) => (
                    <button
                      key={pageNumber}
                      type="button"
                      className={`admin-customers-grid-page-number ${pageNumber === currentPageSafe ? 'admin-customers-grid-page-number-active' : ''}`}
                      onClick={() => setCurrentPage(pageNumber)}
                    >
                      {pageNumber}
                    </button>
                  ))}

                  <span className="admin-customers-grid-page-status">
                    Page {currentPageSafe} / {totalPages}
                  </span>

                  <button
                    type="button"
                    className="admin-customers-grid-pagination-button"
                    disabled={currentPageSafe === totalPages}
                    onClick={() => setCurrentPage((currentValue) => Math.min(totalPages, currentValue + 1))}
                  >
                    <span>next</span>
                    <FaChevronRight />
                  </button>
                </div>
              </div>
            </div>
          )}

          {customersError ? <div className="admin-customers-save-message">{customersError}</div> : null}
        </section>

        <CustomerDetailsDrawer
          customer={drawerCustomer}
          isOpen={Boolean(drawerCustomer)}
          ownerOptions={ownerOptions}
          showActions={showActionMenu}
          onClose={() => {
            setDrawerCustomerId('')
            setDrawerInitialActionKey('')
          }}
          onSaveCustomerUpdates={handleSaveCustomerUpdates}
          onManageCustomer={(customerId) => {
            setDrawerCustomerId('')
            setDrawerInitialActionKey('')
            navigate(buildManageUrl(customerId, currentGridUrl), {
              state: { returnTo: currentGridUrl, highlightCustomerId: customerId },
            })
          }}
          onGenerateQuotation={(customerRecord) => {
            setDrawerCustomerId('')
            setDrawerInitialActionKey('')
            navigate(quotationsPath, {
              state: {
                openGenerator: true,
                preselectedCustomer: customerRecord,
              },
            })
          }}

          initialActionKey={drawerInitialActionKey}
        />

        <CustomerBulkActionDialog
          actionKey={bulkDialogActionKey}
          isOpen={showActionMenu && Boolean(bulkDialogActionKey)}
          selectedCount={selectedCount}
          ownerOptions={ownerOptions}
          onClose={() => setBulkDialogActionKey('')}
          onApply={handleApplyBulkAction}
        />
      </div>
    )
  }

  if (variantKey === 'view') {
    const primaryContact = getPrimaryContact(currentCustomer)

    if (!currentCustomer) {
      return (
        <div className="admin-customers-page">
          <section className="admin-customers-card admin-customers-view-card">
            <h1>Customer not found</h1>
            <p className="admin-customers-view-empty">The selected customer record is not available.</p>
            <div className="admin-customers-form-actions">
              <button type="button" className="admin-customers-nav-button admin-customers-nav-button-secondary" onClick={handleBack}>
                Back
              </button>
            </div>
          </section>
        </div>
      )
    }

    return (
      <div className="admin-customers-page">
        <section className="admin-customers-card admin-customers-view-card">
          <div className="admin-customers-header-row">
            <h1>View Customer</h1>
            <span className="admin-customers-help-link">{currentCustomer.customerNumber}</span>
          </div>

          <div className="admin-customers-view-grid">
            <div className="admin-customers-view-section">
              <h2>Customer Details</h2>
              <div className="admin-customers-view-list">
                <div><span>Customer Name</span><strong>{currentCustomer.customerName || '-'}</strong></div>
                <div><span>Added Date</span><strong>{currentCustomer.addedDate || '-'}</strong></div>
                <div><span>Customer Owner</span><strong>{currentCustomer.customerOwnerDisplay || getCrmOwnerDisplay(currentCustomer.customerOwner) || '-'}</strong></div>
                <div><span>Customer Category</span><strong>{currentCustomer.customerCategory || '-'}</strong></div>
                <div><span>Customer Status</span><strong>{currentCustomer.customerStatus || '-'}</strong></div>
                <div><span>Address</span><strong>{currentCustomer.address || '-'}</strong></div>
              </div>
            </div>

            <div className="admin-customers-view-section">
              <h2>Primary Contact</h2>
              <div className="admin-customers-view-list">
                <div><span>Contact Person</span><strong>{primaryContact.contactPerson || '-'}</strong></div>
                <div><span>Mobile</span><strong>{primaryContact.mobile || '-'}</strong></div>
                <div><span>Phone</span><strong>{primaryContact.phone || '-'}</strong></div>
                <div><span>Email</span><strong>{primaryContact.email || '-'}</strong></div>
                <div><span>Designation</span><strong>{primaryContact.designation || '-'}</strong></div>
              </div>
            </div>

            <div className="admin-customers-view-section">
              <h2>Reminder & Remarks</h2>
              <div className="admin-customers-view-list">
                <div><span>Reminder Date</span><strong>{currentCustomer.reminderDate || '-'}</strong></div>
                <div><span>Reminder Mode</span><strong>{currentCustomer.reminderMode || '-'}</strong></div>
                <div><span>Remark</span><strong>{currentCustomer.remark || '-'}</strong></div>
                <div><span>Description</span><strong>{currentCustomer.description || '-'}</strong></div>
              </div>
            </div>
          </div>

          <div className="admin-customers-form-actions">
            <button type="button" className="admin-customers-nav-button admin-customers-nav-button-secondary" onClick={handleBack}>
              Back
            </button>
            <button
              type="button"
              className="admin-customers-nav-button"
              onClick={() => navigate(buildManageUrl(currentCustomer.id, returnTo))}
            >
              Manage Customer
            </button>
          </div>
        </section>
      </div>
    )
  }

  if (variantKey === 'manage' && !currentCustomer) {
    return (
      <div className="admin-customers-page">
        <section className="admin-customers-card admin-customers-view-card">
          <h1>{isCustomersLoading ? 'Loading customer' : 'Customer not found'}</h1>
          <p className="admin-customers-view-empty">
            {isCustomersLoading ? 'Reading the selected customer from MongoDB.' : 'The selected customer record is not available.'}
          </p>
          <div className="admin-customers-form-actions">
            <button type="button" className="admin-customers-nav-button admin-customers-nav-button-secondary" onClick={handleBack}>
              Back
            </button>
          </div>
        </section>
      </div>
    )
  }

  if (variantKey === 'manage' && currentCustomer) {
    const primaryContact = getPrimaryContact(currentCustomer)
    const contactName = getContactPersonName(primaryContact, currentCustomer)
    const phone = primaryContact.mobile || primaryContact.phone || currentCustomer.phone || ''
    const email = primaryContact.email || currentCustomer.email || ''
    const designation = primaryContact.designation || currentCustomer.designation || ''
    const ownerName = currentCustomer.customerOwnerDisplay || getCrmOwnerDisplay(currentCustomer.customerOwner) || currentCustomer.customerOwner || '-'
    const contactSummaryRows = [
      { key: 'contactPerson', label: 'Contact Person', icon: <FaUserPlus />, value: contactName },
      { key: 'address', label: 'Address', icon: <FaMapMarkerAlt />, value: currentCustomer.address || '' },
      { key: 'designation', label: 'Designation', icon: <FaBuilding />, value: designation },
      { key: 'phone', label: 'Phone', icon: <FaPhoneAlt />, value: phone },
      { key: 'email', label: 'Email', icon: <FaEnvelope />, value: email, type: 'email' },
    ]
    const profileMainRows = [
      { key: 'contactPerson', label: 'Contact Person', value: getManageDisplayValue(contactName), isTitle: true },
      { key: 'designation', label: 'Designation', icon: <FaBuilding />, value: getManageDisplayValue(designation) },
      { key: 'phone', label: 'Phone', icon: <FaPhoneAlt />, value: getManageDisplayValue(phone) },
      { key: 'email', label: 'Email', icon: <FaEnvelope />, value: getManageDisplayValue(email), type: 'email' },
    ]
    const profileDetailRows = [
      { key: 'customerType', label: 'Customer Type', rawValue: currentCustomer.customerType },
      { key: 'productCategory', label: 'Product Category', rawValue: currentCustomer.productCategory },
      { key: 'projectName', label: 'Project Name', rawValue: currentCustomer.projectName || currentCustomer.customerName },
      { key: 'state', label: 'State', rawValue: currentCustomer.state },
      { key: 'industryType', label: 'Industry Type', rawValue: currentCustomer.industryType || currentCustomer.industry },
      { key: 'alternateEmail', label: 'Alternate Email', rawValue: currentCustomer.alternateEmail },
      { key: 'alternatePhone', label: 'Alternate Phone', rawValue: currentCustomer.alternatePhone || phone },
      { key: 'jobNo', label: 'Job No', rawValue: currentCustomer.jobNo },
    ].map((row) => ({
      ...row,
      value: getManageDisplayValue(row.rawValue),
      missing: getManageDisplayValue(row.rawValue) === 'Not Available',
    }))
    const editableFactRows = [
      { key: 'gstin', label: 'GSTIN:', icon: <FaIdBadge />, value: currentCustomer.gstin || currentCustomer.gstIn || 'Not Available', missing: !(currentCustomer.gstin || currentCustomer.gstIn) },
      { key: 'stateCode', label: 'State Code:', icon: <FaInfoCircle />, value: currentCustomer.stateCode || 'Not Available', missing: !currentCustomer.stateCode },
    ]
    const manageSystemUpdates = buildManageSystemUpdates(currentCustomer, ownerName, contactName)
    const actionMenuPortal = showActionMenu && openActionMenuCustomerId && actionMenuPosition && typeof document !== 'undefined'
      ? createPortal((
        <div
          className="admin-customers-grid-action-dropdown"
          data-customer-action-menu
          style={{
            top: actionMenuPosition.top,
            left: actionMenuPosition.left,
            width: CUSTOMER_ACTION_MENU_WIDTH,
          }}
          role="menu"
        >
          {customerGridActions.map((action) => (
            <button
              key={action.key}
              type="button"
              className="admin-customers-grid-action-item"
              role="menuitem"
              onClick={() => {
                const customerId = openActionMenuCustomerId
                setOpenActionMenuCustomerId('')
                setActionMenuPosition(null)
                handleOpenCustomerAction(action, customerId)
              }}
            >
              {action.label}
            </button>
          ))}
        </div>
      ), document.body)
      : null

    return (
      <div className="admin-customers-page admin-customers-manage-page">
        <section className="admin-customers-manage-shell">
          <header className="admin-customers-manage-topbar">
            <button type="button" className="admin-customers-manage-back" onClick={handleBack} aria-label="Back">
              <FaChevronLeft />
            </button>
            {editingProfileField === 'customerName' ? (
              <div className="admin-customers-manage-heading-edit">
                <input
                  type="text"
                  value={profileEditData.customerName}
                  onChange={(event) => handleProfileEditChange('customerName', event.target.value)}
                  placeholder="Fill Customer Name"
                  autoFocus
                />
                <span className="admin-customers-manage-profile-inline-actions">
                  <button type="button" onClick={handleCancelProfileEdit}>Close</button>
                  <button type="button" onClick={() => handleSaveProfileField('customerName')} disabled={isSavingCustomer}>
                    {isSavingCustomer ? 'Saving...' : 'Save'}
                  </button>
                </span>
              </div>
            ) : (
              <>
                <h1>{currentCustomer.customerName || '-'}</h1>
                <button type="button" className="admin-customers-manage-edit-button" onClick={() => handleStartProfileEdit('customerName')} aria-label="Edit customer name">
                  <FaEdit className="admin-customers-manage-edit" />
                </button>
              </>
            )}
            <strong className="admin-customers-manage-number">{currentCustomer.customerNumber || '-'}</strong>
            {showActionMenu ? (
              <div className="admin-customers-manage-actions" data-customer-action-menu>
                <button
                  type="button"
                  className="admin-customers-manage-actions-main"
                  onClick={(event) => handleToggleCustomerActionMenu(currentCustomer.id, event.currentTarget)}
                  aria-expanded={openActionMenuCustomerId === currentCustomer.id}
                >
                  Actions
                </button>
                <button
                  type="button"
                  className="admin-customers-manage-actions-arrow"
                  onClick={(event) => handleToggleCustomerActionMenu(currentCustomer.id, event.currentTarget)}
                  aria-label="Open customer actions"
                >
                  <FaChevronDown />
                </button>
              </div>
            ) : null}
          </header>

          <section className="admin-customers-manage-summary">
            <div className="admin-customers-manage-contact">
              {contactSummaryRows.map((row) => (
                <div
                  key={row.key}
                  className={[
                    editingProfileField === row.key ? 'admin-customers-manage-contact-editing' : '',
                    !String(row.value || '').trim() || row.value === '-' ? 'admin-customers-manage-fill-row' : '',
                  ].filter(Boolean).join(' ')}
                  onClick={editingProfileField ? undefined : () => handleStartProfileEdit(row.key)}
                >
                  {row.icon}
                  {editingProfileField === row.key ? (
                    <span className="admin-customers-manage-contact-edit">
                      <input
                        type={row.type || 'text'}
                        value={profileEditData[row.key]}
                        onChange={(event) => handleProfileEditChange(row.key, event.target.value)}
                        onKeyDown={(event) => handleProfileEditKeyDown(event, row.key)}
                        placeholder={`Fill ${row.label}`}
                        autoFocus
                      />
                      <span className="admin-customers-manage-profile-inline-actions">
                        <button type="button" onClick={handleCancelProfileEdit}>Close</button>
                        <button type="button" onClick={() => handleSaveProfileField(row.key)} disabled={isSavingCustomer}>
                          {isSavingCustomer ? 'Saving...' : 'Save'}
                        </button>
                      </span>
                    </span>
                  ) : (
                    <>
                      <span className={getManageDisplayValue(row.value) === 'Not Available' ? 'admin-customers-manage-missing' : ''}>
                        {getManageDisplayValue(row.value)}
                      </span>
                      <button
                        type="button"
                        className="admin-customers-manage-row-edit-button admin-customers-manage-summary-edit-button"
                        onClick={(event) => {
                          event.stopPropagation()
                          handleStartProfileEdit(row.key)
                        }}
                        aria-label={`Edit ${row.label}`}
                      >
                        <FaEdit />
                      </button>
                    </>
                  )}
                </div>
              ))}
              <button type="button" className="admin-customers-manage-mail" onClick={() => handleOpenCustomerAction(CUSTOMER_ACTION_MAP['send-mail'], currentCustomer.id)}>
                <FaEnvelope />
              </button>
            </div>

            <div className="admin-customers-manage-facts">
              <div><FaCalendarAlt /><strong>Added Date:</strong><span>{formatCustomerDate(currentCustomer.addedDate)}</span></div>
              <div><FaLayerGroup /><strong>Customer Category:</strong><span>{currentCustomer.customerCategory || '-'}</span></div>
              <div><FaPuzzlePiece /><strong>Customer Status:</strong><span>{currentCustomer.customerStatus || '-'}</span></div>
              {editableFactRows.map((row) => (
                <div
                  key={row.key}
                  className={[
                    editingProfileField === row.key ? 'admin-customers-manage-fact-editing' : '',
                    row.missing ? 'admin-customers-manage-fill-row' : '',
                  ].filter(Boolean).join(' ')}
                  onClick={editingProfileField ? undefined : () => handleStartProfileEdit(row.key)}
                >
                  {row.icon}
                  <strong>{row.label}</strong>
                  {editingProfileField === row.key ? (
                    <span className="admin-customers-manage-fact-edit">
                      <input
                        type="text"
                        value={profileEditData[row.key]}
                        onChange={(event) => handleProfileEditChange(row.key, event.target.value)}
                        onKeyDown={(event) => handleProfileEditKeyDown(event, row.key)}
                        placeholder={`Fill ${row.label.replace(':', '')}`}
                        autoFocus
                      />
                      <span className="admin-customers-manage-profile-inline-actions admin-customers-manage-icon-actions">
                        <button type="button" onClick={() => handleSaveProfileField(row.key)} disabled={isSavingCustomer} aria-label={`Save ${row.label.replace(':', '')}`}>
                          <FaCheck />
                        </button>
                        <button type="button" onClick={handleCancelProfileEdit} aria-label={`Close ${row.label.replace(':', '')}`}>
                          <FaTimes />
                        </button>
                      </span>
                    </span>
                  ) : (
                    <>
                      <span className={row.missing ? 'admin-customers-manage-missing' : ''}>{row.value}</span>
                      <button
                        type="button"
                        className="admin-customers-manage-row-edit-button admin-customers-manage-summary-edit-button"
                        onClick={(event) => {
                          event.stopPropagation()
                          handleStartProfileEdit(row.key)
                        }}
                        aria-label={`Edit ${row.label.replace(':', '')}`}
                      >
                        <FaEdit />
                      </button>
                    </>
                  )}
                </div>
              ))}
            </div>

            <div className="admin-customers-manage-facts">
              <div><FaUserTie /><strong>Customer Owner:</strong><span>{ownerName}</span></div>
              <div><FaClock /><strong>Last Updated:</strong><span>{formatCustomerDateTime(currentCustomer.updatedAt)}</span></div>
              <div><FaHourglassHalf /><strong>Ageing:</strong><span>{getCustomerAgeingDays(currentCustomer.addedDate || currentCustomer.createdAt)}</span></div>
              <div><FaUserPlus /><strong>Added By:</strong><span>{currentCustomer.addedBy || currentCustomer.addedByName || ownerName}</span></div>
            </div>
          </section>

          <div className="admin-customers-manage-divider" />

          <section className="admin-customers-manage-body">
            <div className="admin-customers-manage-left">
              <div className="admin-customers-manage-remark-box">
                <div className="admin-customers-manage-tags">
                  <button
                    type="button"
                    className={manageRemarkTab === 'feedback' ? 'admin-customers-manage-tag-active' : ''}
                    onClick={() => setManageRemarkTab('feedback')}
                  >
                    FEEDBACK
                  </button>
                  <button
                    type="button"
                    className={manageRemarkTab === 'general' ? 'admin-customers-manage-tag-active' : ''}
                    onClick={() => setManageRemarkTab('general')}
                  >
                    GENERAL
                  </button>
                </div>
                {manageRemarkTab === 'feedback' ? (
                  <textarea placeholder="Add feedback here..." defaultValue={currentCustomer.remark || ''} />
                ) : (
                  <textarea placeholder="Add general note here..." defaultValue={currentCustomer.description || ''} />
                )}
              </div>

              <div className="admin-customers-manage-profile-card">
                <h2>
                  <span>Profile details</span>
                </h2>
                <div className="admin-customers-manage-profile-inner">
                  {profileMainRows.map((row) => (
                    <div
                      key={row.key}
                      className={`admin-customers-manage-profile-row ${row.isTitle ? 'admin-customers-manage-profile-row-title' : ''} ${editingProfileField === row.key ? 'admin-customers-manage-profile-row-editing' : ''}`}
                      onClick={editingProfileField ? undefined : () => handleStartProfileEdit(row.key)}
                    >
                      {editingProfileField === row.key ? (
                        <>
                          <label>
                            <span>{row.label}</span>
                            <input
                              type={row.type || 'text'}
                              value={profileEditData[row.key]}
                              onChange={(event) => handleProfileEditChange(row.key, event.target.value)}
                              onKeyDown={(event) => handleProfileEditKeyDown(event, row.key)}
                              placeholder={`Fill ${row.label}`}
                              autoFocus
                            />
                          </label>
                          <div className="admin-customers-manage-profile-inline-actions">
                            <button type="button" onClick={handleCancelProfileEdit}>Close</button>
                            <button type="button" onClick={() => handleSaveProfileField(row.key)} disabled={isSavingCustomer}>
                              {isSavingCustomer ? 'Saving...' : 'Save'}
                            </button>
                          </div>
                        </>
                      ) : (
                        <>
                          {row.icon || null}
                          {row.isTitle ? <h3>{row.value}</h3> : <span>{row.value}</span>}
                          <button
                            type="button"
                            className="admin-customers-manage-row-edit-button"
                            onClick={(event) => {
                              event.stopPropagation()
                              handleStartProfileEdit(row.key)
                            }}
                            aria-label={`Edit ${row.label}`}
                          >
                            <FaEdit />
                          </button>
                        </>
                      )}
                    </div>
                  ))}
                  <hr />
                  <h4>Other Details</h4>
                  <dl>
                    {profileDetailRows.map((row) => (
                      <div
                        key={row.key}
                        className={[
                          editingProfileField === row.key ? 'admin-customers-manage-profile-row-editing' : '',
                          row.missing ? 'admin-customers-manage-fill-row' : '',
                        ].filter(Boolean).join(' ')}
                        onClick={editingProfileField ? undefined : () => handleStartProfileEdit(row.key)}
                      >
                        <dt>{row.label}</dt>
                        <dd className={row.missing ? 'admin-customers-manage-missing' : ''}>
                          {editingProfileField === row.key ? (
                            <>
                              <input
                                type={row.key === 'alternateEmail' ? 'email' : 'text'}
                                value={profileEditData[row.key]}
                                onChange={(event) => handleProfileEditChange(row.key, event.target.value)}
                                onKeyDown={(event) => handleProfileEditKeyDown(event, row.key)}
                                placeholder={`Fill ${row.label}`}
                                autoFocus
                              />
                              <span className="admin-customers-manage-profile-inline-actions">
                                <button type="button" onClick={handleCancelProfileEdit}>Close</button>
                                <button type="button" onClick={() => handleSaveProfileField(row.key)} disabled={isSavingCustomer}>
                                  {isSavingCustomer ? 'Saving...' : 'Save'}
                                </button>
                              </span>
                            </>
                          ) : (
                            <>
                              <span>{row.value}</span>
                              <button
                                type="button"
                                className="admin-customers-manage-row-edit-button"
                                onClick={(event) => {
                                  event.stopPropagation()
                                  handleStartProfileEdit(row.key)
                                }}
                                aria-label={`Edit ${row.label}`}
                              >
                                <FaEdit />
                              </button>
                            </>
                          )}
                        </dd>
                      </div>
                    ))}
                  </dl>
                  {profileSaveMessage ? <p className="admin-customers-manage-profile-message">{profileSaveMessage}</p> : null}
                </div>
              </div>
            </div>

            <div className="admin-customers-manage-right">
              <div className="admin-customers-manage-followup">
                <span><FaInfoCircle /> No planned Follow-ups</span>
                <button type="button" onClick={() => handleOpenCustomerAction(CUSTOMER_ACTION_MAP['add-reminder'], currentCustomer.id)}>Add Reminder</button>
              </div>
              <div className="admin-customers-manage-updates">
                <div>
                  <span>Recent Updates</span>
                  <button type="button" onClick={() => setShowManageSystemUpdates((currentValue) => !currentValue)}>
                    {showManageSystemUpdates ? 'Hide System Updates' : 'Show System Updates'}
                  </button>
                </div>
                {showManageSystemUpdates ? (
                  <div className="admin-customers-manage-update-feed">
                    {manageSystemUpdates.map((update) => (
                      <article key={update.id} className="admin-customers-manage-update-item">
                        <span className={`admin-customers-manage-update-icon admin-customers-manage-update-icon-${update.icon}`}>
                          {update.icon === 'edit' ? <FaEdit /> : update.icon === 'deal' ? <FaThumbsUp /> : <FaDesktop />}
                        </span>
                        <time>
                          <span>{update.date}</span>
                          {update.time ? <strong>{update.time}</strong> : null}
                        </time>
                        <div>
                          <header>
                            <strong>{update.type}</strong>
                            <span>By {update.by}</span>
                          </header>
                          <p>{update.message}</p>
                        </div>
                      </article>
                    ))}
                    <p className="admin-customers-manage-no-more-updates">No more updates</p>
                  </div>
                ) : (
                  <p>No updates available</p>
                )}
              </div>
            </div>
          </section>
        </section>
        {actionMenuPortal}
      </div>
    )
  }

  return (
    <div className="admin-customers-page">
      <section className="admin-customers-card admin-customers-wizard-card">
        <div className="admin-customers-header-row">
          <h1>{variantKey === 'manage' ? 'Manage Customer' : 'Add Customer'}</h1>
        </div>

        <div className="admin-customers-stepper">
          {steps.map((step, index) => (
            <div key={step.key} className={`admin-customers-step ${index === currentStep ? 'admin-customers-step-active' : ''}`}>
              <span className="admin-customers-step-count">{index + 1}</span>
              <span className="admin-customers-step-arrow">-&gt;</span>
              <span className="admin-customers-step-label">{step.label}</span>
            </div>
          ))}
        </div>

        <div className="admin-customers-form-actions admin-customers-form-actions-top">
          <button type="button" className="admin-customers-nav-button admin-customers-nav-button-secondary" onClick={handleBack}>
            Back
          </button>

          {currentStep < steps.length - 1 ? (
            <button type="button" className="admin-customers-nav-button" onClick={handleNext}>
              Next
            </button>
          ) : (
            <button type="button" className="admin-customers-nav-button" onClick={handleSave} disabled={isSavingCustomer}>
              {isSavingCustomer ? 'Saving to MongoDB...' : (variantKey === 'manage' ? 'Save Changes' : 'Save')}
            </button>
          )}
        </div>

        {currentStep === 0 ? (
          <div className="admin-customers-form-grid">
            <div className="admin-customers-form-column">
              <CustomerField
                label="Customer Name"
                required
                name="customerName"
                value={formData.customerName}
                onChange={handleChange}
                error={errors.customerName}
              />

              <CustomerField
                label="Customer Owner"
                required
                type="select"
                name="customerOwner"
                value={formData.customerOwner}
                onChange={handleChange}
                options={ownerOptions}
                error={errors.customerOwner}
                disabled={disableCustomerOwnerField}
              />
            </div>

            <div className="admin-customers-form-column">
              <CustomerField
                label="Added Date"
                required
                type="date"
                name="addedDate"
                value={formData.addedDate}
                onChange={handleChange}
                error={errors.addedDate}
              />

              <CustomerField
                label="Customer Category"
                required
                type="select"
                name="customerCategory"
                value={formData.customerCategory}
                onChange={handleChange}
                options={customerCategories}
                error={errors.customerCategory}
                selectVariant="customer-category"
              />

              <CustomerField
                label="Address"
                type="textarea"
                name="address"
                value={formData.address}
                onChange={handleChange}
                rows={4}
                error={errors.address}
              />
            </div>
          </div>
        ) : null}

        {currentStep === 1 ? (
          <div className="admin-customers-form-grid">
            <div className="admin-customers-form-column">
              <CustomerField
                label="Contact Person"
                required
                name="contactPerson"
                value={formData.contactPerson}
                onChange={handleChange}
                error={errors.contactPerson}
              />

              <CustomerField
                label="Designation"
                name="contactDesignation"
                value={formData.contactDesignation}
                onChange={handleChange}
              />
            </div>

            <div className="admin-customers-form-column">
              <CustomerField
                label="Mobile *"
                name="contactMobile"
                value={formData.contactMobile}
                onChange={handleChange}
                error={errors.contactMobile}
              />

              <CustomerField
                label="Email"
                type="email"
                name="contactEmail"
                value={formData.contactEmail}
                onChange={handleChange}
                error={errors.contactEmail}
              />
            </div>
          </div>
        ) : null}

        {currentStep === 2 ? (
          <div className="admin-customers-form-grid">
            <div className="admin-customers-form-column">
              <CustomerField
                label="Reminder Date"
                type="date"
                name="reminderDate"
                value={formData.reminderDate}
                onChange={handleChange}
              />

              <CustomerField
                label="Reminder Mode"
                type="select"
                name="reminderMode"
                value={formData.reminderMode}
                onChange={handleChange}
                options={reminderModes}
              />
            </div>

            <div className="admin-customers-form-column">
              <CustomerField
                label="Remark"
                type="textarea"
                name="remark"
                value={formData.remark}
                onChange={handleChange}
                rows={4}
              />

              <CustomerField
                label="Description"
                type="textarea"
                name="description"
                value={formData.description}
                onChange={handleChange}
                rows={4}
              />
            </div>
          </div>
        ) : null}

        {saveMessage ? <div className="admin-customers-save-message">{saveMessage}</div> : null}
        {customersError ? <div className="admin-customers-save-message">{customersError}</div> : null}

        <div className="admin-customers-form-actions">
          <button type="button" className="admin-customers-nav-button admin-customers-nav-button-secondary" onClick={handleBack}>
            Back
          </button>

          {currentStep < steps.length - 1 ? (
            <button type="button" className="admin-customers-nav-button" onClick={handleNext}>
              Next
            </button>
          ) : (
            <button type="button" className="admin-customers-nav-button" onClick={handleSave} disabled={isSavingCustomer}>
              {isSavingCustomer ? 'Saving to MongoDB...' : (variantKey === 'manage' ? 'Save Changes' : 'Save')}
            </button>
          )}
        </div>
      </section>
    </div>
  )
}

export default AdminCustomersPage
