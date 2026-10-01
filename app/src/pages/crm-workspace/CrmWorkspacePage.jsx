import React, { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  FaDatabase,
  FaFileInvoice,
  FaHandshake,
  FaHeadset,
  FaPlus,
  FaRedo,
  FaRupeeSign,
  FaUserTie,
  FaUsers,
} from 'react-icons/fa'
import { crmWorkspaceApi } from '../../services/crmWorkspaceApi'
import './CrmWorkspacePage.css'

const COLLECTIONS = [
  {
    key: 'accounts',
    label: 'Accounts',
    icon: FaUsers,
    adminPath: '/admin/accounts/search',
    userPath: '/accounts/search',
    getTitle: (entry) => entry.accountName || entry.name || entry.customerName || 'Untitled account',
    getMeta: (entry) => entry.accountNumber || entry.accountNo || entry.phone || entry.email || 'No account code',
    getStatus: (entry) => entry.accountState || entry.status || 'pending',
  },
  {
    key: 'customers',
    label: 'Customers',
    icon: FaUserTie,
    adminPath: '/admin/customers/search',
    userPath: '/customers/search',
    getTitle: (entry) => entry.customerName || entry.companyName || 'Untitled customer',
    getMeta: (entry) => entry.customerNumber || entry.phone || entry.email || 'No customer code',
    getStatus: (entry) => entry.status || 'new',
  },
  {
    key: 'deals',
    label: 'Deals',
    icon: FaHandshake,
    adminPath: '/admin/deals/all',
    userPath: '/deals/all',
    getTitle: (entry) => entry.title || entry.name || entry.customerName || 'Untitled deal',
    getMeta: (entry) => entry.dealNumber || entry.accountName || entry.customerName || 'No deal code',
    getStatus: (entry) => entry.status || entry.stage || 'new',
  },
  {
    key: 'supportRequests',
    label: 'Support',
    icon: FaHeadset,
    adminPath: '/admin/support-requests/list',
    userPath: '/support-requests/list',
    getTitle: (entry) => entry.subject || entry.title || 'Untitled support request',
    getMeta: (entry) => entry.srNumber || entry.customerName || entry.customerEmail || 'No request code',
    getStatus: (entry) => entry.status || 'open',
  },
]

const ACTIONS = [
  {
    key: 'add-account',
    label: 'Add Account',
    icon: FaPlus,
    adminPath: '/admin/accounts/new',
    userPath: '/accounts/new',
  },
  {
    key: 'add-customer',
    label: 'Add Customer',
    icon: FaUserTie,
    adminPath: '/admin/customers/add',
    userPath: '/customers/add',
  },
  {
    key: 'add-deal',
    label: 'Add Deal',
    icon: FaHandshake,
    adminPath: '/admin/deals/add',
    userPath: '/deals/add',
  },
  {
    key: 'add-support-request',
    label: 'Add SR',
    icon: FaHeadset,
    adminPath: '/admin/support-requests/add',
    userPath: '/support-requests/add',
  },
  {
    key: 'quotations',
    label: 'Quotations',
    icon: FaFileInvoice,
    adminPath: '/admin/quotation-manager/view',
    userPath: '/quotation-manager/view',
  },
]

const formatCurrency = (amount) => {
  const numericAmount = Number(amount)
  if (!Number.isFinite(numericAmount)) return '0'
  return new Intl.NumberFormat('en-IN', { maximumFractionDigits: 0 }).format(numericAmount)
}

const formatDate = (value) => {
  if (!value) return 'No date'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return String(value).slice(0, 18)
  return date.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
}

const getRecords = (bucket) => (bucket?.ok ? bucket.data : [])

const CrmWorkspacePage = ({ isAdmin = false }) => {
  const [workspaceData, setWorkspaceData] = useState(null)
  const [isLoading, setIsLoading] = useState(true)
  const [lastSyncedAt, setLastSyncedAt] = useState('')

  const loadWorkspace = async () => {
    setIsLoading(true)
    const nextWorkspaceData = await crmWorkspaceApi.getWorkspaceData()
    setWorkspaceData(nextWorkspaceData)
    setLastSyncedAt(new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }))
    setIsLoading(false)
  }

  useEffect(() => {
    loadWorkspace()
  }, [])

  const totals = useMemo(() => {
    const deals = getRecords(workspaceData?.deals)
    const quotations = getRecords(workspaceData?.quotations)
    const openDeals = deals.filter((deal) => !['closed', 'won', 'lost', 'converted'].includes(String(deal.status || deal.stage || '').toLowerCase()))
    const openSupport = getRecords(workspaceData?.supportRequests).filter((request) => !['closed', 'resolved', 'done'].includes(String(request.status || '').toLowerCase()))
    const pipelineValue = deals.reduce((sum, deal) => sum + (Number(deal.amount ?? deal.value) || 0), 0)
    const quotationValue = quotations.reduce((sum, quotation) => sum + (Number(quotation.totalAmount ?? quotation.amount) || 0), 0)

    return {
      accounts: getRecords(workspaceData?.accounts).length,
      customers: getRecords(workspaceData?.customers).length,
      deals: deals.length,
      openDeals: openDeals.length,
      openSupport: openSupport.length,
      pipelineValue,
      quotationValue,
    }
  }, [workspaceData])

  const loadErrors = useMemo(() => (
    Object.entries(workspaceData || {})
      .filter(([, bucket]) => bucket && !bucket.ok)
      .map(([key, bucket]) => `${key}: ${bucket.error}`)
  ), [workspaceData])

  return (
    <section className="crm-workspace-page">
      <div className="crm-workspace-header">
        <div>
          <div className="crm-workspace-kicker">
            <FaDatabase />
            MongoDB CRM Workspace
          </div>
          <h1>Landscape CRM Control Room</h1>
        </div>
        <button type="button" className="crm-workspace-refresh" onClick={loadWorkspace} disabled={isLoading}>
          <FaRedo />
          <span>{isLoading ? 'Refreshing' : 'Refresh'}</span>
        </button>
      </div>

      <div className="crm-workspace-actions" aria-label="CRM page shortcuts">
        {ACTIONS.map((action) => {
          const Icon = action.icon
          const path = isAdmin ? action.adminPath : action.userPath

          return (
            <Link
              className={`crm-workspace-action ${action.key === 'add-account' ? 'crm-workspace-action--primary' : ''}`}
              to={path}
              key={action.key}
            >
              <Icon />
              <span>{action.label}</span>
            </Link>
          )
        })}
      </div>

      <div className="crm-workspace-strip" aria-label="CRM totals">
        <div className="crm-workspace-metric">
          <span>Accounts</span>
          <strong>{totals.accounts}</strong>
        </div>
        <div className="crm-workspace-metric">
          <span>Customers</span>
          <strong>{totals.customers}</strong>
        </div>
        <div className="crm-workspace-metric">
          <span>Open Deals</span>
          <strong>{totals.openDeals}</strong>
        </div>
        <div className="crm-workspace-metric">
          <span>Open Support</span>
          <strong>{totals.openSupport}</strong>
        </div>
        <div className="crm-workspace-metric crm-workspace-metric--money">
          <span>Pipeline</span>
          <strong><FaRupeeSign />{formatCurrency(totals.pipelineValue)}</strong>
        </div>
        <div className="crm-workspace-metric crm-workspace-metric--money">
          <span>Quotations</span>
          <strong><FaRupeeSign />{formatCurrency(totals.quotationValue)}</strong>
        </div>
      </div>

      {loadErrors.length ? (
        <div className="crm-workspace-alert">
          Some Mongo collections could not load: {loadErrors.join(' | ')}
        </div>
      ) : null}

      <div className="crm-workspace-board" aria-busy={isLoading}>
        {COLLECTIONS.map((collection) => {
          const Icon = collection.icon
          const records = getRecords(workspaceData?.[collection.key])
          const routePath = isAdmin ? collection.adminPath : collection.userPath

          return (
            <article className="crm-workspace-column" key={collection.key}>
              <div className="crm-workspace-column-head">
                <div>
                  <Icon />
                  <span>{collection.label}</span>
                </div>
                <strong>{records.length}</strong>
              </div>

              <div className="crm-workspace-records">
                {(isLoading && !workspaceData ? Array.from({ length: 5 }) : records.slice(0, 10)).map((entry, index) => {
                  if (isLoading && !workspaceData) {
                    return <div className="crm-workspace-skeleton" key={`loading-${collection.key}-${index}`} />
                  }

                  return (
                    <div className="crm-workspace-record" key={entry.id || `${collection.key}-${index}`}>
                      <div className="crm-workspace-record-title">{collection.getTitle(entry)}</div>
                      <div className="crm-workspace-record-meta">{collection.getMeta(entry)}</div>
                      <div className="crm-workspace-record-foot">
                        <span>{collection.getStatus(entry)}</span>
                        <time>{formatDate(entry.updatedAt || entry.createdAt || entry.dueDate)}</time>
                      </div>
                    </div>
                  )
                })}

                {!isLoading && records.length === 0 ? (
                  <div className="crm-workspace-empty">No Mongo records found.</div>
                ) : null}
              </div>

              <Link className="crm-workspace-open" to={routePath}>
                Open {collection.label}
              </Link>
            </article>
          )
        })}
      </div>

      <div className="crm-workspace-footer">
        <span>Last Mongo sync: {lastSyncedAt || 'Waiting'}</span>
        <span>{totals.deals} total deals across the workspace</span>
      </div>
    </section>
  )
}

export default CrmWorkspacePage
