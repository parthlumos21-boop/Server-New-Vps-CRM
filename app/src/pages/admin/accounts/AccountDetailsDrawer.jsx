import React, { useCallback, useEffect, useMemo, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import {
  FaBell,
  FaEnvelope,
  FaExchangeAlt,
  FaExternalLinkAlt,
  FaFileAlt,
  FaRegStickyNote,
  FaRegSun,
} from 'react-icons/fa'
import {
  FiChevronDown,
  FiEdit2,
} from 'react-icons/fi'
import { HiOutlineStatusOnline } from 'react-icons/hi'
import Badge from '../../../components/common/Badge'
import Button from '../../../components/common/Button'
import ContactIntegrationActions from '../../../components/integrations/ContactIntegrationActions'
import { useData } from '../../../context/DataContext'
import { buildAdminDealDetailUrl } from '../../../features/adminDeals/config/adminDealViews'
import { useClickOutside } from '../../../hooks'
import { ACCOUNT_ACTION_DROPDOWN_LABEL, ACCOUNT_DRAWER_ACTIONS } from '../../../features/adminAccounts/config/accountActions'
import { ACCOUNT_CATEGORY_OPTIONS, ACCOUNT_SOURCE_OPTIONS, CUSTOMER_TYPE_OPTIONS, INDUSTRY_TYPE_OPTIONS } from '../../../features/accounts/config/accountDropdownOptions'
import { ACCOUNT_STATE_OPTIONS, ACCOUNT_CHANGE_STATUS_OPTIONS } from '../../../features/adminAccounts/config/accountStages'
import { buildAdminAccountActionUrl } from '../../../features/adminAccounts/utils/accountNavigation'
import { getAccountOwnerOptionLabel, getCachedAccountOwnerOptions, loadAccountOwnerOptions } from '../../../features/adminAccounts/utils/accountOwnerOptions'
import { formatCurrency, formatDate, getStatusColor } from '../../../utils/helpers'
import AccountActionModal from './AccountActionModal'
import './MyGroupAccounts.css'

const HIDDEN_ACCOUNT_ACTION_STAGE_VALUES = new Set(['converted', 'closed', 'contacted', 'order_lost'])
const ACCOUNT_INFORMATION_STAGE_OPTIONS = ACCOUNT_CHANGE_STATUS_OPTIONS
  .filter((option) => !HIDDEN_ACCOUNT_ACTION_STAGE_VALUES.has(option.value))
  .map((option) => ({
    value: option.stageKey,
    label: option.value === 'convert_to_po' ? 'PO Converted' : option.label,
  }))
const getAllowedAccountInformationStage = (value) => (
  ACCOUNT_INFORMATION_STAGE_OPTIONS.some((option) => option.value === value) ? value : ''
)

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
      { key: 'status', label: 'Account Status', options: ACCOUNT_STATE_OPTIONS.map((value) => ({ value, label: value })) },
      { key: 'accountOwner', label: 'Account Owner' },
      { key: 'accountState', label: 'Account State' },
      { key: 'accountSource', label: 'Account Source', options: ACCOUNT_SOURCE_OPTIONS },
      { key: 'changeStatus', label: 'Change Status', options: ACCOUNT_CHANGE_STATUS_OPTIONS },
      { key: 'accountSubsource', label: 'Account Subsource' },
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
      { key: 'state', label: 'State' },
      { key: 'industry', label: 'Industry type', options: INDUSTRY_TYPE_OPTIONS },
      { key: 'customerRefNo', label: 'Customer Ref. No.' },
      { key: 'customerRefDate', label: 'Customer Ref. Date', type: 'date' },
      { key: 'consultantName', label: 'Consultant Name' },
      { key: 'poValue', label: 'PO Value' },
      { key: 'statusAsPerOrderReceived', label: 'Status of Customer as per Order Received' },
      { key: 'statusAsPerQuotationGiven', label: 'Status Of Customer as per quotation Given' },
      { key: 'jobNo', label: 'Job No' },
      { key: 'reasonForLost', label: 'Reason For Lost' },
      { key: 'customerName', label: 'Customer Name' },
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

const buildInitialForm = (account) => ({
  accountNumber: account.accountNumber || '',
  accountName: account.name || '',
  company: account.raw?.company || account.company || '',
  industry: account.industryType || account.raw?.industry || '',
  accountCategory: account.accountCategory || account.customerType || '',
  accountSource: account.accountSource || account.source || '',
  accountSubsource: account.accountSubsource || account.raw?.accountSubsource || account.raw?.subsource || '',
  status: account.status || '',
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
  gstin: account.gstin || account.raw?.gstin || '',
  stateCode: account.stateCode || account.raw?.stateCode || '',
  country: account.raw?.country || '',
  pincode: account.raw?.pincode || account.raw?.pinCode || '',
  projectName: account.projectName || '',
  projectType: account.productCategory || account.raw?.projectType || '',
  projectLocation: account.projectLocation || account.raw?.projectLocation || '',
  consultantName: account.consultantName || '',
  architectName: account.architectName || account.raw?.architectName || '',
  pmcName: account.pmcName || account.raw?.pmcName || '',
  poValue: account.poValue || account.raw?.poValue || '',
  statusAsPerOrderReceived: account.statusAsPerOrderReceived || account.raw?.statusAsPerOrderReceived || '',
  statusAsPerQuotationGiven: account.statusAsPerQuotationGiven || account.raw?.statusAsPerQuotationGiven || '',
  reasonForLost: account.reasonForLost || account.raw?.reasonForLost || '',
  customerName: account.customerName || account.raw?.customerName || '',
  reminderDate: normalizeDateInput(account.reminderDate) || getTodayInputValue(),
  reminderMode: account.reminderMode || '',
  latestRemark: account.latestRemark || '',
  remark: account.remark || '',
  description: account.description || account.raw?.description || '',
  jobNo: account.jobNo || '',
  customerRefNo: account.customerRefNo || '',
  customerRefDate: normalizeDateInput(account.customerRefDate) || '',
})

const buildUpdatePayload = (form) => ({
  accountName: form.accountName,
  company: form.company,
  industry: form.industry,
  industryType: form.industry,
  accountCategory: form.accountCategory,
  accountSource: form.accountSource,
  accountSubsource: form.accountSubsource,
  subsource: form.accountSubsource,
  source: form.accountSource,
  status: form.status,
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
})

const AccountDetailsDrawer = ({
  account,
  isOpen,
  onClose,
  boardStateQuery,
  onSaveAccount,
  onRefresh,
  canEdit = false,
  actionItems = ACCOUNT_DRAWER_ACTIONS,
  inline = false,
}) => {
  const location = useLocation()
  const navigate = useNavigate()
  const { convertedDeals } = useData()
  const [isActionsOpen, setIsActionsOpen] = useState(false)
  const [editingSection, setEditingSection] = useState(null)
  const [editingFieldKey, setEditingFieldKey] = useState('')
  const [form, setForm] = useState(() => account ? buildInitialForm(account) : {})
  const [isSaving, setIsSaving] = useState(false)
  const [validationError, setValidationError] = useState('')
  const [activeActionKey, setActiveActionKey] = useState(null)
  const [ownerOptions, setOwnerOptions] = useState(getCachedAccountOwnerOptions)
  const closeActions = useCallback(() => setIsActionsOpen(false), [])
  const actionsRef = useClickOutside(closeActions)

  useEffect(() => {
    if (account) {
      setForm(buildInitialForm(account))
      setEditingSection(null)
      setEditingFieldKey('')
      setValidationError('')
      setActiveActionKey(null)
    }
  }, [account])

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
    { label: 'Stage', value: account?.stageLabel || account?.stage || '-' },
    { label: 'Status', value: account?.status || '-' },
    { label: 'Owner', value: account?.accountOwnerDisplay || account?.accountOwner || '-' },
    { label: 'Last Updated', value: formatHeaderDate(account?.updatedAt) },
  ]), [account])
  const isAdminPortal = location.pathname.startsWith('/admin')
  const relatedConvertedDeals = useMemo(() => (
    (Array.isArray(convertedDeals) ? convertedDeals : [])
      .filter((entry) => String(entry.accountId || '') === String(account?.id || ''))
      .sort((left, right) => (
        new Date(right.convertedAt || right.createdAt || 0).getTime()
        - new Date(left.convertedAt || left.createdAt || 0).getTime()
      ))
  ), [account?.id, convertedDeals])
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
    const result = await onSaveAccount(account.id, {
      ...buildUpdatePayload(form),
      ...(selectedOwner ? {
        ownerId: selectedOwner.id,
        assignedUserId: selectedOwner.id,
      } : {}),
    })
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

  return (
    <div
      className={`admin-accounts-drawer-layer admin-accounts-workspace-layer${inline ? ' admin-accounts-workspace-layer--inline' : ''}`}
      role="dialog"
      aria-modal={inline ? 'false' : 'true'}
      aria-label="Account details workspace"
    >
      <section className="admin-accounts-drawer admin-accounts-workspace">
        <header className="admin-accounts-workspace-header">
          <div className="admin-accounts-workspace-title">
            <span className="admin-accounts-workspace-eyebrow">Account Details & Action Center</span>
            <h2>{account.name}</h2>
            <div className="admin-accounts-workspace-header-facts">
              {headerFacts.map((fact) => (
                <span key={fact.label}>
                  <strong>{fact.label}:</strong> {fact.value}
                </span>
              ))}
              <Badge variant={getStatusColor(account.status)} rounded>{account.status}</Badge>
            </div>
          </div>

          <div className="admin-accounts-workspace-actions">
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

                    return (
                      <button
                        type="button"
                        key={action.key}
                        className="admin-accounts-actions-menu-button"
                        onClick={() => {
                          closeActions()
                          if (action.key === 'generate-quotation') {
                            navigate('/admin/quotations', {
                              state: {
                                openGenerator: true,
                                preselectedAccountId: account.id,
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
              {flattenedAccountFields.map((field) => {
                const value = field.key === 'changeStatus' ? (form.stage || form.status || '') : (form[field.key] || '')
                const displayValue = getDisplayFieldValue(field, value)
                const isEditing = editingSection === field.sectionKey
                const isSingleFieldEditing = isEditing && editingFieldKey === field.key
                const canEditThisField = canEdit || !isAdminPortal || field.key === 'addedBy'
                const canEditField = isSingleFieldEditing && canEditThisField && !field.readOnly
                const isUserSelectField = ['accountOwner', 'addedBy'].includes(field.key)
                const visibleOwnerOptions = isUserSelectField && value && !ownerOptions.some((owner) => owner.name === value)
                  ? [{ id: `current-${value}`, name: value, ownerDisplayName: value }, ...ownerOptions]
                  : ownerOptions

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
                            phone={form.mobile}
                            email={form.email}
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
                <h3>Converted Deals</h3>
                <span className="admin-accounts-converted-deals-count">
                  {relatedConvertedDeals.length} linked
                </span>
              </div>

              {relatedConvertedDeals.length === 0 ? (
                <div className="admin-accounts-converted-deals-empty">
                  No converted deals are linked with this account yet.
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
    </div>
  )
}

export default AccountDetailsDrawer
