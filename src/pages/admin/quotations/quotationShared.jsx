import React, { useEffect, useMemo, useState } from 'react'
import {
  FaCheck,
  FaChevronDown,
  FaChevronLeft,
  FaChevronRight,
  FaClone,
  FaDownload,
  FaEye,
  FaEllipsisV,
  FaEdit,
  FaFilePdf,
  FaPlus,
  FaPrint,
  FaSearch,
  FaSearchMinus,
  FaSearchPlus,
  FaSort,
  FaTimes,
  FaTrash,
  FaUpload,
  FaUserFriends,
} from 'react-icons/fa'
import { useNavigate, useSearchParams } from 'react-router-dom'
import swatiLogo from '../../../assets/swati-logo.png'
import lumosLogo from '../../../assets/lumos-logo.svg'
import { normalizeAccountRecord } from '../../../features/adminAccounts/adapters/normalizeAccountRecord'
import { compareAccountsByNumberAsc } from '../../../features/adminAccounts/selectors/getAccountsBoardData'
import { useData } from '../../../context/DataContext'
import { useAuth } from '../../../context/AuthContext'
import { exportExcelWorkbook, exportCsvWorkbook } from '../../../utils/excelExport'
import { formatCurrency } from '../../../utils/helpers'
import { customViewApi } from '../../../services/customViewApi'
import { quotationApi } from '../../../services/quotationApi'
import { ExcelExportActionButton, ExcelExportMenuButton } from '../../../components/common/ExcelExportButton'
import './AdminQuotationsPage.css'

export const PAGE_SIZE = 10
export const ACCOUNT_LIST_PAGE_SIZE = 8
export const ADMIN_QUOTATION_LAYOUT_STORAGE_KEY = 'crm-admin-quotation-manager-layout'
export const ADMIN_QUOTATION_LAYOUT_VIEW_ENTITY_TYPE = 'quotation_layout_preferences'
export const ADMIN_QUOTATION_LAYOUT_VIEW_NAME = 'Admin Quotation Manager Layout'
export const MAX_UPLOAD_QUOTATION_FILE_SIZE = 5 * 1024 * 1024
export const ALLOWED_UPLOAD_QUOTATION_EXTENSIONS = ['pdf', 'xls', 'xlsx']

export const INITIAL_FILTERS = {
  num: '',
  owner: '',
  date: '',
  company: '',
  amount: '',
  status: '',
  project: '',
}

export const INITIAL_ACCOUNT_FILTERS = {
  accountNumber: '',
  name: '',
  email: '',
  phone: '',
  accountOwner: '',
}

export const UPLOAD_QUOTATION_STATUS_OPTIONS = [
  { value: '', label: 'Select' },
  { value: 'open', label: 'Open' },
  { value: 'approved', label: 'Approved' },
  { value: 'customer_approved', label: 'Customer Approved' },
  { value: 'customer_rejected', label: 'Customer Rejected' },
  { value: 'rejected', label: 'Rejected' },
  { value: 'cancelled', label: 'Cancelled' },
]

export const QUOTATION_CURRENCY_OPTIONS = [
  { value: 'INR', label: 'INR' },
  { value: 'USD', label: 'USD' },
  { value: 'AED', label: 'AED' },
  { value: 'NZD', label: 'NZ$' },
  { value: 'CAD', label: 'CAD' },
  { value: 'SEK', label: 'SEK' },
  { value: 'SGD', label: 'SGD' },
  { value: 'AUD', label: 'AUD' },
  { value: 'JPY', label: 'JPY' },
  { value: 'EUR', label: 'Euro' },
  { value: 'GBP', label: 'GBP' },
  { value: 'QAR', label: 'QAR' },
  { value: 'SAR', label: 'SAR' },
  { value: 'OMR', label: 'OMR' },
]

export const getTodayInputValue = () => new Date().toISOString().slice(0, 10)

export const addDaysToInputValue = (dateValue, days) => {
  const nextDate = new Date(dateValue || getTodayInputValue())
  nextDate.setDate(nextDate.getDate() + days)
  return nextDate.toISOString().slice(0, 10)
}

export const createInitialUploadQuotationForm = () => {
  const quotationDate = getTodayInputValue()

  return {
    selectedAccountId: '',
    selectedAccountLabel: '',
    clientAccountNumber: '',
    companyName: '',
    contactPerson: '',
    address: '',
    email: '',
    phone: '',
    accountOwner: '',
    quoteNumber: '',
    quotationDate,
    totalAmount: '',
    amountCurrency: 'INR',
    totalProductTax: '',
    taxCurrency: 'INR',
    quotationStatus: '',
    validUntilDate: addDaysToInputValue(quotationDate, 30),
    quoteFile: null,
    quoteFileName: '',
  }
}

export const ADMIN_QUOTATION_FIELD_DEFINITIONS = [
  { key: 'num', label: 'Quotation Number', exportValue: (row) => row.num },
  { key: 'date', label: 'Quotation Date', exportValue: (row) => row.date },
  { key: 'owner', label: 'Quotation Owner', exportValue: (row) => row.owner },
  { key: 'company', label: 'Company Name', exportValue: (row) => row.company },
  { key: 'project', label: 'Project Name', exportValue: (row) => row.project },
  { key: 'amount', label: 'Amount', exportValue: (row) => row.amountLabel },
  { key: 'status', label: 'Status', exportValue: (row) => row.statusLabel },
]

export const ADMIN_QUOTATION_MANAGER_EXPORT_COLUMNS = [
  { key: 'num', label: 'Quotation Number', type: 'text', width: 18 },
  { key: 'date', label: 'Quotation Date', type: 'date', align: 'center', width: 18 },
  { key: 'owner', label: 'Quotation Owner', type: 'text', width: 22 },
  { key: 'company', label: 'Company Name', type: 'text', width: 28 },
  { key: 'project', label: 'Project Name', type: 'text', width: 28 },
  { key: 'amountLabel', label: 'Amount', type: 'text', width: 18 },
  { key: 'statusLabel', label: 'Status', type: 'text', width: 16 },
]

export const DEFAULT_SELECTED_ADMIN_QUOTATION_FIELDS = [
  'num', 'owner', 'date', 'amount', 'status', 'company', 'project'
]

export const orderQuotationNumberFirst = (fieldKeys = [], activeTab = 'deal') => {
  const cleanKeys = fieldKeys.filter(Boolean)
  const preferredOrder = activeTab === 'account'
    ? ['num', 'owner', 'date', 'company', 'amount', 'status', 'project']
    : ['num', 'owner', 'date', 'amount', 'status', 'company', 'project']
  const orderedKeys = preferredOrder.filter((fieldKey) => cleanKeys.includes(fieldKey))
  cleanKeys.forEach((fieldKey) => {
    if (!orderedKeys.includes(fieldKey)) orderedKeys.push(fieldKey)
  })
  return orderedKeys
}

export const readAdminQuotationLayout = () => {
  try {
    const rawValue = window.localStorage.getItem(ADMIN_QUOTATION_LAYOUT_STORAGE_KEY)
    const parsedValue = rawValue ? JSON.parse(rawValue) : null
    const selectedFields = Array.isArray(parsedValue?.selectedFields) && parsedValue.selectedFields.length > 0
      ? parsedValue.selectedFields.filter((fieldKey) => ADMIN_QUOTATION_FIELD_DEFINITIONS.some((field) => field.key === fieldKey))
      : DEFAULT_SELECTED_ADMIN_QUOTATION_FIELDS

    return { selectedFields: orderQuotationNumberFirst(selectedFields) }
  } catch {
    return { selectedFields: DEFAULT_SELECTED_ADMIN_QUOTATION_FIELDS }
  }
}

export const sanitizeAdminQuotationLayout = (layoutValue = {}) => {
  const selectedFields = Array.isArray(layoutValue?.selectedFields) && layoutValue.selectedFields.length > 0
    ? layoutValue.selectedFields.filter((fieldKey) => ADMIN_QUOTATION_FIELD_DEFINITIONS.some((field) => field.key === fieldKey))
    : DEFAULT_SELECTED_ADMIN_QUOTATION_FIELDS

  return {
    selectedFields: orderQuotationNumberFirst(selectedFields.length > 0 ? selectedFields : DEFAULT_SELECTED_ADMIN_QUOTATION_FIELDS),
  }
}

export const SWATI_PROFILE_FALLBACK = {
  brandKey: 'swati',
  organizationName: 'Swati Switchgears India Pvt Ltd',
  organizationLegalName: 'Swati Switchgears (India) Pvt. Ltd.',
  organizationAddress: '36 Shubhlaxmi Industrial Estate, Sarkhej Bavla Road, Changodar, Ahmedabad - 382210',
  organizationAddressLines: [
    '36 Shubhlaxmi Industrial Estate,',
    'Sarkhej Bavla Road, Changodar,',
    'Ahmedabad - 382210',
  ],
  organizationEmail: 'mkt@swatiswitchgears.com',
  organizationPhone: '9913536307',
  organizationGstin: '24AAACZ0615P1Z7',
  organizationStateCode: '24',
  website: 'www.swatiswitchgears.com',
  organizationTagline: '',
  logoType: 'image',
}

export const LUMOS_PROFILE_FALLBACK = {
  brandKey: 'lumos',
  organizationName: 'Lumos Building Automation Pvt Ltd',
  organizationLegalName: 'Lumos Building Automation Pvt. Ltd.',
  organizationAddress: 'Vadodara, Gujarat, India',
  organizationEmail: 'sales@lumosbuildingautomation.com',
  organizationPhone: '+91 265 4000 222',
  organizationGstin: '24AAECL9020K1ZY',
  organizationStateCode: '24',
  website: 'www.lumosbuildingautomation.com',
  organizationTagline: 'Building automation, controls and smart infrastructure solutions.',
  logoType: 'image',
}

export const PROFILE_FALLBACKS = {
  swati: SWATI_PROFILE_FALLBACK,
  'swati-switch': SWATI_PROFILE_FALLBACK,
  'swati-switch-gear': SWATI_PROFILE_FALLBACK,
  lumos: LUMOS_PROFILE_FALLBACK,
  'lumos-building': LUMOS_PROFILE_FALLBACK,
}

export const ACTIONS = [
  { key: 'view', label: 'View Quote', icon: FaEye },
  { key: 'approve', label: 'Approve Quote', icon: FaCheck },
  { key: 'reject', label: 'Reject Quote', icon: FaTimes },
  { key: 'clone', label: 'Clone Quote', icon: FaClone },
  { key: 'account', label: 'View Account', icon: FaUserFriends },
]

export const safeLower = (value) => String(value || '').trim().toLowerCase()

export const splitDisplayLines = (value) => String(value || '')
  .split(/\r?\n|,/)
  .map((part) => part.trim())
  .filter(Boolean)

export const buildUploadAccountAddress = (account = {}) => (
  [
    account.address,
    account.location,
    account.state,
  ].filter(Boolean).join(', ')
)

export const getUploadQuotationFileExtension = (fileName = '') => {
  const segments = String(fileName || '').split('.')
  return segments.length > 1 ? safeLower(segments.pop()) : ''
}

export const validateUploadQuotationFile = (file) => {
  return ''
}

export const getProfileFallback = (quotation = {}) => {
  const profileKey = safeLower(quotation.profileKey)
  if (profileKey && PROFILE_FALLBACKS[profileKey]) {
    return PROFILE_FALLBACKS[profileKey]
  }

  const profileName = safeLower(quotation.profileName || quotation.organizationName)
  if (profileName.includes('swati')) return SWATI_PROFILE_FALLBACK
  if (profileName.includes('lumos')) return LUMOS_PROFILE_FALLBACK
  return {}
}

export const isSwatiProfile = (quotation = {}) => getProfileFallback(quotation).brandKey === 'swati'
export const isLumosProfile = (quotation = {}) => getProfileFallback(quotation).brandKey === 'lumos'

export const getBrandLogoSource = (brandKey) => {
  if (brandKey === 'lumos') return lumosLogo
  if (brandKey === 'swati') return swatiLogo
  return null
}

export const getBrandClassName = (brandKey) => {
  if (brandKey === 'lumos') return 'lumos'
  if (brandKey === 'swati') return 'swati'
  return ''
}

export const isImageProfile = (quotation = {}) => {
  const profileFallback = getProfileFallback(quotation)
  if (profileFallback.logoType) return profileFallback.logoType === 'image'

  const profileName = safeLower(quotation.profileName || quotation.organizationName)
  return profileName.includes('swati')
}

export const formatListDate = (value) => {
  if (!value) return '-'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return String(value)

  const day = String(date.getDate()).padStart(2, '0')
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const year = date.getFullYear()
  return `${day}-${month}-${year}`
}

export const formatDocumentDate = (value) => {
  if (!value) return '-'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return String(value)
  return new Intl.DateTimeFormat('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  }).format(date)
}

export const toNumber = (value) => {
  const parsed = Number.parseFloat(value)
  return Number.isFinite(parsed) ? parsed : 0
}

export const escapeHtml = (value) => String(value || '')
  .replace(/&/g, '&amp;')
  .replace(/</g, '&lt;')
  .replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;')
  .replace(/'/g, '&#39;')

export const normalizeStatusKey = (value) => {
  const normalized = safeLower(value).replace(/[\s-]+/g, '_')
  if (!normalized) return 'draft'
  if (normalized === 'accepted') return 'approved'
  if (normalized === 'new') return 'draft'
  return normalized
}

export const formatStatusLabel = (value) => {
  const key = normalizeStatusKey(value)
  const labels = {
    draft: 'Draft',
    sent: 'Sent',
    approved: 'Approved',
    rejected: 'Rejected',
    cancelled: 'Cancelled',
    open: 'Open',
  }

  if (labels[key]) return labels[key]
  return key
    .split('_')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ')
}

export const getStatusClassName = (value) => {
  const key = normalizeStatusKey(value)
  if (key === 'approved') return 'aqp-status--approved'
  if (key === 'rejected') return 'aqp-status--rejected'
  if (key === 'sent') return 'aqp-status--sent'
  return 'aqp-status--open'
}

export const getActionBadgeClassName = (value) => {
  const key = normalizeStatusKey(value)
  return key === 'approved' || key === 'cancelled' ? 'aqp-num-badge--orange' : 'aqp-num-badge--teal'
}

export const getUserIdentityValues = (user = {}) => (
  [
    user?.name,
    user?.username,
    user?.email,
  ]
    .map((value) => safeLower(value))
    .filter(Boolean)
)

export const getAllowedQuotationActionKeys = (user, row) => {
  const role = safeLower(user?.role)
  const isAdmin = role === 'admin' || role === 'super_admin'
  if (isAdmin) {
    return ACTIONS.map((action) => action.key)
  }

  const ownerValues = [
    row?.owner,
    row?.raw?.selectedAccountOwner,
    row?.raw?.ownerName,
    row?.raw?.createdBy,
  ].map((value) => safeLower(value))
  const identityValues = getUserIdentityValues(user)
  const isOwner = ownerValues.some((value) => value && identityValues.includes(value))
  const canApprove = Boolean(user?.permissions?.approveQuotes || user?.permissions?.approveQuotation)

  if (role === 'viewer' || (!isOwner && !canApprove)) {
    return ['pdf', 'preview', 'view']
  }

  const actionKeys = ['pdf', 'preview', 'view', 'clone']
  if (canApprove) {
    actionKeys.push('approve', 'reject')
  }

  return actionKeys
}

export const getAllowedQuotationActions = (user, row) => {
  const allowedActionKeys = new Set(getAllowedQuotationActionKeys(user, row))
  return ACTIONS.filter((action) => allowedActionKeys.has(action.key))
}

export const buildVisiblePages = (currentPage, totalPages) => {
  const maxVisible = 5
  const start = Math.max(1, currentPage - Math.floor(maxVisible / 2))
  const end = Math.min(totalPages, start + maxVisible - 1)
  const adjustedStart = Math.max(1, end - maxVisible + 1)

  return Array.from({ length: end - adjustedStart + 1 }, (_, index) => adjustedStart + index)
}

export const sectionValue = (value) => value || '-'
export const displayValue = (value) => {
  const text = String(value ?? '').trim()
  return text.replace(/^-+\s*/, '')
}

export const buildAddress = (...parts) => parts
  .map((part) => String(part || '').trim())
  .filter(Boolean)
  .join(', ')

export const buildLineItems = (quotation = {}) => {
  const items = Array.isArray(quotation.lineItems) ? quotation.lineItems : []
  const mappedItems = items
    .filter((item) => String(item?.description || '').trim())
    .map((item, index) => {
      const quantity = toNumber(item.quantity || item.qty || 0)
      const rate = toNumber(item.rate || item.price || item.unitPrice || 0)
      const amount = Number.isFinite(Number(item.amount))
        ? Number(item.amount)
        : quantity * rate

      return {
        id: item.id || `line-${index + 1}`,
        srNo: index + 1,
        description: item.description,
        quantity,
        unit: item.unit || 'Nos',
        rate,
        amount,
      }
    })

  if (mappedItems.length > 0) {
    return mappedItems
  }

  const fallbackDescription = [
    quotation.product,
    quotation.otherProduct,
    quotation.otherService,
    quotation.projectName,
  ].filter(Boolean).join(' / ')

  if (!fallbackDescription && !toNumber(quotation.amount)) {
    return []
  }

  return [{
    id: quotation.id || 'line-1',
    srNo: 1,
    description: fallbackDescription || quotation.companyName || 'Quotation Item',
    quantity: 1,
    unit: 'Nos',
    rate: toNumber(quotation.amount),
    amount: toNumber(quotation.amount),
  }]
}

export const numberToWordsBelowThousand = (value) => {
  const units = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine']
  const teens = ['Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen']
  const tens = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety']

  if (value === 0) return ''
  if (value < 10) return units[value]
  if (value < 20) return teens[value - 10]
  if (value < 100) {
    return `${tens[Math.floor(value / 10)]}${value % 10 ? ` ${units[value % 10]}` : ''}`
  }

  return `${units[Math.floor(value / 100)]} Hundred${value % 100 ? ` ${numberToWordsBelowThousand(value % 100)}` : ''}`
}

export const numberToWords = (value) => {
  const amount = Math.floor(Math.abs(toNumber(value)))
  if (!amount) return 'Zero'

  const segments = [
    { divisor: 10000000, label: 'Crore' },
    { divisor: 100000, label: 'Lakh' },
    { divisor: 1000, label: 'Thousand' },
    { divisor: 1, label: '' },
  ]

  let remaining = amount
  const words = []

  segments.forEach(({ divisor, label }) => {
    if (remaining >= divisor) {
      const segmentValue = Math.floor(remaining / divisor)
      remaining %= divisor
      if (segmentValue > 0) {
        words.push(numberToWordsBelowThousand(segmentValue))
        if (label) words.push(label)
      }
    }
  })

  return words.join(' ').trim()
}

export const resolveLinkedAccount = (quotation, accounts) => {
  if (!quotation) return null

  const byId = accounts.find((account) => String(account.id) === String(quotation.selectedAccountId || ''))
  if (byId) return byId

  const accountNumber = safeLower(quotation.clientAccountNumber)
  if (accountNumber) {
    const byAccountNumber = accounts.find((account) => safeLower(account.accountNumber) === accountNumber)
    if (byAccountNumber) return byAccountNumber
  }

  const companyName = safeLower(quotation.companyName)
  if (companyName) {
    const byCompanyName = accounts.find((account) => safeLower(account.name) === companyName)
    if (byCompanyName) return byCompanyName
  }

  return null
}

export const buildQuotationDocumentData = (quotation, linkedAccount) => {
  const profileFallback = getProfileFallback(quotation)
  const resolvedProfileFallback = profileFallback.brandKey ? profileFallback : SWATI_PROFILE_FALLBACK
  const isSwatiDocument = isSwatiProfile(quotation) || !profileFallback.brandKey
  const isLumosDocument = isLumosProfile(quotation)
  const isKnownProfileDocument = Boolean(profileFallback.brandKey)
  const brandKey = resolvedProfileFallback.brandKey || (isSwatiDocument ? 'swati' : isLumosDocument ? 'lumos' : 'swati')
  const logoSource = getBrandLogoSource(brandKey)
  const lineItems = buildLineItems(quotation)
  const subtotal = lineItems.reduce((sum, item) => sum + toNumber(item.amount), 0)
  const cgst = toNumber(quotation.cgstAmount || quotation.cgst || 0)
  const sgst = toNumber(quotation.sgstAmount || quotation.sgst || 0)
  const igst = toNumber(quotation.igstAmount || quotation.igst || 0)
  const otherTax = toNumber(quotation.taxAmount || 0)
  const storedAmount = toNumber(quotation.amount)
  const calculatedTotal = subtotal + cgst + sgst + igst + otherTax
  const total = storedAmount > 0 ? Math.max(storedAmount, calculatedTotal) : calculatedTotal
  const logoType = quotation.logoType || profileFallback.logoType || (isImageProfile(quotation) ? 'image' : 'text')
  const clientAddressDetails = quotation.clientAddressDetails
    || buildAddress(linkedAccount?.address, linkedAccount?.location, linkedAccount?.state)
    || '-'
  const organizationName = isKnownProfileDocument
    ? resolvedProfileFallback.organizationName
    : quotation.organizationName || resolvedProfileFallback.organizationName || quotation.profileName || SWATI_PROFILE_FALLBACK.organizationName
  const organizationLegalName = isKnownProfileDocument
    ? resolvedProfileFallback.organizationLegalName || organizationName
    : quotation.organizationLegalName || resolvedProfileFallback.organizationLegalName || organizationName
  const organizationAddress = isKnownProfileDocument
    ? resolvedProfileFallback.organizationAddress || ''
    : quotation.organizationAddress || resolvedProfileFallback.organizationAddress || SWATI_PROFILE_FALLBACK.organizationAddress
  const organizationAddressLines = resolvedProfileFallback.organizationAddressLines || splitDisplayLines(organizationAddress)
  const organizationEmail = isKnownProfileDocument
    ? resolvedProfileFallback.organizationEmail || ''
    : quotation.organizationEmail || resolvedProfileFallback.organizationEmail || SWATI_PROFILE_FALLBACK.organizationEmail
  const organizationPhone = isKnownProfileDocument
    ? resolvedProfileFallback.organizationPhone || ''
    : quotation.organizationPhone || resolvedProfileFallback.organizationPhone || SWATI_PROFILE_FALLBACK.organizationPhone
  const organizationGstin = isKnownProfileDocument
    ? resolvedProfileFallback.organizationGstin || ''
    : quotation.organizationGstin || resolvedProfileFallback.organizationGstin || SWATI_PROFILE_FALLBACK.organizationGstin
  const organizationStateCode = isKnownProfileDocument
    ? resolvedProfileFallback.organizationStateCode || ''
    : quotation.organizationStateCode || resolvedProfileFallback.organizationStateCode || SWATI_PROFILE_FALLBACK.organizationStateCode

  return {
    id: quotation.id,
    quotationNumber: quotation.quotationNumber || '-',
    quotationDate: formatDocumentDate(quotation.quotationDate || quotation.createdAt),
    validUntil: formatDocumentDate(quotation.validUntil),
    currency: quotation.currency || resolvedProfileFallback.currency || 'INR',
    statusLabel: formatStatusLabel(quotation.status),
    profileName: quotation.profileName || '-',
    brandKey,
    brandClassName: getBrandClassName(brandKey),
    logoSource,
    isSwatiDocument,
    isLumosDocument,
    organizationName,
    organizationLegalName,
    organizationAddress,
    organizationAddressLines,
    organizationEmail,
    organizationPhone,
    organizationGstin,
    organizationStateCode,
    website: isKnownProfileDocument
      ? resolvedProfileFallback.website || ''
      : quotation.website || resolvedProfileFallback.website || SWATI_PROFILE_FALLBACK.website,
    organizationTagline: quotation.organizationTagline || resolvedProfileFallback.organizationTagline || '',
    logoType,
    companyName: quotation.companyName || linkedAccount?.name || '-',
    clientAccountNumber: quotation.clientAccountNumber || linkedAccount?.accountNumber || '-',
    contactPerson: quotation.contactPerson || linkedAccount?.contactPerson || '-',
    telephone: quotation.telephone || linkedAccount?.phone || linkedAccount?.contactPhone || '-',
    email: quotation.email || linkedAccount?.email || linkedAccount?.contactEmail || '-',
    gstin: quotation.gstin || linkedAccount?.gstin || '-',
    stateCode: quotation.stateCode || linkedAccount?.stateCode || '-',
    accountOwner: linkedAccount?.accountOwnerDisplay || quotation.selectedAccountOwner || linkedAccount?.accountOwner || '-',
    customerReferenceNumber: quotation.customerReference?.number || '-',
    customerReferenceDate: formatDocumentDate(quotation.customerReference?.date),
    customerReferenceSubject: quotation.customerReference?.subject || '-',
    quotationSubject: quotation.quotationSubject || '-',
    projectName: quotation.projectName || '-',
    clientAddressDetails,
    clientAddressLines: splitDisplayLines(clientAddressDetails === '-' ? '' : clientAddressDetails),
    revisionCode: quotation.revisionCode || (quotation.revisionNo === 0 || quotation.revisionNo === 1 ? 'R1' : quotation.revisionNo ? `R${quotation.revisionNo}` : 'R1'),
    revisionNo: quotation.revisionNo || 0,
    quotationRevisionAmounts: quotation.quotationRevisionAmounts || quotation.data?.quotationRevisionAmounts || {},
    product: quotation.product || '-',
    otherProduct: quotation.otherProduct || '-',
    otherService: quotation.otherService || '-',
    deliveryTerms: quotation.deliveryTerms || '-',
    paymentTerms: quotation.paymentTerms || '-',
    warrantyTerms: quotation.warrantyTerms || '-',
    quotationNotes: quotation.quotationNotes || '-',
    rejectionReason: quotation.rejectionReason || '',
    lineItems,
    subtotal,
    cgst,
    sgst,
    igst,
    otherTax,
    total,
    amountInWords: `${numberToWords(total)} ${quotation.currency === 'USD' ? 'US Dollars' : quotation.currency === 'EUR' ? 'Euros' : 'Rupees'} Only`,
  }
}

// Columns for the Line Items table inside the View Quotation export.
export const VIEW_QUOTATION_LINE_ITEM_COLUMNS = [
  { key: 'srNo',        label: 'Sr No',       type: 'integer', align: 'center', width: 8 },
  { key: 'description', label: 'Description',                  align: 'left',   width: 48, wrap: true },
  { key: 'quantity',    label: 'Qty',         type: 'number',  align: 'right',  width: 10 },
  { key: 'unit',        label: 'Unit',                         align: 'center', width: 10 },
  { key: 'rate',        label: 'Rate',        type: 'currency',align: 'right',  width: 16 },
  { key: 'amount',      label: 'Amount',      type: 'currency',align: 'right',  width: 18 },
]

// Build the standard export options for the View Quotation modal. The same
// options object is reused for CSV and XLSX so both downloads carry the same
// title, subtitle, metadata block, and line-item table layout.
export const buildQuotationViewExportOptions = (doc) => {
  if (!doc) return null

  const safeValue = (value) => {
    const trimmed = String(value ?? '').trim()
    return trimmed && trimmed !== '-' ? trimmed : ''
  }

  const metadata = [
    { label: 'Quotation No.',  value: safeValue(doc.quotationNumber) },
    { label: 'Quotation Date',    value: safeValue(doc.quotationDate) },
    { label: 'Valid Until',       value: safeValue(doc.validUntil) },
    { label: 'Status',            value: safeValue(doc.statusLabel) },
    { label: 'Currency',          value: safeValue(doc.currency) },
    { label: 'Profile',           value: safeValue(doc.profileName) },
    { label: 'Customer',          value: safeValue(doc.companyName) },
    { label: 'Account No.',    value: safeValue(doc.clientAccountNumber) },
    { label: 'Contact Person',    value: safeValue(doc.contactPerson) },
    { label: 'Telephone',         value: safeValue(doc.telephone) },
    { label: 'Email',             value: safeValue(doc.email) },
    { label: 'GSTIN',             value: safeValue(doc.gstin) },
    { label: 'State Code',        value: safeValue(doc.stateCode) },
    { label: 'Account Owner',     value: safeValue(doc.accountOwner) },
    { label: 'Customer Address',  value: safeValue(doc.clientAddressDetails) },
    { label: 'Project Name',      value: safeValue(doc.projectName) },
    { label: 'Quotation Subject', value: safeValue(doc.quotationSubject) },
    { label: 'Inquiry Ref No',    value: safeValue(doc.customerReferenceNumber) },
    { label: 'Inquiry Ref Date',  value: safeValue(doc.customerReferenceDate) },
    { label: 'Inquiry Subject',   value: safeValue(doc.customerReferenceSubject) },
    { label: 'Delivery Terms',    value: safeValue(doc.deliveryTerms) },
    { label: 'Payment Terms',     value: safeValue(doc.paymentTerms) },
    { label: 'Warranty Terms',    value: safeValue(doc.warrantyTerms) },
    { label: 'Quotation Notes',   value: safeValue(doc.quotationNotes) },
  ].filter((entry) => entry.value)

  if (doc.rejectionReason) {
    metadata.push({ label: 'Rejection Reason', value: doc.rejectionReason })
  }

  // Line items, followed by Subtotal / GST / Total summary rows. The summary
  // rows reuse the Amount column so Excel keeps the currency formatting.
  const lineItemRows = (doc.lineItems || []).map((item) => ({
    srNo: item.srNo,
    description: item.description,
    quantity: item.quantity,
    unit: item.unit,
    rate: item.rate,
    amount: item.amount,
  }))

  const summaryRows = []
  const pushSummary = (label, amount) => {
    if (!Number.isFinite(Number(amount)) || Number(amount) === 0) return
    summaryRows.push({
      srNo: '',
      description: label,
      quantity: '',
      unit: '',
      rate: '',
      amount: Number(amount),
    })
  }

  pushSummary('Subtotal', doc.subtotal)
  pushSummary('CGST', doc.cgst)
  pushSummary('SGST', doc.sgst)
  pushSummary('IGST', doc.igst)
  pushSummary('Other Tax', doc.otherTax)
  pushSummary('Total', doc.total)

  if (doc.amountInWords) {
    summaryRows.push({
      srNo: '',
      description: `Amount in Words: ${doc.amountInWords}`,
      quantity: '',
      unit: '',
      rate: '',
      amount: '',
    })
  }

  const rows = [...lineItemRows, ...summaryRows]

  return {
    title: `Sales Quotation - ${safeValue(doc.quotationNumber) || 'Draft'}`,
    subtitle: safeValue(doc.companyName) || safeValue(doc.organizationName),
    sheetName: 'Quotation',
    companyName: doc.organizationName,
    metadata,
    columns: VIEW_QUOTATION_LINE_ITEM_COLUMNS,
    rows,
  }
}

export const buildPrintableHtml = (doc) => {
  const logoSource = doc.logoSource || getBrandLogoSource(doc.brandKey)
  const brandClassName = doc.brandClassName || getBrandClassName(doc.brandKey)
  const rowsHtml = doc.lineItems.map((item) => `
    <tr>
      <td class="text-center">${item.srNo}</td>
      <td class="description-cell">${escapeHtml(item.description)}</td>
      <td class="text-center">${escapeHtml(item.quantity)}</td>
      <td class="text-center">${escapeHtml(item.unit)}</td>
      <td class="money">${escapeHtml(formatCurrency(item.rate, doc.currency))}</td>
      <td class="money">${escapeHtml(formatCurrency(item.amount, doc.currency))}</td>
    </tr>
  `).join('')

  const companyBlock = logoSource
    ? `<div class="logo-wrap logo-wrap--${escapeHtml(brandClassName || 'default')}"><img src="${logoSource}" alt="${escapeHtml(doc.organizationName)}" class="logo logo--${escapeHtml(brandClassName || 'default')}" /></div>`
    : `<div class="logo-text">${escapeHtml(doc.organizationName)}</div>`

  return `<!doctype html>
  <html>
    <head>
      <meta charset="utf-8" />
      <title>${escapeHtml(doc.quotationNumber)} - Sales Quotation</title>
      <style>
        * { box-sizing: border-box; }
        body { margin: 0; font-family: Arial, Helvetica, sans-serif; color: #1f2933; background: #ffffff; }
        .print-shell { padding: 14px; }
        .print-toolbar {
          display: flex;
          justify-content: flex-end;
          gap: 10px;
          width: 100%;
          max-width: 980px;
          margin: 0 auto 14px;
        }
        .print-toolbar button {
          padding: 10px 16px;
          border: 1px solid #1f6ea4;
          border-radius: 8px;
          background: linear-gradient(180deg, #3291d1 0%, #1f6ea4 100%);
          color: #ffffff;
          font-size: 12px;
          font-weight: 700;
          cursor: pointer;
        }
        .print-toolbar button:last-child {
          border-color: #c7d6e2;
          background: #ffffff;
          color: #355163;
        }
        .quotation-print {
          width: 100%;
          max-width: 760px;
          margin: 0 auto;
          background: #ffffff;
          border: 1px solid #c9d5df;
        }
        .quotation-header {
          padding: 18px 16px 0;
          background: #ffffff;
        }
        .quotation-main {
          padding: 12px 16px 16px;
        }
        .quotation-footer {
          border-top: 1px solid #d5e0ea;
          padding: 12px 18px;
          text-align: center;
          font-size: 10.5px;
          line-height: 1.5;
          color: #52606d;
          background: #ffffff;
        }
        .brand-head {
          text-align: center;
          padding-bottom: 12px;
        }
        .logo-wrap {
          display: flex;
          justify-content: center;
          align-items: center;
          min-height: 0;
          width: fit-content;
          max-width: 100%;
          margin: 0 auto 8px;
          padding: 0;
          border: none;
          background: transparent;
          box-shadow: none;
        }
        .logo {
          display: block;
          width: 213px;
          height: 142px;
          max-width: 100%;
          max-height: 152px;
          object-fit: contain;
          object-position: center;
          padding: 0;
          border: none;
          background: transparent;
          box-shadow: none;
          filter: none;
          opacity: 1;
        }
        .logo--swati {
          width: 196px;
          height: 148px;
          max-height: 159px;
        }
        .logo--lumos {
          width: 311px;
          height: 142px;
          max-height: 152px;
          background: transparent;
          border-radius: 0;
          padding: 0;
        }
        .logo-text {
          font-size: 18px;
          font-weight: 800;
          color: #164f7d;
          margin-bottom: 8px;
        }
        .company-name {
          margin: 0;
          font-size: 20px;
          line-height: 1.25;
          font-weight: 800;
          color: #102a43;
        }
        .company-contact {
          margin-top: 7px;
          font-size: 10px;
          line-height: 1.5;
          color: #52606d;
        }
        .party-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 10px;
          margin-top: 10px;
        }
        .party-card {
          border: 1px solid #a9dfe3;
          border-radius: 10px;
          padding: 10px 12px;
          font-size: 10.5px;
          line-height: 1.42;
          background: #ffffff;
        }
        .section-label {
          font-size: 9px;
          font-weight: 700;
          letter-spacing: 0.05em;
          text-transform: uppercase;
          color: #1f6ea4;
          margin-bottom: 8px;
        }
        .field-row {
          display: grid;
          grid-template-columns: 92px minmax(0, 1fr);
          gap: 8px;
          margin-top: 5px;
        }
        .field-row strong {
          color: #243b53;
          font-weight: 700;
        }
        .field-row span {
          min-width: 0;
          overflow-wrap: anywhere;
        }
        h1 {
          margin: 0;
          padding: 12px 14px;
          text-align: center;
          font-size: 19px;
          line-height: 1.15;
          font-weight: 800;
          letter-spacing: 1px;
          border-top: 1px solid #d5e0ea;
          border-bottom: 1px solid #d5e0ea;
          background: #dc2626;
          border-color: #b91c1c;
          color: #ffffff;
        }
        h2, h3, p { margin: 0 0 6px; }
        .meta-grid {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          border: 1px solid #cbd9e3;
          border-radius: 4px;
          overflow: hidden;
          margin-bottom: 12px;
        }
        .meta-cell {
          padding: 9px 10px;
          border-right: 1px solid #d5e0ea;
          background: #f4f8fb;
        }
        .meta-cell:last-child { border-right: none; }
        .meta-label {
          font-size: 8px;
          font-weight: 700;
          text-transform: uppercase;
          color: #627d98;
          margin-bottom: 6px;
          letter-spacing: 0.04em;
        }
        .meta-value {
          font-size: 10px;
          font-weight: 700;
          color: #102a43;
        }
        table { width: 100%; border-collapse: collapse; }
        .items-table {
          width: 100%;
          max-width: 100%;
          table-layout: fixed;
        }
        thead { display: table-header-group; }
        tr { page-break-inside: avoid; }
        .items-table th,
        .items-table td {
          box-sizing: border-box;
          border: 1px solid #c9d5df;
          padding: 6px 6px;
          font-size: 10px;
          vertical-align: top;
          overflow-wrap: anywhere;
          word-break: break-word;
        }
        .items-table th:nth-child(1),
        .items-table td:nth-child(1) { width: 42px !important; }
        .items-table th:nth-child(2),
        .items-table td:nth-child(2) { width: auto !important; }
        .items-table th:nth-child(3),
        .items-table td:nth-child(3) { width: 50px !important; }
        .items-table th:nth-child(4),
        .items-table td:nth-child(4) { width: 58px !important; }
        .items-table th:nth-child(5),
        .items-table td:nth-child(5) { width: 84px !important; }
        .items-table th:nth-child(6),
        .items-table td:nth-child(6) { width: 92px !important; }
        .items-table th {
          background: #dc2626;
          color: #ffffff;
          font-size: 8.5px;
          font-weight: 800;
          text-transform: uppercase;
          letter-spacing: 0.04em;
          text-align: center;
        }
        .description-cell {
          overflow-wrap: anywhere;
          line-height: 1.3;
        }
        .text-center { text-align: center; }
        .money {
          text-align: right;
          white-space: nowrap;
        }
        .summary-layout {
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 12px;
          align-items: stretch;
          margin-top: 10px;
        }
        .summary-card,
        .totals-card,
        .terms-card {
          border: 1px solid #a9dfe3;
          border-radius: 10px;
          padding: 10px 12px;
          background: #ffffff;
        }
        .summary-card,
        .totals-card { min-height: 158px; }
        .detail-row,
        .total-row {
          display: flex;
          justify-content: space-between;
          gap: 12px;
          padding: 5px 0;
          border-bottom: 1px solid #edf2f7;
          font-size: 10px;
        }
        .detail-row:last-child,
        .total-row:last-child { border-bottom: none; }
        .detail-row strong,
        .total-row strong { color: #243b53; }
        .detail-row span,
        .total-row span {
          text-align: right;
          overflow-wrap: anywhere;
        }
        .totals-table td {
          padding: 7px 8px;
          border-bottom: 1px solid #d9e2ec;
          font-size: 11px;
        }
        .totals-table td:last-child { text-align: right; }
        .totals-table tr:last-child td { border-bottom: none; }
        .grand-total td {
          border-top: 2px solid #1f6ea4;
          font-weight: 700;
          background: #eff6ff;
        }
        .amount-words {
          margin-top: 12px;
          border: 1px solid #cbd9e3;
          border-radius: 4px;
          padding: 9px 10px;
          font-size: 10px;
          line-height: 1.5;
          background: #f4f8fb;
        }
        .amount-words strong {
          display: block;
          margin-bottom: 4px;
          color: #102a43;
        }
        .terms-grid {
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 10px;
          margin-top: 10px;
        }
        .terms-title {
          margin: 0 0 8px;
          font-size: 9px;
          text-transform: uppercase;
          color: #1f6ea4;
        }
        .terms-value {
          font-size: 10px;
          line-height: 1.5;
          white-space: pre-wrap;
          word-break: break-word;
        }
        @page {
          size: A4;
          margin: 10mm;
        }
        @media print {
          body { background: #ffffff; }
          .print-shell { padding: 0; }
          .print-toolbar { display: none; }
          .quotation-print { max-width: none; border: none; }
          .quotation-header { padding: 0 0 0; }
          .quotation-main { padding: 14px 0 16px; }
          .items-table thead { display: table-header-group; }
          tr, .party-card, .summary-card, .totals-card, .terms-card, .amount-words { page-break-inside: avoid; }
        }
        @media (max-width: 840px) {
          .print-shell { padding: 12px; }
          .party-grid,
          .meta-grid,
          .summary-layout,
          .terms-grid {
            grid-template-columns: 1fr;
          }
          .meta-cell { border-right: none; border-bottom: 1px solid #d5e0ea; }
          .meta-cell:last-child { border-bottom: none; }
        }
      </style>
    </head>
    <body>
      <div class="print-shell">
        <div class="print-toolbar">
          <button type="button" onclick="window.print()">Print / Save PDF</button>
          <button type="button" onclick="window.close()">Close</button>
        </div>
        <div class="quotation-print">
          <div class="quotation-header">
            <div class="brand-head">
              ${companyBlock}
              <h2 class="company-name">${escapeHtml(doc.organizationName)}</h2>
              <div class="company-contact">
                ${escapeHtml(doc.organizationAddress)}<br />
                Email: ${escapeHtml(doc.organizationEmail)} | Phone: ${escapeHtml(doc.organizationPhone)} | GSTIN: ${escapeHtml(doc.organizationGstin)}
              </div>
            </div>
            <div class="party-grid">
              <div class="party-card">
                <div class="section-label">Customer Details</div>
                <div class="field-row"><strong>Customer Name</strong><span>${escapeHtml(displayValue(doc.companyName))}</span></div>
                <div class="field-row"><strong>Client Account No.</strong><span>${escapeHtml(displayValue(doc.clientAccountNumber))}</span></div>
                <div class="field-row"><strong>Contact Person</strong><span>${escapeHtml(displayValue(doc.contactPerson))}</span></div>
                <div class="field-row"><strong>Email</strong><span>${escapeHtml(displayValue(doc.email))}</span></div>
                <div class="field-row"><strong>GSTIN</strong><span>${escapeHtml(displayValue(doc.gstin))}</span></div>
                <div class="field-row"><strong>Address</strong><span>${escapeHtml(displayValue(doc.clientAddressDetails))}</span></div>
              </div>
              <div class="party-card">
                <div class="section-label">Sales Details</div>
                <div class="field-row"><strong>Sales Executive</strong><span>${escapeHtml(doc.accountOwner)}</span></div>
                <div class="field-row"><strong>Mobile Number</strong><span>${escapeHtml(doc.organizationPhone)}</span></div>
                <div class="field-row"><strong>Email Address</strong><span>${escapeHtml(doc.organizationEmail)}</span></div>
                <div class="field-row"><strong>Quotation Reference</strong><span>${escapeHtml(doc.quotationNumber)}</span></div>
              </div>
            </div>
          <h1>SALES QUOTATION</h1>
          </div>
          <div class="quotation-main">
            <div class="meta-grid">
              <div class="meta-cell">
                <div class="meta-label">Quotation No.</div>
                <div class="meta-value">${escapeHtml(doc.quotationNumber)}</div>
              </div>
              <div class="meta-cell">
                <div class="meta-label">Quotation Date</div>
                <div class="meta-value">${escapeHtml(doc.quotationDate)}</div>
              </div>
              <div class="meta-cell">
                <div class="meta-label">Valid Until</div>
                <div class="meta-value">${escapeHtml(doc.validUntil)}</div>
              </div>
              <div class="meta-cell">
                <div class="meta-label">Currency</div>
                <div class="meta-value">${escapeHtml(doc.currency)}</div>
              </div>
            </div>
            <table class="items-table">
              <thead>
                <tr>
                  <th style="width:42px;">Sr.</th>
                  <th>Description</th>
                  <th style="width:50px;">Qty</th>
                  <th style="width:58px;">Unit</th>
                  <th style="width:84px;">Rate</th>
                  <th style="width:92px;">Amount</th>
                </tr>
              </thead>
              <tbody>
                ${rowsHtml || '<tr><td colspan="6">No quotation items available.</td></tr>'}
              </tbody>
            </table>

            <div class="summary-layout">
              <div class="summary-card">
                <div class="section-label">Quotation Details</div>
                <div class="detail-row"><strong>Profile Name</strong><span>${escapeHtml(displayValue(doc.profileName))}</span></div>
                <div class="detail-row"><strong>Project</strong><span>${escapeHtml(displayValue(doc.projectName))}</span></div>
                <div class="detail-row"><strong>Account Owner</strong><span>${escapeHtml(displayValue(doc.accountOwner))}</span></div>
                <div class="detail-row"><strong>Subject</strong><span>${escapeHtml(displayValue(doc.quotationSubject))}</span></div>
                <div class="detail-row"><strong>Product</strong><span>${escapeHtml([doc.product, doc.otherProduct].filter((value) => value && value !== '-').join(' / '))}</span></div>
                <div class="detail-row"><strong>Service</strong><span>${escapeHtml(displayValue(doc.otherService))}</span></div>
              </div>
              <div class="totals-card">
                <div class="section-label">Amount Summary</div>
                <div class="total-row"><strong>Sub Total</strong><span>${escapeHtml(formatCurrency(doc.subtotal, doc.currency))}</span></div>
                <div class="total-row"><strong>CGST</strong><span>${escapeHtml(formatCurrency(doc.cgst, doc.currency))}</span></div>
                <div class="total-row"><strong>SGST</strong><span>${escapeHtml(formatCurrency(doc.sgst, doc.currency))}</span></div>
                <div class="total-row"><strong>IGST</strong><span>${escapeHtml(formatCurrency(doc.igst, doc.currency))}</span></div>
                <div class="total-row"><strong>Other Tax</strong><span>${escapeHtml(formatCurrency(doc.otherTax, doc.currency))}</span></div>
                <div class="total-row grand-total"><strong>Total Amount</strong><span>${escapeHtml(formatCurrency(doc.total, doc.currency))}</span></div>
              </div>
            </div>

            <div class="amount-words"><strong>Amount in Words</strong>${escapeHtml(doc.amountInWords)}</div>

            <div class="terms-grid">
              <div class="terms-card">
                <h3 class="terms-title">Inquiry Reference</h3>
                <div class="terms-value">Number: ${escapeHtml(displayValue(doc.customerReferenceNumber))}&#10;Date: ${escapeHtml(displayValue(doc.customerReferenceDate))}&#10;Subject: ${escapeHtml(displayValue(doc.customerReferenceSubject))}</div>
              </div>
              <div class="terms-card">
                <h3 class="terms-title">Terms &amp; Conditions</h3>
                <div class="terms-value">Delivery: ${escapeHtml(displayValue(doc.deliveryTerms))}&#10;Payment: ${escapeHtml(displayValue(doc.paymentTerms))}&#10;Warranty: ${escapeHtml(displayValue(doc.warrantyTerms))}</div>
              </div>
              <div class="terms-card">
                <h3 class="terms-title">Quotation Notes</h3>
                <div class="terms-value">${escapeHtml(displayValue(doc.quotationNotes))}</div>
              </div>
              <div class="terms-card">
                <h3 class="terms-title">Status</h3>
                <div class="terms-value">Status: ${escapeHtml(doc.statusLabel)}${doc.rejectionReason ? `&#10;Reason: ${escapeHtml(doc.rejectionReason)}` : ''}</div>
              </div>
            </div>
          </div>
          <div class="quotation-footer">
            <strong>${escapeHtml(doc.organizationName)}</strong><br />
            Website: ${escapeHtml(doc.website || SWATI_PROFILE_FALLBACK.website)} | Email: ${escapeHtml(doc.organizationEmail)} | Phone: ${escapeHtml(doc.organizationPhone)}
          </div>
        </div>
      </div>
    </body>
  </html>`
}

export const triggerBrowserPdfSave = (documentData) => {
  if (!documentData) return

  const previousTitle = document.title
  const nextTitle = `Quotation-${documentData?.quotationNumber || 'Document'}.pdf`
  const printFrame = document.createElement('iframe')
  let cleanupTimerId = null

  printFrame.title = nextTitle
  printFrame.setAttribute('aria-hidden', 'true')
  printFrame.style.position = 'fixed'
  printFrame.style.left = '-10000px'
  printFrame.style.top = '0'
  printFrame.style.width = '1024px'
  printFrame.style.height = '768px'
  printFrame.style.border = '0'
  printFrame.style.opacity = '0'

  const cleanupPrintFrame = () => {
    if (cleanupTimerId) {
      window.clearTimeout(cleanupTimerId)
    }
    document.title = previousTitle
    window.removeEventListener('afterprint', cleanupPrintFrame)
    if (printFrame.parentNode) {
      printFrame.parentNode.removeChild(printFrame)
    }
  }

  const waitForFrameImages = () => {
    const frameDocument = printFrame.contentDocument
    if (!frameDocument) return Promise.resolve()

    const images = Array.from(frameDocument.images || [])
    return Promise.all(images.map((image) => {
      if (image.complete) return Promise.resolve()
      return new Promise((resolve) => {
        image.onload = resolve
        image.onerror = resolve
      })
    }))
  }

  printFrame.onload = () => {
    waitForFrameImages().then(() => {
      const frameWindow = printFrame.contentWindow
      if (!frameWindow) {
        cleanupPrintFrame()
        return
      }

      document.title = nextTitle
      window.addEventListener('afterprint', cleanupPrintFrame)
      cleanupTimerId = window.setTimeout(cleanupPrintFrame, 2500)
      frameWindow.focus()
      frameWindow.print()
    })
  }

  document.title = nextTitle
  document.body.appendChild(printFrame)
  printFrame.srcdoc = buildPrintableHtml(documentData)
}

export function StatusBadge({ status }) {
  return (
    <span className={`aqp-status ${getStatusClassName(status)}`}>
      {formatStatusLabel(status)}
    </span>
  )
}

export function ModalShell({ title, onClose, onDelete, size = '', children, footer }) {
  useEffect(() => {
    const handleEscape = (event) => {
      if (event.key === 'Escape') {
        onClose()
      }
    }

    document.addEventListener('keydown', handleEscape)
    return () => document.removeEventListener('keydown', handleEscape)
  }, [onClose])

  return (
    <div className="aqp-overlay" role="presentation" onClick={onClose}>
      <div className={`aqp-modal ${size}`.trim()} role="dialog" aria-modal="true" onClick={(event) => event.stopPropagation()}>
        <div className="aqp-modal-header">
          <span className="aqp-modal-title">{title}</span>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            {onDelete ? (
              <button type="button" className="aqp-modal-close" onClick={onDelete} aria-label="Delete" title="Delete">
                <FaTrash />
              </button>
            ) : null}
            <button type="button" className="aqp-modal-close" onClick={onClose} aria-label="Close">
              <FaTimes />
            </button>
          </div>
        </div>
        <div className="aqp-modal-body">{children}</div>
        {footer ? <div className="aqp-modal-footer">{footer}</div> : null}
      </div>
    </div>
  )
}

export const EditableQuotationValue = ({
  value,
  fieldKey,
  editable = false,
  multiline = false,
  className = '',
  onCommit,
}) => {
  const [isEditing, setIsEditing] = useState(false)
  const [draftValue, setDraftValue] = useState(value || '')

  useEffect(() => {
    if (!isEditing) {
      setDraftValue(value || '')
    }
  }, [isEditing, value])

  const commitValue = () => {
    const nextValue = String(draftValue || '').trim()
    setIsEditing(false)
    if (nextValue !== String(value || '').trim()) {
      onCommit?.(fieldKey, nextValue)
    }
  }

  if (!editable || !fieldKey) {
    return <span className={className}>{value}</span>
  }

  if (isEditing) {
    return multiline ? (
      <textarea
        className="aqp-doc-edit-input aqp-doc-edit-input--textarea"
        value={draftValue}
        onChange={(event) => setDraftValue(event.target.value)}
        onBlur={commitValue}
        onKeyDown={(event) => {
          if (event.key === 'Escape') setIsEditing(false)
          if ((event.ctrlKey || event.metaKey) && event.key === 'Enter') commitValue()
        }}
        autoFocus
      />
    ) : (
      <input
        className="aqp-doc-edit-input"
        value={draftValue}
        onChange={(event) => setDraftValue(event.target.value)}
        onBlur={commitValue}
        onKeyDown={(event) => {
          if (event.key === 'Escape') setIsEditing(false)
          if (event.key === 'Enter') commitValue()
        }}
        autoFocus
      />
    )
  }

  return (
    <span className={`aqp-doc-editable ${className}`.trim()}>
      <span className="aqp-doc-editable-value">{value}</span>
      <button
        type="button"
        className="aqp-doc-edit-btn"
        onClick={() => {
          setDraftValue(value || '')
          setIsEditing(true)
        }}
        aria-label="Edit quotation field"
      >
        <FaEdit />
      </button>
    </span>
  )
}

export const renderEditableQuotationValue = (documentData, editable, onEditField) => (
  fieldKey,
  value,
  options = {}
) => (
  <EditableQuotationValue
    fieldKey={fieldKey}
    value={value}
    editable={editable}
    multiline={options.multiline}
    className={options.className}
    onCommit={onEditField}
  />
)

export function QuotationDocument({ documentData, editable = false, onEditField }) {
  const logoSource = documentData.logoSource || getBrandLogoSource(documentData.brandKey)
  const brandModifier = documentData.isLumosDocument ? 'lumos' : documentData.isSwatiDocument ? 'swati' : 'default'
  const productLabel = [documentData.product, documentData.otherProduct]
    .filter((value) => value && value !== '-')
    .join(' / ')
  const editValue = renderEditableQuotationValue(documentData, editable, onEditField)

  return (
    <div className="aqp-doc aqp-print-scope">
      <div className="aqp-doc__frame">
        <div className="aqp-doc__brand-head">
          <div className={`aqp-doc__logo-wrap aqp-doc__logo-wrap--${brandModifier}`}>
            {logoSource ? (
              <img src={logoSource} alt={documentData.organizationName} className={`aqp-doc__brand-logo aqp-doc__brand-logo--${brandModifier}`} />
            ) : (
              <div className="aqp-doc__text-logo">{documentData.organizationName}</div>
            )}
          </div>
          <h2>{documentData.organizationName}</h2>
          <p>
            {documentData.organizationAddress}
            <br />
            Email: {documentData.organizationEmail} | Phone: {documentData.organizationPhone} | GSTIN: {documentData.organizationGstin}
          </p>
        </div>

        <div className="aqp-doc__party-grid">
          <section className="aqp-doc__party-card">
            <div className="aqp-doc__eyebrow">Customer Details</div>
            <div className="aqp-doc__field-row"><strong>Customer Name</strong>{editValue('companyName', displayValue(documentData.companyName))}</div>
            <div className="aqp-doc__field-row"><strong>Client Account No.</strong>{editValue('clientAccountNumber', displayValue(documentData.clientAccountNumber))}</div>
            <div className="aqp-doc__field-row"><strong>Contact Person</strong>{editValue('contactPerson', displayValue(documentData.contactPerson))}</div>
            <div className="aqp-doc__field-row"><strong>Email</strong>{editValue('email', displayValue(documentData.email))}</div>
            <div className="aqp-doc__field-row"><strong>GSTIN</strong>{editValue('gstin', displayValue(documentData.gstin))}</div>
            <div className="aqp-doc__field-row"><strong>Address</strong>{editValue('clientAddressDetails', displayValue(documentData.clientAddressDetails), { multiline: true })}</div>
          </section>
          <section className="aqp-doc__party-card">
            <div className="aqp-doc__eyebrow">Sales Details</div>
            <div className="aqp-doc__field-row"><strong>Sales Executive</strong>{editValue('selectedAccountOwner', documentData.accountOwner)}</div>
            <div className="aqp-doc__field-row"><strong>Mobile Number</strong>{editValue('organizationPhone', documentData.organizationPhone)}</div>
            <div className="aqp-doc__field-row"><strong>Email Address</strong>{editValue('organizationEmail', documentData.organizationEmail)}</div>
            <div className="aqp-doc__field-row"><strong>Quotation Reference</strong>{editValue('quotationNumber', documentData.quotationNumber)}</div>
          </section>
        </div>

        <div className="aqp-doc__title">SALES QUOTATION</div>

        <div className="aqp-doc__meta">
          <div className="aqp-doc__meta-cell">
            <span className="aqp-doc__meta-label">Quotation No.</span>
            <strong>{editValue('quotationNumber', documentData.quotationNumber)}</strong>
          </div>
          <div className="aqp-doc__meta-cell">
            <span className="aqp-doc__meta-label">Quotation Date</span>
            <strong>{editValue('quotationDate', documentData.quotationDate)}</strong>
          </div>
          <div className="aqp-doc__meta-cell">
            <span className="aqp-doc__meta-label">Valid Until</span>
            <strong>{editValue('validUntil', documentData.validUntil)}</strong>
          </div>
          <div className="aqp-doc__meta-cell">
            <span className="aqp-doc__meta-label">Revision</span>
            <strong style={{ color: documentData.revisionCode !== 'Normal' ? '#0d9488' : '#1e293b' }}>
              {documentData.revisionCode || 'Normal'}
            </strong>
          </div>
          <div className="aqp-doc__meta-cell">
            <span className="aqp-doc__meta-label">Currency</span>
            <strong>{editValue('currency', documentData.currency)}</strong>
          </div>
        </div>

        <table className="aqp-doc__table">
          <thead>
            <tr>
              <th style={{ width: '42px' }}>Sr.</th>
              <th>Description</th>
              <th style={{ width: '50px' }}>Qty</th>
              <th style={{ width: '58px' }}>Unit</th>
              <th style={{ width: '84px' }}>Rate</th>
              <th style={{ width: '92px' }}>Amount</th>
            </tr>
          </thead>
          <tbody>
            {documentData.lineItems.length === 0 ? (
              <tr>
                <td colSpan={6}>No quotation items available.</td>
              </tr>
            ) : documentData.lineItems.map((item) => (
              <tr key={item.id}>
                <td className="aqp-doc__num">{item.srNo}</td>
                <td className="aqp-doc__description">{editValue(`lineItems.${item.srNo - 1}.description`, item.description, { multiline: true })}</td>
                <td className="aqp-doc__num">{editValue(`lineItems.${item.srNo - 1}.quantity`, item.quantity)}</td>
                <td className="aqp-doc__num">{editValue(`lineItems.${item.srNo - 1}.unit`, item.unit)}</td>
                <td className="aqp-doc__amount">{editValue(`lineItems.${item.srNo - 1}.rate`, formatCurrency(item.rate, documentData.currency))}</td>
                <td className="aqp-doc__amount">{formatCurrency(item.amount, documentData.currency)}</td>
              </tr>
            ))}
          </tbody>
        </table>

        <div className="aqp-doc__summary">
          <div className="aqp-doc__summary-card">
            <div className="aqp-doc__eyebrow">Quotation Details</div>
            <div className="aqp-doc__kv-row"><strong>Profile Name</strong>{editValue('profileName', displayValue(documentData.profileName))}</div>
            <div className="aqp-doc__kv-row"><strong>Project</strong>{editValue('projectName', displayValue(documentData.projectName))}</div>
            <div className="aqp-doc__kv-row"><strong>Account Owner</strong>{editValue('selectedAccountOwner', displayValue(documentData.accountOwner))}</div>
            <div className="aqp-doc__kv-row"><strong>Subject</strong>{editValue('quotationSubject', displayValue(documentData.quotationSubject))}</div>
            <div className="aqp-doc__kv-row"><strong>Product</strong>{editValue('product', productLabel)}</div>
            <div className="aqp-doc__kv-row"><strong>Service</strong>{editValue('otherService', displayValue(documentData.otherService))}</div>
          </div>
          <div className="aqp-doc__totals">
            <div className="aqp-doc__eyebrow">Amount Summary</div>
            <div className="aqp-doc__kv-row"><strong>Sub Total</strong><span>{formatCurrency(documentData.subtotal, documentData.currency)}</span></div>
            <div className="aqp-doc__kv-row"><strong>CGST</strong><span>{formatCurrency(documentData.cgst, documentData.currency)}</span></div>
            <div className="aqp-doc__kv-row"><strong>SGST</strong><span>{formatCurrency(documentData.sgst, documentData.currency)}</span></div>
            <div className="aqp-doc__kv-row"><strong>IGST</strong><span>{formatCurrency(documentData.igst, documentData.currency)}</span></div>
            <div className="aqp-doc__kv-row"><strong>Other Tax</strong><span>{formatCurrency(documentData.otherTax, documentData.currency)}</span></div>
            <div className="aqp-doc__kv-row aqp-doc__grand-total"><strong>Total Amount</strong><span>{formatCurrency(documentData.total, documentData.currency)}</span></div>
          </div>
        </div>

        <div className="aqp-doc__amount-words">
          <strong>Amount in Words</strong>
          <span>{documentData.amountInWords}</span>
        </div>

        <div className="aqp-doc__terms">
          <section className="aqp-doc__terms-card">
            <h4>Inquiry Reference</h4>
            <p><strong>Number:</strong> {editValue('customerReference.number', displayValue(documentData.customerReferenceNumber))}</p>
            <p><strong>Date:</strong> {editValue('customerReference.date', displayValue(documentData.customerReferenceDate))}</p>
            <p><strong>Subject:</strong> {editValue('customerReference.subject', displayValue(documentData.customerReferenceSubject))}</p>
          </section>
          <section className="aqp-doc__terms-card">
            <h4>Terms &amp; Conditions</h4>
            <p><strong>Delivery:</strong> {editValue('deliveryTerms', displayValue(documentData.deliveryTerms))}</p>
            <p><strong>Payment:</strong> {editValue('paymentTerms', displayValue(documentData.paymentTerms))}</p>
            <p><strong>Warranty:</strong> {editValue('warrantyTerms', displayValue(documentData.warrantyTerms))}</p>
          </section>
          <section className="aqp-doc__terms-card">
            <h4>Quotation Notes</h4>
            <p>{editValue('quotationNotes', displayValue(documentData.quotationNotes), { multiline: true })}</p>
          </section>
          <section className="aqp-doc__terms-card">
            <h4>Status</h4>
            <p><strong>Status:</strong> {documentData.statusLabel}</p>
            {documentData.rejectionReason ? <p><strong>Reason:</strong> {documentData.rejectionReason}</p> : null}
          </section>
        </div>

        {(documentData.revisionCode || documentData.revisionAmounts) && (
          <div className="aqp-doc__terms" style={{ marginTop: '16px', width: '100%' }}>
            <section className="aqp-doc__terms-card" style={{ width: '100%', gridColumn: '1 / -1' }}>
              <h4>Quotation Revision History</h4>
              <div style={{ display: 'flex', gap: '24px', flexWrap: 'wrap', marginTop: '8px', fontSize: '13px' }}>
                <div><strong>Current Revision:</strong> <span className="aqp-status-badge aqp-status-badge--info">{documentData.revisionCode || 'Normal'}</span></div>
                <div><strong>Status:</strong> {documentData.statusLabel || documentData.status || 'Draft'}</div>
                {documentData.revisionAmounts && typeof documentData.revisionAmounts === 'object' && Object.entries(documentData.revisionAmounts).map(([revCode, revAmt]) => (
                  <div key={revCode}><strong>{revCode} Amount:</strong> {formatCurrency(revAmt, documentData.currency)}</div>
                ))}
              </div>
            </section>
          </div>
        )}

        <div className="aqp-doc__footer">
          <strong>{documentData.organizationName}</strong>
          <br />
          Website: {documentData.website || SWATI_PROFILE_FALLBACK.website} | Email: {documentData.organizationEmail} | Phone: {documentData.organizationPhone}
        </div>
      </div>
    </div>
  )
}

export function QuotationPdfViewer({
  documentData,
  title,
  subtitle,
  onBack,
  onPrint,
  onDownload,
  onApprove,
}) {
  const [zoomLevel, setZoomLevel] = useState(100)
  const [moreMenuOpen, setMoreMenuOpen] = useState(false)

  useEffect(() => {
    setZoomLevel(100)
  }, [documentData])

  useEffect(() => {
    if (!moreMenuOpen) return undefined

    const handleClose = () => setMoreMenuOpen(false)
    window.addEventListener('click', handleClose)
    return () => window.removeEventListener('click', handleClose)
  }, [moreMenuOpen])

  const resolvedTitle = title || `QUOTATION - ${documentData?.quotationNumber || '-'}`
  const resolvedSubtitle = subtitle || documentData?.companyName || '-'

  return (
    <div className="aqp-page aqp-page--pdf">
      <div className="aqp-pdf-toolbar">
        <div className="aqp-pdf-toolbar-copy">
          <h1>{resolvedTitle}</h1>
          <p>{resolvedSubtitle}</p>
        </div>
        <div className="aqp-pdf-toolbar-actions">
          <button type="button" className="aqp-btn aqp-btn--gray" onClick={onBack}>
            Back
          </button>
          <button type="button" className="aqp-pdf-close-btn" onClick={onBack} aria-label="Close quotation PDF">
            <FaTimes />
          </button>
          <div className="aqp-pdf-toolbar-status">
            <span>PDF View</span>
          </div>
          <div className="aqp-pdf-toolbar-zoom">
            <button type="button" className="aqp-pdf-icon-btn" onClick={() => setZoomLevel((currentValue) => Math.max(70, currentValue - 10))} aria-label="Zoom out">
              <FaSearchMinus />
            </button>
            <span className="aqp-pdf-zoom-value">{zoomLevel}%</span>
            <button type="button" className="aqp-pdf-icon-btn" onClick={() => setZoomLevel((currentValue) => Math.min(160, currentValue + 10))} aria-label="Zoom in">
              <FaSearchPlus />
            </button>
          </div>
          {onApprove ? (
            <button
              type="button"
              className="aqp-pdf-action-btn"
              style={{ backgroundColor: '#c60016', color: '#ffffff', borderColor: '#a80012' }}
              onClick={() => onApprove(documentData)}
              aria-label="Approve quotation"
            >
              <FaCheck />
              Approve
            </button>
          ) : null}
          <button type="button" className="aqp-pdf-action-btn" onClick={onPrint} aria-label="Print quotation">
            <FaPrint />
            Print
          </button>
          <button
            type="button"
            className="aqp-pdf-action-btn"
            onClick={() => {
              if (typeof onDownload === 'function') {
                onDownload()
                return
              }
              triggerBrowserPdfSave(documentData)
            }}
            aria-label="Download quotation PDF"
          >
            <FaDownload />
            Download PDF
          </button>
          <div className="aqp-pdf-more">
            <button
              type="button"
              className={`aqp-pdf-icon-btn${moreMenuOpen ? ' aqp-pdf-icon-btn--active' : ''}`}
              aria-label="More options"
              onClick={(event) => {
                event.stopPropagation()
                setMoreMenuOpen((currentValue) => !currentValue)
              }}
              aria-expanded={moreMenuOpen}
              aria-haspopup="menu"
            >
              <FaEllipsisV />
            </button>
            {moreMenuOpen ? (
              <div className="aqp-action-menu aqp-action-menu--viewer" onClick={(event) => event.stopPropagation()}>
                <button type="button" className="aqp-action-item" onClick={() => { setZoomLevel(100); setMoreMenuOpen(false) }}>
                  Reset Zoom
                </button>
                <button type="button" className="aqp-action-item" onClick={() => { setZoomLevel(90); setMoreMenuOpen(false) }}>
                  Fit Document
                </button>
                <button type="button" className="aqp-action-item" onClick={() => { onPrint(); setMoreMenuOpen(false) }}>
                  Print / Save PDF
                </button>
              </div>
            ) : null}
          </div>
        </div>
      </div>
      <div className="aqp-pdf-workspace">
        <div className="aqp-pdf-stage">
          <div className="aqp-pdf-canvas">
            <div className="aqp-pdf-zoom-surface" style={{ zoom: zoomLevel / 100 }}>
              <QuotationDocument documentData={documentData} />
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export function RevisionsListModal({
  isOpen,
  onClose,
  row,
  allQuotations = [],
  onSelectRevision,
  onApproveRevision,
}) {
  if (!isOpen || !row) return null

  const targetAccountNo = row.raw?.customerId || row.raw?.selectedAccountId || row.raw?.accountNumber || row.accountNumber
  const targetDealNo = row.raw?.dealId || row.dealNumber
  const targetQuoteNo = row.num || row.quoteNumber || row.quotationNumber || row.raw?.quotationNumber || ''

  const siblingRevisions = allQuotations.filter((q) => {
    const qNum = q.num || q.quoteNumber || q.quotationNumber || q.raw?.quoteNumber || q.raw?.quotationNumber || ''
    const qAccount = q.raw?.customerId || q.raw?.selectedAccountId || q.raw?.accountNumber || q.accountNumber
    const qDeal = q.raw?.dealId || q.dealNumber || q.raw?.sourceDealId

    const targetBase = targetQuoteNo.replace(/-R\d+$/i, '').trim().toLowerCase()
    const qBase = qNum.replace(/-R\d+$/i, '').trim().toLowerCase()

    if (targetBase && qBase && targetBase === qBase) return true
    if (targetDealNo && qDeal && String(targetDealNo) === String(qDeal)) return true
    if (targetAccountNo && qAccount && String(targetAccountNo) === String(qAccount)) return true
    return false
  }).sort((a, b) => {
    const revA = a.raw?.revisionNo ?? a.revisionNo ?? (a.raw?.revisionCode === 'Normal' ? 1 : 1)
    const revB = b.raw?.revisionNo ?? b.revisionNo ?? (b.raw?.revisionCode === 'Normal' ? 1 : 1)
    return revA - revB
  })

  const recordsToProcess = siblingRevisions.length > 0 ? siblingRevisions : [row]

  const isAnyRecordApproved = recordsToProcess.some((q) => {
    const st = String(q.status || q.raw?.status || '').toLowerCase()
    if (st === 'approved') return true
    const revs = Array.isArray(q.raw?.revisions) ? q.raw.revisions : (Array.isArray(q.revisions) ? q.revisions : [])
    return revs.some((r) => String(r.status || '').toLowerCase() === 'approved')
  })

  // Extract base quotation number e.g. "SSIPL/2026/1013" from "SSIPL/2026/1013-R1" or "SSIPL/2026/1013"
  const rawBaseQuoteNo = (targetQuoteNo || row.num || row.quotationNumber || 'SSIPL/2026/1013').replace(/-R\d+$/i, '')
  const companyName = row.company || row.raw?.companyName || row.raw?.customerName || row.raw?.clientName || 'Account'
  const displayTitleQuoteNo = `${rawBaseQuoteNo}-R1`

  const revisionRowsMap = new Map()

  recordsToProcess.forEach((q) => {
    const qRevisions = Array.isArray(q.raw?.revisions) && q.raw.revisions.length > 0
      ? q.raw.revisions
      : (Array.isArray(q.revisions) && q.revisions.length > 0 ? q.revisions : null)

    const ownerName = q.owner || q.raw?.selectedAccountOwner || q.raw?.accountOwner || row.owner || '-'
    const projName = q.project || q.raw?.projectName || row.project || '-'
    const compName = q.company || q.raw?.companyName || q.raw?.customerName || row.company || '-'

    if (qRevisions) {
      qRevisions.forEach((revItem) => {
        let revCode = revItem.revisionCode || (revItem.revisionNo ? `R${revItem.revisionNo}` : 'R1')
        if (revCode === 'Normal') revCode = 'R1'
        const formattedNum = `${rawBaseQuoteNo}-${revCode}`
        const rawAmt = Number(revItem.amount || revItem.totalAmount || 0)
        const amtLabel = formatCurrency(rawAmt, q.currency || 'INR')
        const statusVal = isAnyRecordApproved ? 'Approved' : (revItem.status || q.raw?.status || q.status || 'Draft')
        const dateVal = revItem.date || q.date || q.raw?.quotationDate || '-'

        revisionRowsMap.set(revCode, {
          key: revCode,
          revisionCode: revCode,
          quotationNumber: formattedNum,
          owner: ownerName,
          date: dateVal,
          company: compName,
          amount: rawAmt,
          amountLabel: amtLabel,
          status: statusVal,
          project: projName,
          rawRecord: q,
          revItem,
        })
      })
    } else {
      let revCode = q.raw?.revisionCode || (q.raw?.revisionNo === 0 || q.raw?.revisionNo === 1 ? 'R1' : q.raw?.revisionNo ? `R${q.raw.revisionNo}` : 'R1')
      if (revCode === 'Normal') revCode = 'R1'
      const formattedNum = (q.num || q.quoteNumber || q.quotationNumber || '').includes('-R')
        ? (q.num || q.quoteNumber || q.quotationNumber)
        : `${rawBaseQuoteNo}-${revCode}`
      const rawAmt = Number(q.amount || q.totalAmount || q.raw?.totalAmount || q.raw?.amount || 0)
      const amtLabel = q.amountLabel || formatCurrency(rawAmt, q.currency || 'INR')
      const statusVal = isAnyRecordApproved ? 'Approved' : (q.raw?.status || q.status || 'Draft')
      const dateVal = q.date || q.raw?.quotationDate || '-'

      revisionRowsMap.set(revCode, {
        key: revCode,
        revisionCode: revCode,
        quotationNumber: formattedNum,
        owner: ownerName,
        date: dateVal,
        company: compName,
        amount: rawAmt,
        amountLabel: amtLabel,
        status: statusVal,
        project: projName,
        rawRecord: q,
      })
    }
  })

  const revisionRowsList = Array.from(revisionRowsMap.values()).sort((a, b) => {
    const numA = Number(a.revisionCode.replace(/\D/g, '')) || 1
    const numB = Number(b.revisionCode.replace(/\D/g, '')) || 1
    return numA - numB
  })

  const allRevisionCodes = Array.from(
    new Set(revisionRowsList.map((r) => r.revisionCode))
  ).sort((a, b) => {
    const numA = Number(a.replace(/\D/g, '')) || 1
    const numB = Number(b.replace(/\D/g, '')) || 1
    return numA - numB
  })

  if (allRevisionCodes.length === 0) {
    allRevisionCodes.push('R1')
  }

  return (
    <div className="aqp-page" style={{ padding: '24px', backgroundColor: '#f8fafc', minHeight: '100vh' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px', paddingBottom: '16px', borderBottom: '1px solid #e2e8f0' }}>
        <div>
          <button
            type="button"
            className="aqp-btn aqp-btn--gray"
            style={{ marginBottom: '12px', cursor: 'pointer' }}
            onClick={onClose}
          >
            &larr; Back To Quotations List
          </button>
          <h1 style={{ margin: 0, fontSize: '1.5rem', color: '#0f172a', fontWeight: 700 }}>
            Revision History — {companyName} ({displayTitleQuoteNo})
          </h1>
          <p style={{ margin: '4px 0 0 0', fontSize: '0.9rem', color: '#64748b' }}>
            Viewing all revision versions for <strong>{companyName}</strong>. Click any revision to view details or click Approve to approve.
          </p>
        </div>
      </div>

      <div style={{ background: '#ffffff', borderRadius: '8px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)', padding: '20px', overflowX: 'auto' }}>
        <table className="aqp-table" style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ background: '#f1f5f9', borderBottom: '2px solid #cbd5e1', textAlign: 'left' }}>
              <th style={{ padding: '12px 14px' }}>Revision</th>
              <th style={{ padding: '12px 14px' }}>Quotation Number</th>
              <th style={{ padding: '12px 14px' }}>Owner</th>
              <th style={{ padding: '12px 14px' }}>Quotation Date</th>
              <th style={{ padding: '12px 14px' }}>Company Name</th>
              {allRevisionCodes.map((code) => (
                <th key={code} style={{ padding: '12px 14px', textAlign: 'right' }}>
                  {code} Amount
                </th>
              ))}
              <th style={{ padding: '12px 14px' }}>Status</th>
              <th style={{ padding: '12px 14px' }}>Project</th>
              <th style={{ padding: '12px 14px', textAlign: 'center' }}>Action</th>
            </tr>
          </thead>
          <tbody>
            {revisionRowsList.map((rev) => {
              const isApproved = String(rev.status || '').toLowerCase() === 'approved'
              const revRowCodeNum = Number(rev.revisionCode.replace(/\D/g, '')) || 1

              return (
                <tr
                  key={rev.key}
                  style={{ borderBottom: '1px solid #e2e8f0', cursor: 'pointer' }}
                  onClick={() => onSelectRevision(rev.rawRecord)}
                >
                  <td style={{ padding: '12px 14px' }}>
                    <span className="aqp-badge aqp-badge--blue" style={{ fontWeight: 600 }}>
                      {rev.revisionCode}
                    </span>
                  </td>
                  <td style={{ padding: '12px 14px', fontWeight: 600, color: '#0284c7' }}>
                    {rev.quotationNumber}
                  </td>
                  <td style={{ padding: '12px 14px' }}>{rev.owner || '-'}</td>
                  <td style={{ padding: '12px 14px' }}>{rev.date || '-'}</td>
                  <td style={{ padding: '12px 14px' }}>{rev.company || '-'}</td>
                  {allRevisionCodes.map((code) => {
                    const isCurrentCellCode = rev.revisionCode === code
                    const cellCodeNum = Number(code.replace(/\D/g, '')) || 1

                    let cellVal = '-'
                    const matchRev = revisionRowsList.find((r) => r.revisionCode === code)
                    if (matchRev && cellCodeNum <= revRowCodeNum) {
                      cellVal = matchRev.amountLabel
                    }

                    return (
                      <td
                        key={code}
                        style={{
                          padding: '12px 14px',
                          textAlign: 'right',
                          fontWeight: isCurrentCellCode ? 600 : 400,
                          color: isCurrentCellCode ? '#0f172a' : '#64748b',
                        }}
                      >
                        {cellVal}
                      </td>
                    )
                  })}
                  <td style={{ padding: '12px 14px' }}>
                    <StatusBadge statusKey={rev.status} />
                  </td>
                  <td style={{ padding: '12px 14px' }}>{rev.project || '-'}</td>
                  <td style={{ padding: '12px 14px', textAlign: 'center', whiteSpace: 'nowrap' }}>
                    <div style={{ display: 'flex', gap: '8px', justifyContent: 'center' }}>
                      <button
                        type="button"
                        className="aqp-btn aqp-btn--secondary aqp-btn--sm"
                        onClick={(e) => {
                          e.stopPropagation()
                          onSelectRevision(rev.rawRecord)
                        }}
                      >
                        <FaEye /> View
                      </button>
                      {!isApproved && onApproveRevision ? (
                        <button
                          type="button"
                          className="aqp-btn aqp-btn--primary aqp-btn--sm"
                          style={{ backgroundColor: '#c60016', borderColor: '#a80012', color: '#ffffff' }}
                          onClick={(e) => {
                            e.stopPropagation()
                            onApproveRevision({ ...rev.rawRecord, revisionCode: rev.revisionCode, num: rev.quotationNumber })
                          }}
                        >
                          <FaCheck /> Approve
                        </button>
                      ) : null}
                    </div>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}

export function SequentialRevisionSummaryCard({
  accountRecord,
  dealRecord,
  allQuotations = [],
}) {
  const targetAccountId = accountRecord?.id || accountRecord?.accountNumber || accountRecord?.accountNo
  const targetDealId = dealRecord?.id || dealRecord?.dealNumber

  const siblingQuotes = useMemo(() => {
    return allQuotations.filter((q) => {
      const qAccount = q.raw?.customerId || q.raw?.selectedAccountId || q.raw?.accountNumber || q.accountNumber
      const qDeal = q.raw?.dealId || q.dealNumber

      if (targetDealId && qDeal === targetDealId) return true
      if (targetAccountId && qAccount === targetAccountId) return true
      return false
    }).sort((a, b) => (a.raw?.revisionNo ?? a.revisionNo ?? 0) - (b.raw?.revisionNo ?? b.revisionNo ?? 0))
  }, [allQuotations, targetAccountId, targetDealId])

  const existingRevisionCount = siblingQuotes.length
  const nextRevisionCode = existingRevisionCount === 0 ? 'R1' : `R${existingRevisionCount + 1}`

  const revisionAmounts = {}
  siblingQuotes.forEach((q) => {
    const code = q.raw?.revisionCode || (q.raw?.revisionNo === 0 || q.raw?.revisionNo === 1 ? 'R1' : `R${q.raw?.revisionNo}`)
    const amt = q.raw?.totalAmount || q.raw?.amount || q.amount || 0
    revisionAmounts[code] = amt
  })

  return (
    <div style={{
      background: '#f0fdf4',
      border: '1px solid #bbf7d0',
      borderRadius: '8px',
      padding: '12px 16px',
      marginBottom: '16px',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
        <span style={{ fontWeight: 700, color: '#166534', fontSize: '0.95rem' }}>
          Quotation Revision Target: <span style={{ textDecoration: 'underline' }}>{nextRevisionCode}</span>
        </span>
        {existingRevisionCount > 0 && (
          <span style={{ fontSize: '0.8rem', background: '#dcfce7', color: '#15803d', padding: '2px 8px', borderRadius: '12px', fontWeight: 600 }}>
            {existingRevisionCount} Prior Version{existingRevisionCount > 1 ? 's' : ''} Recorded
          </span>
        )}
      </div>
      {existingRevisionCount > 0 ? (
        <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap', fontSize: '0.85rem', color: '#166534' }}>
          {Object.entries(revisionAmounts).map(([code, amt]) => (
            <div key={code} style={{ background: '#ffffff', border: '1px solid #cbd5e1', padding: '4px 10px', borderRadius: '4px' }}>
              <strong>{code} Amount (Read-only):</strong> {formatCurrency(amt, 'INR')}
            </div>
          ))}
        </div>
      ) : (
        <div style={{ fontSize: '0.85rem', color: '#15803d' }}>
          This will be generated as the initial <strong>R1</strong> quotation.
        </div>
      )}
    </div>
  )
}

