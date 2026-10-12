import React, { useState, useEffect, useMemo } from 'react'
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
  const [tags, setTags] = useState([])

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

  // Picker Modals state
  const [pickerModalType, setPickerModalType] = useState(null) // 'deal' | 'account' | 'quotation'
  const [pickerSearchQuery, setPickerSearchQuery] = useState('')

  // Load directories and CRM data
  useEffect(() => {
    const loadAllData = async () => {
      try {
        const [overview, projects, leads, deals, quotations] = await Promise.all([
          workManagementService.getOverview().catch(() => null),
          workManagementService.getProjects().catch(() => []),
          leadApi.getLeads().catch(() => []),
          dealApi.getDeals().catch(() => []),
          quotationApi.getQuotations().catch(() => []),
        ])

        if (overview?.teamMembers) {
          setUsersList(overview.teamMembers)
        }
        setProjectsList(projects || [])
        setAccountsList(Array.isArray(leads) ? leads : (Array.isArray(leads?.data) ? leads.data : []))
        setDealsList(Array.isArray(deals) ? deals : (Array.isArray(deals?.data) ? deals.data : []))
        setQuotationsList(Array.isArray(quotations) ? quotations : (Array.isArray(quotations?.data) ? quotations.data : []))
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

  // Filtered lists for Picker Modals
  const filteredDeals = useMemo(() => {
    const q = pickerSearchQuery.trim().toLowerCase()
    if (!q) return dealsList
    return dealsList.filter((d) => {
      const titleStr = String(d.title || d.dealName || d.name || '').toLowerCase()
      const numStr = String(d.dealNumber || d.id || '').toLowerCase()
      const accStr = String(d.accountName || '').toLowerCase()
      return titleStr.includes(q) || numStr.includes(q) || accStr.includes(q)
    })
  }, [dealsList, pickerSearchQuery])

  const filteredAccounts = useMemo(() => {
    const q = pickerSearchQuery.trim().toLowerCase()
    if (!q) return accountsList
    return accountsList.filter((a) => {
      const nameStr = String(a.accountName || a.companyName || a.name || '').toLowerCase()
      const numStr = String(a.accountNumber || a.accountNo || a.id || '').toLowerCase()
      return nameStr.includes(q) || numStr.includes(q)
    })
  }, [accountsList, pickerSearchQuery])

  const filteredQuotations = useMemo(() => {
    const q = pickerSearchQuery.trim().toLowerCase()
    if (!q) return quotationsList
    return quotationsList.filter((qt) => {
      const noStr = String(qt.quotationNumber || qt.quoteNumber || qt.id || '').toLowerCase()
      const titleStr = String(qt.title || qt.customerName || qt.accountName || '').toLowerCase()
      return noStr.includes(q) || titleStr.includes(q)
    })
  }, [quotationsList, pickerSearchQuery])

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

              {/* 1. Project Name (formerly Deal Reference / ID) with Search Picker */}
              <div>
                <label style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', fontSize: '0.76rem', fontWeight: '700', color: '#475569', marginBottom: '0.25rem' }}>
                  <FaHandshake style={{ color: '#2563eb' }} /> Project Name
                </label>
                <div style={{ display: 'flex', gap: '0.4rem' }}>
                  <input
                    type="text"
                    value={dealTitle || dealId}
                    onChange={(e) => {
                      setDealId(e.target.value)
                      setDealTitle(e.target.value)
                    }}
                    placeholder="e.g. DEAL-00128 or Deal title"
                    style={{
                      flex: 1,
                      padding: '0.55rem 0.75rem',
                      borderRadius: '8px',
                      border: '1.5px solid #cbd5e1',
                      fontSize: '0.82rem',
                      background: '#ffffff',
                      boxSizing: 'border-box',
                    }}
                  />
                  <button
                    type="button"
                    onClick={() => {
                      setPickerModalType('deal')
                      setPickerSearchQuery('')
                    }}
                    style={{
                      background: '#2563eb',
                      color: '#ffffff',
                      border: 'none',
                      borderRadius: '8px',
                      padding: '0 0.85rem',
                      fontSize: '0.76rem',
                      fontWeight: '700',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.3rem',
                    }}
                  >
                    <FaSearch />
                    <span>Search</span>
                  </button>
                </div>
              </div>

              {/* 2. Account (Lead) ID / Name with Search Picker */}
              <div>
                <label style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', fontSize: '0.76rem', fontWeight: '700', color: '#475569', marginBottom: '0.25rem' }}>
                  <FaBuilding style={{ color: '#7c3aed' }} /> Account (Lead) ID / Name
                </label>
                <div style={{ display: 'flex', gap: '0.4rem' }}>
                  <input
                    type="text"
                    value={accountTitle || accountId}
                    onChange={(e) => {
                      setAccountId(e.target.value)
                      setAccountTitle(e.target.value)
                    }}
                    placeholder="e.g. ACC-4082 or Account title"
                    style={{
                      flex: 1,
                      padding: '0.55rem 0.75rem',
                      borderRadius: '8px',
                      border: '1.5px solid #cbd5e1',
                      fontSize: '0.82rem',
                      background: '#ffffff',
                      boxSizing: 'border-box',
                    }}
                  />
                  <button
                    type="button"
                    onClick={() => {
                      setPickerModalType('account')
                      setPickerSearchQuery('')
                    }}
                    style={{
                      background: '#7c3aed',
                      color: '#ffffff',
                      border: 'none',
                      borderRadius: '8px',
                      padding: '0 0.85rem',
                      fontSize: '0.76rem',
                      fontWeight: '700',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.3rem',
                    }}
                  >
                    <FaSearch />
                    <span>Search</span>
                  </button>
                </div>
              </div>

              {/* 3. Quotation No. with Search Picker */}
              <div>
                <label style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', fontSize: '0.76rem', fontWeight: '700', color: '#475569', marginBottom: '0.25rem' }}>
                  <FaFileInvoice style={{ color: '#c60016' }} /> Quotation No.
                </label>
                <div style={{ display: 'flex', gap: '0.4rem' }}>
                  <input
                    type="text"
                    value={quotationTitle || quotationId}
                    onChange={(e) => {
                      setQuotationId(e.target.value)
                      setQuotationTitle(e.target.value)
                    }}
                    placeholder="e.g. QT-00128"
                    style={{
                      flex: 1,
                      padding: '0.55rem 0.75rem',
                      borderRadius: '8px',
                      border: '1.5px solid #cbd5e1',
                      fontSize: '0.82rem',
                      background: '#ffffff',
                      boxSizing: 'border-box',
                    }}
                  />
                  <button
                    type="button"
                    onClick={() => {
                      setPickerModalType('quotation')
                      setPickerSearchQuery('')
                    }}
                    style={{
                      background: '#c60016',
                      color: '#ffffff',
                      border: 'none',
                      borderRadius: '8px',
                      padding: '0 0.85rem',
                      fontSize: '0.76rem',
                      fontWeight: '700',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.3rem',
                    }}
                  >
                    <FaSearch />
                    <span>Search</span>
                  </button>
                </div>
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

      {/* CRM Search & Picker Modal */}
      <Modal
        isOpen={Boolean(pickerModalType)}
        onClose={() => setPickerModalType(null)}
        title={
          pickerModalType === 'deal'
            ? 'Select Project / Deal'
            : pickerModalType === 'account'
            ? 'Select Account (Lead)'
            : 'Select Quotation'
        }
        size="large"
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
          {/* Top Search Input */}
          <div style={{ position: 'relative' }}>
            <FaSearch style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8', fontSize: '0.85rem' }} />
            <input
              type="text"
              value={pickerSearchQuery}
              onChange={(e) => setPickerSearchQuery(e.target.value)}
              placeholder={
                pickerModalType === 'deal'
                  ? 'Search deals/leads by title, DEAL-XXXXX, account...'
                  : pickerModalType === 'account'
                  ? 'Search accounts by name, ACC-XXXXX, company...'
                  : 'Search quotations by number (QT-XXXXX), client...'
              }
              style={{
                width: '100%',
                padding: '0.55rem 0.75rem 0.55rem 2.2rem',
                borderRadius: '8px',
                border: '1.5px solid #cbd5e1',
                fontSize: '0.86rem',
                outline: 'none',
                boxSizing: 'border-box',
              }}
              autoFocus
            />
          </div>

          {/* List items */}
          <div style={{ maxHeight: '360px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
            {pickerModalType === 'deal' && (
              filteredDeals.length === 0 ? (
                <div style={{ padding: '2rem', textAlign: 'center', color: '#94a3b8' }}>No deals found.</div>
              ) : (
                filteredDeals.map((d) => (
                  <div
                    key={d.id || d.dealNumber}
                    onClick={() => {
                      const display = d.dealNumber ? `[${d.dealNumber}] ${d.title || d.dealName || ''}` : (d.title || d.dealName || `Deal #${d.id}`)
                      setDealId(String(d.dealNumber || d.id || ''))
                      setDealTitle(display)
                      setPickerModalType(null)
                    }}
                    style={{
                      padding: '0.65rem 0.85rem',
                      borderRadius: '8px',
                      border: '1px solid #e2e8f0',
                      background: '#ffffff',
                      cursor: 'pointer',
                      transition: 'background 0.15s ease',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                    }}
                    onMouseEnter={(e) => { e.currentTarget.style.background = '#f8fafc' }}
                    onMouseLeave={(e) => { e.currentTarget.style.background = '#ffffff' }}
                  >
                    <div>
                      <div style={{ fontWeight: '700', fontSize: '0.85rem', color: '#1e293b' }}>
                        {d.dealNumber ? <span style={{ color: '#2563eb', marginRight: '0.4rem' }}>{d.dealNumber}</span> : null}
                        {d.title || d.dealName || 'Untitled Deal'}
                      </div>
                      <div style={{ fontSize: '0.74rem', color: '#64748b', marginTop: '0.15rem' }}>
                        {d.accountName ? `Account: ${d.accountName}` : ''} {d.stage ? `• Stage: ${d.stage}` : ''}
                      </div>
                    </div>
                    <button type="button" style={{ background: '#2563eb', color: '#ffffff', border: 'none', borderRadius: '6px', padding: '0.25rem 0.6rem', fontSize: '0.72rem', fontWeight: '700' }}>
                      Select
                    </button>
                  </div>
                ))
              )
            )}

            {pickerModalType === 'account' && (
              filteredAccounts.length === 0 ? (
                <div style={{ padding: '2rem', textAlign: 'center', color: '#94a3b8' }}>No accounts found.</div>
              ) : (
                filteredAccounts.map((a) => (
                  <div
                    key={a.id || a.accountNumber}
                    onClick={() => {
                      const display = a.accountNumber ? `[${a.accountNumber}] ${a.accountName || a.companyName || ''}` : (a.accountName || a.companyName || `Account #${a.id}`)
                      setAccountId(String(a.accountNumber || a.id || ''))
                      setAccountTitle(display)
                      setPickerModalType(null)
                    }}
                    style={{
                      padding: '0.65rem 0.85rem',
                      borderRadius: '8px',
                      border: '1px solid #e2e8f0',
                      background: '#ffffff',
                      cursor: 'pointer',
                      transition: 'background 0.15s ease',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                    }}
                    onMouseEnter={(e) => { e.currentTarget.style.background = '#f8fafc' }}
                    onMouseLeave={(e) => { e.currentTarget.style.background = '#ffffff' }}
                  >
                    <div>
                      <div style={{ fontWeight: '700', fontSize: '0.85rem', color: '#1e293b' }}>
                        {a.accountNumber ? <span style={{ color: '#7c3aed', marginRight: '0.4rem' }}>{a.accountNumber}</span> : null}
                        {a.accountName || a.companyName || 'Untitled Account'}
                      </div>
                      <div style={{ fontSize: '0.74rem', color: '#64748b', marginTop: '0.15rem' }}>
                        {a.customerName ? `Contact: ${a.customerName}` : ''} {a.phone ? `• Phone: ${a.phone}` : ''}
                      </div>
                    </div>
                    <button type="button" style={{ background: '#7c3aed', color: '#ffffff', border: 'none', borderRadius: '6px', padding: '0.25rem 0.6rem', fontSize: '0.72rem', fontWeight: '700' }}>
                      Select
                    </button>
                  </div>
                ))
              )
            )}

            {pickerModalType === 'quotation' && (
              filteredQuotations.length === 0 ? (
                <div style={{ padding: '2rem', textAlign: 'center', color: '#94a3b8' }}>No quotations found.</div>
              ) : (
                filteredQuotations.map((qt) => {
                  const qNum = qt.quotationNumber || qt.quoteNumber || `QT-${qt.id}`
                  return (
                    <div
                      key={qt.id || qNum}
                      onClick={() => {
                        const display = `[${qNum}] ${qt.title || qt.customerName || qt.accountName || ''}`
                        setQuotationId(String(qNum))
                        setQuotationTitle(display)
                        setPickerModalType(null)
                      }}
                      style={{
                        padding: '0.65rem 0.85rem',
                        borderRadius: '8px',
                        border: '1px solid #e2e8f0',
                        background: '#ffffff',
                        cursor: 'pointer',
                        transition: 'background 0.15s ease',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                      }}
                      onMouseEnter={(e) => { e.currentTarget.style.background = '#f8fafc' }}
                      onMouseLeave={(e) => { e.currentTarget.style.background = '#ffffff' }}
                    >
                      <div>
                        <div style={{ fontWeight: '700', fontSize: '0.85rem', color: '#1e293b' }}>
                          <span style={{ color: '#c60016', marginRight: '0.4rem' }}>{qNum}</span>
                          {qt.title || qt.customerName || qt.accountName || 'Untitled Quotation'}
                        </div>
                        <div style={{ fontSize: '0.74rem', color: '#64748b', marginTop: '0.15rem' }}>
                          {qt.totalAmount ? `Total: ₹${Number(qt.totalAmount).toLocaleString('en-IN')}` : ''}
                        </div>
                      </div>
                      <button type="button" style={{ background: '#c60016', color: '#ffffff', border: 'none', borderRadius: '6px', padding: '0.25rem 0.6rem', fontSize: '0.72rem', fontWeight: '700' }}>
                        Select
                      </button>
                    </div>
                  )
                })
              )
            )}
          </div>
        </div>
      </Modal>
    </TaskWorkspaceLayout>
  )
}

export default AddTaskPage
