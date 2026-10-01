import React, { useEffect, useMemo, useRef, useState } from 'react'
import {
  FaBell,
  FaCalendarAlt,
  FaCaretDown,
  FaEnvelope,
  FaExchangeAlt,
  FaFileAlt,
  FaFileUpload,
  FaMapMarkerAlt,
  FaPencilAlt,
  FaPhone,
  FaTimes,
  FaTrash,
  FaUser,
  FaUserCog,
  FaEllipsisV,
  FaComments,
  FaHistory,
} from 'react-icons/fa'
import { FiEdit2 } from 'react-icons/fi'
import { useLocation, useNavigate, useParams } from 'react-router-dom'
import AddReminderModal from '../../../components/common/AddReminderModal'
import Button from '../../../components/common/Button'
import Modal from '../../../components/common/Modal'
import Quotations from '../../quotations/Quotations'
import { useAuth } from '../../../context/AuthContext'
import { useData } from '../../../context/DataContext'
import { buildAdminManageDealUrl } from '../../../features/adminDeals/config/adminDealViews'
import { buildCrmDealActionUrl } from '../crm-actions/CRMActionPage'
import { authService } from '../../../services/authService'
import { customerService } from '../../../services/customerService'
import { remarkApi } from '../../../services/remarkApi'
import { getCrmOwnerDisplay } from '../../../features/users/crmUserDirectory'
import { ACCOUNT_CHANGE_STATUS_OPTIONS } from '../../../features/adminAccounts/config/accountStages'
import {
  ACCOUNT_CATEGORY_OPTIONS,
  ACCOUNT_SOURCE_OPTIONS,
} from '../../../features/accounts/config/accountDropdownOptions'
import {
  CUSTOMER_QUOTATION_STATUS_OPTIONS,
  DEAL_LIFECYCLE_STATUS_OPTIONS,
} from '../../../features/adminDeals/config/dealUtils'
import { formatCurrency, formatDate, formatNumber } from '../../../utils/helpers'
import './AdminDealDetailPage.css'

const normalizeSearchValue = (value) => String(value || '').trim().toLowerCase()

const DEAL_TYPE_OPTIONS = [
  { value: 'LUMOS', label: 'LUMOS' },
  { value: 'SWATI', label: 'SWATI' },
  { value: 'PURCHASE ENQUIRY', label: 'PURCHASE ENQUIRY' },
  { value: 'TENDER ENQUIRY', label: 'TENDER ENQUIRY' },
]

const DEAL_SOURCE_SELECT_OPTIONS = DEAL_TYPE_OPTIONS
const DEAL_SUBSOURCE_SELECT_OPTIONS = ACCOUNT_SOURCE_OPTIONS
const PRODUCT_CATEGORY_SELECT_OPTIONS = ACCOUNT_CATEGORY_OPTIONS

const MANAGE_DEAL_LIFECYCLE_STATUS_OPTIONS = DEAL_LIFECYCLE_STATUS_OPTIONS.map((option) => ({
  ...option,
  label: option.value === 'Convert To PO' ? 'PO Converted' : option.label,
}))

const hasDisplayValue = (value) => {
  if (typeof value === 'number') return true
  return String(value || '').trim() !== ''
}

const renderDisplayValue = (value, options = null, fallback = 'Not Available') => {
  if (!hasDisplayValue(value)) return fallback
  if (options && Array.isArray(options)) {
    const opt = options.find((o) => String(o.value) === String(value))
    if (opt && opt.label) return opt.label
  }
  return value
}


const HIDDEN_MANAGE_DEAL_STATUS_VALUES = new Set(['converted', 'closed', 'contacted', 'order_lost'])
const STATUS_OPTIONS = ACCOUNT_CHANGE_STATUS_OPTIONS.filter((option) => (
  !HIDDEN_MANAGE_DEAL_STATUS_VALUES.has(option.value)
)).map((option) => ({
  ...option,
  label: option.value === 'convert_to_po' ? 'PO Converted' : option.label,
}))

const toDateInputValue = (dateString) => {
  if (!dateString) return ''
  const date = new Date(dateString)
  if (isNaN(date.getTime())) return ''
  return date.toISOString().split('T')[0]
}

const clampProbability = (value) => {
  const numericValue = Number(value)
  if (!Number.isFinite(numericValue)) return 0
  return Math.max(0, Math.min(100, numericValue))
}

const buildNormalizedDeal = ({ deal, accounts, customers, users, currentUser }) => {
  if (!deal) return null

  const userDirectory = users.reduce((lookup, entry) => {
    lookup[String(entry.id)] = entry.name
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
  const ownerUserId = String(
    deal.ownerUserId
    || deal.ownerId
    || deal.assignedTo
    || deal.assignedUserId
    || deal.userId
    || ''
  )
  const ownerName = (
    deal.dealOwnerName
    || deal.dealOwner
    || deal.ownerName
    || deal.assignedUserName
    || userDirectory[ownerUserId]
    || currentUser?.name
    || 'Unassigned'
  )

  return {
    ...deal,
    id: deal.id,
    linkedAccountId: String(linkedAccount?.id || deal.accountId || ''),
    linkedAccountName: linkedAccount?.name || linkedAccount?.accountName || deal.accountName || deal.customerName || '',
    dealNumber: deal.dealNumber || '',
    dealName: deal.name || '',
    dealDate: deal.dealDate || deal.createdAt || '',
    dealValue: Number(deal.value || 0),
    dealScore: deal.dealScore,
    probability: Number(deal.probability || 0),
    addedBy: deal.createdBy || ownerName,
    lastUpdated: deal.updatedAt || deal.createdAt || '',
    customerName: deal.customerName || linkedCustomer?.customerName || linkedAccount?.customerName || linkedAccount?.name || '',
    customerNumber: deal.customerNumber || linkedCustomer?.customerNumber || linkedAccount?.accountNumber || '',
    dealType: deal.dealType || deal.customerCategory || linkedAccount?.accountCategory || deal.stage || '',
    dealStatus: deal.status || '',
    dealOwner: deal.dealOwnerDisplay || getCrmOwnerDisplay(ownerName) || ownerName,
    dealSource: deal.dealSource || deal.source || linkedAccount?.accountOwner || '',
    dealSubsource: deal.dealSubsource || deal.subsource || '',
    contactName: deal.contactPerson || linkedAccount?.contactPerson || '',
    phone: deal.contactMobile || deal.contactPhone || linkedAccount?.contactMobile || linkedAccount?.contactPhone || linkedAccount?.phone || '',
    email: deal.contactEmail || linkedAccount?.contactEmail || linkedAccount?.email || '',
    address: deal.address || linkedAccount?.address || linkedCustomer?.address || '',
    description: deal.description || deal.remark || '',
    poValue: deal.poValue,
    customerReferenceDate: deal.customerReferenceDate || '',
    productCategory: deal.productCategory || deal.customerCategory || linkedAccount?.accountCategory || '',
    customerReferenceNumber: deal.customerReferenceNumber || '',
    consultantName: deal.consultantName || linkedAccount?.consultantName || '',
    gstin: deal.gstin || linkedAccount?.gstin || '',
    projectName: deal.projectName || linkedAccount?.projectName || '',
    orderCustomerStatus: deal.orderCustomerStatus || '',
    jobNo: deal.jobNo || linkedAccount?.jobNo || '',
    quotationCustomerStatus: deal.quotationCustomerStatus || '',
    expectedClosureDate: deal.expectedClosureDate || deal.closeDate || '',
    actualClosureDate: deal.actualClosureDate || '',
  }
}

const AdminDealDetailPage = () => {
  const { dealId } = useParams()
  const navigate = useNavigate()
  const location = useLocation()
  const { deals, convertedDeals, accounts, addNotification, updateDeal } = useData()
  const { user } = useAuth()
  const [isActionsMenuOpen, setIsActionsMenuOpen] = useState(false)
  const [isReminderOpen, setIsReminderOpen] = useState(false)
  const [probabilityDraft, setProbabilityDraft] = useState(0)
  const [isSavingProbability, setIsSavingProbability] = useState(false)

  const [editingFieldKey, setEditingFieldKey] = useState('')
  const [editValue, setEditValue] = useState('')
  const [isSavingField, setIsSavingField] = useState(false)
  const [inlineQuotationDeal, setInlineQuotationDeal] = useState(null)
  const [isDealHistoryModalOpen, setIsDealHistoryModalOpen] = useState(false)
  const [dealHistoryRemarks, setDealHistoryRemarks] = useState([])
  const [isLoadingDealHistory, setIsLoadingHistory] = useState(false)
  const [historyModalTitle, setHistoryModalTitle] = useState('')

  const handleOpenDealHistory = async () => {
    const targetDealId = deal?.sourceDealId || deal?.source_deal_id || deal?.dealId || deal?.id
    if (!targetDealId) return
    setIsLoadingHistory(true)
    setIsDealHistoryModalOpen(true)
    setHistoryModalTitle(`Remarks & Communication History - ${deal.dealName || deal.projectName || 'Deal'}`)
    try {
      const response = await remarkApi.getRemarks({ relatedEntityId: targetDealId, relatedEntityType: 'deal' })
      const rawApiRemarks = Array.isArray(response?.data) ? response.data : Array.isArray(response) ? response : []

      const merged = [...rawApiRemarks]
      const singleRemark = deal.remark || deal.notes || deal.description || deal.data?.remark
      if (singleRemark && typeof singleRemark === 'string' && singleRemark.trim()) {
        const text = singleRemark.trim()
        if (!merged.some((r) => String(r.content || r.remark || '').trim() === text)) {
          merged.push({
            id: `deal-remark-single-${targetDealId}`,
            content: text,
            category: 'general',
            createdByName: deal.addedBy || deal.dealOwner || deal.ownerName || 'User',
            createdAt: deal.lastUpdated || deal.dealDate || deal.createdAt || new Date().toISOString(),
          })
        }
      }

      const embeddedList = Array.isArray(deal.remarks)
        ? deal.remarks
        : Array.isArray(deal.data?.remarks)
          ? deal.data.remarks
          : Array.isArray(deal.history)
            ? deal.history
            : []

      embeddedList.forEach((item, idx) => {
        const text = typeof item === 'string' ? item : item.content || item.remark || item.note || item.text || ''
        if (text && text.trim()) {
          const cleanText = text.trim()
          if (!merged.some((r) => String(r.content || r.remark || '').trim() === cleanText)) {
            merged.push({
              id: item.id || item._id || `deal-embedded-${idx}`,
              content: cleanText,
              category: item.category || 'general',
              createdByName: item.createdByName || item.userName || item.addedBy || deal.dealOwner || 'User',
              createdAt: item.createdAt || item.date || deal.createdAt || new Date().toISOString(),
              startTime: item.startTime || null,
              endTime: item.endTime || null,
            })
          }
        }
      })

      merged.sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0))
      setDealHistoryRemarks(merged)
    } catch (error) {
      console.error('Failed to fetch deal history remarks:', error)
      setDealHistoryRemarks([])
    } finally {
      setIsLoadingHistory(false)
    }
  }

  const handleStartEditing = (key, initialValue) => {
    setEditingFieldKey(key)
    setEditValue(initialValue || '')
  }

  const handleCancelEditing = () => {
    setEditingFieldKey('')
    setEditValue('')
  }

  const handleSaveField = async (key) => {
    if (!deal?.id || isSavingField) return
    setIsSavingField(true)

    let updatePayload = { [key]: editValue }

    if (key === 'dealName') {
      updatePayload = { dealName: editValue, title: editValue, name: editValue }
    } else if (key === 'dealValue') {
      const val = editValue ? Number(editValue) : 0
      updatePayload = { dealValue: val, value: val, amount: val }
    } else if (key === 'dealScore' || key === 'poValue') {
      updatePayload[key] = editValue ? Number(editValue) : 0
    } else if (key === 'dealDate') {
      updatePayload = { dealDate: editValue }
    } else if (key === 'expectedClosureDate') {
      updatePayload = { expectedClosureDate: editValue, expectedCloseDate: editValue, closeDate: editValue }
    } else if (key === 'actualClosureDate') {
      updatePayload = { actualClosureDate: editValue }
    } else if (key === 'dealStatus') {
      updatePayload = { dealStatus: editValue, status: editValue, stage: editValue }
    } else if (key === 'dealType') {
      updatePayload = { dealType: editValue, customerCategory: editValue }
    } else if (key === 'dealSource') {
      updatePayload = { dealSource: editValue, source: editValue }
    } else if (key === 'dealSubsource') {
      updatePayload = { dealSubsource: editValue, subsource: editValue }
    } else if (key === 'contactName') {
      updatePayload = { contactName: editValue, contactPerson: editValue }
    } else if (key === 'phone') {
      updatePayload = { phone: editValue, contactPhone: editValue, contactMobile: editValue }
    } else if (key === 'email') {
      updatePayload = { email: editValue, contactEmail: editValue }
    } else if (key === 'customerReferenceDate') {
      updatePayload = { customerReferenceDate: editValue, customerRefDate: editValue }
    } else if (key === 'customerReferenceNumber') {
      updatePayload = { customerReferenceNumber: editValue, customerRefNo: editValue }
    } else if (key === 'reasonForLostOrder') {
      updatePayload = { reasonForLostOrder: editValue, reasonForLost: editValue }
    }

    const targetDealId = deal.sourceDealId || deal.source_deal_id || deal.dealId || deal.id
    const result = await updateDeal(targetDealId, updatePayload)
    setIsSavingField(false)

    if (!result.success) {
      addNotification('error', 'Update Deal', result.message || 'Unable to update field.')
      return
    }

    addNotification('success', 'Update Deal', 'Deal updated successfully.')
    setEditingFieldKey('')
    setEditValue('')
  }

  const renderInlineEditor = (item) => {
    const isSelect = item.options && item.options.length > 0
    return (
      <div className="admin-deal-detail-inline-editor">
        {isSelect ? (
          <select value={editValue} onChange={(e) => setEditValue(e.target.value)} disabled={isSavingField}>
            <option value="">Select...</option>
            {item.options.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
          </select>
        ) : item.type === 'date' ? (
          <input type="date" value={editValue} onChange={(e) => setEditValue(e.target.value)} disabled={isSavingField} />
        ) : (
          <input type={item.type || 'text'} value={editValue} onChange={(e) => setEditValue(e.target.value)} disabled={isSavingField} />
        )}
        <div className="admin-deal-detail-inline-actions">
          <button type="button" onClick={() => handleSaveField(item.key)} disabled={isSavingField}>{isSavingField ? 'Saving...' : 'Save'}</button>
          <button type="button" onClick={handleCancelEditing} disabled={isSavingField}>Cancel</button>
        </div>
      </div>
    )
  }

  const [isChangeTypeOpen, setIsChangeTypeOpen] = useState(false)
  const [changeTypeValue, setChangeTypeValue] = useState('')
  const actionsMenuRef = useRef(null)

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
    const foundInDeals = deals.find((entry) => (
      String(entry.id) === String(dealId)
      || String(entry.sourceDealId) === String(dealId)
      || String(entry.dealId) === String(dealId)
    ))
    if (foundInDeals) return foundInDeals

    const foundInConverted = (convertedDeals || []).find((entry) => (
      String(entry.id) === String(dealId)
      || String(entry.sourceDealId) === String(dealId)
      || String(entry.dealId) === String(dealId)
    ))
    if (foundInConverted) return foundInConverted

    const stateDeal = location.state?.dealSnapshot
    if (stateDeal && (
      String(stateDeal.id) === String(dealId)
      || String(stateDeal.sourceDealId) === String(dealId)
      || String(stateDeal.dealId) === String(dealId)
    )) {
      return stateDeal
    }

    return null
  }, [dealId, deals, convertedDeals, location.state])
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
    setProbabilityDraft(clampProbability(deal?.probability || 0))
  }, [deal?.id, deal?.probability])

  const fromPath = location.state?.fromPath || (user?.role === 'admin' ? '/admin/deals/view' : '/deals/view')

  const handleClose = () => {
    navigate(fromPath)
  }

  const navigateBackWithAction = (actionKey) => {
    if (!deal?.id) return
    navigate(fromPath, { state: { dealActionKey: actionKey, dealActionId: deal.id } })
  }

  const handleOpenDealActionPage = (actionKey) => {
    if (!deal?.id) return
    const routeActionUrl = user?.role === 'admin' 
      ? buildCrmDealActionUrl(actionKey, deal.id, fromPath) 
      : `/crm-actions/${actionKey}?module=deal&dealId=${deal.id}&returnTo=${encodeURIComponent(fromPath)}`
    navigate(routeActionUrl)
  }

  const handleSendMail = () => handleOpenDealActionPage('send-mail')
  const handleUploadQuotation = () => handleOpenDealActionPage('upload-deal-quotation')
  const handleReassignDeal = () => handleOpenDealActionPage('re-assign-deal')

  const handleGenerateQuotation = () => {
    if (!deal) return
    const targetDeal = sourceDeal || deal
    const isAdminPortal = window.location.pathname.startsWith('/admin')
    navigate(isAdminPortal ? '/admin/quotations' : '/quotations', {
      state: {
        openGenerator: true,
        preselectedDeal: targetDeal,
        activeTab: 'deal',
      },
    })
  }

  const handleSavedReminder = async (reminderData) => {
    await updateDeal(deal.sourceDealId || deal.source_deal_id || deal.id, {
      reminderDate: reminderData.reminderDate,
      reminderTime: reminderData.reminderTime,
      reminderMode: reminderData.reminderMode,
      reminderNote: reminderData.note.trim(),
    })
    setIsReminderOpen(false)
  }

  const handleOpenChangeType = () => {
    if (!deal) return
    setChangeTypeValue(deal.dealType || '')
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

    setIsSavingProbability(true)
    const result = await updateDeal(deal.sourceDealId || deal.source_deal_id || deal.id, {
      dealType: nextDealType,
      customerCategory: nextDealType,
      updatedAt: new Date().toISOString(),
    })
    setIsSavingProbability(false)

    if (!result.success) {
      addNotification('error', 'Change Type', result.message || 'Unable to change deal type.')
      return
    }

    handleCloseChangeType()
    addNotification('success', 'Change Type', `Deal type changed to ${nextDealType}.`)
  }

  const handleViewQuotation = () => {
    const basePath = location.pathname.startsWith('/admin') ? '/admin/quotation-manager/view' : '/quotation-manager/view'
    const query = new URLSearchParams({
      tab: 'deals',
      accountId: deal.accountId || deal.id || '',
      accountName: deal.accountName || deal.customerName || deal.title || '',
      accountNo: deal.accountNumber || deal.dealNumber || '',
    })
    navigate(`${basePath}?${query.toString()}`)
  }

  const actionsMenuItems = [
    { key: 'reminder', label: 'Add Reminder', icon: <FaBell />, accent: 'orange', onSelect: () => setIsReminderOpen(true) },
    { key: 'generateQuotation', label: 'Generate Quotation', icon: <FaFileAlt />, accent: 'green', onSelect: handleGenerateQuotation },
    { key: 'uploadQuotation', label: 'Upload Quotation', icon: <FaFileUpload />, accent: 'blue', onSelect: handleUploadQuotation },
    { key: 'viewQuotation', label: 'View Quotation', icon: <FaFileAlt />, accent: 'blue', onSelect: handleViewQuotation },
    { key: 'changeType', label: 'Change Type', icon: <FaExchangeAlt />, accent: 'green', onSelect: handleOpenChangeType },
    { key: 'reassign', label: 'Re-Assign Deal', icon: <FaUserCog />, accent: 'slate', onSelect: handleReassignDeal },
    { key: 'sendMail', label: 'Send Mail', icon: <FaEnvelope />, accent: 'blue', onSelect: handleSendMail },
  ]

  const handleActionsItemClick = (item) => {
    setIsActionsMenuOpen(false)
    item.onSelect()
  }

  const handleSaveProbability = async () => {
    if (!deal?.id) return

    const nextProbability = clampProbability(probabilityDraft)
    setIsSavingProbability(true)

    const result = await updateDeal(deal.sourceDealId || deal.source_deal_id || deal.id, {
      probability: nextProbability,
      updatedAt: new Date().toISOString(),
    })

    setIsSavingProbability(false)

    if (!result.success) {
      addNotification('error', 'Probability', result.message || 'Unable to update probability.')
      return
    }

    addNotification('success', 'Probability', `Probability updated to ${nextProbability}%.`)
  }

  if (!deal) {
    return (
      <div className="admin-deal-detail-page">
        <div className="admin-deal-detail-shell">
          <div className="admin-deal-detail-card">
            <div className="admin-deal-detail-toolbar">
              <h1>Deal Not Found</h1>
              <button type="button" className="admin-deal-detail-close" onClick={handleClose} aria-label="Close deal details">
                <FaTimes />
              </button>
            </div>
            <div className="admin-deal-detail-empty">
              The requested deal could not be found.
            </div>
            <div className="admin-deal-detail-actions">
              <Button type="button" variant="outline" onClick={handleClose}>
                Back To Deals
              </Button>
            </div>
          </div>
        </div>
      </div>
    )
  }

  const probabilityValue = clampProbability(probabilityDraft)
  const savedProbabilityValue = clampProbability(deal.probability || 0)
  const customerLabel = [deal.customerName, deal.customerNumber ? `[${deal.customerNumber}]` : ''].filter(Boolean).join(' ')
  const overviewItems = [
    { key: 'dealName', label: 'Deal Name', value: deal.dealName || deal.dealNumber, rawValue: deal.dealName, type: 'text', icon: <FaUser /> },
    { key: 'dealDate', label: 'Deal Date', value: renderDisplayValue(deal.dealDate ? formatDate(deal.dealDate) : '', null), rawValue: toDateInputValue(deal.dealDate), type: 'date', icon: <FaCalendarAlt /> },
    { key: 'dealValue', label: 'Deal Value', value: formatCurrency(deal.dealValue || 0), rawValue: deal.dealValue, type: 'number', icon: <FaUser /> },
    { key: 'addedBy', label: 'Added By', value: renderDisplayValue(deal.addedBy, null), readonly: true, icon: <FaUser /> },
    { key: 'lastUpdated', label: 'Last Updated', value: renderDisplayValue(deal.lastUpdated ? formatDate(deal.lastUpdated, 'long') : '', null), readonly: true, icon: <FaCalendarAlt /> },
    { key: 'customerName', label: 'Customer', value: renderDisplayValue(customerLabel, null), readonly: true, icon: <FaUser /> },
    { key: 'expectedClosureDate', label: 'Expected Closure Date', value: renderDisplayValue(deal.expectedClosureDate ? formatDate(deal.expectedClosureDate) : '', null), rawValue: toDateInputValue(deal.expectedClosureDate), type: 'date', icon: <FaCalendarAlt /> },
    { key: 'actualClosureDate', label: 'Actual Closure Date', value: renderDisplayValue(deal.actualClosureDate ? formatDate(deal.actualClosureDate) : '', null), rawValue: toDateInputValue(deal.actualClosureDate), type: 'date', icon: <FaCalendarAlt /> },
  ]
  const detailItems = [
    { key: 'dealType', label: 'Deal Type', value: deal.dealType, rawValue: deal.dealType, type: 'text' },
    { key: 'dealStatus', label: 'Deal Status', value: deal.dealStatus, rawValue: deal.dealStatus, type: 'select', options: STATUS_OPTIONS },
    { key: 'dealOwner', label: 'Deal Owner', value: deal.dealOwner, readonly: true },
  ]
  const contactItems = [
    { key: 'contactName', label: 'Contact Name', value: deal.contactName, rawValue: deal.contactName, type: 'text', icon: <FaUser /> },
    { key: 'phone', label: 'Phone', value: deal.phone, rawValue: deal.phone, type: 'text', icon: <FaPhone /> },
    { key: 'email', label: 'Email', value: deal.email, rawValue: deal.email, type: 'text', icon: <FaEnvelope /> },
    { key: 'address', label: 'Address', value: deal.address, rawValue: deal.address, type: 'text', icon: <FaMapMarkerAlt /> },
  ]
  const otherItems = [
    { key: 'poValue', label: 'PO Value', value: hasDisplayValue(deal.poValue) ? formatCurrency(deal.poValue) : renderDisplayValue(deal.poValue, null), rawValue: deal.poValue, type: 'number' },
    { key: 'customerReferenceDate', label: 'Customer Ref. Date', value: deal.customerReferenceDate ? formatDate(deal.customerReferenceDate) : '', rawValue: toDateInputValue(deal.customerReferenceDate), type: 'date' },
    { key: 'productCategory', label: 'Product Category', value: deal.productCategory, rawValue: deal.productCategory, type: 'select', options: PRODUCT_CATEGORY_SELECT_OPTIONS },
    { key: 'customerReferenceNumber', label: 'Customer Ref. No.', value: deal.customerReferenceNumber, rawValue: deal.customerReferenceNumber, type: 'text' },
    { key: 'consultantName', label: 'Consultant Name', value: deal.consultantName, rawValue: deal.consultantName, type: 'text' },
    { key: 'gstin', label: 'GSTIN', value: deal.gstin, rawValue: deal.gstin, type: 'text' },
    { key: 'projectName', label: 'Project Name', value: deal.projectName, rawValue: deal.projectName, type: 'text' },
    { key: 'orderCustomerStatus', label: 'Status Of Customer as per Order Received', value: deal.orderCustomerStatus, rawValue: deal.orderCustomerStatus, type: 'select', options: MANAGE_DEAL_LIFECYCLE_STATUS_OPTIONS },
    { key: 'jobNo', label: 'Job No', value: deal.jobNo, rawValue: deal.jobNo, type: 'text' },
    { key: 'quotationCustomerStatus', label: 'Status Of Customer as per quotation Given', value: deal.quotationCustomerStatus, rawValue: deal.quotationCustomerStatus, type: 'select', options: CUSTOMER_QUOTATION_STATUS_OPTIONS },
  ]

  return (
    <>
      <div className="admin-deal-detail-page">
        <div className="admin-deal-detail-shell">
          <article className="admin-deal-detail-card">
            <header className="admin-deal-detail-toolbar">
              <div className="admin-deal-detail-heading">
                <h1>{deal.dealName || deal.dealNumber || 'Deal Details'}</h1>
              </div>
              <button type="button" className="admin-deal-detail-close" onClick={handleClose} aria-label="Close deal details">
                <FaTimes />
              </button>
            </header>

            <div className="admin-deal-detail-meta">
              <div className="admin-deal-detail-meta-copy">
                <span className="admin-deal-detail-meta-label">Deal No.</span>
                <strong>{renderDisplayValue(deal.dealNumber, null)}</strong>
              </div>

              <div className="admin-deal-detail-meta-actions" style={{ display: 'flex', alignItems: 'center' }}>
                <button
                  type="button"
                  className="admin-deal-detail-history-trigger"
                  onClick={handleOpenDealHistory}
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
                <div className="admin-deal-detail-actions-menu" ref={actionsMenuRef}>
                  <button
                    type="button"
                    className="admin-deal-detail-actions-trigger"
                    onClick={() => setIsActionsMenuOpen((value) => !value)}
                    aria-haspopup="menu"
                    aria-expanded={isActionsMenuOpen}
                    title="Actions"
                    aria-label="Actions"
                  >
                    <FaEllipsisV />
                  </button>

                  {isActionsMenuOpen ? (
                    <div className="admin-deal-detail-actions-popup" role="menu">
                      {actionsMenuItems.map((item) => (
                        <button
                          key={item.key}
                          type="button"
                          role="menuitem"
                          className={`admin-deal-detail-actions-item admin-deal-detail-actions-item-${item.accent}`}
                          onClick={() => handleActionsItemClick(item)}
                        >
                          <span className="admin-deal-detail-actions-item-icon">{item.icon}</span>
                          <span>{item.label}</span>
                        </button>
                      ))}
                    </div>
                  ) : null}
                </div>
              </div>
            </div>

            <section className="admin-deal-detail-probability">
              <div className="admin-deal-detail-probability-header">
                <div className="admin-deal-detail-section-label">Probability</div>
                <div className="admin-deal-detail-probability-value">{formatNumber(probabilityValue)}%</div>
              </div>
              <div className="admin-deal-detail-probability-bar" aria-hidden="true">
                <span className="admin-deal-detail-probability-fill" style={{ width: `${probabilityValue}%` }} />
              </div>
              <div className="admin-deal-detail-probability-controls">
                <input
                  type="range"
                  min="0"
                  max="100"
                  step="1"
                  value={probabilityValue}
                  onChange={(event) => setProbabilityDraft(clampProbability(event.target.value))}
                  className="admin-deal-detail-probability-slider"
                  style={{ '--probability-value': `${probabilityValue}%` }}
                  aria-label="Deal probability"
                />
                <Button
                  type="button"
                  size="small"
                  onClick={handleSaveProbability}
                  disabled={isSavingProbability || probabilityValue === savedProbabilityValue}
                >
                  {isSavingProbability ? 'Saving...' : 'Save'}
                </Button>
              </div>
            </section>

            <div className="admin-deal-detail-flat-fields">
              {[...overviewItems, ...detailItems, ...contactItems, ...otherItems].map((item, idx) => {
                const isSingleFieldEditing = editingFieldKey === item.key
                return (
                  <label 
                    key={`${item.key}-${idx}`} 
                    className={`admin-deal-detail-field admin-deal-detail-field--flat ${isSingleFieldEditing ? 'admin-deal-detail-field--single-editing' : ''}`}
                    data-field-key={item.key}
                  >
                    <span className="admin-deal-detail-field-label">
                      <span>{item.label}</span>
                      {!item.readonly ? (
                        <button
                          type="button"
                          className="admin-deal-detail-field-edit-btn"
                          onClick={(event) => {
                            event.preventDefault()
                            event.stopPropagation()
                            handleStartEditing(item.key, item.rawValue)
                          }}
                          aria-label={`Edit ${item.label}`}
                          title={`Edit ${item.label}`}
                        >
                          <FiEdit2 />
                        </button>
                      ) : null}
                    </span>
                    {isSingleFieldEditing ? (
                      renderInlineEditor(item)
                    ) : (
                      <span className={`admin-deal-detail-info-row-value ${hasDisplayValue(item.value) ? '' : 'admin-deal-detail-item-value-empty'}`}>
                        {renderDisplayValue(item.value, item.options)}
                      </span>
                    )}
                  </label>
                )
              })}

              <label 
                className={`admin-deal-detail-field admin-deal-detail-field--flat admin-deal-detail-field-wide ${editingFieldKey === 'description' ? 'admin-deal-detail-field--single-editing' : ''}`}
                data-field-key="description"
              >
                <span className="admin-deal-detail-field-label">
                  <span>Description</span>
                  <button
                    type="button"
                    className="admin-deal-detail-field-edit-btn"
                    onClick={(event) => {
                      event.preventDefault()
                      event.stopPropagation()
                      handleStartEditing('description', deal.description)
                    }}
                    aria-label="Edit Description"
                    title="Edit Description"
                  >
                    <FiEdit2 />
                  </button>
                </span>
                {editingFieldKey === 'description' ? (
                  renderInlineEditor({ key: 'description', type: 'text', rawValue: deal.description })
                ) : (
                  <span className={`admin-deal-detail-info-row-value ${hasDisplayValue(deal.description) ? '' : 'admin-deal-detail-item-value-empty'}`}>
                    {renderDisplayValue(deal.description, null)}
                  </span>
                )}
              </label>
            </div>
          </article>
        </div>
      </div>
      <Modal
        isOpen={isChangeTypeOpen}
        onClose={handleCloseChangeType}
        title="Change Type"
        size="small"
      >
        <form className="admin-deal-detail-change-type-form" onSubmit={handleSaveDealType}>
          <label className="admin-deal-detail-change-type-field">
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
          <div className="admin-deal-detail-change-type-actions">
            <Button type="button" variant="outline" onClick={handleCloseChangeType} disabled={isSavingProbability}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSavingProbability}>
              {isSavingProbability ? 'Saving...' : 'Save Type'}
            </Button>
          </div>
        </form>
      </Modal>

      <AddReminderModal
        isOpen={isReminderOpen}
        onClose={() => setIsReminderOpen(false)}
        contextLabel={`${deal?.dealName || deal?.dealNumber || 'Deal'} | ${deal?.dealNumber || ''}`}
        createdBy={user?.name}
        relatedEntityType="deal"
        relatedEntityId={deal?.id}
        assignedTo={deal?.assignedTo || deal?.ownerUserId || deal?.userId || user?.id}
        onSaved={handleSavedReminder}
      />

      {inlineQuotationDeal && (
        <Quotations
          autoOpen={true}
          preselectedDeal={inlineQuotationDeal}
          onClose={() => setInlineQuotationDeal(null)}
        />
      )}

      {isDealHistoryModalOpen && (
        <Modal
          isOpen={isDealHistoryModalOpen}
          onClose={() => setIsDealHistoryModalOpen(false)}
          title={historyModalTitle}
          size="large"
        >
          <div style={{ padding: '8px', maxHeight: '70vh', overflowY: 'auto' }}>
            {isLoadingDealHistory ? (
              <div style={{ padding: '30px', textAlign: 'center', color: '#64748b' }}>
                Loading deal history...
              </div>
            ) : dealHistoryRemarks.length === 0 ? (
              <div style={{ padding: '30px', textAlign: 'center', color: '#64748b' }}>
                No remarks history found for this deal.
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {dealHistoryRemarks.map((rem) => (
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
    </>
  )
}

export default AdminDealDetailPage
