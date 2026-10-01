import React, { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate, useParams, useSearchParams } from 'react-router-dom'
import {
  FaBell,
  FaClock,
  FaEdit,
  FaEnvelope,
  FaExchangeAlt,
  FaExternalLinkAlt,
  FaFileAlt,
  FaFileSignature,
  FaHome,
  FaLayerGroup,
  FaMapMarkerAlt,
  FaPhoneAlt,
  FaPlus,
  FaStickyNote,
  FaTimes,
  FaTrash,
  FaUpload,
  FaUser,
} from 'react-icons/fa'
import Badge from '../../../components/common/Badge'
import Button from '../../../components/common/Button'
import { useData } from '../../../context/DataContext'
import { buildAdminDealDetailUrl } from '../../../features/adminDeals/config/adminDealViews'
import { ACCOUNT_ACTION_MAP, ACCOUNT_ROW_ACTIONS } from '../../../features/adminAccounts/config/accountActions'
import { buildAdminAccountActionUrl, buildAdminAccountBoardReturnUrl, openAdminAccountActionPage } from '../../../features/adminAccounts/utils/accountNavigation'
import { buildCrmAccountActionUrl } from '../crm-actions/CRMActionPage'
import { getAccountById } from '../../../features/adminAccounts/selectors/getAccountById'
import { getStatusColor } from '../../../utils/helpers'
import AccountActionModal from './AccountActionModal'
import './AccountDetailsPage.css'

const ACTION_ICON_BY_KEY = {
  'add-note-remarks': FaStickyNote,
  'add-reminder': FaBell,
  'change-status': FaClock,
  'add-document': FaFileAlt,
  'generate-quotation': FaFileSignature,
  'upload-quotation': FaUpload,
  're-assign-account': FaExchangeAlt,
  'change-account-category': FaLayerGroup,
  'view-linked-deal': FaExternalLinkAlt,
  'converted-deal': FaExchangeAlt,
  'send-mail': FaEnvelope,
  'manage-account': FaExternalLinkAlt,
  delete: FaTrash,
}

const DETAIL_ACTION_ITEMS = [
  { key: 'add-reminder', label: 'Add Reminder' },
  { key: 'change-status', label: 'Change Account Status' },
  { key: 'add-document', label: 'Add Document' },
  { key: 'generate-quotation', label: 'Generate Quotation' },
  { key: 'upload-quotation', label: 'Upload Quotation' },
  { key: 're-assign-account', label: 'Re-Assign Account' },
  { key: 'change-account-category', label: 'Change Account Category' },
  { key: 'view-linked-deal', label: 'View Deal' },
  { key: 'converted-deal', label: 'Converted Deal' },
  { key: 'send-mail', label: 'Send Mail' },
  { key: 'manage-account', label: 'Manage Account' },
  { key: 'delete', label: 'Delete' },
]

const QUICK_ACTIONS = [
  { key: 'manage-account', icon: FaHome, title: 'Manage Account' },
  { key: 'change-status', icon: FaClock, title: 'Change Status' },
  { key: 'add-reminder', icon: FaBell, title: 'Add Reminder' },
  { key: 'send-mail', icon: FaEnvelope, title: 'Send Mail' },
  { key: 'add-note-remarks', icon: FaEdit, title: 'Add Notes/Remarks' },
]

const renderFieldIcon = (label) => {
  const normalizedLabel = String(label || '').toLowerCase()

  if (normalizedLabel.includes('phone')) return <FaPhoneAlt />
  if (normalizedLabel.includes('email')) return <FaEnvelope />
  if (normalizedLabel.includes('location') || normalizedLabel.includes('address') || normalizedLabel.includes('state')) return <FaMapMarkerAlt />
  return <FaUser />
}

const AccountField = ({ field }) => (
  <div className="account-details-field">
    <div className="account-details-field-label">
      <span className="account-details-field-icon">{renderFieldIcon(field.label)}</span>
      <span>{field.label}</span>
    </div>
    <div className={`account-details-field-value ${field.missing ? 'account-details-field-value-missing' : ''}`}>
      {field.value}
    </div>
  </div>
)

const AccountDetailsPage = () => {
  const navigate = useNavigate()
  const { accountId } = useParams()
  const [searchParams] = useSearchParams()
  const { accounts, convertedDeals, addNotification, deleteAccount } = useData()
  const [isActionsOpen, setIsActionsOpen] = useState(false)
  const [activeActionKey, setActiveActionKey] = useState(null)
  const [, setRefreshKey] = useState(0)
  const actionsRef = useRef(null)

  const account = getAccountById(accounts, accountId)
  const boardUrl = useMemo(() => buildAdminAccountBoardReturnUrl(searchParams), [searchParams])
  const relatedConvertedDeals = useMemo(() => (
    (Array.isArray(convertedDeals) ? convertedDeals : [])
      .filter((entry) => String(entry.accountId || '') === String(account?.id || ''))
      .sort((left, right) => (
        new Date(right.convertedAt || right.createdAt || 0).getTime()
        - new Date(left.convertedAt || left.createdAt || 0).getTime()
      ))
  ), [account?.id, convertedDeals])
  const linkedDealId = account?.dealId
    || relatedConvertedDeals[0]?.sourceDealId
    || relatedConvertedDeals[0]?.dealId
    || account?.convertedDealId
    || ''
  const isConvertedAccount = Boolean(account?.isConverted || account?.dealId || account?.convertedDealId || relatedConvertedDeals.length > 0)
  const visibleDetailActionItems = DETAIL_ACTION_ITEMS.filter((action) => (
    (action.key !== 'converted-deal' || !isConvertedAccount)
    && (action.key !== 'view-linked-deal' || isConvertedAccount)
  ))

  useEffect(() => {
    const handleOutsideClick = (event) => {
      if (actionsRef.current && !actionsRef.current.contains(event.target)) {
        setIsActionsOpen(false)
      }
    }

    document.addEventListener('mousedown', handleOutsideClick)
    return () => document.removeEventListener('mousedown', handleOutsideClick)
  }, [])

  useEffect(() => {
    if (!accountId) {
      navigate(boardUrl, { replace: true })
    }
  }, [accountId, boardUrl, navigate])

  if (!account) {
    return (
      <div className="account-details-page">
        <div className="account-details-shell">
          <div className="account-details-empty">
            <h1>Account not found</h1>
            <p>The requested account could not be found in the current records.</p>
            <Button onClick={() => navigate(boardUrl)}>Back To Board</Button>
          </div>
        </div>
      </div>
    )
  }

  const handleOpenAction = (action) => {
    setIsActionsOpen(false)

    if (action.key === 'send-mail') {
      navigate(buildCrmAccountActionUrl('send-mail', account.id, boardUrl))
      return
    }

    if (action.key === 'converted-deal') {
      navigate(buildAdminAccountActionUrl(ACCOUNT_ACTION_MAP['converted-deal'].route, account.id, searchParams))
      return
    }

    if (action.key === 'view-linked-deal') {
      if (!linkedDealId) {
        addNotification('warning', 'Deal not found', 'This account does not have a linked deal yet.')
        return
      }

      navigate(buildAdminDealDetailUrl(linkedDealId), { state: { fromPath: boardUrl } })
      return
    }

    setActiveActionKey(action.key)
  }

  const handleDetailAction = async (action) => {
    setIsActionsOpen(false)

    if (action.key === 'generate-quotation') {
      navigate('/admin/quotations', {
        state: {
          openGenerator: true,
          preselectedAccountId: account.id,
        },
      })
      return
    }

    if (ACCOUNT_ACTION_MAP[action.key]) {
      handleOpenAction(action)
      return
    }

    if (action.key === 'upload-quotation') {
      navigate('/admin/quotations')
      return
    }

    if (action.key === 'change-account-category') {
      openAdminAccountActionPage(ACCOUNT_ACTION_MAP['manage-account'].route, account.id, searchParams)
      addNotification('info', 'Manage Account opened', 'Use the Manage Account workspace to update the account category.')
      return
    }

    if (action.key === 'manage-account') {
      openAdminAccountActionPage(ACCOUNT_ACTION_MAP['manage-account'].route, account.id, searchParams)
      return
    }

    if (action.key === 'delete') {
      const confirmed = window.confirm(`Delete account "${account.name}"?`)
      if (!confirmed) return

      const result = await deleteAccount(account.id)
      if (!result.success) {
        addNotification('error', 'Delete failed', result.message || 'Unable to delete this account.')
        return
      }

      addNotification('success', 'Account deleted', 'The selected account was deleted successfully.')
      navigate(boardUrl)
    }
  }

  const quickActions = QUICK_ACTIONS
    .map((entry) => {
      const action = ACCOUNT_ROW_ACTIONS.find((candidate) => candidate.key === entry.key)
      return action ? { ...entry, action } : null
    })
    .filter(Boolean)

  return (
    <div className="account-details-page">
      <div className="account-details-shell">
        <div className="account-details-header">
          <div>
            <h1>{account.name}</h1>
          </div>

          <button
            type="button"
            className="account-details-close"
            onClick={() => navigate(boardUrl)}
            aria-label="Close account details"
          >
            <FaTimes />
          </button>
        </div>

        <div className="account-details-toolbar">
          <button
            type="button"
            className="account-details-account-number"
            onClick={() => navigate(boardUrl)}
          >
            Account No.: {account.accountNumber}
          </button>

          <div className="account-details-toolbar-right">
            <div className="account-details-quick-actions">
              {quickActions.map((entry) => {
                const Icon = entry.icon

                return (
                  <button
                    key={entry.key}
                    type="button"
                    className="account-details-quick-action"
                    title={entry.title}
                    onClick={() => handleOpenAction(entry.action)}
                  >
                    <Icon />
                  </button>
                )
              })}
            </div>

            <div className="account-details-actions" ref={actionsRef}>
              <button
                type="button"
                className="account-details-actions-trigger"
                onClick={() => setIsActionsOpen((current) => !current)}
              >
                <span>Actions</span>
                <span className="account-details-actions-caret">â–¼</span>
              </button>

              {isActionsOpen ? (
                <div className="account-details-actions-menu">
                  {visibleDetailActionItems.map((action) => {
                    const Icon = ACTION_ICON_BY_KEY[action.key] || FaPlus

                    return (
                      <button
                        key={action.key}
                        type="button"
                        className="account-details-actions-item"
                        onClick={() => handleDetailAction(action)}
                      >
                        <Icon className="account-details-actions-item-icon" />
                        <span>{action.label}</span>
                      </button>
                    )
                  })}
                </div>
              ) : null}
            </div>
          </div>
        </div>

        <div className="account-details-overview">
          <div className="account-details-summary-grid">
            {account.drawerSummary.map((field) => (
              <div key={field.label} className="account-details-summary-card">
                <span>{field.label}</span>
                <strong className={field.missing ? 'account-details-field-value-missing' : ''}>{field.value}</strong>
              </div>
            ))}
          </div>

          <div className="account-details-status-strip">
            <Badge variant={getStatusColor(account.status)} rounded>{account.status}</Badge>
            <Badge variant="primary" rounded>{account.stageLabel}</Badge>
            <Badge variant="info" rounded>{account.recordSource === 'seed' ? 'Seeded' : 'Live'}</Badge>
          </div>
        </div>

        <div className="account-details-section-list">
          {account.detailSections.map((section) => (
            <section key={section.title} className="account-details-section">
              <div className="account-details-section-header">
                <h2>{section.title}</h2>
              </div>

              <div className="account-details-section-grid">
                {section.fields.map((field) => (
                  <AccountField key={`${section.title}-${field.label}`} field={field} />
                ))}
              </div>
            </section>
          ))}
        </div>
      </div>
      <AccountActionModal
        account={account}
        actionKey={activeActionKey}
        onClose={() => setActiveActionKey(null)}
        onSaved={() => setRefreshKey((currentValue) => currentValue + 1)}
      />
    </div>
  )
}

export default AccountDetailsPage
