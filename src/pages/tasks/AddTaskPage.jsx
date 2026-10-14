import React, { useState, useEffect, useMemo, useRef } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import {
  FaTasks,
  FaArrowLeft,
  FaUserCheck,
  FaSearch,
  FaCalendarAlt,
  FaProjectDiagram,
  FaHandshake,
  FaBuilding,
  FaFileInvoice,
  FaTag,
  FaClock,
  FaCheck,
  FaTimes,
} from 'react-icons/fa'
import { useAuth } from '../../context/AuthContext'
import { useData } from '../../context/DataContext'
import { TaskWorkspaceLayout } from './components/common/TaskWorkspaceLayout'
import workManagementService from '../../services/workManagementService'
import { leadApi } from '../../services/leadApi'
import { dealApi } from '../../services/dealApi'
import { quotationApi } from '../../services/quotationApi'
import taskApi from '../../services/taskApi'
import Modal from '../../components/common/Modal'

const PRESET_TAGS = [
  'Electrical',
  'Fabrication',
  'Automation',
  'Site Inspection',
  'Quotation',
  'Client Review',
  'Urgent',
  'Procurement',
]

export const AddTaskPage = () => {
  const { user } = useAuth()
  const { createTask, addNotification } = useData()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()

  const isAdmin = ['admin', 'super_admin'].includes(user?.role)
  const initialProjectId = searchParams.get('projectId') || ''
  const initialStatus = searchParams.get('status') || 'open'

  const [loading, setLoading] = useState(false)
  const [usersList, setUsersList] = useState([])
  const [projectsList, setProjectsList] = useState([])

  // CRM Entity collections for search pickers
  const [dealsList, setDealsList] = useState([])
  const [accountsList, setAccountsList] = useState([])
  const [quotationsList, setQuotationsList] = useState([])

  // Form state
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [status, setStatus] = useState(initialStatus)
  const [priority, setPriority] = useState('medium')
  const [startDate, setStartDate] = useState(new Date().toISOString().slice(0, 10))
  const [dueDate, setDueDate] = useState('')
  const [estimatedHours, setEstimatedHours] = useState(4)
  const [slaPolicy, setSlaPolicy] = useState('standard_24h')
  const [repeatSchedule, setRepeatSchedule] = useState('none')
  const [tags, setTags] = useState([])

  // Subtasks & Checklist State
  const [subtasks, setSubtasks] = useState([])
  const [newSubtaskTitle, setNewSubtaskTitle] = useState('')
  const [newSubtaskStatus, setNewSubtaskStatus] = useState('Assigned')
  const [newSubtaskDueDate, setNewSubtaskDueDate] = useState('')

  const [checklist, setChecklist] = useState([])
  const [newChecklistTitle, setNewChecklistTitle] = useState('')

  // Assignees
  const [selectedUserEmails, setSelectedUserEmails] = useState(
    user?.email ? [user.email.toLowerCase().trim()] : []
  )
  const [userSearchQuery, setUserSearchQuery] = useState('')

  // CRM Links
  const [projectId, setProjectId] = useState(initialProjectId)
  const [dealId, setDealId] = useState('')
  const [dealTitle, setDealTitle] = useState('')
  const [accountId, setAccountId] = useState('')
  const [accountTitle, setAccountTitle] = useState('')
  const [quotationId, setQuotationId] = useState('')
  const [quotationTitle, setQuotationTitle] = useState('')

  // Dropdown Picker state with integrated top search
  const [activeDropdownField, setActiveDropdownField] = useState(null) // 'deal' | 'account' | 'quotation'
  const [dropdownSearch, setDropdownSearch] = useState('')
  const dropdownRef = useRef(null)

  useEffect(() => {
    const handleOutsideClick = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setActiveDropdownField(null)
      }
    }
    document.addEventListener('mousedown', handleOutsideClick)
    return () => document.removeEventListener('mousedown', handleOutsideClick)
  }, [])

  // Load directories and lightweight CRM data
  useEffect(() => {
    const loadAllData = async () => {
      try {
        const [overview, projects, workflowLinks] = await Promise.all([
          workManagementService.getOverview().catch(() => null),
          workManagementService.getProjects().catch(() => []),
          taskApi.getCrmWorkflowLinks().catch(() => null),
        ])

        if (overview?.teamMembers) {
          setUsersList(overview.teamMembers)
        }
        setProjectsList(projects || [])

        if (workflowLinks && workflowLinks.accounts) {
          setAccountsList(workflowLinks.accounts || [])
          setDealsList(workflowLinks.deals || [])
          setQuotationsList(workflowLinks.quotations || [])
        } else {
          // Fallback to standard APIs if needed
          const [leads, deals, quotations] = await Promise.all([
            leadApi.getLeads().catch(() => []),
            dealApi.getDeals().catch(() => []),
            quotationApi.getQuotations().catch(() => []),
          ])
          setAccountsList(Array.isArray(leads) ? leads : (Array.isArray(leads?.data) ? leads.data : []))
          setDealsList(Array.isArray(deals) ? deals : (Array.isArray(deals?.data) ? deals.data : []))
          setQuotationsList(Array.isArray(quotations) ? quotations : (Array.isArray(quotations?.data) ? quotations.data : []))
        }
      } catch (err) {
        console.error('Failed to load CRM data for AddTaskPage', err)
      }
    }
    loadAllData()
  }, [])

  // Filter users based on search
  const filteredUsers = useMemo(() => {
    const q = userSearchQuery.trim().toLowerCase()
    if (!q) return usersList
    return usersList.filter((u) => {
      const name = String(u.name || '').toLowerCase()
      const email = String(u.email || '').toLowerCase()
      return name.includes(q) || email.includes(q)
    })
  }, [usersList, userSearchQuery])

  const toggleUserSelection = (email) => {
    const normalized = String(email || '').trim().toLowerCase()
    if (!normalized) return
    setSelectedUserEmails((prev) =>
      prev.includes(normalized) ? prev.filter((e) => e !== normalized) : [...prev, normalized]
    )
  }

  const toggleTag = (tagName) => {
    setTags((prev) => (prev.includes(tagName) ? prev.filter((t) => t !== tagName) : [...prev, tagName]))
  }

  // Pre-indexed lookup HashMaps for O(1) instant cross-referencing
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

    accountsList.forEach((a) => {
      const id = String(a.id || a.legacyId || '')
      const num = String(a.accountNumber || a.accountNo || id || '')
      if (id) accById.set(id, a)
      if (num) accByNum.set(num.toLowerCase(), a)
    })

    dealsList.forEach((d) => {
      const id = String(d.id || d.legacyId || '')
      const num = String(d.dealNumber || id || '')
      const accId = String(d.accountId || '')
      if (id) dealById.set(id, d)
      if (num) dealByNum.set(num.toLowerCase(), d)
      if (accId) dealByAccId.set(accId, d)
    })

    quotationsList.forEach((q) => {
      const id = String(q.id || q.legacyId || '')
      const num = String(q.quotationNumber || q.quoteNumber || id || '')
      const dId = String(q.dealId || '')
      const aId = String(q.accountId || '')
      if (id) quoteById.set(id, q)
      if (num) quoteByNum.set(num.toLowerCase(), q)
      if (dId) quoteByDealId.set(dId, q)
      if (aId) quoteByAccId.set(aId, q)
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
  }, [accountsList, dealsList, quotationsList])

  // Windowed filtered lists (capped to top 20 for 60 FPS performance)
  const filteredDeals = useMemo(() => {
    const q = dropdownSearch.trim().toLowerCase()
    const list = dealsList.filter((d) => {
      if (!q) return true
      const titleStr = String(d.dealName || d.title || d.name || '').toLowerCase()
      const numStr = String(d.dealNumber || d.id || '').toLowerCase()
      return titleStr.includes(q) || numStr.includes(q)
    })
    return list.slice(0, 20)
  }, [dealsList, dropdownSearch])

  const filteredAccounts = useMemo(() => {
    const q = dropdownSearch.trim().toLowerCase()
    const list = accountsList.filter((a) => {
      if (!q) return true
      const nameStr = String(a.accountName || a.companyName || a.name || '').toLowerCase()
      const numStr = String(a.accountNumber || a.accountNo || a.id || '').toLowerCase()
      return nameStr.includes(q) || numStr.includes(q)
    })
    return list.slice(0, 20)
  }, [accountsList, dropdownSearch])

  const filteredQuotations = useMemo(() => {
    const q = dropdownSearch.trim().toLowerCase()
    const list = quotationsList.filter((qt) => {
      if (!q) return true
      const noStr = String(qt.quotationNumber || qt.quoteNumber || qt.id || '').toLowerCase()
      const titleStr = String(qt.title || qt.customerName || qt.accountName || '').toLowerCase()
      return noStr.includes(q) || titleStr.includes(q)
    })
    return list.slice(0, 20)
  }, [quotationsList, dropdownSearch])

  // Cross-fill handlers
  const handleSelectAccount = (a) => {
    const accId = String(a.id || a.legacyId || a.accountNumber || '')
    const accNum = a.accountNumber || a.accountNo || accId
    const accName = a.accountName || a.companyName || a.name || 'Untitled Account'
    setAccountId(String(accNum || accId))
    setAccountTitle(`[${accNum}] ${accName}`)

    // Cross-fill deal in O(1)
    const matchingDeal = lookupMaps.dealByAccId.get(accId)
      || lookupMaps.dealByAccId.get(String(a.accountNumber || ''))
      || dealsList.find((d) => String(d.accountId) === accId || String(d.accountId) === String(accNum))

    if (matchingDeal) {
      const dNum = matchingDeal.dealNumber || `DL${matchingDeal.id}`
      const dTitle = matchingDeal.dealName || matchingDeal.title || matchingDeal.name || 'Untitled Deal'
      setDealId(String(dNum || matchingDeal.id))
      setDealTitle(`[${dNum}] ${dTitle}`)

      // Cross-fill quotation in O(1)
      const matchingQuote = lookupMaps.quoteByDealId.get(String(matchingDeal.id))
        || lookupMaps.quoteByDealId.get(String(dNum))
        || lookupMaps.quoteByAccId.get(accId)
        || quotationsList.find((q) => String(q.dealId) === String(matchingDeal.id) || String(q.accountId) === accId)

      if (matchingQuote) {
        const qNum = matchingQuote.quotationNumber || matchingQuote.quoteNumber || `QT-${matchingQuote.id}`
        const qTitle = matchingQuote.title || matchingQuote.customerName || dTitle || accName
        setQuotationId(String(qNum))
        setQuotationTitle(`[${qNum}] ${qTitle}`)
      }
    } else {
      const matchingQuote = lookupMaps.quoteByAccId.get(accId)
        || quotationsList.find((q) => String(q.accountId) === accId)
      if (matchingQuote) {
        const qNum = matchingQuote.quotationNumber || matchingQuote.quoteNumber || `QT-${matchingQuote.id}`
        const qTitle = matchingQuote.title || matchingQuote.customerName || accName
        setQuotationId(String(qNum))
        setQuotationTitle(`[${qNum}] ${qTitle}`)
      }
    }
    setActiveDropdownField(null)
    setDropdownSearch('')
  }

  const handleSelectDeal = (d) => {
    const dId = String(d.id || d.legacyId || '')
    const dNum = d.dealNumber || `DL${dId}`
    const dTitle = d.dealName || d.title || d.name || 'Untitled Deal'
    setDealId(String(dNum || dId))
    setDealTitle(`[${dNum}] ${dTitle}`)

    // Cross-fill account in O(1)
    const accId = String(d.accountId || '')
    const matchingAccount = lookupMaps.accById.get(accId)
      || lookupMaps.accByNum.get(accId.toLowerCase())
      || accountsList.find((a) => String(a.id) === accId || String(a.accountNumber) === accId)

    if (matchingAccount) {
      const aNum = matchingAccount.accountNumber || matchingAccount.accountNo || matchingAccount.id
      const aName = matchingAccount.accountName || matchingAccount.companyName || matchingAccount.name || ''
      setAccountId(String(aNum))
      setAccountTitle(`[${aNum}] ${aName}`)
    }

    // Cross-fill quotation in O(1)
    const matchingQuote = lookupMaps.quoteByDealId.get(dId)
      || lookupMaps.quoteByDealId.get(String(dNum))
      || (accId ? lookupMaps.quoteByAccId.get(accId) : null)
      || quotationsList.find((q) => String(q.dealId) === dId || (accId && String(q.accountId) === accId))

    if (matchingQuote) {
      const qNum = matchingQuote.quotationNumber || matchingQuote.quoteNumber || `QT-${matchingQuote.id}`
      const qTitle = matchingQuote.title || matchingQuote.customerName || dTitle
      setQuotationId(String(qNum))
      setQuotationTitle(`[${qNum}] ${qTitle}`)
    }
    setActiveDropdownField(null)
    setDropdownSearch('')
  }

  const handleSelectQuotation = (qt) => {
    const qId = String(qt.id || qt.legacyId || '')
    const qNum = qt.quotationNumber || qt.quoteNumber || `QT-${qId}`
    const qTitle = qt.title || qt.customerName || ''
    setQuotationId(String(qNum))
    setQuotationTitle(`[${qNum}] ${qTitle}`)

    // Cross-fill deal in O(1)
    const dId = String(qt.dealId || '')
    const matchingDeal = lookupMaps.dealById.get(dId)
      || lookupMaps.dealByNum.get(dId.toLowerCase())
      || dealsList.find((d) => String(d.id) === dId || String(d.dealNumber) === dId)

    if (matchingDeal) {
      const dNum = matchingDeal.dealNumber || `DL${matchingDeal.id}`
      const dName = matchingDeal.dealName || matchingDeal.title || matchingDeal.name || ''
      setDealId(String(dNum))
      setDealTitle(`[${dNum}] ${dName}`)

      const accId = String(matchingDeal.accountId || qt.accountId || '')
      const matchingAccount = lookupMaps.accById.get(accId)
        || lookupMaps.accByNum.get(accId.toLowerCase())
        || accountsList.find((a) => String(a.id) === accId || String(a.accountNumber) === accId)
      if (matchingAccount) {
        const aNum = matchingAccount.accountNumber || matchingAccount.accountNo || matchingAccount.id
        const aName = matchingAccount.accountName || matchingAccount.companyName || matchingAccount.name || ''
        setAccountId(String(aNum))
        setAccountTitle(`[${aNum}] ${aName}`)
      }
    } else if (qt.accountId) {
      const accId = String(qt.accountId)
      const matchingAccount = lookupMaps.accById.get(accId)
        || lookupMaps.accByNum.get(accId.toLowerCase())
        || accountsList.find((a) => String(a.id) === accId || String(a.accountNumber) === accId)
      if (matchingAccount) {
        const aNum = matchingAccount.accountNumber || matchingAccount.accountNo || matchingAccount.id
        const aName = matchingAccount.accountName || matchingAccount.companyName || matchingAccount.name || ''
        setAccountId(String(aNum))
        setAccountTitle(`[${aNum}] ${aName}`)
      }
    }
    setActiveDropdownField(null)
    setDropdownSearch('')
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!title.trim()) {
      addNotification?.('error', 'Validation Error', 'Task title is required.')
      return
    }

    try {
      setLoading(true)
      const primaryEmail = selectedUserEmails[0] || (user?.email ? user.email.toLowerCase() : '')

      const payload = {
        title: title.trim(),
        description: description.trim(),
        status,
        priority,
        startDate: startDate ? new Date(startDate).toISOString() : null,
        dueDate: dueDate ? new Date(dueDate).toISOString() : null,
        estimatedMinutes: Number(estimatedHours || 0) * 60,
        slaDeadline: dueDate ? new Date(dueDate).toISOString() : null,
        slaStatus: 'compliant',
        slaPolicy,
        assignedTo: primaryEmail,
        assignedToUserEmails: selectedUserEmails,
        projectId: projectId || null,
        dealId: dealId || null,
        accountId: accountId || null,
        quotationId: quotationId || null,
        tags,
        repeatSchedule: repeatSchedule !== 'none' ? repeatSchedule : null,
        subtasks,
        checklist,
      }

      const res = await createTask(payload)
      if (res?.success || res?.id) {
        addNotification?.('success', 'Task Created', 'Enterprise task created and synced to MongoDB.')
        navigate(isAdmin ? '/admin/tasks/all' : '/tasks/all')
      } else {
        addNotification?.('error', 'Creation Failed', res?.message || 'Could not create task.')
      }
    } catch (err) {
      console.error('Failed to create task', err)
      addNotification?.('error', 'Error', 'An unexpected error occurred.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <TaskWorkspaceLayout activeTabKey="all">
      <div style={{ maxWidth: '980px', margin: '0 auto', paddingBottom: '3rem' }}>
        {/* Top Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.25rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <button
              type="button"
              onClick={() => navigate(-1)}
              style={{
                width: '36px',
                height: '36px',
                borderRadius: '10px',
                border: '1.5px solid #cbd5e1',
                background: '#ffffff',
                color: '#475569',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                fontSize: '0.9rem',
              }}
              title="Go Back"
            >
              <FaArrowLeft />
            </button>
            <div>
              <h2 style={{ margin: 0, fontSize: '1.35rem', fontWeight: '800', color: '#1e293b' }}>
                Create New Task
              </h2>
              <p style={{ margin: '0.15rem 0 0', fontSize: '0.8rem', color: '#64748b' }}>
                Assign team members, configure priority, schedule milestones, and link CRM workflows.
              </p>
            </div>
          </div>
        </div>

        {/* Task Form Shell */}
        <form
          onSubmit={handleSubmit}
          style={{
            background: '#ffffff',
            borderRadius: '16px',
            border: '1.5px solid #e2e8f0',
            boxShadow: '0 4px 18px rgba(0, 0, 0, 0.03)',
            padding: '1.5rem',
            display: 'flex',
            flexDirection: 'column',
            gap: '1.5rem',
          }}
        >
          {/* SECTION 1: Core Task Details */}
          <div style={{ background: '#f8fafc', padding: '1.25rem', borderRadius: '14px', border: '1px solid #e2e8f0' }}>
            <span style={{ fontSize: '0.75rem', fontWeight: '800', color: '#c60016', textTransform: 'uppercase', display: 'block', marginBottom: '0.75rem' }}>
              1. Task Deliverable & Priority
            </span>

            <div style={{ marginBottom: '1rem' }}>
              <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: '700', color: '#475569', marginBottom: '0.3rem' }}>
                Task Title *
              </label>
              <input
                type="text"
                required
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. Conduct LT Panel Wiring & Relay Calibration on Site"
                style={{
                  width: '100%',
                  padding: '0.6rem 0.85rem',
                  borderRadius: '10px',
                  border: '1.5px solid #cbd5e1',
                  fontSize: '0.88rem',
                  fontWeight: '600',
                  color: '#1e293b',
                  boxSizing: 'border-box',
                }}
              />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1rem' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: '700', color: '#475569', marginBottom: '0.3rem' }}>
                  Priority Level *
                </label>
                <div style={{ display: 'flex', gap: '0.4rem' }}>
                  {[
                    { key: 'low', label: 'Low', color: '#059669', bg: '#ecfdf5' },
                    { key: 'medium', label: 'Medium', color: '#d97706', bg: '#fffbeb' },
                    { key: 'high', label: 'High', color: '#ea580c', bg: '#fff7ed' },
                    { key: 'urgent', label: 'Urgent', color: '#dc2626', bg: '#fef2f2' },
                  ].map((p) => {
                    const isSelected = priority === p.key
                    return (
                      <button
                        key={p.key}
                        type="button"
                        onClick={() => setPriority(p.key)}
                        style={{
                          flex: 1,
                          padding: '0.5rem 0.2rem',
                          borderRadius: '8px',
                          border: isSelected ? `2px solid ${p.color}` : '1px solid #cbd5e1',
                          background: isSelected ? p.bg : '#ffffff',
                          color: isSelected ? p.color : '#64748b',
                          fontSize: '0.76rem',
                          fontWeight: '800',
                          cursor: 'pointer',
                        }}
                      >
                        {p.label}
                      </button>
                    )
                  })}
                </div>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: '700', color: '#475569', marginBottom: '0.3rem' }}>
                  Initial Workflow Status *
                </label>
                <select
                  value={status}
                  onChange={(e) => setStatus(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '0.55rem 0.75rem',
                    borderRadius: '10px',
                    border: '1.5px solid #cbd5e1',
                    fontSize: '0.84rem',
                    fontWeight: '700',
                    color: '#1e293b',
                    background: '#ffffff',
                    boxSizing: 'border-box',
                  }}
                >
                  <option value="open">Open</option>
                  <option value="in_progress">In Progress</option>
                  <option value="review">Under Review</option>
                  <option value="completed">Completed</option>
                </select>
              </div>
            </div>

            <div style={{ marginTop: '1rem' }}>
              <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: '700', color: '#475569', marginBottom: '0.3rem' }}>
                Description & Detailed Deliverables
              </label>
              <textarea
                rows={3}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Specify precise action items, technical instructions, compliance guidelines..."
                style={{
                  width: '100%',
                  padding: '0.6rem 0.75rem',
                  borderRadius: '10px',
                  border: '1.5px solid #cbd5e1',
                  fontSize: '0.84rem',
                  boxSizing: 'border-box',
                }}
              />
            </div>
          </div>

          {/* SECTION 2: Assignees & Collaborators (MongoDB Users) - Clean Display */}
          <div style={{ background: '#f8fafc', padding: '1.25rem', borderRadius: '14px', border: '1px solid #e2e8f0' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.65rem' }}>
              <span style={{ fontSize: '0.75rem', fontWeight: '800', color: '#c60016', textTransform: 'uppercase' }}>
                2. Assignees & Collaborators (MongoDB Users)
              </span>
              <span style={{ fontSize: '0.75rem', fontWeight: '700', color: '#64748b' }}>
                Selected: {selectedUserEmails.length} Team Members
              </span>
            </div>

            {/* Selected Users Chips */}
            {selectedUserEmails.length > 0 && (
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem', marginBottom: '0.75rem' }}>
                {selectedUserEmails.map((email) => {
                  const matchedUser = usersList.find((u) => String(u.email || '').toLowerCase() === email)
                  const displayName = matchedUser?.name || email
                  return (
                    <span
                      key={email}
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '0.35rem',
                        padding: '0.25rem 0.65rem',
                        borderRadius: '20px',
                        background: '#fef2f2',
                        border: '1px solid #fecaca',
                        color: '#991b1b',
                        fontSize: '0.74rem',
                        fontWeight: '700',
                      }}
                    >
                      <span>{displayName}</span>
                      <button
                        type="button"
                        onClick={() => toggleUserSelection(email)}
                        style={{ background: 'none', border: 'none', color: '#991b1b', cursor: 'pointer', padding: 0 }}
                      >
                        <FaTimes />
                      </button>
                    </span>
                  )
                })}
              </div>
            )}

            {/* User Search */}
            <div style={{ position: 'relative', marginBottom: '0.65rem' }}>
              <FaSearch style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8', fontSize: '0.8rem' }} />
              <input
                type="text"
                value={userSearchQuery}
                onChange={(e) => setUserSearchQuery(e.target.value)}
                placeholder="Search team members by name or email..."
                style={{
                  width: '100%',
                  padding: '0.5rem 0.75rem 0.5rem 2.1rem',
                  borderRadius: '8px',
                  border: '1.5px solid #cbd5e1',
                  fontSize: '0.84rem',
                  boxSizing: 'border-box',
                }}
              />
            </div>

            {/* Checkbox List - Clean: Name and Email Only */}
            <div
              style={{
                maxHeight: '200px',
                overflowY: 'auto',
                border: '1.5px solid #e2e8f0',
                borderRadius: '10px',
                padding: '0.4rem',
                display: 'flex',
                flexDirection: 'column',
                gap: '0.3rem',
                background: '#ffffff',
              }}
            >
              {filteredUsers.length === 0 ? (
                <div style={{ padding: '1rem', textAlign: 'center', fontSize: '0.78rem', color: '#94a3b8' }}>
                  No users found.
                </div>
              ) : (
                filteredUsers.map((u) => {
                  const email = String(u.email || '').trim().toLowerCase()
                  const isChecked = selectedUserEmails.includes(email)
                  return (
                    <label
                      key={email}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.65rem',
                        padding: '0.45rem 0.65rem',
                        borderRadius: '8px',
                        cursor: 'pointer',
                        background: isChecked ? '#fef2f2' : '#ffffff',
                        border: isChecked ? '1px solid #fecaca' : '1px solid #f1f5f9',
                      }}
                    >
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={() => toggleUserSelection(email)}
                        style={{ accentColor: '#c60016', cursor: 'pointer', width: '16px', height: '16px' }}
                      />
                      <div
                        style={{
                          width: '28px',
                          height: '28px',
                          borderRadius: '50%',
                          background: isChecked ? '#c60016' : '#cbd5e1',
                          color: '#ffffff',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontSize: '0.72rem',
                          fontWeight: '800',
                          flexShrink: 0,
                        }}
                      >
                        {(u.name || email).slice(0, 1).toUpperCase()}
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: '0.82rem', fontWeight: '700', color: '#1e293b' }}>
                          {u.name || email}
                        </div>
                        <div style={{ fontSize: '0.72rem', color: '#64748b' }}>
                          {email}
                        </div>
                      </div>
                    </label>
                  )
                })
              )}
            </div>
          </div>

          {/* SECTION 3: CRM Workflow Linking & Project Association */}
          <div style={{ background: '#f8fafc', padding: '1.25rem', borderRadius: '14px', border: '1px solid #e2e8f0' }}>
            <span style={{ fontSize: '0.75rem', fontWeight: '800', color: '#c60016', textTransform: 'uppercase', display: 'block', marginBottom: '0.75rem' }}>
              3. CRM Workflow Linking & Project Association
            </span>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '1rem' }}>
              {/* Linked Project */}
              <div>
                <label style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', fontSize: '0.76rem', fontWeight: '700', color: '#475569', marginBottom: '0.25rem' }}>
                  <FaProjectDiagram style={{ color: '#c60016' }} /> Linked Project
                </label>
                <select
                  value={projectId}
                  onChange={(e) => setProjectId(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '0.55rem 0.75rem',
                    borderRadius: '8px',
                    border: '1.5px solid #cbd5e1',
                    fontSize: '0.82rem',
                    background: '#ffffff',
                    fontWeight: '600',
                    boxSizing: 'border-box',
                  }}
                >
                  <option value="">No Project Linked</option>
                  {projectsList.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.projectCode ? `[${p.projectCode}] ` : ''}{p.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* 1. Project Name */}
              <div style={{ position: 'relative' }} ref={activeDropdownField === 'deal' ? dropdownRef : null}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', fontSize: '0.76rem', fontWeight: '700', color: '#475569', marginBottom: '0.25rem' }}>
                  <FaHandshake style={{ color: '#2563eb' }} /> Project Name
                </label>
                <input
                  type="text"
                  value={dealTitle || dealId}
                  onClick={() => {
                    setActiveDropdownField('deal')
                    setDropdownSearch('')
                  }}
                  readOnly
                  placeholder="Click to select Project Name"
                  style={{
                    width: '100%',
                    padding: '0.55rem 0.75rem',
                    borderRadius: '8px',
                    border: activeDropdownField === 'deal' ? '1.5px solid #2563eb' : '1.5px solid #cbd5e1',
                    fontSize: '0.82rem',
                    background: '#ffffff',
                    boxSizing: 'border-box',
                    cursor: 'pointer',
                    fontWeight: dealTitle ? '700' : '400',
                    color: dealTitle ? '#1e293b' : '#64748b',
                  }}
                />

                {activeDropdownField === 'deal' && (
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
                      maxHeight: '280px',
                      overflow: 'hidden',
                    }}
                  >
                    {/* Top Search Bar */}
                    <div style={{ padding: '0.45rem 0.65rem', borderBottom: '1px solid #e2e8f0', background: '#f8fafc', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                      <FaSearch style={{ color: '#2563eb', fontSize: '0.8rem', flexShrink: 0 }} />
                      <input
                        type="text"
                        value={dropdownSearch}
                        onChange={(e) => setDropdownSearch(e.target.value)}
                        placeholder="Search Project / Deal Name..."
                        autoFocus
                        style={{
                          flex: 1,
                          border: 'none',
                          background: 'transparent',
                          fontSize: '0.82rem',
                          outline: 'none',
                          padding: '0.2rem',
                        }}
                      />
                    </div>
                    {/* Items List */}
                    <div style={{ overflowY: 'auto', maxHeight: '230px', padding: '0.3rem' }}>
                      {filteredDeals.length === 0 ? (
                        <div style={{ padding: '1rem', textAlign: 'center', fontSize: '0.78rem', color: '#94a3b8' }}>
                          No deals found.
                        </div>
                      ) : (
                        filteredDeals.map((d) => {
                          const dNum = d.dealNumber || `DL${d.id}`
                          const dName = d.dealName || d.title || d.name || 'Untitled Deal'
                          return (
                            <div
                              key={d.id || dNum}
                              onClick={() => handleSelectDeal(d)}
                              style={{
                                padding: '0.5rem 0.65rem',
                                borderRadius: '6px',
                                cursor: 'pointer',
                                fontSize: '0.8rem',
                                borderBottom: '1px solid #f1f5f9',
                                transition: 'background 0.15s ease',
                              }}
                              onMouseEnter={(e) => { e.currentTarget.style.background = '#eff6ff' }}
                              onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent' }}
                            >
                              <span style={{ fontWeight: '800', color: '#2563eb', marginRight: '0.35rem' }}>[{dNum}]</span>
                              <span style={{ fontWeight: '600', color: '#1e293b' }}>{dName}</span>
                            </div>
                          )
                        })
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* 2. Account (Lead) ID / Name */}
              <div style={{ position: 'relative' }} ref={activeDropdownField === 'account' ? dropdownRef : null}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', fontSize: '0.76rem', fontWeight: '700', color: '#475569', marginBottom: '0.25rem' }}>
                  <FaBuilding style={{ color: '#7c3aed' }} /> Account (Lead) ID / Name
                </label>
                <input
                  type="text"
                  value={accountTitle || accountId}
                  onClick={() => {
                    setActiveDropdownField('account')
                    setDropdownSearch('')
                  }}
                  readOnly
                  placeholder="Click to select Account"
                  style={{
                    width: '100%',
                    padding: '0.55rem 0.75rem',
                    borderRadius: '8px',
                    border: activeDropdownField === 'account' ? '1.5px solid #7c3aed' : '1.5px solid #cbd5e1',
                    fontSize: '0.82rem',
                    background: '#ffffff',
                    boxSizing: 'border-box',
                    cursor: 'pointer',
                    fontWeight: accountTitle ? '700' : '400',
                    color: accountTitle ? '#1e293b' : '#64748b',
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
                      maxHeight: '280px',
                      overflow: 'hidden',
                    }}
                  >
                    {/* Top Search Bar */}
                    <div style={{ padding: '0.45rem 0.65rem', borderBottom: '1px solid #e2e8f0', background: '#f8fafc', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                      <FaSearch style={{ color: '#7c3aed', fontSize: '0.8rem', flexShrink: 0 }} />
                      <input
                        type="text"
                        value={dropdownSearch}
                        onChange={(e) => setDropdownSearch(e.target.value)}
                        placeholder="Search Account / Lead..."
                        autoFocus
                        style={{
                          flex: 1,
                          border: 'none',
                          background: 'transparent',
                          fontSize: '0.82rem',
                          outline: 'none',
                          padding: '0.2rem',
                        }}
                      />
                    </div>
                    {/* Items List */}
                    <div style={{ overflowY: 'auto', maxHeight: '230px', padding: '0.3rem' }}>
                      {filteredAccounts.length === 0 ? (
                        <div style={{ padding: '1rem', textAlign: 'center', fontSize: '0.78rem', color: '#94a3b8' }}>
                          No accounts found.
                        </div>
                      ) : (
                        filteredAccounts.map((a) => {
                          const aNum = a.accountNumber || a.accountNo || a.id
                          const aName = a.accountName || a.companyName || a.name || 'Untitled Account'
                          return (
                            <div
                              key={a.id || aNum}
                              onClick={() => handleSelectAccount(a)}
                              style={{
                                padding: '0.5rem 0.65rem',
                                borderRadius: '6px',
                                cursor: 'pointer',
                                fontSize: '0.8rem',
                                borderBottom: '1px solid #f1f5f9',
                                transition: 'background 0.15s ease',
                              }}
                              onMouseEnter={(e) => { e.currentTarget.style.background = '#faf5ff' }}
                              onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent' }}
                            >
                              <span style={{ fontWeight: '800', color: '#7c3aed', marginRight: '0.35rem' }}>[{aNum}]</span>
                              <span style={{ fontWeight: '600', color: '#1e293b' }}>{aName}</span>
                            </div>
                          )
                        })
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* 3. Quotation No. */}
              <div style={{ position: 'relative' }} ref={activeDropdownField === 'quotation' ? dropdownRef : null}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', fontSize: '0.76rem', fontWeight: '700', color: '#475569', marginBottom: '0.25rem' }}>
                  <FaFileInvoice style={{ color: '#c60016' }} /> Quotation No.
                </label>
                <input
                  type="text"
                  value={quotationTitle || quotationId}
                  onClick={() => {
                    setActiveDropdownField('quotation')
                    setDropdownSearch('')
                  }}
                  readOnly
                  placeholder="Click to select Quotation"
                  style={{
                    width: '100%',
                    padding: '0.55rem 0.75rem',
                    borderRadius: '8px',
                    border: activeDropdownField === 'quotation' ? '1.5px solid #c60016' : '1.5px solid #cbd5e1',
                    fontSize: '0.82rem',
                    background: '#ffffff',
                    boxSizing: 'border-box',
                    cursor: 'pointer',
                    fontWeight: quotationTitle ? '700' : '400',
                    color: quotationTitle ? '#1e293b' : '#64748b',
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
                      maxHeight: '280px',
                      overflow: 'hidden',
                    }}
                  >
                    {/* Top Search Bar */}
                    <div style={{ padding: '0.45rem 0.65rem', borderBottom: '1px solid #e2e8f0', background: '#f8fafc', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                      <FaSearch style={{ color: '#c60016', fontSize: '0.8rem', flexShrink: 0 }} />
                      <input
                        type="text"
                        value={dropdownSearch}
                        onChange={(e) => setDropdownSearch(e.target.value)}
                        placeholder="Search Quotation No. / Client..."
                        autoFocus
                        style={{
                          flex: 1,
                          border: 'none',
                          background: 'transparent',
                          fontSize: '0.82rem',
                          outline: 'none',
                          padding: '0.2rem',
                        }}
                      />
                    </div>
                    {/* Items List */}
                    <div style={{ overflowY: 'auto', maxHeight: '230px', padding: '0.3rem' }}>
                      {filteredQuotations.length === 0 ? (
                        <div style={{ padding: '1rem', textAlign: 'center', fontSize: '0.78rem', color: '#94a3b8' }}>
                          No quotations found.
                        </div>
                      ) : (
                        filteredQuotations.map((qt) => {
                          const qNum = qt.quotationNumber || qt.quoteNumber || `QT-${qt.id}`
                          const qTitle = qt.title || qt.customerName || qt.accountName || 'Untitled Quotation'
                          return (
                            <div
                              key={qt.id || qNum}
                              onClick={() => handleSelectQuotation(qt)}
                              style={{
                                padding: '0.5rem 0.65rem',
                                borderRadius: '6px',
                                cursor: 'pointer',
                                fontSize: '0.8rem',
                                borderBottom: '1px solid #f1f5f9',
                                transition: 'background 0.15s ease',
                              }}
                              onMouseEnter={(e) => { e.currentTarget.style.background = '#fef2f2' }}
                              onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent' }}
                            >
                              <span style={{ fontWeight: '800', color: '#c60016', marginRight: '0.35rem' }}>[{qNum}]</span>
                              <span style={{ fontWeight: '600', color: '#1e293b' }}>{qTitle}</span>
                            </div>
                          )
                        })
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* SECTION 4: Schedule, SLA Policies & Effort */}
          <div style={{ background: '#f8fafc', padding: '1.25rem', borderRadius: '14px', border: '1px solid #e2e8f0' }}>
            <span style={{ fontSize: '0.75rem', fontWeight: '800', color: '#c60016', textTransform: 'uppercase', display: 'block', marginBottom: '0.75rem' }}>
              4. Schedule, SLA Policies & Effort
            </span>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.76rem', fontWeight: '700', color: '#475569', marginBottom: '0.25rem' }}>
                  Start Date
                </label>
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  style={{ width: '100%', padding: '0.55rem 0.75rem', borderRadius: '8px', border: '1.5px solid #cbd5e1', fontSize: '0.82rem', boxSizing: 'border-box' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.76rem', fontWeight: '700', color: '#475569', marginBottom: '0.25rem' }}>
                  Target Due Date
                </label>
                <input
                  type="date"
                  value={dueDate}
                  onChange={(e) => setDueDate(e.target.value)}
                  style={{ width: '100%', padding: '0.55rem 0.75rem', borderRadius: '8px', border: '1.5px solid #cbd5e1', fontSize: '0.82rem', boxSizing: 'border-box' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.76rem', fontWeight: '700', color: '#475569', marginBottom: '0.25rem' }}>
                  Estimated Hours
                </label>
                <input
                  type="number"
                  min="0.5"
                  step="0.5"
                  value={estimatedHours}
                  onChange={(e) => setEstimatedHours(e.target.value)}
                  style={{ width: '100%', padding: '0.55rem 0.75rem', borderRadius: '8px', border: '1.5px solid #cbd5e1', fontSize: '0.82rem', boxSizing: 'border-box' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.76rem', fontWeight: '700', color: '#475569', marginBottom: '0.25rem' }}>
                  SLA Target Policy
                </label>
                <select
                  value={slaPolicy}
                  onChange={(e) => setSlaPolicy(e.target.value)}
                  style={{ width: '100%', padding: '0.55rem 0.75rem', borderRadius: '8px', border: '1.5px solid #cbd5e1', fontSize: '0.82rem', background: '#ffffff', boxSizing: 'border-box' }}
                >
                  <option value="critical_4h">Critical Turnaround (4 Hours)</option>
                  <option value="priority_12h">Priority Execution (12 Hours)</option>
                  <option value="standard_24h">Standard Business (24 Hours)</option>
                  <option value="extended_72h">Extended Scope (72 Hours)</option>
                </select>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.76rem', fontWeight: '700', color: '#475569', marginBottom: '0.25rem' }}>
                  Recurrence / Repeat
                </label>
                <select
                  value={repeatSchedule}
                  onChange={(e) => setRepeatSchedule(e.target.value)}
                  style={{ width: '100%', padding: '0.55rem 0.75rem', borderRadius: '8px', border: '1.5px solid #cbd5e1', fontSize: '0.82rem', background: '#ffffff', boxSizing: 'border-box' }}
                >
                  <option value="none">No Recurrence (One-time)</option>
                  <option value="daily">Daily</option>
                  <option value="weekly">Weekly</option>
                  <option value="monthly">Monthly</option>
                  <option value="yearly">Yearly</option>
                </select>
              </div>
            </div>

            {/* Tags Chips */}
            <div style={{ marginTop: '1rem' }}>
              <label style={{ display: 'block', fontSize: '0.76rem', fontWeight: '700', color: '#475569', marginBottom: '0.35rem' }}>
                Classification Tags
              </label>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.35rem' }}>
                {PRESET_TAGS.map((t) => {
                  const isTagged = tags.includes(t)
                  return (
                    <button
                      key={t}
                      type="button"
                      onClick={() => toggleTag(t)}
                      style={{
                        padding: '0.25rem 0.65rem',
                        borderRadius: '20px',
                        border: isTagged ? '1px solid #c60016' : '1px solid #cbd5e1',
                        background: isTagged ? '#fef2f2' : '#ffffff',
                        color: isTagged ? '#c60016' : '#64748b',
                        fontSize: '0.74rem',
                        fontWeight: '700',
                        cursor: 'pointer',
                      }}
                    >
                      {t} {isTagged && '✓'}
                    </button>
                  )
                })}
              </div>
            </div>
          </div>

          {/* SECTION 5: Sub Tasks & Checklist (Optional Initial Deliverables) */}
          <div style={{ background: '#f8fafc', padding: '1.25rem', borderRadius: '14px', border: '1px solid #e2e8f0', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            {/* Subtasks Builder */}
            <div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.65rem' }}>
                <span style={{ fontSize: '0.75rem', fontWeight: '800', color: '#c60016', textTransform: 'uppercase' }}>
                  5. Sub Tasks ({subtasks.length})
                </span>
              </div>

              {/* Subtasks List */}
              {subtasks.length > 0 && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem', marginBottom: '0.75rem' }}>
                  {subtasks.map((st) => (
                    <div
                      key={st.id}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        padding: '0.4rem 0.65rem',
                        borderRadius: '8px',
                        backgroundColor: '#ffffff',
                        border: '1px solid #e2e8f0',
                        gap: '0.5rem',
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.55rem', flex: 1, minWidth: 0 }}>
                        <span style={{ width: '6px', height: '6px', borderRadius: '2px', backgroundColor: '#f59e0b', flexShrink: 0 }} />
                        <span style={{ fontSize: '0.8rem', fontWeight: '600', color: '#1e293b', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {st.title}
                        </span>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexShrink: 0 }}>
                        <span style={{ fontSize: '0.68rem', fontWeight: '700', padding: '2px 8px', borderRadius: '6px', backgroundColor: '#e0f2fe', color: '#0369a1' }}>
                          {st.status || 'Assigned'}
                        </span>
                        {st.dueDate && (
                          <span style={{ fontSize: '0.68rem', color: '#64748b' }}>
                            {st.dueDate}
                          </span>
                        )}
                        <button
                          type="button"
                          onClick={() => setSubtasks((prev) => prev.filter((item) => item.id !== st.id))}
                          style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer', padding: '2px' }}
                          title="Remove subtask"
                        >
                          <FaTimes />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Subtask Input Row */}
              <div style={{ display: 'flex', gap: '0.45rem', flexWrap: 'wrap' }}>
                <input
                  type="text"
                  placeholder="Write subtask title..."
                  value={newSubtaskTitle}
                  onChange={(e) => setNewSubtaskTitle(e.target.value)}
                  style={{
                    flex: 2,
                    minWidth: '180px',
                    padding: '0.45rem 0.65rem',
                    borderRadius: '8px',
                    border: '1.5px solid #cbd5e1',
                    fontSize: '0.8rem',
                    background: '#ffffff',
                  }}
                />
                <select
                  value={newSubtaskStatus}
                  onChange={(e) => setNewSubtaskStatus(e.target.value)}
                  style={{
                    padding: '0.45rem 0.6rem',
                    borderRadius: '8px',
                    border: '1.5px solid #cbd5e1',
                    fontSize: '0.78rem',
                    fontWeight: '700',
                    background: '#ffffff',
                    color: '#475569',
                  }}
                >
                  <option value="Assigned">Assigned</option>
                  <option value="In Progress">In Progress</option>
                  <option value="Done">Done</option>
                </select>
                <input
                  type="date"
                  value={newSubtaskDueDate}
                  onChange={(e) => setNewSubtaskDueDate(e.target.value)}
                  style={{
                    padding: '0.45rem 0.5rem',
                    borderRadius: '8px',
                    border: '1.5px solid #cbd5e1',
                    fontSize: '0.78rem',
                    background: '#ffffff',
                  }}
                  title="Subtask Due Date"
                />
                <button
                  type="button"
                  onClick={() => {
                    const trimmed = newSubtaskTitle.trim()
                    if (!trimmed) return
                    setSubtasks((prev) => [
                      ...prev,
                      {
                        id: `${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
                        title: trimmed,
                        status: newSubtaskStatus,
                        dueDate: newSubtaskDueDate,
                        completed: newSubtaskStatus === 'Done',
                      },
                    ])
                    setNewSubtaskTitle('')
                    setNewSubtaskDueDate('')
                  }}
                  disabled={!newSubtaskTitle.trim()}
                  style={{
                    padding: '0.45rem 0.95rem',
                    borderRadius: '8px',
                    border: 'none',
                    backgroundColor: newSubtaskTitle.trim() ? '#c60016' : '#cbd5e1',
                    color: '#ffffff',
                    fontSize: '0.78rem',
                    fontWeight: '700',
                    cursor: newSubtaskTitle.trim() ? 'pointer' : 'not-allowed',
                  }}
                >
                  Add Subtask
                </button>
              </div>
            </div>

            {/* Checklist Builder */}
            <div style={{ borderTop: '1px solid #e2e8f0', paddingTop: '1rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.65rem' }}>
                <span style={{ fontSize: '0.75rem', fontWeight: '800', color: '#c60016', textTransform: 'uppercase' }}>
                  Checklist Items ({checklist.length})
                </span>
              </div>

              {/* Checklist List */}
              {checklist.length > 0 && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem', marginBottom: '0.75rem' }}>
                  {checklist.map((item) => (
                    <div
                      key={item.id}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        padding: '0.4rem 0.65rem',
                        borderRadius: '8px',
                        backgroundColor: '#ffffff',
                        border: '1px solid #e2e8f0',
                        gap: '0.5rem',
                      }}
                    >
                      <span style={{ fontSize: '0.8rem', fontWeight: '600', color: '#1e293b' }}>
                        {item.title}
                      </span>
                      <button
                        type="button"
                        onClick={() => setChecklist((prev) => prev.filter((i) => i.id !== item.id))}
                        style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer', padding: '2px' }}
                        title="Remove checklist item"
                      >
                        <FaTimes />
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {/* Checklist Input Row */}
              <div style={{ display: 'flex', gap: '0.45rem' }}>
                <input
                  type="text"
                  placeholder="Add checklist item..."
                  value={newChecklistTitle}
                  onChange={(e) => setNewChecklistTitle(e.target.value)}
                  style={{
                    flex: 1,
                    padding: '0.45rem 0.65rem',
                    borderRadius: '8px',
                    border: '1.5px solid #cbd5e1',
                    fontSize: '0.8rem',
                    background: '#ffffff',
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault()
                      const trimmed = newChecklistTitle.trim()
                      if (!trimmed) return
                      setChecklist((prev) => [
                        ...prev,
                        {
                          id: `${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
                          title: trimmed,
                          completed: false,
                        },
                      ])
                      setNewChecklistTitle('')
                    }
                  }}
                />
                <button
                  type="button"
                  onClick={() => {
                    const trimmed = newChecklistTitle.trim()
                    if (!trimmed) return
                    setChecklist((prev) => [
                      ...prev,
                      {
                        id: `${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
                        title: trimmed,
                        completed: false,
                      },
                    ])
                    setNewChecklistTitle('')
                  }}
                  disabled={!newChecklistTitle.trim()}
                  style={{
                    padding: '0.45rem 0.95rem',
                    borderRadius: '8px',
                    border: 'none',
                    backgroundColor: newChecklistTitle.trim() ? '#c60016' : '#cbd5e1',
                    color: '#ffffff',
                    fontSize: '0.78rem',
                    fontWeight: '700',
                    cursor: newChecklistTitle.trim() ? 'pointer' : 'not-allowed',
                  }}
                >
                  Add Item
                </button>
              </div>
            </div>
          </div>

          {/* Form Actions */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '0.75rem', paddingTop: '0.5rem' }}>
            <button
              type="button"
              onClick={() => navigate(-1)}
              style={{
                padding: '0.65rem 1.35rem',
                borderRadius: '10px',
                border: '1.5px solid #cbd5e1',
                background: '#ffffff',
                color: '#475569',
                fontSize: '0.84rem',
                fontWeight: '700',
                cursor: 'pointer',
              }}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              style={{
                padding: '0.65rem 1.75rem',
                borderRadius: '10px',
                border: 'none',
                background: 'linear-gradient(135deg, #c60016 0%, #80000e 100%)',
                color: '#ffffff',
                fontSize: '0.86rem',
                fontWeight: '800',
                cursor: 'pointer',
                boxShadow: '0 4px 14px rgba(198, 0, 22, 0.25)',
              }}
            >
              {loading ? 'Creating Task...' : 'Create Task'}
            </button>
          </div>
        </form>
      </div>
    </TaskWorkspaceLayout>
  )
}

export default AddTaskPage
