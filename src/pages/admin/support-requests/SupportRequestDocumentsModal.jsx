import React, { useEffect, useState } from 'react'
import Modal from '../../../components/common/Modal'
import { useData } from '../../../context/DataContext'
import { supportRequestDocumentApi } from '../../../services/supportRequestDocumentApi'
import { formatDateTime, formatSupportRequestType } from './SupportRequestShared'
import { FaDownload } from 'react-icons/fa'
import './SupportRequestAdmin.css'

const SupportRequestDocumentsModal = ({ onClose }) => {
  const { supportRequests = [] } = useData()
  const [documents, setDocuments] = useState([])
  const [loading, setLoading] = useState(true)

  const findSupportRequest = (doc = {}) => supportRequests.find((supportRequest) => (
    String(supportRequest.id || supportRequest._id || '') === String(doc.supportRequestId || '')
    || String(supportRequest.srNumber || '') === String(doc.srNumber || '')
  )) || {}

  const getCustomerName = (doc = {}) => {
    const supportRequest = findSupportRequest(doc)
    return doc.customerName || supportRequest.customerName || '-'
  }

  const getServiceType = (doc = {}) => {
    const supportRequest = findSupportRequest(doc)
    return formatSupportRequestType(doc.requestType || supportRequest.requestType)
  }

  useEffect(() => {
    const fetchDocuments = async () => {
      try {
        const data = await supportRequestDocumentApi.getDocuments()
        setDocuments(data || [])
      } catch (error) {
        console.error('Failed to fetch documents:', error)
      } finally {
        setLoading(false)
      }
    }
    fetchDocuments()
  }, [])

  return (
    <Modal isOpen onClose={onClose} title="Support Request Documents" size="large">
      <div className="support-request-legacy-table-shell support-request-documents-table-shell" style={{ margin: '1rem', maxHeight: '60vh', overflow: 'auto' }}>
        {loading ? (
          <div>Loading documents...</div>
        ) : (
          <table className="support-request-legacy-table support-request-documents-table">
            <thead>
              <tr>
                <th>SR Number</th>
                <th>Document Type</th>
                <th>Customer Name</th>
                <th>Service Type</th>
                <th>File Name</th>
                <th>Uploaded By</th>
                <th>Uploaded At</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {documents.length > 0 ? (
                documents.map((doc) => (
                  <tr key={doc._id || doc.id}>
                    <td>{doc.srNumber}</td>
                    <td style={{ textTransform: 'capitalize' }}>{doc.documentType?.replace('_', ' ')}</td>
                    <td>{getCustomerName(doc)}</td>
                    <td>{getServiceType(doc)}</td>
                    <td>{doc.originalFileName || doc.fileName}</td>
                    <td>{doc.uploadedBy?.name || '-'}</td>
                    <td>{formatDateTime(doc.uploadedAt)}</td>
                    <td>
                      {doc.storage?.path && (
                        <a 
                          href={`/api/support-request-documents/${doc._id || doc.id}/download`} 
                          download={doc.originalFileName} 
                          target="_blank" 
                          rel="noreferrer"
                          className="btn-red-theme"
                          style={{ padding: '0.25rem 0.5rem', display: 'inline-flex', alignItems: 'center', gap: '0.5rem', textDecoration: 'none' }}
                        >
                          <FaDownload size={12} /> Download
                        </a>
                      )}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={8} className="support-request-legacy-empty">
                    No attached documents found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        )}
      </div>
    </Modal>
  )
}

export default SupportRequestDocumentsModal
