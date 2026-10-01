import React, { useEffect, useMemo, useRef } from 'react'
import { useLocation, useNavigate, useParams } from 'react-router-dom'
import Button from '../../../components/common/Button'
import { useData } from '../../../context/DataContext'
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

        <div className="support-request-report-table-container">
          <table className="support-request-report-table">
            <tbody>
              <tr>
                <th>SR Number</th>
                <td>{supportRequest.srNumber || '-'}</td>
              </tr>
              <tr>
                <th>Customer Number</th>
                <td>{supportRequest.customerNumber || supportRequest.customerNo || '-'}</td>
              </tr>
              <tr>
                <th>Description</th>
                <td>{supportRequest.description || supportRequest.issueDescription || '-'}</td>
              </tr>
              <tr>
                <th>Request Date</th>
                <td>{formatShortDate(supportRequest.srDate || supportRequest.requestDate || supportRequest.createdAt)}</td>
              </tr>
              <tr>
                <th>End Date</th>
                <td>{formatShortDate(supportRequest.endDate || supportRequest.closedOn)}</td>
              </tr>
              <tr>
                <th>Owner</th>
                <td>{supportRequest.ownerName || supportRequest.addedByName || '-'}</td>
              </tr>
              <tr>
                <th>Request Type</th>
                <td>{formatSupportRequestType(supportRequest.requestType) || '-'}</td>
              </tr>
              <tr>
                <th>Status</th>
                <td>{supportRequest.status || '-'}</td>
              </tr>
              <tr>
                <th>Note</th>
                <td>{supportRequest.note || supportRequest.notes || supportRequest.remark || supportRequest.remarks || '-'}</td>
              </tr>
            </tbody>
          </table>
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
