import React, { useEffect, useMemo, useRef, useState } from 'react'
import { useLocation, useNavigate, useParams } from 'react-router-dom'
import Button from '../../../components/common/Button'
import { useData } from '../../../context/DataContext'
import integrationApi from '../../../services/integrationApi'
import {
  formatDateTime,
  formatShortDate,
  formatSupportRequestType,
  getSupportRequestBasePath,
} from './SupportRequestShared'
import './SupportRequestAdmin.css'
import {
  FaBell,
  FaBook,
  FaCalendarAlt,
  FaClock,
  FaEnvelope,
  FaFileAlt,
  FaHome,
  FaIdCard,
  FaLayerGroup,
  FaMapMarkerAlt,
  FaPuzzlePiece,
  FaRegAddressCard,
  FaUser,
  FaWrench,
} from 'react-icons/fa'

const missingValue = 'Not Available'

const getDisplayValue = (value) => {
  const normalizedValue = String(value || '').trim()
  return normalizedValue || missingValue
}

const SupportRequestActionsDropdown = ({ supportRequest, basePath }) => {
  const navigate = useNavigate()
  const menuRef = useRef(null)
  const [open, setOpen] = useState(false)

  useEffect(() => {
    if (!open) return undefined

    const handleDocumentClick = (event) => {
      if (!menuRef.current?.contains(event.target)) {
        setOpen(false)
      }
    }

    document.addEventListener('mousedown', handleDocumentClick)
    return () => document.removeEventListener('mousedown', handleDocumentClick)
  }, [open])

  const actions = [
    { key: 'add-note-remarks', label: 'Add Note/Remarks', icon: FaRegAddressCard },
    { key: 'add-reminder', label: 'Add Reminder', icon: FaBell },
    { key: 'add-document', label: 'Add Document', icon: FaBook },
    { key: 'manage-sr', label: 'Manage SR', icon: FaIdCard, route: `${basePath}/manage/${supportRequest.id}` },
  ]

  const handleAction = (action) => {
    setOpen(false)
    navigate(action.route || `${basePath}/actions/${action.key}/${supportRequest.id}`)
  }

  return (
    <div ref={menuRef} className="support-request-view-action-menu">
      <button
        type="button"
        className="support-request-view-action-trigger"
        onClick={() => setOpen((current) => !current)}
      >
        <span>Actions</span>
        <span className="support-request-view-action-caret">v</span>
      </button>

      {open ? (
        <div className="support-request-view-action-dropdown">
          {actions.map((action) => {
            const Icon = action.icon
            return (
              <button key={action.key} type="button" onClick={() => handleAction(action)}>
                <Icon />
                <span>{action.label}</span>
              </button>
            )
          })}
        </div>
      ) : null}
    </div>
  )
}

const DetailBlock = ({ icon: Icon, label, value, wide = false }) => {
  const displayValue = getDisplayValue(value)
  const isMissing = displayValue === missingValue

  return (
    <div className={`support-request-view-detail ${wide ? 'support-request-view-detail--wide' : ''}`}>
      <dt>
        {Icon ? <Icon /> : null}
        <span>{label}</span>
      </dt>
      <dd className={isMissing ? 'support-request-view-missing' : ''}>{displayValue}</dd>
    </div>
  )
}

const SupportRequestDetailsPage = () => {
  const location = useLocation()
  const navigate = useNavigate()
  const { supportRequestId } = useParams()
  const { supportRequests } = useData()
  const basePath = getSupportRequestBasePath(location.pathname)
  const [emailLogs, setEmailLogs] = useState([])
  const [emailLogsLoading, setEmailLogsLoading] = useState(false)

  const supportRequest = useMemo(
    () => supportRequests.find((entry) => entry.id === supportRequestId) || null,
    [supportRequestId, supportRequests]
  )

  useEffect(() => {
    if (!supportRequestId) return

    let isMounted = true
    const loadEmailLogs = async () => {
      setEmailLogsLoading(true)
      try {
        const logs = await integrationApi.getCommunicationLogs({
          targetId: supportRequestId,
          limit: 100,
        })
        if (isMounted) {
          setEmailLogs((Array.isArray(logs) ? logs : []).filter((log) => log.channel === 'outlook'))
        }
      } catch (_error) {
        if (isMounted) setEmailLogs([])
      } finally {
        if (isMounted) setEmailLogsLoading(false)
      }
    }

    loadEmailLogs()
    return () => {
      isMounted = false
    }
  }, [supportRequestId])

  const formatEmailLogDate = (value, part) => {
    if (!value) return '-'
    const date = new Date(value)
    if (Number.isNaN(date.getTime())) return '-'
    if (part === 'time') {
      return date.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })
    }
    return date.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
  }

  if (!supportRequest) {
    return (
      <div className="support-request-admin-page">
        <section className="support-request-admin-card">
          <h1>Support request not found</h1>
          <p>The selected support request could not be located.</p>
          <div className="support-request-admin-actions">
            <Button onClick={() => navigate(`${basePath}/list`)}>Back To SR List</Button>
          </div>
        </section>
      </div>
    )
  }

  return (
    <div className="support-request-view-page">
      <section className="support-request-view-shell">
        <div className="support-request-view-titlebar">
          <h1>Support Request</h1>
          <div className="support-request-view-title-actions">
            <Button variant="outline" onClick={() => navigate(`${basePath}/report/${supportRequest.id}`)}>View SR Report</Button>
            <Button variant="outline" onClick={() => navigate(`${basePath}/list`)}>Back To SR List</Button>
            <button type="button" aria-label="Close support request view" onClick={() => navigate(`${basePath}/list`)}>
              x
            </button>
          </div>
        </div>

        <div className="support-request-view-toolbar">
          <strong>SR No: {supportRequest.srNumber}</strong>
          <div className="support-request-view-icons" aria-hidden="true">
            <FaHome />
            <FaClock />
            <FaBell />
            <FaBook />
            <FaRegAddressCard />
          </div>
          <SupportRequestActionsDropdown supportRequest={supportRequest} basePath={basePath} />
        </div>

        <dl className="support-request-view-panel">
          <DetailBlock icon={FaUser} label="Customer Details" value={`${supportRequest.customerName || supportRequest.customerCompany || ''}${supportRequest.referenceNumber ? ` [${supportRequest.referenceNumber}]` : ''}`} />
          <DetailBlock icon={FaCalendarAlt} label="Added Date" value={formatDateTime(supportRequest.createdAt)} />
          <DetailBlock icon={FaCalendarAlt} label="Request Date" value={formatShortDate(supportRequest.srDate)} />
          <DetailBlock icon={FaCalendarAlt} label="End Date" value={formatShortDate(supportRequest.extendedUntil || supportRequest.closedOn)} />
          <DetailBlock icon={FaUser} label="Contact Person" value={supportRequest.contactPerson} />
          <DetailBlock icon={FaMapMarkerAlt} label="Address" value={supportRequest.address || supportRequest.city || supportRequest.state} />
          <DetailBlock icon={FaWrench} label="Phone" value={supportRequest.contactMobile || supportRequest.contactPhone || supportRequest.customerPhone} />
          <DetailBlock icon={FaEnvelope} label="Email" value={supportRequest.contactEmail || supportRequest.customerEmail} />
          <DetailBlock icon={FaLayerGroup} label="Request Type" value={formatSupportRequestType(supportRequest.requestType)} />
          <DetailBlock icon={FaPuzzlePiece} label="Status" value={supportRequest.status} />
          <DetailBlock icon={FaUser} label="Owner" value={supportRequest.ownerName} />
          <DetailBlock icon={FaFileAlt} label="Description" value={supportRequest.description} wide />

          <div className="support-request-view-other">
            <h2>Other Details</h2>
            <div className="support-request-view-other-grid">
              <DetailBlock label="Under Warranty" value={supportRequest.underWarranty || supportRequest.warranty || 'NO'} />
              <DetailBlock label="Contact Email" value={supportRequest.contactEmail || supportRequest.customerEmail} />
              <DetailBlock label="Phone" value={supportRequest.customerPhone || supportRequest.contactPhone} />
              <DetailBlock label="Site Person" value={supportRequest.sitePerson || supportRequest.contactPerson} />
              <DetailBlock label="Last Updated" value={formatDateTime(supportRequest.updatedAt)} />
              <DetailBlock label="Internal Notes" value={supportRequest.notes} />
            </div>
          </div>
        </dl>

        <section className="support-request-email-history">
          <div className="support-request-email-history__header">
            <div>
              <span>Email History</span>
              <h2>Outlook Emails</h2>
            </div>
            <FaEnvelope />
          </div>

          <div className="support-request-email-history__table-wrap">
            <table className="support-request-email-history__table">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Time</th>
                  <th>Recipient</th>
                  <th>Subject</th>
                  <th>Delivery Status</th>
                  <th>Sent By</th>
                </tr>
              </thead>
              <tbody>
                {emailLogsLoading ? (
                  <tr>
                    <td colSpan="6">Loading email history...</td>
                  </tr>
                ) : emailLogs.length > 0 ? (
                  emailLogs.map((log) => (
                    <tr key={log.id || `${log.recipient}-${log.createdAt}`}>
                      <td>{formatEmailLogDate(log.createdAt, 'date')}</td>
                      <td>{formatEmailLogDate(log.createdAt, 'time')}</td>
                      <td>{log.recipient || '-'}</td>
                      <td>{log.subject || '-'}</td>
                      <td>{log.status || '-'}</td>
                      <td>{log.createdByName || '-'}</td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan="6">No Outlook email history found for this service request.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>
      </section>
    </div>
  )
}

export default SupportRequestDetailsPage
