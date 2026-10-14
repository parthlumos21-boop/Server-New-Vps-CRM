import React, { useRef, useState } from 'react'
import {
  FaCloudUploadAlt,
  FaFilePdf,
  FaFileWord,
  FaFilePowerpoint,
  FaFileImage,
  FaFileAlt,
  FaDownload,
  FaTrash,
} from 'react-icons/fa'

const getFileIcon = (fileName = '') => {
  const ext = fileName.split('.').pop().toLowerCase()
  if (ext === 'pdf') return <FaFilePdf style={{ color: '#ef4444', fontSize: '1.25rem' }} />
  if (['doc', 'docx'].includes(ext)) return <FaFileWord style={{ color: '#2563eb', fontSize: '1.25rem' }} />
  if (['ppt', 'pptx'].includes(ext)) return <FaFilePowerpoint style={{ color: '#f97316', fontSize: '1.25rem' }} />
  if (['png', 'jpg', 'jpeg', 'svg', 'webp'].includes(ext)) return <FaFileImage style={{ color: '#10b981', fontSize: '1.25rem' }} />
  return <FaFileAlt style={{ color: '#64748b', fontSize: '1.25rem' }} />
}

const formatFileSize = (bytes) => {
  if (!bytes) return 'Unknown size'
  const num = Number(bytes)
  if (num < 1024) return `${num} B`
  if (num < 1024 * 1024) return `${Math.round(num / 1024)} KB`
  return `${(num / (1024 * 1024)).toFixed(1)} MB`
}

export default function TaskAttachmentsTab({
  attachments = [],
  onUploadFile,
  onDeleteFile,
  onDownloadFile,
  isUploading = false,
}) {
  const fileInputRef = useRef(null)
  const [isDragOver, setIsDragOver] = useState(false)

  const handleFileDrop = (e) => {
    e.preventDefault()
    setIsDragOver(false)
    const file = e.dataTransfer.files?.[0]
    if (file && onUploadFile) onUploadFile(file)
  }

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        padding: '1.25rem 1.5rem',
        gap: '1.25rem',
        overflowY: 'auto',
      }}
    >
      {/* Upload Drop Zone */}
      <div
        onDragOver={(e) => {
          e.preventDefault()
          setIsDragOver(true)
        }}
        onDragLeave={() => setIsDragOver(false)}
        onDrop={handleFileDrop}
        onClick={() => fileInputRef.current && fileInputRef.current.click()}
        style={{
          border: isDragOver ? '2px dashed #c60016' : '2px dashed #cbd5e1',
          borderRadius: '12px',
          padding: '1.5rem',
          textAlign: 'center',
          backgroundColor: isDragOver ? '#fff1f2' : '#fafbfc',
          cursor: isUploading ? 'not-allowed' : 'pointer',
          transition: 'all 0.15s ease',
        }}
      >
        <input
          ref={fileInputRef}
          type="file"
          onChange={(e) => {
            const f = e.target.files?.[0]
            if (f && onUploadFile) onUploadFile(f)
            if (fileInputRef.current) fileInputRef.current.value = ''
          }}
          style={{ display: 'none' }}
        />
        <FaCloudUploadAlt style={{ fontSize: '2rem', color: isDragOver ? '#c60016' : '#94a3b8', marginBottom: '0.5rem' }} />
        <div style={{ fontSize: '0.84rem', fontWeight: '700', color: '#1e293b' }}>
          {isUploading ? 'Uploading document...' : 'Click or drag files here to attach'}
        </div>
        <div style={{ fontSize: '0.72rem', color: '#64748b', marginTop: '0.2rem' }}>
          Supports PDF, Word, Excel, PowerPoint, Images (Max 25MB)
        </div>
      </div>

      {/* Files List */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
        <span style={{ fontSize: '0.76rem', fontWeight: '800', color: '#475569', textTransform: 'uppercase' }}>
          Attached Documents ({attachments.length})
        </span>

        {attachments.length === 0 ? (
          <div style={{ padding: '2rem 1rem', textAlign: 'center', color: '#94a3b8', fontSize: '0.82rem', fontStyle: 'italic' }}>
            No documents attached to this task.
          </div>
        ) : (
          attachments.map((file) => {
            const name = file.fileName || file.name || 'Document'
            const size = formatFileSize(file.sizeBytes || file.size)
            const dateStr = file.createdAt
              ? new Date(file.createdAt).toLocaleDateString('en-GB', {
                  day: 'numeric',
                  month: 'short',
                  year: 'numeric',
                })
              : 'Recently'
            const uploaderName = file.uploadedByName || file.uploadedByUserName || 'User'
            const uploaderMail = file.uploadByMail || file.uploadedByMail || ''

            return (
              <div
                key={file.id || file.legacyId || file._id || name}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '0.75rem 1rem',
                  borderRadius: '10px',
                  backgroundColor: '#f8fafc',
                  border: '1px solid #e2e8f0',
                  gap: '0.75rem',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flex: 1, minWidth: 0 }}>
                  <div style={{ flexShrink: 0 }}>{getFileIcon(name)}</div>
                  <div style={{ minWidth: 0 }}>
                    <div
                      onClick={() => onDownloadFile && onDownloadFile(file)}
                      style={{
                        fontSize: '0.84rem',
                        fontWeight: '700',
                        color: '#c60016',
                        cursor: 'pointer',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                      }}
                      title={name}
                    >
                      {name}
                    </div>
                    <div style={{ fontSize: '0.72rem', color: '#64748b', marginTop: '0.15rem' }}>
                      {size} &bull; Uploaded by <strong style={{ color: '#1e293b' }}>{uploaderName}</strong>{uploaderMail ? ` (${uploaderMail})` : ''} on {dateStr}
                    </div>
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                  {onDownloadFile && (
                    <button
                      type="button"
                      onClick={() => onDownloadFile(file)}
                      style={{
                        padding: '0.35rem 0.65rem',
                        borderRadius: '6px',
                        border: '1px solid #cbd5e1',
                        backgroundColor: '#ffffff',
                        color: '#475569',
                        fontSize: '0.74rem',
                        cursor: 'pointer',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '0.3rem',
                        fontWeight: '600',
                      }}
                    >
                      <FaDownload style={{ fontSize: '0.65rem' }} />
                      <span>Download</span>
                    </button>
                  )}
                  {onDeleteFile && (
                    <button
                      type="button"
                      onClick={() => onDeleteFile(file.id || file.legacyId || file._id)}
                      style={{
                        padding: '0.35rem 0.5rem',
                        borderRadius: '6px',
                        border: '1px solid #fecaca',
                        backgroundColor: '#fef2f2',
                        color: '#ef4444',
                        fontSize: '0.74rem',
                        cursor: 'pointer',
                      }}
                      title="Delete attachment"
                    >
                      <FaTrash style={{ fontSize: '0.7rem' }} />
                    </button>
                  )}
                </div>
              </div>
            )
          })
        )}
      </div>
    </div>
  )
}
