import React, { useEffect, useMemo, useState } from 'react'
import { FaCheck, FaChevronDown, FaFilter, FaHandPointRight, FaPlus, FaRedo, FaTimes, FaUser } from 'react-icons/fa'
import { ExcelExportActionButton } from '../../../components/common/ExcelExportButton'
import { useAuth } from '../../../context/AuthContext'
import { useData } from '../../../context/DataContext'
import { getVisibleAccountStages } from '../../../features/adminAccounts/config/accountStages'
import { getAccountsBoardData } from '../../../features/adminAccounts/selectors/getAccountsBoardData'
import { getAdminReminders } from '../../../features/adminReminders/getAdminReminders'
import { closeAdminReminder, getAdminReminderStates, reopenAdminReminder, subscribeAdminReminderStates } from '../../../features/adminReminders/reminderStorage'
import { getCanonicalCrmUserName, normalizeCrmUserName } from '../../../features/users/crmUserDirectory'
import { formatShortDate } from '../support-requests/SupportRequestShared'
import { authService } from '../../../services/authService'
import { customerService } from '../../../services/customerService'
import { remarkApi } from '../../../services/remarkApi'
import { exportExcelWorkbook } from '../../../utils/excelExport'
import '../support-requests/SupportRequestAdmin.css'
import './AdminRemindersPage.css'

const VIEW_META = {
  my: {
    title: 'My Reminders',
  },
  active: {
    title: 'Active Reminders',
  },
  closed: {
    title: 'Closed Reminders',
  },
}

const columns = [
  { key: 'reminderDateDisplay', label: 'Reminder Date' },
  { key: 'reminderMode', label: 'Reminder Mode' },
  { key: 'name', label: 'Name' },
  { key: 'sourceLabel', label: 'Source' },
  { key: 'accountStatus', label: 'Account Status' },
  { key: 'ownerName', label: 'Owner' },
  { key: 'note', label: 'Note' },
  { key: 'status', label: 'Status' },
  { key: 'closedOnDisplay', label: 'Closed On' },
]

const ROWS_PER_PAGE = 10

const buildExportDateStamp = () => new Date().toISOString().slice(0, 10)

const formatActiveReminderFilterSummary = (filterState) => {
  const parts = []

  const moduleLabel = SEARCH_IN_OPTIONS.find((option) => option.value === filterState.searchIn)?.label || filterState.searchIn
  parts.push(`Module: ${moduleLabel}`)

  if (filterState.dateFilterEnabled && filterState.reminderDateChecked) {
    const dateLabel = DATE_PRESET_OPTIONS.find((option) => option.value === filterState.datePreset)?.label || filterState.datePreset
    parts.push(`Reminder Date ${filterState.invertDate ? 'is not' : 'is'} ${dateLabel}`)
  }

  if (filterState.statusFilterEnabled && filterState.selectedStatuses.length > 0) {
    parts.push(`Status: ${filterState.selectedStatuses.join(', ')}`)
  }

  return parts.join(' | ')
}

const ACTIVE_REMINDERS_EXCEL_COLUMNS = [
  { key: 'context', label: 'Context', align: 'center', width: 12 },
  { key: 'dealNumber', label: 'Deal Number', width: 16 },
  { key: 'reminderOwner', label: 'Reminder Owner', width: 20 },
  { key: 'reminderDateOnly', label: 'Reminder Date', align: 'center', width: 15 },
  { key: 'reminderTime', label: 'Reminder Time', align: 'center', width: 15 },
  { key: 'reminderNotes', label: 'Reminder Notes', width: 58 },
  { key: 'reminderAddedBy', label: 'Reminder Added By', width: 22 },
  { key: 'dealName', label: 'Deal Name', width: 48 },
  { key: 'customerNumber', label: 'Customer Number', width: 18 },
  { key: 'customerName', label: 'Customer Name', width: 24 },
  { key: 'dealOwner', label: 'Deal Owner', width: 20 },
  { key: 'dealStatus', label: 'Deal Status', width: 16 },
]

const MY_REMINDER_TABS = [
  { key: 'today', label: 'Today', accent: 'blue', emptyMessage: 'No tasks for today' },
  { key: 'pending', label: 'Pending', accent: 'blue', emptyMessage: 'No pending reminders' },
  { key: 'scheduled', label: 'Scheduled', accent: 'blue', emptyMessage: 'No scheduled reminders' },
  { key: 'notifications', label: 'Notifications', accent: 'orange', emptyMessage: 'No notification available' },
]

const ACTIVE_DETAIL_TABS = [
  { key: 'today', label: 'Today' },
  { key: 'pending', label: 'Pending' },
  { key: 'scheduled', label: 'Scheduled' },
]

const SEARCH_IN_OPTIONS = [
  { value: 'deal', label: 'Deal' },
  { value: 'sr', label: 'SR' },
  { value: 'customer', label: 'Customer' },
  { value: 'account', label: 'Account' },
]

const DATE_PRESET_OPTIONS = [
  { value: 'today', label: 'today' },
  { value: 'yesterday', label: 'yesterday' },
  { value: 'tomorrow', label: 'tomorrow' },
  { value: 'this_week', label: 'this week' },
  { value: 'this_month', label: 'this month' },
  { value: 'all', label: 'all' },
]

const MODULE_STATUS_OPTIONS = {
  deal: ['New', 'Quotation Sent', 'Quotation Revision', 'Closed-Won', 'Closed-Lost'],
  sr: ['Active', 'Attending', 'On Site', 'In Progress', 'On Hold', 'Postponed'],
  customer: ['New', 'Active', 'Future Prospect', 'Rejected', 'Converted', 'OLD', 'Closed'],
  account: ['New', 'Follow-up', 'Technical Offer', 'Priority 1', 'Commercial Offer', 'Priority 2', 'Quotation Sent', 'Quote Revision', 'Order Received', 'Convert To PO', 'Order Lost', 'Converted', 'Rejected', 'Contacted', 'Closed'],
}

const ACCOUNT_STAGE_LABEL_MAP = getVisibleAccountStages().reduce((lookup, stage) => {
  lookup[stage.label] = stage.label === 'Follow Up' ? 'Follow-up' : stage.label
  return lookup
}, {})

const createDefaultActiveFilterState = () => ({
  searchIn: 'deal',
  dateFilterEnabled: true,
  reminderDateChecked: true,
  invertDate: false,
  datePreset: 'today',
  statusFilterEnabled: true,
  selectedStatuses: [],
})

const normalizeValue = (value = '') =>
  String(value || '')
    .trim()
    .toLowerCase()

const titleize = (value = '') =>
  String(value || '')
    .replace(/[_-]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/\b\w/g, (character) => character.toUpperCase())

const getDateKey = (value) => {
  if (!value) return ''

  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return ''

  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

const getTomorrowDateInputValue = () => {
  const tomorrow = new Date()
  tomorrow.setDate(tomorrow.getDate() + 1)
  return getDateKey(tomorrow)
}

const getDayDifferenceFromToday = (value) => {
  const valueKey = getDateKey(value)
  if (!valueKey) return ''

  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const target = new Date(valueKey)
  target.setHours(0, 0, 0, 0)

  return Math.round((target.getTime() - today.getTime()) / (24 * 60 * 60 * 1000))
}

const formatReminderExportDate = (value) => {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value || '-'
  return date.toLocaleDateString('en-GB').replace(/\//g, '-')
}

const formatReminderExportTime = (value, fallback = '') => {
  const normalizedFallback = String(fallback || '').trim()
  if (normalizedFallback && normalizedFallback !== '-') return normalizedFallback
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return '-'
  return date.toLocaleTimeString('en-IN', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  })
}

const getDueBucket = (value) => {
  const dayDifference = getDayDifferenceFromToday(value)
  if (dayDifference === '') return 'Unscheduled'
  if (dayDifference < 0) return 'Pending'
  if (dayDifference > 0) return 'Scheduled'
  return 'Today'
}

const getWeekStart = (date) => {
  const nextDate = new Date(date)
  const day = nextDate.getDay()
  const diff = day === 0 ? -6 : 1 - day
  nextDate.setDate(nextDate.getDate() + diff)
  nextDate.setHours(0, 0, 0, 0)
  return nextDate
}

const matchesDatePreset = (value, preset) => {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) {
    return preset === 'all'
  }

  const currentDate = new Date()
  currentDate.setHours(0, 0, 0, 0)

  const targetDate = new Date(date)
  targetDate.setHours(0, 0, 0, 0)

  if (preset === 'all') {
    return true
  }

  if (preset === 'today') {
    return targetDate.getTime() === currentDate.getTime()
  }

  if (preset === 'yesterday') {
    const yesterday = new Date(currentDate)
    yesterday.setDate(yesterday.getDate() - 1)
    return targetDate.getTime() === yesterday.getTime()
  }

  if (preset === 'tomorrow') {
    const tomorrow = new Date(currentDate)
    tomorrow.setDate(tomorrow.getDate() + 1)
    return targetDate.getTime() === tomorrow.getTime()
  }

  if (preset === 'this_week') {
    const weekStart = getWeekStart(currentDate)
    const weekEnd = new Date(weekStart)
    weekEnd.setDate(weekEnd.getDate() + 6)
    return targetDate >= weekStart && targetDate <= weekEnd
  }

  if (preset === 'this_month') {
    return targetDate.getMonth() === currentDate.getMonth() && targetDate.getFullYear() === currentDate.getFullYear()
  }

  return false
}

const getDealFilterStatus = (deal) => {
  const status = normalizeValue(deal.status)
  const stage = normalizeValue(deal.stage)
  const quotationStatus = normalizeValue(deal.quotationCustomerStatus)
  const orderStatus = normalizeValue(deal.orderCustomerStatus)

  if (status === 'won' || status.includes('closed-won') || status.includes('closed won')) {
    return 'Closed-Won'
  }

  if (status === 'lost' || status.includes('closed-lost') || status.includes('closed lost')) {
    return 'Closed-Lost'
  }

  if (stage.includes('revision') || quotationStatus.includes('revision') || orderStatus.includes('revision')) {
    return 'Quotation Revision'
  }

  if (
    stage.includes('quotation sent')
    || quotationStatus.includes('sent')
    || status === 'proposal'
    || status === 'negotiation'
    || status === 'qualified'
    || status === 'contacted'
  ) {
    return 'Quotation Sent'
  }

  return 'New'
}

const getSupportRequestFilterStatus = (supportRequest) => {
  const status = normalizeValue(supportRequest.status)

  if (status.includes('postponed') || supportRequest.postponedReason) {
    return 'Postponed'
  }

  if (status.includes('on site')) {
    return 'On Site'
  }

  if (status.includes('attending')) {
    return 'Attending'
  }

  if (status.includes('in progress') || status.includes('in-progress') || status.includes('resolved')) {
    return 'In Progress'
  }

  if (status.includes('on hold') || status.includes('on-hold')) {
    return 'On Hold'
  }

  if (status.includes('active') || status.includes('open')) {
    return 'Active'
  }

  return titleize(supportRequest.status || '') || 'Active'
}

const getCustomerFilterStatus = (customer) => {
  const status = normalizeValue(customer.customerStatus)

  if (status === 'old') {
    return 'OLD'
  }

  if (status === 'advance payment received') {
    return 'Advance Payment Received'
  }

  return titleize(customer.customerStatus || '') || 'New'
}

const getAccountFilterStatus = (account) => {
  const mappedLabel = ACCOUNT_STAGE_LABEL_MAP[account.stageLabel]
  if (mappedLabel) return mappedLabel
  return titleize(account.stageLabel || account.status || '') || 'New'
}

const resolveOwnerName = (value) => {
  const canonicalName = getCanonicalCrmUserName(value)
  return canonicalName || String(value || 'Unassigned').trim() || 'Unassigned'
}

const resolveUserNameById = (users = [], userId = '') => {
  const normalizedUserId = String(userId || '').trim()
  if (!normalizedUserId) return ''
  const matchedUser = users.find((entry) => String(entry.id || entry.legacyId || '').trim() === normalizedUserId)
  return matchedUser?.name || matchedUser?.username || matchedUser?.email || ''
}

const buildRemarkReminderRecords = ({ accounts = [], remarkReminders = [], users = [] }) => {
  const accountLookup = getAccountsBoardData(accounts).records.reduce((lookup, account) => {
    lookup[String(account.raw?.id || account.id || '').trim()] = account
    return lookup
  }, {})

  return remarkReminders.map((reminder) => {
    const accountId = String(reminder.accountId || '').trim()
    const account = accountLookup[accountId] || {}
    const assignedUserName = resolveUserNameById(users, reminder.assignedTo) || reminder.assignedOwnerName
    const createdByName = resolveUserNameById(users, reminder.createdBy)
    const status = reminder.isCompleted ? 'closed' : 'active'
    const reminderDateDisplay = formatShortDate(reminder.reminderDate)
    const note = reminder.reminderNote || reminder.remarkContent || '-'

    return {
      id: `remark-reminder-${reminder.id}`,
      sourceType: 'remark-reminder',
      sourceId: reminder.id,
      sourceLabel: 'Account',
      sourceNumber: account.accountNumber || account.accountNo || account.id || accountId || '',
      ownerName: resolveOwnerName(assignedUserName || account.accountOwner || 'Unassigned'),
      name: account.name || account.accountName || account.accountNumber || `Account ${accountId || reminder.id}`,
      dealName: account.name || account.accountName || account.accountNumber || `Account ${accountId || reminder.id}`,
      customerNumber: account.customerNumber || account.customerRefNo || '-',
      customerName: account.customerName || account.name || account.accountName || '-',
      reminderAddedBy: resolveOwnerName(createdByName || account.addedBy || account.accountOwner || 'Unassigned'),
      reminderDate: reminder.reminderDate,
      reminderTime: reminder.reminderTime,
      reminderDateDisplay,
      reminderMode: reminder.reminderTime || '-',
      accountStatus: getAccountFilterStatus(account),
      note,
      filterStatusLabel: getAccountFilterStatus(account),
      actionable: true,
      moduleKey: 'account',
      status,
      closedOnDisplay: '-',
      isMongoRemarkReminder: true,
    }
  })
}

const buildMongoReminderRecords = ({ reminders = [], users = [] }) => reminders.map((reminder) => {
  const assignedUserName = resolveUserNameById(users, reminder.assignedTo)
  const createdByName = resolveUserNameById(users, reminder.createdBy)
  const reminderDate = reminder.reminderDate || String(reminder.remindAt || '').slice(0, 10)
  const reminderTime = reminder.reminderTime || String(reminder.remindAt || '').slice(11, 16) || '09:00'
  const status = reminder.status === 'closed' ? 'closed' : 'active'

  return {
    id: `mongo-reminder-${reminder.id}`,
    sourceType: 'mongo-reminder',
    sourceId: reminder.id,
    sourceLabel: reminder.relatedEntityType ? titleize(reminder.relatedEntityType) : 'Reminder',
    sourceNumber: reminder.relatedEntityId || '',
    ownerName: resolveOwnerName(assignedUserName || createdByName || 'Unassigned'),
    name: reminder.title || 'Reminder',
    dealName: reminder.title || 'Reminder',
    customerNumber: '-',
    customerName: '-',
    reminderAddedBy: resolveOwnerName(createdByName || assignedUserName || 'Unassigned'),
    reminderDate,
    reminderTime,
    reminderDateDisplay: formatShortDate(reminderDate),
    reminderMode: reminder.reminderMode || reminderTime || 'Follow Up',
    accountStatus: status === 'closed' ? 'Closed' : 'Active',
    note: reminder.note || reminder.message || '-',
    filterStatusLabel: status === 'closed' ? 'Closed' : 'Active',
    actionable: true,
    moduleKey: 'reminder',
    status,
    closedOnDisplay: status === 'closed' ? formatShortDate(reminder.updatedAt || reminder.closedOn) : '-',
    isMongoReminder: true,
  }
})

const buildActiveOwnerFilterRecords = ({ accounts = [], deals = [], supportRequests = [], remarkReminders = [], users = [] }) => {
  const accountRecords = getAccountsBoardData(accounts).records
    .filter((account) => account.reminderDate)
    .map((account) => ({
      id: `account-${account.id}`,
      sourceType: 'account',
      sourceId: account.id,
      sourceLabel: 'Account',
      sourceNumber: account.accountNumber || account.id || '',
      ownerName: resolveOwnerName(account.accountOwner || account.addedBy || 'Unassigned'),
      name: account.name || account.accountNumber || 'Untitled Account',
      dealName: account.name || account.accountNumber || 'Untitled Account',
      customerNumber: account.customerNumber || account.customerRefNo || '-',
      customerName: account.customerName || account.name || '-',
      reminderAddedBy: resolveOwnerName(account.reminderAddedBy || account.addedBy || account.accountOwner || 'Unassigned'),
      reminderDate: account.reminderDate,
      reminderDateDisplay: formatShortDate(account.reminderDate),
      reminderMode: account.reminderMode || '-',
      accountStatus: getAccountFilterStatus(account),
      note: account.remark || account.latestRemark || '-',
      filterStatusLabel: getAccountFilterStatus(account),
      actionable: true,
      moduleKey: 'account',
    }))

  const dealRecords = deals
    .filter((deal) => deal.reminderDate)
    .map((deal) => ({
      id: `deal-${deal.id}`,
      sourceType: 'deal',
      sourceId: deal.id,
      sourceLabel: 'Deal',
      sourceNumber: deal.dealNumber || deal.id || '',
      ownerName: resolveOwnerName(deal.dealOwner || deal.ownerName || 'Unassigned'),
      name: deal.name || deal.dealNumber || 'Untitled Deal',
      dealName: deal.name || deal.projectName || deal.title || deal.dealNumber || 'Untitled Deal',
      customerNumber: deal.customerNumber || deal.customerNo || deal.accountNumber || deal.accountNo || '-',
      customerName: deal.customerName || deal.companyName || deal.accountName || '-',
      reminderAddedBy: resolveOwnerName(deal.reminderAddedBy || deal.addedByName || deal.addedBy || deal.dealOwner || deal.ownerName || 'Unassigned'),
      reminderDate: deal.reminderDate,
      reminderDateDisplay: formatShortDate(deal.reminderDate),
      reminderMode: titleize(deal.reminderMode || '') || '-',
      accountStatus: '-',
      note: deal.reminderNote || '-',
      filterStatusLabel: getDealFilterStatus(deal),
      actionable: true,
      moduleKey: 'deal',
    }))

  const customerRecords = customerService.getCustomers()
    .filter((customer) => customer.reminderDate)
    .map((customer) => ({
      id: `customer-${customer.id}`,
      sourceType: 'customer',
      sourceId: customer.id,
      sourceLabel: 'Customer',
      sourceNumber: customer.customerNumber || customer.id || '',
      ownerName: resolveOwnerName(customer.customerOwner || 'Unassigned'),
      name: customer.customerName || customer.customerNumber || 'Untitled Customer',
      dealName: customer.projectName || customer.customerName || customer.customerNumber || 'Untitled Customer',
      customerNumber: customer.customerNumber || customer.id || '-',
      customerName: customer.customerName || '-',
      reminderAddedBy: resolveOwnerName(customer.reminderAddedBy || customer.addedBy || customer.customerOwner || 'Unassigned'),
      reminderDate: customer.reminderDate,
      reminderDateDisplay: formatShortDate(customer.reminderDate),
      reminderMode: titleize(customer.reminderMode || '') || '-',
      accountStatus: '-',
      note: customer.remark || customer.description || '-',
      filterStatusLabel: getCustomerFilterStatus(customer),
      actionable: true,
      moduleKey: 'customer',
    }))

  const supportRequestRecords = supportRequests
    .filter((supportRequest) => supportRequest.reminderDate || supportRequest.srDate)
    .map((supportRequest) => {
      const reminderDate = supportRequest.reminderDate || supportRequest.srDate

      return ({
      id: `sr-${supportRequest.id}`,
      sourceType: 'sr',
      sourceId: supportRequest.id,
      sourceLabel: 'SR',
      sourceNumber: supportRequest.srNumber || supportRequest.ticketNumber || supportRequest.id || '',
      ownerName: resolveOwnerName(supportRequest.ownerName || supportRequest.addedByName || 'Unassigned'),
      name: supportRequest.title || supportRequest.customerName || supportRequest.srNumber || 'Untitled SR',
      dealName: supportRequest.title || supportRequest.projectName || supportRequest.srNumber || 'Untitled SR',
      customerNumber: supportRequest.customerNumber || supportRequest.customerNo || '-',
      customerName: supportRequest.customerName || '-',
      reminderAddedBy: resolveOwnerName(supportRequest.reminderAddedBy || supportRequest.addedByName || supportRequest.ownerName || 'Unassigned'),
      reminderDate,
      reminderDateDisplay: formatShortDate(reminderDate),
      reminderMode: titleize(supportRequest.reminderMode || supportRequest.requestType || '') || '-',
      accountStatus: '-',
      note: supportRequest.reminderNote || supportRequest.notes || supportRequest.description || '-',
      filterStatusLabel: getSupportRequestFilterStatus(supportRequest),
      actionable: false,
      moduleKey: 'sr',
      })
    })

  return [
    ...accountRecords,
    ...dealRecords,
    ...customerRecords,
    ...supportRequestRecords,
    ...buildRemarkReminderRecords({ accounts, remarkReminders, users }).filter((reminder) => reminder.status === 'active'),
  ].sort((left, right) => new Date(left.reminderDate || 0).getTime() - new Date(right.reminderDate || 0).getTime())
}

const applyOwnerFilters = (rows, ownerName, filters) => {
  if (!ownerName) return []
  const normalizedOwnerName = normalizeCrmUserName(ownerName)

  return rows.filter((row) => {
    if (normalizeCrmUserName(row.ownerName) !== normalizedOwnerName) {
      return false
    }

    if (row.moduleKey !== filters.searchIn) {
      return false
    }

    if (filters.dateFilterEnabled && filters.reminderDateChecked) {
      const matchesPreset = matchesDatePreset(row.reminderDate, filters.datePreset)
      if (filters.invertDate ? matchesPreset : !matchesPreset) {
        return false
      }
    }

    if (filters.statusFilterEnabled && filters.selectedStatuses.length > 0 && !filters.selectedStatuses.includes(row.filterStatusLabel)) {
      return false
    }

    return true
  })
}

const buildDetailTabData = (rows) => {
  const todayKey = getDateKey(new Date())

  return {
    today: rows.filter((row) => getDateKey(row.reminderDate) === todayKey),
    pending: rows.filter((row) => {
      const rowDateKey = getDateKey(row.reminderDate)
      return rowDateKey && rowDateKey < todayKey
    }),
    scheduled: rows.filter((row) => {
      const rowDateKey = getDateKey(row.reminderDate)
      return rowDateKey && rowDateKey > todayKey
    }),
  }
}

const normalizeActiveReminderExportRows = (rows = []) => rows.map((row) => ({
  ...row,
  context: String(row.sourceLabel || row.sourceType || '-').toUpperCase(),
  dealNumber: row.sourceNumber || row.sourceId || '-',
  reminderOwner: row.ownerName || '-',
  reminderDateOnly: formatReminderExportDate(row.reminderDate),
  reminderTime: formatReminderExportTime(row.reminderDate, row.reminderTime || row.reminderMode),
  reminderNotes: row.note || '-',
  reminderAddedBy: row.reminderAddedBy || row.ownerName || '-',
  dealName: row.dealName || row.name || '-',
  customerNumber: row.customerNumber || '-',
  customerName: row.customerName || '-',
  dealOwner: row.ownerName || '-',
  dealStatus: row.filterStatusLabel || row.accountStatus || (row.status === 'closed' ? 'Closed' : 'Active'),
  sourceNumber: row.sourceNumber || row.sourceId || '-',
  filterStatusLabel: row.filterStatusLabel || (row.status === 'closed' ? 'Closed' : 'Active'),
  accountStatus: row.accountStatus || '-',
  reminderDateDisplay: row.reminderDateDisplay || formatShortDate(row.reminderDate),
  dueBucket: row.dueBucket || getDueBucket(row.reminderDate),
  daysFromToday: row.daysFromToday ?? getDayDifferenceFromToday(row.reminderDate),
  reminderMode: row.reminderMode || '-',
  note: row.note || '-',
}))

const AdminRemindersPage = ({ variantKey = 'active' }) => {
  const {
    accounts,
    deals,
    supportRequests,
    reminders: mongoReminders,
    notifications,
    clearNotification,
    addNotification,
    updateAccount,
    updateDeal,
    updateReminder,
    updateSupportRequest,
  } = useData()
  const { user, isAdmin } = useAuth()
  const [reminderStatesById, setReminderStatesById] = useState(() => getAdminReminderStates())
  const [filters, setFilters] = useState(() => (
    columns.reduce((lookup, column) => ({ ...lookup, [column.key]: '' }), {})
  ))
  const [currentPage, setCurrentPage] = useState(1)
  const [activeMyReminderTab, setActiveMyReminderTab] = useState('today')
  const [selectedOwner, setSelectedOwner] = useState(null)
  const [activeDetailTab, setActiveDetailTab] = useState('today')
  const [isFilterPanelOpen, setIsFilterPanelOpen] = useState(false)
  const [draftActiveFilter, setDraftActiveFilter] = useState(() => createDefaultActiveFilterState())
  const [appliedActiveFilter, setAppliedActiveFilter] = useState(null)
  const [remarkReminders, setRemarkReminders] = useState([])

  useEffect(() => subscribeAdminReminderStates(setReminderStatesById), [])

  useEffect(() => {
    let isMounted = true

    const loadRemarkReminders = async () => {
      try {
        const records = await remarkApi.getRemarkReminders()
        if (isMounted) setRemarkReminders(records)
      } catch (error) {
        if (isMounted) setRemarkReminders([])
      }
    }

    loadRemarkReminders()

    return () => {
      isMounted = false
    }
  }, [])

  const availableUsers = useMemo(() => (
    Array.from(
      new Set(
        authService.getAvailableUsers()
          .filter((entry) => entry.name !== 'System Administrator')
          .map((entry) => resolveOwnerName(entry.name))
          .filter(Boolean)
      )
    )
  ), [])

  const activeReminderUsers = useMemo(() => {
    if (isAdmin) return availableUsers
    const currentUserName = resolveOwnerName(user?.name || user?.username || '')
    return currentUserName ? [currentUserName] : []
  }, [availableUsers, isAdmin, user?.name, user?.username])

  const dbRemarkReminderRows = useMemo(() => {
    const rows = buildRemarkReminderRecords({
      accounts,
      remarkReminders,
      users: authService.getAvailableUsers(),
    })
    const currentUserName = normalizeCrmUserName(user?.name || user?.username || '')

    return rows.filter((row) => {
      if (variantKey === 'closed') return row.status === 'closed'
      if (variantKey === 'my') return row.status === 'active' && (isAdmin || normalizeCrmUserName(row.ownerName) === currentUserName)
      if (!isAdmin && normalizeCrmUserName(row.ownerName) !== currentUserName) return false
      return row.status === 'active'
    })
  }, [accounts, isAdmin, remarkReminders, user?.name, user?.username, variantKey])

  const dbMongoReminderRows = useMemo(() => {
    const rows = buildMongoReminderRecords({
      reminders: mongoReminders,
      users: authService.getAvailableUsers(),
    })
    const currentUserName = normalizeCrmUserName(user?.name || user?.username || '')

    return rows.filter((row) => {
      if (variantKey === 'closed') return row.status === 'closed'
      if (variantKey === 'my') return row.status === 'active' && (isAdmin || normalizeCrmUserName(row.ownerName) === currentUserName)
      if (!isAdmin && normalizeCrmUserName(row.ownerName) !== currentUserName) return false
      return row.status === 'active'
    })
  }, [isAdmin, mongoReminders, user?.name, user?.username, variantKey])

  const reminders = useMemo(() => getAdminReminders({
      accounts,
      deals,
      supportRequests,
      user,
      variantKey,
      reminderStatesById,
      isAdmin,
    }).concat(dbRemarkReminderRows, dbMongoReminderRows),
  [accounts, dbMongoReminderRows, dbRemarkReminderRows, deals, isAdmin, reminderStatesById, supportRequests, user, variantKey])

  const filteredRows = useMemo(() => (
    reminders.filter((reminder) => (
      columns.every((column) => {
        const filterValue = String(filters[column.key] || '').trim().toLowerCase()
        if (!filterValue) return true

        return String(reminder[column.key] || '').toLowerCase().includes(filterValue)
      })
    ))
  ), [filters, reminders])

  const totalPages = Math.max(1, Math.ceil(filteredRows.length / ROWS_PER_PAGE))
  const paginatedRows = filteredRows.slice((currentPage - 1) * ROWS_PER_PAGE, currentPage * ROWS_PER_PAGE)

  const handleFilterChange = (key, value) => {
    setFilters((currentFilters) => ({
      ...currentFilters,
      [key]: value,
    }))
    setCurrentPage(1)
  }

  const handleCloseReminder = async (reminder) => {
    if (reminder.sourceType === 'mongo-reminder') {
      const result = await updateReminder(reminder.sourceId, { status: 'closed' })
      if (!result.success) {
        addNotification?.('error', 'Close Reminder', result.message || 'Unable to close this reminder.')
      }
      return
    }

    if (reminder.sourceType === 'remark-reminder') {
      try {
        const updatedReminder = await remarkApi.updateRemarkReminder(reminder.sourceId, { isCompleted: true })
        setRemarkReminders((currentRecords) => currentRecords.map((record) => (
          String(record.id) === String(updatedReminder.id) ? updatedReminder : record
        )))
      } catch (error) {
        addNotification?.('error', 'Close Reminder', error.response?.data?.message || error.message || 'Unable to close this reminder.')
      }
      return
    }

    closeAdminReminder({
      sourceType: reminder.sourceType,
      sourceId: reminder.sourceId,
      userName: user?.name || '',
    })
  }

  const handleReopenReminder = async (reminder) => {
    if (reminder.sourceType === 'mongo-reminder') {
      const result = await updateReminder(reminder.sourceId, { status: 'scheduled' })
      if (!result.success) {
        addNotification?.('error', 'Reopen Reminder', result.message || 'Unable to reopen this reminder.')
      }
      return
    }

    if (reminder.sourceType === 'remark-reminder') {
      try {
        const updatedReminder = await remarkApi.updateRemarkReminder(reminder.sourceId, { isCompleted: false })
        setRemarkReminders((currentRecords) => currentRecords.map((record) => (
          String(record.id) === String(updatedReminder.id) ? updatedReminder : record
        )))
      } catch (error) {
        addNotification?.('error', 'Reopen Reminder', error.response?.data?.message || error.message || 'Unable to reopen this reminder.')
      }
      return
    }

    reopenAdminReminder({
      sourceType: reminder.sourceType,
      sourceId: reminder.sourceId,
    })
  }

  const handleUpdateReminderDate = async (reminder, actionLabel = 'Reschedule') => {
    const nextDate = window.prompt(`${actionLabel} reminder date (YYYY-MM-DD)`, getTomorrowDateInputValue())
    const normalizedDate = String(nextDate || '').trim()
    if (!normalizedDate) return

    const updates = {
      reminderDate: normalizedDate,
      reminderMode: reminder.reminderMode === '-' ? 'Follow Up' : reminder.reminderMode,
      reminderNote: reminder.note === '-' ? '' : reminder.note,
    }

    let result = { success: true }

    if (reminder.sourceType === 'remark-reminder') {
      try {
        const updatedReminder = await remarkApi.updateRemarkReminder(reminder.sourceId, {
          reminderDate: normalizedDate,
          reminderTime: reminder.reminderTime && reminder.reminderTime !== '-' ? reminder.reminderTime : '09:00',
          reminderNote: reminder.note === '-' ? '' : reminder.note,
          isCompleted: false,
        })
        setRemarkReminders((currentRecords) => currentRecords.map((record) => (
          String(record.id) === String(updatedReminder.id) ? updatedReminder : record
        )))
      } catch (error) {
        result = { success: false, message: error.response?.data?.message || error.message }
      }
    } else if (reminder.sourceType === 'mongo-reminder') {
      const reminderTime = reminder.reminderTime && reminder.reminderTime !== '-' ? reminder.reminderTime : '09:00'
      result = await updateReminder(reminder.sourceId, {
        status: 'scheduled',
        remindAt: `${normalizedDate}T${reminderTime}:00`,
        reminderDate: normalizedDate,
        reminderTime,
        reminderMode: reminder.reminderMode === '-' ? 'Follow Up' : reminder.reminderMode,
        message: reminder.note === '-' ? '' : reminder.note,
      })
    } else if (reminder.sourceType === 'account') {
      result = await updateAccount(reminder.sourceId, updates)
    } else if (reminder.sourceType === 'deal') {
      result = await updateDeal(reminder.sourceId, updates)
    } else if (reminder.sourceType === 'sr') {
      result = await updateSupportRequest(reminder.sourceId, updates)
    } else if (reminder.sourceType === 'customer') {
      const customer = customerService.getCustomerById(reminder.sourceId)
      if (!customer) {
        result = { success: false, message: 'Customer was not found.' }
      } else {
        await customerService.saveCustomer({ ...customer, ...updates })
        result = { success: true }
      }
    }

    if (!result?.success) {
      addNotification?.('error', `${actionLabel} Reminder`, result?.message || 'Unable to update this reminder.')
      return
    }

    reopenAdminReminder({
      sourceType: reminder.sourceType,
      sourceId: reminder.sourceId,
    })
    addNotification?.('success', `${actionLabel} Reminder`, `Reminder moved to ${normalizedDate}.`)
  }

  const userGroups = useMemo(() => {
    if (variantKey !== 'active') return []

    const groups = new Map(
      activeReminderUsers.map((ownerName) => [
        normalizeCrmUserName(ownerName),
        { name: ownerName, count: 0, items: [] },
      ])
    )

    reminders.forEach((reminder) => {
      const owner = resolveOwnerName(reminder.ownerName || 'Unassigned')
      const ownerKey = normalizeCrmUserName(owner)
      const existingGroup = groups.get(ownerKey) || { name: owner, count: 0, items: [] }

      existingGroup.items.push({
        ...reminder,
        ownerName: owner,
      })
      existingGroup.count = existingGroup.items.length
      groups.set(ownerKey, existingGroup)
    })

    const currentUserName = normalizeCrmUserName(user?.name || user?.username || '')

    return Array.from(groups.values())
      .sort((leftGroup, rightGroup) => {
        const leftIsCurrentUser = normalizeCrmUserName(leftGroup.name) === currentUserName
        const rightIsCurrentUser = normalizeCrmUserName(rightGroup.name) === currentUserName
        if (leftIsCurrentUser !== rightIsCurrentUser) return leftIsCurrentUser ? -1 : 1
        return leftGroup.name.localeCompare(rightGroup.name)
      })
  }, [activeReminderUsers, reminders, user?.name, user?.username, variantKey])

  useEffect(() => {
    if (variantKey !== 'active') return

    if (!isAdmin && userGroups.length > 0 && selectedOwner !== userGroups[0].name) {
      setSelectedOwner(userGroups[0].name)
      return
    }

    if (!userGroups.some((group) => group.name === selectedOwner)) {
      setSelectedOwner(null)
    }
  }, [isAdmin, selectedOwner, userGroups, variantKey])

  useEffect(() => {
    if (variantKey !== 'active') return

    setActiveDetailTab('today')
    setIsFilterPanelOpen(false)
    setDraftActiveFilter(createDefaultActiveFilterState())
    setAppliedActiveFilter(null)
  }, [selectedOwner, variantKey])

  const selectedOwnerReminders = useMemo(() => {
    if (!selectedOwner) return []
    return userGroups.find((group) => group.name === selectedOwner)?.items || []
  }, [selectedOwner, userGroups])

  const ownerFilterableRows = useMemo(() => buildActiveOwnerFilterRecords({
    accounts,
    deals,
    supportRequests,
    remarkReminders,
    users: authService.getAvailableUsers(),
  }), [accounts, deals, remarkReminders, supportRequests])

  const appliedFilteredOwnerRows = useMemo(() => {
    if (!selectedOwner || !appliedActiveFilter) return []
    return applyOwnerFilters(ownerFilterableRows, selectedOwner, appliedActiveFilter)
  }, [appliedActiveFilter, ownerFilterableRows, selectedOwner])

  const detailBaseRows = appliedActiveFilter ? appliedFilteredOwnerRows : selectedOwnerReminders
  const detailTabData = useMemo(() => buildDetailTabData(detailBaseRows), [detailBaseRows])
  const activeReminderStats = useMemo(() => {
    if (variantKey !== 'active') {
      return { total: 0, today: 0, pending: 0, scheduled: 0 }
    }

    const todayKey = getDateKey(new Date())

    return reminders.reduce((totals, reminder) => {
      const reminderDateKey = getDateKey(reminder.reminderDate)
      if (reminderDateKey === todayKey) {
        totals.today += 1
      } else if (reminderDateKey && reminderDateKey < todayKey) {
        totals.pending += 1
      } else if (reminderDateKey && reminderDateKey > todayKey) {
        totals.scheduled += 1
      }

      totals.total += 1
      return totals
    }, { total: 0, today: 0, pending: 0, scheduled: 0 })
  }, [reminders, variantKey])

  const title = VIEW_META[variantKey]?.title || 'Reminders'

  const myReminderTabData = useMemo(() => {
    if (variantKey !== 'my') {
      return null
    }

    const todayKey = getDateKey(new Date())
    const currentUserName = normalizeCrmUserName(user?.name || user?.username || '')
    const activeReminders = reminders
      .filter((reminder) => reminder.status === 'active')
      .sort((left, right) => {
        const leftIsCurrentUser = normalizeCrmUserName(left.ownerName) === currentUserName
        const rightIsCurrentUser = normalizeCrmUserName(right.ownerName) === currentUserName
        if (leftIsCurrentUser !== rightIsCurrentUser) return leftIsCurrentUser ? -1 : 1
        return new Date(left.reminderDate || 0).getTime() - new Date(right.reminderDate || 0).getTime()
      })
    const notificationRows = notifications
      .slice()
      .sort((left, right) => new Date(right.timestamp || 0).getTime() - new Date(left.timestamp || 0).getTime())

    return {
      today: activeReminders.filter((reminder) => getDateKey(reminder.reminderDate) === todayKey),
      pending: activeReminders.filter((reminder) => {
        const reminderDateKey = getDateKey(reminder.reminderDate)
        return reminderDateKey && reminderDateKey < todayKey
      }),
      scheduled: activeReminders.filter((reminder) => {
        const reminderDateKey = getDateKey(reminder.reminderDate)
        return reminderDateKey && reminderDateKey > todayKey
      }),
      notifications: notificationRows,
    }
  }, [notifications, reminders, user?.name, user?.username, variantKey])

  const handleOpenFilterPanel = () => {
    setDraftActiveFilter(
      appliedActiveFilter
        ? { ...appliedActiveFilter, selectedStatuses: [...appliedActiveFilter.selectedStatuses] }
        : createDefaultActiveFilterState()
    )
    setIsFilterPanelOpen(true)
  }

  const handleDraftModuleChange = (value) => {
    setDraftActiveFilter((current) => ({
      ...current,
      searchIn: value,
      selectedStatuses: [],
    }))
  }

  const handleDraftStatusToggle = (statusLabel) => {
    setDraftActiveFilter((current) => ({
      ...current,
      selectedStatuses: current.selectedStatuses.includes(statusLabel)
        ? current.selectedStatuses.filter((entry) => entry !== statusLabel)
        : [...current.selectedStatuses, statusLabel],
    }))
  }

  const handleApplyActiveFilter = () => {
    setAppliedActiveFilter({
      ...draftActiveFilter,
      selectedStatuses: [...draftActiveFilter.selectedStatuses],
    })
    setActiveDetailTab('today')
    setIsFilterPanelOpen(false)
  }

  const handleExportActiveReminderRows = ({
    rows,
    filename,
    title = 'Active Reminder Report',
    subtitle = '',
    metadata = [],
  }) => {
    if (!rows || rows.length === 0) {
      return
    }

    try {
      exportExcelWorkbook({
        filename: String(filename || 'active-reminders.xlsx').replace(/\.(xls|xlsx|csv)$/i, '.xlsx'),
        title,
        subtitle,
        sheetName: 'Active Reminders',
        metadata: [
          ...metadata,
          { label: 'Total Records', value: rows.length },
          { label: 'Downloaded On', value: new Date().toLocaleString('en-IN') },
        ],
        columns: ACTIVE_REMINDERS_EXCEL_COLUMNS,
        rows: normalizeActiveReminderExportRows(rows),
        summary: [
          { label: 'Total Reminders', value: rows.length, type: 'integer' },
        ],
      })
      addNotification?.('success', 'Active Reminder Export', `${rows.length} reminder(s) exported to Excel.`)
    } catch (error) {
      addNotification?.('error', 'Active Reminder Export', error?.message || 'Unable to download active reminders Excel.')
      throw error
    }
  }

  const handleExportAllActiveRows = () => {
    handleExportActiveReminderRows({
      rows: reminders,
      filename: `${isAdmin ? 'all' : 'my'}-active-reminders-${buildExportDateStamp()}.xlsx`,
      title: isAdmin ? 'All Active Reminders' : 'My Active Reminders',
      subtitle: isAdmin
        ? `${reminders.length} active reminder(s) across all users`
        : `${reminders.length} active reminder(s) assigned to ${resolveOwnerName(user?.name || user?.username || 'me')}`,
      metadata: [
        { label: 'Scope', value: isAdmin ? 'All Users' : 'My Reminders' },
        { label: 'View', value: 'Active Reminders' },
      ],
    })
  }

  const handleExportSelectedOwnerRows = () => {
    if (!selectedOwner) return

    const ownerSlug = selectedOwner.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
    const filterLabel = appliedActiveFilter
      ? formatActiveReminderFilterSummary(appliedActiveFilter)
      : 'No filter applied'

    handleExportActiveReminderRows({
      rows: detailBaseRows,
      filename: `${ownerSlug || 'user'}-active-reminders-${buildExportDateStamp()}.xlsx`,
      title: 'User Active Reminder Report',
      subtitle: `${selectedOwner} - ${detailBaseRows.length} active reminder(s)`,
      metadata: [
        { label: 'User', value: selectedOwner },
        { label: 'Filter', value: filterLabel },
      ],
    })
  }

  if (variantKey === 'my' && myReminderTabData) {
    const activeTabDefinition = MY_REMINDER_TABS.find((tab) => tab.key === activeMyReminderTab) || MY_REMINDER_TABS[0]
    const activeTabRows = myReminderTabData[activeTabDefinition.key] || []

    return (
      <div className="admin-my-reminders-page">
        <section className="admin-my-reminders-shell">
          <header className="admin-my-reminders-header">
            <h1>My Reminders &amp; Notifications</h1>
            <button type="button" className="admin-my-reminders-help">
            </button>
          </header>

          <div className="admin-my-reminders-tabs" role="tablist" aria-label="My reminders and notifications">
            {MY_REMINDER_TABS.map((tab) => {
              const isActive = tab.key === activeMyReminderTab
              const count = (myReminderTabData[tab.key] || []).length

              return (
                <button
                  key={tab.key}
                  type="button"
                  role="tab"
                  aria-selected={isActive}
                  className={`admin-my-reminders-tab admin-my-reminders-tab-${tab.accent} ${isActive ? 'admin-my-reminders-tab-active' : ''}`}
                  onClick={() => setActiveMyReminderTab(tab.key)}
                >
                  {tab.label} ({count})
                </button>
              )
            })}
          </div>

          <section className="admin-my-reminders-panel">
            {activeTabRows.length > 0 ? (
              <div className="admin-my-reminders-list">
                {activeMyReminderTab === 'notifications' ? activeTabRows.map((notification) => (
                  <article key={notification.id} className="admin-my-reminders-item admin-my-reminders-item-notification">
                    <div className="admin-my-reminders-item-main">
                      <strong>{notification.title || 'Notification'}</strong>
                      <p>{notification.message || '-'}</p>
                      <span>{notification.timestamp ? new Date(notification.timestamp).toLocaleString('en-IN') : '-'}</span>
                    </div>
                    <div className="admin-my-reminders-notification-actions">
                      <button
                        type="button"
                        className="admin-my-reminders-icon-action admin-my-reminders-icon-action-check"
                        title="Mark as done"
                        aria-label="Mark notification as done"
                        onClick={() => clearNotification(notification.id)}
                      >
                        <FaCheck />
                      </button>
                      <button
                        type="button"
                        className="admin-my-reminders-icon-action admin-my-reminders-icon-action-close"
                        title="Close"
                        aria-label="Close notification"
                        onClick={() => clearNotification(notification.id)}
                      >
                        <FaTimes />
                      </button>
                    </div>
                  </article>
                )) : activeTabRows.map((reminder) => (
                  <article key={reminder.id} className="admin-my-reminders-item">
                    <div className="admin-my-reminders-item-main">
                      <strong>{reminder.name}</strong>
                      <p>{reminder.sourceLabel} | {reminder.reminderMode} | {reminder.reminderDateDisplay}</p>
                      <span>{reminder.note || '-'}</span>
                    </div>
                    <button
                      type="button"
                      className="admin-my-reminders-item-action"
                      onClick={() => handleCloseReminder(reminder)}
                    >
                      Close
                    </button>
                  </article>
                ))}
              </div>
            ) : (
              <p className="admin-my-reminders-empty">{activeTabDefinition.emptyMessage}</p>
            )}
          </section>
        </section>
      </div>
    )
  }

  if (variantKey === 'active') {
    const currentModuleStatuses = MODULE_STATUS_OPTIONS[draftActiveFilter.searchIn] || []

    return (
      <div className="active-reminders-page">
        <section className="active-reminders-shell">
          <header className="active-reminders-header">
            <h1>Active Reminders</h1>
            <ExcelExportActionButton
              label="Download Excel"
              title="Download all reminders as Excel"
              className="active-reminders-header-download"
              onClick={handleExportAllActiveRows}
              disabled={reminders.length === 0}
            />
          </header>

          <div className="active-reminders-layout">
            <div className="active-reminders-users-panel">
              <div className="active-reminders-users-panel-header">Users</div>
              <div className="active-reminders-users-list">
                {userGroups.map((group) => (
                  <button
                    key={group.name}
                    type="button"
                    className={`active-reminders-user-row${selectedOwner === group.name ? ' active-reminders-user-row-selected' : ''}`}
                    onClick={() => setSelectedOwner(group.name)}
                  >
                    <FaUser className="active-reminders-user-icon" size={12} />
                    <span className="active-reminders-user-name">{group.name}</span>
                    <span className="active-reminders-user-badge">{group.count}</span>
                  </button>
                ))}
              </div>
            </div>

            <div className="active-reminders-detail-stage">
              {selectedOwner ? (
                isFilterPanelOpen ? (
                  <div className="active-reminders-filter-panel">
                    <div className="active-reminders-filter-header">
                      <span className="active-reminders-filter-title">{selectedOwner}</span>
                      <div className="active-reminders-filter-header-actions">
                        <button
                          type="button"
                          className="active-reminders-filter-action-btn active-reminders-filter-action-btn-green"
                          onClick={handleApplyActiveFilter}
                        >
                          Search
                        </button>
                        <button
                          type="button"
                          className="active-reminders-filter-action-btn active-reminders-filter-action-btn-red"
                          onClick={() => setIsFilterPanelOpen(false)}
                        >
                          Close
                        </button>
                      </div>
                    </div>

                    <div className="active-reminders-filter-body">
                      <div className="active-reminders-filter-control">
                        <label htmlFor="active-reminders-search-in">Search in</label>
                        <select
                          id="active-reminders-search-in"
                          value={draftActiveFilter.searchIn}
                          onChange={(event) => handleDraftModuleChange(event.target.value)}
                        >
                          {SEARCH_IN_OPTIONS.map((option) => (
                            <option key={option.value} value={option.value}>{option.label}</option>
                          ))}
                        </select>
                      </div>

                      <div className="active-reminders-filter-block">
                        <div className="active-reminders-filter-toggle-row">
                          <span>Date Filter</span>
                          <button
                            type="button"
                            className={`active-reminders-filter-toggle-btn${draftActiveFilter.dateFilterEnabled ? ' active-reminders-filter-toggle-btn-active' : ''}`}
                            onClick={() => setDraftActiveFilter((current) => ({
                              ...current,
                              dateFilterEnabled: !current.dateFilterEnabled,
                            }))}
                          >
                            {draftActiveFilter.dateFilterEnabled ? 'YES' : 'NO'}
                          </button>
                        </div>

                        <div className="active-reminders-filter-checkbox-row">
                          <label className="active-reminders-filter-checkbox">
                            <input
                              type="checkbox"
                              checked={draftActiveFilter.reminderDateChecked}
                              onChange={(event) => setDraftActiveFilter((current) => ({
                                ...current,
                                reminderDateChecked: event.target.checked,
                              }))}
                            />
                            <span>Reminder Date is</span>
                          </label>

                          <label className="active-reminders-filter-checkbox active-reminders-filter-checkbox-not">
                            <input
                              type="checkbox"
                              checked={draftActiveFilter.invertDate}
                              onChange={(event) => setDraftActiveFilter((current) => ({
                                ...current,
                                invertDate: event.target.checked,
                              }))}
                            />
                            <span>not</span>
                          </label>

                          <select
                            className="active-reminders-filter-date-select"
                            value={draftActiveFilter.datePreset}
                            onChange={(event) => setDraftActiveFilter((current) => ({
                              ...current,
                              datePreset: event.target.value,
                            }))}
                          >
                            {DATE_PRESET_OPTIONS.map((option) => (
                              <option key={option.value} value={option.value}>{option.label}</option>
                            ))}
                          </select>
                        </div>
                      </div>

                      <div className="active-reminders-filter-block">
                        <div className="active-reminders-filter-toggle-row">
                          <span>Status Filter</span>
                          <button
                            type="button"
                            className={`active-reminders-filter-toggle-btn${draftActiveFilter.statusFilterEnabled ? ' active-reminders-filter-toggle-btn-active' : ''}`}
                            onClick={() => setDraftActiveFilter((current) => ({
                              ...current,
                              statusFilterEnabled: !current.statusFilterEnabled,
                            }))}
                          >
                            {draftActiveFilter.statusFilterEnabled ? 'YES' : 'NO'}
                          </button>
                        </div>

                        <div className="active-reminders-filter-pills">
                          {currentModuleStatuses.map((statusLabel) => (
                            <button
                              key={statusLabel}
                              type="button"
                              className={`active-reminders-filter-pill${draftActiveFilter.selectedStatuses.includes(statusLabel) ? ' active-reminders-filter-pill-active' : ''}`}
                              onClick={() => handleDraftStatusToggle(statusLabel)}
                            >
                              {statusLabel}
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="active-reminders-detail-panel">
                    <div className="active-reminders-detail-header">
                      <span className="active-reminders-detail-title">{selectedOwner}</span>
                      <div className="active-reminders-detail-actions">
                        <button
                          type="button"
                          className="active-reminders-detail-btn active-reminders-detail-btn-green"
                          title="Filter"
                          onClick={handleOpenFilterPanel}
                        >
                          <FaFilter size={13} />
                        </button>
                        <ExcelExportActionButton
                          label="Export"
                          title="Download selected user's active reminders Excel"
                          className="active-reminders-detail-btn active-reminders-detail-btn-orange"
                          onClick={handleExportSelectedOwnerRows}
                          disabled={detailBaseRows.length === 0}
                        />
                      </div>
                    </div>

                    <div className="active-reminders-detail-tabs">
                      {ACTIVE_DETAIL_TABS.map((tab) => (
                        <button
                          key={tab.key}
                          type="button"
                          className={`active-reminders-detail-tab${activeDetailTab === tab.key ? ' active-reminders-detail-tab-active' : ''}`}
                          onClick={() => setActiveDetailTab(tab.key)}
                        >
                          {tab.label} ({(detailTabData[tab.key] || []).length})
                        </button>
                      ))}
                    </div>

                    <div className="active-reminders-detail-body">
                      {(detailTabData[activeDetailTab] || []).length > 0 ? (
                        <div className="active-reminders-detail-list">
                          {(detailTabData[activeDetailTab] || []).map((reminder) => (
                            <article key={reminder.id} className="active-reminders-detail-item">
                              <div className="active-reminders-detail-item-main">
                                <strong>{reminder.name}</strong>
                                <p>
                                  <span>{String(reminder.sourceLabel || reminder.sourceType || '-').toUpperCase()}</span>
                                  <span>{reminder.sourceNumber || '-'}</span>
                                  <span>{reminder.reminderDateDisplay}</span>
                                  <span>{formatReminderExportTime(reminder.reminderDate, reminder.reminderTime || reminder.reminderMode)}</span>
                                </p>
                                <p>
                                  <span>{reminder.customerNumber || '-'}</span>
                                  <span>{reminder.customerName || '-'}</span>
                                  <span>{reminder.ownerName || '-'}</span>
                                  <span>{reminder.filterStatusLabel || reminder.accountStatus || '-'}</span>
                                </p>
                                <span>{reminder.note !== '-' ? reminder.note : ''}</span>
                              </div>
                              <div className="active-reminders-item-actions" aria-label="Reminder actions">
                                <button
                                  type="button"
                                  className="active-reminders-item-action active-reminders-item-action-close"
                                  title="Close reminder"
                                  aria-label="Close reminder"
                                  onClick={() => handleCloseReminder(reminder)}
                                >
                                  <FaCheck />
                                </button>
                                <button
                                  type="button"
                                  className="active-reminders-item-action active-reminders-item-action-add"
                                  title="Add reminder"
                                  aria-label="Add reminder"
                                  onClick={() => handleUpdateReminderDate(reminder, 'Add')}
                                >
                                  <FaPlus />
                                </button>
                                <button
                                  type="button"
                                  className="active-reminders-item-action active-reminders-item-action-reschedule"
                                  title="Reschedule reminder"
                                  aria-label="Reschedule reminder"
                                  onClick={() => handleUpdateReminderDate(reminder, 'Reschedule')}
                                >
                                  <FaRedo />
                                </button>
                              </div>
                            </article>
                          ))}
                        </div>
                      ) : (
                        <p className="active-reminders-detail-empty-msg">
                          {activeDetailTab === 'today' && 'No tasks for today'}
                          {activeDetailTab === 'pending' && 'No pending reminders'}
                          {activeDetailTab === 'scheduled' && 'No scheduled reminders'}
                        </p>
                      )}
                    </div>
                  </div>
                )
              ) : (
                <div className="active-reminders-select-card">
                  <div className="active-reminders-select-prompt">
                    <FaHandPointRight className="active-reminders-select-icon" size={18} />
                    <span>Select the User</span>
                  </div>
                </div>
              )}
            </div>
          </div>
        </section>
      </div>
    )
  }

  return (
    <div className="support-request-legacy-page">
      <header className="support-request-legacy-header">
        <h1>{title} - {filteredRows.length} records</h1>
      </header>

      <div className="support-request-legacy-table-shell">
        <table className="support-request-legacy-table">
          <thead>
            <tr>
              {columns.map((column) => (
                <th key={column.key}>
                  <div className="support-request-legacy-th-content">
                    <span>{column.label}</span>
                    <FaChevronDown size={10} />
                  </div>
                </th>
              ))}
              <th>
                <div className="support-request-legacy-th-content">
                  <span>Action</span>
                </div>
              </th>
            </tr>
          </thead>
          <tbody>
            <tr className="support-request-legacy-filter-row">
              {columns.map((column) => (
                <td key={column.key}>
                  <input
                    type="text"
                    value={filters[column.key]}
                    onChange={(event) => handleFilterChange(column.key, event.target.value)}
                    placeholder="Search here ..."
                  />
                </td>
              ))}
              <td><div className="admin-reminders-action-spacer" /></td>
            </tr>

            {paginatedRows.length > 0 ? paginatedRows.map((reminder) => (
              <tr key={reminder.id}>
                <td>{reminder.reminderDateDisplay}</td>
                <td>{reminder.reminderMode}</td>
                <td>{reminder.name}</td>
                <td>{reminder.sourceLabel}</td>
                <td>{reminder.accountStatus || '-'}</td>
                <td>{reminder.ownerName}</td>
                <td>{reminder.note}</td>
                <td>
                  <span className={`admin-reminders-status admin-reminders-status-${reminder.status}`}>
                    {reminder.status === 'closed' ? 'Closed' : 'Active'}
                  </span>
                </td>
                <td>{reminder.closedOnDisplay}</td>
                <td>
                  {reminder.status === 'closed' ? (
                    <button type="button" className="admin-reminders-action-button admin-reminders-action-button-reopen" onClick={() => handleReopenReminder(reminder)}>
                      Reopen
                    </button>
                  ) : (
                    <button type="button" className="admin-reminders-action-button admin-reminders-action-button-close" onClick={() => handleCloseReminder(reminder)}>
                      Close
                    </button>
                  )}
                </td>
              </tr>
            )) : (
              <tr>
                <td colSpan={columns.length + 1} className="support-request-legacy-empty">
                  No reminders found for this view.
                </td>
              </tr>
            )}
          </tbody>
        </table>

        <div className="support-request-legacy-footer">
          <div className="support-request-legacy-footer-total">Total records: {filteredRows.length}</div>
          <div className="support-request-legacy-footer-pagination">
            <button type="button" onClick={() => setCurrentPage((page) => Math.max(1, page - 1))} disabled={currentPage === 1}>prev</button>
            <span>{currentPage}</span>
            <button type="button" onClick={() => setCurrentPage((page) => Math.min(totalPages, page + 1))} disabled={currentPage === totalPages}>next</button>
          </div>
        </div>
      </div>
    </div>
  )
}

export default AdminRemindersPage
