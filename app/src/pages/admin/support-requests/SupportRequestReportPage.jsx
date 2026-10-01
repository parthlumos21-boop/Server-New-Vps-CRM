import React, { useEffect, useMemo, useRef } from 'react'
import { useLocation, useNavigate, useParams } from 'react-router-dom'
import Button from '../../../components/common/Button'
import { useData } from '../../../context/DataContext'
import SupportRequestLocationMap from './SupportRequestLocationMap'
import {
  formatDateTime,
  formatShortDate,
  formatSupportRequestType,
  getSupportRequestBasePath,
} from './SupportRequestShared'
import './SupportRequestAdmin.css'

const SupportRequestReportPage = () => {
  const location = useLocation()
  const navigate = useNavigate()
  const { supportRequestId } = useParams()
  const { supportRequests } = useData()
  const basePath = getSupportRequestBasePath(location.pathname)
  const hasAutoPrintedRef = useRef(false)

  const supportRequest = useMemo(
    () => supportRequests.find((entry) => entry.id === supportRequestId) || null,
    [supportRequestId, supportRequests]
  )

  useEffect(() => {
    const shouldPrint = new URLSearchParams(location.search).get('print') === '1'
    if (!supportRequest || !shouldPrint || hasAutoPrintedRef.current) {
      return undefined
    }

    hasAutoPrintedRef.current = true
    const timerId = window.setTimeout(() => {
      window.print()
    }, 450)

    return () => window.clearTimeout(timerId)
  }, [location.search, supportRequest])

  if (!supportRequest) {
    return (
      <div className="support-request-admin-page">
        <section className="support-request-admin-card">
          <h1>Support request report not available</h1>
          <p>The selected support request could not be located.</p>
          <div className="support-request-admin-actions">
            <Button onClick={() => navigate(`${basePath}/list`)}>Back To SR List</Button>
          </div>
        </section>
      </div>
    )
  }

  return (
    <div className="support-request-admin-page support-request-admin-page--landscape">
      <section className="support-request-admin-card support-request-admin-card--landscape support-request-report-card">
        <div className="support-request-admin-header-row">
          <div>
            <p className="support-request-admin-eyebrow">View SR Report (PDF)</p>
            <h1>{supportRequest.srNumber}</h1>
            <p className="support-request-admin-copy">Print this page or save it as PDF from the browser.</p>
          </div>

          <div className="support-request-admin-actions support-request-admin-actions-top support-request-admin-actions-print">
            <Button onClick={() => window.print()}>Print / Save PDF</Button>
            <Button variant="outline" onClick={() => navigate(`${basePath}/details/${supportRequest.id}`)}>View SR</Button>
          </div>
        </div>

        <div className="support-request-admin-grid">
          <div><span>Customer Name</span><strong>{supportRequest.customerName || '-'}</strong></div>
          <div><span>Owner</span><strong>{supportRequest.ownerName || '-'}</strong></div>
          <div><span>SR Type / Complaint Type</span><strong>{formatSupportRequestType(supportRequest.requestType)}</strong></div>
          <div><span>Service Date</span><strong>{formatShortDate(supportRequest.srDate)}</strong></div>
          <div><span>Status</span><strong>{supportRequest.status || '-'}</strong></div>
          <div><span>Priority</span><strong>{supportRequest.priority || '-'}</strong></div>
          <div><span>Closed On</span><strong>{formatDateTime(supportRequest.closedOn)}</strong></div>
          <div><span>Closed By</span><strong>{supportRequest.closedByName || '-'}</strong></div>
        </div>

        <div className="support-request-admin-section">
          <h2>Description</h2>
          <p>{supportRequest.description || '-'}</p>
        </div>

        <div className="support-request-admin-section">
          <h2>Contact</h2>
          <p><strong>{supportRequest.contactPerson || '-'}</strong></p>
          <p>{supportRequest.contactDesignation || '-'}</p>
          <p>{supportRequest.contactMobile || supportRequest.contactPhone || '-'}</p>
          <p>{supportRequest.contactEmail || '-'}</p>
        </div>

        <div className="support-request-admin-section">
          <h2>Live Location</h2>
          <SupportRequestLocationMap supportRequest={supportRequest} />
        </div>

        <div className="support-request-admin-actions support-request-admin-actions-print">
          <Button onClick={() => window.print()}>Print / Save PDF</Button>
          <Button variant="outline" onClick={() => navigate(`${basePath}/details/${supportRequest.id}`)}>View SR</Button>
        </div>
      </section>
    </div>
  )
}

export default SupportRequestReportPage
