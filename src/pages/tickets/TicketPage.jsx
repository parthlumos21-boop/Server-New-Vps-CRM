import React, { useEffect, useMemo, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { FaChevronLeft, FaPaperPlane } from 'react-icons/fa'
import { useData } from '../../context/DataContext'
import { formatSupportRequestType, formatTicketDateTime } from '../admin/support-requests/SupportRequestShared'
import apiClient from '../../services/apiClient'
import './TicketPage.css'

const normalizeValue = (value) => String(value || '').trim().toLowerCase()
const SUPPORT_EMAILS = ['parth@support.com', 'rushabh@support.com']

const getReplyTimestamp = (reply = {}) => reply.created_at || reply.createdAt || reply.updated_at || reply.updatedAt
const getReplyKey = (reply = {}, index) => {
  const fallbackKey = `${reply.sender_email || reply.senderEmail || 'reply'}-${getReplyTimestamp(reply) || index}`
  return String(reply._id || reply.id || fallbackKey)
}
const formatReplyTimestamp = (reply) => {
  const timestamp = getReplyTimestamp(reply)
  if (!timestamp) return ''
  const date = new Date(timestamp)
  return Number.isNaN(date.getTime()) ? '' : date.toLocaleString()
}

const TicketPage = ({ basePath = '/tickets' }) => {
  const navigate = useNavigate()
  const location = useLocation()
  const { supportRequests, user, refreshSupportRequests } = useData()
  const [activeTab, setActiveTab] = useState('open')
  const [expandedTicketId, setExpandedTicketId] = useState(null)
  const [replyMessage, setReplyMessage] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [repliesCache, setRepliesCache] = useState({})
  const [repliesLoading, setRepliesLoading] = useState({})
  const [repliesError, setRepliesError] = useState({})
  
  const fetchReplies = async (ticketId) => {
    setRepliesLoading((prev) => ({ ...prev, [ticketId]: true }))
    setRepliesError((prev) => ({ ...prev, [ticketId]: '' }))
    try {
      const res = await apiClient.get(`/support-requests/${ticketId}/replies`)
      const replies = Array.isArray(res) ? res : (Array.isArray(res?.data) ? res.data : [])
      setRepliesCache((prev) => ({ ...prev, [ticketId]: replies }))
    } catch (error) {
      console.error('Failed to fetch replies:', error)
      setRepliesError((prev) => ({ ...prev, [ticketId]: 'Could not load replies.' }))
    } finally {
      setRepliesLoading((prev) => ({ ...prev, [ticketId]: false }))
    }
  }

  const sortedTickets = useMemo(() => (
    [...supportRequests].sort((left, right) => (
      new Date(right.updatedAt || right.createdAt || 0).getTime()
      - new Date(left.updatedAt || left.createdAt || 0).getTime()
    ))
  ), [supportRequests])

  const openTickets = useMemo(() => sortedTickets.filter((ticket) => normalizeValue(ticket.status) !== 'closed'), [sortedTickets])
  const closedTickets = useMemo(() => sortedTickets.filter((ticket) => normalizeValue(ticket.status) === 'closed'), [sortedTickets])
  const repliedTickets = useMemo(() => sortedTickets.filter((ticket) => ticket.replyCount > 0 || (ticket.data?.replies || []).length > 0), [sortedTickets])

  let visibleTickets = openTickets
  if (activeTab === 'closed') visibleTickets = closedTickets
  if (activeTab === 'replied') visibleTickets = repliedTickets

  const handleAddReply = async (ticketId) => {
    if (!replyMessage.trim()) return
    try {
      setIsSubmitting(true)
      await apiClient.post(`/support-requests/${ticketId}/reply`, { message: replyMessage })
      setReplyMessage('')
      await fetchReplies(ticketId)
      if (refreshSupportRequests) await refreshSupportRequests()
    } catch (error) {
      console.error('Failed to add reply:', error)
      alert('Failed to add reply.')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleCloseTicket = async (ticketId) => {
    try {
      setIsSubmitting(true)
      await apiClient.post(`/support-requests/${ticketId}/close`)
      if (refreshSupportRequests) await refreshSupportRequests()
      setExpandedTicketId(null)
    } catch (error) {
      console.error('Failed to close ticket:', error)
      alert(error.response?.data?.message || 'Failed to close ticket.')
    } finally {
      setIsSubmitting(false)
    }
  }

  const canCloseTicket = SUPPORT_EMAILS.includes(user?.email)

  useEffect(() => {
    const requestedTab = location.state?.activeTab
    const requestedTicketId = location.state?.expandedTicketId || location.state?.supportRequestId
    if (['open', 'replied', 'closed'].includes(requestedTab)) {
      setActiveTab(requestedTab)
    }
    if (requestedTicketId) {
      setExpandedTicketId(requestedTicketId)
      fetchReplies(requestedTicketId)
    }
  }, [location.state])

  return (
    <div className="ticket-page">
      <div className="ticket-shell">
        <div className="ticket-toolbar">
          <h1 className="ticket-title">
            <FaChevronLeft onClick={() => navigate(-1)} style={{ cursor: 'pointer' }} />
            <span>CRM Support</span>
          </h1>
          <div className="ticket-toolbar-actions">
            <button
              type="button"
              className="ticket-help-btn btn-red-theme"
              onClick={() => navigate(`${basePath}/add`)}
            >
              <FaPaperPlane />
              <span>New CRM Support</span>
            </button>
          </div>
        </div>

        <div className="ticket-tabs">
          <button
            type="button"
            className={`ticket-tab ticket-tab--open${activeTab === 'open' ? ' ticket-tab--active' : ''}`}
            onClick={() => setActiveTab('open')}
          >
            Open ({openTickets.length})
          </button>

          <button
            type="button"
            className={`ticket-tab ticket-tab--replied${activeTab === 'replied' ? ' ticket-tab--active' : ''}`}
            onClick={() => setActiveTab('replied')}
          >
            Replied ({repliedTickets.length})
          </button>

          <button
            type="button"
            className={`ticket-tab ticket-tab--closed${activeTab === 'closed' ? ' ticket-tab--active' : ''}`}
            onClick={() => setActiveTab('closed')}
          >
            Closed ({closedTickets.length})
          </button>
        </div>

        <div className={`ticket-content${visibleTickets.length === 0 ? ' ticket-content--empty' : ''}`}>
          {visibleTickets.length > 0 ? (
            <div className="ticket-record-list">
              {visibleTickets.map((ticket) => {
                const isExpanded = expandedTicketId === ticket.id
                const ticketReplies = repliesCache[ticket.id] || []
                const isLoadingReplies = Boolean(repliesLoading[ticket.id])
                const replyError = repliesError[ticket.id]
                return (
                  <article key={ticket.id} className="ticket-record-card" onClick={(e) => {
                    if (!e.target.closest('button, textarea')) {
                      if (!isExpanded) {
                        setExpandedTicketId(ticket.id)
                        fetchReplies(ticket.id)
                      } else {
                        setExpandedTicketId(null)
                      }
                    }
                  }}>
                    <h2>{ticket.title || ticket.srNumber || 'Untitled CRM Support'}</h2>
                    <p>
                      <span>{ticket.srNumber || '-'}</span>
                      <span>&bull;</span>
                      <span>{formatSupportRequestType(ticket.requestType)}</span>
                      <span>&bull;</span>
                      <span>{formatTicketDateTime(ticket.updatedAt || ticket.createdAt)}</span>
                    </p>
                    
                    {isExpanded && (
                      <div className="ticket-preview">
                        <div className="ticket-description ticket-description-box">
                          <strong>Description:</strong>
                          <p>{ticket.description || 'No description provided.'}</p>
                        </div>
                        
                        {activeTab !== 'closed' && (
                          <div className="ticket-reply-actions">
                            <textarea 
                              className="ticket-reply-textarea"
                              value={replyMessage}
                              onChange={(e) => setReplyMessage(e.target.value)}
                              placeholder="Write a reply..."
                            />
                            <div className="ticket-reply-button-row">
                              <button 
                                type="button"
                                className="ticket-add-reply-btn btn-red-theme"
                                onClick={() => handleAddReply(ticket.id)}
                                disabled={isSubmitting || !replyMessage.trim()}
                              >
                                {isSubmitting ? 'Sending...' : 'Add Reply'}
                              </button>
                              
                              {canCloseTicket && (
                                <button 
                                  type="button"
                                  className="ticket-close-btn"
                                  onClick={() => handleCloseTicket(ticket.id)}
                                  disabled={isSubmitting}
                                >
                                  Close Request
                                </button>
                              )}
                            </div>
                          </div>
                        )}
                        {activeTab === 'closed' && (
                          <div className="ticket-closed-meta">
                            <p><strong>Closed By:</strong> {ticket.data?.closedBy || 'Unknown'}</p>
                            <p><strong>Closed At:</strong> {ticket.data?.closedAt ? new Date(ticket.data.closedAt).toLocaleString() : 'Unknown'}</p>
                          </div>
                        )}

                        <div className="ticket-replies">
                          <div className="ticket-chatbox">
                            <strong>Chat History:</strong>
                            {isLoadingReplies && <p className="ticket-replies-status">Loading replies...</p>}
                            {replyError && <p className="ticket-replies-status ticket-replies-status--error">{replyError}</p>}
                            {!isLoadingReplies && !replyError && ticketReplies.length === 0 && (
                              <p className="ticket-replies-status">No replies yet.</p>
                            )}
                            {ticketReplies.map((reply, i) => {
                              const senderEmail = String(reply.sender_email || reply.senderEmail || reply.createdBy || '')
                              const isSupport = reply.sender_type === 'support_agent' || reply.senderType === 'support_agent' || SUPPORT_EMAILS.includes(senderEmail)
                              const timestampLabel = formatReplyTimestamp(reply)

                              return (
                                <div
                                  key={getReplyKey(reply, i)}
                                  className={`ticket-chat-message${isSupport ? ' ticket-chat-message--support' : ' ticket-chat-message--customer'}`}
                                >
                                  <small className="ticket-chat-message-meta">
                                    <strong>{senderEmail || (isSupport ? 'Support Agent' : 'Customer')}</strong>
                                    {timestampLabel ? ` at ${timestampLabel}` : ''}
                                  </small>
                                  <p>{reply.message}</p>
                                </div>
                              )
                            })}
                          </div>
                        </div>
                      </div>
                    )}
                  </article>
                )
              })}
            </div>
          ) : (
            <div className="ticket-empty-state">
              <p className="ticket-empty-title">No support requests found in this tab.</p>
              <button
                type="button"
                className="ticket-empty-btn btn-red-theme"
                onClick={() => navigate(`${basePath}/add`)}
              >
                Add CRM Support
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default TicketPage
