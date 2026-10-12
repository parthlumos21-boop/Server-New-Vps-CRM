import React, { useState, useEffect, useMemo } from 'react'
import {
  FaTimes,
  FaTasks,
  FaUserCheck,
  FaSearch,
  FaCalendarAlt,
  FaPlus,
  FaTrash,
  FaProjectDiagram,
  FaHandshake,
  FaBuilding,
  FaFileInvoice,
  FaTag,
  FaCheck,
  FaClock,
} from 'react-icons/fa'
import { useAuth } from '../../context/AuthContext'
import { useData } from '../../context/DataContext'
import workManagementService from '../../services/workManagementService'

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

export const ProfessionalTaskModal = ({
  isOpen,
  onClose,
  taskData = null,
  initialStatus = 'open',
  initialProjectId = null,
  initialProjectTitle = '',
  onSuccess,
}) => {
  const { user } = useAuth()
  const { createTask, updateTask, addNotification } = useData()

  const [loading, setLoading] = useState(false)
  const [usersList, setUsersList] = useState([])
  const [projectsList, setProjectsList] = useState([])
  const [userSearchQuery, setUserSearchQuery] = useState('')

  // Form State
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [status, setStatus] = useState('open')
  const [priority, setPriority] = useState('medium')
  const [startDate, setStartDate] = useState(new Date().toISOString().slice(0, 10))
  const [dueDate, setDueDate] = useState('')
  const [estimatedHours, setEstimatedHours] = useState(4)
  const [slaPolicy, setSlaPolicy] = useState('standard_24h')

  // Multi-User Assignees
  const [selectedUserEmails, setSelectedUserEmails] = useState([])

  // CRM Entity Links
  const [projectId, setProjectId] = useState(initialProjectId ? String(initialProjectId) : '')
  const [dealId, setDealId] = useState('')
  const [accountId, setAccountId] = useState('')
  const [quotationId, setQuotationId] = useState('')
  const [customerId, setCustomerId] = useState('')

  // Checklist Subtasks
  const [subtasks, setSubtasks] = useState([])
  const [newSubtaskTitle, setNewSubtaskTitle] = useState('')

  // Tags
  const [tags, setTags] = useState([])

  // Fetch users directory from MongoDB & projects on mount
  useEffect(() => {
    if (!isOpen) return

    const loadDirectory = async () => {
      try {
        const overview = await workManagementService.getOverview()
        if (overview?.teamMembers) {
          setUsersList(overview.teamMembers)
        }
        const projects = await workManagementService.getProjects()
        setProjectsList(projects || [])
      } catch (err) {
        console.error('Failed to load users directory for task modal', err)
      }
    }
    loadDirectory()
  }, [isOpen])

  // Populate form if editing or initializing
  useEffect(() => {
    if (!isOpen) return

    if (taskData) {
      setTitle(taskData.title || '')
      setDescription(taskData.description || '')
      setStatus(taskData.status || 'open')
      setPriority(taskData.priority || 'medium')
      setStartDate(taskData.startDate ? taskData.startDate.slice(0, 10) : new Date().toISOString().slice(0, 10))
      setDueDate(taskData.dueDate ? taskData.dueDate.slice(0, 10) : '')
      setEstimatedHours(taskData.estimatedMinutes ? Math.round(taskData.estimatedMinutes / 60) : 4)
      setSlaPolicy(taskData.slaPolicy || 'standard_24h')

      const rawAssigned = Array.isArray(taskData.assignedToUserEmails) && taskData.assignedToUserEmails.length > 0
        ? taskData.assignedToUserEmails
        : (taskData.assignedTo ? [taskData.assignedTo] : [])
      setSelectedUserEmails(rawAssigned.map((e) => String(e).toLowerCase().trim()).filter(Boolean))

      setProjectId(taskData.projectId ? String(taskData.projectId) : '')
      setDealId(taskData.dealId ? String(taskData.dealId) : '')
      setAccountId(taskData.accountId ? String(taskData.accountId) : '')
      setQuotationId(taskData.quotationId ? String(taskData.quotationId) : '')
      setCustomerId(taskData.customerId ? String(taskData.customerId) : '')
      setSubtasks(Array.isArray(taskData.subtasks) ? taskData.subtasks : [])
      setTags(Array.isArray(taskData.tags) ? taskData.tags : [])
    } else {
      setTitle('')
      setDescription('')
      setStatus(initialStatus || 'open')
      setPriority('medium')
      setStartDate(new Date().toISOString().slice(0, 10))
      setDueDate('')
      setEstimatedHours(4)
      setSlaPolicy('standard_24h')
      setSelectedUserEmails(user?.email ? [user.email.toLowerCase().trim()] : [])
      setProjectId(initialProjectId ? String(initialProjectId) : '')
      setDealId('')
      setAccountId('')
      setQuotationId('')
      setCustomerId('')
      setSubtasks([])
      setTags([])
    }
    setUserSearchQuery('')
  }, [isOpen, taskData, initialStatus, initialProjectId, user])

  // Filter users based on search
  const filteredUsers = useMemo(() => {
    const q = userSearchQuery.trim().toLowerCase()
    if (!q) return usersList
    return usersList.filter((u) => {
      const name = String(u.name || '').toLowerCase()
      const email = String(u.email || '').toLowerCase()
      const dept = String(u.department || '').toLowerCase()
      return name.includes(q) || email.includes(q) || dept.includes(q)
    })
  }, [usersList, userSearchQuery])

  const toggleUserSelection = (email) => {
    const normalized = String(email || '').trim().toLowerCase()
    if (!normalized) return
    setSelectedUserEmails((prev) =>
      prev.includes(normalized) ? prev.filter((e) => e !== normalized) : [...prev, normalized]
    )
  }

  const handleSelectAllUsers = () => {
    const allFilteredEmails = filteredUsers.map((u) => String(u.email || '').trim().toLowerCase()).filter(Boolean)
    setSelectedUserEmails((prev) => Array.from(new Set([...prev, ...allFilteredEmails])))
  }

  const handleClearAllUsers = () => {
    setSelectedUserEmails([])
  }

  const handleAddSubtask = (e) => {
    e?.preventDefault()
    if (!newSubtaskTitle.trim()) return
    const newEntry = {
      id: `st-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      title: newSubtaskTitle.trim(),
      completed: false,
    }
    setSubtasks([...subtasks, newEntry])
    setNewSubtaskTitle('')
  }

  const handleRemoveSubtask = (stId) => {
    setSubtasks(subtasks.filter((s) => s.id !== stId))
  }

  const handleToggleSubtask = (stId) => {
    setSubtasks(subtasks.map((s) => (s.id === stId ? { ...s, completed: !s.completed } : s)))
  }

  const toggleTag = (tagName) => {
    setTags((prev) => (prev.includes(tagName) ? prev.filter((t) => t !== tagName) : [...prev, tagName]))
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
      const completedSubtasks = subtasks.filter((s) => Boolean(s.completed)).length
      const progress = subtasks.length > 0 ? Math.round((completedSubtasks / subtasks.length) * 100) : (status === 'completed' ? 100 : status === 'in_progress' ? 50 : 0)

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
        assignedTo: primaryEmail,
        assignedToUserEmails: selectedUserEmails,
        projectId: projectId ? String(projectId) : null,
        dealId: dealId.trim() || null,
        accountId: accountId.trim() || null,
        quotationId: quotationId.trim() || null,
        customerId: customerId.trim() || null,
        subtasks,
        progress,
        tags,
      }

      let res
      if (taskData?.id) {
        res = await updateTask(taskData.id, payload)
      } else {
        res = await createTask(payload)
      }

      if (res?.success !== false) {
        addNotification?.('success', 'Task Saved', `Task "${title}" ${taskData ? 'updated' : 'created'} successfully.`)
        onSuccess?.(res?.data)
        onClose()
      } else {
        addNotification?.('error', 'Save Failed', res?.message || 'Could not save task.')
      }
    } catch (err) {
      console.error('Failed to submit task', err)
      addNotification?.('error', 'Error', 'An unexpected error occurred while saving task.')
    } finally {
      setLoading(false)
    }
  }

  if (!isOpen) return null

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(15, 23, 42, 0.65)',
        backdropFilter: 'blur(4px)',
        zIndex: 9999,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '1rem',
      }}
      onClick={onClose}
    >
      <div
        style={{
          width: '100%',
          maxWidth: '860px',
          maxHeight: '92vh',
          background: '#ffffff',
          borderRadius: '20px',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
          border: '1.5px solid #e2e8f0',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          animation: 'fadeIn 0.2s ease',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Top Header with Swati Maroon Identity */}
        <div
          style={{
            padding: '1.25rem 1.75rem',
            background: 'linear-gradient(135deg, #c60016 0%, #80000e 100%)',
            color: '#ffffff',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <div
              style={{
                width: '42px',
                height: '42px',
                borderRadius: '12px',
                background: 'rgba(255, 255, 255, 0.15)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '1.2rem',
              }}
            >
              <FaTasks />
            </div>
            <div>
              <h2 style={{ margin: 0, fontSize: '1.15rem', fontWeight: '800', letterSpacing: '-0.01em' }}>
                {taskData ? 'Edit Task' : 'Create New Professional Task'}
              </h2>
              <p style={{ margin: '0.15rem 0 0', fontSize: '0.76rem', color: 'rgba(255, 255, 255, 0.85)' }}>
                Multi-User Assignment &bull; Real-Time MongoDB Persistence &bull; CRM Workflows
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            style={{
              background: 'rgba(255, 255, 255, 0.15)',
              border: 'none',
              borderRadius: '50%',
              width: '34px',
              height: '34px',
              color: '#ffffff',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transition: 'background 0.2s',
            }}
          >
            <FaTimes />
          </button>
        </div>

        {/* Scrollable Form Body */}
        <form
          onSubmit={handleSubmit}
          style={{
            flex: 1,
            overflowY: 'auto',
            padding: '1.5rem 1.75rem',
            display: 'flex',
            flexDirection: 'column',
            gap: '1.25rem',
          }}
        >
          {/* SECTION 1: Task Identity & Priority */}
          <div style={{ background: '#f8fafc', padding: '1.25rem', borderRadius: '16px', border: '1px solid #e2e8f0' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.75rem' }}>
              <span style={{ fontSize: '0.75rem', fontWeight: '800', color: '#c60016', textTransform: 'uppercase' }}>
                1. Task Identity & Priority
              </span>
            </div>

            <div style={{ marginBottom: '0.85rem' }}>
              <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: '700', color: '#1e293b', marginBottom: '0.35rem' }}>
                Task Title / Subject *
              </label>
              <input
                type="text"
                required
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. Electrical Panel Layout Verification & Component BOM Approval"
                style={{
                  width: '100%',
                  padding: '0.65rem 0.85rem',
                  borderRadius: '10px',
                  border: '1.5px solid #cbd5e1',
                  fontSize: '0.88rem',
                  fontWeight: '600',
                  color: '#1e293b',
                  outline: 'none',
                }}
              />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
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
                          padding: '0.45rem 0.2rem',
                          borderRadius: '8px',
                          border: isSelected ? `2px solid ${p.color}` : '1px solid #cbd5e1',
                          background: isSelected ? p.bg : '#ffffff',
                          color: isSelected ? p.color : '#64748b',
                          fontSize: '0.76rem',
                          fontWeight: '800',
                          cursor: 'pointer',
                          transition: 'all 0.15s ease',
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
                    padding: '0.5rem 0.75rem',
                    borderRadius: '10px',
                    border: '1.5px solid #cbd5e1',
                    fontSize: '0.84rem',
                    fontWeight: '700',
                    color: '#1e293b',
                    background: '#ffffff',
                  }}
                >
                  <option value="open">Open</option>
                  <option value="in_progress">In Progress</option>
                  <option value="review">Under Review</option>
                  <option value="completed">Completed</option>
                </select>
              </div>
            </div>

            <div style={{ marginTop: '0.85rem' }}>
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
                  padding: '0.55rem 0.75rem',
                  borderRadius: '10px',
                  border: '1.5px solid #cbd5e1',
                  fontSize: '0.84rem',
                  color: '#334155',
                  lineHeight: 1.45,
                  resize: 'vertical',
                }}
              />
            </div>
          </div>

          {/* SECTION 2: Multi-User Assignees with Checkboxes from MongoDB users */}
          <div style={{ background: '#ffffff', padding: '1.25rem', borderRadius: '16px', border: '1.5px solid #e2e8f0' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
                <FaUserCheck style={{ color: '#c60016' }} />
                <span style={{ fontSize: '0.75rem', fontWeight: '800', color: '#c60016', textTransform: 'uppercase' }}>
                  2. Assignees & Collaborators (MongoDB Users)
                </span>
                <span
                  style={{
                    background: '#fef2f2',
                    color: '#c60016',
                    fontSize: '0.72rem',
                    fontWeight: '800',
                    padding: '0.15rem 0.5rem',
                    borderRadius: '10px',
                  }}
                >
                  {selectedUserEmails.length} Selected
                </span>
              </div>

              <div style={{ display: 'flex', gap: '0.4rem' }}>
                <button
                  type="button"
                  onClick={handleSelectAllUsers}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: '#2563eb',
                    fontSize: '0.74rem',
                    fontWeight: '700',
                    cursor: 'pointer',
                    padding: '0.2rem',
                  }}
                >
                  Select All
                </button>
                <span style={{ color: '#cbd5e1' }}>|</span>
                <button
                  type="button"
                  onClick={handleClearAllUsers}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: '#64748b',
                    fontSize: '0.74rem',
                    fontWeight: '700',
                    cursor: 'pointer',
                    padding: '0.2rem',
                  }}
                >
                  Clear All
                </button>
              </div>
            </div>

            {/* Selected Users Pill Chips */}
            {selectedUserEmails.length > 0 && (
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem', marginBottom: '0.65rem' }}>
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
                        padding: '0.25rem 0.6rem',
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
                        style={{
                          background: 'none',
                          border: 'none',
                          color: '#991b1b',
                          cursor: 'pointer',
                          padding: 0,
                          fontSize: '0.72rem',
                          display: 'flex',
                        }}
                      >
                        <FaTimes />
                      </button>
                    </span>
                  )
                })}
              </div>
            )}

            {/* Search filter for MongoDB Users */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                padding: '0.4rem 0.75rem',
                borderRadius: '8px',
                border: '1px solid #cbd5e1',
                marginBottom: '0.65rem',
                background: '#f8fafc',
              }}
            >
              <FaSearch style={{ color: '#94a3b8', fontSize: '0.78rem' }} />
              <input
                type="text"
                value={userSearchQuery}
                onChange={(e) => setUserSearchQuery(e.target.value)}
                placeholder="Search user name, email, department..."
                style={{
                  border: 'none',
                  outline: 'none',
                  background: 'transparent',
                  width: '100%',
                  fontSize: '0.8rem',
                  color: '#1e293b',
                }}
              />
            </div>

            {/* Scrollable Checkbox List */}
            <div
              style={{
                maxHeight: '170px',
                overflowY: 'auto',
                border: '1px solid #e2e8f0',
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
                  No users matched search criteria.
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
                        padding: '0.45rem 0.6rem',
                        borderRadius: '8px',
                        cursor: 'pointer',
                        background: isChecked ? '#fef2f2' : '#ffffff',
                        border: isChecked ? '1px solid #fecaca' : '1px solid transparent',
                        transition: 'background 0.15s ease',
                      }}
                      onMouseEnter={(e) => {
                        if (!isChecked) e.currentTarget.style.background = '#f8fafc'
                      }}
                      onMouseLeave={(e) => {
                        if (!isChecked) e.currentTarget.style.background = '#ffffff'
                      }}
                    >
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={() => toggleUserSelection(email)}
                        style={{ accentColor: '#c60016', cursor: 'pointer', width: '15px', height: '15px' }}
                      />
                      <div
                        style={{
                          width: '26px',
                          height: '26px',
                          borderRadius: '50%',
                          background: isChecked ? '#c60016' : '#cbd5e1',
                          color: '#ffffff',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontSize: '0.68rem',
                          fontWeight: '800',
                          flexShrink: 0,
                        }}
                      >
                        {(u.name || email).slice(0, 2).toUpperCase()}
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: '0.8rem', fontWeight: '700', color: '#1e293b' }}>
                          {u.name || email}
                        </div>
                        <div style={{ fontSize: '0.7rem', color: '#64748b' }}>
                          {email}
                        </div>
                      </div>
                    </label>
                  )
                })
              )}
            </div>
          </div>

          {/* SECTION 3: CRM Entity Associations & Project Linking */}
          <div style={{ background: '#f8fafc', padding: '1.25rem', borderRadius: '16px', border: '1px solid #e2e8f0' }}>
            <span style={{ fontSize: '0.75rem', fontWeight: '800', color: '#c60016', textTransform: 'uppercase', display: 'block', marginBottom: '0.75rem' }}>
              3. CRM Workflow Linking & Project Association
            </span>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '0.85rem' }}>
              <div>
                <label style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', fontSize: '0.76rem', fontWeight: '700', color: '#475569', marginBottom: '0.25rem' }}>
                  <FaProjectDiagram style={{ color: '#c60016' }} /> Linked Project
                </label>
                <select
                  value={projectId}
                  onChange={(e) => setProjectId(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '0.5rem 0.65rem',
                    borderRadius: '8px',
                    border: '1px solid #cbd5e1',
                    fontSize: '0.8rem',
                    background: '#ffffff',
                    fontWeight: '600',
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

              <div>
                <label style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', fontSize: '0.76rem', fontWeight: '700', color: '#475569', marginBottom: '0.25rem' }}>
                  <FaHandshake style={{ color: '#2563eb' }} /> Deal Reference / ID
                </label>
                <input
                  type="text"
                  value={dealId}
                  onChange={(e) => setDealId(e.target.value)}
                  placeholder="e.g. DEAL-00128 or Deal title"
                  style={{ width: '100%', padding: '0.5rem 0.65rem', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.8rem', background: '#ffffff' }}
                />
              </div>

              <div>
                <label style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', fontSize: '0.76rem', fontWeight: '700', color: '#475569', marginBottom: '0.25rem' }}>
                  <FaBuilding style={{ color: '#7c3aed' }} /> Account (Lead) ID / Name
                </label>
                <input
                  type="text"
                  value={accountId}
                  onChange={(e) => setAccountId(e.target.value)}
                  placeholder="e.g. ACC-4082 or Account title"
                  style={{ width: '100%', padding: '0.5rem 0.65rem', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.8rem', background: '#ffffff' }}
                />
              </div>

              <div>
                <label style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', fontSize: '0.76rem', fontWeight: '700', color: '#475569', marginBottom: '0.25rem' }}>
                  <FaFileInvoice style={{ color: '#c60016' }} /> Quotation No.
                </label>
                <input
                  type="text"
                  value={quotationId}
                  onChange={(e) => setQuotationId(e.target.value)}
                  placeholder="e.g. QT-00128"
                  style={{ width: '100%', padding: '0.5rem 0.65rem', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.8rem', background: '#ffffff' }}
                />
              </div>
            </div>
          </div>

          {/* SECTION 4: Schedule, Due Date & SLA */}
          <div style={{ background: '#ffffff', padding: '1.25rem', borderRadius: '16px', border: '1.5px solid #e2e8f0' }}>
            <span style={{ fontSize: '0.75rem', fontWeight: '800', color: '#c60016', textTransform: 'uppercase', display: 'block', marginBottom: '0.75rem' }}>
              4. Schedule, Due Date & SLA Policy
            </span>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '0.85rem' }}>
              <div>
                <label style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', fontSize: '0.76rem', fontWeight: '700', color: '#475569', marginBottom: '0.25rem' }}>
                  <FaCalendarAlt /> Start Date
                </label>
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  style={{ width: '100%', padding: '0.5rem 0.65rem', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.8rem' }}
                />
              </div>

              <div>
                <label style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', fontSize: '0.76rem', fontWeight: '700', color: '#475569', marginBottom: '0.25rem' }}>
                  <FaCalendarAlt style={{ color: '#dc2626' }} /> Due Date *
                </label>
                <input
                  type="date"
                  value={dueDate}
                  onChange={(e) => setDueDate(e.target.value)}
                  style={{ width: '100%', padding: '0.5rem 0.65rem', borderRadius: '8px', border: '1.5px solid #cbd5e1', fontSize: '0.8rem', fontWeight: '700' }}
                />
              </div>

              <div>
                <label style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', fontSize: '0.76rem', fontWeight: '700', color: '#475569', marginBottom: '0.25rem' }}>
                  <FaClock /> Estimated Effort (Hours)
                </label>
                <input
                  type="number"
                  min="0.5"
                  step="0.5"
                  value={estimatedHours}
                  onChange={(e) => setEstimatedHours(Number(e.target.value))}
                  style={{ width: '100%', padding: '0.5rem 0.65rem', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.8rem' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.76rem', fontWeight: '700', color: '#475569', marginBottom: '0.25rem' }}>
                  SLA Target Policy
                </label>
                <select
                  value={slaPolicy}
                  onChange={(e) => setSlaPolicy(e.target.value)}
                  style={{ width: '100%', padding: '0.5rem 0.65rem', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.8rem' }}
                >
                  <option value="critical_4h">Critical SLA (4 Hours)</option>
                  <option value="high_8h">High SLA (8 Hours)</option>
                  <option value="standard_24h">Standard SLA (24 Hours)</option>
                  <option value="flexible_72h">Flexible SLA (3 Days)</option>
                </select>
              </div>
            </div>
          </div>

          {/* SECTION 5: Interactive Subtasks & Checklist */}
          <div style={{ background: '#f8fafc', padding: '1.25rem', borderRadius: '16px', border: '1px solid #e2e8f0' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
              <span style={{ fontSize: '0.75rem', fontWeight: '800', color: '#c60016', textTransform: 'uppercase' }}>
                5. Interactive Checklist & Subtasks
              </span>
              <span style={{ fontSize: '0.74rem', color: '#64748b', fontWeight: '700' }}>
                {subtasks.filter((s) => s.completed).length} / {subtasks.length} Completed
              </span>
            </div>

            <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.75rem' }}>
              <input
                type="text"
                value={newSubtaskTitle}
                onChange={(e) => setNewSubtaskTitle(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault()
                    handleAddSubtask()
                  }
                }}
                placeholder="Add checklist item (e.g. Verify single line diagram, check pricing)..."
                style={{
                  flex: 1,
                  padding: '0.45rem 0.75rem',
                  borderRadius: '8px',
                  border: '1px solid #cbd5e1',
                  fontSize: '0.82rem',
                  background: '#ffffff',
                }}
              />
              <button
                type="button"
                onClick={handleAddSubtask}
                style={{
                  padding: '0.45rem 0.85rem',
                  borderRadius: '8px',
                  background: '#c60016',
                  color: '#ffffff',
                  border: 'none',
                  fontSize: '0.8rem',
                  fontWeight: '700',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.35rem',
                }}
              >
                <FaPlus /> Add
              </button>
            </div>

            {subtasks.length > 0 && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                {subtasks.map((st) => (
                  <div
                    key={st.id}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.5rem',
                      padding: '0.35rem 0.6rem',
                      borderRadius: '8px',
                      background: st.completed ? '#f0fdf4' : '#ffffff',
                      border: '1px solid #e2e8f0',
                    }}
                  >
                    <input
                      type="checkbox"
                      checked={Boolean(st.completed)}
                      onChange={() => handleToggleSubtask(st.id)}
                      style={{ accentColor: '#15803d', cursor: 'pointer' }}
                    />
                    <span
                      style={{
                        flex: 1,
                        fontSize: '0.8rem',
                        color: st.completed ? '#64748b' : '#1e293b',
                        textDecoration: st.completed ? 'line-through' : 'none',
                      }}
                    >
                      {st.title}
                    </span>
                    <button
                      type="button"
                      onClick={() => handleRemoveSubtask(st.id)}
                      style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer', padding: '0 4px' }}
                    >
                      <FaTrash style={{ fontSize: '0.72rem' }} />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* SECTION 6: Preset Tags */}
          <div>
            <span style={{ fontSize: '0.75rem', fontWeight: '800', color: '#64748b', textTransform: 'uppercase', display: 'flex', alignItems: 'center', gap: '0.35rem', marginBottom: '0.4rem' }}>
              <FaTag /> Tags & Categories
            </span>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem' }}>
              {PRESET_TAGS.map((t) => {
                const isSelected = tags.includes(t)
                return (
                  <button
                    key={t}
                    type="button"
                    onClick={() => toggleTag(t)}
                    style={{
                      padding: '0.25rem 0.6rem',
                      borderRadius: '14px',
                      border: isSelected ? '1px solid #c60016' : '1px solid #cbd5e1',
                      background: isSelected ? '#fef2f2' : '#ffffff',
                      color: isSelected ? '#c60016' : '#475569',
                      fontSize: '0.74rem',
                      fontWeight: '700',
                      cursor: 'pointer',
                      transition: 'all 0.15s',
                    }}
                  >
                    {t}
                  </button>
                )
              })}
            </div>
          </div>

          {/* Form Bottom Action Bar */}
          <div
            style={{
              marginTop: '0.5rem',
              paddingTop: '1rem',
              borderTop: '1.5px solid #e2e8f0',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'flex-end',
              gap: '0.75rem',
            }}
          >
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              style={{
                padding: '0.6rem 1.25rem',
                borderRadius: '10px',
                border: '1px solid #cbd5e1',
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
                padding: '0.6rem 1.75rem',
                borderRadius: '10px',
                border: 'none',
                background: 'linear-gradient(135deg, #c60016 0%, #80000e 100%)',
                color: '#ffffff',
                fontSize: '0.84rem',
                fontWeight: '800',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                boxShadow: '0 4px 12px rgba(198, 0, 22, 0.25)',
              }}
            >
              {loading ? 'Saving...' : taskData ? 'Update Task' : 'Create Task'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default ProfessionalTaskModal
