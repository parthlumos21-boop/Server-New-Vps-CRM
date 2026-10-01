import React, { useState, useEffect, useMemo } from 'react'
import {
  FaComments,
  FaSearch,
  FaFilter,
  FaPhoneAlt,
  FaUser,
  FaBuilding,
  FaCalendarAlt,
  FaTag,
  FaPaperPlane,
} from 'react-icons/fa'
import Modal from '../../components/common/Modal'
import Badge from '../../components/common/Badge'
import { remarkApi } from '../../services/remarkApi'
import { leadApi } from '../../services/leadApi'
import { dealApi } from '../../services/dealApi'
import { useAuth } from '../../context/AuthContext'
import { useData } from '../../context/DataContext'
import { formatDate } from '../../utils/helpers'
import './CommunicationActivitiesPage.css'

const CATEGORY_OPTIONS = [
  { value: 'all', label: 'All Categories' },
  { value: 'call-log', label: 'Call Log' },
  { value: 'general', label: 'General' },
  { value: 'feedback', label: 'Feedback' },
  { value: 'demo', label: 'Demo' },
]

const ENTITY_OPTIONS = [
  { value: 'all', label: 'All Types' },
  { value: 'account', label: 'Account' },
  { value: 'deal', label: 'Deal' },
]

const CommunicationActivitiesPage = ({ isAdmin = false }) => {
  const { user } = useAuth()
  const { addNotification } = useData()
  const [remarks, setRemarks] = useState([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedCategory, setSelectedCategory] = useState('all')
  const [selectedEntityType, setSelectedEntityType] = useState('all')
  const [selectedRemark, setSelectedRemark] = useState(null)
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false)
  const [threadRemarks, setThreadRemarks] = useState([])
  const [replyContent, setReplyContent] = useState('')
  const [postingReply, setPostingReply] = useState(false)

  const [currentPage, setCurrentPage] = useState(1)
  const pageSize = 10

  const loadData = async () => {
    setLoading(true)
    try {
      const allRemarks = await remarkApi.getAllRemarks()
      const [leadsData, dealsData] = await Promise.all([
        leadApi.getLeads().catch(() => []),
        dealApi.getDeals().catch(() => []),
      ])

      const leadsList = Array.isArray(leadsData) ? leadsData : Array.isArray(leadsData?.data) ? leadsData.data : []
      const dealsList = Array.isArray(dealsData) ? dealsData : Array.isArray(dealsData?.data) ? dealsData.data : []

      const leadMap = new Map(leadsList.map((l) => [String(l.id || l._id), l]))
      const dealMap = new Map(dealsList.map((d) => [String(d.id || d._id), d]))

      const enriched = (Array.isArray(allRemarks) ? allRemarks : []).map((rem) => {
        let recordOwnerName = ''
        let accountName = rem.accountName || ''
        let dealName = rem.dealName || ''
        let accountNo = rem.accountNo || ''

        if (rem.accountId && leadMap.has(String(rem.accountId))) {
          const acc = leadMap.get(String(rem.accountId))
          accountName = accountName || acc.accountName || acc.name || ''
          recordOwnerName = acc.accountOwner || acc.ownerName || ''
          accountNo = acc.accountNumber || acc.accountNo || ''
        }

        if (rem.dealId && dealMap.has(String(rem.dealId))) {
          const dl = dealMap.get(String(rem.dealId))
          dealName = dealName || dl.dealName || dl.name || ''
          recordOwnerName = recordOwnerName || dl.dealOwner || dl.ownerName || ''
        }

        return {
          ...rem,
          accountName,
          dealName,
          recordOwnerName,
          accountNo,
        }
      })

      setRemarks(enriched)
    } catch (err) {
      console.error('Failed to load communication activities:', err)
      addNotification('error', 'Error Loading Data', 'Failed to load communication activities.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [])

  useEffect(() => {
    setCurrentPage(1)
  }, [searchTerm, selectedCategory, selectedEntityType])

  const filteredRemarks = useMemo(() => {
    const list = remarks.filter((rem) => {
      const matchesCategory = selectedCategory === 'all' || rem.category === selectedCategory
      const matchesEntity = selectedEntityType === 'all' || rem.relatedEntityType === selectedEntityType
      const targetText = `${rem.content || ''} ${rem.accountName || ''} ${rem.dealName || ''} ${rem.recordOwnerName || ''} ${rem.createdByName || ''}`.toLowerCase()
      const matchesSearch = !searchTerm || targetText.includes(searchTerm.toLowerCase())
      return matchesCategory && matchesEntity && matchesSearch
    })

    // Sort strictly LIFO (newest record first)
    return [...list].sort((a, b) => {
      const timeA = new Date(a.createdAt || a.remarkDate || 0).getTime()
      const timeB = new Date(b.createdAt || b.remarkDate || 0).getTime()
      if (timeA !== timeB) return timeB - timeA
      return (b.id || b._id || 0) > (a.id || a._id || 0) ? 1 : -1
    })
  }, [remarks, selectedCategory, selectedEntityType, searchTerm])

  const totalPages = Math.ceil(filteredRemarks.length / pageSize) || 1

  const paginatedRemarks = useMemo(() => {
    const start = (currentPage - 1) * pageSize
    return filteredRemarks.slice(start, start + pageSize)
  }, [filteredRemarks, currentPage, pageSize])

  const handleRowClick = (remark) => {
    setSelectedRemark(remark)
    const thread = remarks.filter((r) => {
      if (remark.dealId) return String(r.dealId) === String(remark.dealId)
      if (remark.accountId) return String(r.accountId) === String(remark.accountId)
      return false
    }).sort((a, b) => new Date(a.createdAt || 0) - new Date(b.createdAt || 0))

    setThreadRemarks(thread)
    setIsDetailModalOpen(true)
  }

  const handleSendReply = async (e) => {
    e.preventDefault()
    if (!replyContent.trim() || !selectedRemark) return

    setPostingReply(true)
    try {
      const payload = {
        accountId: selectedRemark.accountId || null,
        dealId: selectedRemark.dealId || null,
        relatedEntityId: String(selectedRemark.dealId || selectedRemark.accountId || ''),
        relatedEntityType: selectedRemark.relatedEntityType || (selectedRemark.dealId ? 'deal' : 'account'),
        category: selectedRemark.category || 'general',
        content: replyContent.trim(),
        createdBy: user?.id || null,
        createdByName: user?.name || user?.username || 'User',
      }

      const created = await remarkApi.createRemark(payload)
      const newEntry = {
        ...created,
        accountName: selectedRemark.accountName,
        dealName: selectedRemark.dealName,
        recordOwnerName: selectedRemark.recordOwnerName,
      }

      setRemarks((prev) => [newEntry, ...prev])
      setThreadRemarks((prev) => [...prev, newEntry])
      setReplyContent('')
      addNotification('success', 'Reply Added', 'Reply posted successfully.')
    } catch (err) {
      console.error('Failed to post reply:', err)
      addNotification('error', 'Error Posting Reply', 'Unable to send reply.')
    } finally {
      setPostingReply(false)
    }
  }

  return (
    <div className="comm-activities-page">
      <div className="comm-activities-shell">
        {/* Header Banner */}
        <div className="comm-activities-header">
          <div>
            <h1 className="comm-activities-title">
              <FaComments className="comm-activities-title-icon" /> Communication Activities
            </h1>
            <p className="comm-activities-subtitle">
              Track and monitor all client remarks, call logs, feedback, and discussion threads across accounts and deals.
            </p>
          </div>
        </div>

        {/* Filter Toolbar */}
        <div className="comm-activities-toolbar">
          <div className="comm-activities-search-wrap">
            <FaSearch className="comm-activities-search-icon" />
            <input
              type="text"
              placeholder="Search activities, names, content, or owners..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="comm-activities-search-input"
            />
          </div>

          <div className="comm-activities-filter-group">
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="comm-activities-select"
            >
              {CATEGORY_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
          </div>

          <div className="comm-activities-filter-group">
            <select
              value={selectedEntityType}
              onChange={(e) => setSelectedEntityType(e.target.value)}
              className="comm-activities-select"
            >
              {ENTITY_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Main Table */}
        <div className="comm-activities-table-card">
          {loading ? (
            <div style={{ padding: '40px', textAlign: 'center', color: '#64748b' }}>Loading communication activities...</div>
          ) : filteredRemarks.length === 0 ? (
            <div style={{ padding: '40px', textAlign: 'center', color: '#475569', fontWeight: 500 }}>No communication activities found</div>
          ) : (
            <>
              <div className="comm-activities-table-responsive">
                <table className="comm-activities-table">
                  <thead>
                    <tr className="comm-activities-thead-tr">
                      <th style={{ padding: '14px 16px', width: '40px', background: '#c60016', color: '#ffffff' }}></th>
                      <th style={{ padding: '14px 16px', background: '#c60016', color: '#ffffff' }}>Type</th>
                      <th style={{ padding: '14px 16px', background: '#c60016', color: '#ffffff' }}>Name</th>
                      <th style={{ padding: '14px 16px', background: '#c60016', color: '#ffffff' }}>Category</th>
                      <th style={{ padding: '14px 16px', background: '#c60016', color: '#ffffff' }}>Remark / Note</th>
                      <th style={{ padding: '14px 16px', background: '#c60016', color: '#ffffff' }}>Record Owner</th>
                      <th style={{ padding: '14px 16px', background: '#c60016', color: '#ffffff' }}>Activity By</th>
                      <th style={{ padding: '14px 16px', background: '#c60016', color: '#ffffff' }}>Start Time</th>
                      <th style={{ padding: '14px 16px', background: '#c60016', color: '#ffffff' }}>End Time</th>
                      <th style={{ padding: '14px 16px', background: '#c60016', color: '#ffffff' }}>Date & Time</th>
                    </tr>
                  </thead>
                  <tbody>
                    {paginatedRemarks.map((rem, idx) => {
                      const isDeal = rem.relatedEntityType === 'deal' || Boolean(rem.dealId)
                      const recordName = rem.dealName || rem.accountName || 'Record'
                      const ownerName = rem.recordOwnerName || rem.accountOwnerName || rem.dealOwnerName || '-'
                      const rowBg = idx % 2 === 0 ? '#ffffff' : '#f8fafc'

                      return (
                        <tr
                          key={rem.id || rem._id || idx}
                          style={{ background: rowBg, borderBottom: '1px solid #e2e8f0', cursor: 'pointer', transition: 'background-color 0.15s' }}
                          onClick={() => handleRowClick(rem)}
                          onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = '#f1f5f9' }}
                          onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = rowBg }}
                        >
                          <td style={{ padding: '12px 16px', textAlign: 'center' }}>
                            {rem.category === 'call-log' ? (
                              <FaPhoneAlt style={{ color: '#0284c7' }} />
                            ) : (
                              <FaComments style={{ color: '#2563eb' }} />
                            )}
                          </td>
                          <td style={{ padding: '12px 16px' }}>
                            <Badge variant={isDeal ? 'info' : 'success'}>
                              {isDeal ? 'Deal' : 'Account'}
                            </Badge>
                          </td>
                          <td style={{ padding: '12px 16px', fontWeight: 600, color: '#0f172a' }}>
                            {recordName}
                          </td>
                          <td style={{ padding: '12px 16px' }}>
                            <span style={{
                              padding: '3px 8px',
                              borderRadius: '4px',
                              background: rem.category === 'call-log' ? '#fef3c7' : '#e2e8f0',
                              color: rem.category === 'call-log' ? '#92400e' : '#1e293b',
                              fontSize: '12px',
                              fontWeight: 600,
                              textTransform: 'capitalize',
                            }}>
                              {rem.category || 'general'}
                            </span>
                          </td>
                          <td style={{ padding: '12px 16px', color: '#1e293b', maxWidth: '320px', fontWeight: 500 }}>
                            <div>{rem.content || '-'}</div>
                          </td>
                          <td style={{ padding: '12px 16px', color: '#334155', fontWeight: 500 }}>
                            {ownerName}
                          </td>
                          <td style={{ padding: '12px 16px', color: '#334155', fontWeight: 500 }}>
                            {rem.createdByName || rem.authorName || 'User'}
                          </td>
                          <td style={{ padding: '12px 16px', color: '#475569', fontWeight: 500, whiteSpace: 'nowrap' }}>
                            {rem.startTime || (rem.category === 'call-log' ? (rem.callLogTime || '-') : '-')}
                          </td>
                          <td style={{ padding: '12px 16px', color: '#475569', fontWeight: 500, whiteSpace: 'nowrap' }}>
                            {rem.endTime || '-'}
                          </td>
                          <td style={{ padding: '12px 16px', color: '#475569', whiteSpace: 'nowrap', fontWeight: 500 }}>
                            {rem.remarkDate ? formatDate(rem.remarkDate, 'long') : (rem.createdAt ? formatDate(rem.createdAt, 'long') : '-')}
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>

              {/* Pagination Controls (First, 1, 2, 3..., Last) */}
              <div style={{
                display: 'flex',
                alignItems: 'center',
                justify: 'space-between',
                padding: '12px 20px',
                borderTop: '1px solid #e2e8f0',
                background: '#ffffff',
                flexWrap: 'wrap',
                gap: '10px'
              }}>
                <div style={{ fontSize: '13px', color: '#64748b', fontWeight: 500 }}>
                  Showing <strong>{Math.min((currentPage - 1) * pageSize + 1, filteredRemarks.length)}</strong> to <strong>{Math.min(currentPage * pageSize, filteredRemarks.length)}</strong> of <strong>{filteredRemarks.length}</strong> records
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <button
                    type="button"
                    onClick={() => setCurrentPage(1)}
                    disabled={currentPage === 1}
                    style={{
                      padding: '6px 14px',
                      borderRadius: '6px',
                      border: '1px solid #cbd5e1',
                      background: currentPage === 1 ? '#f1f5f9' : '#ffffff',
                      color: currentPage === 1 ? '#94a3b8' : '#740a03',
                      fontWeight: 700,
                      fontSize: '13px',
                      cursor: currentPage === 1 ? 'not-allowed' : 'pointer',
                    }}
                  >
                    First
                  </button>

                  {Array.from({ length: totalPages }, (_, i) => i + 1).map((pageNum) => (
                    <button
                      key={pageNum}
                      type="button"
                      onClick={() => setCurrentPage(pageNum)}
                      style={{
                        padding: '6px 12px',
                        borderRadius: '6px',
                        border: pageNum === currentPage ? '1px solid #740a03' : '1px solid #cbd5e1',
                        background: pageNum === currentPage ? '#740a03' : '#ffffff',
                        color: pageNum === currentPage ? '#ffffff' : '#0f172a',
                        fontWeight: pageNum === currentPage ? 800 : 600,
                        fontSize: '13px',
                        cursor: 'pointer',
                      }}
                    >
                      {pageNum}
                    </button>
                  ))}

                  <button
                    type="button"
                    onClick={() => setCurrentPage(totalPages)}
                    disabled={currentPage === totalPages}
                    style={{
                      padding: '6px 14px',
                      borderRadius: '6px',
                      border: '1px solid #cbd5e1',
                      background: currentPage === totalPages ? '#f1f5f9' : '#ffffff',
                      color: currentPage === totalPages ? '#94a3b8' : '#740a03',
                      fontWeight: 700,
                      fontSize: '13px',
                      cursor: currentPage === totalPages ? 'not-allowed' : 'pointer',
                    }}
                  >
                    Last
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Row Click Detail & Chat Replies Modal */}
      {selectedRemark && (
        <Modal
          isOpen={isDetailModalOpen}
          onClose={() => setIsDetailModalOpen(false)}
          title={`Communication Detail - ${selectedRemark.dealName || selectedRemark.accountName || 'Record'}`}
          size="large"
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', maxHeight: '75vh', overflowY: 'auto', paddingRight: '4px' }}>
            {/* Top Section: Account / Deal Details Header Card */}
            <div style={{ background: '#f8fafc', padding: '18px', borderRadius: '8px', border: '1px solid #cbd5e1' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <Badge variant={selectedRemark.relatedEntityType === 'deal' ? 'info' : 'success'}>
                    {selectedRemark.relatedEntityType === 'deal' ? 'Deal Details' : 'Account Details'}
                  </Badge>
                  <h3 style={{ margin: 0, fontSize: '18px', color: '#0f172a' }}>
                    {selectedRemark.dealName || selectedRemark.accountName || 'Record Details'}
                  </h3>
                </div>
                <span style={{ fontSize: '13px', background: '#e2e8f0', padding: '4px 10px', borderRadius: '12px', fontWeight: 600, color: '#334155', textTransform: 'capitalize' }}>
                  Category: {selectedRemark.category || 'general'}
                </span>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '12px', fontSize: '13px', color: '#475569' }}>
                <div>
                  <strong style={{ color: '#1e293b' }}><FaUser style={{ marginRight: '6px', color: '#2563eb' }} />Record Owner:</strong>{' '}
                  {selectedRemark.recordOwnerName || selectedRemark.dealOwnerName || selectedRemark.accountOwnerName || selectedRemark.ownerName || '-'}
                </div>
                <div>
                  <strong style={{ color: '#1e293b' }}><FaBuilding style={{ marginRight: '6px', color: '#16a34a' }} />Created By:</strong>{' '}
                  {selectedRemark.createdByName || 'User'}
                </div>
                <div>
                  <strong style={{ color: '#1e293b' }}><FaCalendarAlt style={{ marginRight: '6px', color: '#eab308' }} />Created Date:</strong>{' '}
                  {selectedRemark.createdAt ? formatDate(selectedRemark.createdAt) : '-'}
                </div>
                {selectedRemark.accountNo && (
                  <div>
                    <strong style={{ color: '#1e293b' }}><FaTag style={{ marginRight: '6px', color: '#9333ea' }} />Account No:</strong>{' '}
                    {selectedRemark.accountNo}
                  </div>
                )}
              </div>
            </div>

            {/* Bottom Section: Chat Replies & Discussion Thread */}
            <div style={{ background: '#ffffff', borderRadius: '8px', border: '1px solid #e2e8f0', padding: '18px' }}>
              <h4 style={{ margin: '0 0 16px 0', display: 'flex', alignItems: 'center', gap: '8px', fontSize: '15px', color: '#1e293b' }}>
                <FaComments style={{ color: '#2563eb' }} /> Remarks & Chat Discussion Replies ({threadRemarks.length})
              </h4>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '20px', maxHeight: '300px', overflowY: 'auto', paddingRight: '6px' }}>
                {threadRemarks.map((item, idx) => (
                  <div
                    key={item.id || idx}
                    style={{
                      background: item.id === selectedRemark.id ? '#eff6ff' : '#f8fafc',
                      border: item.id === selectedRemark.id ? '1px solid #93c5fd' : '1px solid #e2e8f0',
                      padding: '12px 16px',
                      borderRadius: '12px',
                      boxShadow: '0 1px 3px rgba(0, 0, 0, 0.04)',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px', borderBottom: '1px solid #e2e8f0', paddingBottom: '6px' }}>
                      <span style={{ fontWeight: 700, fontSize: '13.5px', color: '#0f172a', display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <FaUser style={{ color: '#740a03', fontSize: '12px' }} />
                        {item.createdByName || 'Keval V Shah'}
                      </span>
                      <span style={{ fontSize: '12px', color: '#64748b', fontWeight: 500 }}>
                        {item.createdAt ? formatDate(item.createdAt, 'long') : 'Sep 29, 2026'}
                      </span>
                    </div>
                    <div style={{ fontSize: '14px', color: '#1e293b', lineHeight: '1.5', whiteSpace: 'pre-wrap', fontWeight: 500 }}>
                      {item.content}
                    </div>
                    {item.category === 'call-log' && (item.startTime || item.endTime || item.callLogTime) && (
                      <div style={{ fontSize: '12px', color: '#0284c7', marginTop: '8px', fontWeight: 600 }}>
                        Call Duration: {item.startTime || item.callLogTime || '09:00'} - {item.endTime || '09:30'}
                      </div>
                    )}
                  </div>
                ))}
              </div>

              {/* Chat Reply Form */}
              <form onSubmit={handleSendReply} style={{ display: 'flex', gap: '10px' }}>
                <input
                  type="text"
                  placeholder="Type a reply regarding this remark..."
                  value={replyContent}
                  onChange={(e) => setReplyContent(e.target.value)}
                  disabled={postingReply}
                  style={{
                    flex: 1,
                    padding: '10px 14px',
                    borderRadius: '6px',
                    border: '1px solid #cbd5e1',
                    fontSize: '14px',
                    outline: 'none',
                  }}
                />
                <button
                  type="submit"
                  disabled={postingReply || !replyContent.trim()}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '6px',
                    padding: '10px 18px',
                    borderRadius: '6px',
                    border: 'none',
                    background: postingReply || !replyContent.trim() ? '#94a3b8' : '#740a03',
                    color: '#ffffff',
                    fontWeight: 600,
                    fontSize: '14px',
                    cursor: postingReply || !replyContent.trim() ? 'not-allowed' : 'pointer',
                  }}
                >
                  <FaPaperPlane /> {postingReply ? 'Sending...' : 'Reply'}
                </button>
              </form>
            </div>
          </div>
        </Modal>
      )}
    </div>
  )
}

export default CommunicationActivitiesPage
