import React from 'react'
import { FaChevronLeft } from 'react-icons/fa'
import { useNavigate } from 'react-router-dom'
import { BULK_UPLOAD_HISTORY_KEY } from './bulkUploadWorkflow'
import './BulkUploadHistoryPage.css'

const BulkUploadHistoryPage = () => {
  const navigate = useNavigate()
  let history = []

  try {
    history = JSON.parse(localStorage.getItem(BULK_UPLOAD_HISTORY_KEY) || '[]')
  } catch {
    history = []
  }

  return (
    <div className="bulk-history-page">
      <div className="bulk-history-header">
        <button type="button" className="bulk-history-back" onClick={() => navigate('/admin/bulk-uploads')}>
          <FaChevronLeft className="bulk-history-back-icon" />
          <span>Bulk Upload History</span>
        </button>
      </div>

      <div className="bulk-history-body">
        {history.length > 0 ? (
          <div className="bulk-upload-review-table-wrap">
            <table className="bulk-upload-review-table">
              <thead>
                <tr>
                  <th>Module</th>
                  <th>File</th>
                  <th>Records</th>
                  <th>Status</th>
                  <th>Uploaded At</th>
                </tr>
              </thead>
              <tbody>
                {history.map((entry) => (
                  <tr key={entry.id}>
                    <td>{entry.moduleName}</td>
                    <td>{entry.fileName}</td>
                    <td>{entry.rowCount}</td>
                    <td>{entry.status}</td>
                    <td>{new Date(entry.uploadedAt).toLocaleString('en-IN')}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="bulk-history-alert">
            Bulk Upload has not been attempted for past 30 days
          </div>
        )}
      </div>

      <div className="bulk-history-footer-strip">
        <span>Your CRM account has expired. Kindly process the payment.</span>
        <button type="button" onClick={() => navigate('/admin/settings')}>Renew CRM Account</button>
      </div>
    </div>
  )
}

export default BulkUploadHistoryPage
