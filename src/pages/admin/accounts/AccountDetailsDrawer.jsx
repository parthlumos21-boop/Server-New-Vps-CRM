import React, { useCallback, useEffect, useMemo, useState } from 'react'
import { createPortal } from 'react-dom'
import { useLocation, useNavigate } from 'react-router-dom'
import {
  FaBell,
  FaEnvelope,
  FaExchangeAlt,
  FaExternalLinkAlt,
  FaFileAlt,
  FaRegStickyNote,
  FaRegSun,
  FaTrash,
  FaComments,
  FaHistory,
} from 'react-icons/fa'
import {
  FiChevronDown,
  FiEdit2,
} from 'react-icons/fi'
import { HiOutlineStatusOnline } from 'react-icons/hi'
import Button from '../../../components/common/Button'
import Modal from '../../../components/common/Modal'
import { remarkApi } from '../../../services/remarkApi'
import ContactIntegrationActions from '../../../components/integrations/ContactIntegrationActions'
import { useData } from '../../../context/DataContext'
import { buildAdminDealDetailUrl } from '../../../features/adminDeals/config/adminDealViews'
import { useClickOutside } from '../../../hooks'
import { ACCOUNT_ACTION_DROPDOWN_LABEL, ACCOUNT_DRAWER_ACTIONS } from '../../../features/adminAccounts/config/accountActions'
import { ACCOUNT_CATEGORY_OPTIONS, ACCOUNT_SOURCE_OPTIONS, CUSTOMER_TYPE_OPTIONS, INDUSTRY_TYPE_OPTIONS, STATE_OPTIONS } from '../../../features/accounts/config/accountDropdownOptions'
import { ACCOUNT_CHANGE_STATUS_OPTIONS, ACCOUNT_ORDER_STATUS_OPTIONS, ACCOUNT_QUOTATION_STATUS_OPTIONS, ACCOUNT_STATE_OPTIONS } from '../../../features/adminAccounts/config/accountStages'
import { buildAdminAccountActionUrl } from '../../../features/adminAccounts/utils/accountNavigation'
import { getAccountOwnerOptionLabel, getCachedAccountOwnerOptions, loadAccountOwnerOptions, filterAccountOwnerOptionsByVertical } from '../../../features/adminAccounts/utils/accountOwnerOptions'
import { formatCurrency, formatDate } from '../../../utils/helpers'
import AccountActionModal from './AccountActionModal'
import './MyGroupAccounts.css'

const HIDDEN_ACCOUNT_ACTION_STAGE_VALUES = new Set(['converted', 'closed', 'contacted', 'order_lost'])
const ACCOUNT_INFORMATION_STAGE_OPTIONS = ACCOUNT_CHANGE_STATUS_OPTIONS
  .filter((option) => !HIDDEN_ACCOUNT_ACTION_STAGE_VALUES.has(option.value))
  .map((option) => ({
    value: option.stageKey,
    label: option.value === 'convert_to_po' ? 'PO Converted' : option.label,
  }))
const REASON_FOR_LOST_OPTIONS = [
  'Intense Competition',
  'On Hold',
  'Payment Terms not matching',
  'Delivery not matching',
  'Budgetory Offer',
].map((value) => ({ value, label: value }))
const toSelectOptions = (entries = []) => entries.map((entry) => (
  typeof entry === 'string' ? { value: entry, label: entry } : entry
))
const ACCOUNT_STATUS_OPTIONS = ACCOUNT_STATE_OPTIONS.map((value) => ({
  value: value.toLowerCase(),
  label: value,
}))
const getAccountStatusLabel = (value) => {
  const normalizedValue = String(value || '').trim().toLowerCase()
  return ACCOUNT_STATUS_OPTIONS.find((option) => option.value === normalizedValue || option.label.toLowerCase() === normalizedValue)?.label || value
}
const getAllowedAccountInformationStage = (value) => (
  ACCOUNT_INFORMATION_STAGE_OPTIONS.some((option) => option.value === value) ? value : ''
)

const DEAL_TYPE_OPTIONS = [
  { value: 'LUMOS', label: 'LUMOS' },
  { value: 'SWATI', label: 'SWATI' },
  { value: 'PURCHASE ENQUIRY', label: 'PURCHASE ENQUIRY' },
  { value: 'TENDER ENQUIRY', label: 'TENDER ENQUIRY' },
]
const DEAL_SOURCE_OPTIONS = ['LUMOS', 'SWATI', 'PURCHASE ENQUIRY', 'TENDER ENQUIRY'].map(val => ({ value: val, label: val }))

const ACTION_ICONS = {
  'add-note-remarks': FaRegStickyNote,
  'add-reminder': FaBell,
  'change-status': FaRegSun,
  'add-document': FaFileAlt,
  're-assign-account': FaExchangeAlt,
  'converted-deal': FaExchangeAlt,
  'view-linked-deal': FaExternalLinkAlt,
  'send-mail': FaEnvelope,
  'manage-account': HiOutlineStatusOnline,
}

const sectionConfig = [
  {
    key: 'account',
    fields: [
      { key: 'accountName', label: 'Account Name' },
      { key: 'mobile', label: 'Phone' },
      { key: 'email', label: 'Email', type: 'email' },
      { key: 'accountDate', label: 'Account Date', type: 'date' },
      { key: 'addedBy', label: 'Added By' },
      { key: 'lastUpdated', label: 'Last Updated', readOnly: true },
      { key: 'accountCategory', label: 'Account Category', options: ACCOUNT_CATEGORY_OPTIONS },
      { key: 'accountOwner', label: 'Account Owner' },
      { key: 'status', label: 'Account Status', options: ACCOUNT_STATUS_OPTIONS },
      { key: 'accountState', label: 'Account State' },
      { key: 'accountSource', label: 'Account Source', options: ACCOUNT_SOURCE_OPTIONS },
      { key: 'gstin', label: 'GSTIN' },
      { key: 'stateCode', label: 'State Code' },
    ],
  },
  {
    key: 'contact',
    fields: [
      { key: 'contactPerson', label: 'Contact Person' },
      { key: 'city', label: 'Location' },
      { key: 'description', label: 'Description', multiline: true },
      { key: 'address', label: 'Address', multiline: true },
    ],
  },
  {
    key: 'other',
    fields: [
      { key: 'alternatePhone', label: 'Alternate Phone' },
      { key: 'alternateEmail', label: 'Alternate Email', type: 'email' },
      { key: 'customerType', label: 'Customer Type', options: CUSTOMER_TYPE_OPTIONS },
      { key: 'projectName', label: 'Project Name' },
      { key: 'projectType', label: 'Product Category' },
      { key: 'state', label: 'State', options: STATE_OPTIONS },
      { key: 'industry', label: 'Industry type', options: INDUSTRY_TYPE_OPTIONS },
      { key: 'customerRefNo', label: 'Customer Ref. No.' },
      { key: 'customerRefDate', label: 'Customer Ref. Date', type: 'date' },
      { key: 'consultantName', label: 'Consultant Name' },
      { key: 'poValue', label: 'PO Value' },
      { key: 'statusAsPerOrderReceived', label: 'Status of Customer as per Order Received', options: toSelectOptions(ACCOUNT_ORDER_STATUS_OPTIONS) },
      { key: 'statusAsPerQuotationGiven', label: 'Status Of Customer as per quotation Given', options: toSelectOptions(ACCOUNT_QUOTATION_STATUS_OPTIONS) },
      { key: 'jobNo', label: 'Job No' },
      { key: 'reasonForLost', label: 'Reason For Lost', options: REASON_FOR_LOST_OPTIONS },
      { key: 'customerName', label: 'Customer Name' },
    ],
  },
  {
    key: 'dealDetails',
    fields: [
      { key: 'dealDate', label: 'Deal Date', type: 'date' },
      { key: 'dealName', label: 'Deal Name' },
      { key: 'dealDescription', label: 'Description', multiline: true },
      { key: 'dealValue', label: 'Deal Value', type: 'number' },
      { key: 'poValue', label: 'PO Value', type: 'number' },
      { key: 'dealCoOwners', label: 'Deal Co-Owners' },
      { key: 'expectedClosureDate', label: 'Expected Closure Date', type: 'date' },
      { key: 'dealSource', label: 'Deal Source', options: DEAL_SOURCE_OPTIONS },
      { key: 'dealType', label: 'Deal Type', options: DEAL_TYPE_OPTIONS },
      { key: 'probability', label: 'Probability (%)', type: 'number' },
      { key: 'dealScore', label: 'Deal Score', type: 'number' },
      { key: 'dealOwner', label: 'Deal Owner' },
      { key: 'dealCity', label: 'City' },
      { key: 'gstin', label: 'GSTIN' },
      { key: 'jobNo', label: 'Job No' },
      { key: 'customerQuotationStatus', label: 'Status Of Customer as per quotation Given', options: toSelectOptions(ACCOUNT_QUOTATION_STATUS_OPTIONS) },
      { key: 'customerOrderStatus', label: 'Status of Customer as per Order Received', options: toSelectOptions(ACCOUNT_ORDER_STATUS_OPTIONS) },
    ],
  },
]

const flattenedAccountFields = sectionConfig.flatMap((section) => (
  section.fields.map((field) => ({ ...field, sectionKey: section.key }))
))

const formatHeaderDate = (value) => {
  if (!value) return '-'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return String(value)
  return date.toLocaleString()
}

const normalizeDateInput = (value) => {
  if (!value) return ''
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return ''
  return date.toISOString().slice(0, 10)
}

const formatDetailDate = (value, pattern = 'dd-MM-yyyy') => {
  if (!value) return ''
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return String(value)

  const day = String(date.getDate()).padStart(2, '0')
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const year = date.getFullYear()

  if (pattern === 'dd-MM-yyyy hh:mm a') {
    const time = date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })
    return `${day}-${month}-${year} ${time}`
  }

  return `${day}-${month}-${year}`
}

const getDisplayFieldValue = (field, value) => {
  if (!value) return ''
  if (field.key === 'lastUpdated') return formatDetailDate(value, 'dd-MM-yyyy hh:mm a')
  if (field.type === 'date') return formatDetailDate(value)
  if (field.key === 'status') return getAccountStatusLabel(value)
  if (field.options) {
    const option = field.options.find((entry) => entry.value === value || entry.label === value)
    if (option) return option.label
  }
  return value
}

const getTodayInputValue = () => new Date().toISOString().slice(0, 10)

const resolveAddedByDisplay = (account = {}) => (
  account.addedByDisplay
  || account.raw?.addedByDisplay
  || account.raw?.addedByName
  || account.raw?.createdByUserName
  || account.raw?.createdByName
  || account.addedBy
  || ''
)

const buildInitialForm = (account, deal = {}) => ({
  accountNumber: account.accountNumber || '',
  accountName: account.name || account.accountName || '',
  company: account.raw?.company || account.company || '',
  industry: account.industryType || account.raw?.industry || '',
  accountCategory: account.accountCategory || account.customerType || '',
  accountSource: account.accountSource || account.source || '',
  status: String(account.raw?.status || account.status || '').trim().toLowerCase(),
  accountState: account.accountState || account.raw?.accountState || getAccountStatusLabel(account.raw?.status || account.status || ''),
  stage: getAllowedAccountInformationStage(account.stage || ''),
  accountDate: normalizeDateInput(account.accountDate || account.createdAt) || '',
  accountOwner: account.accountOwnerName || account.accountOwner || '',
  addedBy: resolveAddedByDisplay(account),
  lastUpdated: account.updatedAt || account.raw?.updatedAt || '',
  assignedUserId: account.raw?.assignedUserId || account.raw?.assignedTo || account.raw?.ownerId || '',
  contactPerson: account.contactPerson || '',
  designation: account.contactDesignation || account.designation || account.raw?.designation || '',
  customerType: account.customerType || account.accountCategory || '',
  mobile: account.contactMobile || account.phone || '',
  alternatePhone: account.alternatePhone || '',
  alternateEmail: account.alternateEmail || '',
  email: account.email || account.contactEmail || '',
  website: account.website || '',
  address: account.address || '',
  city: account.location || account.raw?.city || '',
  state: account.state || '',
  gstin: account.gstin || account.raw?.gstin || deal.gstin || '',
  stateCode: account.stateCode || account.raw?.stateCode || '',
  country: account.raw?.country || '',
  pincode: account.raw?.pincode || account.raw?.pinCode || '',
  projectName: account.projectName || deal.projectName || '',
  projectType: account.productCategory || account.raw?.projectType || deal.productCategory || '',
  projectLocation: account.projectLocation || account.raw?.projectLocation || '',
  consultantName: account.consultantName || deal.consultantName || '',
  architectName: account.architectName || account.raw?.architectName || '',
  pmcName: account.pmcName || account.raw?.pmcName || '',
  poValue: account.poValue || account.raw?.poValue || deal.poValue || '',
  statusAsPerOrderReceived: account.statusAsPerOrderReceived || account.raw?.statusAsPerOrderReceived || '',
  statusAsPerQuotationGiven: account.statusAsPerQuotationGiven || account.raw?.statusAsPerQuotationGiven || '',
  reasonForLost: account.reasonForLost || account.raw?.reasonForLost || '',
  customerName: account.customerName || account.raw?.customerName || deal.customerName || '',
  reminderDate: normalizeDateInput(account.reminderDate) || getTodayInputValue(),
  reminderMode: account.reminderMode || '',
  latestRemark: account.latestRemark || '',
  remark: account.remark || '',
  description: account.description || account.raw?.description || '',
  jobNo: account.jobNo || deal.jobNo || '',
  customerRefNo: account.customerRefNo || deal.customerRefNo || '',
  customerRefDate: normalizeDateInput(account.customerRefDate || deal.customerRefDate) || '',
  dealName: account.dealName || deal.name || deal.dealName || '',
  dealDate: normalizeDateInput(account.dealDate || deal.dealDate) || '',
  dealDescription: account.dealDescription || account.raw?.dealDescription || deal.description || deal.dealDescription || '',
  dealValue: account.dealValue || deal.value || deal.dealValue || '',
  dealCoOwners: account.dealCoOwners || account.raw?.dealCoOwners || deal.dealCoOwners || '',
  dealOwner: account.dealOwner || account.raw?.dealOwner || deal.ownerName || deal.dealOwner || '',
  dealCity: account.dealCity || account.raw?.dealCity || deal.city || deal.dealCity || '',
  customerQuotationStatus: account.customerQuotationStatus || account.raw?.customerQuotationStatus || deal.quotationCustomerStatus || '',
  customerOrderStatus: account.customerOrderStatus || account.raw?.customerOrderStatus || deal.orderCustomerStatus || '',
  expectedClosureDate: normalizeDateInput(account.expectedClosureDate || deal.expectedClosureDate || deal.closeDate) || '',
  dealSource: account.dealSource || deal.dealSource || '',
  dealType: account.dealType || deal.dealType || '',
  probability: account.probability || deal.probability || '',
  dealScore: account.dealScore || deal.dealScore || '',
})

const buildUpdatePayload = (form) => ({
  name: form.accountName,
  accountName: form.accountName,
  company: form.company,
  industry: form.industry,
  industryType: form.industry,
  accountCategory: form.accountCategory,
  accountSource: form.accountSource,
  source: form.accountSource,
  status: String(form.status || '').trim().toLowerCase(),
  accountStatus: getAccountStatusLabel(form.status),
  accountState: form.accountState,
  stage: form.stage,
  accountDate: form.accountDate,
  accountOwner: form.accountOwner,
  ownerName: form.accountOwner,
  addedBy: form.addedBy,
  addedByDisplay: form.addedBy,
  contactPerson: form.contactPerson,
  contactDesignation: form.designation,
  designation: form.designation,
  customerType: form.customerType || form.accountCategory,
  contactMobile: form.mobile,
  mobile: form.mobile,
  phone: form.mobile,
  alternatePhone: form.alternatePhone,
  alternateEmail: form.alternateEmail,
  contactEmail: form.email,
  email: form.email,
  website: form.website,
  address: form.address,
  location: form.city,
  city: form.city,
  state: form.state,
  gstin: form.gstin,
  stateCode: form.stateCode,
  country: form.country,
  pincode: form.pincode,
  projectName: form.projectName,
  productCategory: form.projectType,
  projectType: form.projectType,
  projectLocation: form.projectLocation,
  consultantName: form.consultantName,
  architectName: form.architectName,
  pmcName: form.pmcName,
  poValue: form.poValue,
  statusAsPerOrderReceived: form.statusAsPerOrderReceived,
  statusAsPerQuotationGiven: form.statusAsPerQuotationGiven,
  reasonForLost: form.reasonForLost,
  reminderDate: form.reminderDate,
  reminderMode: form.reminderMode,
  latestRemark: form.latestRemark,
  remark: form.remark,
  notes: form.remark || form.description,
  description: form.description,
  jobNo: form.jobNo,
  customerRefNo: form.customerRefNo,
  customerRefDate: form.customerRefDate,
  customerName: form.customerName,
  dealDate: form.dealDate,
  dealName: form.dealName,
  dealDescription: form.dealDescription,
  dealValue: form.dealValue,
  dealCoOwners: form.dealCoOwners,
  dealOwner: form.dealOwner,
  dealCity: form.dealCity,
  customerQuotationStatus: form.customerQuotationStatus,
  customerOrderStatus: form.customerOrderStatus,
  expectedClosureDate: form.expectedClosureDate,
  dealSource: form.dealSource,
  dealType: form.dealType,
  probability: form.probability,
  dealScore: form.dealScore,
})

const AccountDetailsDrawer = ({
  account,
  isOpen,
  onClose,
  boardStateQuery,
  onSaveAccount,
  onRefresh,
  onDeleteAccount,
  canEdit = false,
  actionItems = ACCOUNT_DRAWER_ACTIONS,
  hiddenFieldKeys = [],
  inline = false,
}) => {
  const location = useLocation()
  const navigate = useNavigate()
  const { convertedDeals, convertAccountToDeal } = useData()
  
  const relatedConvertedDeals = useMemo(() => (
    (Array.isArray(convertedDeals) ? convertedDeals : [])
      .filter((entry) => String(entry.accountId || '') === String(account?.id || ''))
      .sort((left, right) => (
        new Date(right.convertedAt || right.createdAt || 0).getTime()
        - new Date(left.convertedAt || left.createdAt || 0).getTime()
      ))
  ), [account?.id, convertedDeals])
  
  const [isActionsOpen, setIsActionsOpen] = useState(false)
  const [editingSection, setEditingSection] = useState(null)
  const [editingFieldKey, setEditingFieldKey] = useState('')
  const [form, setForm] = useState(() => account ? buildInitialForm(account, relatedConvertedDeals[0]) : {})
  const [isSaving, setIsSaving] = useState(false)
  const [validationError, setValidationError] = useState('')
  const [activeActionKey, setActiveActionKey] = useState(null)
  const [ownerOptions, setOwnerOptions] = useState(getCachedAccountOwnerOptions)
  const [isHistoryModalOpen, setIsHistoryModalOpen] = useState(false)
  const [accountHistoryRemarks, setAccountHistoryRemarks] = useState([])
  const [isLoadingHistory, setIsLoadingHistory] = useState(false)

  const handleOpenAccountHistory = async () => {
    if (!account?.id) return
    setIsLoadingHistory(true)
    setIsHistoryModalOpen(true)
    try {
      const response = await remarkApi.getRemarks({ relatedEntityId: account.id, relatedEntityType: 'account' })
      const rawApiRemarks = Array.isArray(response?.data) ? response.data : Array.isArray(response) ? response : []

      const merged = [...rawApiRemarks]
      const singleRemark = account?.remark || account?.notes || account?.description || account?.formData?.remark
      if (singleRemark && typeof singleRemark === 'string' && singleRemark.trim()) {
        const text = singleRemark.trim()
        if (!merged.some((r) => String(r.content || r.remark || '').trim() === text)) {
          merged.push({
            id: `account-remark-single-${account.id}`,
            content: text,
            category: 'general',
            createdByName: account.ownerName || account.accountOwner || 'User',
            createdAt: account.updatedAt || account.createdAt || new Date().toISOString(),
          })
        }
      }

      const embeddedList = Array.isArray(account?.remarks)
        ? account.remarks
        : Array.isArray(account?.formData?.remarks)
          ? account.formData.remarks
          : Array.isArray(account?.history)
            ? account.history
            : []

      embeddedList.forEach((item, idx) => {
        const text = typeof item === 'string' ? item : item.content || item.remark || item.note || item.text || ''
        if (text && text.trim()) {
          const cleanText = text.trim()
          if (!merged.some((r) => String(r.content || r.remark || '').trim() === cleanText)) {
            merged.push({
              id: item.id || item._id || `account-embedded-${idx}`,
              content: cleanText,
              category: item.category || 'general',
              createdByName: item.createdByName || item.userName || item.addedBy || account.ownerName || 'User',
              createdAt: item.createdAt || item.date || account.createdAt || new Date().toISOString(),
              startTime: item.startTime || null,
              endTime: item.endTime || null,
            })
          }
        }
      })

      merged.sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0))
      setAccountHistoryRemarks(merged)
    } catch (error) {
      console.error('Failed to fetch account history remarks:', error)
      setAccountHistoryRemarks([])
    } finally {
      setIsLoadingHistory(false)
    }
  }

  const closeActions = useCallback(() => setIsActionsOpen(false), [])
  const actionsRef = useClickOutside(closeActions)
  const hiddenFieldKeySet = useMemo(() => new Set(hiddenFieldKeys), [hiddenFieldKeys])
  const visibleAccountFields = useMemo(
    () => flattenedAccountFields.filter((field) => !hiddenFieldKeySet.has(field.key)),
    [hiddenFieldKeySet]
  )

  useEffect(() => {
    if (account) {
      const deal = relatedConvertedDeals[0] || {}
      setForm(buildInitialForm(account, deal))
      setEditingSection(null)
      setEditingFieldKey('')
      setValidationError('')
      setActiveActionKey(null)
    }
  }, [account, relatedConvertedDeals])

  useEffect(() => {
    let isMounted = true

    loadAccountOwnerOptions()
      .then((options) => {
        if (isMounted) setOwnerOptions(options)
      })
      .catch(() => {
        if (isMounted) setOwnerOptions(getCachedAccountOwnerOptions())
      })

    return () => {
      isMounted = false
    }
  }, [])

  const headerFacts = useMemo(() => ([
    { label: 'Owner', value: account?.accountOwnerDisplay || account?.accountOwner || '-' },
    { label: 'Last Updated', value: formatHeaderDate(account?.updatedAt) },
  ]), [account])
  const isAdminPortal = location.pathname.startsWith('/admin')
  const linkedDealId = useMemo(() => {
    const convertedDeal = relatedConvertedDeals[0] || null
    return account?.dealId
      || convertedDeal?.sourceDealId
      || convertedDeal?.dealId
      || account?.convertedDealId
      || ''
  }, [account?.convertedDealId, account?.dealId, relatedConvertedDeals])
  const visibleActionItems = useMemo(() => {
    const alreadyConverted = Boolean(
      account?.isConverted
      || account?.dealId
      || account?.convertedDealId
      || relatedConvertedDeals.length > 0
    )

    return actionItems.filter((action) => (
      (action.key !== 'converted-deal' || !alreadyConverted)
      && (action.key !== 'view-linked-deal' || alreadyConverted)
    ))
  }, [account?.convertedDealId, account?.dealId, account?.isConverted, actionItems, relatedConvertedDeals.length])

  if (!isOpen || !account) return null

  const handleFieldChange = (key, value) => {
    setValidationError('')
    if (key === 'status') {
      const nextStatus = String(value || '').trim().toLowerCase()
      setForm((currentForm) => ({
        ...currentForm,
        status: nextStatus,
        accountState: getAccountStatusLabel(nextStatus),
      }))
      return
    }

    setForm((currentForm) => ({
      ...currentForm,
      [key]: value,
    }))
  }

  const handleCancelEdit = () => {
    setForm(buildInitialForm(account))
    setEditingSection(null)
    setEditingFieldKey('')
    setValidationError('')
  }

  const handleSave = async () => {
    if (!editingSection || !onSaveAccount) return

    if (!String(form.accountName || '').trim()) {
      setValidationError('Account Name is required before saving.')
      return
    }

    setIsSaving(true)
    const selectedOwner = ownerOptions.find((owner) => owner.name === form.accountOwner)
    const updatePayload = {
      ...buildUpdatePayload(form),
      ...(selectedOwner ? {
        ownerId: selectedOwner.id,
        assignedUserId: selectedOwner.id,
      } : {}),
    }
    const result = await onSaveAccount(account.id, updatePayload)
    
    if (result?.success) {
      try {
        const isUnconverted = !account.isConverted && account.stage !== 'converted' && account.stage !== 'converted_to_po'
        const filledDealTriggerFields = Boolean(form.dealName || form.dealOwner || form.dealValue || form.poValue)
        
        if (isUnconverted && filledDealTriggerFields && typeof convertAccountToDeal === 'function') {
          await convertAccountToDeal(account.id)
        }
      } catch (err) {
        console.error("Failed to process auto-convert", err)
      }
      
      if (typeof onRefresh === 'function') {
        onRefresh()
      }
    }

    setIsSaving(false)

    if (result?.success) {
      setEditingSection(null)
      setEditingFieldKey('')
      setValidationError('')
    }
  }

  const handleOpenConvertedDeal = (convertedDeal) => {
    const sourceDealId = convertedDeal?.sourceDealId || ''
    const fromPath = `${location.pathname}${location.search || ''}`

    if (isAdminPortal && sourceDealId) {
      navigate(buildAdminDealDetailUrl(sourceDealId), {
        state: {
          fromPath,
        },
      })
      return
    }

    navigate(isAdminPortal ? '/admin/deals/search' : '/deals/search', {
      state: {
        ...(sourceDealId ? { editDealId: sourceDealId } : {}),
        quotationDealLookup: {
          dealNumber: convertedDeal?.dealNumber || convertedDeal?.title || convertedDeal?.name || '',
          projectName: convertedDeal?.projectName || '',
          companyName: convertedDeal?.accountName || convertedDeal?.customerName || '',
        },
      },
    })
  }

  const drawerNode = (
    <div
      className={`admin-accounts-drawer-layer admin-accounts-workspace-layer${inline ? ' admin-accounts-workspace-layer--inline' : ''}`}
      role="dialog"
      aria-modal={inline ? 'false' : 'true'}
      aria-label="Account details workspace"
    >
      <section className="admin-accounts-drawer admin-accounts-workspace">
        <header className="admin-accounts-workspace-header">
          <div className="admin-accounts-workspace-title">
            <h2>{account.name}</h2>
            <div className="admin-accounts-workspace-header-facts">
              {headerFacts.map((fact) => (
                <span key={fact.label}>
                  <strong>{fact.label}:</strong> {fact.value}
                </span>
              ))}
            </div>
          </div>

          <div className="admin-accounts-workspace-actions" style={{ display: 'flex', alignItems: 'center' }}>
            <button
              type="button"
              className="admin-accounts-history-trigger"
              onClick={handleOpenAccountHistory}
              title="View History"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                justify: 'center',
                padding: '8px 12px',
                borderRadius: '6px',
                border: '1px solid #cbd5e1',
                background: '#ffffff',
                color: '#2563eb',
                cursor: 'pointer',
                marginRight: '8px',
                fontSize: '16px',
              }}
            >
              <FaHistory />
            </button>
            <div className="admin-accounts-actions-dropdown" ref={actionsRef}>
              <button
                type="button"
                className="admin-accounts-actions-trigger"
                onClick={() => setIsActionsOpen((currentValue) => !currentValue)}
              >
                <span className="admin-accounts-actions-trigger-label">{ACCOUNT_ACTION_DROPDOWN_LABEL}</span>
                <span className="admin-accounts-actions-trigger-caret">
                  <FiChevronDown />
                </span>
              </button>

              {isActionsOpen ? (
                <div className="admin-accounts-actions-menu">
                  {visibleActionItems.map((action) => {
                    const Icon = ACTION_ICONS[action.key] || HiOutlineStatusOnline

                    const isNotQuotedAccount = account.stage === 'not_quoted' || account.status === 'Not Quoted' || account.stage === 'Not Quoted' || account.status === 'not_quoted' || account.accountStatus === 'not_quoted'
                    const isBlocked = isNotQuotedAccount && (action.key === 'generate-quotation' || action.key === 'converted-deal' || action.key === 'convert_to_po')

                    return (
                      <button
                        type="button"
                        key={action.key}
                        className={`admin-accounts-actions-menu-button${isBlocked ? ' opacity-50 cursor-not-allowed' : ''}`}
                        onClick={() => {
                          closeActions()
                          if (isBlocked) {
                            addNotification('warning', 'Action Unavailable', 'This account is marked as Not Quoted. PO Conversion and Quotation Generation are disabled.')
                            return
                          }
                          if (action.key === 'generate-quotation') {
                            const isAdminPortal = window.location.pathname.startsWith('/admin')
                            navigate(isAdminPortal ? '/admin/quotations' : '/quotations', {
                              state: {
                                openGenerator: true,
                                preselectedAccountId: account.id,
                                preselectedCustomer: account,
                              },
                            })
                            return
                          }

                          if (action.key === 'send-mail' || action.key === 'converted-deal') {
                            window.location.href = buildAdminAccountActionUrl(action.route, account.id, boardStateQuery)
                            return
                          }

                          if (action.key === 'view-linked-deal') {
                            if (linkedDealId) {
                              navigate(buildAdminDealDetailUrl(linkedDealId), {
                                state: {
                                  fromPath: `${location.pathname}${location.search || ''}`,
                                },
                              })
                            } else {
                              const convertedDeal = relatedConvertedDeals[0]
                              if (convertedDeal) {
                                handleOpenConvertedDeal(convertedDeal)
                              }
                            }
                            return
                          }

                          if (action.key === 'delete-account') {
                            if (typeof onDeleteAccount === 'function') {
                              onDeleteAccount(account)
                            }
                            return
                          }

                          setActiveActionKey(action.key)
                        }}
                      >
                        <Icon className="admin-accounts-actions-menu-icon" />
                        <span>{action.label}</span>
                      </button>
                    )
                  })}
                </div>
              ) : null}
            </div>

            <button
              type="button"
              className="admin-accounts-workspace-close"
              onClick={onClose}
              aria-label="Close account details"
            >
              Close
            </button>
          </div>
        </header>

        <main className="admin-accounts-workspace-body">
          <div className="admin-accounts-workspace-main">
            {validationError ? (
              <div className="admin-accounts-workspace-validation">
                {validationError}
              </div>
            ) : null}
            <div className="admin-accounts-workspace-flat-fields">
              {visibleAccountFields.map((field) => {
                const value = field.key === 'changeStatus' ? (form.stage || form.status || '') : (form[field.key] || '')
                const displayValue = getDisplayFieldValue(field, value)
                const isEditing = editingSection === field.sectionKey
                const isSingleFieldEditing = isEditing && editingFieldKey === field.key
                const canEditThisField = canEdit || !isAdminPortal || field.key === 'addedBy' || field.key === 'accountOwner'
                const canEditField = isSingleFieldEditing && canEditThisField && !field.readOnly
                const isUserSelectField = ['accountOwner', 'addedBy', 'dealOwner', 'dealCoOwners'].includes(field.key)

                let currentOwnerOptions = ownerOptions
                if (field.key === 'accountOwner') {
                  const activeCategory = form.accountCategory || account.accountCategory || ''
                  currentOwnerOptions = filterAccountOwnerOptionsByVertical(ownerOptions, activeCategory)
                }

                const visibleOwnerOptions = isUserSelectField && value && !currentOwnerOptions.some((owner) => owner.name === value)
                  ? [{ id: `current-${value}`, name: value, ownerDisplayName: value }, ...currentOwnerOptions]
                  : (isUserSelectField ? currentOwnerOptions : [])

                return (
                  <label
                    key={`${field.sectionKey}-${field.key}`}
                    className={`admin-accounts-workspace-field admin-accounts-workspace-field--flat ${field.multiline && !field.compact ? 'admin-accounts-workspace-field-wide' : ''} ${field.compact ? 'admin-accounts-workspace-field-compact' : ''} ${isSingleFieldEditing ? 'admin-accounts-workspace-field--single-editing' : ''}`}
                    data-field-key={field.key}
                  >
                    <span className="admin-accounts-workspace-field-label">
                      <span>{field.label}</span>
                      {!field.readOnly ? (
                        <button
                          type="button"
                          className="admin-accounts-workspace-field-edit-btn"
                          onClick={(event) => {
                            event.preventDefault()
                            event.stopPropagation()
                            setEditingSection(field.sectionKey)
                            setEditingFieldKey(field.key)
                          }}
                          disabled={!canEditThisField || isSaving}
                          title={`Edit ${field.label}`}
                          aria-label={`Edit ${field.label}`}
                        >
                          <FiEdit2 />
                        </button>
                      ) : null}
                    </span>
                    {canEditField ? (
                      isUserSelectField ? (
                        <select
                          value={value}
                          onChange={(event) => handleFieldChange(field.key, event.target.value)}
                        >
                          <option value="">Select {field.label}</option>
                          {visibleOwnerOptions.map((owner) => (
                            <option key={owner.id} value={owner.name}>
                              {getAccountOwnerOptionLabel(owner)}
                            </option>
                          ))}
                        </select>
                      ) : field.options ? (
                        <select
                          value={value}
                          onChange={(event) => {
                            if (field.key === 'changeStatus') {
                              handleFieldChange('stage', event.target.value)
                              handleFieldChange('status', event.target.value)
                              return
                            }

                            handleFieldChange(field.key, event.target.value)
                          }}
                        >
                          <option value="">Select {field.label}</option>
                          {field.options.map((option) => (
                            <option key={option.value || option.label} value={option.value}>
                              {option.label}
                            </option>
                          ))}
                        </select>
                      ) : field.multiline ? (
                        <textarea
                          value={value}
                          onChange={(event) => handleFieldChange(field.key, event.target.value)}
                          rows={field.rows || 4}
                        />
                      ) : (
                        <input
                          type={field.type || 'text'}
                          value={value}
                          onChange={(event) => handleFieldChange(field.key, event.target.value)}
                        />
                      )
                    ) : (
                      <strong className={`admin-accounts-workspace-field-value ${!displayValue ? 'admin-accounts-workspace-field-value-missing admin-accounts-detail-value-missing' : ''}`}>
                        {displayValue || 'Not available'}
                        {['mobile', 'email'].includes(field.key) && value ? (
                          <ContactIntegrationActions
                            phone={field.key === 'mobile' ? form.mobile : undefined}
                            email={field.key === 'email' ? form.email : undefined}
                            targetType="account"
                            targetId={account.id}
                            defaultMessage={`Hello ${account.name || ''}`.trim()}
                            emailSubject={`Regarding ${account.name || 'Account'}`}
                            onStatus={(type, message) => {
                              setValidationError(type === 'error' ? message : '')
                              if (type === 'success') setValidationError('')
                            }}
                          />
                        ) : null}
                      </strong>
                    )}
                  </label>
                )
              })}

              {editingFieldKey ? (
                <div className="admin-accounts-workspace-section-actions admin-accounts-workspace-section-actions--flat">
                  <Button variant="outline" size="small" onClick={handleCancelEdit} disabled={isSaving}>
                    Cancel
                  </Button>
                  <Button size="small" onClick={handleSave} loading={isSaving}>
                    Save Changes
                  </Button>
                </div>
              ) : null}
            </div>

            <section className="admin-accounts-workspace-section">
              <div className="admin-accounts-workspace-section-header">
                <h3>
                  {String(account?.status || account?.stage || account?.raw?.status || account?.raw?.stage || '').toLowerCase() === 'staged' ? 'Staged Deals' : 'Staged Deals'}
                </h3>
                <span className="admin-accounts-converted-deals-count">
                  {relatedConvertedDeals.length} linked
                </span>
              </div>

              {relatedConvertedDeals.length === 0 ? (
                <div className="admin-accounts-converted-deals-empty">
                  No staged deals are linked with this account yet.
                </div>
              ) : (
                <div className="admin-accounts-converted-deals-list">
                  {relatedConvertedDeals.map((convertedDeal) => (
                    <button
                      key={convertedDeal.id}
                      type="button"
                      className="admin-accounts-converted-deal-card"
                      onClick={() => handleOpenConvertedDeal(convertedDeal)}
                    >
                      <div className="admin-accounts-converted-deal-card__title">
                        {convertedDeal.title || convertedDeal.name || convertedDeal.dealNumber || 'Untitled Deal'}
                      </div>
                      <div className="admin-accounts-converted-deal-card__meta">
                        <span>{convertedDeal.dealNumber || 'No deal number'}</span>
                        <span>{convertedDeal.amount !== null && convertedDeal.amount !== undefined ? formatCurrency(convertedDeal.amount, convertedDeal.currency) : 'No value'}</span>
                        <span>{formatDate(convertedDeal.convertedAt || convertedDeal.createdAt || '') || 'No conversion date'}</span>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </section>
          </div>

        </main>
      </section>
      <AccountActionModal
        account={account}
        actionKey={activeActionKey}
        onClose={() => setActiveActionKey(null)}
      />

      {isHistoryModalOpen && (
        <Modal
          isOpen={isHistoryModalOpen}
          onClose={() => setIsHistoryModalOpen(false)}
          title={`Remarks & Communication History - ${account.name || account.accountName || 'Account'}`}
          size="large"
        >
          <div style={{ padding: '8px', maxHeight: '70vh', overflowY: 'auto' }}>
            {isLoadingHistory ? (
              <div style={{ padding: '30px', textAlign: 'center', color: '#64748b' }}>
                Loading remarks history...
              </div>
            ) : accountHistoryRemarks.length === 0 ? (
              <div style={{ padding: '30px', textAlign: 'center', color: '#64748b' }}>
                No remarks history found for this account.
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {accountHistoryRemarks.map((rem) => (
                  <div
                    key={rem.id || rem._id}
                    style={{
                      padding: '12px 16px',
                      borderRadius: '8px',
                      border: '1px solid #e2e8f0',
                      background: '#f8fafc',
                      display: 'flex',
                      alignItems: 'flex-start',
                      gap: '12px',
                    }}
                  >
                    <FaComments style={{ color: '#2563eb', fontSize: '18px', marginTop: '2px', flexShrink: 0 }} />
                    <div style={{ flex: 1 }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '4px' }}>
                        <span style={{
                          padding: '2px 8px',
                          borderRadius: '4px',
                          background: rem.category === 'call-log' ? '#fef3c7' : '#e2e8f0',
                          color: rem.category === 'call-log' ? '#92400e' : '#1e293b',
                          fontSize: '11px',
                          fontWeight: 700,
                          textTransform: 'uppercase',
                        }}>
                          {rem.category || 'GENERAL'}
                        </span>
                        <span style={{ fontSize: '12px', color: '#64748b' }}>
                          {rem.createdAt ? new Date(rem.createdAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '-'}
                        </span>
                      </div>
                      <p style={{ margin: '4px 0 8px 0', fontSize: '14px', color: '#334155', whiteSpace: 'pre-wrap' }}>
                        {rem.content || rem.remark || rem.note}
                      </p>
                      {rem.category === 'call-log' && (rem.startTime || rem.endTime || rem.callLogTime) && (
                        <div style={{ fontSize: '12px', color: '#0284c7', marginBottom: '4px', fontWeight: 600 }}>
                          Call Duration: {rem.startTime || rem.callLogTime || '09:00'} - {rem.endTime || '09:30'}
                        </div>
                      )}
                      <div style={{ fontSize: '12px', color: '#64748b' }}>
                        Added by: <strong>{rem.createdByName || rem.userName || rem.createdBy || rem.ownerCode || 'User'}</strong>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </Modal>
      )}
    </div>
  )

  if (inline) {
    return drawerNode
  }

  return createPortal(drawerNode, document.body)
}

export default AccountDetailsDrawer
