import React, { useState, useEffect, useMemo, useRef } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
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
  FaPlus,
  FaTrash,
} from 'react-icons/fa'
import { useAuth } from '../../context/AuthContext'
import { useData } from '../../context/DataContext'
import { TaskWorkspaceLayout } from './components/common/TaskWorkspaceLayout'
import workManagementService from '../../services/workManagementService'
import { leadApi } from '../../services/leadApi'
import { dealApi } from '../../services/dealApi'
import { quotationApi } from '../../services/quotationApi'
import taskApi from '../../services/taskApi'

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

export const EditTaskPage = () => {
  const { taskId } = useParams()
  const { user } = useAuth()
  const { tasks, updateTask, addNotification } = useData()
  const navigate = useNavigate()

  const isAdmin = ['admin', 'super_admin'].includes(user?.role)

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [usersList, setUsersList] = useState([])
  const [projectsList, setProjectsList] = useState([])

  // CRM Entity collections for search pickers
  const [dealsList, setDealsList] = useState([])
  const [accountsList, setAccountsList] = useState([])
  const [quotationsList, setQuotationsList] = useState([])

  // Form state
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [status, setStatus] = useState('open')
  const [priority, setPriority] = useState('medium')
  const [startDate, setStartDate] = useState('')
  const [dueDate, setDueDate] = useState('')
  const [estimatedHours, setEstimatedHours] = useState(4)
  const [slaPolicy, setSlaPolicy] = useState('standard_24h')
  const [tags, setTags] = useState([])

  // Assignees
  const [selectedUserEmails, setSelectedUserEmails] = useState([])
  const [userSearchQuery, setUserSearchQuery] = useState('')

  // CRM Links
  const [projectId, setProjectId] = useState('')
  const [dealId, setDealId] = useState('')
  const [dealTitle, setDealTitle] = useState('')
  const [accountId, setAccountId] = useState('')
  const [accountTitle, setAccountTitle] = useState('')
  const [quotationId, setQuotationId] = useState('')
  const [quotationTitle, setQuotationTitle] = useState('')

  // Subtasks checklist
  const [subtasks, setSubtasks] = useState([])
  const [newSubtaskTitle, setNewSubtaskTitle] = useState('')

  // Dropdown Picker state with integrated top search
  const [activeDropdownField, setActiveDropdownField] = useState(null)
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
        console.error('Failed to load CRM data for EditTaskPage', err)
      }
    }
    loadAllData()
  }, [])

  // Fetch task data to edit
  useEffect(() => {
    if (!taskId) return
    const fetchTask = async () => {
      try {
        setLoading(true)
        // First check in-memory tasks
        let target = (tasks || []).find((t) => String(t.id) === String(taskId))
        if (!target) {
          target = await taskApi.getTaskById(taskId)
        }
        if (target) {
          setTitle(target.title || '')
          setDescription(target.description || '')
          setStatus(target.status || 'open')
          setPriority(target.priority || 'medium')
          setStartDate(target.startDate ? target.startDate.slice(0, 10) : '')
          setDueDate(target.dueDate ? target.dueDate.slice(0, 10) : '')
          setEstimatedHours(target.estimatedMinutes ? Math.round(target.estimatedMinutes / 60) : 4)
          setSlaPolicy(target.slaPolicy || 'standard_24h')
          setTags(Array.isArray(target.tags) ? target.tags : [])

          const assignees = Array.isArray(target.assignedToUserEmails) && target.assignedToUserEmails.length > 0
            ? target.assignedToUserEmails
            : (target.assignedTo ? [target.assignedTo] : [])
          setSelectedUserEmails(assignees.map((e) => String(e).toLowerCase().trim()))

          setProjectId(target.projectId ? String(target.projectId) : '')
          setDealId(target.dealId ? String(target.dealId) : '')
          setAccountId(target.accountId ? String(target.accountId) : '')
          setQuotationId(target.quotationId ? String(target.quotationId) : '')
          setSubtasks(Array.isArray(target.subtasks) ? target.subtasks : [])
        } else {
          addNotification?.('error', 'Not Found', 'Task could not be found.')
        }
      } catch (err) {
        console.error('Failed to fetch task for editing', err)
        addNotification?.('error', 'Fetch Error', 'Failed to retrieve task details.')
      } finally {
        setLoading(false)
      }
    }
    fetchTask()
  }, [taskId, tasks])

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
    const deals = {}
    dealsList.forEach((d) => {
      const id = String(d.id || d._id || d.dealId)
      deals[id] = d.title || d.dealTitle || d.name || `Deal #${id}`
    })

    const accounts = {}
    accountsList.forEach((a) => {
      const id = String(a.id || a._id || a.accountId)
      accounts[id] = a.accountName || a.companyName || a.name || `Account #${id}`
    })

    const quotations = {}
    quotationsList.forEach((q) => {
      const id = String(q.id || q._id || q.quotationId || q.quotationNo)
      quotations[id] = q.quotationNo || q.title || `Quotation #${id}`
    })

    return { deals, accounts, quotations }
  }, [dealsList, accountsList, quotationsList])

  useEffect(() => {
    if (dealId && lookupMaps.deals[dealId]) {
      setDealTitle(lookupMaps.deals[dealId])
    }
    if (accountId && lookupMaps.accounts[accountId]) {
      setAccountTitle(lookupMaps.accounts[accountId])
    }
    if (quotationId && lookupMaps.quotations[quotationId]) {
      setQuotationTitle(lookupMaps.quotations[quotationId])
    }
  }, [dealId, accountId, quotationId, lookupMaps])

  const handleAddSubtask = (e) => {
    if (e) e.preventDefault()
    const trimmed = newSubtaskTitle.trim()
    if (!trimmed) return
    setSubtasks((prev) => [
      ...prev,
      { id: Date.now().toString(), title: trimmed, completed: false },
    ])
    setNewSubtaskTitle('')
  }

  const handleToggleSubtask = (id) => {
    setSubtasks((prev) =>
      prev.map((s) => (s.id === id ? { ...s, completed: !s.completed } : s))
    )
  }

  const handleDeleteSubtask = (id) => {
    setSubtasks((prev) => prev.filter((s) => s.id !== id))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!title.trim()) {
      addNotification?.('error', 'Validation Error', 'Task title is required.')
      return
    }

    try {
      setSaving(true)
      const primaryEmail = selectedUserEmails[0] || (user?.email ? user.email.toLowerCase() : '')

      const totalSub = subtasks.length
      const compSub = subtasks.filter((s) => s.completed).length
      const progressPercent = totalSub > 0 ? Math.round((compSub / totalSub) * 100) : (status === 'completed' ? 100 : 0)

      const payload = {
        title: title.trim(),
        description: description.trim(),
        status,
        priority,
        startDate: startDate ? new Date(startDate).toISOString() : null,
        dueDate: dueDate ? new Date(dueDate).toISOString() : null,
        estimatedMinutes: Number(estimatedHours || 0) * 60,
        slaDeadline: dueDate ? new Date(dueDate).toISOString() : null,
        slaPolicy,
        assignedTo: primaryEmail,
        assignedToUserEmails: selectedUserEmails,
        projectId: projectId || null,
        dealId: dealId || null,
        accountId: accountId || null,
        quotationId: quotationId || null,
        subtasks,
        progress: progressPercent,
        tags,
      }

      const res = await updateTask(taskId, payload)
      if (res?.success || res?.id || res) {
        addNotification?.('success', 'Task Updated', 'Enterprise task updated successfully.')
        navigate(isAdmin ? '/admin/tasks/all' : '/tasks/all')
      } else {
        addNotification?.('error', 'Update Failed', res?.message || 'Could not update task.')
      }
    } catch (err) {
      console.error('Failed to update task', err)
      addNotification?.('error', 'Error', 'An unexpected error occurred.')
    } finally {
      setSaving(false)
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
                Update Task #{taskId}{title ? ` - ${title}` : ''}
              </h2>
              <p style={{ margin: '0.15rem 0 0', fontSize: '0.8rem', color: '#64748b' }}>
                Update task schedule, assignees, checklist subtasks, and CRM workflow links.
              </p>
            </div>
          </div>
          <button
            type="button"
            className="ap-header-item-btn"
            onClick={() => navigate(isAdmin ? '/admin/tasks/all' : '/tasks/all')}
          >
            <span>Cancel</span>
          </button>
        </div>

        {loading ? (
          <div style={{ padding: '3rem', textAlign: 'center', color: '#64748b', background: '#ffffff', borderRadius: '16px', border: '1.5px solid #e2e8f0' }}>
            Loading task details...
          </div>
        ) : (
          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            {/* CARD 1: Core Details */}
            <div
              style={{
                background: '#ffffff',
                border: '1.5px solid #e2e8f0',
                borderRadius: '20px',
                padding: '1.35rem',
                boxShadow: '0 4px 18px rgba(0, 0, 0, 0.03)',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem', borderBottom: '1px solid #f1f5f9', paddingBottom: '0.75rem' }}>
                <FaTasks style={{ color: '#c60016' }} />
                <h3 style={{ margin: 0, fontSize: '0.98rem', fontWeight: '800', color: '#1e293b' }}>
                  General Information
                </h3>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: '700', color: '#475569', marginBottom: '0.35rem' }}>
                    Task Title <span style={{ color: '#dc2626' }}>*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="e.g. Design electrical control panel layout"
                    style={{
                      width: '100%',
                      padding: '0.55rem 0.85rem',
                      borderRadius: '10px',
                      border: '1px solid #cbd5e1',
                      fontSize: '0.86rem',
                      outline: 'none',
                      background: '#ffffff',
                    }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: '700', color: '#475569', marginBottom: '0.35rem' }}>
                    Detailed Scope & Description
                  </label>
                  <textarea
                    rows={4}
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Specify project goals, client requirements, milestones, or execution constraints..."
                    style={{
                      width: '100%',
                      padding: '0.55rem 0.85rem',
                      borderRadius: '10px',
                      border: '1px solid #cbd5e1',
                      fontSize: '0.84rem',
                      outline: 'none',
                      resize: 'vertical',
                      background: '#ffffff',
                      fontFamily: 'inherit',
                    }}
                  />
                </div>

                {/* Status, Priority, SLA & Dates Grid */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.76rem', fontWeight: '700', color: '#475569', marginBottom: '0.3rem' }}>
                      Status
                    </label>
                    <select
                      value={status}
                      onChange={(e) => setStatus(e.target.value)}
                      style={{
                        width: '100%',
                        padding: '0.5rem 0.75rem',
                        borderRadius: '10px',
                        border: '1px solid #cbd5e1',
                        fontSize: '0.82rem',
                        fontWeight: '600',
                        background: '#ffffff',
                      }}
                    >
                      <option value="open">Open</option>
                      <option value="in_progress">In Progress</option>
                      <option value="review">Under Review</option>
                      <option value="completed">Completed</option>
                      <option value="blocked">Blocked</option>
                    </select>
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '0.76rem', fontWeight: '700', color: '#475569', marginBottom: '0.3rem' }}>
                      Priority
                    </label>
                    <select
                      value={priority}
                      onChange={(e) => setPriority(e.target.value)}
                      style={{
                        width: '100%',
                        padding: '0.5rem 0.75rem',
                        borderRadius: '10px',
                        border: '1px solid #cbd5e1',
                        fontSize: '0.82rem',
                        fontWeight: '600',
                        background: '#ffffff',
                      }}
                    >
                      <option value="urgent">Urgent</option>
                      <option value="high">High</option>
                      <option value="medium">Medium</option>
                      <option value="low">Low</option>
                    </select>
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '0.76rem', fontWeight: '700', color: '#475569', marginBottom: '0.3rem' }}>
                      Start Date
                    </label>
                    <input
                      type="date"
                      value={startDate}
                      onChange={(e) => setStartDate(e.target.value)}
                      style={{
                        width: '100%',
                        padding: '0.45rem 0.75rem',
                        borderRadius: '10px',
                        border: '1px solid #cbd5e1',
                        fontSize: '0.82rem',
                        background: '#ffffff',
                      }}
                    />
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '0.76rem', fontWeight: '700', color: '#475569', marginBottom: '0.3rem' }}>
                      Due Date (SLA Target)
                    </label>
                    <input
                      type="date"
                      value={dueDate}
                      onChange={(e) => setDueDate(e.target.value)}
                      style={{
                        width: '100%',
                        padding: '0.45rem 0.75rem',
                        borderRadius: '10px',
                        border: '1px solid #cbd5e1',
                        fontSize: '0.82rem',
                        background: '#ffffff',
                      }}
                    />
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '0.76rem', fontWeight: '700', color: '#475569', marginBottom: '0.3rem' }}>
                      Estimated Hours
                    </label>
                    <input
                      type="number"
                      min="0.5"
                      step="0.5"
                      value={estimatedHours}
                      onChange={(e) => setEstimatedHours(e.target.value)}
                      style={{
                        width: '100%',
                        padding: '0.45rem 0.75rem',
                        borderRadius: '10px',
                        border: '1px solid #cbd5e1',
                        fontSize: '0.82rem',
                        background: '#ffffff',
                      }}
                    />
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '0.76rem', fontWeight: '700', color: '#475569', marginBottom: '0.3rem' }}>
                      SLA Resolution Policy
                    </label>
                    <select
                      value={slaPolicy}
                      onChange={(e) => setSlaPolicy(e.target.value)}
                      style={{
                        width: '100%',
                        padding: '0.5rem 0.75rem',
                        borderRadius: '10px',
                        border: '1px solid #cbd5e1',
                        fontSize: '0.82rem',
                        background: '#ffffff',
                      }}
                    >
                      <option value="critical_4h">Critical 4-Hour Response</option>
                      <option value="standard_24h">Standard 24-Hour Delivery</option>
                      <option value="extended_72h">Extended 72-Hour Project SLA</option>
                    </select>
                  </div>
                </div>
              </div>
            </div>

            {/* CARD 2: Multi-User Assignees (MongoDB Users Directory) */}
            <div
              style={{
                background: '#ffffff',
                border: '1.5px solid #e2e8f0',
                borderRadius: '20px',
                padding: '1.35rem',
                boxShadow: '0 4px 18px rgba(0, 0, 0, 0.03)',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.75rem', borderBottom: '1px solid #f1f5f9', paddingBottom: '0.75rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <FaUserCheck style={{ color: '#c60016' }} />
                  <h3 style={{ margin: 0, fontSize: '0.98rem', fontWeight: '800', color: '#1e293b' }}>
                    Team Members & Multi-Assignees
                  </h3>
                </div>
                <span style={{ fontSize: '0.76rem', fontWeight: '700', color: '#c60016', background: '#fef2f2', padding: '0.2rem 0.55rem', borderRadius: '12px' }}>
                  {selectedUserEmails.length} selected
                </span>
              </div>

              {/* Search bar inside assignees */}
              <div style={{ position: 'relative', marginBottom: '0.75rem' }}>
                <FaSearch style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8', fontSize: '0.75rem' }} />
                <input
                  type="text"
                  placeholder="Filter users by name or email..."
                  value={userSearchQuery}
                  onChange={(e) => setUserSearchQuery(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '0.45rem 0.75rem 0.45rem 2.1rem',
                    borderRadius: '10px',
                    border: '1px solid #cbd5e1',
                    fontSize: '0.8rem',
                    outline: 'none',
                    background: '#f8fafc',
                  }}
                />
              </div>

              <div
                style={{
                  maxHeight: '220px',
                  overflowY: 'auto',
                  border: '1px solid #e2e8f0',
                  borderRadius: '12px',
                  padding: '0.5rem',
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
                  gap: '0.45rem',
                  background: '#fafbfc',
                }}
              >
                {filteredUsers.length === 0 ? (
                  <div style={{ padding: '1rem', textAlign: 'center', color: '#64748b', fontSize: '0.78rem', gridColumn: '1 / -1' }}>
                    No users matching "{userSearchQuery}"
                  </div>
                ) : (
                  filteredUsers.map((usr) => {
                    const email = String(usr.email || '').toLowerCase().trim()
                    const isChecked = selectedUserEmails.includes(email)
                    return (
                      <label
                        key={email}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '0.6rem',
                          padding: '0.45rem 0.65rem',
                          borderRadius: '8px',
                          border: isChecked ? '1.5px solid #c60016' : '1px solid #e2e8f0',
                          background: isChecked ? '#fef2f2' : '#ffffff',
                          cursor: 'pointer',
                          transition: 'all 0.15s ease',
                        }}
                      >
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => toggleUserSelection(email)}
                          style={{ accentColor: '#c60016', cursor: 'pointer' }}
                        />
                        <div style={{ minWidth: 0, flex: 1 }}>
                          <div style={{ fontWeight: '700', fontSize: '0.8rem', color: isChecked ? '#990011' : '#1e293b', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                            {usr.name || email.split('@')[0]}
                          </div>
                          <div style={{ fontSize: '0.7rem', color: '#64748b', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                            {email} &bull; <span style={{ textTransform: 'capitalize' }}>{usr.role || 'user'}</span>
                          </div>
                        </div>
                      </label>
                    )
                  })
                )}
              </div>
            </div>

            {/* CARD 3: Checklist & Subtasks */}
            <div
              style={{
                background: '#ffffff',
                border: '1.5px solid #e2e8f0',
                borderRadius: '20px',
                padding: '1.35rem',
                boxShadow: '0 4px 18px rgba(0, 0, 0, 0.03)',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.75rem', borderBottom: '1px solid #f1f5f9', paddingBottom: '0.75rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <FaCheck style={{ color: '#15803d' }} />
                  <h3 style={{ margin: 0, fontSize: '0.98rem', fontWeight: '800', color: '#1e293b' }}>
                    Checklist & Subtasks ({subtasks.filter((s) => s.completed).length} / {subtasks.length})
                  </h3>
                </div>
              </div>

              {/* Add subtask row */}
              <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.75rem' }}>
                <input
                  type="text"
                  placeholder="Add a checklist step / subtask..."
                  value={newSubtaskTitle}
                  onChange={(e) => setNewSubtaskTitle(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault()
                      handleAddSubtask()
                    }
                  }}
                  style={{
                    flex: 1,
                    padding: '0.45rem 0.75rem',
                    borderRadius: '10px',
                    border: '1px solid #cbd5e1',
                    fontSize: '0.82rem',
                    outline: 'none',
                    background: '#ffffff',
                  }}
                />
                <button
                  type="button"
                  onClick={handleAddSubtask}
                  style={{
                    padding: '0.45rem 0.85rem',
                    borderRadius: '10px',
                    border: 'none',
                    background: '#15803d',
                    color: '#ffffff',
                    fontWeight: '700',
                    fontSize: '0.8rem',
                    cursor: 'pointer',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '0.35rem',
                  }}
                >
                  <FaPlus /> <span>Add</span>
                </button>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.45rem' }}>
                {subtasks.length === 0 ? (
                  <div style={{ fontSize: '0.78rem', color: '#94a3b8', fontStyle: 'italic', padding: '0.5rem 0' }}>
                    No subtasks added yet.
                  </div>
                ) : (
                  subtasks.map((st) => (
                    <div
                      key={st.id}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        padding: '0.45rem 0.65rem',
                        borderRadius: '8px',
                        background: st.completed ? '#f0fdf4' : '#f8fafc',
                        border: '1px solid #e2e8f0',
                      }}
                    >
                      <label style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', cursor: 'pointer', flex: 1 }}>
                        <input
                          type="checkbox"
                          checked={Boolean(st.completed)}
                          onChange={() => handleToggleSubtask(st.id)}
                          style={{ accentColor: '#15803d', cursor: 'pointer' }}
                        />
                        <span style={{ textDecoration: st.completed ? 'line-through' : 'none', color: st.completed ? '#64748b' : '#1e293b', fontSize: '0.82rem' }}>
                          {st.title}
                        </span>
                      </label>
                      <button
                        type="button"
                        onClick={() => handleDeleteSubtask(st.id)}
                        style={{
                          background: 'none',
                          border: 'none',
                          color: '#dc2626',
                          cursor: 'pointer',
                          padding: '0.2rem',
                          fontSize: '0.75rem',
                        }}
                        title="Delete subtask"
                      >
                        <FaTrash />
                      </button>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* CARD 4: CRM Cross-Referencing & Workflow Links */}
            <div
              ref={dropdownRef}
              style={{
                background: '#ffffff',
                border: '1.5px solid #e2e8f0',
                borderRadius: '20px',
                padding: '1.35rem',
                boxShadow: '0 4px 18px rgba(0, 0, 0, 0.03)',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem', borderBottom: '1px solid #f1f5f9', paddingBottom: '0.75rem' }}>
                <FaProjectDiagram style={{ color: '#7c3aed' }} />
                <h3 style={{ margin: 0, fontSize: '0.98rem', fontWeight: '800', color: '#1e293b' }}>
                  Enterprise CRM Connections
                </h3>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1rem' }}>
                {/* Project Picker */}
                <div>
                  <label style={{ display: 'block', fontSize: '0.76rem', fontWeight: '700', color: '#475569', marginBottom: '0.3rem' }}>
                    Associated Project
                  </label>
                  <select
                    value={projectId}
                    onChange={(e) => setProjectId(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '0.5rem 0.75rem',
                      borderRadius: '10px',
                      border: '1px solid #cbd5e1',
                      fontSize: '0.82rem',
                      background: '#ffffff',
                    }}
                  >
                    <option value="">-- No Project Selected --</option>
                    {projectsList.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name} ({p.projectCode})
                      </option>
                    ))}
                  </select>
                </div>

                {/* Deal Picker */}
                <div style={{ position: 'relative' }}>
                  <label style={{ display: 'block', fontSize: '0.76rem', fontWeight: '700', color: '#475569', marginBottom: '0.3rem' }}>
                    Deal Link
                  </label>
                  <div
                    onClick={() => {
                      setActiveDropdownField(activeDropdownField === 'deal' ? null : 'deal')
                      setDropdownSearch('')
                    }}
                    style={{
                      padding: '0.5rem 0.75rem',
                      borderRadius: '10px',
                      border: '1px solid #cbd5e1',
                      fontSize: '0.82rem',
                      background: '#ffffff',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                    }}
                  >
                    <span style={{ color: dealId ? '#1e293b' : '#94a3b8', fontWeight: dealId ? '700' : '400', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {dealId ? `${dealTitle || `Deal #${dealId}`}` : '-- Link a Deal --'}
                    </span>
                    {dealId && (
                      <FaTimes
                        onClick={(e) => {
                          e.stopPropagation()
                          setDealId('')
                          setDealTitle('')
                        }}
                        style={{ color: '#94a3b8', cursor: 'pointer', fontSize: '0.75rem' }}
                      />
                    )}
                  </div>
                  {activeDropdownField === 'deal' && (
                    <div
                      style={{
                        position: 'absolute',
                        top: '100%',
                        left: 0,
                        right: 0,
                        marginTop: '4px',
                        background: '#ffffff',
                        border: '1.5px solid #cbd5e1',
                        borderRadius: '10px',
                        boxShadow: '0 8px 24px rgba(0, 0, 0, 0.12)',
                        zIndex: 30,
                        maxHeight: '200px',
                        overflowY: 'auto',
                        padding: '0.4rem',
                      }}
                    >
                      <input
                        type="text"
                        placeholder="Search deals..."
                        value={dropdownSearch}
                        onChange={(e) => setDropdownSearch(e.target.value)}
                        autoFocus
                        style={{ width: '100%', padding: '0.35rem 0.5rem', marginBottom: '0.4rem', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.76rem', outline: 'none' }}
                      />
                      {dealsList
                        .filter((d) => {
                          const str = `${d.title || d.dealTitle || d.name || ''} ${d.id || d._id || ''}`.toLowerCase()
                          return str.includes(dropdownSearch.toLowerCase())
                        })
                        .map((d) => {
                          const id = String(d.id || d._id || d.dealId)
                          const tName = d.title || d.dealTitle || d.name || `Deal #${id}`
                          return (
                            <div
                              key={id}
                              onClick={() => {
                                setDealId(id)
                                setDealTitle(tName)
                                setActiveDropdownField(null)
                              }}
                              style={{ padding: '0.4rem 0.6rem', borderRadius: '6px', cursor: 'pointer', fontSize: '0.78rem', hover: { background: '#f8fafc' } }}
                            >
                              <div style={{ fontWeight: '700', color: '#1e293b' }}>{tName}</div>
                              <span style={{ fontSize: '0.68rem', color: '#64748b' }}>Deal ID: #{id}</span>
                            </div>
                          )
                        })}
                    </div>
                  )}
                </div>

                {/* Account Picker */}
                <div style={{ position: 'relative' }}>
                  <label style={{ display: 'block', fontSize: '0.76rem', fontWeight: '700', color: '#475569', marginBottom: '0.3rem' }}>
                    Account Link
                  </label>
                  <div
                    onClick={() => {
                      setActiveDropdownField(activeDropdownField === 'account' ? null : 'account')
                      setDropdownSearch('')
                    }}
                    style={{
                      padding: '0.5rem 0.75rem',
                      borderRadius: '10px',
                      border: '1px solid #cbd5e1',
                      fontSize: '0.82rem',
                      background: '#ffffff',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                    }}
                  >
                    <span style={{ color: accountId ? '#1e293b' : '#94a3b8', fontWeight: accountId ? '700' : '400', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {accountId ? `${accountTitle || `Account #${accountId}`}` : '-- Link an Account --'}
                    </span>
                    {accountId && (
                      <FaTimes
                        onClick={(e) => {
                          e.stopPropagation()
                          setAccountId('')
                          setAccountTitle('')
                        }}
                        style={{ color: '#94a3b8', cursor: 'pointer', fontSize: '0.75rem' }}
                      />
                    )}
                  </div>
                  {activeDropdownField === 'account' && (
                    <div
                      style={{
                        position: 'absolute',
                        top: '100%',
                        left: 0,
                        right: 0,
                        marginTop: '4px',
                        background: '#ffffff',
                        border: '1.5px solid #cbd5e1',
                        borderRadius: '10px',
                        boxShadow: '0 8px 24px rgba(0, 0, 0, 0.12)',
                        zIndex: 30,
                        maxHeight: '200px',
                        overflowY: 'auto',
                        padding: '0.4rem',
                      }}
                    >
                      <input
                        type="text"
                        placeholder="Search accounts..."
                        value={dropdownSearch}
                        onChange={(e) => setDropdownSearch(e.target.value)}
                        autoFocus
                        style={{ width: '100%', padding: '0.35rem 0.5rem', marginBottom: '0.4rem', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.76rem', outline: 'none' }}
                      />
                      {accountsList
                        .filter((a) => {
                          const str = `${a.accountName || a.companyName || a.name || ''} ${a.id || a._id || ''}`.toLowerCase()
                          return str.includes(dropdownSearch.toLowerCase())
                        })
                        .map((a) => {
                          const id = String(a.id || a._id || a.accountId)
                          const aName = a.accountName || a.companyName || a.name || `Account #${id}`
                          return (
                            <div
                              key={id}
                              onClick={() => {
                                setAccountId(id)
                                setAccountTitle(aName)
                                setActiveDropdownField(null)
                              }}
                              style={{ padding: '0.4rem 0.6rem', borderRadius: '6px', cursor: 'pointer', fontSize: '0.78rem' }}
                            >
                              <div style={{ fontWeight: '700', color: '#1e293b' }}>{aName}</div>
                              <span style={{ fontSize: '0.68rem', color: '#64748b' }}>Account ID: #{id}</span>
                            </div>
                          )
                        })}
                    </div>
                  )}
                </div>

                {/* Quotation Picker */}
                <div style={{ position: 'relative' }}>
                  <label style={{ display: 'block', fontSize: '0.76rem', fontWeight: '700', color: '#475569', marginBottom: '0.3rem' }}>
                    Quotation Link
                  </label>
                  <div
                    onClick={() => {
                      setActiveDropdownField(activeDropdownField === 'quotation' ? null : 'quotation')
                      setDropdownSearch('')
                    }}
                    style={{
                      padding: '0.5rem 0.75rem',
                      borderRadius: '10px',
                      border: '1px solid #cbd5e1',
                      fontSize: '0.82rem',
                      background: '#ffffff',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                    }}
                  >
                    <span style={{ color: quotationId ? '#1e293b' : '#94a3b8', fontWeight: quotationId ? '700' : '400', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {quotationId ? `${quotationTitle || `QT #${quotationId}`}` : '-- Link a Quotation --'}
                    </span>
                    {quotationId && (
                      <FaTimes
                        onClick={(e) => {
                          e.stopPropagation()
                          setQuotationId('')
                          setQuotationTitle('')
                        }}
                        style={{ color: '#94a3b8', cursor: 'pointer', fontSize: '0.75rem' }}
                      />
                    )}
                  </div>
                  {activeDropdownField === 'quotation' && (
                    <div
                      style={{
                        position: 'absolute',
                        top: '100%',
                        left: 0,
                        right: 0,
                        marginTop: '4px',
                        background: '#ffffff',
                        border: '1.5px solid #cbd5e1',
                        borderRadius: '10px',
                        boxShadow: '0 8px 24px rgba(0, 0, 0, 0.12)',
                        zIndex: 30,
                        maxHeight: '200px',
                        overflowY: 'auto',
                        padding: '0.4rem',
                      }}
                    >
                      <input
                        type="text"
                        placeholder="Search quotations..."
                        value={dropdownSearch}
                        onChange={(e) => setDropdownSearch(e.target.value)}
                        autoFocus
                        style={{ width: '100%', padding: '0.35rem 0.5rem', marginBottom: '0.4rem', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.76rem', outline: 'none' }}
                      />
                      {quotationsList
                        .filter((q) => {
                          const str = `${q.quotationNo || q.title || ''} ${q.id || q._id || ''}`.toLowerCase()
                          return str.includes(dropdownSearch.toLowerCase())
                        })
                        .map((q) => {
                          const id = String(q.id || q._id || q.quotationId || q.quotationNo)
                          const qName = q.quotationNo || q.title || `Quotation #${id}`
                          return (
                            <div
                              key={id}
                              onClick={() => {
                                setQuotationId(id)
                                setQuotationTitle(qName)
                                setActiveDropdownField(null)
                              }}
                              style={{ padding: '0.4rem 0.6rem', borderRadius: '6px', cursor: 'pointer', fontSize: '0.78rem' }}
                            >
                              <div style={{ fontWeight: '700', color: '#1e293b' }}>{qName}</div>
                              <span style={{ fontSize: '0.68rem', color: '#64748b' }}>Quotation ID: #{id}</span>
                            </div>
                          )
                        })}
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* CARD 5: Preset Tags */}
            <div
              style={{
                background: '#ffffff',
                border: '1.5px solid #e2e8f0',
                borderRadius: '20px',
                padding: '1.35rem',
                boxShadow: '0 4px 18px rgba(0, 0, 0, 0.03)',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.75rem', borderBottom: '1px solid #f1f5f9', paddingBottom: '0.75rem' }}>
                <FaTag style={{ color: '#c60016' }} />
                <h3 style={{ margin: 0, fontSize: '0.98rem', fontWeight: '800', color: '#1e293b' }}>
                  Tags & Taxonomy
                </h3>
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.45rem' }}>
                {PRESET_TAGS.map((tg) => {
                  const isSelected = tags.includes(tg)
                  return (
                    <button
                      key={tg}
                      type="button"
                      onClick={() => toggleTag(tg)}
                      style={{
                        padding: '0.35rem 0.75rem',
                        borderRadius: '20px',
                        border: isSelected ? '1.5px solid #c60016' : '1px solid #cbd5e1',
                        background: isSelected ? '#fef2f2' : '#ffffff',
                        color: isSelected ? '#c60016' : '#475569',
                        fontWeight: '700',
                        fontSize: '0.75rem',
                        cursor: 'pointer',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '0.35rem',
                        transition: 'all 0.15s ease',
                      }}
                    >
                      {isSelected && <FaCheck style={{ fontSize: '0.65rem' }} />}
                      <span>{tg}</span>
                    </button>
                  )
                })}
              </div>
            </div>

            {/* Sticky Action Footer */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'flex-end',
                gap: '0.75rem',
                marginTop: '1rem',
              }}
            >
              <button
                type="button"
                onClick={() => navigate(isAdmin ? '/admin/tasks/all' : '/tasks/all')}
                style={{
                  padding: '0.65rem 1.25rem',
                  borderRadius: '12px',
                  border: '1.5px solid #cbd5e1',
                  background: '#ffffff',
                  color: '#475569',
                  fontWeight: '700',
                  fontSize: '0.84rem',
                  cursor: 'pointer',
                }}
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={saving}
                style={{
                  padding: '0.65rem 1.5rem',
                  borderRadius: '12px',
                  border: 'none',
                  background: 'linear-gradient(135deg, #c60016 0%, #80000e 100%)',
                  color: '#ffffff',
                  fontWeight: '800',
                  fontSize: '0.86rem',
                  cursor: saving ? 'not-allowed' : 'pointer',
                  boxShadow: '0 4px 14px rgba(198, 0, 22, 0.28)',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.45rem',
                }}
              >
                <FaCheck />
                <span>{saving ? 'Saving Changes...' : 'Update Task'}</span>
              </button>
            </div>
          </form>
        )}
      </div>
    </TaskWorkspaceLayout>
  )
}

export default EditTaskPage
