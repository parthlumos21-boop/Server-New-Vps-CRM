import React, { useState } from 'react'
import { FaPaperPlane, FaEdit, FaTrash, FaCheck, FaTimes } from 'react-icons/fa'

export default function TaskCommentsTab({
  comments = [],
  onAddComment,
  onEditComment,
  onDeleteComment,
  currentUser = {},
  isPosting = false,
}) {
  const [commentText, setCommentText] = useState('')
  const [editingId, setEditingId] = useState(null)
  const [editText, setEditText] = useState('')
  const [isUpdating, setIsUpdating] = useState(false)

  const handleSubmit = (e) => {
    if (e) e.preventDefault()
    const trimmed = String(commentText || '').trim()
    if (!trimmed || isPosting) return
    onAddComment(trimmed)
    setCommentText('')
  }

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
      handleSubmit(e)
    }
  }

  const startEdit = (cm) => {
    setEditingId(cm.id || cm._id)
    setEditText(cm.comment || '')
  }

  const cancelEdit = () => {
    setEditingId(null)
    setEditText('')
  }

  const saveEdit = async (commentId) => {
    const trimmed = String(editText || '').trim()
    if (!trimmed || !onEditComment) return
    setIsUpdating(true)
    try {
      await onEditComment(commentId, trimmed)
      setEditingId(null)
      setEditText('')
    } finally {
      setIsUpdating(false)
    }
  }

  const handleDelete = (commentId) => {
    if (!window.confirm('Are you sure you want to delete this comment?')) return
    if (onDeleteComment) {
      onDeleteComment(commentId)
    }
  }

  const actorEmail = String(currentUser?.email || '').toLowerCase()
  const actorId = String(currentUser?.id || currentUser?.legacyId || '')
  const isAdmin = ['admin', 'super_admin'].includes((currentUser?.role || '').toLowerCase())

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        justifyContent: 'space-between',
        padding: '1.25rem 1.5rem',
        gap: '1rem',
      }}
    >
      {/* Comments List Scroll */}
      <div
        style={{
          flex: 1,
          overflowY: 'auto',
          display: 'flex',
          flexDirection: 'column',
          gap: '0.85rem',
          paddingRight: '0.25rem',
        }}
      >
        {comments.length === 0 ? (
          <div
            style={{
              padding: '2.5rem 1rem',
              textAlign: 'center',
              color: '#94a3b8',
              fontSize: '0.84rem',
              fontStyle: 'italic',
            }}
          >
            No comments yet. Be the first to start the discussion on this task.
          </div>
        ) : (
          comments.map((cm, idx) => {
            const commentId = cm.id || cm._id || idx
            const author = cm.userName || (cm.userEmail ? cm.userEmail.split('@')[0] : 'User')
            const initials = author
              .split(' ')
              .map((n) => n[0])
              .join('')
              .slice(0, 2)
              .toUpperCase() || 'U'

            const dateStr = cm.createdAt
              ? new Date(cm.createdAt).toLocaleDateString('en-GB', {
                  day: 'numeric',
                  month: 'short',
                  year: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit',
                })
              : 'Recently'

            const isAuthor =
              (cm.userEmail && String(cm.userEmail).toLowerCase() === actorEmail) ||
              (cm.userId && String(cm.userId) === actorId)
            const canManage = isAuthor || isAdmin
            const isEditingThis = editingId === commentId

            return (
              <div
                key={commentId}
                style={{
                  display: 'flex',
                  gap: '0.75rem',
                  backgroundColor: '#f8fafc',
                  border: '1px solid #f1f5f9',
                  borderRadius: '12px',
                  padding: '0.85rem 1rem',
                }}
              >
                <div
                  style={{
                    width: '32px',
                    height: '32px',
                    borderRadius: '50%',
                    backgroundColor: '#e0f2fe',
                    color: '#0369a1',
                    fontSize: '0.76rem',
                    fontWeight: '800',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                    border: '1px solid #bae6fd',
                  }}
                >
                  {initials}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div
                    style={{
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '0.15rem',
                      marginBottom: '0.45rem',
                      width: '100%',
                    }}
                  >
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        gap: '0.5rem',
                      }}
                    >
                      <span style={{ fontSize: '0.84rem', fontWeight: '800', color: '#0f172a' }}>
                        {author}
                      </span>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        {cm.isEdited && (
                          <span style={{ fontSize: '0.68rem', fontStyle: 'italic', color: '#94a3b8' }}>
                            (edited)
                          </span>
                        )}
                        <span style={{ fontSize: '0.72rem', color: '#94a3b8' }}>
                          {dateStr}
                        </span>
                        {canManage && !isEditingThis && (
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', marginLeft: '0.35rem' }}>
                            <button
                              type="button"
                              onClick={() => startEdit(cm)}
                              title="Edit Comment"
                              style={{
                                border: 'none',
                                background: 'transparent',
                                cursor: 'pointer',
                                color: '#64748b',
                                padding: '2px 4px',
                                fontSize: '0.72rem',
                              }}
                            >
                              <FaEdit />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDelete(commentId)}
                              title="Delete Comment"
                              style={{
                                border: 'none',
                                background: 'transparent',
                                cursor: 'pointer',
                                color: '#dc2626',
                                padding: '2px 4px',
                                fontSize: '0.72rem',
                              }}
                            >
                              <FaTrash />
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                    {cm.userEmail && (
                      <div style={{ fontSize: '0.72rem', color: '#64748b', fontWeight: '500' }}>
                        {cm.userEmail}
                      </div>
                    )}
                  </div>

                  {isEditingThis ? (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginTop: '0.35rem' }}>
                      <textarea
                        rows={2}
                        value={editText}
                        onChange={(e) => setEditText(e.target.value)}
                        style={{
                          width: '100%',
                          padding: '0.45rem',
                          borderRadius: '8px',
                          border: '1px solid #cbd5e1',
                          fontSize: '0.82rem',
                          outline: 'none',
                          boxSizing: 'border-box',
                          fontFamily: 'inherit',
                        }}
                      />
                      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.4rem' }}>
                        <button
                          type="button"
                          onClick={cancelEdit}
                          style={{
                            padding: '3px 8px',
                            borderRadius: '6px',
                            border: '1px solid #cbd5e1',
                            background: '#ffffff',
                            color: '#64748b',
                            fontSize: '0.72rem',
                            cursor: 'pointer',
                          }}
                        >
                          <FaTimes style={{ marginRight: '3px' }} /> Cancel
                        </button>
                        <button
                          type="button"
                          onClick={() => saveEdit(commentId)}
                          disabled={isUpdating || !editText.trim()}
                          style={{
                            padding: '3px 10px',
                            borderRadius: '6px',
                            border: 'none',
                            background: '#c60016',
                            color: '#ffffff',
                            fontSize: '0.72rem',
                            fontWeight: '700',
                            cursor: editText.trim() ? 'pointer' : 'not-allowed',
                          }}
                        >
                          <FaCheck style={{ marginRight: '3px' }} /> {isUpdating ? 'Saving...' : 'Save'}
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div
                      style={{
                        fontSize: '0.84rem',
                        color: '#334155',
                        lineHeight: '1.5',
                        whiteSpace: 'pre-wrap',
                        wordBreak: 'break-word',
                      }}
                    >
                      {cm.comment}
                    </div>
                  )}
                </div>
              </div>
            )
          })
        )}
      </div>

      {/* Composer at Bottom */}
      <form
        onSubmit={handleSubmit}
        style={{
          display: 'flex',
          flexDirection: 'column',
          gap: '0.5rem',
          backgroundColor: '#ffffff',
          borderRadius: '12px',
          border: '1px solid #e2e8f0',
          padding: '0.75rem',
          boxShadow: '0 2px 6px rgba(0,0,0,0.02)',
        }}
      >
        <textarea
          rows={3}
          placeholder="Add a comment... (Ctrl+Enter to post)"
          value={commentText}
          onChange={(e) => setCommentText(e.target.value)}
          onKeyDown={handleKeyDown}
          style={{
            width: '100%',
            border: 'none',
            outline: 'none',
            resize: 'none',
            fontSize: '0.84rem',
            color: '#1e293b',
            fontFamily: 'inherit',
            lineHeight: 1.45,
            backgroundColor: 'transparent',
          }}
        />

        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            borderTop: '1px solid #f1f5f9',
            paddingTop: '0.5rem',
          }}
        >
          <span style={{ fontSize: '0.7rem', color: '#94a3b8' }}>
            Tip: Press <kbd style={{ padding: '1px 4px', border: '1px solid #cbd5e1', borderRadius: '4px' }}>Ctrl</kbd> + <kbd style={{ padding: '1px 4px', border: '1px solid #cbd5e1', borderRadius: '4px' }}>Enter</kbd> to send
          </span>

          <button
            type="submit"
            disabled={!commentText.trim() || isPosting}
            style={{
              padding: '0.45rem 1rem',
              borderRadius: '8px',
              border: 'none',
              backgroundColor: commentText.trim() ? '#c60016' : '#94a3b8',
              color: '#ffffff',
              fontSize: '0.78rem',
              fontWeight: '700',
              cursor: commentText.trim() ? 'pointer' : 'not-allowed',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.4rem',
            }}
          >
            <FaPaperPlane style={{ fontSize: '0.7rem' }} />
            <span>{isPosting ? 'Posting...' : 'Save'}</span>
          </button>
        </div>
      </form>
    </div>
  )
}

