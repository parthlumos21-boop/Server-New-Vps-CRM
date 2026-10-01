import React, { useState, useEffect } from 'react'
import { FiTrash2, FiDatabase, FiRefreshCw } from 'react-icons/fi'
import { databaseApi } from '../../../services/databaseApi'
import Spinner from '../../../components/common/Spinner'
import Modal from '../../../components/common/Modal'
import './DatabaseManagerPage.css'

const DatabaseManagerPage = () => {
  const [collections, setCollections] = useState([])
  const [activeCollection, setActiveCollection] = useState(null)
  const [documents, setDocuments] = useState([])
  const [pagination, setPagination] = useState({ page: 1, limit: 50, total: 0, totalPages: 0 })
  const [isLoadingList, setIsLoadingList] = useState(true)
  const [isLoadingDocs, setIsLoadingDocs] = useState(false)
  
  const [deleteModal, setDeleteModal] = useState({ isOpen: false, documentId: null })

  const fetchCollections = async () => {
    setIsLoadingList(true)
    try {
      const response = await databaseApi.getCollections()
      if (response.success) {
        setCollections(response.data)
      }
    } catch (error) {
      console.error('Failed to fetch collections', error)
    } finally {
      setIsLoadingList(false)
    }
  }

  const fetchDocuments = async (collectionName, page = 1) => {
    setIsLoadingDocs(true)
    try {
      const response = await databaseApi.getCollectionData(collectionName, { page, limit: pagination.limit })
      if (response.success) {
        setDocuments(response.data.documents)
        setPagination(response.data.pagination)
      }
    } catch (error) {
      console.error('Failed to fetch documents', error)
    } finally {
      setIsLoadingDocs(false)
    }
  }

  useEffect(() => {
    fetchCollections()
  }, [])

  useEffect(() => {
    if (activeCollection) {
      fetchDocuments(activeCollection, 1)
    }
  }, [activeCollection])

  const handlePageChange = (newPage) => {
    if (newPage >= 1 && newPage <= pagination.totalPages) {
      fetchDocuments(activeCollection, newPage)
    }
  }

  const confirmDelete = (documentId) => {
    setDeleteModal({ isOpen: true, documentId })
  }

  const handleDelete = async () => {
    if (!activeCollection || !deleteModal.documentId) return

    try {
      const response = await databaseApi.deleteDocument(activeCollection, deleteModal.documentId)
      if (response.success) {
        setDeleteModal({ isOpen: false, documentId: null })
        fetchDocuments(activeCollection, pagination.page)
        fetchCollections() // Refresh counts
      }
    } catch (error) {
      console.error('Failed to delete document', error)
      alert('Failed to delete document')
    }
  }

  const getColumns = () => {
    if (documents.length === 0) return []
    // Get all unique keys from all documents on this page
    const allKeys = new Set(['_id'])
    documents.forEach(doc => {
      Object.keys(doc).forEach(key => allKeys.add(key))
    })
    return Array.from(allKeys)
  }

  const columns = getColumns()

  const renderCellValue = (value) => {
    if (value === null) return 'null'
    if (value === undefined) return 'undefined'
    if (typeof value === 'object') {
      return (
        <div className="db-json-view">
          {JSON.stringify(value, null, 2)}
        </div>
      )
    }
    return String(value)
  }

  return (
    <div className="database-manager-page">
      <div className="db-sidebar">
        <div className="db-sidebar-header">
          <h2><FiDatabase style={{ marginRight: '8px' }} /> Database Collections</h2>
        </div>
        
        {isLoadingList ? (
          <Spinner />
        ) : (
          <ul className="db-collection-list">
            {collections.map(col => (
              <li 
                key={col.name}
                className={`db-collection-item ${activeCollection === col.name ? 'active' : ''}`}
                onClick={() => setActiveCollection(col.name)}
              >
                <span>{col.name}</span>
                <span className="db-collection-count">{col.count}</span>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="db-main-content">
        {!activeCollection ? (
          <div className="db-empty-state">
            Select a collection from the sidebar to view its data
          </div>
        ) : (
          <>
            <div className="db-header">
              <h1>Collection: {activeCollection}</h1>
              <button className="btn btn-secondary" onClick={() => fetchDocuments(activeCollection, pagination.page)}>
                <FiRefreshCw /> Refresh
              </button>
            </div>
            
            <div className="db-table-container">
              {isLoadingDocs ? (
                <Spinner />
              ) : documents.length === 0 ? (
                <div className="db-empty-state">No documents found in this collection</div>
              ) : (
                <table className="db-table">
                  <thead>
                    <tr>
                      {columns.map(col => (
                        <th key={col}>{col}</th>
                      ))}
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {documents.map(doc => (
                      <tr key={doc._id}>
                        {columns.map(col => (
                          <td key={`${doc._id}-${col}`}>
                            {renderCellValue(doc[col])}
                          </td>
                        ))}
                        <td>
                          <button 
                            className="db-action-btn"
                            title="Delete Document"
                            onClick={() => confirmDelete(doc._id)}
                          >
                            <FiTrash2 size={18} />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>

            {pagination.totalPages > 1 && (
              <div className="db-pagination">
                <span className="db-pagination-info">
                  Showing {documents.length} documents • Page {pagination.page} of {pagination.totalPages} • Total: {pagination.total}
                </span>
                <div className="db-pagination-controls">
                  <button 
                    className="db-pagination-btn" 
                    disabled={pagination.page <= 1}
                    onClick={() => handlePageChange(pagination.page - 1)}
                  >
                    Previous
                  </button>
                  <button 
                    className="db-pagination-btn"
                    disabled={pagination.page >= pagination.totalPages}
                    onClick={() => handlePageChange(pagination.page + 1)}
                  >
                    Next
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      <Modal
        isOpen={deleteModal.isOpen}
        onClose={() => setDeleteModal({ isOpen: false, documentId: null })}
        title="Confirm Deletion"
      >
        <p>Are you sure you want to delete this document ({deleteModal.documentId})?</p>
        <p className="text-danger">This action cannot be undone.</p>
        <div className="modal-actions" style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '20px' }}>
          <button className="btn btn-secondary" onClick={() => setDeleteModal({ isOpen: false, documentId: null })}>
            Cancel
          </button>
          <button className="btn btn-danger" onClick={handleDelete}>
            Delete Document
          </button>
        </div>
      </Modal>
    </div>
  )
}

export default DatabaseManagerPage
