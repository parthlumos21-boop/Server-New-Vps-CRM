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
  FaPhone,
  FaTimes,
  FaTrash,
  FaUser,
  FaUserCog,
} from 'react-icons/fa'
import { useLocation, useNavigate, useParams } from 'react-router-dom'
import Button from '../../../components/common/Button'
import Modal from '../../../components/common/Modal'
import { useAuth } from '../../../context/AuthContext'
import { useData } from '../../../context/DataContext'
import { buildAdminManageDealUrl } from '../../../features/adminDeals/config/adminDealViews'
import { buildCrmDealActionUrl } from '../crm-actions/CRMActionPage'
import { authService } from '../../../services/authService'
import { customerService } from '../../../services/customerService'
import { getCrmOwnerDisplay } from '../../../features/users/crmUserDirectory'
import { formatCurrency, formatDate, formatNumber } from '../../../utils/helpers'
import './AdminDealDetailPage.css'

const normalizeSearchValue = (value) => String(value || '').trim().toLowerCase()

const DEAL_TYPE_OPTIONS = [
  { value: 'LUMOS', label: 'LUMOS' },
  { value: 'SWATI', label: 'SWATI' },
  { value: 'PURCHASE ENQUIRY', label: 'PURCHASE ENQUIRY' },
  { value: 'TENDER ENQUIRY', label: 'TENDER ENQUIRY' },
]

const hasDisplayValue = (value) => {
  if (typeof value === 'number') return true
  return String(value || '').trim() !== ''
}

const renderDisplayValue = (value, fallback = 'Not Available') => (
  hasDisplayValue(value) ? value : fallback
)

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
  const { deals, accounts, addNotification, updateDeal } = useData()
  const { user } = useAuth()
  const [isActionsMenuOpen, setIsActionsMenuOpen] = useState(false)
  const [probabilityDraft, setProbabilityDraft] = useState(0)
  const [isSavingProbability, setIsSavingProbability] = useState(false)
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
    const stateDeal = location.state?.dealSnapshot
    if (stateDeal && String(stateDeal.id) === String(dealId)) {
      return stateDeal
    }

    return deals.find((entry) => String(entry.id) === String(dealId)) || null
  }, [dealId, deals, location.state])
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

  const fromPath = location.state?.fromPath || '/admin/deals/view'

  const handleClose = () => {
    navigate(fromPath)
  }

  const handleManageDeal = () => {
    if (!deal?.id) return
    navigate(buildAdminManageDealUrl(deal.id), {
      state: {
        fromPath,
        dealSnapshot: sourceDeal || deal,
      },
    })
  }

  const navigateBackWithAction = (actionKey) => {
    if (!deal?.id) return
    navigate(fromPath, { state: { dealActionKey: actionKey, dealActionId: deal.id } })
  }

  const handleSendMail = () => {
    if (!deal?.id) return
    navigate(buildCrmDealActionUrl('send-mail', deal.id, fromPath))
  }

  const handleUploadQuotation = () => {
    if (!deal?.id) return
    navigate(buildCrmDealActionUrl('upload-deal-quotation', deal.id, fromPath))
  }

  const handleReassignDeal = () => {
    if (!deal?.id) return
    navigate(buildCrmDealActionUrl('re-assign-deal', deal.id, fromPath))
  }

  const handleChangeStatus = () => {
    navigateBackWithAction('change-status')
  }

  const handleGenerateQuotation = () => {
    if (!deal) return

    navigate('/admin/quotations', {
      state: {
        openGenerator: true,
        preselectedDeal: sourceDeal || deal,
      },
    })
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
    const result = await updateDeal(deal.id, {
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

  const actionsMenuItems = [
    { key: 'reminder', label: 'Add Reminder', icon: <FaBell />, accent: 'orange', onSelect: () => navigateBackWithAction('reminder') },
    { key: 'generateQuotation', label: 'Generate Quotation', icon: <FaFileAlt />, accent: 'green', onSelect: handleGenerateQuotation },
    { key: 'uploadQuotation', label: 'Upload Quotation', icon: <FaFileUpload />, accent: 'blue', onSelect: handleUploadQuotation },
    { key: 'changeType', label: 'Change Type', icon: <FaExchangeAlt />, accent: 'green', onSelect: handleOpenChangeType },
    { key: 'reassign', label: 'Re-Assign Deal', icon: <FaUserCog />, accent: 'slate', onSelect: handleReassignDeal },
    { key: 'sendMail', label: 'Send Mail', icon: <FaEnvelope />, accent: 'blue', onSelect: handleSendMail },
    { key: 'delete', label: 'Delete Deal', icon: <FaTrash />, accent: 'danger', onSelect: () => navigateBackWithAction('delete') },
  ]

  const handleActionsItemClick = (item) => {
    setIsActionsMenuOpen(false)
    item.onSelect()
  }

  const handleSaveProbability = async () => {
    if (!deal?.id) return

    const nextProbability = clampProbability(probabilityDraft)
    setIsSavingProbability(true)

    const result = await updateDeal(deal.id, {
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
    { label: 'Deal Name', value: deal.dealName || deal.dealNumber, icon: <FaUser /> },
    { label: 'Deal Date', value: renderDisplayValue(deal.dealDate ? formatDate(deal.dealDate) : ''), icon: <FaCalendarAlt /> },
    { label: 'Deal Value', value: formatCurrency(deal.dealValue || 0), icon: <FaUser /> },
    { label: 'Added By', value: renderDisplayValue(deal.addedBy), icon: <FaUser /> },
    { label: 'Deal Score', value: hasDisplayValue(deal.dealScore) ? formatNumber(Number(deal.dealScore || 0)) : '0', icon: <FaUser /> },
    { label: 'Last Updated', value: renderDisplayValue(deal.lastUpdated ? formatDate(deal.lastUpdated, 'long') : ''), icon: <FaCalendarAlt /> },
    { label: 'Customer', value: renderDisplayValue(customerLabel), icon: <FaUser /> },
    { label: 'Expected Closure Date', value: renderDisplayValue(deal.expectedClosureDate ? formatDate(deal.expectedClosureDate) : ''), icon: <FaCalendarAlt /> },
    { label: 'Actual Closure Date', value: renderDisplayValue(deal.actualClosureDate ? formatDate(deal.actualClosureDate) : ''), icon: <FaCalendarAlt /> },
  ]
  const detailItems = [
    { label: 'Deal Type', value: deal.dealType },
    { label: 'Deal Status', value: deal.dealStatus },
    { label: 'Deal Owner', value: deal.dealOwner },
    { label: 'Deal Source', value: deal.dealSource },
    { label: 'Deal Subsource', value: deal.dealSubsource },
  ]
  const contactItems = [
    { label: 'Contact Name', value: deal.contactName, icon: <FaUser /> },
    { label: 'Phone', value: deal.phone, icon: <FaPhone /> },
    { label: 'Email', value: deal.email, icon: <FaEnvelope /> },
    { label: 'Address', value: deal.address, icon: <FaMapMarkerAlt /> },
  ]
  const otherItems = [
    { label: 'PO Value', value: deal.poValue },
    { label: 'Customer Ref. Date', value: deal.customerReferenceDate ? formatDate(deal.customerReferenceDate) : '' },
    { label: 'Product Category', value: deal.productCategory },
    { label: 'Customer Ref. No.', value: deal.customerReferenceNumber },
    { label: 'Consultant Name', value: deal.consultantName },
    { label: 'GSTIN', value: deal.gstin },
    { label: 'Project Name', value: deal.projectName },
    { label: 'Status Of Customer as per Order Received', value: deal.orderCustomerStatus },
    { label: 'Job No', value: deal.jobNo },
    { label: 'Deal Source', value: deal.dealSource },
    { label: 'Status Of Customer as per quotation Given', value: deal.quotationCustomerStatus },
    { label: 'Deal Subsource', value: deal.dealSubsource },
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
              <strong>{renderDisplayValue(deal.dealNumber)}</strong>
            </div>

            <div className="admin-deal-detail-meta-actions">
              <Button type="button" size="small" onClick={handleManageDeal}>
                Manage Deal
              </Button>
              <Button type="button" size="small" variant="primary" style={{ background: '#3b82f6', borderColor: '#3b82f6' }} onClick={handleChangeStatus}>
                Change Status
              </Button>

              <div className="admin-deal-detail-actions-menu" ref={actionsMenuRef}>
                <button
                  type="button"
                  className="admin-deal-detail-actions-trigger"
                  onClick={() => setIsActionsMenuOpen((value) => !value)}
                  aria-haspopup="menu"
                  aria-expanded={isActionsMenuOpen}
                >
                  <span>Actions</span>
                  <FaCaretDown />
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

          <div className="admin-deal-detail-cards">
            {[
              { key: 'overview', title: 'Overview', items: overviewItems },
              { key: 'detail', title: 'Deal Details', items: detailItems },
              { key: 'contact', title: 'Contact', items: contactItems },
              { key: 'other', title: 'Other Details', items: otherItems },
            ].map((group) => (
              <section key={group.key} className="admin-deal-detail-info-card">
                <header className="admin-deal-detail-info-card-header">
                  <span className="admin-deal-detail-info-card-title">{group.title}</span>
                </header>
                <div className="admin-deal-detail-info-card-body">
                  {group.items.map((item) => (
                    <div key={`${group.key}-${item.label}`} className="admin-deal-detail-info-row">
                      <span className="admin-deal-detail-info-row-label">
                        {item.icon}
                        {item.label}
                      </span>
                      <span className={`admin-deal-detail-info-row-value ${hasDisplayValue(item.value) ? '' : 'admin-deal-detail-item-value-empty'}`}>
                        {renderDisplayValue(item.value)}
                      </span>
                    </div>
                  ))}
                </div>
              </section>
            ))}

            <section className="admin-deal-detail-info-card admin-deal-detail-info-card-wide">
              <header className="admin-deal-detail-info-card-header">
                <span className="admin-deal-detail-info-card-title">Description</span>
              </header>
              <div className="admin-deal-detail-info-card-body">
                <div className={`admin-deal-detail-description ${hasDisplayValue(deal.description) ? '' : 'admin-deal-detail-item-value-empty'}`}>
                  {renderDisplayValue(deal.description)}
                </div>
              </div>
            </section>
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
    </>
  )
}

export default AdminDealDetailPage
