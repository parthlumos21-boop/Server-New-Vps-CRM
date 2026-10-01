import React, { useMemo, useState } from 'react'
import { useData } from '../../../context/DataContext'
import SupportRequestTable from './SupportRequestTable'
import './SupportRequestAdmin.css'

const AddSupportRequestPanel = React.lazy(() => import('./AddSupportRequest'))

const LIST_COLUMNS = [
  { key: 'srNumber', label: 'SR Number' },
  { key: 'customerName', label: 'Customer Name' },
  { key: 'requestType', label: 'Service Type' },
  { key: 'serviceDate', label: 'Service Date' },
  { key: 'ownerName', label: 'Owner' },
  { key: 'status', label: 'Status' },
  { key: 'lastUpdated', label: 'Last Updated', type: 'datetime' },
]

const CLOSED_COLUMNS = [
  { key: 'srNumber', label: 'SR Number' },
  { key: 'customerName', label: 'Customer Name' },
  { key: 'requestType', label: 'Service Type' },
  { key: 'requestDate', label: 'Request Date' },
  { key: 'endDate', label: 'End Date' },
  { key: 'ownerName', label: 'Owner' },
  { key: 'closedOn', label: 'Closed On', type: 'datetime' },
  { key: 'closedBy', label: 'Closed By' },
  { key: 'lastUpdated', label: 'Last Updated', type: 'datetime' },
]

const normalizeValue = (value) => String(value || '').trim().toLowerCase()
const isClosedSupportRequest = (supportRequest) => normalizeValue(supportRequest.status) === 'closed'

const SupportRequestList = ({
  basePath = '/admin/support-requests',
  showActionMenu = true,
  closedOnly = false,
}) => {
  const { supportRequests } = useData()
  const [isCreatePanelOpen, setIsCreatePanelOpen] = useState(false)

  const sortedRequests = useMemo(() => (
    [...supportRequests].sort((left, right) => (
      new Date(right.updatedAt || right.createdAt || 0).getTime()
      - new Date(left.updatedAt || left.createdAt || 0).getTime()
    ))
  ), [supportRequests])

  const visibleRequests = useMemo(() => (
    closedOnly
      ? sortedRequests.filter((supportRequest) => isClosedSupportRequest(supportRequest))
      : sortedRequests
  ), [closedOnly, sortedRequests])

  return (
    <div className="support-ticket-page">
      <div className="support-ticket-shell">
        <div className="support-ticket-toolbar">
          <h1 className="support-ticket-title">{closedOnly ? 'Closed SR' : 'Support Requests'}</h1>
          {!closedOnly ? (
            <div className="support-ticket-toolbar-actions">
              <button
                type="button"
                className="support-ticket-new-btn"
                onClick={() => setIsCreatePanelOpen(true)}
              >
                Add CRM Support
              </button>
            </div>
          ) : null}
        </div>

        <div className="support-ticket-content support-ticket-content--legacy">
          <SupportRequestTable
            title={closedOnly ? 'Closed SR' : 'SR List'}
            rows={visibleRequests}
            columns={closedOnly ? CLOSED_COLUMNS : LIST_COLUMNS}
            basePath={basePath}
            showActionMenu={showActionMenu}
            emptyMessage="No Records Found"
            exportFilename={closedOnly ? 'closed-sr.xlsx' : 'sr-list.xlsx'}
          />
        </div>
      </div>

      {isCreatePanelOpen ? (
        <div className="support-ticket-drawer-backdrop" role="presentation">
          <aside
            className="support-ticket-drawer"
            role="dialog"
            aria-modal="true"
            aria-label="New support request"
          >
            <React.Suspense fallback={<div className="support-ticket-drawer-loading">Loading support request form...</div>}>
              <AddSupportRequestPanel
                panelMode
                onClose={() => setIsCreatePanelOpen(false)}
                onSuccess={() => setIsCreatePanelOpen(false)}
              />
            </React.Suspense>
          </aside>
        </div>
      ) : null}
    </div>
  )
}

export default SupportRequestList
export { CLOSED_COLUMNS, LIST_COLUMNS }
