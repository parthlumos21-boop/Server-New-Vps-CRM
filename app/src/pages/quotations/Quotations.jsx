import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  FaChevronDown,
  FaChevronLeft,
  FaChevronRight,
  FaFilter,
  FaListUl,
  FaPlus,
  FaPrint,
  FaSearch,
  FaSort,
  FaTimes,
  FaTrash,
  FaUpload,
} from 'react-icons/fa'
import { useLocation, useNavigate, useSearchParams } from 'react-router-dom'
import swatiLogo from '../../assets/swati-logo.png'
import lumosLogo from '../../assets/lumos-logo.svg'
import { useData } from '../../context/DataContext'
import { useAuth } from '../../context/AuthContext'
import { useModal } from '../../hooks'
import Card from '../../components/common/Card'
import Button from '../../components/common/Button'
import Input from '../../components/common/Input'
import Select from '../../components/common/Select'
import Modal from '../../components/common/Modal'
import Table from '../../components/common/Table'
import Badge from '../../components/common/Badge'
import { ExcelExportMenuButton } from '../../components/common/ExcelExportButton'
import { normalizeAccountRecord } from '../../features/adminAccounts/adapters/normalizeAccountRecord'
import { compareAccountsByNumberAsc } from '../../features/adminAccounts/selectors/getAccountsBoardData'
import {
  ACTIONS as QUOTATION_ACTIONS,
  ModalShell,
  QuotationDocument,
  QuotationPdfViewer,
  StatusBadge,
  buildQuotationDocumentData,
  buildVisiblePages,
  formatListDate,
  formatStatusLabel,
  getActionBadgeClassName,
  resolveLinkedAccount,
  safeLower,
  triggerBrowserPdfSave,
} from '../admin/quotations/AdminQuotationsPage'
import { AddProductModal, AddOtherProductModal, AddOtherServiceModal } from './LineItemModals'
import { dataService } from '../../services/dataService'
import { exportExcelWorkbook, exportCsvWorkbook } from '../../utils/excelExport'
import { formatCurrency, formatDate, generateId } from '../../utils/helpers'
import './Quotations.css'
import '../admin/quotations/AdminQuotationsPage.css'

const ACCOUNT_LIST_PAGE_SIZE = 8
const QUOTATION_PAGE_SIZE = 10
const QUOTATION_LAYOUT_STORAGE_KEY = 'crm-quotations-report-layout'

const INITIAL_ACCOUNT_FILTERS = {
  accountNumber: '',
  name: '',
  email: '',
  phone: '',
  accountOwner: '',
}

const PROFILE_OPTIONS = [
  {
    value: 'swati-switch',
    label: 'SWATI',
    organizationName: 'Swati Switchgears India Pvt Ltd',
    organizationAddress: '36 Shubhlaxmi Industrial Estate, Sarkhej Bavla Road, Changodar, Ahmedabad - 382210',
    organizationEmail: 'mkt@swatiswitchgears.com',
    organizationPhone: '9913536307',
    organizationGstin: '24AAACZ0615P1Z7',
    organizationStateCode: '24',
    website: 'www.swatiswitchgears.com',
    organizationTagline: 'Electrical panels, switchgear and turnkey project solutions.',
    currency: 'INR',
    logoType: 'image',
    logoAsset: 'swati',
  },
  {
    value: 'lumos-building',
    label: 'LUMOS',
    organizationName: 'Lumos Building Automation Pvt Ltd',
    organizationAddress: 'Vadodara, Gujarat, India',
    organizationEmail: 'sales@lumosbuildingautomation.com',
    organizationPhone: '+91 265 4000 222',
    organizationGstin: '24AAECL9020K1ZY',
    organizationStateCode: '24',
    website: 'www.lumosbuildingautomation.com',
    organizationTagline: 'Building automation, controls and smart infrastructure solutions.',
    currency: 'INR',
    logoType: 'image',
    logoAsset: 'lumos',
  },
  {
    value: 'swati-switch-gear',
    label: 'Swati Switch Gear',
    organizationName: 'Swati Switchgears India Pvt Ltd',
    organizationAddress: '36 Shubhlaxmi Industrial Estate, Sarkhej Bavla Road, Changodar, Ahmedabad - 382210',
    organizationEmail: 'mkt@swatiswitchgears.com',
    organizationPhone: '9913536307',
    organizationGstin: '24AAACZ0615P1Z7',
    organizationStateCode: '24',
    website: 'www.swatiswitchgears.com',
    organizationTagline: 'Electrical panels, switchgear and turnkey project solutions.',
    currency: 'INR',
    logoType: 'image',
    logoAsset: 'swati',
  },
]

const PROFILE_ALIASES = {
  swati: 'swati-switch',
  SWATI: 'swati-switch',
  'swati switch': 'swati-switch',
  'swati switchgear': 'swati-switch-gear',
  'swati switch gear': 'swati-switch-gear',
  'swati-switch-gear': 'swati-switch-gear',
  lumos: 'lumos-building',
  LUMOS: 'lumos-building',
  'lumos building automation': 'lumos-building',
  'lumos building automation pvt ltd': 'lumos-building',
}

const QUOTATION_STATUS_OPTIONS = [
  { value: 'draft', label: 'Draft' },
  { value: 'sent', label: 'Sent' },
  { value: 'accepted', label: 'Accepted' },
  { value: 'rejected', label: 'Rejected' },
]

const QUOTATION_CURRENCY_OPTIONS = [
  { value: 'INR', label: 'INR' },
  { value: 'USD', label: 'USD' },
  { value: 'EUR', label: 'EUR' },
]

const getTodayInputValue = () => new Date().toISOString().slice(0, 10)

const addDaysToInputValue = (dateValue, days) => {
  const nextDate = new Date(dateValue || getTodayInputValue())
  nextDate.setDate(nextDate.getDate() + days)
  return nextDate.toISOString().slice(0, 10)
}

const toNumber = (value) => {
  const parsedValue = Number.parseFloat(value)
  return Number.isFinite(parsedValue) ? parsedValue : 0
}

const createEmptyLineItem = () => ({
  id: generateId('QLI'),
  description: '',
  quantity: '',
  unit: 'Nos',
  rate: '',
})

const calculateLineItemAmount = (lineItem = {}) => (
  toNumber(lineItem.quantity) * toNumber(lineItem.rate)
)

const getProfileByValue = (value) => {
  const requestedValue = String(value || '').trim()
  const normalizedValue = requestedValue.toLowerCase()
  const canonicalValue = PROFILE_ALIASES[normalizedValue] || requestedValue

  return PROFILE_OPTIONS.find((option) => (
    option.value === canonicalValue
    || option.label.toLowerCase() === normalizedValue
  )) || null
}

const getProfileLogoSource = (profile) => {
  if (!profile) return null
  if (profile.logoAsset === 'lumos' || String(profile.value || '').toLowerCase().includes('lumos')) {
    return lumosLogo
  }
  if (profile.logoAsset === 'swati' || String(profile.value || '').toLowerCase().includes('swati')) {
    return swatiLogo
  }
  return null
}

const getQuotationProfileForAccount = (account = {}, fallbackProfile = 'swati-switch') => {
  const brandText = [
    account.accountCategory,
    account.customerCategory,
    account.productCategory,
    account.profileName,
    account.organizationName,
    account.raw?.accountCategory,
    account.raw?.customerCategory,
    account.raw?.productCategory,
  ].filter(Boolean).join(' ').toLowerCase()

  if (brandText.includes('lumos')) return 'lumos-building'
  if (brandText.includes('swati')) return 'swati-switch'
  return fallbackProfile || 'swati-switch'
}

const buildClientAddressDetails = (account = {}) => (
  [
    account.contactDesignation,
    account.address,
    account.location,
    account.state,
  ].filter(Boolean).join(', ') || '-'
)

const buildQuotationCustomerAccount = (customer = {}) => {
  const primaryContact = customer.contacts?.[0] || {}

  return {
    id: customer.id || customer.customerNumber || `customer-${Date.now()}`,
    accountNumber: customer.customerNumber || '',
    name: customer.customerName || '',
    contactPerson: primaryContact.contactPerson || customer.contactPerson || '',
    contactDesignation: primaryContact.designation || customer.contactDesignation || '',
    contactMobile: primaryContact.mobile || customer.contactMobile || customer.mobile || '',
    contactPhone: primaryContact.phone || customer.contactPhone || customer.phone || '',
    phone: primaryContact.mobile || primaryContact.phone || customer.phone || '',
    contactEmail: primaryContact.email || customer.contactEmail || customer.email || '',
    email: primaryContact.email || customer.email || '',
    gstin: customer.gstin || '',
    stateCode: customer.stateCode || '',
    address: customer.address || '',
    location: customer.location || '',
    state: customer.state || '',
    accountCategory: customer.accountCategory || customer.customerCategory || '',
    customerCategory: customer.customerCategory || customer.accountCategory || '',
    projectName: customer.projectName || customer.customerName || '',
    latestRemark: customer.latestRemark || customer.remark || '',
    remark: customer.remark || '',
    productCategory: customer.productCategory || customer.customerCategory || '',
    accountOwnerName: customer.customerOwnerName || customer.customerOwnerDisplay || customer.customerOwner || '',
    accountOwner: customer.customerOwner || '',
  }
}

const buildQuotationDealAccount = (deal = {}) => ({
  id: deal.id || deal.dealNumber || `deal-${Date.now()}`,
  quotationContext: 'deal',
  accountNumber: deal.dealNumber || '',
  name: deal.companyName || deal.customerName || deal.accountName || deal.dealName || deal.name || '',
  contactPerson: deal.contactPerson || deal.contactName || '',
  contactDesignation: deal.contactDesignation || '',
  contactMobile: deal.contactMobile || '',
  contactPhone: deal.contactPhone || deal.phone || '',
  phone: deal.contactMobile || deal.contactPhone || deal.phone || '',
  contactEmail: deal.contactEmail || deal.email || '',
  email: deal.contactEmail || deal.email || '',
  gstin: deal.gstin || '',
  stateCode: deal.stateCode || '',
  address: deal.address || '',
  location: deal.location || deal.city || '',
  state: deal.state || '',
  accountCategory: deal.accountCategory || deal.customerCategory || '',
  customerCategory: deal.customerCategory || deal.accountCategory || '',
  projectName: deal.projectName || deal.dealName || deal.name || '',
  latestRemark: deal.latestRemark || deal.remark || deal.description || '',
  remark: deal.remark || deal.description || '',
  productCategory: deal.productCategory || deal.customerCategory || '',
  architectName: deal.architectName || '',
  pmcName: deal.pmcName || '',
  accountOwnerName: deal.dealOwnerName || deal.dealOwnerDisplay || deal.dealOwner || deal.ownerName || '',
  accountOwner: deal.dealOwner || deal.ownerName || '',
})

const splitAddressLines = (value = '') => {
  const segments = String(value || '')
    .split(',')
    .map((segment) => segment.trim())
    .filter(Boolean)

  return Array.from({ length: 4 }, (_, index) => segments[index] || '')
}

const joinAddressLines = (lines = []) => lines
  .map((line) => String(line || '').trim())
  .filter(Boolean)
  .join(', ')

const createInitialQuotationForm = () => ({
  quotationNumber: '',
  profileKey: '',
  profileName: '',
  quotationDate: getTodayInputValue(),
  validUntil: addDaysToInputValue(getTodayInputValue(), 30),
  currency: 'INR',
  status: 'draft',
  clientAccountNumber: '',
  companyName: '',
  contactPerson: '',
  telephone: '',
  email: '',
  gstin: '',
  stateCode: '',
  clientAddressDetails: '',
  organizationName: '',
  organizationAddress: '',
  organizationEmail: '',
  organizationPhone: '',
  organizationGstin: '',
  organizationStateCode: '',
  website: '',
  organizationTagline: '',
  projectName: '',
  architectName: '',
  pmcName: '',
  quotationSubject: '',
  quotationNotes: '',
  deliveryTerms: '',
  paymentTerms: '',
  warrantyTerms: '',
  customerReferenceNumber: '',
  customerReferenceDate: getTodayInputValue(),
  customerReferenceSubject: '',
  product: '',
  otherProduct: '',
  otherService: '',
  uploadedLineItemsName: '',
  selectedAccountId: '',
  selectedAccountOwner: '',
  lineItems: [createEmptyLineItem()],
})

const buildQuotationFormFromExisting = (quotation = {}, nextQuotationNumber = '') => {
  const quotationDate = getTodayInputValue()
  const clonedLineItems = Array.isArray(quotation.lineItems) && quotation.lineItems.length > 0
    ? quotation.lineItems.map((lineItem) => ({
      id: generateId('QLI'),
      description: lineItem.description || '',
      quantity: String(lineItem.quantity || ''),
      unit: lineItem.unit || 'Nos',
      rate: String(lineItem.rate || ''),
    }))
    : [createEmptyLineItem()]

  return {
    ...createInitialQuotationForm(),
    ...quotation,
    quotationNumber: nextQuotationNumber || quotation.quotationNumber || '',
    quotationDate,
    validUntil: addDaysToInputValue(quotationDate, 30),
    status: 'draft',
    lineItems: clonedLineItems,
  }
}

const sanitizeLineItems = (lineItems = []) => lineItems
  .map((lineItem) => ({
    ...lineItem,
    quantity: String(lineItem.quantity || ''),
    unit: String(lineItem.unit || '').trim(),
    rate: String(lineItem.rate || ''),
    amount: calculateLineItemAmount(lineItem),
  }))
  .filter((lineItem) => lineItem.description.trim())

// â”€â”€ Duplicate detection helpers â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
const normalizeMatchText = (value) => String(value || '').trim().toLowerCase().replace(/\s+/g, ' ')

const roundMatchCurrency = (value) => Math.round((Number(value) || 0) * 100) / 100

const buildLineItemFingerprint = (items = []) => (
  items
    .map((item) => [
      normalizeMatchText(item.description),
      String(item.quantity ?? '').trim(),
      String(item.rate ?? item.price ?? '').trim(),
    ].join('|'))
    .sort()
    .join('||')
)

const buildPayloadFingerprint = (payload, lineItems) => ({
  customer:   normalizeMatchText(payload.companyName || payload.customerName || payload.clientName),
  project:    normalizeMatchText(payload.projectName),
  architect:  normalizeMatchText(payload.architectName),
  pmc:        normalizeMatchText(payload.pmcName),
  title:      normalizeMatchText(payload.title || payload.quotationSubject),
  total:      roundMatchCurrency(payload.totalAmount ?? payload.amount),
  tax:        roundMatchCurrency(payload.taxAmount),
  discount:   roundMatchCurrency(payload.discountAmount),
  lineItems:  buildLineItemFingerprint(lineItems),
})

const buildExistingFingerprint = (record) => ({
  customer:   normalizeMatchText(record.companyName || record.customerName || record.clientName),
  project:    normalizeMatchText(record.projectName),
  architect:  normalizeMatchText(record.architectName),
  pmc:        normalizeMatchText(record.pmcName),
  title:      normalizeMatchText(record.title || record.quotationSubject),
  total:      roundMatchCurrency(record.totalAmount ?? record.amount),
  tax:        roundMatchCurrency(record.taxAmount),
  discount:   roundMatchCurrency(record.discountAmount),
  lineItems:  buildLineItemFingerprint(Array.isArray(record.lineItems) ? record.lineItems : []),
})

const isQuotationDuplicate = (existingRecord, payload, lineItems) => {
  if (!existingRecord || String(existingRecord.status || '').toLowerCase() === 'cancelled') {
    return false
  }
  const a = buildPayloadFingerprint(payload, lineItems)
  const b = buildExistingFingerprint(existingRecord)
  if (!a.lineItems || !(a.customer || a.project || a.title)) return false
  return (
    a.customer === b.customer
    && a.project === b.project
    && a.architect === b.architect
    && a.pmc === b.pmc
    && a.title === b.title
    && a.total === b.total
    && a.tax === b.tax
    && a.discount === b.discount
    && a.lineItems === b.lineItems
  )
}

const parseUploadedLineItems = (content = '') => {
  const rows = String(content || '')
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)

  if (rows.length === 0) {
    return []
  }

  const parsedRows = rows.map((row) => row.split(',').map((value) => value.trim()))
  const [firstRow = []] = parsedRows
  const normalizedHeader = firstRow.map((cell) => cell.toLowerCase())
  const hasHeader = normalizedHeader.some((cell) => (
    cell.includes('description')
    || cell.includes('qty')
    || cell.includes('quantity')
    || cell.includes('rate')
    || cell.includes('unit')
  ))

  const dataRows = hasHeader ? parsedRows.slice(1) : parsedRows
  const descriptionIndex = hasHeader
    ? normalizedHeader.findIndex((cell) => cell.includes('description'))
    : 0
  const quantityIndex = hasHeader
    ? normalizedHeader.findIndex((cell) => cell.includes('qty') || cell.includes('quantity'))
    : 1
  const unitIndex = hasHeader
    ? normalizedHeader.findIndex((cell) => cell.includes('unit'))
    : 2
  const rateIndex = hasHeader
    ? normalizedHeader.findIndex((cell) => cell.includes('rate'))
    : 3

  return dataRows
    .map((cells) => ({
      id: generateId('QLI'),
      description: cells[descriptionIndex >= 0 ? descriptionIndex : 0] || '',
      quantity: cells[quantityIndex >= 0 ? quantityIndex : 1] || '1',
      unit: cells[unitIndex >= 0 ? unitIndex : 2] || 'Nos',
      rate: cells[rateIndex >= 0 ? rateIndex : 3] || '',
    }))
    .filter((lineItem) => lineItem.description || toNumber(lineItem.quantity) > 0 || toNumber(lineItem.rate) > 0)
}

const INITIAL_QUOTATION_FILTERS = {
  num: '',
  owner: '',
  date: '',
  company: '',
  amount: '',
  status: '',
  project: '',
  accountNumber: '',
  validUntil: '',
  contextName: '',
  contactPerson: '',
  productTotalBeforeDiscount: '',
  serviceTotalBeforeDiscount: '',
  productDiscountAmount: '',
  serviceDiscountAmount: '',
  productTax: '',
  serviceTax: '',
  productTotal: '',
  otherProductTotal: '',
  serviceTotal: '',
  otherServiceTotal: '',
}

const getVisibleQuotationActions = () => QUOTATION_ACTIONS

const QUOTATION_FIELD_DEFINITIONS = [
  { key: 'num', label: 'Quotation Number', exportValue: (row) => row.num, sortValue: (row) => row.num },
  { key: 'owner', label: 'Quotation Owner', exportValue: (row) => row.owner, sortValue: (row) => row.owner },
  { key: 'date', label: 'Quotation Date', exportValue: (row) => row.date, sortValue: (row) => row.dateSort },
  { key: 'company', label: 'Company Name', exportValue: (row) => row.company, sortValue: (row) => row.company },
  { key: 'amount', label: 'Amount', exportValue: (row) => row.amountLabel, sortValue: (row) => row.amount },
  { key: 'status', label: 'Status', exportValue: (row) => row.statusLabel, sortValue: (row) => row.statusLabel },
  { key: 'project', label: 'Project Name', exportValue: (row) => row.project, sortValue: (row) => row.project },
  { key: 'accountNumber', label: 'Account No.', exportValue: (row) => row.accountNumber, sortValue: (row) => row.accountNumber },
  { key: 'contextName', label: 'Context Name', exportValue: (row) => row.contextName, sortValue: (row) => row.contextName },
  { key: 'contactPerson', label: 'Contact Person', exportValue: (row) => row.contactPerson, sortValue: (row) => row.contactPerson },
  { key: 'validUntil', label: 'Valid Until', exportValue: (row) => row.validUntilLabel, sortValue: (row) => row.validUntilSort },
  { key: 'productTotalBeforeDiscount', label: 'Product Total Before Discount', exportValue: (row) => row.productTotalBeforeDiscountLabel, sortValue: (row) => row.productTotalBeforeDiscount },
  { key: 'serviceTotalBeforeDiscount', label: 'Service Total Before Discount', exportValue: (row) => row.serviceTotalBeforeDiscountLabel, sortValue: (row) => row.serviceTotalBeforeDiscount },
  { key: 'productDiscountAmount', label: 'Product Discount Amount', exportValue: (row) => row.productDiscountAmountLabel, sortValue: (row) => row.productDiscountAmount },
  { key: 'serviceDiscountAmount', label: 'Service Discount Amount', exportValue: (row) => row.serviceDiscountAmountLabel, sortValue: (row) => row.serviceDiscountAmount },
  { key: 'productTax', label: 'Product Tax', exportValue: (row) => row.productTaxLabel, sortValue: (row) => row.productTax },
  { key: 'serviceTax', label: 'Service Tax', exportValue: (row) => row.serviceTaxLabel, sortValue: (row) => row.serviceTax },
  { key: 'productTotal', label: 'Product Total', exportValue: (row) => row.productTotalLabel, sortValue: (row) => row.productTotal },
  { key: 'otherProductTotal', label: 'Other Product Total', exportValue: (row) => row.otherProductTotalLabel, sortValue: (row) => row.otherProductTotal },
  { key: 'serviceTotal', label: 'Service Total', exportValue: (row) => row.serviceTotalLabel, sortValue: (row) => row.serviceTotal },
  { key: 'otherServiceTotal', label: 'Other Service Total', exportValue: (row) => row.otherServiceTotalLabel, sortValue: (row) => row.otherServiceTotal },
]

const DEFAULT_SELECTED_QUOTATION_FIELDS = ['num', 'owner', 'date', 'company', 'amount', 'status', 'project']

const readQuotationLayout = () => {
  try {
    const rawValue = window.localStorage.getItem(QUOTATION_LAYOUT_STORAGE_KEY)
    const parsedValue = rawValue ? JSON.parse(rawValue) : null
    const selectedFields = Array.isArray(parsedValue?.selectedFields) && parsedValue.selectedFields.length > 0
      ? parsedValue.selectedFields.filter((fieldKey) => QUOTATION_FIELD_DEFINITIONS.some((field) => field.key === fieldKey))
      : DEFAULT_SELECTED_QUOTATION_FIELDS

    return {
      showLatestQuotations: parsedValue?.showLatestQuotations === 'NO' ? 'NO' : 'YES',
      addOrderBy: parsedValue?.addOrderBy === 'NO' ? 'NO' : 'YES',
      selectedFields,
    }
  } catch {
    return {
      showLatestQuotations: 'YES',
      addOrderBy: 'YES',
      selectedFields: DEFAULT_SELECTED_QUOTATION_FIELDS,
    }
  }
}

const Quotations = ({ autoOpen = false }) => {
  const location = useLocation()
  const navigate = useNavigate()
  const {
    quotations,
    quotationsLoading,
    quotationsError,
    createQuotation,
    updateQuotation,
    addNotification,
    accounts,
  } = useData()
  const { user } = useAuth()
  const { isOpen, open, close } = useModal()
  const fileInputRef = useRef(null)
  const lineItemsUploadRef = useRef(null)
  const productSectionRef = useRef(null)
  const otherProductSectionRef = useRef(null)
  const otherServiceSectionRef = useRef(null)

  const [uploading, setUploading] = useState(false)
  const [uploadError, setUploadError] = useState('')
  const [activeTab, setActiveTab] = useState('account')
  const [profileFilter, setProfileFilter] = useState('all')
  const [showFilterRow, setShowFilterRow] = useState(true)
  const [isFieldPanelOpen, setIsFieldPanelOpen] = useState(false)
  const [quotationLayout, setQuotationLayout] = useState(readQuotationLayout)
  const [fieldPanelDraft, setFieldPanelDraft] = useState(readQuotationLayout)
  const [draggedFieldKey, setDraggedFieldKey] = useState('')
  const [quotationFilters, setQuotationFilters] = useState(INITIAL_QUOTATION_FILTERS)
  const [quotationSort, setQuotationSort] = useState({ key: 'date', direction: 'desc' })
  const [quotationPage, setQuotationPage] = useState(1)
  const [pdfRow, setPdfRow] = useState(null)
  const [previewRow, setPreviewRow] = useState(null)
  const [viewRow, setViewRow] = useState(null)
  const [viewRowFromUrl, setViewRowFromUrl] = useState(false)
  const [viewActionMenuOpen, setViewActionMenuOpen] = useState(false)
  const [accountRow, setAccountRow] = useState(null)
  const [approveRow, setApproveRow] = useState(null)
  const [rejectRow, setRejectRow] = useState(null)
  const [rejectReason, setRejectReason] = useState('')
  const [rejectError, setRejectError] = useState('')
  const [actionLoadingId, setActionLoadingId] = useState('')
  const [isGenerateOpen, setIsGenerateOpen] = useState(false)
  const [isAccountListOpen, setIsAccountListOpen] = useState(false)
  const [selectedProfile, setSelectedProfile] = useState('')
  const [selectedAccountId, setSelectedAccountId] = useState('')
  const [accountFilters, setAccountFilters] = useState(INITIAL_ACCOUNT_FILTERS)
  const [accountListPage, setAccountListPage] = useState(1)
  const [generatorError, setGeneratorError] = useState('')
  const [quotationForm, setQuotationForm] = useState(() => createInitialQuotationForm())
  const [isProductModalOpen, setIsProductModalOpen] = useState(false)
  const [isOtherProductModalOpen, setIsOtherProductModalOpen] = useState(false)
  const [isOtherServiceModalOpen, setIsOtherServiceModalOpen] = useState(false)

  const handleAddModalLineItem = (item) => {
    setQuotationForm(prev => {
      const newLineItem = {
        id: generateId('QLI'),
        description: item.description || item.name || '',
        quantity: item.quantity || '1',
        unit: item.unit || 'Nos',
        rate: String(item.rate || item.price || '0'),
        amount: String((Number(item.quantity || 1) || 0) * (Number(item.rate || item.price || 0) || 0))
      }
      
      const existingItems = prev.lineItems || [];
      // Replace empty row if it's the only one
      if (existingItems.length === 1 && !existingItems[0].description) {
        return { ...prev, lineItems: [newLineItem] }
      }
      
      return { ...prev, lineItems: [...existingItems, newLineItem] }
    })
  }
  const [builderError, setBuilderError] = useState('')
  const [builderMessage, setBuilderMessage] = useState('')
  const [savingQuotation, setSavingQuotation] = useState(false)
  const [additionalSections, setAdditionalSections] = useState([])
  const [searchParams, setSearchParams] = useSearchParams()
  const viewQuotationId = searchParams.get('view') || ''

  const nextQuotationNumber = useMemo(
    () => dataService.buildQuotationNumber(dataService.getNextQuotationSequence(quotations)),
    [quotations]
  )

  const userQuotations = useMemo(() => (
    quotations.filter((quotation) => !user || user.role === 'admin' || quotation.userId === user.id)
  ), [quotations, user])

  const selectedFieldDefinitions = useMemo(() => (
    quotationLayout.selectedFields
      .map((fieldKey) => QUOTATION_FIELD_DEFINITIONS.find((field) => field.key === fieldKey))
      .filter(Boolean)
  ), [quotationLayout.selectedFields])

  const availableFieldDefinitions = useMemo(() => (
    QUOTATION_FIELD_DEFINITIONS.filter((field) => !fieldPanelDraft.selectedFields.includes(field.key))
  ), [fieldPanelDraft.selectedFields])

  const normalizedAccounts = useMemo(() => (
    accounts
      .map((account, index) => normalizeAccountRecord(account, index, { recordSource: 'quotation-generator' }))
      .sort(compareAccountsByNumberAsc)
  ), [accounts])

  const buildQuotationRow = useCallback((quotation, index = 0) => {
    const linkedAccount = resolveLinkedAccount(quotation, normalizedAccounts)
    const lineItemsSubtotal = (Array.isArray(quotation.lineItems) ? quotation.lineItems : []).reduce((sum, item) => (
      sum + (toNumber(item.amount) || (toNumber(item.quantity) * toNumber(item.rate)))
    ), 0)
    const amountNumber = toNumber(quotation.amount) || lineItemsSubtotal
    const productTax = toNumber(quotation.productTax || quotation.taxAmount || 0)
    const serviceTax = toNumber(quotation.serviceTax || 0)
    const productDiscountAmount = toNumber(quotation.productDiscountAmount || 0)
    const serviceDiscountAmount = toNumber(quotation.serviceDiscountAmount || 0)
    const otherProductTotal = toNumber(quotation.otherProductTotal || 0)
    const serviceTotal = toNumber(quotation.serviceTotal || 0)
    const otherServiceTotal = toNumber(quotation.otherServiceTotal || 0)
    const serviceTotalBeforeDiscount = toNumber(quotation.serviceTotalBeforeDiscount || serviceTotal)
    const validUntilSort = quotation.validUntil || ''
    const quotationScope = quotation.selectedAccountId || quotation.clientAccountNumber ? 'account' : 'deal'

    return {
      id: quotation.id || `quotation-${index}`,
      num: quotation.quotationNumber || `Quotation ${index + 1}`,
      owner: linkedAccount?.accountOwnerDisplay || quotation.selectedAccountOwner || linkedAccount?.accountOwner || '-',
      date: formatListDate(quotation.quotationDate || quotation.createdAt),
      dateSort: quotation.quotationDate || quotation.createdAt || '',
      company: quotation.companyName || linkedAccount?.name || quotation.clientName || '-',
      accountNumber: quotation.clientAccountNumber || linkedAccount?.accountNumber || '-',
      contextName: quotation.clientName || quotation.contactPerson || quotation.profileName || '-',
      contactPerson: quotation.contactPerson || linkedAccount?.contactPerson || '-',
      amount: amountNumber,
      amountLabel: formatCurrency(amountNumber, quotation.currency || 'INR'),
      status: quotation.status || 'draft',
      statusLabel: formatStatusLabel(quotation.status),
      project: quotation.projectName || quotation.product || quotation.otherProduct || quotation.otherService || '-',
      validUntilSort,
      validUntilLabel: formatDate(validUntilSort),
      productTotalBeforeDiscount: lineItemsSubtotal,
      productTotalBeforeDiscountLabel: formatCurrency(lineItemsSubtotal, quotation.currency || 'INR'),
      serviceTotalBeforeDiscount,
      serviceTotalBeforeDiscountLabel: formatCurrency(serviceTotalBeforeDiscount, quotation.currency || 'INR'),
      productDiscountAmount,
      productDiscountAmountLabel: formatCurrency(productDiscountAmount, quotation.currency || 'INR'),
      serviceDiscountAmount,
      serviceDiscountAmountLabel: formatCurrency(serviceDiscountAmount, quotation.currency || 'INR'),
      productTax,
      productTaxLabel: formatCurrency(productTax, quotation.currency || 'INR'),
      serviceTax,
      serviceTaxLabel: formatCurrency(serviceTax, quotation.currency || 'INR'),
      productTotal: amountNumber,
      productTotalLabel: formatCurrency(amountNumber, quotation.currency || 'INR'),
      otherProductTotal,
      otherProductTotalLabel: formatCurrency(otherProductTotal, quotation.currency || 'INR'),
      serviceTotal,
      serviceTotalLabel: formatCurrency(serviceTotal, quotation.currency || 'INR'),
      otherServiceTotal,
      otherServiceTotalLabel: formatCurrency(otherServiceTotal, quotation.currency || 'INR'),
      linkedAccount,
      originalIndex: index,
      quotationScope,
      raw: quotation,
    }
  }, [normalizedAccounts])

  const quotationRows = useMemo(() => (
    userQuotations
      .map((quotation, index) => buildQuotationRow(quotation, index))
      .sort((left, right) => new Date(right.dateSort || 0).getTime() - new Date(left.dateSort || 0).getTime())
  ), [buildQuotationRow, userQuotations])

  const filteredQuotationRows = useMemo(() => (
    quotationRows
      .filter((row) => row.quotationScope === activeTab)
      .filter((row) => {
        if (profileFilter === 'swati') return row.raw.profileKey === 'swati-switch'
        if (profileFilter === 'lumos') return row.raw.profileKey === 'lumos-building' || row.raw.profileKey === 'lumos'
        return true
      })
      .filter((row) => Object.entries(quotationFilters).every(([key, value]) => {
        const query = safeLower(value)
        if (!query) return true
        const fieldDefinition = QUOTATION_FIELD_DEFINITIONS.find((field) => field.key === key)
        const rowValue = fieldDefinition ? fieldDefinition.exportValue(row) : row[key]
        return safeLower(rowValue).includes(query)
      }))
      .sort((left, right) => {
        if (quotationLayout.addOrderBy === 'NO') {
          const leftDate = new Date(left.dateSort || 0).getTime()
          const rightDate = new Date(right.dateSort || 0).getTime()
          if (quotationLayout.showLatestQuotations === 'YES') {
            return rightDate - leftDate
          }
          return leftDate - rightDate
        }

        const { key, direction } = quotationSort
        const fieldDefinition = QUOTATION_FIELD_DEFINITIONS.find((field) => field.key === key)
        const leftValue = fieldDefinition?.sortValue ? fieldDefinition.sortValue(left) : left[key]
        const rightValue = fieldDefinition?.sortValue ? fieldDefinition.sortValue(right) : right[key]

        if (typeof leftValue === 'number' || typeof rightValue === 'number') {
          return direction === 'asc'
            ? toNumber(leftValue) - toNumber(rightValue)
            : toNumber(rightValue) - toNumber(leftValue)
        }

        const compareValue = String(leftValue || '').localeCompare(String(rightValue || ''), undefined, { sensitivity: 'base' })
        return direction === 'asc' ? compareValue : compareValue * -1
      })
  ), [activeTab, profileFilter, quotationFilters, quotationLayout.addOrderBy, quotationLayout.showLatestQuotations, quotationRows, quotationSort])

  const quotationTotalPages = useMemo(
    () => Math.max(1, Math.ceil(filteredQuotationRows.length / QUOTATION_PAGE_SIZE)),
    [filteredQuotationRows.length]
  )

  const visibleQuotationPages = useMemo(
    () => buildVisiblePages(quotationPage, quotationTotalPages),
    [quotationPage, quotationTotalPages]
  )

  const paginatedQuotationRows = useMemo(() => {
    const startIndex = (quotationPage - 1) * QUOTATION_PAGE_SIZE
    return filteredQuotationRows.slice(startIndex, startIndex + QUOTATION_PAGE_SIZE)
  }, [filteredQuotationRows, quotationPage])

  const filteredAccounts = useMemo(() => (
    normalizedAccounts.filter((account) => Object.entries(accountFilters).every(([key, value]) => {
      const query = value.trim().toLowerCase()
      if (!query) return true
      const resolvedValue = key === 'accountOwner'
        ? (account.accountOwnerDisplay || account.accountOwner || '')
        : account[key]
      return String(resolvedValue || '').toLowerCase().includes(query)
    }))
  ), [accountFilters, normalizedAccounts])

  const totalAccountPages = useMemo(
    () => Math.max(1, Math.ceil(filteredAccounts.length / ACCOUNT_LIST_PAGE_SIZE)),
    [filteredAccounts.length]
  )

  useEffect(() => {
    setAccountListPage((currentPage) => Math.min(currentPage, totalAccountPages))
  }, [totalAccountPages])

  useEffect(() => {
    setQuotationPage((currentPage) => Math.min(currentPage, quotationTotalPages))
  }, [quotationTotalPages])

  useEffect(() => {
    if (!viewActionMenuOpen) return undefined

    const handleOutsideClick = () => setViewActionMenuOpen(false)
    window.addEventListener('click', handleOutsideClick)
    return () => window.removeEventListener('click', handleOutsideClick)
  }, [viewActionMenuOpen])

  const updateViewSearchParam = (quotationId) => {
    const nextParams = new URLSearchParams(searchParams)
    if (quotationId) {
      nextParams.set('view', quotationId)
    } else {
      nextParams.delete('view')
    }
    setSearchParams(nextParams, { replace: true })
  }

  const openQuotationView = (row, syncUrl = true) => {
    setViewActionMenuOpen(false)
    setViewRow(row)
    setViewRowFromUrl(syncUrl)
    if (syncUrl) {
      updateViewSearchParam(row.id)
    }
  }

  const closeQuotationView = () => {
    setViewActionMenuOpen(false)
    setViewRow(null)
    if (viewRowFromUrl || viewQuotationId) {
      setViewRowFromUrl(false)
      updateViewSearchParam('')
    }
  }

  useEffect(() => {
    if (autoOpen) {
      close()
      setQuotationForm(createInitialQuotationForm())
      setSelectedProfile('')
      setSelectedAccountId('')
      setAccountFilters(INITIAL_ACCOUNT_FILTERS)
      setAccountListPage(1)
      setGeneratorError('')
      setIsAccountListOpen(false)
      setIsGenerateOpen(true)
    }
  }, [autoOpen, close])

  useEffect(() => {
    if (!viewQuotationId) {
      if (viewRowFromUrl) {
        setViewActionMenuOpen(false)
        setViewRow(null)
        setViewRowFromUrl(false)
      }
      return
    }

    const matchedRow = quotationRows.find((row) => (
      String(row.id) === String(viewQuotationId)
      || String(row.raw?.id || '') === String(viewQuotationId)
    ))

    if (!matchedRow) return

    setViewRowFromUrl(true)
    setViewRow((currentValue) => (currentValue?.id === matchedRow.id ? currentValue : matchedRow))
  }, [quotationRows, viewQuotationId, viewRowFromUrl])

  useEffect(() => {
    const draftQuotation = location.state?.quotationDraft
    const openGeneratorFromRoute = location.state?.openGenerator
    const preselectedAccountIdFromRoute = location.state?.preselectedAccountId
    const preselectedCustomerFromRoute = location.state?.preselectedCustomer
    const preselectedDealFromRoute = location.state?.preselectedDeal

    if (draftQuotation) {
      close()
      setIsGenerateOpen(false)
      setIsAccountListOpen(false)
      setSelectedProfile(draftQuotation.profileKey || '')
      setSelectedAccountId(draftQuotation.selectedAccountId || '')
      setAdditionalSections([])
      setQuotationForm(buildQuotationFormFromExisting(draftQuotation, nextQuotationNumber))
      setBuilderError('')
      setBuilderMessage('Cloned quotation opened in edit mode.')
      open()
      navigate(location.pathname, { replace: true, state: {} })
      return
    }

    if (preselectedCustomerFromRoute) {
      const customerAccount = buildQuotationCustomerAccount(preselectedCustomerFromRoute)
      const profileValue = getQuotationProfileForAccount(customerAccount)

      handleCloseQuotationBuilder()
      setSelectedProfile(profileValue)
      setSelectedAccountId(customerAccount.id)
      setIsGenerateOpen(false)
      openQuotationBuilder(profileValue, customerAccount)
      navigate(location.pathname, { replace: true, state: {} })
      return
    }

    if (preselectedDealFromRoute) {
      const dealAccount = buildQuotationDealAccount(preselectedDealFromRoute)
      const profileValue = getQuotationProfileForAccount(dealAccount)

      handleCloseQuotationBuilder()
      setSelectedProfile(profileValue)
      setSelectedAccountId('')
      setIsGenerateOpen(false)
      openQuotationBuilder(profileValue, dealAccount)
      navigate(location.pathname, { replace: true, state: {} })
      return
    }

    if (openGeneratorFromRoute) {
      handleCloseQuotationBuilder()
      resetGeneratorSelection()
      setSelectedAccountId(preselectedAccountIdFromRoute || '')
      setIsGenerateOpen(true)
      navigate(location.pathname, { replace: true, state: {} })
    }
  }, [close, location.pathname, location.state, navigate, nextQuotationNumber, open])

  const paginatedAccounts = useMemo(() => {
    const startIndex = (accountListPage - 1) * ACCOUNT_LIST_PAGE_SIZE
    return filteredAccounts.slice(startIndex, startIndex + ACCOUNT_LIST_PAGE_SIZE)
  }, [accountListPage, filteredAccounts])

  const visibleAccountPages = useMemo(() => {
    const maxVisiblePages = 5
    const startPage = Math.max(1, accountListPage - Math.floor(maxVisiblePages / 2))
    const endPage = Math.min(totalAccountPages, startPage + maxVisiblePages - 1)
    const adjustedStart = Math.max(1, endPage - maxVisiblePages + 1)

    return Array.from(
      { length: endPage - adjustedStart + 1 },
      (_, index) => adjustedStart + index
    )
  }, [accountListPage, totalAccountPages])

  const selectedAccount = useMemo(
    () => normalizedAccounts.find((account) => account.id === selectedAccountId) || null,
    [normalizedAccounts, selectedAccountId]
  )

  const selectedAccountClientDetails = useMemo(
    () => (selectedAccount ? buildClientAddressDetails(selectedAccount) : '-'),
    [selectedAccount]
  )

  const clientAddressLines = useMemo(
    () => splitAddressLines(quotationForm.clientAddressDetails),
    [quotationForm.clientAddressDetails]
  )

  const activeProfile = useMemo(
    () => getProfileByValue(quotationForm.profileKey || selectedProfile),
    [quotationForm.profileKey, selectedProfile]
  )

  const sanitizedLineItems = useMemo(
    () => sanitizeLineItems(quotationForm.lineItems),
    [quotationForm.lineItems]
  )

  const quotationGrandTotal = useMemo(
    () => sanitizedLineItems.reduce((total, lineItem) => total + lineItem.amount, 0),
    [sanitizedLineItems]
  )

  const quotationDetailSummary = useMemo(() => ({
    productTax: 0,
    productTotal: quotationGrandTotal,
    otherProductTotal: 0,
    quotationTotal: quotationGrandTotal,
    serviceTax: 0,
    serviceTotal: 0,
    otherServiceTotal: 0,
  }), [quotationGrandTotal])

  const resetGeneratorSelection = () => {
    setSelectedProfile('swati-switch')
    setSelectedAccountId('')
    setAccountFilters(INITIAL_ACCOUNT_FILTERS)
    setAccountListPage(1)
    setGeneratorError('')
  }

  const handleCloseQuotationBuilder = () => {
    close()
    setBuilderError('')
    setBuilderMessage('')
    setAdditionalSections([])
    setQuotationForm(createInitialQuotationForm())
  }

  const handleOpenGenerator = () => {
    handleCloseQuotationBuilder()
    resetGeneratorSelection()
    setSelectedProfile('swati-switch')
    setIsAccountListOpen(false)
    setIsGenerateOpen(true)
  }

  const handleCloseGenerator = () => {
    setIsGenerateOpen(false)
    setIsAccountListOpen(false)
    setGeneratorError('')
  }

  const buildQuotationDraft = (profileValue, account) => {
    const profile = getProfileByValue(profileValue)
    const quotationDate = getTodayInputValue()

    return {
      ...createInitialQuotationForm(),
      quotationNumber: nextQuotationNumber,
      profileKey: profile?.value || '',
      profileName: profile?.label || '',
      quotationDate,
      validUntil: addDaysToInputValue(quotationDate, 30),
      currency: profile?.currency || 'INR',
      clientAccountNumber: account?.accountNumber || '',
      companyName: account?.name || '',
      contactPerson: account?.contactPerson || '',
      telephone: account?.contactMobile || account?.contactPhone || account?.phone || '',
      email: account?.contactEmail || account?.email || '',
      gstin: account?.gstin || '',
      stateCode: account?.stateCode || '',
      clientAddressDetails: buildClientAddressDetails(account),
      organizationName: profile?.organizationName || '',
      organizationAddress: profile?.organizationAddress || '',
      organizationEmail: profile?.organizationEmail || '',
      organizationPhone: profile?.organizationPhone || '',
      organizationGstin: profile?.organizationGstin || '',
      organizationStateCode: profile?.organizationStateCode || '',
      website: profile?.website || '',
      organizationTagline: profile?.organizationTagline || '',
      projectName: account?.projectName || account?.name || '',
      architectName: account?.architectName || '',
      pmcName: account?.pmcName || '',
      quotationSubject: account?.projectName || account?.name || '',
      quotationNotes: account?.latestRemark || account?.remark || '',
      customerReferenceDate: quotationDate,
      product: account?.productCategory || '',
      selectedAccountId: account?.quotationContext === 'deal' ? '' : account?.id || '',
      selectedAccountOwner: account?.accountOwnerName || account?.accountOwner || '',
    }
  }

  const openQuotationBuilder = (profileValue, account) => {
    setQuotationForm(buildQuotationDraft(profileValue, account))
    setBuilderError('')
    setBuilderMessage('')
    setAdditionalSections([])
    setGeneratorError('')
    setIsAccountListOpen(false)
    setIsGenerateOpen(false)
    open()
  }

  const handleOpenAccountList = () => {
    if (!selectedProfile) {
      setGeneratorError('Please select a profile before searching for an account.')
      return
    }

    setGeneratorError('')
    setAccountFilters(INITIAL_ACCOUNT_FILTERS)
    setAccountListPage(1)
    setIsAccountListOpen(true)
  }

  const handleAccountFilterChange = (key, value) => {
    setAccountFilters((currentFilters) => ({
      ...currentFilters,
      [key]: value,
    }))
    setAccountListPage(1)
  }

  const handleAccountSelect = (account) => {
    const profileValue = selectedProfile || getQuotationProfileForAccount(account, 'swati-switch')
    setSelectedProfile(profileValue)
    setSelectedAccountId(account.id)
    openQuotationBuilder(profileValue, account)
  }

  const handleGenerateNext = () => {
    if (!selectedProfile || !selectedAccount) {
      setGeneratorError('Please select a profile and account to continue.')
      return
    }

    const profileValue = selectedProfile || getQuotationProfileForAccount(selectedAccount, 'swati-switch')
    setSelectedProfile(profileValue)
    openQuotationBuilder(profileValue, selectedAccount)
  }

  const createQuotationRecord = async (quotationData) => {
    const result = await createQuotation(quotationData)

    if (result.success) {
      addNotification('success', 'Success', 'Quotation created successfully')
      return result
    }

    // Duplicate quotations get their own dedicated warning notification at the
    // call-site, so skip the generic error toast here to avoid duplicate UI.
    const isDuplicate = result.code === 'DUPLICATE_QUOTATION' || result.status === 409
    if (!isDuplicate) {
      addNotification('error', 'Error', result.message || 'Unable to create quotation')
    }
    return result
  }

  const handleFileUpload = async (event) => {
    const file = event.target.files?.[0]
    if (!file) return

    setUploading(true)
    setUploadError('')

    const quotationData = {
      quotationNumber: file.name.replace(/\.[^.]+$/, '').toUpperCase(),
      clientName: 'Imported Client',
      companyName: 'Imported Company',
      projectName: file.name,
      amount: 0,
      validUntil: getTodayInputValue(),
      status: 'sent',
      quotationFileName: file.name,
    }

    const result = await createQuotationRecord(quotationData)
    setUploading(false)
    event.target.value = null

    if (!result.success) {
      setUploadError(result.message || 'Upload failed')
    }
  }

  const handleBuilderFieldChange = (field, value) => {
    setBuilderError('')
    setQuotationForm((currentForm) => ({
      ...currentForm,
      [field]: value,
    }))
  }

  const handleLineItemChange = (lineItemId, field, value) => {
    setBuilderError('')
    setQuotationForm((currentForm) => ({
      ...currentForm,
      lineItems: currentForm.lineItems.map((lineItem) => (
        lineItem.id === lineItemId
          ? { ...lineItem, [field]: value }
          : lineItem
      )),
    }))
  }

  const handleClientAddressLineChange = (lineIndex, value) => {
    setBuilderError('')
    const nextLines = [...clientAddressLines]
    nextLines[lineIndex] = value
    setQuotationForm((currentForm) => ({
      ...currentForm,
      clientAddressDetails: joinAddressLines(nextLines),
    }))
  }

  const handleAddSection = () => {
    setAdditionalSections((currentSections) => [
      ...currentSections,
      { id: generateId('QSEC'), title: `Additional Section ${currentSections.length + 1}`, content: '' },
    ])
  }

  const handleAdditionalSectionChange = (sectionId, value) => {
    setAdditionalSections((currentSections) => currentSections.map((section) => (
      section.id === sectionId
        ? { ...section, content: value }
        : section
    )))
  }

  const scrollToBuilderSection = (sectionRef) => {
    sectionRef?.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  const handleAddLineItem = () => {
    setQuotationForm((currentForm) => ({
      ...currentForm,
      lineItems: [...currentForm.lineItems, createEmptyLineItem()],
    }))
  }

  const handleRemoveLineItem = (lineItemId) => {
    setQuotationForm((currentForm) => {
      const remainingLineItems = currentForm.lineItems.filter((lineItem) => lineItem.id !== lineItemId)

      return {
        ...currentForm,
        lineItems: remainingLineItems.length > 0 ? remainingLineItems : [createEmptyLineItem()],
      }
    })
  }

  const handleUploadLineItems = async (event) => {
    const file = event.target.files?.[0]
    if (!file) return

    try {
      const fileContent = await file.text()
      const parsedLineItems = parseUploadedLineItems(fileContent)

      if (parsedLineItems.length === 0) {
        setBuilderError('No valid line items were found in the uploaded file.')
        return
      }

      setQuotationForm((currentForm) => ({
        ...currentForm,
        uploadedLineItemsName: file.name,
        lineItems: parsedLineItems,
      }))
      setBuilderError('')
      setBuilderMessage(`${parsedLineItems.length} line item(s) imported from ${file.name}.`)
    } catch (error) {
      setBuilderError(error.message || 'Unable to read the uploaded line items file.')
    } finally {
      event.target.value = null
    }
  }

  const handleGenerateQuotation = async (event) => {
    event.preventDefault()

    if (!quotationForm.profileKey || !quotationForm.selectedAccountId) {
      setBuilderError('Profile and account selection are required to generate a quotation.')
      return
    }

    if (!quotationForm.companyName.trim()) {
      setBuilderError('Company Name is required.')
      return
    }

    if (!quotationForm.quotationDate || !quotationForm.validUntil) {
      setBuilderError('Quotation Date and Valid Until are required.')
      return
    }

    const persistedLineItems = sanitizeLineItems(quotationForm.lineItems)
    if (persistedLineItems.length === 0) {
      setBuilderError('Add at least one quote item before generating the quotation.')
      return
    }

    const payload = {
      quotationNumber: quotationForm.quotationNumber.trim() || nextQuotationNumber,
      clientName: quotationForm.contactPerson || quotationForm.companyName || quotationForm.clientAccountNumber,
      companyName: quotationForm.companyName.trim(),
      projectName: quotationForm.projectName.trim() || quotationForm.companyName.trim(),
      amount: persistedLineItems.reduce((total, lineItem) => total + lineItem.amount, 0),
      validUntil: quotationForm.validUntil,
      status: quotationForm.status,
      profileKey: quotationForm.profileKey,
      profileName: quotationForm.profileName,
      quotationDate: quotationForm.quotationDate,
      currency: quotationForm.currency,
      clientAccountNumber: quotationForm.clientAccountNumber,
      contactPerson: quotationForm.contactPerson,
      telephone: quotationForm.telephone,
      email: quotationForm.email,
      gstin: quotationForm.gstin,
      stateCode: quotationForm.stateCode,
      clientAddressDetails: quotationForm.clientAddressDetails,
      organizationName: quotationForm.organizationName,
      organizationAddress: quotationForm.organizationAddress,
      organizationEmail: quotationForm.organizationEmail,
      organizationPhone: quotationForm.organizationPhone,
      organizationGstin: quotationForm.organizationGstin,
      organizationStateCode: quotationForm.organizationStateCode,
      website: quotationForm.website,
      organizationTagline: quotationForm.organizationTagline,
      selectedAccountId: quotationForm.selectedAccountId,
      selectedAccountOwner: quotationForm.selectedAccountOwner,
      architectName: quotationForm.architectName,
      pmcName: quotationForm.pmcName,
      quotationSubject: quotationForm.quotationSubject,
      quotationNotes: quotationForm.quotationNotes,
      totalAmount: persistedLineItems.reduce((total, lineItem) => total + lineItem.amount, 0),
      taxAmount: 0,
      discountAmount: 0,
      deliveryTerms: quotationForm.deliveryTerms,
      paymentTerms: quotationForm.paymentTerms,
      warrantyTerms: quotationForm.warrantyTerms,
      customerReference: {
        number: quotationForm.customerReferenceNumber,
        date: quotationForm.customerReferenceDate,
        subject: quotationForm.customerReferenceSubject,
      },
      product: quotationForm.product,
      otherProduct: quotationForm.otherProduct,
      otherService: quotationForm.otherService,
      uploadedLineItemsName: quotationForm.uploadedLineItemsName,
      lineItems: persistedLineItems,
    }

    // Frontend pre-check: scan loaded quotations for an exact match so the
    // user gets immediate feedback without an extra round-trip.
    const duplicateCandidate = userQuotations.find((existing) => (
      isQuotationDuplicate(existing, payload, persistedLineItems)
    ))
    if (duplicateCandidate) {
      const existingNumber = duplicateCandidate.quotationNumber || duplicateCandidate.quoteNumber || 'unknown'
      const customerLabel = duplicateCandidate.companyName || duplicateCandidate.customerName || duplicateCandidate.clientName || '-'
      const projectLabel = duplicateCandidate.projectName || duplicateCandidate.title || '-'
      const duplicateMessage = `Duplicate quotation found: Quotation No. ${existingNumber} already exists for ${customerLabel} / ${projectLabel}. Please change the title, project, or quotation details before generating again.`
      setBuilderError(duplicateMessage)
      addNotification('warning', 'Duplicate quotation', duplicateMessage)
      return
    }

    if (savingQuotation) return // prevent double-click double submit

    setSavingQuotation(true)
    const result = await createQuotationRecord(payload)
    setSavingQuotation(false)

    if (!result.success) {
      const isDuplicate = result.code === 'DUPLICATE_QUOTATION' || result.status === 409
      const message = result.message || 'Unable to generate quotation.'
      setBuilderError(message)
      if (isDuplicate) {
        addNotification('warning', 'Duplicate quotation', message)
      }
      return
    }

    const generatedQuotation = result.data || payload
    const generatedRow = buildQuotationRow(generatedQuotation, 0)
    setActiveTab(generatedRow.quotationScope || 'account')
    setQuotationFilters(INITIAL_QUOTATION_FILTERS)
    setQuotationSort({ key: 'date', direction: 'desc' })
    setQuotationPage(1)
    setViewRow(generatedRow)
    handleCloseQuotationBuilder()
    resetGeneratorSelection()
  }

  const handleQuotationFilterChange = (key, value) => {
    setQuotationFilters((currentValue) => ({
      ...currentValue,
      [key]: value,
    }))
    setQuotationPage(1)
  }

  const handleQuotationSort = (key) => {
    setQuotationSort((currentValue) => ({
      key,
      direction: currentValue.key === key && currentValue.direction === 'asc' ? 'desc' : 'asc',
    }))
  }

  const handleOpenFieldPanel = () => {
    setFieldPanelDraft({
      showLatestQuotations: quotationLayout.showLatestQuotations,
      addOrderBy: quotationLayout.addOrderBy,
      selectedFields: [...quotationLayout.selectedFields],
    })
    setIsFieldPanelOpen(true)
  }

  const handleApplyFieldPanel = (shouldPersist) => {
    if (fieldPanelDraft.selectedFields.length === 0) {
      addNotification('error', 'Field selection required', 'Select at least one quotation field.')
      return
    }

    setQuotationLayout(fieldPanelDraft)
    if (shouldPersist) {
      window.localStorage.setItem(QUOTATION_LAYOUT_STORAGE_KEY, JSON.stringify(fieldPanelDraft))
    }
    setIsFieldPanelOpen(false)
  }

  const handleAddSelectedField = (fieldKey) => {
    setFieldPanelDraft((currentValue) => (
      currentValue.selectedFields.includes(fieldKey)
        ? currentValue
        : {
          ...currentValue,
          selectedFields: [...currentValue.selectedFields, fieldKey],
        }
    ))
  }

  const handleRemoveSelectedField = (fieldKey) => {
    setFieldPanelDraft((currentValue) => {
      if (currentValue.selectedFields.length <= 1) {
        return currentValue
      }

      return {
        ...currentValue,
        selectedFields: currentValue.selectedFields.filter((entry) => entry !== fieldKey),
      }
    })
  }

  const handleSelectedFieldDrop = (targetFieldKey) => {
    if (!draggedFieldKey || draggedFieldKey === targetFieldKey) return

    setFieldPanelDraft((currentValue) => {
      const currentIndex = currentValue.selectedFields.indexOf(draggedFieldKey)
      const targetIndex = currentValue.selectedFields.indexOf(targetFieldKey)
      if (currentIndex < 0 || targetIndex < 0) return currentValue

      const nextFields = [...currentValue.selectedFields]
      nextFields.splice(currentIndex, 1)
      nextFields.splice(targetIndex, 0, draggedFieldKey)

      return {
        ...currentValue,
        selectedFields: nextFields,
      }
    })
    setDraggedFieldKey('')
  }

  const handleExportRows = (format) => {
    const exportFields = selectedFieldDefinitions.length > 0
      ? selectedFieldDefinitions
      : DEFAULT_SELECTED_QUOTATION_FIELDS
        .map((fieldKey) => QUOTATION_FIELD_DEFINITIONS.find((field) => field.key === fieldKey))
        .filter(Boolean)

    const exportRows = filteredQuotationRows.map((row) => (
      exportFields.reduce((currentValue, field) => ({
        ...currentValue,
        [field.label]: field.exportValue(row),
      }), {})
    ))

    const fileBase = `Quotation_Report_${activeTab}_${new Date().toISOString().slice(0, 10)}`

    const reportColumns = exportFields.map((field) => {
      const fieldKey = String(field.key || '').toLowerCase()
      const isAmount = fieldKey.includes('amount') || fieldKey.includes('total') || fieldKey.includes('tax') || fieldKey.includes('discount')
      const isDate = fieldKey.endsWith('date') || fieldKey === 'date' || fieldKey === 'validuntil'
      return {
        key: field.key,
        label: field.label,
        type: isAmount ? 'currency' : isDate ? 'date' : undefined,
        align: isAmount ? 'right' : isDate ? 'center' : undefined,
      }
    })
    const reportRows = filteredQuotationRows.map((row) => (
      exportFields.reduce((currentValue, field) => ({
        ...currentValue,
        [field.key]: field.exportValue(row),
      }), {})
    ))
    const reportMetadata = [
      { label: 'View', value: activeTab.toUpperCase() },
      { label: 'Total Records', value: String(filteredQuotationRows.length) },
      { label: 'Generated On', value: new Date().toLocaleString('en-IN') },
    ]

    if (format === 'csv') {
      exportCsvWorkbook({
        filename: `${fileBase}.csv`,
        title: 'Quotation Report',
        subtitle: `${activeTab.toUpperCase()} quotations`,
        sheetName: 'Quotations',
        metadata: reportMetadata,
        columns: reportColumns,
        rows: reportRows,
      })
      addNotification('success', 'CSV exported', 'Quotation report exported to CSV.')
      return
    }

    if (format === 'excel') {
      exportExcelWorkbook({
        filename: `${fileBase}.xlsx`,
        title: 'Quotation Report',
        subtitle: `${activeTab.toUpperCase()} quotations`,
        sheetName: 'Quotations',
        metadata: reportMetadata,
        columns: reportColumns,
        rows: reportRows,
      })
      addNotification('success', 'Excel exported', 'Quotation report exported to Excel.')
    }

  }

  const handleApproveQuotation = async () => {
    if (!approveRow) return

    setActionLoadingId(approveRow.id)
    const result = await updateQuotation(approveRow.id, {
      status: 'approved',
      rejectionReason: '',
      approvedAt: new Date().toISOString(),
    })
    setActionLoadingId('')

    if (!result.success) {
      addNotification('error', 'Approval failed', result.message || 'Unable to approve this quotation.')
      return
    }

    setApproveRow(null)
    addNotification('success', 'Quotation approved', 'The quotation status has been updated to Approved.')
  }

  const handleRejectQuotation = async () => {
    const trimmedReason = rejectReason.trim()
    if (!trimmedReason) {
      setRejectError('Rejection reason is required.')
      return
    }

    if (!rejectRow) return

    setRejectError('')
    setActionLoadingId(rejectRow.id)
    const result = await updateQuotation(rejectRow.id, {
      status: 'rejected',
      rejectionReason: trimmedReason,
      rejectedAt: new Date().toISOString(),
    })
    setActionLoadingId('')

    if (!result.success) {
      addNotification('error', 'Reject failed', result.message || 'Unable to reject this quotation.')
      return
    }

    setRejectRow(null)
    setRejectReason('')
    addNotification('success', 'Quotation rejected', 'The quotation has been rejected and the reason was saved.')
  }

  const handleQuotationAction = (actionKey, row) => {
    if (actionKey === 'pdf') {
      setPdfRow(row)
      return
    }

    if (actionKey === 'preview') {
      setPreviewRow(row)
      return
    }

    if (actionKey === 'view') {
      openQuotationView(row)
      return
    }

    if (actionKey === 'approve') {
      setApproveRow(row)
      return
    }

    if (actionKey === 'reject') {
      setRejectRow(row)
      setRejectReason(row.raw.rejectionReason || '')
      setRejectError('')
      return
    }

    if (actionKey === 'clone') {
      navigate(location.pathname, { state: { quotationDraft: row.raw } })
      return
    }

    if (actionKey === 'account') {
      setAccountRow(row)
    }
  }

  const handleDownloadPdfPage = () => {
    if (!pdfDocument) return
    triggerBrowserPdfSave(pdfDocument)
  }

  const printQuotationDocument = (documentData) => {
    if (!documentData) return
    triggerBrowserPdfSave(documentData)
  }

  const handleViewModalAction = (actionKey) => {
    if (!viewRow) return

    setViewActionMenuOpen(false)
    if (actionKey === 'view') return

    const currentRow = viewRow
    closeQuotationView()
    handleQuotationAction(actionKey, currentRow)
  }

  const previewDocument = previewRow ? buildQuotationDocumentData(previewRow.raw, previewRow.linkedAccount) : null
  const viewDocument = viewRow ? buildQuotationDocumentData(viewRow.raw, viewRow.linkedAccount) : null
  const pdfDocument = pdfRow ? buildQuotationDocumentData(pdfRow.raw, pdfRow.linkedAccount) : null
  const accountDetails = accountRow?.linkedAccount || null
  const relatedQuotations = accountRow
    ? quotationRows.filter((row) => (
      String(row.raw.selectedAccountId || '') === String(accountDetails?.id || '')
      || safeLower(row.raw.clientAccountNumber) === safeLower(accountDetails?.accountNumber)
      || safeLower(row.company) === safeLower(accountDetails?.name)
    ))
    : []

  return (
    <div className="quotations-page">
      {pdfDocument ? (
        <QuotationPdfViewer
          documentData={pdfDocument}
          title={`QUOTATION - ${pdfDocument.quotationNumber}`}
          subtitle={pdfDocument.companyName}
          onBack={() => setPdfRow(null)}
          onPrint={handleDownloadPdfPage}
          onDownload={handleDownloadPdfPage}
        />
      ) : null}

      {!pdfDocument ? (
      <div className="aqp-page">
        <div className="aqp-titlebar">
          <h1 className="aqp-title">Quotations</h1>
        </div>

        <div className="aqp-tab-bar">
          <div className="aqp-tabs">
            <button
              type="button"
              className={`aqp-tab${activeTab === 'account' ? ' aqp-tab--active' : ''}`}
              onClick={() => {
                setActiveTab('account')
                setQuotationPage(1)
              }}
            >
              ACCOUNT
            </button>
            <button
              type="button"
              className={`aqp-tab${activeTab === 'deal' ? ' aqp-tab--active' : ''}`}
              onClick={() => {
                setActiveTab('deal')
                setQuotationPage(1)
              }}
            >
              DEAL
            </button>
          </div>


          <div className="aqp-tab-actions">
            <button type="button" className="aqp-btn aqp-btn--gray" onClick={() => fileInputRef.current?.click()}>
              <FaUpload className="aqp-btn-icon" />
              Upload Quotation
            </button>
            <button type="button" className="aqp-btn aqp-btn--blue" onClick={handleOpenGenerator}>
              <FaPlus className="aqp-btn-icon" />
              Generate Quotation
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept=".pdf,.doc,.docx"
              style={{ display: 'none' }}
              onChange={handleFileUpload}
            />
          </div>
        </div>

        <div className="aqp-content-wrapper">
          <div className="aqp-main-content">
            {uploadError ? <div className="quotation-upload-error">{uploadError}</div> : null}

            <div className="quotation-report-controls">
              <div className="quotation-report-controls-left">



                <div className="quotation-report-export">
                  <ExcelExportMenuButton
                    label="Export"
                    title="Export quotation report"
                    className="quotation-report-export"
                    buttonClassName="quotation-report-icon-btn quotation-report-icon-btn--green quotation-report-icon-btn--export"
                    menuClassName="quotation-report-export-menu"
                    items={[
                      {
                        key: 'quotation-report-excel',
                        label: 'Export to Excel',
                        badge: 'XLSX',
                        onClick: () => handleExportRows('excel'),
                      },
                    ]}
                  />
                </div>
              </div>
            </div>

            <div className="aqp-table-wrap">
              <table className="aqp-table">
                <thead>
                  <tr className="aqp-thead-row">
                    {selectedFieldDefinitions.map((field) => (
                      <th key={field.key} className={`aqp-th aqp-field--${field.key}`} onClick={() => handleQuotationSort(field.key)}>
                        {field.label} <FaSort className="aqp-sort-icon" />
                      </th>
                    ))}
                  </tr>
                  {showFilterRow ? (
                  <tr className="aqp-search-row">
                    {selectedFieldDefinitions.map((field) => (
                      <th key={field.key} className={`aqp-search-th aqp-field--${field.key}`}>
                        <input
                          className="aqp-search-input"
                          value={quotationFilters[field.key] || ''}
                          onChange={(event) => handleQuotationFilterChange(field.key, event.target.value)}
                          placeholder="Search here ..."
                        />
                      </th>
                    ))}
                  </tr>
                  ) : null}
                </thead>
                <tbody>
                  {quotationsLoading && paginatedQuotationRows.length === 0 ? (
                    <tr className="aqp-row">
                      <td className="aqp-td" colSpan={Math.max(1, selectedFieldDefinitions.length)}>Loading quotations...</td>
                    </tr>
                  ) : quotationsError && paginatedQuotationRows.length === 0 ? (
                    <tr className="aqp-row">
                      <td className="aqp-td" colSpan={Math.max(1, selectedFieldDefinitions.length)}>{quotationsError}</td>
                    </tr>
                  ) : paginatedQuotationRows.length === 0 ? (
                    <tr className="aqp-row">
                      <td className="aqp-td" colSpan={Math.max(1, selectedFieldDefinitions.length)}>No quotations found.</td>
                    </tr>
                  ) : paginatedQuotationRows.map((row) => (
                    <tr
                      key={row.id}
                      className="aqp-row"
                      onClick={() => openQuotationView(row)}
                      title={`Click to view ${row.num}`}
                    >
                      {selectedFieldDefinitions.map((field) => {
                        if (field.key === 'num') {
                          return (
                            <td key={field.key} className={`aqp-td aqp-td--num aqp-field--${field.key}`}>
                              <button
                                type="button"
                                className={`aqp-num-badge aqp-num-badge--button ${getActionBadgeClassName(row.status)}`}
                                onClick={(event) => {
                                  event.stopPropagation()
                                  openQuotationView(row)
                                }}
                              >
                                {row.num}
                              </button>
                            </td>
                          )
                        }

                        if (field.key === 'status') {
                          return (
                            <td key={field.key} className={`aqp-td aqp-field--${field.key}`}>
                              <StatusBadge status={row.status} />
                            </td>
                          )
                        }

                        const fieldValue = field.exportValue(row)
                        const cellClassName = field.key === 'company'
                          ? `aqp-td aqp-td--link aqp-field--${field.key}`
                          : field.key.includes('amount') || field.key.includes('total') || field.key.includes('tax')
                            ? `aqp-td aqp-td--amount aqp-field--${field.key}`
                            : `aqp-td aqp-field--${field.key}`

                        return (
                          <td key={field.key} className={cellClassName}>
                            {fieldValue}
                          </td>
                        )
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="aqp-pagination">
              <span className="aqp-page-icon">{filteredQuotationRows.length}</span>
              <span className="aqp-total-label">Total records: {filteredQuotationRows.length}</span>
              <div className="aqp-page-btns">
                <button type="button" className="aqp-page-btn" onClick={() => setQuotationPage((currentValue) => Math.max(1, currentValue - 1))} disabled={quotationPage === 1}>
                  <FaChevronLeft />
                </button>
                {visibleQuotationPages.map((pageNumber) => (
                  <button
                    key={pageNumber}
                    type="button"
                    className={`aqp-page-btn${quotationPage === pageNumber ? ' aqp-page-btn--active' : ''}`}
                    onClick={() => setQuotationPage(pageNumber)}
                  >
                    {pageNumber}
                  </button>
                ))}
                <button type="button" className="aqp-page-btn" onClick={() => setQuotationPage((currentValue) => Math.min(quotationTotalPages, currentValue + 1))} disabled={quotationPage === quotationTotalPages}>
                  <FaChevronRight />
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
      ) : null}

      {previewDocument ? (
        <ModalShell
          title={`Quotation Preview - ${previewDocument.quotationNumber}`}
          onClose={() => setPreviewRow(null)}
          size="aqp-modal--xl"
          footer={(
            <>
              <button type="button" className="aqp-btn aqp-btn--gray" onClick={() => setPreviewRow(null)}>
                Close
              </button>
              <button type="button" className="aqp-btn aqp-btn--gray" onClick={() => printQuotationDocument(previewDocument)}>
                <FaPrint className="aqp-btn-icon" />
                Print
              </button>
              {getVisibleQuotationActions().some((action) => action.key === 'pdf') ? (
                <button type="button" className="aqp-btn aqp-btn--blue" onClick={() => {
                  setPreviewRow(null)
                  setPdfRow(previewRow)
                }}>
                  View As PDF
                </button>
              ) : null}
            </>
          )}
        >
          <QuotationDocument documentData={previewDocument} />
        </ModalShell>
      ) : null}

      {viewDocument ? (
        <ModalShell
          title={`View Quote - ${viewDocument.companyName || 'Company'}`}
          onClose={closeQuotationView}
          size="aqp-modal--xl"
        >
          <div className="aqp-view-top-actions">
            <div className="aqp-modal-footer-group">
              <button type="button" className="aqp-btn aqp-btn--gray" onClick={closeQuotationView}>
                Close
              </button>
              <button
                type="button"
                className="aqp-btn aqp-btn--outline"
                onClick={() => handleViewModalAction('preview')}
              >
                Preview
              </button>
              <button
                type="button"
                className="aqp-btn aqp-btn--orange"
                onClick={() => handleViewModalAction('pdf')}
              >
                View As PDF
              </button>
              <button
                type="button"
                className="aqp-btn aqp-btn--blue"
                onClick={() => printQuotationDocument(viewDocument)}
              >
                <FaPrint className="aqp-btn-icon" />
                Print
              </button>
            </div>
          </div>
          <div className="aqp-view-summary">
            <div className="aqp-view-summary__header">
              <div className="aqp-view-summary__header-crm">
                <div className="aqp-view-summary__crm-badge">
                  <span className="aqp-view-summary__crm-text">CRM</span>
                </div>
              </div>
              <div className="aqp-view-summary__header-info">
                <div className="aqp-view-summary__quotation-actions">
                  <div className="aqp-num-cell aqp-num-cell--inline">
                    <span className={`aqp-num-badge ${getActionBadgeClassName(viewRow?.status || viewDocument.statusLabel)}`}>
                      {viewDocument.quotationNumber || '-'}
                    </span>
                    <button
                      type="button"
                      className={`aqp-dropdown-btn${viewActionMenuOpen ? ' aqp-dropdown-btn--active' : ''}`}
                      aria-label={`Open actions for ${viewDocument.quotationNumber || 'quotation'}`}
                      onClick={(event) => {
                        event.stopPropagation()
                        setViewActionMenuOpen((currentValue) => !currentValue)
                      }}
                      aria-expanded={viewActionMenuOpen}
                      aria-haspopup="menu"
                    >
                      <FaChevronDown />
                    </button>
                    {viewActionMenuOpen ? (
                      <div className="aqp-action-menu aqp-action-menu--inline" onClick={(event) => event.stopPropagation()}>
                        {getVisibleQuotationActions().map((action) => {
                          const Icon = action.icon
                          return (
                            <button
                              key={action.key}
                              type="button"
                              className="aqp-action-item"
                              onClick={() => handleViewModalAction(action.key)}
                              disabled={actionLoadingId === viewRow?.id}
                            >
                              <Icon className={`aqp-action-icon${action.iconClass ? ` ${action.iconClass}` : ''}`} />
                              {action.label}
                            </button>
                          )
                        })}
                      </div>
                    ) : null}
                  </div>
                </div>
                <div className="aqp-view-summary__quotation-company">{viewDocument.companyName || '-'}</div>
              </div>
              <div className="aqp-view-summary__header-status">
                <StatusBadge status={viewDocument.statusLabel} />
              </div>
            </div>
            <div className="aqp-view-summary__grid">
              <div><strong>Date:</strong> {viewDocument.quotationDate || '-'}</div>
              <div><strong>Valid Until:</strong> {viewDocument.validUntil || '-'}</div>
              <div><strong>Profile:</strong> {viewDocument.profileName || '-'}</div>
              <div><strong>Currency:</strong> {viewDocument.currency}</div>
              <div><strong>Total:</strong> {formatCurrency(viewDocument.total, viewDocument.currency)}</div>
              <div><strong>Inquiry Ref:</strong> {viewDocument.customerReferenceNumber || '-'}</div>
            </div>
            {viewDocument.rejectionReason ? (
              <div className="aqp-view-summary__alert">
                <strong>Rejection Reason:</strong> {viewDocument.rejectionReason}
              </div>
            ) : null}
          </div>
          <QuotationDocument documentData={viewDocument} />
        </ModalShell>
      ) : null}

      {accountRow ? (
        <ModalShell
          title={`View Account - ${accountRow.company}`}
          onClose={() => setAccountRow(null)}
          size="aqp-modal--lg"
          footer={(
            <button type="button" className="aqp-btn aqp-btn--gray" onClick={() => setAccountRow(null)}>
              Close
            </button>
          )}
        >
          <div className="aqp-account">
            <div className="aqp-account__grid">
              <div><strong>Account No.:</strong> {accountDetails?.accountNumber || accountRow.raw.clientAccountNumber || '-'}</div>
              <div><strong>Account Name:</strong> {accountDetails?.name || accountRow.company || '-'}</div>
              <div><strong>Email:</strong> {accountDetails?.email || accountRow.raw.email || '-'}</div>
              <div><strong>Phone:</strong> {accountDetails?.phone || accountRow.raw.telephone || '-'}</div>
              <div><strong>Account Owner:</strong> {accountDetails?.accountOwnerDisplay || accountDetails?.accountOwner || accountRow.raw.selectedAccountOwner || '-'}</div>
              <div><strong>GSTIN:</strong> {accountDetails?.gstin || accountRow.raw.gstin || '-'}</div>
              <div><strong>State Code:</strong> {accountDetails?.stateCode || accountRow.raw.stateCode || '-'}</div>
              <div><strong>Contact Person:</strong> {accountDetails?.contactPerson || accountRow.raw.contactPerson || '-'}</div>
            </div>
            <div className="aqp-account__section">
              <h3>Address</h3>
              <p>{accountDetails?.address || accountRow.raw.clientAddressDetails || '-'}</p>
            </div>
            <div className="aqp-account__section">
              <h3>Related Quotations</h3>
              {relatedQuotations.length === 0 ? (
                <p>No related quotations found.</p>
              ) : (
                <table className="aqp-account__table">
                  <thead>
                    <tr>
                      <th>Quotation No.</th>
                      <th>Date</th>
                      <th>Status</th>
                      <th>Amount</th>
                    </tr>
                  </thead>
                  <tbody>
                    {relatedQuotations.map((row) => (
                      <tr key={row.id}>
                        <td>{row.num}</td>
                        <td>{row.date}</td>
                        <td>{row.statusLabel}</td>
                        <td>{row.amountLabel}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </ModalShell>
      ) : null}

      {approveRow ? (
        <ModalShell
          title="Approve Quote"
          onClose={() => setApproveRow(null)}
          footer={(
            <>
              <button type="button" className="aqp-btn aqp-btn--gray" onClick={() => setApproveRow(null)} disabled={actionLoadingId === approveRow.id}>
                Cancel
              </button>
              <button type="button" className="aqp-btn aqp-btn--blue" onClick={handleApproveQuotation} disabled={actionLoadingId === approveRow.id}>
                {actionLoadingId === approveRow.id ? 'Approving...' : 'Approve'}
              </button>
            </>
          )}
        >
          <p>Are you sure you want to approve this quote?</p>
        </ModalShell>
      ) : null}

      {rejectRow ? (
        <ModalShell
          title="Reject Quote"
          onClose={() => {
            setRejectRow(null)
            setRejectError('')
            setRejectReason('')
          }}
          footer={(
            <>
              <button
                type="button"
                className="aqp-btn aqp-btn--gray"
                onClick={() => {
                  setRejectRow(null)
                  setRejectError('')
                  setRejectReason('')
                }}
                disabled={actionLoadingId === rejectRow.id}
              >
                Cancel
              </button>
              <button type="button" className="aqp-btn aqp-btn--blue" onClick={handleRejectQuotation} disabled={actionLoadingId === rejectRow.id}>
                {actionLoadingId === rejectRow.id ? 'Rejecting...' : 'Reject Quote'}
              </button>
            </>
          )}
        >
          <label className="aqp-form-field">
            <span className="aqp-form-label">Rejection Reason</span>
            <textarea
              className={`aqp-textarea${rejectError ? ' aqp-textarea--error' : ''}`}
              rows={5}
              value={rejectReason}
              onChange={(event) => {
                setRejectReason(event.target.value)
                if (rejectError) setRejectError('')
              }}
              placeholder="Enter rejection reason"
            />
          </label>
          {rejectError ? <div className="aqp-form-error">{rejectError}</div> : null}
        </ModalShell>
      ) : null}

      {isFieldPanelOpen ? (
        <div className="quotation-field-panel-overlay" onClick={() => setIsFieldPanelOpen(false)}>
          <section className="quotation-field-panel" onClick={(event) => event.stopPropagation()}>
            <header className="quotation-field-panel-header">
              <h2>Select Quotation Report Fields</h2>
              <div className="quotation-field-panel-actions">
                <button type="button" className="quotation-field-panel-btn quotation-field-panel-btn--ghost" onClick={() => setIsFieldPanelOpen(false)}>
                  Close
                </button>
                <button type="button" className="quotation-field-panel-btn quotation-field-panel-btn--blue" onClick={() => handleApplyFieldPanel(false)}>
                  Apply
                </button>
                <button type="button" className="quotation-field-panel-btn quotation-field-panel-btn--green" onClick={() => handleApplyFieldPanel(true)}>
                  Save &amp; Apply
                </button>
              </div>
            </header>

            <div className="quotation-field-panel-settings">
              <div className="quotation-field-panel-setting">
                <span>Show Latest Quotations</span>
                <div className="quotation-field-toggle-group">
                  {['YES', 'NO'].map((value) => (
                    <button
                      key={value}
                      type="button"
                      className={`quotation-field-toggle${fieldPanelDraft.showLatestQuotations === value ? ' quotation-field-toggle--active' : ''}`}
                      onClick={() => setFieldPanelDraft((currentValue) => ({ ...currentValue, showLatestQuotations: value }))}
                    >
                      {value}
                    </button>
                  ))}
                </div>
              </div>

              <div className="quotation-field-panel-setting">
                <span>Add Order By</span>
                <div className="quotation-field-toggle-group">
                  {['YES', 'NO'].map((value) => (
                    <button
                      key={value}
                      type="button"
                      className={`quotation-field-toggle${fieldPanelDraft.addOrderBy === value ? ' quotation-field-toggle--active' : ''}`}
                      onClick={() => setFieldPanelDraft((currentValue) => ({ ...currentValue, addOrderBy: value }))}
                    >
                      {value}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="quotation-field-panel-grid">
              <section className="quotation-field-box">
                <div className="quotation-field-box-header">Quotation Fields</div>
                <div className="quotation-field-box-list">
                  {availableFieldDefinitions.map((field) => (
                    <button
                      key={field.key}
                      type="button"
                      className="quotation-field-option"
                      onClick={() => handleAddSelectedField(field.key)}
                    >
                      <span>{field.label}</span>
                      <strong>+</strong>
                    </button>
                  ))}
                </div>
              </section>

              <section className="quotation-field-box">
                <div className="quotation-field-box-header">Selected Fields</div>
                <div className="quotation-field-box-list">
                  {fieldPanelDraft.selectedFields.map((fieldKey) => {
                    const field = QUOTATION_FIELD_DEFINITIONS.find((entry) => entry.key === fieldKey)
                    if (!field) return null

                    return (
                      <div
                        key={field.key}
                        className="quotation-field-selected"
                        draggable
                        onDragStart={() => setDraggedFieldKey(field.key)}
                        onDragOver={(event) => event.preventDefault()}
                        onDrop={() => handleSelectedFieldDrop(field.key)}
                      >
                        <span>{field.label}</span>
                        <button type="button" className="quotation-field-remove" onClick={() => handleRemoveSelectedField(field.key)}>
                          <FaTimes />
                        </button>
                      </div>
                    )
                  })}
                </div>
              </section>
            </div>
          </section>
        </div>
      ) : null}

      <Modal
        isOpen={isGenerateOpen}
        onClose={handleCloseGenerator}
        title="Generate Quotation"
        size="large"
        footer={(
          <>
            <Button type="button" variant="outline" onClick={handleCloseGenerator}>
              Close
            </Button>
            <Button type="button" variant="primary" onClick={handleGenerateNext}>
              Next
            </Button>
          </>
        )}
      >
        <div className="quotation-generator-form">
          <div className="quotation-generator-section-title">Quotation</div>
          <Select
            label="Select Profile"
            value={selectedProfile}
            onChange={(event) => setSelectedProfile(event.target.value)}
            options={PROFILE_OPTIONS}
            placeholder="Choose profile"
            fullWidth
          />

          <div className="quotation-account-picker">
            <label className="quotation-account-picker-label">Select Account</label>
            <div className="quotation-account-picker-row">
              <input
                className="quotation-account-picker-input"
                value={selectedAccount ? `${selectedAccount.accountNumber} - ${selectedAccount.name}` : ''}
                placeholder="Click the search icon to select an account"
                readOnly
              />
              <button
                type="button"
                className="quotation-account-picker-button"
                onClick={handleOpenAccountList}
                aria-label="Search accounts"
              >
                <FaSearch />
              </button>
            </div>
          </div>

          {selectedAccount ? (
            <div className="quotation-selected-account-card">
              <div className="quotation-selected-account-note">
                Double-click another account from the list if you want to change this selection.
              </div>
              <div className="quotation-selected-account-grid">
                <div className="quotation-selected-account-item">
                  <span className="quotation-selected-account-item-label">Account No.</span>
                  <span className="quotation-selected-account-item-value">{selectedAccount.accountNumber || '-'}</span>
                </div>
                <div className="quotation-selected-account-item">
                  <span className="quotation-selected-account-item-label">Company Name</span>
                  <span className="quotation-selected-account-item-value">{selectedAccount.name || '-'}</span>
                </div>
                <div className="quotation-selected-account-item">
                  <span className="quotation-selected-account-item-label">Contact Person</span>
                  <span className="quotation-selected-account-item-value">{selectedAccount.contactPerson || '-'}</span>
                </div>
                <div className="quotation-selected-account-item">
                  <span className="quotation-selected-account-item-label">Phone</span>
                  <span className="quotation-selected-account-item-value">{selectedAccount.phone || '-'}</span>
                </div>
                <div className="quotation-selected-account-item">
                  <span className="quotation-selected-account-item-label">Email</span>
                  <span className="quotation-selected-account-item-value">{selectedAccount.email || '-'}</span>
                </div>
                <div className="quotation-selected-account-item">
                  <span className="quotation-selected-account-item-label">GSTIN</span>
                  <span className="quotation-selected-account-item-value">{selectedAccount.gstin || '-'}</span>
                </div>
                <div className="quotation-selected-account-item">
                  <span className="quotation-selected-account-item-label">State Code</span>
                  <span className="quotation-selected-account-item-value">{selectedAccount.stateCode || '-'}</span>
                </div>
                <div className="quotation-selected-account-item quotation-selected-account-item--wide">
                  <span className="quotation-selected-account-item-label">Client Details</span>
                  <span className="quotation-selected-account-item-value">{selectedAccountClientDetails}</span>
                </div>
              </div>
            </div>
          ) : null}

          {generatorError ? <div className="quotation-generator-error">{generatorError}</div> : null}
        </div>
      </Modal>

      <Modal
        isOpen={isAccountListOpen}
        onClose={() => setIsAccountListOpen(false)}
        title="Account List"
        size="xlarge"
      >
        <div className="quotation-account-list">
          <div className="quotation-account-list-note">
            Please double click on the account to select a account.
          </div>

          <div className="quotation-account-list-table-wrap">
            <table className="quotation-account-list-table">
              <thead>
                <tr className="quotation-account-list-header-row">
                  <th>Account No.</th>
                  <th>Account Name</th>
                  <th>Email</th>
                  <th>Phone</th>
                  <th>Account Owner</th>
                </tr>
                <tr className="quotation-account-list-search-row">
                  <th>
                    <input
                      className="quotation-account-list-search-input"
                      value={accountFilters.accountNumber}
                      onChange={(event) => handleAccountFilterChange('accountNumber', event.target.value)}
                      placeholder="Search here ..."
                    />
                  </th>
                  <th>
                    <input
                      className="quotation-account-list-search-input"
                      value={accountFilters.name}
                      onChange={(event) => handleAccountFilterChange('name', event.target.value)}
                      placeholder="Search here ..."
                    />
                  </th>
                  <th>
                    <input
                      className="quotation-account-list-search-input"
                      value={accountFilters.email}
                      onChange={(event) => handleAccountFilterChange('email', event.target.value)}
                      placeholder="Search here ..."
                    />
                  </th>
                  <th>
                    <input
                      className="quotation-account-list-search-input"
                      value={accountFilters.phone}
                      onChange={(event) => handleAccountFilterChange('phone', event.target.value)}
                      placeholder="Search here ..."
                    />
                  </th>
                  <th>
                    <input
                      className="quotation-account-list-search-input"
                      value={accountFilters.accountOwner}
                      onChange={(event) => handleAccountFilterChange('accountOwner', event.target.value)}
                      placeholder="Search here ..."
                    />
                  </th>
                </tr>
              </thead>
              <tbody>
                {paginatedAccounts.length > 0 ? (
                  paginatedAccounts.map((account) => (
                    <tr
                      key={account.id}
                      className={`quotation-account-list-row${selectedAccountId === account.id ? ' quotation-account-list-row--selected' : ''}`}
                      onDoubleClick={() => handleAccountSelect(account)}
                    >
                      <td>{account.accountNumber || '-'}</td>
                      <td>{account.name || '-'}</td>
                      <td>{account.email || '-'}</td>
                      <td>{account.phone || '-'}</td>
                      <td>{account.accountOwnerDisplay || account.accountOwner || '-'}</td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan="5" className="quotation-account-list-empty">
                      No accounts found.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          <div className="quotation-account-list-pagination">
            <span className="quotation-account-list-total">Total records: {filteredAccounts.length}</span>
            <div className="quotation-account-list-pagination-actions">
              <button
                type="button"
                className="quotation-account-list-page-button"
                onClick={() => setAccountListPage((page) => Math.max(1, page - 1))}
                disabled={accountListPage === 1}
              >
                prev
              </button>
              {visibleAccountPages.map((page) => (
                <button
                  key={page}
                  type="button"
                  className={`quotation-account-list-page-button${page === accountListPage ? ' quotation-account-list-page-button--active' : ''}`}
                  onClick={() => setAccountListPage(page)}
                >
                  {page}
                </button>
              ))}
              <button
                type="button"
                className="quotation-account-list-page-button"
                onClick={() => setAccountListPage((page) => Math.min(totalAccountPages, page + 1))}
                disabled={accountListPage === totalAccountPages}
              >
                next
              </button>
            </div>
          </div>
        </div>
      </Modal>

      <Modal
        isOpen={isOpen}
        onClose={handleCloseQuotationBuilder}
        title={`Generate Quotation${quotationForm.companyName ? ` [${quotationForm.companyName}]` : ''}`}
        size="xlarge"
      >
        <form onSubmit={handleGenerateQuotation} className="quotation-builder">
          <div className="quotation-builder-page-header">
            <div className="quotation-builder-page-copy">
              <h2>{`Generate Quotation${quotationForm.companyName ? ` [${quotationForm.companyName}]` : ''}`}</h2>
              <p>Profile Name: <strong>{quotationForm.profileName || activeProfile?.label || '-'}</strong></p>
            </div>
            <div className="quotation-builder-page-actions">
              <button
                type="button"
                className="quotation-builder-close-icon"
                onClick={handleCloseQuotationBuilder}
                aria-label="Close quotation generator"
                title="Close"
              >
                <FaTimes />
              </button>
              <Button type="submit" variant="primary" loading={savingQuotation}>
                Generate
              </Button>
              <Button type="button" variant="outline" onClick={handleCloseQuotationBuilder}>
                Cancel
              </Button>
            </div>
          </div>

          <div className="quotation-builder-top-actions">
            <button
              type="button"
              className="quotation-builder-top-action"
              onClick={() => lineItemsUploadRef.current?.click()}
            >
              <FaUpload />
              Upload Line Items
            </button>
            <button
              type="button"
              className="quotation-builder-top-action"
              onClick={() => setIsProductModalOpen(true)}
            >
              Product
            </button>
            <button
              type="button"
              className="quotation-builder-top-action"
              onClick={() => setIsOtherProductModalOpen(true)}
            >
              Other Product
            </button>
            <button
              type="button"
              className="quotation-builder-top-action"
              onClick={() => setIsOtherServiceModalOpen(true)}
            >
              Other Service
            </button>
          </div>

          <input
            ref={lineItemsUploadRef}
            type="file"
            accept=".csv,.txt"
            className="quotation-builder-hidden-input"
            onChange={handleUploadLineItems}
          />



          <section className="quotation-builder-section quotation-builder-section--compact">
            <div className="quotation-builder-main-grid">
              <div className="quotation-builder-main-card">
                <div className="quotation-builder-blue-title">Quotation Details</div>
                <div className="quotation-builder-grid quotation-builder-grid-two">
                  <label className="quotation-builder-field">
                    <span>Client/Account No.</span>
                    <input value={quotationForm.clientAccountNumber} readOnly />
                  </label>
                  <label className="quotation-builder-field">
                    <span>Quotation Date</span>
                    <input
                      type="date"
                      value={quotationForm.quotationDate}
                      onChange={(event) => handleBuilderFieldChange('quotationDate', event.target.value)}
                    />
                  </label>
                  <label className="quotation-builder-field">
                    <span>Company Name</span>
                    <input
                      value={quotationForm.companyName}
                      onChange={(event) => handleBuilderFieldChange('companyName', event.target.value)}
                    />
                  </label>
                  <label className="quotation-builder-field">
                    <span>Contact Person</span>
                    <input
                      value={quotationForm.contactPerson}
                      onChange={(event) => handleBuilderFieldChange('contactPerson', event.target.value)}
                    />
                  </label>
                </div>
              </div>

              <div className="quotation-builder-main-card">
                <div className="quotation-builder-blue-title">Organization Details</div>
                <div className="quotation-builder-org-layout">
                  <div className="quotation-builder-org-logo-block">
                    <span className="quotation-builder-org-logo-label">Quotation Logo</span>
                    <div className="quotation-builder-org-logo-wrap">
                      {activeProfile?.logoType === 'image' ? (
                        <img
                          src={getProfileLogoSource(activeProfile) || swatiLogo}
                          alt={`${activeProfile?.label || 'Quotation profile'} logo`}
                          className="quotation-builder-logo"
                        />
                      ) : (
                        <div className="quotation-builder-logo-fallback">
                          <span>LUMOS</span>
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="quotation-builder-grid quotation-builder-grid-two">
                    <label className="quotation-builder-field">
                      <span>Quotation No.</span>
                      <input
                        value={quotationForm.quotationNumber}
                        onChange={(event) => handleBuilderFieldChange('quotationNumber', event.target.value)}
                      />
                    </label>
                    <label className="quotation-builder-field">
                      <span>Valid Until</span>
                      <input
                        type="date"
                        value={quotationForm.validUntil}
                        onChange={(event) => handleBuilderFieldChange('validUntil', event.target.value)}
                      />
                    </label>
                    <label className="quotation-builder-field quotation-builder-field-wide">
                      <span>Organization Name</span>
                      <input
                        value={quotationForm.organizationName}
                        onChange={(event) => handleBuilderFieldChange('organizationName', event.target.value)}
                        placeholder={activeProfile?.organizationName || ''}
                      />
                    </label>
                    <label className="quotation-builder-field quotation-builder-field-wide">
                      <span>Organization Address</span>
                      <textarea
                        rows="2"
                        value={quotationForm.organizationAddress}
                        onChange={(event) => handleBuilderFieldChange('organizationAddress', event.target.value)}
                        placeholder={activeProfile?.organizationAddress || ''}
                      />
                    </label>
                    <label className="quotation-builder-field">
                      <span>Organization Email</span>
                      <input
                        value={quotationForm.organizationEmail}
                        onChange={(event) => handleBuilderFieldChange('organizationEmail', event.target.value)}
                        placeholder={activeProfile?.organizationEmail || ''}
                      />
                    </label>
                    <label className="quotation-builder-field">
                      <span>Organization Phone</span>
                      <input
                        value={quotationForm.organizationPhone}
                        onChange={(event) => handleBuilderFieldChange('organizationPhone', event.target.value)}
                        placeholder={activeProfile?.organizationPhone || ''}
                      />
                    </label>
                    <label className="quotation-builder-field">
                      <span>GSTIN</span>
                      <input
                        value={quotationForm.organizationGstin}
                        onChange={(event) => handleBuilderFieldChange('organizationGstin', event.target.value)}
                        placeholder={activeProfile?.organizationGstin || ''}
                      />
                    </label>
                    <label className="quotation-builder-field">
                      <span>State Code</span>
                      <input
                        value={quotationForm.organizationStateCode}
                        onChange={(event) => handleBuilderFieldChange('organizationStateCode', event.target.value)}
                        placeholder={activeProfile?.organizationStateCode || ''}
                      />
                    </label>
                    <label className="quotation-builder-field">
                      <span>Currency</span>
                      <select
                        value={quotationForm.currency}
                        onChange={(event) => handleBuilderFieldChange('currency', event.target.value)}
                      >
                        {QUOTATION_CURRENCY_OPTIONS.map((option) => (
                          <option key={option.value} value={option.value}>{option.label}</option>
                        ))}
                      </select>
                    </label>
                  </div>
                </div>
              </div>
            </div>
          </section>

          <section className="quotation-builder-section quotation-builder-section--compact">
            <div className="quotation-builder-blue-title">Client Details</div>
            <div className="quotation-builder-grid quotation-builder-grid-four">
              <label className="quotation-builder-field">
                <span>Address Line1</span>
                <input value={clientAddressLines[0]} onChange={(event) => handleClientAddressLineChange(0, event.target.value)} />
              </label>
              <label className="quotation-builder-field">
                <span>Address Line2</span>
                <input value={clientAddressLines[1]} onChange={(event) => handleClientAddressLineChange(1, event.target.value)} />
              </label>
              <label className="quotation-builder-field">
                <span>Address Line3</span>
                <input value={clientAddressLines[2]} onChange={(event) => handleClientAddressLineChange(2, event.target.value)} />
              </label>
              <label className="quotation-builder-field">
                <span>Address Line4</span>
                <input value={clientAddressLines[3]} onChange={(event) => handleClientAddressLineChange(3, event.target.value)} />
              </label>
              <label className="quotation-builder-field">
                <span>Telephone</span>
                <input
                  value={quotationForm.telephone}
                  onChange={(event) => handleBuilderFieldChange('telephone', event.target.value)}
                />
              </label>
              <label className="quotation-builder-field">
                <span>Email</span>
                <input
                  type="email"
                  value={quotationForm.email}
                  onChange={(event) => handleBuilderFieldChange('email', event.target.value)}
                />
              </label>
              <label className="quotation-builder-field">
                <span>GSTIN</span>
                <input
                  value={quotationForm.gstin}
                  onChange={(event) => handleBuilderFieldChange('gstin', event.target.value)}
                />
              </label>
              <label className="quotation-builder-field">
                <span>State Code</span>
                <input
                  value={quotationForm.stateCode}
                  onChange={(event) => handleBuilderFieldChange('stateCode', event.target.value)}
                />
              </label>
            </div>
          </section>



          <section className="quotation-builder-section quotation-builder-section--compact">
            <div className="quotation-builder-blue-title quotation-builder-blue-title--with-action">
              <span>Quote Items Table</span>
              <Button type="button" variant="secondary" icon={<FaPlus />} onClick={handleAddLineItem}>
                Add Item
              </Button>
            </div>
            <div className="quotation-builder-table-layout">
              <div className="quotation-builder-line-items-wrap">
                <table className="quotation-builder-line-items-table">
                  <thead>
                    <tr>
                      <th>Description</th>
                      <th>Qty</th>
                      <th>Unit</th>
                      <th>Rate</th>
                      <th>Amount</th>
                      <th>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {quotationForm.lineItems.map((lineItem) => (
                      <tr key={lineItem.id}>
                        <td>
                          <input
                            value={lineItem.description}
                            onChange={(event) => handleLineItemChange(lineItem.id, 'description', event.target.value)}
                            placeholder="Item description"
                          />
                        </td>
                        <td>
                          <input
                            type="number"
                            min="0"
                            step="0.01"
                            value={lineItem.quantity}
                            onChange={(event) => handleLineItemChange(lineItem.id, 'quantity', event.target.value)}
                          />
                        </td>
                        <td>
                          <input
                            value={lineItem.unit}
                            onChange={(event) => handleLineItemChange(lineItem.id, 'unit', event.target.value)}
                            placeholder="Nos"
                          />
                        </td>
                        <td>
                          <input
                            type="number"
                            min="0"
                            step="0.01"
                            value={lineItem.rate}
                            onChange={(event) => handleLineItemChange(lineItem.id, 'rate', event.target.value)}
                          />
                        </td>
                        <td className="quotation-builder-line-amount">
                          {formatCurrency(calculateLineItemAmount(lineItem), quotationForm.currency || 'INR')}
                        </td>
                        <td className="quotation-builder-line-action">
                          <button
                            type="button"
                            className="quotation-builder-icon-button"
                            onClick={() => handleRemoveLineItem(lineItem.id)}
                            aria-label="Remove line item"
                          >
                            <FaTrash />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr>
                      <td colSpan="4">Grand Total</td>
                      <td>{formatCurrency(quotationGrandTotal, quotationForm.currency || 'INR')}</td>
                      <td />
                    </tr>
                  </tfoot>
                </table>
              </div>

              <div className="quotation-builder-summary-card">
                <div className="quotation-builder-summary-title">Quotation Details</div>
                <div className="quotation-builder-summary-list">
                  <div><span>Product Tax</span><strong>{formatCurrency(quotationDetailSummary.productTax, quotationForm.currency || 'INR')}</strong></div>
                  <div><span>Product Total</span><strong>{formatCurrency(quotationDetailSummary.productTotal, quotationForm.currency || 'INR')}</strong></div>
                  <div><span>Other Product Total</span><strong>{formatCurrency(quotationDetailSummary.otherProductTotal, quotationForm.currency || 'INR')}</strong></div>
                  <div><span>Quotation Total</span><strong>{formatCurrency(quotationDetailSummary.quotationTotal, quotationForm.currency || 'INR')}</strong></div>
                  <div><span>Service Tax</span><strong>{formatCurrency(quotationDetailSummary.serviceTax, quotationForm.currency || 'INR')}</strong></div>
                  <div><span>Service Total</span><strong>{formatCurrency(quotationDetailSummary.serviceTotal, quotationForm.currency || 'INR')}</strong></div>
                  <div><span>Other Service Total</span><strong>{formatCurrency(quotationDetailSummary.otherServiceTotal, quotationForm.currency || 'INR')}</strong></div>
                </div>
              </div>
            </div>
          </section>

          {builderError ? <div className="quotation-generator-error">{builderError}</div> : null}
          {builderMessage ? <div className="quotation-builder-message">{builderMessage}</div> : null}
        </form>
      </Modal>

      <AddProductModal 
        isOpen={isProductModalOpen} 
        onClose={() => setIsProductModalOpen(false)} 
        onAdd={handleAddModalLineItem} 
      />
      <AddOtherProductModal 
        isOpen={isOtherProductModalOpen} 
        onClose={() => setIsOtherProductModalOpen(false)} 
        onAdd={handleAddModalLineItem} 
      />
      <AddOtherServiceModal 
        isOpen={isOtherServiceModalOpen} 
        onClose={() => setIsOtherServiceModalOpen(false)} 
        onAdd={handleAddModalLineItem} 
      />
    </div>
  )
}

export default Quotations
