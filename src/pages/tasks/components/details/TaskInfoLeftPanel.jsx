import React, { useState, useEffect, useRef, useMemo } from 'react'
import {
  FaRegCircle,
  FaCheckCircle,
  FaCalendarAlt,
  FaSyncAlt,
  FaFolder,
  FaChevronLeft,
  FaChevronRight,
  FaCheck,
  FaBriefcase,
  FaBuilding,
  FaSearch,
  FaHandshake,
  FaFileInvoice,
  FaTimes,
  FaEdit,
} from 'react-icons/fa'
import { useNavigate } from 'react-router-dom'
import taskApi from '../../../../services/taskApi'
import TaskHeaderMeta from './TaskHeaderMeta'
import TaskAssigneePills from './TaskAssigneePills'
import TaskSubtasksSection from './TaskSubtasksSection'
import TaskAttachmentsMiniList from './TaskAttachmentsMiniList'
import TaskChecklistSection from './TaskChecklistSection'

export default function TaskInfoLeftPanel({
  task = {},
  availableUsers = [],
  onUpdateTaskField,
  onAddAssignee,
  onRemoveAssignee,
  onAddSubtask,
  onToggleSubtask,
  onDeleteSubtask,
  attachments = [],
  onUploadFile,
  onDeleteFile,
  onDownloadFile,
  isUploadingFile = false,
  onAddChecklistItem,
  onToggleChecklistItem,
  onDeleteChecklistItem,
  onPrevTask,
  onNextTask,
  onSubmitSave,
  isSaving = false,
  isAdmin = false,
}) {
  const navigate = useNavigate()
  const [isEditingTitle, setIsEditingTitle] = useState(false)
  const [titleValue, setTitleValue] = useState(task.title || '')
  const [descValue, setDescValue] = useState(task.description || '')

  const [showDatePicker, setShowDatePicker] = useState(false)
  const [editStartDate, setEditStartDate] = useState(() => (task.startDate ? String(task.startDate).slice(0, 10) : '2026-10-14'))
  const [editDueDate, setEditDueDate] = useState(() => (task.dueDate ? String(task.dueDate).slice(0, 10) : ''))

  useEffect(() => {
    if (task.startDate) setEditStartDate(String(task.startDate).slice(0, 10))
    if (task.dueDate) setEditDueDate(String(task.dueDate).slice(0, 10))
  }, [task.startDate, task.dueDate])

  useEffect(() => {
    setTitleValue(task.title || '')
    setDescValue(task.description || '')
  }, [task.id, task.legacyId, task._id, task.title, task.description])

  const [showCrmModal, setShowCrmModal] = useState(false)
  const [crmLinks, setCrmLinks] = useState({ accounts: [], deals: [], quotations: [] })
  const [activeDropdownField, setActiveDropdownField] = useState(null)
  const [dropdownSearch, setDropdownSearch] = useState('')
  const dropdownRef = useRef(null)

  useEffect(() => {
    if (showCrmModal && crmLinks.accounts.length === 0) {
      taskApi
        .getCrmWorkflowLinks()
        .then((data) => {
          if (data) {
            setCrmLinks({
              accounts: data.accounts || [],
              deals: data.deals || [],
              quotations: data.quotations || [],
              taskLinks: data.taskLinks || [],
            })
          }
        })
        .catch(() => {})
    }
  }, [showCrmModal, crmLinks.accounts.length])

  // Pre-indexed lookup HashMaps for O(1) instant cross-referencing between CRM records
  const lookupMaps = useMemo(() => {
    const accById = new Map()
    const accByNum = new Map()
    const dealByAccId = new Map()
    const dealById = new Map()
    const dealByNum = new Map()
    const quoteByDealId = new Map()
    const quoteByAccId = new Map()
    const quoteById = new Map()
    const quoteByNum = new Map()

    ;(crmLinks.accounts || []).forEach((a) => {
      const id = String(a.id || a.legacyId || '')
      const num = String(a.accountNumber || a.accountNo || id || '')
      if (id) accById.set(id, a)
      if (num) accByNum.set(num.toLowerCase(), a)
    })

    ;(crmLinks.deals || []).forEach((d) => {
      const id = String(d.id || d.legacyId || '')
      const num = String(d.dealNumber || id || '')
      const accId = String(d.accountId || '')
      if (id) dealById.set(id, d)
      if (num) dealByNum.set(num.toLowerCase(), d)
      if (accId) dealByAccId.set(accId, d)
    })

    ;(crmLinks.quotations || []).forEach((q) => {
      const id = String(q.id || q.legacyId || '')
      const num = String(q.quotationNumber || q.quoteNumber || id || '')
      const dId = String(q.dealId || '')
      const aId = String(q.accountId || '')
      if (id) quoteById.set(id, q)
      if (num) quoteByNum.set(num.toLowerCase(), q)
      if (dId) quoteByDealId.set(dId, q)
      if (aId) quoteByAccId.set(aId, q)
    })

    ;(crmLinks.taskLinks || []).forEach((tl) => {
      if (tl.dealId && tl.accountId && !dealByAccId.has(tl.accountId)) {
        dealByAccId.set(tl.accountId, {
          id: tl.projectId,
          dealNumber: tl.dealId,
          dealName: tl.dealName,
          accountId: tl.accountId,
          accountName: tl.accountName,
        })
      }
      if (tl.quotationNumber && tl.dealId && !quoteByDealId.has(tl.dealId)) {
        quoteByDealId.set(tl.dealId, {
          quotationNumber: tl.quotationNumber,
          dealId: tl.dealId,
          accountId: tl.accountId,
          title: tl.dealName || tl.accountName,
        })
      }
    })

    return {
      accById,
      accByNum,
      dealByAccId,
      dealById,
      dealByNum,
      quoteByDealId,
      quoteByAccId,
      quoteById,
      quoteByNum,
    }
  }, [crmLinks])

  // Cross-fill handlers for real-time multi-field synchronization
  const handleSelectDeal = (deal) => {
    const updates = {
      projectId: deal.id,
      projectName: deal.dealName,
      dealId: deal.dealNumber || deal.id,
      dealName: deal.dealName,
    }

    // 1. Cross-fill Account (Lead)
    const accId = String(deal.accountId || '')
    const matchingAcc = lookupMaps.accById.get(accId)
      || lookupMaps.accByNum.get(accId.toLowerCase())
      || (crmLinks.accounts || []).find((a) => String(a.id) === accId || String(a.accountNumber) === accId)

    if (matchingAcc) {
      updates.accountId = matchingAcc.accountNumber || matchingAcc.id
      updates.accountName = matchingAcc.accountName
    } else if (deal.accountName) {
      updates.accountId = deal.accountId || 'acc_linked'
      updates.accountName = deal.accountName
    }

    // 2. Cross-fill Quotation
    const dIdStr = String(deal.id)
    const dNumStr = String(deal.dealNumber || '')
    const matchingQuote = lookupMaps.quoteByDealId.get(dIdStr)
      || lookupMaps.quoteByDealId.get(dNumStr)
      || (crmLinks.quotations || []).find((q) => String(q.dealId) === dIdStr || String(q.dealId) === dNumStr)

    if (matchingQuote) {
      updates.quotationId = matchingQuote.quotationNumber || matchingQuote.id
      updates.quotationNumber = matchingQuote.quotationNumber
    }

    onUpdateTaskField(updates)
    setActiveDropdownField(null)
    setDropdownSearch('')
  }

  const handleSelectAccount = (acc) => {
    const accId = String(acc.id || acc.legacyId || acc.accountNumber || '')
    const accNum = acc.accountNumber || acc.accountNo || accId
    const updates = {
      accountId: accNum,
      accountName: acc.accountName,
    }

    // 1. Cross-fill Deal / Project
    const matchingDeal = lookupMaps.dealByAccId.get(accId)
      || lookupMaps.dealByAccId.get(String(accNum))
      || (crmLinks.deals || []).find((d) => String(d.accountId) === accId || String(d.accountId) === String(accNum))

    if (matchingDeal) {
      updates.projectId = matchingDeal.id
      updates.projectName = matchingDeal.dealName
      updates.dealId = matchingDeal.dealNumber || matchingDeal.id
      updates.dealName = matchingDeal.dealName

      // Cross-fill Quotation for this deal
      const matchingQuote = lookupMaps.quoteByDealId.get(String(matchingDeal.id))
        || lookupMaps.quoteByDealId.get(String(matchingDeal.dealNumber || ''))
        || lookupMaps.quoteByAccId.get(accId)
        || (crmLinks.quotations || []).find((q) => String(q.dealId) === String(matchingDeal.id) || String(q.accountId) === accId)

      if (matchingQuote) {
        updates.quotationId = matchingQuote.quotationNumber || matchingQuote.id
        updates.quotationNumber = matchingQuote.quotationNumber
      }
    } else {
      const matchingQuote = lookupMaps.quoteByAccId.get(accId)
        || (crmLinks.quotations || []).find((q) => String(q.accountId) === accId)
      if (matchingQuote) {
        updates.quotationId = matchingQuote.quotationNumber || matchingQuote.id
        updates.quotationNumber = matchingQuote.quotationNumber
      }
    }

    onUpdateTaskField(updates)
    setActiveDropdownField(null)
    setDropdownSearch('')
  }

  const handleSelectQuotation = (quote) => {
    const updates = {
      quotationId: quote.quotationNumber || quote.id,
      quotationNumber: quote.quotationNumber,
    }

    // 1. Cross-fill Deal / Project
    const dIdStr = String(quote.dealId || '')
    const matchingDeal = lookupMaps.dealById.get(dIdStr)
      || lookupMaps.dealByNum.get(dIdStr.toLowerCase())
      || (crmLinks.deals || []).find((d) => String(d.id) === dIdStr || String(d.dealNumber) === dIdStr)

    if (matchingDeal) {
      updates.projectId = matchingDeal.id
      updates.projectName = matchingDeal.dealName
      updates.dealId = matchingDeal.dealNumber || matchingDeal.id
      updates.dealName = matchingDeal.dealName

      const accId = String(matchingDeal.accountId || quote.accountId || '')
      const matchingAcc = lookupMaps.accById.get(accId)
        || lookupMaps.accByNum.get(accId.toLowerCase())
        || (crmLinks.accounts || []).find((a) => String(a.id) === accId || String(a.accountNumber) === accId)

      if (matchingAcc) {
        updates.accountId = matchingAcc.accountNumber || matchingAcc.id
        updates.accountName = matchingAcc.accountName
      } else if (matchingDeal.accountName || quote.accountName) {
        updates.accountId = accId || 'acc_linked'
        updates.accountName = matchingDeal.accountName || quote.accountName
      }
    } else if (quote.accountId) {
      const accId = String(quote.accountId)
      const matchingAcc = lookupMaps.accById.get(accId)
        || lookupMaps.accByNum.get(accId.toLowerCase())
        || (crmLinks.accounts || []).find((a) => String(a.id) === accId || String(a.accountNumber) === accId)

      if (matchingAcc) {
        updates.accountId = matchingAcc.accountNumber || matchingAcc.id
        updates.accountName = matchingAcc.accountName
      } else if (quote.accountName) {
        updates.accountId = accId
        updates.accountName = quote.accountName
      }
    }

    onUpdateTaskField(updates)
    setActiveDropdownField(null)
    setDropdownSearch('')
  }

  useEffect(() => {
    const handleOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setActiveDropdownField(null)
      }
    }
    document.addEventListener('mousedown', handleOutside)
    return () => document.removeEventListener('mousedown', handleOutside)
  }, [])

  const handleTitleBlur = () => {
    setIsEditingTitle(false)
    if (titleValue.trim() && titleValue !== task.title) {
      onUpdateTaskField('title', titleValue.trim())
    }
  }

  const handleDescBlur = () => {
    if (descValue !== task.description) {
      onUpdateTaskField('description', descValue)
    }
  }

  const toggleTaskCompletion = () => {
    const isCompleted = task.status === 'completed'
    onUpdateTaskField('status', isCompleted ? 'open' : 'completed')
  }

  // Format Dates
  const startDateStr = task.startDate
    ? new Date(task.startDate).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: '2-digit' })
    : '14 Dec\'21'
  const dueDateStr = task.dueDate
    ? new Date(task.dueDate).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: '2-digit' })
    : '18 Dec\'21'
  const dateRangeLabel = `${startDateStr} - ${dueDateStr}`

  const isCompleted = task.status === 'completed'

  const resolveCreatorName = (taskItem, usersList = []) => {
    if (!taskItem) return 'Admin'
    if (taskItem.createdByName && isNaN(taskItem.createdByName) && !taskItem.createdByName.includes('@')) {
      return taskItem.createdByName
    }
    const raw = String(taskItem.createdBy || taskItem.createdByName || taskItem.createdByEmail || '').trim()
    if (!raw) return 'Admin'

    const matched = (usersList || []).find((u) => {
      const uId = String(u.legacyId || u.id || u._id || '')
      const uEmail = String(u.email || '').toLowerCase().trim()
      const uUsername = String(u.username || '').toLowerCase().trim()
      const target = raw.toLowerCase()
      return uId === raw || uEmail === target || uUsername === target
    })

    if (matched) {
      return matched.name || `${matched.firstName || ''} ${matched.lastName || ''}`.trim() || matched.username || matched.email
    }

    if (raw.includes('@')) {
      const prefix = raw.split('@')[0]
      return prefix.charAt(0).toUpperCase() + prefix.slice(1)
    }

    return taskItem.createdByName || raw
  }

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        backgroundColor: '#ffffff',
      }}
    >
      {/* Header Meta */}
      <TaskHeaderMeta
        task={task}
        creatorName={resolveCreatorName(task, availableUsers)}
        progress={typeof task.progress === 'number' ? task.progress : 0}
        status={task.status || 'open'}
        priority={task.priority || 'medium'}
        onUpdateStatus={(st) => onUpdateTaskField('status', st)}
        onCopyLink={() => {
          navigator.clipboard?.writeText(window.location.href)
        }}
      />

      {/* Scrollable Content */}
      <div
        style={{
          flex: 1,
          overflowY: 'auto',
          padding: '1.25rem 1.5rem',
          display: 'flex',
          flexDirection: 'column',
          gap: '1.25rem',
        }}
      >
        {/* Title Row with Completion Circle */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
          <button
            type="button"
            onClick={toggleTaskCompletion}
            style={{
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              padding: 0,
              display: 'flex',
              alignItems: 'center',
              fontSize: '1.25rem',
              color: isCompleted ? '#10b981' : '#cbd5e1',
              flexShrink: 0,
            }}
            title={isCompleted ? 'Mark Pending' : 'Mark Completed'}
          >
            {isCompleted ? <FaCheckCircle /> : <FaRegCircle />}
          </button>

          <input
            type="text"
            value={titleValue}
            onChange={(e) => setTitleValue(e.target.value)}
            onBlur={handleTitleBlur}
            onKeyDown={(e) => e.key === 'Enter' && e.currentTarget.blur()}
            placeholder="Enter Task Name..."
            style={{
              width: '100%',
              border: 'none',
              outline: 'none',
              fontSize: '1.15rem',
              fontWeight: '800',
              color: isCompleted ? '#64748b' : '#0f172a',
              textDecoration: isCompleted ? 'line-through' : 'none',
              backgroundColor: 'transparent',
            }}
          />
        </div>

        {/* CRM Linked Records Badges & Searchable Dropdown Selector */}
        <div style={{ position: 'relative', display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
          {task.projectId ? (
            <button
              type="button"
              onClick={() => setShowCrmModal(!showCrmModal)}
              title="Click to change linked Project, Deal, or Account"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.35rem',
                padding: '3px 9px',
                borderRadius: '6px',
                backgroundColor: '#fff1f2',
                color: '#c60016',
                fontSize: '0.74rem',
                fontWeight: '700',
                border: '1px solid #fecdd3',
                cursor: 'pointer',
              }}
            >
              <FaFolder style={{ fontSize: '0.7rem' }} />
              <span>Project {task.projectId}</span>
            </button>
          ) : (
            <button
              type="button"
              onClick={() => setShowCrmModal(!showCrmModal)}
              title="Click to link CRM Project, Deal, or Account"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.35rem',
                padding: '3px 9px',
                borderRadius: '6px',
                backgroundColor: '#f1f5f9',
                color: '#64748b',
                fontSize: '0.74rem',
                fontWeight: '700',
                border: '1px solid #e2e8f0',
                cursor: 'pointer',
              }}
            >
              <FaFolder style={{ fontSize: '0.7rem' }} />
              <span>General Task</span>
            </button>
          )}

          {task.dealId && (
            <button
              type="button"
              onClick={() => setShowCrmModal(!showCrmModal)}
              title="Click to change linked Project, Deal, or Account"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.35rem',
                padding: '3px 9px',
                borderRadius: '6px',
                backgroundColor: '#fef3c7',
                color: '#b45309',
                fontSize: '0.74rem',
                fontWeight: '700',
                border: '1px solid #fde68a',
                cursor: 'pointer',
              }}
            >
              <FaBriefcase style={{ fontSize: '0.7rem' }} />
              <span>Deal {task.dealId}</span>
            </button>
          )}

          {task.accountId && (
            <button
              type="button"
              onClick={() => setShowCrmModal(!showCrmModal)}
              title="Click to change linked Project, Deal, or Account"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.35rem',
                padding: '3px 9px',
                borderRadius: '6px',
                backgroundColor: '#faf5ff',
                color: '#7c3aed',
                fontSize: '0.74rem',
                fontWeight: '700',
                border: '1px solid #ede9fe',
                cursor: 'pointer',
              }}
            >
              <FaBuilding style={{ fontSize: '0.7rem' }} />
              <span>Account {task.accountId}</span>
            </button>
          )}

          {/* Edit CRM Links Trigger Button */}
          <button
            type="button"
            onClick={() => setShowCrmModal(!showCrmModal)}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.25rem',
              padding: '3px 7px',
              borderRadius: '6px',
              border: '1px dashed #cbd5e1',
              backgroundColor: '#ffffff',
              color: '#64748b',
              fontSize: '0.7rem',
              fontWeight: '600',
              cursor: 'pointer',
            }}
            title="Edit CRM Links"
          >
            <FaEdit style={{ fontSize: '0.65rem' }} />
            <span>Link CRM</span>
          </button>

          {/* Searchable Dropdowns Selector Popup matching AddTaskPage */}
          {showCrmModal && (
            <div
              style={{
                position: 'absolute',
                top: 'calc(100% + 8px)',
                left: 0,
                right: 0,
                backgroundColor: '#ffffff',
                border: '1.5px solid #cbd5e1',
                borderRadius: '12px',
                boxShadow: '0 12px 32px rgba(0,0,0,0.16)',
                padding: '1rem',
                zIndex: 200,
                display: 'flex',
                flexDirection: 'column',
                gap: '0.85rem',
                minWidth: '320px',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid #f1f5f9', paddingBottom: '0.5rem' }}>
                <span style={{ fontSize: '0.82rem', fontWeight: '800', color: '#0f172a' }}>
                  Link CRM Records
                </span>
                <button
                  type="button"
                  onClick={() => setShowCrmModal(false)}
                  style={{ border: 'none', background: 'none', cursor: 'pointer', color: '#94a3b8', padding: '2px' }}
                >
                  <FaTimes style={{ fontSize: '0.8rem' }} />
                </button>
              </div>

              {/* 1. Project Name */}
              <div style={{ position: 'relative' }} ref={activeDropdownField === 'project' ? dropdownRef : null}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', fontSize: '0.74rem', fontWeight: '700', color: '#475569', marginBottom: '0.25rem' }}>
                  <FaHandshake style={{ color: '#c60016' }} /> Project Name
                </label>
                <input
                  type="text"
                  value={task.projectName || task.dealName || (task.projectId ? `Project ${task.projectId}` : '')}
                  onClick={() => {
                    setActiveDropdownField('project')
                    setDropdownSearch('')
                  }}
                  readOnly
                  placeholder="Click to select Project Name"
                  style={{
                    width: '100%',
                    padding: '0.5rem 0.65rem',
                    borderRadius: '8px',
                    border: activeDropdownField === 'project' ? '1.5px solid #c60016' : '1.5px solid #cbd5e1',
                    fontSize: '0.8rem',
                    background: '#ffffff',
                    boxSizing: 'border-box',
                    cursor: 'pointer',
                    fontWeight: task.projectId ? '700' : '400',
                    color: task.projectId ? '#1e293b' : '#64748b',
                  }}
                />

                {activeDropdownField === 'project' && (
                  <div
                    style={{
                      position: 'absolute',
                      top: 'calc(100% + 4px)',
                      left: 0,
                      right: 0,
                      background: '#ffffff',
                      borderRadius: '10px',
                      boxShadow: '0 10px 28px rgba(0, 0, 0, 0.15)',
                      border: '1.5px solid #cbd5e1',
                      zIndex: 1000,
                      display: 'flex',
                      flexDirection: 'column',
                      maxHeight: '240px',
                      overflow: 'hidden',
                    }}
                  >
                    <div style={{ padding: '0.45rem 0.65rem', borderBottom: '1px solid #e2e8f0', background: '#f8fafc', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                      <FaSearch style={{ color: '#c60016', fontSize: '0.75rem', flexShrink: 0 }} />
                      <input
                        type="text"
                        value={dropdownSearch}
                        onChange={(e) => setDropdownSearch(e.target.value)}
                        placeholder="Search Project / Deal Name..."
                        autoFocus
                        style={{ flex: 1, border: 'none', background: 'transparent', fontSize: '0.8rem', outline: 'none' }}
                      />
                    </div>
                    <div style={{ overflowY: 'auto', maxHeight: '200px', padding: '0.3rem' }}>
                      {(crmLinks.deals || [])
                        .filter((d) => !dropdownSearch.trim() || String(d.dealName || '').toLowerCase().includes(dropdownSearch.toLowerCase()) || String(d.dealNumber || '').toLowerCase().includes(dropdownSearch.toLowerCase()))
                        .map((deal) => (
                          <div
                            key={deal.id}
                            onClick={() => handleSelectDeal(deal)}
                            style={{
                              padding: '0.45rem 0.6rem',
                              borderRadius: '6px',
                              cursor: 'pointer',
                              fontSize: '0.78rem',
                              borderBottom: '1px solid #f1f5f9',
                            }}
                            onMouseEnter={(e) => { e.currentTarget.style.background = '#fff1f2' }}
                            onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent' }}
                          >
                            <span style={{ fontWeight: '700', color: '#c60016', marginRight: '0.35rem' }}>[{deal.dealNumber || deal.id}]</span>
                            <span style={{ fontWeight: '600', color: '#1e293b' }}>{deal.dealName}</span>
                          </div>
                        ))}
                    </div>
                  </div>
                )}
              </div>

              {/* 2. Account (Lead) ID / Name */}
              <div style={{ position: 'relative' }} ref={activeDropdownField === 'account' ? dropdownRef : null}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', fontSize: '0.74rem', fontWeight: '700', color: '#475569', marginBottom: '0.25rem' }}>
                  <FaBuilding style={{ color: '#7c3aed' }} /> Account (Lead) ID / Name
                </label>
                <input
                  type="text"
                  value={task.accountName || (task.accountId ? `Account ${task.accountId}` : '')}
                  onClick={() => {
                    setActiveDropdownField('account')
                    setDropdownSearch('')
                  }}
                  readOnly
                  placeholder="Click to select Account"
                  style={{
                    width: '100%',
                    padding: '0.5rem 0.65rem',
                    borderRadius: '8px',
                    border: activeDropdownField === 'account' ? '1.5px solid #7c3aed' : '1.5px solid #cbd5e1',
                    fontSize: '0.8rem',
                    background: '#ffffff',
                    boxSizing: 'border-box',
                    cursor: 'pointer',
                    fontWeight: task.accountId ? '700' : '400',
                    color: task.accountId ? '#1e293b' : '#64748b',
                  }}
                />

                {activeDropdownField === 'account' && (
                  <div
                    style={{
                      position: 'absolute',
                      top: 'calc(100% + 4px)',
                      left: 0,
                      right: 0,
                      background: '#ffffff',
                      borderRadius: '10px',
                      boxShadow: '0 10px 28px rgba(0, 0, 0, 0.15)',
                      border: '1.5px solid #cbd5e1',
                      zIndex: 1000,
                      display: 'flex',
                      flexDirection: 'column',
                      maxHeight: '240px',
                      overflow: 'hidden',
                    }}
                  >
                    <div style={{ padding: '0.45rem 0.65rem', borderBottom: '1px solid #e2e8f0', background: '#f8fafc', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                      <FaSearch style={{ color: '#7c3aed', fontSize: '0.75rem', flexShrink: 0 }} />
                      <input
                        type="text"
                        value={dropdownSearch}
                        onChange={(e) => setDropdownSearch(e.target.value)}
                        placeholder="Search Account / Lead..."
                        autoFocus
                        style={{ flex: 1, border: 'none', background: 'transparent', fontSize: '0.8rem', outline: 'none' }}
                      />
                    </div>
                    <div style={{ overflowY: 'auto', maxHeight: '200px', padding: '0.3rem' }}>
                      {(crmLinks.accounts || [])
                        .filter((a) => !dropdownSearch.trim() || String(a.accountName || '').toLowerCase().includes(dropdownSearch.toLowerCase()) || String(a.accountNumber || '').toLowerCase().includes(dropdownSearch.toLowerCase()))
                        .map((acc) => (
                          <div
                            key={acc.id || acc.accountNumber}
                            onClick={() => handleSelectAccount(acc)}
                            style={{
                              padding: '0.45rem 0.6rem',
                              borderRadius: '6px',
                              cursor: 'pointer',
                              fontSize: '0.78rem',
                              borderBottom: '1px solid #f1f5f9',
                            }}
                            onMouseEnter={(e) => { e.currentTarget.style.background = '#faf5ff' }}
                            onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent' }}
                          >
                            <span style={{ fontWeight: '700', color: '#7c3aed', marginRight: '0.35rem' }}>[{acc.accountNumber || acc.id}]</span>
                            <span style={{ fontWeight: '600', color: '#1e293b' }}>{acc.accountName}</span>
                          </div>
                        ))}
                    </div>
                  </div>
                )}
              </div>

              {/* 3. Quotation No. */}
              <div style={{ position: 'relative' }} ref={activeDropdownField === 'quotation' ? dropdownRef : null}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', fontSize: '0.74rem', fontWeight: '700', color: '#475569', marginBottom: '0.25rem' }}>
                  <FaFileInvoice style={{ color: '#c60016' }} /> Quotation No.
                </label>
                <input
                  type="text"
                  value={task.quotationNumber || task.quotationId || ''}
                  onClick={() => {
                    setActiveDropdownField('quotation')
                    setDropdownSearch('')
                  }}
                  readOnly
                  placeholder="Click to select Quotation"
                  style={{
                    width: '100%',
                    padding: '0.5rem 0.65rem',
                    borderRadius: '8px',
                    border: activeDropdownField === 'quotation' ? '1.5px solid #c60016' : '1.5px solid #cbd5e1',
                    fontSize: '0.8rem',
                    background: '#ffffff',
                    boxSizing: 'border-box',
                    cursor: 'pointer',
                    fontWeight: (task.quotationNumber || task.quotationId) ? '700' : '400',
                    color: (task.quotationNumber || task.quotationId) ? '#1e293b' : '#64748b',
                  }}
                />

                {activeDropdownField === 'quotation' && (
                  <div
                    style={{
                      position: 'absolute',
                      top: 'calc(100% + 4px)',
                      left: 0,
                      right: 0,
                      background: '#ffffff',
                      borderRadius: '10px',
                      boxShadow: '0 10px 28px rgba(0, 0, 0, 0.15)',
                      border: '1.5px solid #cbd5e1',
                      zIndex: 1000,
                      display: 'flex',
                      flexDirection: 'column',
                      maxHeight: '240px',
                      overflow: 'hidden',
                    }}
                  >
                    <div style={{ padding: '0.45rem 0.65rem', borderBottom: '1px solid #e2e8f0', background: '#f8fafc', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                      <FaSearch style={{ color: '#c60016', fontSize: '0.75rem', flexShrink: 0 }} />
                      <input
                        type="text"
                        value={dropdownSearch}
                        onChange={(e) => setDropdownSearch(e.target.value)}
                        placeholder="Search Quotation Number..."
                        autoFocus
                        style={{ flex: 1, border: 'none', background: 'transparent', fontSize: '0.8rem', outline: 'none' }}
                      />
                    </div>
                    <div style={{ overflowY: 'auto', maxHeight: '200px', padding: '0.3rem' }}>
                      {(crmLinks.quotations || [])
                        .filter((q) => !dropdownSearch.trim() || String(q.quotationNumber || '').toLowerCase().includes(dropdownSearch.toLowerCase()) || String(q.title || '').toLowerCase().includes(dropdownSearch.toLowerCase()))
                        .map((quote) => (
                          <div
                            key={quote.id || quote.quotationNumber}
                            onClick={() => handleSelectQuotation(quote)}
                            style={{
                              padding: '0.45rem 0.6rem',
                              borderRadius: '6px',
                              cursor: 'pointer',
                              fontSize: '0.78rem',
                              borderBottom: '1px solid #f1f5f9',
                            }}
                            onMouseEnter={(e) => { e.currentTarget.style.background = '#fff1f2' }}
                            onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent' }}
                          >
                            <span style={{ fontWeight: '700', color: '#c60016', marginRight: '0.35rem' }}>[{quote.quotationNumber}]</span>
                            <span style={{ fontWeight: '600', color: '#1e293b' }}>{quote.title || 'Quotation'}</span>
                          </div>
                        ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Description Box */}
        <div>
          <textarea
            rows={3}
            value={descValue}
            onChange={(e) => setDescValue(e.target.value)}
            onBlur={handleDescBlur}
            placeholder="The user interface (UI) is a critical part of any software product..."
            style={{
              width: '100%',
              border: '1px solid #e2e8f0',
              borderRadius: '10px',
              padding: '0.75rem 0.9rem',
              fontSize: '0.84rem',
              color: '#334155',
              backgroundColor: '#fafbfc',
              outline: 'none',
              resize: 'vertical',
              lineHeight: '1.5',
              fontFamily: 'inherit',
            }}
          />
        </div>

        {/* Dates & Recurrence */}
        <div style={{ position: 'relative', display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap', fontSize: '0.76rem', color: '#475569' }}>
          <div
            onClick={() => setShowDatePicker(!showDatePicker)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.4rem',
              cursor: 'pointer',
              padding: '3px 8px',
              borderRadius: '6px',
              backgroundColor: showDatePicker ? '#fff1f2' : 'transparent',
              border: showDatePicker ? '1px solid #fecdd3' : '1px solid transparent',
              transition: 'all 0.15s ease',
            }}
            title="Click calendar icon to update Start Date and Target Due Date"
          >
            <FaCalendarAlt style={{ color: '#c60016' }} />
            <span style={{ fontWeight: '600' }}>{dateRangeLabel}</span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', color: '#c60016' }}>
            <FaSyncAlt style={{ fontSize: '0.7rem' }} />
            <span style={{ fontWeight: '600' }}>Yearly</span>
          </div>

          {/* Interactive Date Editor Popover */}
          {showDatePicker && (
            <div
              style={{
                position: 'absolute',
                top: 'calc(100% + 6px)',
                left: 0,
                backgroundColor: '#ffffff',
                border: '1px solid #e2e8f0',
                borderRadius: '10px',
                boxShadow: '0 10px 25px rgba(0,0,0,0.12)',
                padding: '0.85rem',
                zIndex: 100,
                width: '260px',
                display: 'flex',
                flexDirection: 'column',
                gap: '0.65rem',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid #f1f5f9', paddingBottom: '0.35rem' }}>
                <span style={{ fontSize: '0.76rem', fontWeight: '800', color: '#1e293b' }}>Update Task Dates</span>
                <button
                  type="button"
                  onClick={() => setShowDatePicker(false)}
                  style={{ border: 'none', background: 'none', cursor: 'pointer', color: '#94a3b8', padding: '2px' }}
                >
                  <FaTimes style={{ fontSize: '0.75rem' }} />
                </button>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.7rem', fontWeight: '700', color: '#475569', marginBottom: '2px' }}>
                  Start Date
                </label>
                <input
                  type="date"
                  value={editStartDate}
                  onChange={(e) => setEditStartDate(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '0.35rem 0.5rem',
                    borderRadius: '6px',
                    border: '1px solid #cbd5e1',
                    fontSize: '0.78rem',
                    boxSizing: 'border-box',
                  }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.7rem', fontWeight: '700', color: '#475569', marginBottom: '2px' }}>
                  Target Due Date
                </label>
                <input
                  type="date"
                  value={editDueDate}
                  onChange={(e) => setEditDueDate(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '0.35rem 0.5rem',
                    borderRadius: '6px',
                    border: '1px solid #cbd5e1',
                    fontSize: '0.78rem',
                    boxSizing: 'border-box',
                  }}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.4rem', marginTop: '0.2rem' }}>
                <button
                  type="button"
                  onClick={() => setShowDatePicker(false)}
                  style={{ padding: '3px 8px', fontSize: '0.72rem', border: 'none', background: 'none', color: '#64748b', cursor: 'pointer' }}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={() => {
                    const dateUpdates = {}
                    if (editStartDate) dateUpdates.startDate = editStartDate
                    if (editDueDate) dateUpdates.dueDate = editDueDate
                    if (Object.keys(dateUpdates).length > 0) {
                      onUpdateTaskField(dateUpdates)
                    }
                    setShowDatePicker(false)
                  }}
                  style={{
                    padding: '4px 10px',
                    fontSize: '0.74rem',
                    fontWeight: '700',
                    backgroundColor: '#c60016',
                    color: '#ffffff',
                    border: 'none',
                    borderRadius: '6px',
                    cursor: 'pointer',
                  }}
                >
                  Update
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Assigned Team Members */}
        <TaskAssigneePills
          assignees={
            Array.isArray(task.assignedToUserEmails) && task.assignedToUserEmails.length > 0
              ? task.assignedToUserEmails
              : (task.assignedTo ? [task.assignedTo] : [])
          }
          availableUsers={availableUsers}
          onAddAssignee={onAddAssignee}
          onRemoveAssignee={onRemoveAssignee}
        />

        {/* Subtasks Section */}
        <TaskSubtasksSection
          subtasks={Array.isArray(task.subtasks) ? task.subtasks : []}
          availableUsers={availableUsers}
          onAddSubtask={onAddSubtask}
          onToggleSubtask={onToggleSubtask}
          onDeleteSubtask={onDeleteSubtask}
        />

        {/* Attachments Section */}
        <TaskAttachmentsMiniList
          attachments={attachments}
          onUploadFile={onUploadFile}
          onDeleteFile={onDeleteFile}
          onDownloadFile={onDownloadFile}
          isUploading={isUploadingFile}
        />

        {/* Checklist Section */}
        <TaskChecklistSection
          checklist={Array.isArray(task.checklist) ? task.checklist : []}
          groupTitle="Client Subscription"
          isMandatory={true}
          onAddItem={onAddChecklistItem}
          onToggleItem={onToggleChecklistItem}
          onDeleteItem={onDeleteChecklistItem}
        />
      </div>

      {/* Footer Navigation & Submit Bar */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '0.85rem 1.5rem',
          borderTop: '1px solid #e2e8f0',
          backgroundColor: '#ffffff',
          position: 'sticky',
          bottom: 0,
          zIndex: 5,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
          <button
            type="button"
            onClick={onPrevTask}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.35rem',
              background: 'none',
              border: 'none',
              fontSize: '0.8rem',
              fontWeight: '700',
              color: '#64748b',
              cursor: 'pointer',
            }}
          >
            <FaChevronLeft style={{ fontSize: '0.65rem' }} />
            <span>Prev</span>
          </button>
          <button
            type="button"
            onClick={onNextTask}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.35rem',
              background: 'none',
              border: 'none',
              fontSize: '0.8rem',
              fontWeight: '700',
              color: '#c60016',
              cursor: 'pointer',
            }}
          >
            <span>Next</span>
            <FaChevronRight style={{ fontSize: '0.65rem' }} />
          </button>
        </div>

        <button
          type="button"
          onClick={onSubmitSave}
          disabled={isSaving}
          style={{
            padding: '0.5rem 1.4rem',
            borderRadius: '8px',
            border: 'none',
            backgroundColor: '#c60016',
            color: '#ffffff',
            fontSize: '0.84rem',
            fontWeight: '700',
            cursor: isSaving ? 'not-allowed' : 'pointer',
            boxShadow: '0 2px 6px rgba(198, 0, 22, 0.25)',
          }}
        >
          {isSaving ? 'Saving...' : 'Submit'}
        </button>
      </div>
    </div>
  )
}
