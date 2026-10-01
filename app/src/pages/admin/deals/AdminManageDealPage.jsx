import React, { useEffect, useMemo, useRef, useState } from 'react'
import {
  FaBell,
  FaCalendarAlt,
  FaCaretDown,
  FaEdit,
  FaEnvelope,
  FaExchangeAlt,
  FaFileAlt,
  FaFileUpload,
  FaLink,
  FaMapMarkerAlt,
  FaPhone,
  FaSave,
  FaTimes,
  FaTrash,
  FaUser,
  FaUserCog,
  FaBan,
  FaClipboardList,
} from 'react-icons/fa'
import { useLocation, useNavigate, useParams } from 'react-router-dom'
import Button from '../../../components/common/Button'
import Modal from '../../../components/common/Modal'
import { useAuth } from '../../../context/AuthContext'
import { useData } from '../../../context/DataContext'
import { buildAdminAccountsBoardUrl } from '../../../features/adminAccounts/config/accountBoardViews'
import {
  ACCOUNT_CATEGORY_OPTIONS,
  ACCOUNT_SOURCE_OPTIONS,
} from '../../../features/accounts/config/accountDropdownOptions'
import {
  ACCOUNT_CHANGE_STATUS_OPTIONS,
  getAccountChangeStatusOption,
} from '../../../features/adminAccounts/config/accountStages'
import {
  CUSTOMER_QUOTATION_STATUS_OPTIONS,
  DEAL_LIFECYCLE_STATUS_OPTIONS,
  normalizeOptionalNumberInput,
} from '../../../features/adminDeals/config/dealUtils'
import { buildCrmDealActionUrl } from '../crm-actions/CRMActionPage'
import { authService } from '../../../services/authService'
import { customerService } from '../../../services/customerService'
import { calendarApi } from '../../../services/calendarApi'
import { reminderApi } from '../../../services/reminderApi'
import { addStandaloneReminder } from '../../../features/standaloneReminders/standaloneReminderStorage'
import { getCrmOwnerDisplay } from '../../../features/users/crmUserDirectory'
import { formatCurrency, formatDate, formatNumber } from '../../../utils/helpers'
import './AdminManageDealPage.css'

const HIDDEN_MANAGE_DEAL_STATUS_VALUES = new Set(['converted', 'closed', 'contacted', 'order_lost'])
const MANAGE_DEAL_CHANGE_STATUS_OPTIONS = ACCOUNT_CHANGE_STATUS_OPTIONS.filter((option) => (
  !HIDDEN_MANAGE_DEAL_STATUS_VALUES.has(option.value)
)).map((option) => ({
  ...option,
  label: option.value === 'convert_to_po' ? 'PO Converted' : option.label,
}))

const STATUS_OPTIONS = MANAGE_DEAL_CHANGE_STATUS_OPTIONS.map((option) => ({
  value: option.value,
  label: option.label,
}))

const BASE_STAGE_OPTIONS = MANAGE_DEAL_CHANGE_STATUS_OPTIONS.map((option) => ({
  value: option.stageKey,
  label: option.label,
}))

const DEAL_TYPE_OPTIONS = [
  { value: 'LUMOS', label: 'LUMOS' },
  { value: 'SWATI', label: 'SWATI' },
  { value: 'PURCHASE ENQUIRY', label: 'PURCHASE ENQUIRY' },
  { value: 'TENDER ENQUIRY', label: 'TENDER ENQUIRY' },
]

const DEAL_SOURCE_SELECT_OPTIONS = DEAL_TYPE_OPTIONS
const DEAL_SUBSOURCE_SELECT_OPTIONS = ACCOUNT_SOURCE_OPTIONS
const PRODUCT_CATEGORY_SELECT_OPTIONS = ACCOUNT_CATEGORY_OPTIONS

const REMINDER_MODE_OPTIONS = ['Call', 'Email', 'Meeting', 'Visit', 'WhatsApp', 'Follow Up']
const REMINDER_TIME_OPTIONS = ['09:00', '10:00', '11:00', '12:00', '13:00', '14:00', '15:00', '16:00', '17:00']
const MANAGE_DEAL_LIFECYCLE_STATUS_OPTIONS = DEAL_LIFECYCLE_STATUS_OPTIONS.map((option) => ({
  ...option,
  label: option.value === 'Convert To PO' ? 'PO Converted' : option.label,
}))

const LOST_ORDER_REASON_OPTIONS = [
  { value: '', label: 'Select Reason' },
  { value: 'Intense Competition', label: 'A - Intense Competition' },
  { value: 'On Hold', label: 'B - On Hold' },
  { value: 'Payment Terms not matching.', label: 'C - Payment Terms not matching.' },
  { value: 'Delivery not matching.', label: 'D - Delivery not matching.' },
  { value: 'Budgetory Offer.', label: 'E - Budgetory Offer.' },
]

const LOST_ORDER_REASON_LABELS = LOST_ORDER_REASON_OPTIONS.reduce((lookup, option) => ({
  ...lookup,
  [option.value]: option.label,
}), {})

const normalizeSearchValue = (value) => String(value || '').trim().toLowerCase()

const normalizeLostOrderReason = (value = '') => {
  const normalizedValue = String(value || '').trim()
  const matchedOption = LOST_ORDER_REASON_OPTIONS.find((option) => (
    normalizeSearchValue(option.value) === normalizeSearchValue(normalizedValue)
    || normalizeSearchValue(option.label) === normalizeSearchValue(normalizedValue)
  ))
  return matchedOption?.value || normalizedValue
}

const getLostOrderReasonLabel = (value = '') => {
  const normalized = normalizeLostOrderReason(value)
  return LOST_ORDER_REASON_LABELS[normalized] || (normalized ? String(value).trim() : 'Select Reason')
}

const getAllowedManageDealStatusOption = (value = '') => {
  const selectedOption = getAccountChangeStatusOption(value)
  return MANAGE_DEAL_CHANGE_STATUS_OPTIONS.some((option) => option.value === selectedOption.value)
    ? selectedOption
    : MANAGE_DEAL_CHANGE_STATUS_OPTIONS[0]
}

const getApiIntegerId = (value) => {
  const normalizedValue = String(value || '').trim()
  return /^\d+$/.test(normalizedValue) ? normalizedValue : ''
}

const hasDisplayValue = (value) => {
  if (typeof value === 'number') return true
  return String(value || '').trim() !== ''
}

const titleize = (value) => (
  String(value || '')
    .replace(/[_-]+/g, ' ')
    .trim()
    .replace(/\s+/g, ' ')
    .replace(/\b\w/g, (character) => character.toUpperCase())
)

const toDateInputValue = (value) => {
  if (!value) return ''
  if (/^\d{4}-\d{2}-\d{2}$/.test(String(value))) return String(value)

  const parsedDate = new Date(value)
  if (Number.isNaN(parsedDate.getTime())) return ''
  return parsedDate.toISOString().slice(0, 10)
}

const getTodayInputValue = () => new Date().toISOString().slice(0, 10)
const addDaysToInputValue = (days) => {
  const date = new Date()
  date.setDate(date.getDate() + days)
  return date.toISOString().slice(0, 10)
}

const isClosedDealSelection = (status = '', stage = '') => {
  const normalizedStatus = normalizeSearchValue(status)
  const normalizedStage = normalizeSearchValue(stage)
  return (
    normalizedStatus === 'won'
    || normalizedStatus === 'lost'
    || normalizedStatus.includes('closed')
    || normalizedStage.includes('closed')
  )
}

const toNumberInputValue = (value) => (
  value === null || value === undefined || value === ''
    ? ''
    : Number.isFinite(Number(value))
      ? String(value)
      : ''
)

const formatDateTimeValue = (value) => (
  value ? formatDate(value, 'long') : ''
)

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

const formatAgeingValue = (dealDate, actualClosureDate) => {
  const startDate = dealDate ? new Date(dealDate) : null
  if (!startDate || Number.isNaN(startDate.getTime())) return ''

  const endDate = actualClosureDate ? new Date(actualClosureDate) : new Date()
  if (Number.isNaN(endDate.getTime())) return ''

  const dayDifference = Math.max(0, Math.floor((endDate.getTime() - startDate.getTime()) / 86400000))
  return `${dayDifference} day${dayDifference === 1 ? '' : 's'}`
}

const resolveBoardStageKey = (deal) => {
  const status = normalizeSearchValue(deal.status || deal.dealStatus)
  const stage = normalizeSearchValue(deal.stage)
  const quotationStatus = normalizeSearchValue(deal.quotationCustomerStatus)
  const orderStatus = normalizeSearchValue(deal.orderCustomerStatus)

  if (status === 'won' || stage.includes('closed-won') || stage.includes('closed won')) {
    return 'closedWon'
  }

  if (status === 'lost' || stage.includes('closed-lost') || stage.includes('closed lost')) {
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

const buildTimelineSteps = (deal) => {
  const currentStageKey = resolveBoardStageKey(deal)
  const actorName = deal.dealOwnerDisplay || deal.dealOwner || deal.addedByDisplay || deal.addedBy || 'System'
  const createdLabel = deal.addedByDisplay || deal.addedBy || actorName || 'System'
  const currentTimestamp = deal.actualClosureDate || deal.updatedAt || deal.createdAt || deal.dealDate || ''

  if (currentStageKey === 'quotationRevision') {
    return [
      { key: 'new', label: 'New', actor: createdLabel, timestamp: deal.createdAt || deal.dealDate || '' },
      { key: 'quotationSent', label: 'Quotation Sent', actor: actorName, timestamp: deal.updatedAt || currentTimestamp },
      { key: 'quotationRevision', label: 'Quotation Revision', actor: actorName, timestamp: currentTimestamp, active: true },
    ]
  }

  if (currentStageKey === 'quotationSent') {
    return [
      { key: 'new', label: 'New', actor: createdLabel, timestamp: deal.createdAt || deal.dealDate || '' },
      { key: 'quotationSent', label: 'Quotation Sent', actor: actorName, timestamp: currentTimestamp, active: true },
    ]
  }

  if (currentStageKey === 'closedWon') {
    return [
      { key: 'new', label: 'New', actor: createdLabel, timestamp: deal.createdAt || deal.dealDate || '' },
      { key: 'closedWon', label: 'Closed Won', actor: actorName, timestamp: currentTimestamp, active: true },
    ]
  }

  if (currentStageKey === 'closedLost') {
    return [
      { key: 'new', label: 'New', actor: createdLabel, timestamp: deal.createdAt || deal.dealDate || '' },
      { key: 'closedLost', label: 'Closed Lost', actor: actorName, timestamp: currentTimestamp, active: true },
    ]
  }

  if (hasDisplayValue(deal.stage)) {
    return [
      { key: 'new', label: 'New', actor: createdLabel, timestamp: deal.createdAt || deal.dealDate || '' },
      { key: 'current', label: titleize(deal.stage), actor: actorName, timestamp: currentTimestamp, active: true },
    ]
  }

  return [
    { key: 'new', label: 'New', actor: createdLabel, timestamp: deal.createdAt || deal.dealDate || '', active: true },
  ]
}

const formatCurrencyValue = (value) => {
  if (!hasDisplayValue(value)) return ''
  if (!Number.isFinite(Number(value))) return String(value)
  return formatCurrency(Number(value))
}

const buildNormalizedDeal = ({ deal, accounts, customers, users, currentUser }) => {
  if (!deal) return null

  const userDirectory = users.reduce((lookup, entry) => {
    lookup[String(entry.id)] = entry.ownerDisplayName || entry.name
    return lookup
  }, {})
  const userIdByName = users.reduce((lookup, entry) => {
    const ownerName = entry.ownerDisplayName || entry.name || ''
    const normalizedName = normalizeSearchValue(ownerName)
    if (normalizedName && !lookup[normalizedName]) {
      lookup[normalizedName] = String(entry.id)
    }
    return lookup
  }, {})

  const accountDirectory = accounts.reduce((lookup, account) => {
    if (account?.id) {
      lookup[String(account.id)] = account
    }
    return lookup
  }, {})

  const accountNameDirectory = accounts.reduce((lookup, account) => {
    const normalizedName = normalizeSearchValue(account?.name || account?.accountName || account?.customerName || '')
    if (normalizedName && !lookup[normalizedName]) {
      lookup[normalizedName] = account
    }
    return lookup
  }, {})

  const customerDirectory = customers.reduce((lookup, customer) => {
    if (customer?.id) {
      lookup[String(customer.id)] = customer
    }
    return lookup
  }, {})

  const linkedAccount = (
    accountDirectory[String(deal.accountId || deal.customerId || '')]
    || accountNameDirectory[normalizeSearchValue(deal.accountName || deal.companyName || deal.customerName || '')]
    || null
  )
  const linkedCustomer = customerDirectory[String(deal.customerId || '')] || null

  const rawOwnerName = (
    deal.dealOwnerDisplay
    || deal.dealOwnerName
    || deal.dealOwner
    || deal.ownerName
    || deal.assignedUserName
    || ''
  )
  const ownerUserId = String(
    deal.ownerUserId
    || deal.ownerId
    || deal.assignedTo
    || deal.assignedUserId
    || deal.userId
    || getApiIntegerId(deal.dealOwner)
    || userIdByName[normalizeSearchValue(getCrmOwnerDisplay(rawOwnerName) || rawOwnerName)]
    || userIdByName[normalizeSearchValue(rawOwnerName)]
    || ''
  )
  const ownerName = (
    deal.dealOwnerDisplay
    || userDirectory[ownerUserId]
    || getCrmOwnerDisplay(deal.dealOwnerName || deal.dealOwner || deal.ownerName || '')
    || deal.dealOwner
    || deal.ownerName
    || deal.assignedUserName
    || currentUser?.name
    || 'Unassigned'
  )
  const addedByName = (
    deal.addedByName
    || deal.createdByName
    || userDirectory[String(deal.createdBy || '')]
    || ownerName
  )

  return {
    ...deal,
    id: deal.id,
    linkedAccountId: String(linkedAccount?.id || deal.accountId || ''),
    companyName: deal.companyName || linkedAccount?.company || linkedAccount?.name || '',
    dealNumber: deal.dealNumber || '',
    dealName: deal.name || deal.title || '',
    dealDate: deal.dealDate || deal.createdAt || '',
    dealValue: normalizeOptionalNumberInput(deal.value),
    dealScore: normalizeOptionalNumberInput(deal.dealScore),
    probability: normalizeOptionalNumberInput(deal.probability),
    addedBy: addedByName,
    lastUpdated: deal.updatedAt || deal.createdAt || '',
    createdAt: deal.createdAt || '',
    customerName: deal.customerName || linkedCustomer?.customerName || linkedAccount?.customerName || linkedAccount?.name || '',
    customerNumber: deal.customerNumber || linkedCustomer?.customerNumber || linkedAccount?.accountNumber || '',
    dealType: deal.dealType || deal.customerCategory || linkedAccount?.accountCategory || '',
    dealStatus: getAllowedManageDealStatusOption(deal.status || deal.stage || 'new').value,
    stage: deal.stage || getAllowedManageDealStatusOption(deal.status || 'new').stageKey,
    dealOwner: ownerName,
    ownerUserId,
    dealSource: deal.dealSource || deal.source || linkedAccount?.accountSource || '',
    dealSubsource: deal.dealSubsource || deal.subsource || linkedAccount?.accountSubsource || '',
    contactName: deal.contactPerson || deal.contactName || linkedAccount?.contactPerson || '',
    phone: deal.contactMobile || deal.contactPhone || linkedAccount?.contactMobile || linkedAccount?.contactPhone || linkedAccount?.phone || '',
    email: deal.contactEmail || deal.email || linkedAccount?.contactEmail || linkedAccount?.email || '',
    address: deal.address || linkedAccount?.address || linkedCustomer?.address || '',
    description: deal.description || deal.remark || '',
    poValue: normalizeOptionalNumberInput(deal.poValue),
    customerReferenceDate: deal.customerReferenceDate || getTodayInputValue(),
    productCategory: deal.productCategory || deal.customerCategory || linkedAccount?.accountCategory || '',
    customerReferenceNumber: deal.customerReferenceNumber || '',
    consultantName: deal.consultantName || linkedAccount?.consultantName || '',
    gstin: deal.gstin || linkedAccount?.gstin || '',
    projectName: deal.projectName || linkedAccount?.projectName || '',
    projectStatus: deal.projectStatus || linkedAccount?.projectStatus || '',
    orderCustomerStatus: deal.orderCustomerStatus || '',
    reasonForLostOrder: normalizeLostOrderReason(deal.reasonForLostOrder || deal.reasonForLost),
    jobNo: deal.jobNo || linkedAccount?.jobNo || '',
    quotationCustomerStatus: deal.quotationCustomerStatus || '',
    expectedClosureDate: deal.expectedClosureDate || deal.closeDate || addDaysToInputValue(5),
    actualClosureDate: deal.actualClosureDate || getTodayInputValue(),
    ageing: formatAgeingValue(deal.dealDate || deal.createdAt, deal.actualClosureDate || ''),
  }
}

const buildFormState = (deal) => ({
  dealName: deal.dealName || '',
  customerName: deal.customerName || '',
  customerNumber: deal.customerNumber || '',
  dealDate: toDateInputValue(deal.dealDate),
  dealType: deal.dealType || '',
  dealOwnerId: String(deal.ownerUserId || ''),
  dealValue: toNumberInputValue(deal.dealValue),
  dealScore: toNumberInputValue(deal.dealScore),
  probability: toNumberInputValue(deal.probability),
  expectedClosureDate: toDateInputValue(deal.expectedClosureDate) || addDaysToInputValue(5),
  dealStatus: getAllowedManageDealStatusOption(deal.dealStatus || deal.stage || 'new').value,
  dealStage: deal.stage || getAllowedManageDealStatusOption(deal.dealStatus || 'new').stageKey,
  contactName: deal.contactName || '',
  phone: deal.phone || '',
  email: deal.email || '',
  actualClosureDate: toDateInputValue(deal.actualClosureDate) || getTodayInputValue(),
  description: deal.description || '',
  address: deal.address || '',
  dealSource: deal.dealSource || '',
  dealSubsource: deal.dealSubsource || '',
  poValue: toNumberInputValue(deal.poValue),
  customerReferenceDate: toDateInputValue(deal.customerReferenceDate) || getTodayInputValue(),
  projectName: deal.projectName || '',
  projectStatus: deal.projectStatus || '',
  orderCustomerStatus: deal.orderCustomerStatus || '',
  reasonForLostOrder: normalizeLostOrderReason(deal.reasonForLostOrder || deal.reasonForLost),
  productCategory: deal.productCategory || '',
  customerReferenceNumber: deal.customerReferenceNumber || '',
  jobNo: deal.jobNo || '',
  consultantName: deal.consultantName || '',
  gstin: deal.gstin || '',
  quotationCustomerStatus: deal.quotationCustomerStatus || '',
})

const buildStageOptions = (dealStage = '') => {
  const optionMap = new Map(BASE_STAGE_OPTIONS.map((entry) => [entry.value, entry.label]))
  const selectedOption = getAllowedManageDealStatusOption(dealStage)
  if (dealStage && selectedOption.stageKey === dealStage && !optionMap.has(dealStage)) {
    optionMap.set(dealStage, titleize(dealStage))
  }

  return Array.from(optionMap.entries()).map(([value, label]) => ({ value, label }))
}

const AdminManageDealPage = () => {
  const { dealId } = useParams()
  const navigate = useNavigate()
  const location = useLocation()
  const { deals, accounts, updateDeal, createTask, addNotification } = useData()
  const { user } = useAuth()
  const [isActionsMenuOpen, setIsActionsMenuOpen] = useState(false)
  const [isEditing, setIsEditing] = useState(false)
  const [editingFieldKey, setEditingFieldKey] = useState('')
  const [isSaving, setIsSaving] = useState(false)
  const [formError, setFormError] = useState('')
  const [formState, setFormState] = useState(() => buildFormState({}))
  const [savedDealOverride, setSavedDealOverride] = useState(null)
  const [isChangeTypeOpen, setIsChangeTypeOpen] = useState(false)
  const [changeTypeValue, setChangeTypeValue] = useState('')
  const [isReminderOpen, setIsReminderOpen] = useState(false)
  const [reminderForm, setReminderForm] = useState(() => ({
    reminderDate: getTodayInputValue(),
    reminderTime: '09:00',
    reminderMode: REMINDER_MODE_OPTIONS[0],
    reminderNote: '',
    createTask: true,
  }))
  const [isSavingReminder, setIsSavingReminder] = useState(false)
  const actionsMenuRef = useRef(null)
  const loadedDealFormIdRef = useRef('')

  useEffect(() => {
    if (!isActionsMenuOpen) return undefined

    const handlePointerDown = (event) => {
      if (actionsMenuRef.current && !actionsMenuRef.current.contains(event.target)) {
        setIsActionsMenuOpen(false)
      }
    }

    document.addEventListener('mousedown', handlePointerDown)
    document.addEventListener('touchstart', handlePointerDown)

    return () => {
      document.removeEventListener('mousedown', handlePointerDown)
      document.removeEventListener('touchstart', handlePointerDown)
    }
  }, [isActionsMenuOpen])

  const availableUsers = useMemo(
    () => authService.getAvailableUsers().filter((entry) => entry.name !== 'System Administrator'),
    []
  )
  const customers = useMemo(() => customerService.getCustomers(), [])

  const sourceDeal = useMemo(() => {
    if (savedDealOverride && String(savedDealOverride.id) === String(dealId)) {
      return savedDealOverride
    }

    const liveDeal = deals.find((entry) => String(entry.id) === String(dealId)) || null
    if (liveDeal) return liveDeal

    const stateDeal = location.state?.dealSnapshot
    if (stateDeal && String(stateDeal.id) === String(dealId)) {
      return stateDeal
    }

    return null
  }, [dealId, deals, location.state, savedDealOverride])

  useEffect(() => {
    setSavedDealOverride(null)
  }, [dealId])

  const deal = useMemo(
    () => buildNormalizedDeal({
      deal: sourceDeal,
      accounts,
      customers,
      users: availableUsers,
      currentUser: user,
    }),
    [accounts, availableUsers, customers, sourceDeal, user]
  )

  useEffect(() => {
    if (!deal) return
    if (loadedDealFormIdRef.current === String(deal.id || '')) return

    setFormState(buildFormState(deal))
    setFormError('')
    setIsEditing(false)
    loadedDealFormIdRef.current = String(deal.id || '')
  }, [deal])

  const fromPath = location.state?.fromPath || '/admin/deals/view'
  const isUserDealRoute = location.pathname.startsWith('/deals/')
  const buildDealActionUrl = (actionKey) => {
    if (!deal?.id) return ''
    if (!isUserDealRoute) return buildCrmDealActionUrl(actionKey, deal.id, fromPath)

    const params = new URLSearchParams({ module: 'deal', dealId: String(deal.id), returnTo: fromPath })
    return `/deals/actions/${actionKey}?${params.toString()}`
  }

  const handleClose = () => {
    navigate(fromPath)
  }

  const handleOpenLinkedAccount = () => {
    if (!deal?.linkedAccountId) return
    navigate(buildAdminAccountsBoardUrl('myGroup', `?accountId=${encodeURIComponent(deal.linkedAccountId)}`))
  }

  const handleSendMail = () => {
    if (!deal?.id) return
    navigate(buildDealActionUrl('send-mail'))
  }

  const navigateBackWithAction = (actionKey) => {
    if (!deal?.id) return
    navigate(fromPath, { state: { dealActionKey: actionKey, dealActionId: deal.id } })
  }

  const handleOpenReminder = () => {
    if (!deal) return
    setReminderForm({
      reminderDate: deal.reminderDate || getTodayInputValue(),
      reminderTime: deal.reminderTime || '09:00',
      reminderMode: deal.reminderMode || REMINDER_MODE_OPTIONS[0],
      reminderNote: deal.reminderNote || '',
      createTask: true,
    })
    setIsReminderOpen(true)
  }

  const handleCloseReminder = () => {
    setIsReminderOpen(false)
    setIsSavingReminder(false)
    setReminderForm({
      reminderDate: getTodayInputValue(),
      reminderTime: '09:00',
      reminderMode: REMINDER_MODE_OPTIONS[0],
      reminderNote: '',
      createTask: true,
    })
  }

  const handleSaveReminder = async (event) => {
    event.preventDefault()
    if (!deal?.id || !reminderForm.reminderDate) return

    setIsSavingReminder(true)
    const reminderTime = reminderForm.reminderTime || '09:00'
    const remindAt = `${reminderForm.reminderDate}T${reminderTime}:00`
    const reminderTitle = `${deal.dealName || deal.name || 'Deal'} reminder`
    const assignedTo = deal.assignedTo || deal.ownerUserId || deal.userId || user?.id || ''

    const result = await updateDeal(deal.id, {
      reminderDate: reminderForm.reminderDate,
      reminderTime,
      reminderMode: reminderForm.reminderMode,
      reminderNote: reminderForm.reminderNote.trim(),
    })

    if (!result.success) {
      const errorMsg = parseAndDeduplicateMessages(result.message, 'Unable to save reminder.')
      setIsSavingReminder(false)
      setFormError(errorMsg)
      addNotification('error', 'Add Reminder', errorMsg)
      return
    }

    const reminderNote = reminderForm.reminderNote.trim()
    const taskPayload = {
      title: reminderTitle,
      description: [
        `${reminderForm.reminderMode} reminder for ${deal.dealName || deal.dealNumber || 'deal'}.`,
        reminderNote,
      ].filter(Boolean).join('\n'),
      status: 'pending',
      priority: 'medium',
      dueDate: reminderForm.reminderDate,
      relatedEntityType: 'deal',
      relatedEntityId: deal.id,
      assignedTo,
    }

    const [reminderResult, calendarResult, taskResult] = await Promise.allSettled([
      reminderApi.createReminder({
        title: reminderTitle,
        message: reminderNote,
        remindAt,
        status: 'scheduled',
        relatedEntityType: 'deal',
        relatedEntityId: deal.id,
        assignedTo,
        reminderDate: reminderForm.reminderDate,
        reminderTime,
        reminderMode: reminderForm.reminderMode,
      }),
      calendarApi.createEvent({
        title: reminderTitle,
        description: reminderNote,
        startAt: remindAt,
        category: 'Reminder',
        relatedEntityType: 'deal',
        relatedEntityId: deal.id,
        assignedTo,
      }),
      reminderForm.createTask
        ? createTask(taskPayload)
        : Promise.resolve({ success: true, data: null }),
    ])

    const linkedTask = taskResult.status === 'fulfilled' && taskResult.value?.success
      ? taskResult.value.data
      : null

    addStandaloneReminder({
      title: reminderTitle,
      reminderDate: reminderForm.reminderDate,
      reminderTime,
      reminderMode: reminderForm.reminderMode,
      note: reminderNote,
      createdBy: user?.name || '',
      linkedTaskId: linkedTask?.id || '',
      relatedEntityType: 'deal',
      relatedEntityId: deal.id,
    })

    setIsSavingReminder(false)
    const reminderFailed = reminderResult.status === 'rejected'
    const calendarFailed = calendarResult.status === 'rejected'
    const taskFailed = reminderForm.createTask && (
      taskResult.status === 'rejected' || taskResult.value?.success === false
    )

    if (taskFailed) {
      addNotification('warning', 'Add Reminder', 'Reminder saved, but the task list link could not be created.')
    } else if (reminderFailed || calendarFailed) {
      addNotification('warning', 'Add Reminder', 'Reminder saved locally, but one linked service did not finish.')
    } else {
      addNotification('success', 'Add Reminder', reminderForm.createTask
        ? 'Deal reminder saved and added to the task list.'
        : 'Deal reminder saved successfully.')
    }
    handleCloseReminder()
  }

  const handleOpenChangeType = () => {
    if (!activeDeal) return
    setChangeTypeValue(activeDeal.dealType || '')
    setIsChangeTypeOpen(true)
  }

  const handleCloseChangeType = () => {
    setIsChangeTypeOpen(false)
    setChangeTypeValue('')
  }

  const handleSaveDealType = async (event) => {
    event.preventDefault()
    if (!deal?.id) return

    const nextDealType = String(changeTypeValue || '').trim()
    if (!nextDealType) {
      addNotification('error', 'Change Type', 'Please select a deal type.')
      return
    }

    setIsSaving(true)
    const result = await updateDeal(deal.id, {
      dealType: nextDealType,
      customerCategory: nextDealType,
      updatedAt: new Date().toISOString(),
    })
    setIsSaving(false)

    if (!result.success) {
      const errorMsg = parseAndDeduplicateMessages(result.message, 'Unable to change deal type.')
      addNotification('error', 'Change Type', errorMsg)
      return
    }

    setFormState((currentValue) => ({ ...currentValue, dealType: nextDealType }))
    handleCloseChangeType()
    addNotification('success', 'Change Type', `Deal type changed to ${nextDealType}.`)
  }

  const handleGenerateQuotation = () => {
    if (!activeDeal) return

    navigate('/admin/quotations', {
      state: {
        openGenerator: true,
        preselectedDeal: sourceDeal || activeDeal,
      },
    })
  }

  const handleUploadQuotation = () => {
    if (!activeDeal?.id) return
    navigate(buildDealActionUrl('upload-deal-quotation'))
  }

  const handleReassignDeal = () => {
    if (!activeDeal?.id) return
    navigate(buildDealActionUrl('re-assign-deal'))
  }

  const handleChangeStatus = () => {
    if (!activeDeal?.id) return
    navigate(buildDealActionUrl('change-status'))
  }

  const handleStartEditing = () => {
    if (!deal) return
    setFormState(buildFormState(deal))
    setFormError('')
    setIsEditing(true)
    setEditingFieldKey('')
    setIsActionsMenuOpen(false)
  }

  const handleStartFieldEditing = (fieldKey) => {
    if (!deal) return
    setFormState(buildFormState(deal))
    setFormError('')
    setIsEditing(false)
    setEditingFieldKey(fieldKey)
    setIsActionsMenuOpen(false)
  }

  const handleCancelEditing = () => {
    if (deal) {
      setFormState(buildFormState(deal))
    }
    setFormError('')
    setIsEditing(false)
    setEditingFieldKey('')
  }

  const handleFieldChange = (fieldKey, value) => {
    setFormError('')
    setFormState((currentValue) => {
      if (fieldKey === 'dealStatus') {
        const selectedStatus = getAllowedManageDealStatusOption(value)
        return {
          ...currentValue,
          dealStatus: selectedStatus.value,
          dealStage: selectedStatus.stageKey,
        }
      }

      if (fieldKey === 'dealStage') {
        const selectedStatus = getAllowedManageDealStatusOption(value)
        return {
          ...currentValue,
          dealStatus: selectedStatus.value,
          dealStage: selectedStatus.stageKey,
        }
      }

      return {
        ...currentValue,
        [fieldKey]: value,
      }
    })
  }

  const selectedOwner = useMemo(
    () => availableUsers.find((entry) => String(entry.id) === String(formState.dealOwnerId)) || null,
    [availableUsers, formState.dealOwnerId]
  )

  const previewDeal = useMemo(() => {
    if (!deal) return null

    const previewDealValue = normalizeOptionalNumberInput(formState.dealValue)
    const previewDealScore = normalizeOptionalNumberInput(formState.dealScore)
    const previewProbability = normalizeOptionalNumberInput(formState.probability)
    const previewPoValue = normalizeOptionalNumberInput(formState.poValue)
    const previewActualClosureDate = formState.actualClosureDate
      || (isClosedDealSelection(formState.dealStatus, formState.dealStage) ? getTodayInputValue() : '')

    return {
      ...deal,
      dealName: formState.dealName,
      customerName: formState.customerName,
      customerNumber: formState.customerNumber,
      dealDate: formState.dealDate,
      dealType: formState.dealType,
      dealOwner: selectedOwner?.ownerDisplayName || getCrmOwnerDisplay(selectedOwner?.name || deal.dealOwner || ''),
      dealValue: previewDealValue,
      dealScore: previewDealScore,
      probability: previewProbability,
      expectedClosureDate: formState.expectedClosureDate,
      dealStatus: getAllowedManageDealStatusOption(formState.dealStatus).label,
      status: formState.dealStatus,
      stage: formState.dealStage,
      contactName: formState.contactName,
      phone: formState.phone,
      email: formState.email,
      actualClosureDate: previewActualClosureDate,
      description: formState.description,
      address: formState.address,
      dealSource: formState.dealSource,
      dealSubsource: formState.dealSubsource,
      poValue: previewPoValue,
      customerReferenceDate: formState.customerReferenceDate,
      projectName: formState.projectName,
      projectStatus: formState.projectStatus,
      orderCustomerStatus: formState.orderCustomerStatus,
      reasonForLostOrder: formState.reasonForLostOrder,
      productCategory: formState.productCategory,
      customerReferenceNumber: formState.customerReferenceNumber,
      jobNo: formState.jobNo,
      consultantName: formState.consultantName,
      gstin: formState.gstin,
      quotationCustomerStatus: formState.quotationCustomerStatus,
      ageing: formatAgeingValue(formState.dealDate, previewActualClosureDate),
    }
  }, [deal, formState, selectedOwner?.name, selectedOwner?.ownerDisplayName])

  const activeDeal = isEditing && previewDeal ? previewDeal : deal
  const timelineSteps = useMemo(() => buildTimelineSteps(activeDeal || {}), [activeDeal])
  const stageOptions = useMemo(() => buildStageOptions(formState.dealStage), [formState.dealStage])

  const handleSave = async () => {
    if (!deal?.id) return
    if (isSaving) return

    const normalizedDealValue = normalizeOptionalNumberInput(formState.dealValue)
    const normalizedDealScore = normalizeOptionalNumberInput(formState.dealScore)
    const normalizedProbability = normalizeOptionalNumberInput(formState.probability)
    const normalizedPoValue = normalizeOptionalNumberInput(formState.poValue)

    if (!String(formState.dealName || '').trim()) {
      setFormError('Deal Name is required before saving.')
      return
    }

    if (normalizedDealValue === null) {
      setFormError('Deal Value is required before saving.')
      return
    }

    if (!String(formState.dealOwnerId || '').trim()) {
      setFormError('Deal Owner is required before saving.')
      return
    }

    if (formState.dealDate && formState.expectedClosureDate && formState.expectedClosureDate < formState.dealDate) {
      setFormError('Expected Closure Date should not be older than Deal Date.')
      return
    }

    if (normalizedProbability !== null && (normalizedProbability < 1 || normalizedProbability > 100)) {
      setFormError('Probability must be between 1 and 100.')
      return
    }

    const resolvedOwner = availableUsers.find((entry) => String(entry.id) === String(formState.dealOwnerId)) || selectedOwner
    const resolvedOwnerId = String(
      resolvedOwner?.id
      || deal.ownerUserId
      || deal.userId
      || user?.id
      || ''
    )
    const resolvedOwnerName = resolvedOwner?.name || deal.dealOwnerName || deal.dealOwner || user?.name || 'Unassigned'
    const apiOwnerId = getApiIntegerId(resolvedOwnerId)
    const resolvedActualClosureDate = formState.actualClosureDate
      || (isClosedDealSelection(formState.dealStatus, formState.dealStage) ? getTodayInputValue() : '')

    const updates = {
      name: formState.dealName.trim(),
      customerName: formState.customerName.trim(),
      dealDate: formState.dealDate,
      dealType: formState.dealType.trim(),
      value: normalizedDealValue,
      dealScore: normalizedDealScore,
      probability: normalizedProbability,
      expectedClosureDate: formState.expectedClosureDate,
      closeDate: formState.expectedClosureDate,
      actualClosureDate: resolvedActualClosureDate,
      status: getAllowedManageDealStatusOption(formState.dealStatus).value,
      stage: getAllowedManageDealStatusOption(formState.dealStage).stageKey,
      statusLabel: getAllowedManageDealStatusOption(formState.dealStatus).label,
      description: formState.description.trim(),
      address: formState.address.trim(),
      contactPerson: formState.contactName.trim(),
      contactName: formState.contactName.trim(),
      contactMobile: formState.phone.trim(),
      phone: formState.phone.trim(),
      contactEmail: formState.email.trim(),
      email: formState.email.trim(),
      dealSource: formState.dealSource.trim(),
      source: formState.dealSource.trim(),
      dealSubsource: formState.dealSubsource.trim(),
      subsource: formState.dealSubsource.trim(),
      poValue: normalizedPoValue,
      customerReferenceDate: formState.customerReferenceDate,
      projectName: formState.projectName.trim(),
      projectStatus: formState.projectStatus.trim(),
      orderCustomerStatus: formState.orderCustomerStatus.trim(),
      reasonForLostOrder: normalizeLostOrderReason(formState.reasonForLostOrder),
      reasonForLost: normalizeLostOrderReason(formState.reasonForLostOrder),
      productCategory: formState.productCategory.trim(),
      customerReferenceNumber: formState.customerReferenceNumber.trim(),
      jobNo: formState.jobNo.trim(),
      consultantName: formState.consultantName.trim(),
      gstin: formState.gstin.trim(),
      quotationCustomerStatus: formState.quotationCustomerStatus.trim(),
      ...(apiOwnerId ? {
        ownerUserId: apiOwnerId,
        ownerId: apiOwnerId,
        assignedTo: apiOwnerId,
        assignedUserId: apiOwnerId,
      } : {}),
      userId: resolvedOwnerId,
      dealOwner: getCrmOwnerDisplay(resolvedOwnerName) || resolvedOwnerName,
      ownerName: getCrmOwnerDisplay(resolvedOwnerName) || resolvedOwnerName,
      assignedUserName: getCrmOwnerDisplay(resolvedOwnerName) || resolvedOwnerName,
    }

    setIsSaving(true)
    setFormError('')

    const result = await updateDeal(deal.id, updates)

    setIsSaving(false)

    if (!result.success) {
      const errorMsg = parseAndDeduplicateMessages(result.message, 'Unable to update deal details.')
      setFormError(errorMsg)
      addNotification('error', 'Update Deal', errorMsg)
      return
    }

    const normalizedSavedDeal = buildNormalizedDeal({
      deal: result.data,
      accounts,
      customers,
      users: availableUsers,
      currentUser: user,
    })

    setSavedDealOverride(normalizedSavedDeal)
    setFormState(buildFormState(normalizedSavedDeal))
    setIsEditing(false)
    setEditingFieldKey('')
    addNotification('success', 'Update Deal', 'Deal details updated successfully.')
  }

  const handleInlineEditorKeyDown = (event) => {
    if (isSaving) return

    if (event.key === 'Escape') {
      event.preventDefault()
      handleCancelEditing()
      return
    }

    const isTextArea = event.currentTarget?.tagName === 'TEXTAREA'
    const shouldSave = event.key === 'Enter' && (!isTextArea || event.ctrlKey || event.metaKey)
    if (!shouldSave) return

    event.preventDefault()
    handleSave()
  }

  const actionsMenuItems = [
    { key: 'reminder', label: 'Add Reminder', icon: <FaBell />, accent: 'orange', onSelect: handleOpenReminder },
    { key: 'changeStatus', label: 'Change Status', icon: <FaExchangeAlt />, accent: 'blue', onSelect: handleChangeStatus },
    { key: 'generateQuotation', label: 'Generate Quotation', icon: <FaFileAlt />, accent: 'blue', onSelect: handleGenerateQuotation },
    { key: 'uploadQuotation', label: 'Upload Quotation', icon: <FaFileUpload />, accent: 'blue', onSelect: handleUploadQuotation },
    { key: 'changeType', label: 'Change Type', icon: <FaExchangeAlt />, accent: 'blue', onSelect: handleOpenChangeType },
    { key: 'reassign', label: 'Re-Assign Deal', icon: <FaUserCog />, accent: 'slate', onSelect: handleReassignDeal },
    { key: 'sendMail', label: 'Send Mail', icon: <FaEnvelope />, accent: 'blue', onSelect: handleSendMail },
    { key: 'delete', label: 'Delete Deal', icon: <FaTrash />, accent: 'danger', onSelect: () => navigateBackWithAction('delete') },
  ]

  const handleActionsItemClick = (item) => {
    setIsActionsMenuOpen(false)
    item.onSelect()
  }

  const getDisplayValue = (field) => {
    if (!activeDeal) return ''

    const getOptionLabel = (options, value) => {
      const normalizedValue = String(value || '')
      if (!normalizedValue) return ''
      return options.find((option) => String(option.value) === normalizedValue)?.label || titleize(normalizedValue)
    }

    switch (field.key) {
      case 'dealDate':
      case 'expectedClosureDate':
      case 'actualClosureDate':
      case 'customerReferenceDate':
        return activeDeal[field.key] ? formatDate(activeDeal[field.key]) : ''
      case 'lastUpdated':
        return formatDateTimeValue(activeDeal.lastUpdated)
      case 'dealValue':
      case 'poValue':
        return formatCurrencyValue(activeDeal[field.key])
      case 'dealScore':
        return hasDisplayValue(activeDeal.dealScore) ? formatNumber(Number(activeDeal.dealScore || 0)) : ''
      case 'probability':
        return hasDisplayValue(activeDeal.probability) ? `${formatNumber(Number(activeDeal.probability || 0))}%` : ''
      case 'dealOwnerId':
        return availableUsers.find((entry) => String(entry.id) === String(activeDeal.dealOwnerId || ''))?.ownerDisplayName
          || availableUsers.find((entry) => String(entry.id) === String(activeDeal.dealOwnerId || ''))?.name
          || activeDeal.dealOwner
          || ''
      case 'dealStatus':
        return getAllowedManageDealStatusOption(activeDeal.dealStatus).label
      case 'dealStage':
        return getOptionLabel(stageOptions, activeDeal.dealStage)
      case 'orderCustomerStatus':
        return getOptionLabel(MANAGE_DEAL_LIFECYCLE_STATUS_OPTIONS, activeDeal.orderCustomerStatus)
      case 'quotationCustomerStatus':
        return getOptionLabel(CUSTOMER_QUOTATION_STATUS_OPTIONS, activeDeal.quotationCustomerStatus)
      case 'dealSource':
        return getOptionLabel(DEAL_SOURCE_SELECT_OPTIONS, activeDeal.dealSource)
      case 'dealSubsource':
        return getOptionLabel(DEAL_SUBSOURCE_SELECT_OPTIONS, activeDeal.dealSubsource)
      case 'productCategory':
        return getOptionLabel(PRODUCT_CATEGORY_SELECT_OPTIONS, activeDeal.productCategory)
      case 'reasonForLostOrder':
        return getLostOrderReasonLabel(activeDeal.reasonForLostOrder)
      default:
        return activeDeal[field.key]
    }
  }

  const renderFieldInput = (field) => {
    if (field.readOnly) return null

    if (field.key === 'probability') {
      return (
        <div className="admin-manage-deal-probability-editor">
          <input
            type="range"
            min="1"
            max="100"
            step="1"
            value={formState.probability === '' ? 1 : formState.probability}
            onChange={(event) => handleFieldChange('probability', event.target.value)}
            className="admin-manage-deal-probability-slider"
            aria-label="Deal probability"
          />
          <span className="admin-manage-deal-probability-value">
            {formState.probability === '' ? '1%' : `${formState.probability}%`}
          </span>
        </div>
      )
    }

    if (field.inputType === 'select') {
      const baseOptions = field.options
        || (field.key === 'dealStatus'
          ? STATUS_OPTIONS
          : field.key === 'dealOwnerId'
            ? availableUsers.map((entry) => ({ value: String(entry.id), label: entry.ownerDisplayName || entry.name }))
            : stageOptions)
      const currentValue = String(formState[field.key] || '')
      const hasCurrentValue = !currentValue || baseOptions.some((option) => String(option.value) === currentValue)
      const shouldAppendCurrentOption = field.key !== 'dealStatus'
      const options = hasCurrentValue || !shouldAppendCurrentOption
        ? baseOptions
        : [...baseOptions, { value: currentValue, label: titleize(currentValue) }]

      return (
        <select
          value={formState[field.key]}
          onChange={(event) => handleFieldChange(field.key, event.target.value)}
          onKeyDown={handleInlineEditorKeyDown}
        >
          {field.placeholder ? <option value="">{field.placeholder}</option> : null}
          {options.map((option) => (
            <option key={`${field.key}-${option.value}`} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      )
    }

    if (field.inputType === 'datalist') {
      const options = field.options || []
      const listId = `datalist-${field.key}`
      return (
        <>
          <input
            type="text"
            list={listId}
            value={formState[field.key] || ''}
            onChange={(event) => handleFieldChange(field.key, event.target.value)}
            placeholder={field.placeholder || ''}
            className="admin-manage-deal-form-input"
            onKeyDown={handleInlineEditorKeyDown}
          />
          <datalist id={listId}>
            {options.map((option) => (
              option.value ? (
                <option key={`${field.key}-${option.value}`} value={option.value}>
                  {option.label}
                </option>
              ) : null
            ))}
          </datalist>
        </>
      )
    }

    if (field.inputType === 'textarea') {
      return (
        <textarea
          rows={field.rows || 4}
          value={formState[field.key]}
          onChange={(event) => handleFieldChange(field.key, event.target.value)}
          onKeyDown={handleInlineEditorKeyDown}
        />
      )
    }

    return (
      <input
        type={field.inputType || 'text'}
        min={field.min}
        max={field.max}
        value={formState[field.key]}
        onChange={(event) => handleFieldChange(field.key, event.target.value)}
        onKeyDown={handleInlineEditorKeyDown}
      />
    )
  }

  const renderFieldValue = (field) => {
    const displayValue = getDisplayValue(field)
    const hasValue = hasDisplayValue(displayValue)

    if (field.key === 'email' && hasValue) {
      return (
        <div className="admin-manage-deal-value-with-action">
          <span className="admin-manage-deal-field-value">{displayValue}</span>
          <button
            type="button"
            className="admin-manage-deal-inline-icon"
            onClick={handleSendMail}
            aria-label="Send email"
            title="Send email"
          >
            <FaEnvelope />
          </button>
        </div>
      )
    }

    return (
      <span className={`admin-manage-deal-field-value ${hasValue ? '' : 'admin-manage-deal-field-value-empty'}`}>
        {hasValue ? displayValue : '-'}
      </span>
    )
  }

  const renderDataField = (field) => (
    <div key={field.key} className={`admin-manage-deal-field ${field.wide ? 'admin-manage-deal-field-wide' : ''}`}>
      <div className="admin-manage-deal-field-label">
        {field.icon ? <span className="admin-manage-deal-field-label-icon">{field.icon}</span> : null}
        <span>{field.label}</span>
        {!field.readOnly && !isEditing && editingFieldKey !== field.key ? (
          <button
            type="button"
            className="admin-manage-deal-field-edit"
            onClick={() => handleStartFieldEditing(field.key)}
            aria-label={`Edit ${field.label}`}
            title={`Edit ${field.label}`}
          >
            <FaEdit />
          </button>
        ) : null}
      </div>
      <div className="admin-manage-deal-field-control">
        {(isEditing || editingFieldKey === field.key) && !field.readOnly ? renderFieldInput(field) : renderFieldValue(field)}
        {editingFieldKey === field.key ? (
          <div className="admin-manage-deal-inline-edit-actions">
            <button type="button" onClick={handleCancelEditing} disabled={isSaving}>Cancel</button>
            <button type="button" onClick={handleSave} disabled={isSaving}>{isSaving ? 'Saving...' : 'Save'}</button>
          </div>
        ) : null}
      </div>
    </div>
  )

  if (!deal) {
    return (
      <div className="admin-manage-deal-page">
        <div className="admin-manage-deal-shell">
          <div className="admin-manage-deal-workspace">
            <div className="admin-manage-deal-header">
              <div className="admin-manage-deal-header-copy">
                <h1>Deal Not Found</h1>
              </div>
              <button type="button" className="admin-manage-deal-close" onClick={handleClose} aria-label="Close deal details">
                <FaTimes />
              </button>
            </div>
            <div className="admin-manage-deal-empty">
              The requested deal could not be found.
            </div>
            <div className="admin-manage-deal-footer-actions">
              <Button type="button" variant="outline" onClick={handleClose}>
                Back To Deals
              </Button>
            </div>
          </div>
        </div>
      </div>
    )
  }

  const currentStageLabel = timelineSteps[timelineSteps.length - 1]?.label || 'New'
  const metricFields = [
    { key: 'dealName', label: 'Deal Name', inputType: 'text' },
    { key: 'customerName', label: 'Customer', inputType: 'text' },
    { key: 'dealDate', label: 'Deal Date', inputType: 'date' },
    { key: 'dealType', label: 'Deal Type', inputType: 'text' },
    { key: 'dealOwnerId', label: 'Deal Owner', inputType: 'select' },
    { key: 'dealValue', label: 'Deal Value', inputType: 'number', min: '0' },
    { key: 'dealScore', label: 'Deal Score', inputType: 'number', min: '0' },
    { key: 'probability', label: 'Probability', inputType: 'range', min: '1', max: '100' },
    { key: 'expectedClosureDate', label: 'Expected Closure Date', inputType: 'date' },
    { key: 'dealStatus', label: 'Change Status', inputType: 'select' },
  ]
  const customerFields = [
    { key: 'customerNumber', label: 'Customer No.', icon: <FaUser />, readOnly: true },
    { key: 'contactName', label: 'Contact Person', icon: <FaUser />, inputType: 'text' },
    { key: 'phone', label: 'Mobile Number', icon: <FaPhone />, inputType: 'text' },
    { key: 'email', label: 'Email', icon: <FaEnvelope />, inputType: 'email' },
    { key: 'actualClosureDate', label: 'Actual Closure Date', icon: <FaCalendarAlt />, inputType: 'date' },
    { key: 'address', label: 'Address', icon: <FaMapMarkerAlt />, inputType: 'textarea', wide: true, rows: 3 },
    { key: 'lastUpdated', label: 'Last Updated', icon: <FaCalendarAlt />, readOnly: true },
    { key: 'ageing', label: 'Ageing', icon: <FaBell />, readOnly: true },
    { key: 'addedBy', label: 'Added By', icon: <FaUser />, readOnly: true },
    { key: 'dealSource', label: 'Deal Source', icon: <FaLink />, inputType: 'select', options: DEAL_SOURCE_SELECT_OPTIONS, placeholder: 'Select deal source' },
    { key: 'dealSubsource', label: 'Deal Subsource', icon: <FaLink />, inputType: 'select', options: DEAL_SUBSOURCE_SELECT_OPTIONS, placeholder: 'Select deal subsource' },
  ]
  const otherFields = [
    { key: 'poValue', label: 'PO Value', inputType: 'number', min: '0' },
    { key: 'customerReferenceDate', label: 'Customer Ref Date', inputType: 'date' },
    { key: 'projectName', label: 'Project Name', inputType: 'text' },
    { key: 'projectStatus', label: 'Project Status', inputType: 'select', options: [{value: 'Not Started', label: 'Not Started'}, {value: 'In Progress', label: 'In Progress'}, {value: 'Completed', label: 'Completed'}, {value: 'On Hold', label: 'On Hold'}] },
    {
      key: 'orderCustomerStatus',
      label: 'Status of Customer as per Order Received',
      inputType: 'select',
      options: MANAGE_DEAL_LIFECYCLE_STATUS_OPTIONS,
      placeholder: 'Select status',
    },
    {
      key: 'reasonForLostOrder',
      label: 'Lost Order Reason',
      inputType: 'select',
      options: LOST_ORDER_REASON_OPTIONS,
    },
    { key: 'productCategory', label: 'Product Category', inputType: 'select', options: PRODUCT_CATEGORY_SELECT_OPTIONS, placeholder: 'Select product category' },
    { key: 'customerReferenceNumber', label: 'Customer Ref No.', inputType: 'text' },
    { key: 'jobNo', label: 'Job No.', inputType: 'text' },
    { key: 'consultantName', label: 'Consultant Name', inputType: 'text' },
    { key: 'gstin', label: 'GSTIN', inputType: 'text' },
    {
      key: 'quotationCustomerStatus',
      label: 'Status of Customer as per Quotation Given',
      inputType: 'select',
      options: CUSTOMER_QUOTATION_STATUS_OPTIONS,
      placeholder: 'Select status',
    },
  ]

  return (
    <>
    <div className="admin-manage-deal-page">
      <div className="admin-manage-deal-shell">
        <article className="admin-manage-deal-workspace">
          <header className="admin-manage-deal-header">
            <div className="admin-manage-deal-header-copy">
              <div className="admin-manage-deal-eyebrow">Manage Deal</div>
              <div className="admin-manage-deal-header-meta">
                <span className="admin-manage-deal-chip">
                  <span>Deal No.</span>
                  <strong>{hasDisplayValue(activeDeal.dealNumber) ? activeDeal.dealNumber : '-'}</strong>
                </span>
                <span className="admin-manage-deal-chip">
                  <span>Current Stage</span>
                  <strong>{currentStageLabel}</strong>
                </span>
              </div>
            </div>

            <div className="admin-manage-deal-header-actions">
              {deal.linkedAccountId ? (
                <button
                  type="button"
                  className="admin-manage-deal-icon-button"
                  onClick={handleOpenLinkedAccount}
                  aria-label="Open linked account"
                  title="Open linked account"
                >
                  <FaLink />
                </button>
              ) : null}

              <button
                type="button"
                className="admin-manage-deal-icon-button"
                onClick={handleSendMail}
                aria-label="Send deal email"
                title="Send deal email"
              >
                <FaEnvelope />
              </button>

              {isEditing ? (
                <>
                  <Button type="button" variant="outline" onClick={handleCancelEditing} disabled={isSaving}>
                    <FaBan />
                    <span>Cancel</span>
                  </Button>
                  <Button type="button" onClick={handleSave} disabled={isSaving}>
                    <FaSave />
                    <span>{isSaving ? 'Saving...' : 'Save'}</span>
                  </Button>
                </>
              ) : null}

              <div className="admin-manage-deal-actions-menu" ref={actionsMenuRef}>
                <button
                  type="button"
                  className="admin-manage-deal-actions-trigger"
                  onClick={() => setIsActionsMenuOpen((value) => !value)}
                  aria-haspopup="menu"
                  aria-expanded={isActionsMenuOpen}
                >
                  <span>Actions</span>
                  <FaCaretDown />
                </button>

                {isActionsMenuOpen ? (
                  <div className="admin-manage-deal-actions-popup" role="menu">
                    {actionsMenuItems.map((item) => (
                      <button
                        key={item.key}
                        type="button"
                        role="menuitem"
                        className={`admin-manage-deal-actions-item admin-manage-deal-actions-item-${item.accent}`}
                        onClick={() => handleActionsItemClick(item)}
                      >
                        <span className="admin-manage-deal-actions-item-icon">{item.icon}</span>
                        <span>{item.label}</span>
                      </button>
                    ))}
                  </div>
                ) : null}
              </div>

              <button type="button" className="admin-manage-deal-close" onClick={handleClose} aria-label="Close manage deal page">
                <FaTimes />
              </button>
            </div>
          </header>

          {formError ? (
            <div className="admin-manage-deal-error">
              {formError}
            </div>
          ) : null}

          <section className="admin-manage-deal-metrics">
            {metricFields.map((field) => (
              <div key={field.key} className="admin-manage-deal-metric-card">
                <div className="admin-manage-deal-metric-label">{field.label}</div>
                {!isEditing && editingFieldKey !== field.key ? (
                  <button
                    type="button"
                    className="admin-manage-deal-metric-edit"
                    onClick={() => handleStartFieldEditing(field.key)}
                    aria-label={`Edit ${field.label}`}
                    title={`Edit ${field.label}`}
                  >
                    <FaEdit />
                  </button>
                ) : null}
                <div className="admin-manage-deal-metric-value">
                  {isEditing || editingFieldKey === field.key ? renderFieldInput(field) : renderFieldValue(field)}
                  {editingFieldKey === field.key ? (
                    <div className="admin-manage-deal-inline-edit-actions">
                      <button type="button" onClick={handleCancelEditing} disabled={isSaving}>Cancel</button>
                      <button type="button" onClick={handleSave} disabled={isSaving}>{isSaving ? 'Saving...' : 'Save'}</button>
                    </div>
                  ) : null}
                </div>
              </div>
            ))}
          </section>

          <section className="admin-manage-deal-panel admin-manage-deal-panel-timeline">
            <div className="admin-manage-deal-panel-header">
              <div>
                <h2>Deal Summary Timeline</h2>
                <p>Track the current stage progress for this deal.</p>
              </div>

              {isEditing ? (
                <div className="admin-manage-deal-stage-editor">
                  <label>
                    <span>Stage</span>
                    <select
                      value={formState.dealStage}
                      onChange={(event) => handleFieldChange('dealStage', event.target.value)}
                    >
                      {stageOptions.map((option) => (
                        <option key={`stage-${option.value}`} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                  </label>
                </div>
              ) : null}
            </div>

            <div className="admin-manage-deal-timeline">
              {timelineSteps.map((step, index) => (
                <React.Fragment key={step.key}>
                  <div className={`admin-manage-deal-timeline-step ${step.active ? 'admin-manage-deal-timeline-step-active' : ''}`}>
                    <div className="admin-manage-deal-timeline-dot" />
                    <div className="admin-manage-deal-timeline-copy">
                      <strong>{step.label}</strong>
                      <span>{step.actor || '-'}</span>
                      <time>{step.timestamp ? formatDateTimeValue(step.timestamp) : '-'}</time>
                    </div>
                  </div>
                  {index < timelineSteps.length - 1 ? (
                    <div className="admin-manage-deal-timeline-connector" aria-hidden="true" />
                  ) : null}
                </React.Fragment>
              ))}
            </div>
          </section>

          <div className="admin-manage-deal-fields-grid" style={{ paddingTop: '1rem', paddingBottom: '1rem' }}>
            {[...customerFields, ...otherFields].map(renderDataField)}
          </div>
        </article>
      </div>
    </div>
    <Modal
      isOpen={isReminderOpen}
      onClose={handleCloseReminder}
      title="Add Reminder"
      size="large"
    >
      <form className="admin-manage-deal-reminder-form" onSubmit={handleSaveReminder}>
        <div className="admin-manage-deal-reminder-heading">
          <span>Add Reminder</span>
          <strong>{activeDeal?.dealName || activeDeal?.dealNumber || 'Deal'}</strong>
          <small>{activeDeal?.dealNumber || ''}</small>
        </div>

        <div className="admin-manage-deal-reminder-grid">
          <label className="admin-manage-deal-reminder-field">
            <span>Reminder Date</span>
            <input
              type="date"
              value={reminderForm.reminderDate}
              onChange={(event) => setReminderForm((currentValue) => ({ ...currentValue, reminderDate: event.target.value }))}
              required
            />
          </label>
          <label className="admin-manage-deal-reminder-field">
            <span>Reminder Mode</span>
            <select
              value={reminderForm.reminderMode}
              onChange={(event) => setReminderForm((currentValue) => ({ ...currentValue, reminderMode: event.target.value }))}
            >
              {REMINDER_MODE_OPTIONS.map((option) => (
                <option key={option} value={option}>{option}</option>
              ))}
            </select>
          </label>
        </div>

        <div className="admin-manage-deal-reminder-times">
          <span>Reminder Time</span>
          <div className="admin-manage-deal-reminder-time-list">
            {REMINDER_TIME_OPTIONS.map((time) => (
              <button
                key={time}
                type="button"
                className={`admin-manage-deal-reminder-time${reminderForm.reminderTime === time ? ' admin-manage-deal-reminder-time-active' : ''}`}
                onClick={() => setReminderForm((currentValue) => ({ ...currentValue, reminderTime: time }))}
              >
                {time}
              </button>
            ))}
          </div>
          <label className="admin-manage-deal-reminder-field admin-manage-deal-reminder-field-full">
            <span>Other</span>
            <input
              type="time"
              value={reminderForm.reminderTime}
              onChange={(event) => setReminderForm((currentValue) => ({ ...currentValue, reminderTime: event.target.value }))}
            />
          </label>
        </div>

        <label className="admin-manage-deal-reminder-field admin-manage-deal-reminder-field-full">
          <span>Reminder Note</span>
          <textarea
            rows={4}
            value={reminderForm.reminderNote}
            onChange={(event) => setReminderForm((currentValue) => ({ ...currentValue, reminderNote: event.target.value }))}
            placeholder="Add reminder note here..."
          />
        </label>

        <label className="admin-manage-deal-reminder-task-link">
          <input
            type="checkbox"
            checked={reminderForm.createTask}
            onChange={(event) => setReminderForm((currentValue) => ({ ...currentValue, createTask: event.target.checked }))}
          />
          <span>
            <FaClipboardList />
            Also add to Task List
          </span>
        </label>

        <div className="admin-manage-deal-reminder-actions">
          <Button type="button" variant="outline" onClick={handleCloseReminder} disabled={isSavingReminder}>
            Close
          </Button>
          <Button type="submit" disabled={isSavingReminder}>
            {isSavingReminder ? 'Saving...' : 'Save'}
          </Button>
        </div>
      </form>
    </Modal>
    <Modal
      isOpen={isChangeTypeOpen}
      onClose={handleCloseChangeType}
      title="Change Type"
      size="small"
    >
      <form className="admin-manage-deal-change-type-form" onSubmit={handleSaveDealType}>
        <label className="admin-manage-deal-change-type-field">
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
        <div className="admin-manage-deal-change-type-actions">
          <Button type="button" variant="outline" onClick={handleCloseChangeType} disabled={isSaving}>
            Cancel
          </Button>
          <Button type="submit" disabled={isSaving}>
            {isSaving ? 'Saving...' : 'Save Type'}
          </Button>
        </div>
      </form>
    </Modal>
    </>
  )
}

export default AdminManageDealPage
