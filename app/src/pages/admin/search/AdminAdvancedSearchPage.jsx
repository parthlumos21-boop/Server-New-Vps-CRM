import React, { useMemo, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import {
  FaEnvelope,
  FaMapMarkerAlt,
  FaPhoneAlt,
  FaUserTie,
} from 'react-icons/fa'
import { FiChevronDown } from 'react-icons/fi'
import Button from '../../../components/common/Button'
import Modal from '../../../components/common/Modal'
import { useData } from '../../../context/DataContext'
import { normalizeAccountRecord } from '../../../features/adminAccounts/adapters/normalizeAccountRecord'
import { ACCOUNT_ACTION_MAP } from '../../../features/adminAccounts/config/accountActions'
import { buildAdminAccountActionUrl, openAdminAccountActionPage } from '../../../features/adminAccounts/utils/accountNavigation'
import { buildAdminDealDetailUrl } from '../../../features/adminDeals/config/adminDealViews'
import { getCrmOwnerDisplay } from '../../../features/users/crmUserDirectory'
import { useClickOutside } from '../../../hooks'
import { customerService } from '../../../services/customerService'
import './AdminAdvancedSearchPage.css'

const normalizeQuery = (value) => String(value || '').trim().toLowerCase()

const matchesQuery = (query, values) => {
  if (!query) return true

  return values
    .flatMap((value) => {
      if (Array.isArray(value)) return value
      return [value]
    })
    .some((value) => normalizeQuery(value).includes(query))
}

const buildAccountContacts = (account) => {
  const sourceContacts = Array.isArray(account.raw?.contacts) && account.raw.contacts.length > 0
    ? account.raw.contacts
    : [{
      contactPerson: account.contactPerson,
      phone: account.contactPhone || account.phone,
      mobile: account.contactMobile || account.phone,
      email: account.contactEmail || account.email,
      designation: account.contactDesignation || '',
    }]

  return sourceContacts
    .filter((contact) => contact && (contact.contactPerson || contact.phone || contact.mobile || contact.email))
    .map((contact, index) => ({
      id: `${account.id}-contact-${index}`,
      accountId: account.id,
      accountNumber: account.accountNumber,
      accountName: account.name,
      contactPerson: contact.contactPerson || '-',
      email: contact.email || account.email || '-',
      phone: contact.mobile || contact.phone || account.phone || '-',
      designation: contact.designation || '-',
      account,
    }))
}

const getPrimaryCustomerContact = (customer) => customer.contacts?.[0] || {}

const buildCustomerContacts = (customer) => {
  const contacts = Array.isArray(customer.contacts) && customer.contacts.length > 0
    ? customer.contacts
    : [getPrimaryCustomerContact(customer)]

  return contacts
    .filter((contact) => contact && (contact.contactPerson || contact.phone || contact.mobile || contact.email))
    .map((contact, index) => ({
      id: `${customer.id}-contact-${index}`,
      customerId: customer.id,
      customerNumber: customer.customerNumber,
      customerName: customer.customerName,
      contactPerson: contact.contactPerson || '-',
      email: contact.email || '-',
      phone: contact.mobile || contact.phone || '-',
      designation: contact.designation || '-',
    }))
}

const buildDealContacts = (deal) => [{
  id: `${deal.id}-contact`,
  dealId: deal.id,
  dealNumber: deal.dealNumber || '-',
  dealName: deal.name || deal.projectName || '-',
  customerName: deal.customerName || '-',
  contactPerson: deal.contactPerson || '-',
  email: deal.contactEmail || '-',
  phone: deal.contactPhone || '-',
}].filter((contact) => (
  contact.contactPerson !== '-'
  || contact.email !== '-'
  || contact.phone !== '-'
))

const SearchSection = ({ title, columns, rows, emptyMessage = 'No matching records found.' }) => (
  <section className="admin-search-section">
    <div className="admin-search-section-title">{title}</div>
    <div className="admin-search-section-table-wrap">
      <table className="admin-search-section-table">
        <thead>
          <tr>
            {columns.map((column) => (
              <th key={column.key}>{column.label}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.length > 0 ? rows.map((row) => (
            <tr key={row.id}>
              {columns.map((column) => {
                const value = row[column.key]

                if (column.isRecordNumber) {
                  return (
                    <td key={column.key}>
                      <button
                        type="button"
                        className="admin-search-record-link"
                        onClick={() => column.onClick?.(row)}
                      >
                        {value}
                      </button>
                    </td>
                  )
                }

                return <td key={column.key}>{value || '-'}</td>
              })}
            </tr>
          )) : (
            <tr>
              <td colSpan={columns.length} className="admin-search-empty-cell">
                {emptyMessage}
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  </section>
)

const AdminAdvancedSearchPage = () => {
  const location = useLocation()
  const navigate = useNavigate()
  const { accounts, deals, projects, convertedDeals, deleteAccount, addNotification } = useData()
  const [selectedAccount, setSelectedAccount] = useState(null)
  const [isActionsOpen, setIsActionsOpen] = useState(false)
  const actionsRef = useClickOutside(() => setIsActionsOpen(false))
  const query = useMemo(() => new URLSearchParams(location.search).get('query') || '', [location.search])
  const normalizedSearchQuery = normalizeQuery(query)
  const selectedAccountId = selectedAccount?.raw?.id || selectedAccount?.id || ''
  const selectedRelatedConvertedDeals = useMemo(() => (
    (Array.isArray(convertedDeals) ? convertedDeals : [])
      .filter((entry) => String(entry.accountId || '') === String(selectedAccountId || ''))
      .sort((left, right) => (
        new Date(right.convertedAt || right.createdAt || 0).getTime()
        - new Date(left.convertedAt || left.createdAt || 0).getTime()
      ))
  ), [convertedDeals, selectedAccountId])
  const selectedLinkedDealId = selectedAccount?.dealId
    || selectedAccount?.raw?.dealId
    || selectedRelatedConvertedDeals[0]?.sourceDealId
    || selectedRelatedConvertedDeals[0]?.dealId
    || selectedAccount?.convertedDealId
    || selectedAccount?.raw?.convertedDealId
    || ''
  const selectedAccountIsConverted = Boolean(
    selectedAccount?.isConverted
    || selectedAccount?.raw?.isConverted
    || selectedAccount?.dealId
    || selectedAccount?.raw?.dealId
    || selectedAccount?.convertedDealId
    || selectedAccount?.raw?.convertedDealId
    || selectedRelatedConvertedDeals.length > 0
  )

  const normalizedAccounts = useMemo(
    () => accounts.map((account, index) => normalizeAccountRecord(account, index, { recordSource: 'admin-global-search' })),
    [accounts]
  )

  const customers = useMemo(() => customerService.getCustomers(), [])

  const accountRows = useMemo(() => (
    normalizedAccounts
      .filter((account) => matchesQuery(normalizedSearchQuery, [
        account.accountNumber,
        account.name,
        account.projectName,
        account.email,
        account.phone,
        account.accountOwnerDisplay || account.accountOwner,
        account.contactPerson,
        account.address,
      ]))
      .map((account) => ({
        id: account.id,
        accountNumber: account.accountNumber || '-',
        accountName: account.name || '-',
        projectName: account.projectName || '-',
        email: account.email || '-',
        phone: account.phone || '-',
        accountOwner: account.accountOwnerDisplay || account.accountOwnerName || account.accountOwner || '-',
        account,
      }))
  ), [normalizedAccounts, normalizedSearchQuery])

  const accountContactRows = useMemo(() => (
    normalizedAccounts
      .flatMap((account) => buildAccountContacts(account))
      .filter((contact) => matchesQuery(normalizedSearchQuery, [
        contact.accountNumber,
        contact.accountName,
        contact.contactPerson,
        contact.email,
        contact.phone,
        contact.designation,
      ]))
  ), [normalizedAccounts, normalizedSearchQuery])

  const customerRows = useMemo(() => (
    customers
      .map((customer) => {
        const primaryContact = getPrimaryCustomerContact(customer)
        return {
          id: customer.id,
          customerNumber: customer.customerNumber || '-',
          customerName: customer.customerName || '-',
          email: primaryContact.email || '-',
          phone: primaryContact.mobile || primaryContact.phone || '-',
          customerOwner: customer.customerOwnerDisplay || getCrmOwnerDisplay(customer.customerOwner) || customer.customerOwner || '-',
          customer,
        }
      })
      .filter((customer) => matchesQuery(normalizedSearchQuery, [
        customer.customerNumber,
        customer.customerName,
        customer.email,
        customer.phone,
        customer.customerOwner,
      ]))
  ), [customers, normalizedSearchQuery])

  const customerContactRows = useMemo(() => (
    customers
      .flatMap((customer) => buildCustomerContacts(customer))
      .filter((contact) => matchesQuery(normalizedSearchQuery, [
        contact.customerNumber,
        contact.customerName,
        contact.contactPerson,
        contact.email,
        contact.phone,
        contact.designation,
      ]))
  ), [customers, normalizedSearchQuery])

  const dealRows = useMemo(() => (
    deals
      .map((deal) => ({
        id: deal.id,
        dealNumber: deal.dealNumber || '-',
        dealName: deal.name || deal.projectName || '-',
        customerName: deal.customerName || '-',
        dealOwner: deal.dealOwnerDisplay || getCrmOwnerDisplay(deal.dealOwner) || deal.dealOwner || '-',
        status: deal.status || '-',
        deal,
      }))
      .filter((deal) => matchesQuery(normalizedSearchQuery, [
        deal.dealNumber,
        deal.dealName,
        deal.customerName,
        deal.dealOwner,
        deal.status,
      ]))
  ), [deals, normalizedSearchQuery])

  const dealContactRows = useMemo(() => (
    deals
      .flatMap((deal) => buildDealContacts(deal))
      .filter((contact) => matchesQuery(normalizedSearchQuery, [
        contact.dealNumber,
        contact.dealName,
        contact.customerName,
        contact.contactPerson,
        contact.email,
        contact.phone,
      ]))
  ), [deals, normalizedSearchQuery])

  const projectRows = useMemo(() => {
    const accountProjectRows = normalizedAccounts.flatMap((account) => {
      const accountProjects = Array.isArray(account.raw?.projects) ? account.raw.projects : []
      return accountProjects.map((project, index) => ({
        id: project.id || `${account.id}-project-${index}`,
        projectCode: project.projectCode || '-',
        projectName: project.projectName || account.projectName || '-',
        accountName: account.name || '-',
        consultantName: project.consultantName || account.consultantName || '-',
        architectName: project.architectName || account.raw?.architectName || '-',
        pmcName: project.pmcName || account.raw?.pmcName || '-',
        projectStatus: project.projectStatus || account.status || '-',
        projectLocation: project.projectLocation || account.location || account.address || '-',
        project,
      }))
    })

    const projectMasterRows = (projects || []).map((project) => {
      const linkedAccount = normalizedAccounts.find((account) => String(account.id) === String(project.accountId))
      return {
        id: project.id || project.projectId,
        projectCode: project.projectCode || '-',
        projectName: project.projectName || '-',
        accountName: project.accountName || linkedAccount?.name || '-',
        consultantName: project.consultantName || '-',
        architectName: project.architectName || '-',
        pmcName: project.pmcName || '-',
        projectStatus: project.projectStatus || '-',
        projectLocation: project.projectLocation || '-',
        project,
      }
    })

    const rowsById = new Map()
    ;[...projectMasterRows, ...accountProjectRows].forEach((row) => {
      rowsById.set(String(row.id), row)
    })

    return Array.from(rowsById.values())
      .filter((project) => matchesQuery(normalizedSearchQuery, [
        project.projectCode,
        project.projectName,
        project.accountName,
        project.consultantName,
        project.architectName,
        project.pmcName,
        project.projectStatus,
        project.projectLocation,
      ]))
  }, [normalizedAccounts, normalizedSearchQuery, projects])

  const handleOpenCustomer = (customerId) => {
    navigate(`/admin/customers/view/${encodeURIComponent(customerId)}`)
  }

  const handleOpenDeal = () => {
    navigate('/admin/deals/view')
  }

  const handleOpenProject = (projectId) => {
    navigate(`/admin/projects/${encodeURIComponent(projectId)}`)
  }

  const handlePopupAction = async (actionKey) => {
    if (!selectedAccount) return

    const accountId = selectedAccount.raw?.id || selectedAccount.id
    const closeAndNavigate = (callback) => {
      setSelectedAccount(null)
      setIsActionsOpen(false)
      callback()
    }

    if (actionKey === 'add-reminder') {
      openAdminAccountActionPage(ACCOUNT_ACTION_MAP['add-reminder'].route, accountId, '')
      return
    }

    if (actionKey === 'change-status') {
      openAdminAccountActionPage(ACCOUNT_ACTION_MAP['change-status'].route, accountId, '')
      return
    }

    if (actionKey === 'add-document') {
      openAdminAccountActionPage(ACCOUNT_ACTION_MAP['add-document'].route, accountId, '')
      return
    }

    if (actionKey === 'generate-quotation') {
      closeAndNavigate(() => navigate('/admin/quotations', {
        state: {
          openGenerator: true,
          preselectedAccountId: selectedAccount.id,
        },
      }))
      return
    }

    if (actionKey === 'upload-quotation') {
      closeAndNavigate(() => navigate('/admin/quotations'))
      return
    }

    if (actionKey === 're-assign-account') {
      openAdminAccountActionPage(ACCOUNT_ACTION_MAP['re-assign-account'].route, accountId, '')
      return
    }

    if (actionKey === 'change-account-category') {
      openAdminAccountActionPage(ACCOUNT_ACTION_MAP['manage-account'].route, accountId, '')
      addNotification('info', 'Manage Account opened', 'Use the Manage Account workspace to update the account category.')
      return
    }

    if (actionKey === 'converted-deal') {
      closeAndNavigate(() => navigate(buildAdminAccountActionUrl(ACCOUNT_ACTION_MAP['converted-deal'].route, accountId, '')))
      return
    }

    if (actionKey === 'view-linked-deal') {
      if (!selectedLinkedDealId) {
        addNotification('warning', 'Deal not found', 'This account does not have a linked deal yet.')
        return
      }

      closeAndNavigate(() => navigate(buildAdminDealDetailUrl(selectedLinkedDealId)))
      return
    }

    if (actionKey === 'manage-account') {
      openAdminAccountActionPage(ACCOUNT_ACTION_MAP['manage-account'].route, accountId, '')
      return
    }

    if (actionKey === 'delete') {
      const confirmed = window.confirm(`Delete account "${selectedAccount.name}"?`)
      if (!confirmed) return

      const result = await deleteAccount(accountId)
      if (!result.success) {
        addNotification('error', 'Delete failed', result.message || 'Unable to delete account.')
        return
      }

      addNotification('success', 'Account deleted', 'The selected account was deleted successfully.')
      setSelectedAccount(null)
      setIsActionsOpen(false)
    }
  }

  const accountActionItems = [
    { key: 'add-reminder', label: 'Add Reminder' },
    { key: 'change-status', label: 'Change Account Status' },
    { key: 'add-document', label: 'Add Document' },
    { key: 'generate-quotation', label: 'Generate Quotation' },
    { key: 'upload-quotation', label: 'Upload Quotation' },
    { key: 're-assign-account', label: 'Re-Assign Account' },
    { key: 'change-account-category', label: 'Change Account Category' },
    { key: 'view-linked-deal', label: 'View Deal' },
    { key: 'converted-deal', label: 'Converted Deal' },
    { key: 'manage-account', label: 'Manage Account' },
    { key: 'delete', label: 'Delete' },
  ].filter((action) => (
    (action.key !== 'converted-deal' || !selectedAccountIsConverted)
    && (action.key !== 'view-linked-deal' || selectedAccountIsConverted)
  ))

  const sectionColumns = {
    accounts: [
      { key: 'accountNumber', label: 'Account No.', isRecordNumber: true, onClick: (row) => setSelectedAccount(row.account) },
      { key: 'accountName', label: 'Account Name' },
      { key: 'projectName', label: 'Project Name', isRecordNumber: true, onClick: (row) => setSelectedAccount(row.account) },
      { key: 'email', label: 'Email' },
      { key: 'phone', label: 'Phone' },
      { key: 'accountOwner', label: 'Account Owner' },
    ],
    accountContacts: [
      { key: 'accountNumber', label: 'Account No.', isRecordNumber: true, onClick: (row) => setSelectedAccount(row.account) },
      { key: 'contactPerson', label: 'Contact Person' },
      { key: 'email', label: 'Email' },
      { key: 'phone', label: 'Phone' },
      { key: 'designation', label: 'Designation' },
    ],
    customers: [
      { key: 'customerNumber', label: 'Customer No.', isRecordNumber: true, onClick: (row) => handleOpenCustomer(row.customer.id) },
      { key: 'customerName', label: 'Customer Name' },
      { key: 'email', label: 'Email' },
      { key: 'phone', label: 'Phone' },
      { key: 'customerOwner', label: 'Customer Owner' },
    ],
    customerContacts: [
      { key: 'customerNumber', label: 'Customer No.', isRecordNumber: true, onClick: (row) => handleOpenCustomer(row.customerId) },
      { key: 'contactPerson', label: 'Contact Person' },
      { key: 'email', label: 'Email' },
      { key: 'phone', label: 'Phone' },
      { key: 'designation', label: 'Designation' },
    ],
    deals: [
      { key: 'dealNumber', label: 'Deal No.', isRecordNumber: true, onClick: () => handleOpenDeal() },
      { key: 'dealName', label: 'Deal Name' },
      { key: 'customerName', label: 'Customer Name' },
      { key: 'dealOwner', label: 'Deal Owner' },
      { key: 'status', label: 'Status' },
    ],
    dealContacts: [
      { key: 'dealNumber', label: 'Deal No.', isRecordNumber: true, onClick: () => handleOpenDeal() },
      { key: 'contactPerson', label: 'Contact Person' },
      { key: 'email', label: 'Email' },
      { key: 'phone', label: 'Phone' },
      { key: 'customerName', label: 'Customer Name' },
    ],
    projects: [
      { key: 'projectCode', label: 'Project Code', isRecordNumber: true, onClick: (row) => handleOpenProject(row.id) },
      { key: 'projectName', label: 'Project Name', isRecordNumber: true, onClick: (row) => handleOpenProject(row.id) },
      { key: 'accountName', label: 'Account Name' },
      { key: 'consultantName', label: 'Consultant' },
      { key: 'architectName', label: 'Architect' },
      { key: 'pmcName', label: 'PMC' },
      { key: 'projectStatus', label: 'Project Status' },
      { key: 'projectLocation', label: 'Location' },
    ],
  }

  return (
    <div className="admin-search-page">
      <section className="admin-search-shell">
        <header className="admin-search-header">
          <div>
            <h1>Global Search Results</h1>
            <p>{query ? `Showing matches for "${query}"` : 'Enter a keyword from the global search to view results.'}</p>
          </div>
        </header>

        <div className="admin-search-grid">
          <SearchSection title="Accounts" columns={sectionColumns.accounts} rows={accountRows} />
          <SearchSection title="Account Contacts" columns={sectionColumns.accountContacts} rows={accountContactRows} />
          <SearchSection title="Customers" columns={sectionColumns.customers} rows={customerRows} />
          <SearchSection title="Customer Contacts" columns={sectionColumns.customerContacts} rows={customerContactRows} />
          <SearchSection title="Deals" columns={sectionColumns.deals} rows={dealRows} />
          <SearchSection title="Deal Contacts" columns={sectionColumns.dealContacts} rows={dealContactRows} />
          <SearchSection title="Projects" columns={sectionColumns.projects} rows={projectRows} />
        </div>
      </section>

      <Modal
        isOpen={Boolean(selectedAccount)}
        onClose={() => {
          setSelectedAccount(null)
          setIsActionsOpen(false)
        }}
        title={selectedAccount?.name || 'Account Details'}
        size="xlarge"
        footer={(
          <Button
            type="button"
            variant="outline"
            onClick={() => {
              setSelectedAccount(null)
              setIsActionsOpen(false)
            }}
          >
            Close
          </Button>
        )}
      >
        {selectedAccount ? (
          <div className="admin-search-account-modal">
            <div className="admin-search-account-modal-top">
              <div className="admin-search-account-modal-copy">
                <div className="admin-search-account-number">{selectedAccount.accountNumber}</div>
                <h2>{selectedAccount.name}</h2>
                <div className="admin-search-account-icon-row">
                  <span><FaEnvelope /> {selectedAccount.email || '-'}</span>
                  <span><FaPhoneAlt /> {selectedAccount.phone || '-'}</span>
                  <span><FaUserTie /> {selectedAccount.accountOwnerDisplay || selectedAccount.accountOwnerName || selectedAccount.accountOwner || '-'}</span>
                  <span><FaMapMarkerAlt /> {selectedAccount.address || selectedAccount.location || '-'}</span>
                </div>
              </div>

              <div className="admin-search-account-actions" ref={actionsRef}>
                <button
                  type="button"
                  className="admin-search-account-actions-trigger"
                  onClick={() => setIsActionsOpen((currentValue) => !currentValue)}
                >
                  <span>Actions</span>
                  <FiChevronDown />
                </button>

                {isActionsOpen ? (
                  <div className="admin-search-account-actions-menu">
                    {accountActionItems.map((action) => (
                      <button
                        key={action.key}
                        type="button"
                        className="admin-search-account-actions-item"
                        onClick={() => handlePopupAction(action.key)}
                      >
                        {action.label}
                      </button>
                    ))}
                  </div>
                ) : null}
              </div>
            </div>

            <div className="admin-search-account-summary-grid">
              {selectedAccount.drawerSummary.map((field) => (
                <div key={field.label} className="admin-search-account-summary-item">
                  <span>{field.label}</span>
                  <strong>{field.value}</strong>
                </div>
              ))}
            </div>

            <div className="admin-search-account-sections">
              {selectedAccount.detailSections.map((section) => (
                <section key={section.title} className="admin-search-account-section">
                  <div className="admin-search-account-section-title">{section.title}</div>
                  <div className="admin-search-account-field-grid">
                    {section.fields.map((field) => (
                      <div key={`${section.title}-${field.label}`} className="admin-search-account-field">
                        <span>{field.label}</span>
                        <strong>{field.value}</strong>
                      </div>
                    ))}
                  </div>
                </section>
              ))}
            </div>
          </div>
        ) : null}
      </Modal>
    </div>
  )
}

export default AdminAdvancedSearchPage
