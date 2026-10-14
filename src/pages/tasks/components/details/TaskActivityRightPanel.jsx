import React, { useState } from 'react'
import { FaSearch, FaChevronDown, FaCheckDouble } from 'react-icons/fa'
import TaskCommentsTab from './TaskCommentsTab'
import TaskAttachmentsTab from './TaskAttachmentsTab'
import TaskActivityTimelineTab from './TaskActivityTimelineTab'
import TaskTimeLogTab from './TaskTimeLogTab'

export default function TaskActivityRightPanel({
  activeTab = 'activity',
  setActiveTab,
  comments = [],
  onAddComment,
  onEditComment,
  onDeleteComment,
  attachments = [],
  onUploadFile,
  onDeleteFile,
  onDownloadFile,
  activities = [],
  timeEntries = [],
  onAddTimeEntry,
  readersData = { readers: [], readCount: 0, totalCount: 8 },
  currentUser = {},
  isPostingComment = false,
  isUploadingFile = false,
  isLoggingTime = false,
}) {
  const [searchFilter, setSearchFilter] = useState('')
  const [showReadersPopover, setShowReadersPopover] = useState(false)

  const tabs = [
    { key: 'comment', label: 'Comment' },
    { key: 'attachment', label: 'Attachment' },
    { key: 'activity', label: 'Log Activity' },
    { key: 'timelog', label: 'Time Log' },
  ]

  const readers = Array.isArray(readersData?.readers) ? readersData.readers : []
  const readCount = readersData?.readCount || readers.length || 0
  const totalCount = readersData?.totalCount || 8

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        backgroundColor: '#ffffff',
      }}
    >
      {/* Top Tab Bar */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          borderBottom: '1px solid #e2e8f0',
          padding: '0 1.5rem',
          backgroundColor: '#ffffff',
          position: 'sticky',
          top: 0,
          zIndex: 10,
        }}
      >
        <div style={{ display: 'flex', gap: '1rem' }}>
          {tabs.map((t) => {
            const isActive = activeTab === t.key
            return (
              <button
                key={t.key}
                type="button"
                onClick={() => setActiveTab(t.key)}
                style={{
                  padding: '0.95rem 0.65rem',
                  fontSize: '0.84rem',
                  fontWeight: isActive ? '700' : '600',
                  color: isActive ? '#c60016' : '#64748b',
                  border: 'none',
                  borderBottom: isActive ? '2.5px solid #c60016' : '2.5px solid transparent',
                  backgroundColor: 'transparent',
                  cursor: 'pointer',
                  transition: 'color 0.15s',
                  outline: 'none',
                }}
              >
                {t.label}
              </button>
            )
          })}
        </div>
      </div>

      {/* Search & "Read by" Toolbar */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '0.65rem 1.5rem',
          borderBottom: '1px solid #f1f5f9',
          gap: '1rem',
          backgroundColor: '#fafbfc',
          position: 'relative',
        }}
      >
        {/* Search input */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            backgroundColor: '#ffffff',
            border: '1px solid #e2e8f0',
            borderRadius: '8px',
            padding: '4px 10px',
            width: '260px',
          }}
        >
          <FaSearch style={{ color: '#94a3b8', fontSize: '0.72rem' }} />
          <input
            type="text"
            placeholder="Type here to Search"
            value={searchFilter}
            onChange={(e) => setSearchFilter(e.target.value)}
            style={{
              border: 'none',
              outline: 'none',
              fontSize: '0.76rem',
              color: '#1e293b',
              width: '100%',
              backgroundColor: 'transparent',
            }}
          />
        </div>

        {/* Read By Popover Trigger */}
        <div style={{ position: 'relative' }}>
          <button
            type="button"
            onClick={() => setShowReadersPopover(!showReadersPopover)}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.35rem',
              background: 'none',
              border: 'none',
              fontSize: '0.74rem',
              fontWeight: '700',
              color: '#475569',
              cursor: 'pointer',
              padding: '4px 6px',
              borderRadius: '6px',
            }}
          >
            <span>Read by: ({readCount}/{totalCount})</span>
            <FaChevronDown style={{ fontSize: '0.6rem', color: '#94a3b8' }} />
          </button>

          {showReadersPopover && (
            <div
              style={{
                position: 'absolute',
                top: '100%',
                right: 0,
                marginTop: '6px',
                width: '230px',
                backgroundColor: '#ffffff',
                border: '1px solid #e2e8f0',
                borderRadius: '12px',
                boxShadow: '0 12px 28px rgba(0, 0, 0, 0.15)',
                zIndex: 60,
                padding: '0.75rem',
              }}
            >
              <div
                style={{
                  fontSize: '0.72rem',
                  fontWeight: '800',
                  color: '#64748b',
                  marginBottom: '0.5rem',
                  textTransform: 'uppercase',
                }}
              >
                Viewed by Team Members
              </div>

              <div
                style={{
                  maxHeight: '220px',
                  overflowY: 'auto',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '0.5rem',
                }}
              >
                {readers.length === 0 ? (
                  <div style={{ fontSize: '0.74rem', color: '#94a3b8', fontStyle: 'italic', padding: '0.25rem 0' }}>
                    No views recorded yet.
                  </div>
                ) : (
                  readers.map((r, i) => {
                    const name = r.userName || (r.userEmail ? r.userEmail.split('@')[0] : 'Team Member')
                    const initials = name
                      .split(' ')
                      .map((n) => n[0])
                      .join('')
                      .slice(0, 2)
                      .toUpperCase()
                    const timeStr = r.readAt
                      ? new Date(r.readAt).toLocaleDateString('en-GB', {
                          day: 'numeric',
                          month: 'short',
                          hour: '2-digit',
                          minute: '2-digit',
                        })
                      : 'Recently'

                    return (
                      <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <div
                          style={{
                            width: '24px',
                            height: '24px',
                            borderRadius: '50%',
                            backgroundColor: '#e2e8f0',
                            color: '#334155',
                            fontSize: '0.62rem',
                            fontWeight: '800',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            flexShrink: 0,
                          }}
                        >
                          {initials}
                        </div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontSize: '0.76rem', fontWeight: '700', color: '#1e293b', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                            {name}
                          </div>
                          <div style={{ fontSize: '0.65rem', color: '#94a3b8' }}>
                            {timeStr}
                          </div>
                        </div>
                      </div>
                    )
                  })
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Tab Body */}
      <div style={{ flex: 1, overflowY: 'auto' }}>
        {activeTab === 'comment' && (
          <TaskCommentsTab
            comments={comments}
            onAddComment={onAddComment}
            onEditComment={onEditComment}
            onDeleteComment={onDeleteComment}
            currentUser={currentUser}
            isPosting={isPostingComment}
          />
        )}

        {activeTab === 'attachment' && (
          <TaskAttachmentsTab
            attachments={attachments}
            onUploadFile={onUploadFile}
            onDeleteFile={onDeleteFile}
            onDownloadFile={onDownloadFile}
            isUploading={isUploadingFile}
          />
        )}

        {activeTab === 'activity' && (
          <TaskActivityTimelineTab
            activities={activities}
            searchFilter={searchFilter}
          />
        )}

        {activeTab === 'timelog' && (
          <TaskTimeLogTab
            timeEntries={timeEntries}
            onAddTimeEntry={onAddTimeEntry}
            isLogging={isLoggingTime}
          />
        )}
      </div>
    </div>
  )
}
