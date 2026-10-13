import React, { useState } from 'react'
import { FaPaperPlane } from 'react-icons/fa'

export default function TaskCommentsTab({
  comments = [],
  onAddComment,
  currentUser = {},
  isPosting = false,
}) {
  const [commentText, setCommentText] = useState('')

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

            return (
              <div
                key={cm.id || idx}
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
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      marginBottom: '0.35rem',
                      gap: '0.5rem',
                      flexWrap: 'wrap',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.4rem' }}>
                      <span style={{ fontSize: '0.82rem', fontWeight: '800', color: '#1e293b' }}>
                        {author}
                      </span>
                      {cm.userEmail && (
                        <span style={{ fontSize: '0.7rem', color: '#64748b' }}>
                          &lt;{cm.userEmail}&gt;
                        </span>
                      )}
                    </div>
                    <span style={{ fontSize: '0.7rem', color: '#94a3b8' }}>
                      {dateStr}
                    </span>
                  </div>
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
              backgroundColor: commentText.trim() ? '#2563eb' : '#94a3b8',
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
            <span>{isPosting ? 'Posting...' : 'Save Comment'}</span>
          </button>
        </div>
      </form>
    </div>
  )
}
