import React, { useRef } from 'react'
import {
  FaPlus,
  FaFilePdf,
  FaFileWord,
  FaFilePowerpoint,
  FaFileImage,
  FaFileAlt,
  FaTrash,
  FaDownload,
} from 'react-icons/fa'

const getFileIcon = (fileName = '') => {
  const ext = fileName.split('.').pop().toLowerCase()
  if (ext === 'pdf') return <FaFilePdf style={{ color: '#ef4444' }} />
  if (['doc', 'docx'].includes(ext)) return <FaFileWord style={{ color: '#2563eb' }} />
  if (['ppt', 'pptx'].includes(ext)) return <FaFilePowerpoint style={{ color: '#f97316' }} />
  if (['png', 'jpg', 'jpeg', 'svg', 'webp'].includes(ext)) return <FaFileImage style={{ color: '#10b981' }} />
  return <FaFileAlt style={{ color: '#64748b' }} />
}

const formatFileSize = (bytes) => {
  if (!bytes) return ''
  const num = Number(bytes)
  if (num < 1024) return `${num} B`
  if (num < 1024 * 1024) return `${Math.round(num / 1024)} kb`
  return `${(num / (1024 * 1024)).toFixed(1)} mb`
}

export default function TaskAttachmentsMiniList({
  attachments = [],
  onUploadFile,
  onDeleteFile,
  onDownloadFile,
  isUploading = false,
}) {
  const fileInputRef = useRef(null)

  const handleFileChange = (e) => {
    const file = e.target.files?.[0]
    if (file && onUploadFile) {
      onUploadFile(file)
    }
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <span
          style={{
            fontSize: '0.72rem',
            fontWeight: '800',
            color: '#64748b',
            textTransform: 'uppercase',
            letterSpacing: '0.04em',
          }}
        >
          ATTACHMENT ({attachments.length})
        </span>

        <button
          type="button"
          disabled={isUploading}
          onClick={() => fileInputRef.current && fileInputRef.current.click()}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.35rem',
            background: 'none',
            border: 'none',
            color: '#c60016',
            fontSize: '0.76rem',
            fontWeight: '700',
            cursor: isUploading ? 'not-allowed' : 'pointer',
            padding: '2px 0',
          }}
        >
          <FaPlus style={{ fontSize: '0.65rem' }} />
          <span>{isUploading ? 'Uploading...' : 'Upload Document'}</span>
        </button>
      </div>

      {/* Attachments List */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
        {attachments.length === 0 ? (
          <div style={{ fontSize: '0.76rem', color: '#94a3b8', fontStyle: 'italic', padding: '0.2rem 0' }}>
            No documents attached yet.
          </div>
        ) : (
          attachments.map((file) => {
            const name = file.fileName || file.name || 'Document'
            const size = formatFileSize(file.sizeBytes || file.size)
            const dateStr = file.createdAt
              ? new Date(file.createdAt).toLocaleDateString('en-GB', {
                  day: 'numeric',
                  month: 'short',
                  year: '2-digit',
                })
              : 'Recent'

            return (
              <div
                key={file.id || file.legacyId || file._id || name}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '0.4rem 0.55rem',
                  borderRadius: '8px',
                  backgroundColor: '#f8fafc',
                  border: '1px solid #f1f5f9',
                  gap: '0.65rem',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.55rem', flex: 1, minWidth: 0 }}>
                  <span style={{ fontSize: '0.95rem', display: 'flex', alignItems: 'center' }}>
                    {getFileIcon(name)}
                  </span>
                  <span
                    onClick={() => onDownloadFile && onDownloadFile(file)}
                    style={{
                      fontSize: '0.8rem',
                      fontWeight: '600',
                      color: '#c60016',
                      cursor: 'pointer',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                    }}
                    title={name}
                  >
                    {name}
                  </span>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', flexShrink: 0 }}>
                  <span style={{ fontSize: '0.7rem', color: '#94a3b8' }}>
                    {dateStr}
                  </span>
                  {size && (
                    <span style={{ fontSize: '0.7rem', color: '#64748b', fontWeight: '500' }}>
                      {size}
                    </span>
                  )}
                  {onDownloadFile && (
                    <button
                      type="button"
                      onClick={() => onDownloadFile(file)}
                      style={{
                        background: 'none',
                        border: 'none',
                        color: '#64748b',
                        cursor: 'pointer',
                        padding: '2px',
                        fontSize: '0.72rem',
                      }}
                      title="Download"
                    >
                      <FaDownload />
                    </button>
                  )}
                  {onDeleteFile && (
                    <button
                      type="button"
                      onClick={() => onDeleteFile(file.id || file.legacyId || file._id)}
                      style={{
                        background: 'none',
                        border: 'none',
                        color: '#94a3b8',
                        cursor: 'pointer',
                        padding: '2px',
                        fontSize: '0.72rem',
                      }}
                      title="Delete"
                    >
                      <FaTrash />
                    </button>
                  )}
                </div>
              </div>
            )
          })
        )}
      </div>

      {/* Hidden File Input */}
      <input
        ref={fileInputRef}
        type="file"
        onChange={handleFileChange}
        style={{ display: 'none' }}
      />

    </div>
  )
}
