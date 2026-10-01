import React, { useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  FaUsers,
  FaTh,
  FaUserTie,
  FaThumbsUp,
  FaHistory,
  FaChevronLeft,
  FaTimes,
  FaUpload,
  FaCheckCircle,
  FaTimesCircle,
  FaFileExcel,
} from 'react-icons/fa'
import './BulkUploadsPage.css'

const BULK_CARDS = [
  { key: 'accounts',        label: ['Bulk Upload', 'Accounts'],        icon: FaUsers,    color: '#5d7488' },
  { key: 'account-tables',  label: ['Bulk Upload', 'Account Tables'],  icon: FaTh,       color: '#e07b39' },
  { key: 'customers',       label: ['Bulk Upload', 'Customers'],       icon: FaUserTie,  color: '#e07b39' },
  { key: 'customer-tables', label: ['Bulk Upload', 'Customer Tables'], icon: FaTh,       color: '#83b63d' },
  { key: 'deals',           label: ['Bulk Upload', 'Deals'],           icon: FaThumbsUp, color: '#e07b39' },
  { key: 'deal-tables',     label: ['Bulk Upload', 'Deal Tables'],     icon: FaTh,       color: '#5d7488' },
  { key: 'history',         label: ['Bulk Upload History'],            icon: FaHistory,  color: '#e8a23d' },
]

/* ── Toast ──────────────────────────────────────────────── */
const Toast = ({ toast }) => {
  if (!toast) return null
  const Icon = toast.type === 'success' ? FaCheckCircle : FaTimesCircle
  return (
    <div className={`bu-toast bu-toast--${toast.type}`}>
      <Icon className="bu-toast-icon" />
      <span>{toast.msg}</span>
    </div>
  )
}

/* ── Upload Modal ───────────────────────────────────────── */
const UploadModal = ({ card, onClose, onUpload }) => {
  const fileInputRef = useRef(null)
  const [file, setFile] = useState(null)
  const [dragging, setDragging] = useState(false)

  if (!card) return null
  const title = card.label.join(' ')

  const handleFile = (f) => {
    if (!f) return
    const allowed = ['.csv', '.xlsx', '.xls']
    const ext = f.name.slice(f.name.lastIndexOf('.')).toLowerCase()
    if (!allowed.includes(ext)) {
      onUpload('error', 'Only CSV and Excel (.xlsx, .xls) files are supported.')
      return
    }
    setFile(f)
  }

  const handleDrop = (e) => {
    e.preventDefault()
    setDragging(false)
    handleFile(e.dataTransfer.files[0])
  }

  const handleSubmit = () => {
    if (!file) return
    onUpload('success', `"${file.name}" uploaded successfully for ${title}.`)
    onClose()
  }

  return (
    <div className="bu-overlay" onClick={onClose}>
      <div className="bu-modal" onClick={(e) => e.stopPropagation()}>
        <div className="bu-modal-header">
          <span className="bu-modal-title">{title}</span>
          <button type="button" className="bu-modal-close" onClick={onClose}>
            <FaTimes />
          </button>
        </div>

        <div className="bu-modal-body">
          <div
            className={`bu-dropzone${dragging ? ' bu-dropzone--active' : ''}${file ? ' bu-dropzone--has-file' : ''}`}
            onDragOver={(e) => { e.preventDefault(); setDragging(true) }}
            onDragLeave={() => setDragging(false)}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
          >
            {file ? (
              <>
                <FaFileExcel className="bu-dropzone-file-icon" />
                <span className="bu-dropzone-filename">{file.name}</span>
                <span className="bu-dropzone-size">{(file.size / 1024).toFixed(1)} KB</span>
              </>
            ) : (
              <>
                <FaUpload className="bu-dropzone-icon" />
                <span className="bu-dropzone-hint">Drag & drop a file here, or click to browse</span>
                <span className="bu-dropzone-formats">Supported: .csv, .xlsx, .xls</span>
              </>
            )}
            <input
              ref={fileInputRef}
              type="file"
              accept=".csv,.xlsx,.xls"
              style={{ display: 'none' }}
              onChange={(e) => handleFile(e.target.files[0])}
            />
          </div>

          {file && (
            <button
              type="button"
              className="bu-clear-btn"
              onClick={(e) => { e.stopPropagation(); setFile(null) }}
            >
              Remove file
            </button>
          )}
        </div>

        <div className="bu-modal-footer">
          <button
            type="button"
            className="bu-btn bu-btn--primary"
            disabled={!file}
            onClick={handleSubmit}
          >
            <FaUpload className="bu-btn-icon" />
            Upload
          </button>
          <button type="button" className="bu-btn bu-btn--gray" onClick={onClose}>
            Cancel
          </button>
        </div>
      </div>
    </div>
  )
}

/* ── Main page ──────────────────────────────────────────── */
const BulkUploadsPage = () => {
  const navigate = useNavigate()
  const [activeCard, setActiveCard] = useState(null)
  const [toast, setToast] = useState(null)
  const toastTimer = useRef(null)

  const showToast = (type, msg) => {
    setToast({ type, msg })
    clearTimeout(toastTimer.current)
    toastTimer.current = setTimeout(() => setToast(null), 3000)
  }

  return (
    <div className="bu-page">
      <Toast toast={toast} />

      <div className="bu-header">
        <button type="button" className="bu-back-btn" onClick={() => navigate(-1)}>
          <FaChevronLeft className="bu-back-icon" />
          Bulk Uploads
        </button>
      </div>

      <div className="bu-grid">
        {BULK_CARDS.map((card) => {
          const Icon = card.icon
          return (
            <button
              key={card.key}
              type="button"
              className="bu-card"
              onClick={() => {
                if (card.key === 'history') {
                  navigate('/admin/bulk-uploads/history')
                } else if (card.key === 'accounts') {
                  navigate('/admin/bulk-uploads/accounts')
                } else if (card.key === 'account-tables') {
                  navigate('/admin/bulk-uploads/account-tables')
                } else if (card.key === 'customers') {
                  navigate('/admin/bulk-uploads/customers')
                } else if (card.key === 'customer-tables') {
                  navigate('/admin/bulk-uploads/customer-tables')
                } else if (card.key === 'deals') {
                  navigate('/admin/bulk-uploads/deals')
                } else if (card.key === 'deal-tables') {
                  navigate('/admin/bulk-uploads/deal-tables')
                } else if (card.key === 'products') {
                  navigate('/admin/bulk-uploads/products')
                } else {
                  setActiveCard(card)
                }
              }}
            >
              <Icon className="bu-card-icon" style={{ color: card.color }} />
              <span className="bu-card-label">
                {card.label.map((line, i) => (
                  <span key={i}>{line}</span>
                ))}
              </span>
            </button>
          )
        })}
      </div>

      <UploadModal
        card={activeCard}
        onClose={() => setActiveCard(null)}
        onUpload={showToast}
      />
    </div>
  )
}

export default BulkUploadsPage
