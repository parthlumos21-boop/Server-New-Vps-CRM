import React, { useState, useEffect, useMemo, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  FaProjectDiagram,
  FaPlus,
  FaCheckCircle,
  FaClock,
  FaCalendarAlt,
  FaSyncAlt,
  FaFolderOpen,
  FaUserPlus,
  FaUsers,
  FaTasks,
  FaSearch,
  FaTimes,
  FaChevronDown,
  FaChevronUp,
  FaCheck,
  FaUser,
} from 'react-icons/fa'
import { useAuth } from '../../context/AuthContext'
import { TaskWorkspaceLayout } from './components/common/TaskWorkspaceLayout'
import { TaskCardShell } from './components/common/TaskCardShell'
import { TaskStatusBadge } from './components/common/TaskStatusBadge'
import { UserEmailBadge } from './components/common/UserEmailBadge'
import workManagementService from '../../services/workManagementService'
import { taskApi } from '../../services/taskApi'
import { userApi } from '../../services/userApi'
import { leadApi } from '../../services/leadApi'
import { dealApi } from '../../services/dealApi'
import { ProfessionalTaskModal } from '../../components/common/ProfessionalTaskModal'
import Modal from '../../components/common/Modal'

export const ProjectsPortfolioPage = () => {
  const navigate = useNavigate()
  const { user } = useAuth()
  const isAdmin = ['admin', 'super_admin'].includes(user?.role)

  const [projects, setProjects] = useState([])
  const [tasks, setTasks] = useState([])
  const [userList, setUserList] = useState([])
  const [accountsList, setAccountsList] = useState([])
  const [dealsList, setDealsList] = useState([])
  const [loading, setLoading] = useState(true)

  // Expanded tasks state per project: { [projectId]: boolean }
  const [expandedProjects, setExpandedProjects] = useState({})

  // New Project modal state
  const [createModalOpen, setCreateModalOpen] = useState(false)
  const [formData, setFormData] = useState({
    name: '',
    accountId: '',
    accountName: '',
    dealId: '',
    dealName: '',
    description: '',
    projectManagerEmail: user?.email || '',
    teamMemberEmails: [],
    estimatedHours: 160,
    startDate: new Date().toISOString().slice(0, 10),
    endDate: '',
  })

  // Create Project modal dropdown search states
  const [activeProjectModalDropdown, setActiveProjectModalDropdown] = useState(null)
  const [projectModalSearch, setProjectModalSearch] = useState('')
  const modalDropdownRef = useRef(null)

  useEffect(() => {
    const handleOutside = (e) => {
      if (modalDropdownRef.current && !modalDropdownRef.current.contains(e.target)) {
        setActiveProjectModalDropdown(null)
      }
    }
    document.addEventListener('mousedown', handleOutside)
    return () => document.removeEventListener('mousedown', handleOutside)
  }, [])

  // Team allocation ("Add People") modal state
  const [teamModalProject, setTeamModalProject] = useState(null)
  const [selectedTeamEmails, setSelectedTeamEmails] = useState(new Set())
  const [teamSearchQuery, setTeamSearchQuery] = useState('')
  const [savingTeam, setSavingTeam] = useState(false)

  // Create Task for Project modal state
  const [createTaskForProject, setCreateTaskForProject] = useState(null)

  const fetchProjectsAndData = async () => {
    try {
      setLoading(true)
      const [projectsData, tasksData, overviewData, usersData, leadsData, dealsData] = await Promise.all([
        workManagementService.getProjects().catch(() => []),
        taskApi.getTasks().catch(() => []),
        workManagementService.getOverview().catch(() => null),
        userApi.listUsers().catch(() => []),
        leadApi.getLeads().catch(() => []),
        dealApi.getDeals().catch(() => []),
      ])

      setProjects(projectsData || [])
      setTasks(tasksData || [])

      const normalizedLeads = Array.isArray(leadsData) ? leadsData : (Array.isArray(leadsData?.data) ? leadsData.data : [])
      const normalizedDeals = Array.isArray(dealsData) ? dealsData : (Array.isArray(dealsData?.data) ? dealsData.data : [])
      setAccountsList(normalizedLeads)
      setDealsList(normalizedDeals)

      // Merge and deduplicate users from overview and userApi
      const userMap = new Map()
      const rawUsers = [
        ...(Array.isArray(overviewData?.teamMembers) ? overviewData.teamMembers : []),
        ...(Array.isArray(usersData) ? usersData : []),
      ]

      rawUsers.forEach((u) => {
        const email = String(u.email || u.mail || '').trim().toLowerCase()
        if (email && !userMap.has(email)) {
          userMap.set(email, {
            email,
            name: u.name || u.fullName || u.displayName || email.split('@')[0],
            role: u.role || u.designation || 'Member',
          })
        }
      })

      setUserList(Array.from(userMap.values()))
    } catch (err) {
      console.error('Failed to load project portfolio data', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchProjectsAndData()
  }, [])

  // Create Project submit
  const handleCreateProject = async (e) => {
    if (e) e.preventDefault()
    if (!formData.name) return
    try {
      await workManagementService.createProject(formData)
      setCreateModalOpen(false)
      setFormData({
        name: '',
        accountId: '',
        accountName: '',
        dealId: '',
        dealName: '',
        description: '',
        projectManagerEmail: user?.email || '',
        teamMemberEmails: [],
        estimatedHours: 160,
        startDate: new Date().toISOString().slice(0, 10),
        endDate: '',
      })
      fetchProjectsAndData()
    } catch (err) {
      console.error('Failed to create project', err)
    }
  }

  // Open Add People modal
  const handleOpenAddPeople = (project) => {
    setTeamModalProject(project)
    const existing = new Set((project.teamMemberEmails || []).map((e) => String(e).toLowerCase().trim()))
    setSelectedTeamEmails(existing)
    setTeamSearchQuery('')
  }

  // Toggle user in team modal
  const handleToggleTeamMember = (email) => {
    const normalized = String(email).toLowerCase().trim()
    setSelectedTeamEmails((prev) => {
      const next = new Set(prev)
      if (next.has(normalized)) {
        next.delete(normalized)
      } else {
        next.add(normalized)
      }
      return next
    })
  }

  // Save Team allocation
  const handleSaveTeamAllocation = async () => {
    if (!teamModalProject) return
    try {
      setSavingTeam(true)
      const updatedEmails = Array.from(selectedTeamEmails)
      await workManagementService.updateProject(teamModalProject.id, {
        teamMemberEmails: updatedEmails,
      })

      // Update state locally
      setProjects((prev) =>
        prev.map((p) =>
          p.id === teamModalProject.id ? { ...p, teamMemberEmails: updatedEmails } : p
        )
      )
      setTeamModalProject(null)
    } catch (err) {
      console.error('Failed to save team allocation', err)
    } finally {
      setSavingTeam(false)
    }
  }

  // Toggle task list accordion
  const toggleProjectTasks = (projectId) => {
    setExpandedProjects((prev) => ({
      ...prev,
      [projectId]: !prev[projectId],
    }))
  }

  // Filtered users for Add People modal
  const filteredTeamUsers = useMemo(() => {
    const q = teamSearchQuery.toLowerCase().trim()
    if (!q) return userList
    return userList.filter(
      (u) =>
        u.name.toLowerCase().includes(q) ||
        u.email.toLowerCase().includes(q) ||
        (u.role && u.role.toLowerCase().includes(q))
    )
  }, [userList, teamSearchQuery])

  return (
    <TaskWorkspaceLayout activeTabKey="projects">
      {/* Portfolio Header Bar */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.25rem' }}>
        <div>
          <h2 style={{ margin: 0, fontSize: '1.35rem', fontWeight: '800', color: '#1e293b' }}>
            Project Portfolio & Milestones
          </h2>
          <p style={{ margin: '0.2rem 0 0', fontSize: '0.82rem', color: '#64748b' }}>
            Enterprise multi-stage project tracking with team allocation and linked task creation
          </p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
          <button
            type="button"
            className="ap-header-item-btn"
            onClick={fetchProjectsAndData}
            title="Refresh Projects"
            style={{
              padding: '0.5rem 0.9rem',
              borderRadius: '9px',
              border: '1px solid #e2e8f0',
              background: '#ffffff',
              color: '#475569',
              fontWeight: '600',
              fontSize: '0.82rem',
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.45rem',
            }}
          >
            <FaSyncAlt />
            <span>Refresh</span>
          </button>
          <button
            type="button"
            className="ap-tab-add"
            onClick={() => setCreateModalOpen(true)}
            style={{
              background: 'linear-gradient(135deg, #c60016 0%, #80000e 100%)',
              color: '#ffffff',
              border: 'none',
              padding: '0.52rem 1.1rem',
              borderRadius: '9px',
              fontWeight: '700',
              fontSize: '0.84rem',
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.45rem',
              boxShadow: '0 4px 12px rgba(198, 0, 22, 0.25)',
            }}
          >
            <FaPlus />
            <span>New Project</span>
          </button>
        </div>
      </div>

      {/* Projects Grid */}
      {projects.length === 0 && !loading ? (
        <TaskCardShell>
          <div style={{ padding: '3.5rem 1.5rem', textAlign: 'center', color: '#64748b' }}>
            <FaFolderOpen style={{ fontSize: '3rem', color: '#cbd5e1', marginBottom: '0.85rem' }} />
            <div style={{ fontWeight: '800', fontSize: '1.1rem', color: '#1e293b' }}>No Projects Created Yet</div>
            <p style={{ fontSize: '0.84rem', margin: '0.4rem 0 1.25rem', color: '#64748b' }}>
              Create your first project or auto-generate one when marking a Deal as Won.
            </p>
            <button
              type="button"
              onClick={() => setCreateModalOpen(true)}
              style={{
                background: 'linear-gradient(135deg, #c60016 0%, #80000e 100%)',
                color: '#ffffff',
                border: 'none',
                padding: '0.6rem 1.35rem',
                borderRadius: '10px',
                fontWeight: '700',
                fontSize: '0.86rem',
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.5rem',
                boxShadow: '0 4px 14px rgba(198, 0, 22, 0.25)',
              }}
            >
              <FaPlus />
              <span>Create Project</span>
            </button>
          </div>
        </TaskCardShell>
      ) : (
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))',
            gap: '1.25rem',
          }}
        >
          {projects.map((proj) => {
            const completedMilestones = (proj.milestones || []).filter((m) => m.status === 'completed').length
            const totalMilestones = (proj.milestones || []).length

            // Project bound tasks
            const projectTasks = tasks.filter((t) => String(t.projectId) === String(proj.id))
            const openTasksCount = projectTasks.filter((t) => ['open', 'in_progress', 'review'].includes(String(t.status || '').toLowerCase())).length
            const isExpanded = Boolean(expandedProjects[proj.id])

            // Team members emails
            const teamEmails = Array.isArray(proj.teamMemberEmails) ? proj.teamMemberEmails : []

            return (
              <div
                key={proj.id}
                className="ap-dashboard-card"
                style={{
                  background: '#ffffff',
                  border: '1.5px solid #e2e8f0',
                  borderRadius: '16px',
                  padding: '1.35rem',
                  boxShadow: '0 4px 18px rgba(0, 0, 0, 0.03)',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '1rem',
                  transition: 'all 0.2s ease',
                }}
              >
                {/* Project Header */}
                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '0.5rem' }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <span
                        style={{
                          fontSize: '0.72rem',
                          fontWeight: '800',
                          color: '#c60016',
                          background: '#fef2f2',
                          padding: '0.2rem 0.5rem',
                          borderRadius: '6px',
                          border: '1px solid #fee2e2',
                        }}
                      >
                        {proj.projectCode}
                      </span>
                    </div>
                    <h3 style={{ margin: '0.35rem 0 0', fontSize: '1.1rem', fontWeight: '800', color: '#1e293b', lineHeight: 1.3 }}>
                      {proj.name}
                    </h3>
                  </div>
                </div>

                {proj.description && (
                  <p style={{ margin: 0, fontSize: '0.8rem', color: '#64748b', lineHeight: 1.45 }}>
                    {proj.description}
                  </p>
                )}

                {/* Progress Bar */}
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.35rem', fontSize: '0.76rem' }}>
                    <span style={{ color: '#64748b', fontWeight: '600' }}>Overall Progress</span>
                    <span style={{ fontWeight: '800', color: '#c60016' }}>{proj.progress}%</span>
                  </div>
                  <div style={{ height: '7px', background: '#f1f5f9', borderRadius: '4px', overflow: 'hidden' }}>
                    <div
                      style={{
                        width: `${proj.progress}%`,
                        height: '100%',
                        background: 'linear-gradient(90deg, #c60016 0%, #e11d2e 100%)',
                        borderRadius: '4px',
                        transition: 'width 0.3s ease',
                      }}
                    />
                  </div>
                </div>

                {/* Milestones Stepper Mini */}
                <div>
                  <span style={{ fontSize: '0.74rem', fontWeight: '700', color: '#64748b', display: 'block', marginBottom: '0.4rem' }}>
                    Milestones ({completedMilestones} / {totalMilestones})
                  </span>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                    {(proj.milestones || []).slice(0, 3).map((ms) => (
                      <div
                        key={ms.id || ms.name}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '0.45rem',
                          fontSize: '0.76rem',
                          color: ms.status === 'completed' ? '#15803d' : '#334155',
                        }}
                      >
                        <FaCheckCircle style={{ color: ms.status === 'completed' ? '#15803d' : '#cbd5e1', fontSize: '0.75rem', flexShrink: 0 }} />
                        <span style={{ flex: 1, textDecoration: ms.status === 'completed' ? 'line-through' : 'none' }}>
                          {ms.name}
                        </span>
                        <span style={{ fontSize: '0.68rem', fontWeight: '700', textTransform: 'capitalize', color: ms.status === 'completed' ? '#15803d' : '#64748b' }}>
                          {ms.status.replace('_', ' ')}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Team Allocation Section (Changes-1: Add People) */}
                <div
                  style={{
                    background: '#f8fafc',
                    padding: '0.75rem 0.85rem',
                    borderRadius: '12px',
                    border: '1px solid #edf2f7',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.76rem', fontWeight: '700', color: '#334155' }}>
                      <FaUsers style={{ color: '#c60016' }} />
                      <span>Project Team ({teamEmails.length})</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleOpenAddPeople(proj)}
                      style={{
                        background: '#ffffff',
                        border: '1px solid #cbd5e1',
                        borderRadius: '6px',
                        padding: '0.25rem 0.55rem',
                        fontSize: '0.72rem',
                        fontWeight: '700',
                        color: '#c60016',
                        cursor: 'pointer',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '0.3rem',
                        transition: 'all 0.15s ease',
                      }}
                      title="Add or remove team members"
                    >
                      <FaUserPlus />
                      <span>Add People</span>
                    </button>
                  </div>

                  {/* Team Members Chips */}
                  {teamEmails.length === 0 ? (
                    <div style={{ fontSize: '0.72rem', color: '#94a3b8', fontStyle: 'italic' }}>
                      No team members assigned yet. Click "Add People" to assign.
                    </div>
                  ) : (
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.35rem' }}>
                      {teamEmails.slice(0, 5).map((email) => {
                        const matchedUser = userList.find((u) => u.email.toLowerCase() === email.toLowerCase())
                        const displayName = matchedUser?.name || email.split('@')[0]
                        return (
                          <div
                            key={email}
                            title={`${displayName} (${email})`}
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '0.3rem',
                              background: '#ffffff',
                              border: '1px solid #e2e8f0',
                              borderRadius: '20px',
                              padding: '0.15rem 0.5rem',
                              fontSize: '0.7rem',
                              fontWeight: '600',
                              color: '#334155',
                            }}
                          >
                            <span
                              style={{
                                width: '16px',
                                height: '16px',
                                borderRadius: '50%',
                                background: 'linear-gradient(135deg, #c60016 0%, #80000e 100%)',
                                color: '#ffffff',
                                display: 'inline-flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                fontSize: '0.55rem',
                                fontWeight: '800',
                              }}
                            >
                              {displayName.charAt(0).toUpperCase()}
                            </span>
                            <span>{displayName}</span>
                          </div>
                        )
                      })}
                      {teamEmails.length > 5 && (
                        <span
                          style={{
                            fontSize: '0.7rem',
                            fontWeight: '700',
                            color: '#64748b',
                            padding: '0.15rem 0.4rem',
                            alignSelf: 'center',
                          }}
                        >
                          +{teamEmails.length - 5} more
                        </span>
                      )}
                    </div>
                  )}
                </div>

                {/* Project-Wise Tasks Section (Changes-1: Create Tasks along-wise Projects) */}
                <div
                  style={{
                    background: '#fef2f2',
                    padding: '0.75rem 0.85rem',
                    borderRadius: '12px',
                    border: '1px solid #fee2e2',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.76rem', fontWeight: '700', color: '#991b1b' }}>
                      <FaTasks style={{ color: '#c60016' }} />
                      <span>
                        Tasks: {projectTasks.length} ({openTasksCount} active)
                      </span>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                      <button
                        type="button"
                        onClick={() => navigate(isAdmin ? `/admin/tasks/add?projectId=${proj.id}&projectName=${encodeURIComponent(proj.name)}` : `/tasks/add?projectId=${proj.id}&projectName=${encodeURIComponent(proj.name)}`)}
                        style={{
                          background: 'linear-gradient(135deg, #c60016 0%, #80000e 100%)',
                          color: '#ffffff',
                          border: 'none',
                          borderRadius: '6px',
                          padding: '0.28rem 0.6rem',
                          fontSize: '0.72rem',
                          fontWeight: '700',
                          cursor: 'pointer',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '0.3rem',
                          boxShadow: '0 2px 6px rgba(198, 0, 22, 0.2)',
                        }}
                      >
                        <FaPlus />
                        <span>Add Task</span>
                      </button>

                      {projectTasks.length > 0 && (
                        <button
                          type="button"
                          onClick={() => toggleProjectTasks(proj.id)}
                          style={{
                            background: '#ffffff',
                            border: '1px solid #fecaca',
                            borderRadius: '6px',
                            padding: '0.28rem 0.5rem',
                            fontSize: '0.72rem',
                            fontWeight: '600',
                            color: '#991b1b',
                            cursor: 'pointer',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '0.25rem',
                          }}
                          title={isExpanded ? 'Hide tasks' : 'View tasks'}
                        >
                          {isExpanded ? <FaChevronUp /> : <FaChevronDown />}
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Expandable Project Tasks Sub-list */}
                  {isExpanded && projectTasks.length > 0 && (
                    <div style={{ marginTop: '0.65rem', borderTop: '1px solid #fee2e2', paddingTop: '0.5rem', display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                      {projectTasks.map((t) => (
                        <div
                          key={t.id}
                          style={{
                            background: '#ffffff',
                            padding: '0.45rem 0.6rem',
                            borderRadius: '8px',
                            border: '1px solid #fca5a5',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            gap: '0.5rem',
                            fontSize: '0.75rem',
                          }}
                        >
                          <div style={{ flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontWeight: '600', color: '#1e293b' }}>
                            {t.title}
                          </div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', flexShrink: 0 }}>
                            <span
                              style={{
                                fontSize: '0.66rem',
                                fontWeight: '700',
                                textTransform: 'capitalize',
                                padding: '0.1rem 0.35rem',
                                borderRadius: '4px',
                                background: t.priority === 'urgent' ? '#fee2e2' : t.priority === 'high' ? '#ffedd5' : '#f1f5f9',
                                color: t.priority === 'urgent' ? '#991b1b' : t.priority === 'high' ? '#9a3412' : '#475569',
                              }}
                            >
                              {t.priority}
                            </span>
                            <TaskStatusBadge value={t.status} />
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Footer Meta: Project Manager & Due Date */}
                <div style={{ marginTop: 'auto', paddingTop: '0.75rem', borderTop: '1px solid #f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div>
                    <span style={{ fontSize: '0.68rem', color: '#64748b', display: 'block' }}>Project Manager</span>
                    <UserEmailBadge email={proj.projectManagerEmail} size="small" />
                  </div>
                  {proj.endDate && (
                    <div style={{ textAlign: 'right' }}>
                      <span style={{ fontSize: '0.68rem', color: '#64748b', display: 'block' }}>Target Due</span>
                      <span style={{ fontSize: '0.76rem', fontWeight: '700', color: '#1e293b' }}>
                        {new Date(proj.endDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Add People / Team Members Modal (Changes-1) */}
      <Modal
        isOpen={Boolean(teamModalProject)}
        onClose={() => setTeamModalProject(null)}
        title={`Add People to ${teamModalProject?.name || 'Project'}`}
        size="medium"
        footer={
          <>
            <button
              type="button"
              className="ap-modal-btn ap-modal-btn-secondary"
              onClick={() => setTeamModalProject(null)}
              disabled={savingTeam}
            >
              Cancel
            </button>
            <button
              type="button"
              style={{
                background: 'linear-gradient(135deg, #c60016 0%, #80000e 100%)',
                color: '#ffffff',
                border: 'none',
                padding: '0.55rem 1.25rem',
                borderRadius: '8px',
                fontWeight: '700',
                fontSize: '0.84rem',
                cursor: 'pointer',
              }}
              onClick={handleSaveTeamAllocation}
              disabled={savingTeam}
            >
              {savingTeam ? 'Saving...' : `Save Team (${selectedTeamEmails.size} Members)`}
            </button>
          </>
        }
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
          <p style={{ margin: 0, fontSize: '0.82rem', color: '#64748b' }}>
            Select team members from the organization users directory to allocate to this project. Allocated members will have access to project roadmaps and assigned tasks.
          </p>

          {/* Search Bar */}
          <div style={{ position: 'relative' }}>
            <FaSearch style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8', fontSize: '0.8rem' }} />
            <input
              type="text"
              value={teamSearchQuery}
              onChange={(e) => setTeamSearchQuery(e.target.value)}
              placeholder="Search team members by name, email, or role..."
              style={{
                width: '100%',
                padding: '0.5rem 0.75rem 0.5rem 2.1rem',
                borderRadius: '8px',
                border: '1.5px solid #cbd5e1',
                fontSize: '0.84rem',
                outline: 'none',
                boxSizing: 'border-box',
              }}
            />
            {teamSearchQuery && (
              <button
                type="button"
                onClick={() => setTeamSearchQuery('')}
                style={{
                  position: 'absolute',
                  right: '0.75rem',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  background: 'transparent',
                  border: 'none',
                  cursor: 'pointer',
                  color: '#94a3b8',
                }}
              >
                <FaTimes />
              </button>
            )}
          </div>

          {/* User Checkbox List */}
          <div
            style={{
              maxHeight: '320px',
              overflowY: 'auto',
              border: '1.5px solid #e2e8f0',
              borderRadius: '10px',
              padding: '0.5rem',
              display: 'flex',
              flexDirection: 'column',
              gap: '0.35rem',
              background: '#f8fafc',
            }}
          >
            {filteredTeamUsers.length === 0 ? (
              <div style={{ padding: '1.5rem', textAlign: 'center', color: '#94a3b8', fontSize: '0.82rem' }}>
                No users found matching "{teamSearchQuery}".
              </div>
            ) : (
              filteredTeamUsers.map((u) => {
                const isSelected = selectedTeamEmails.has(u.email.toLowerCase())
                return (
                  <label
                    key={u.email}
                    onClick={() => handleToggleTeamMember(u.email)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.75rem',
                      padding: '0.55rem 0.75rem',
                      borderRadius: '8px',
                      background: isSelected ? '#fef2f2' : '#ffffff',
                      border: `1.5px solid ${isSelected ? '#fca5a5' : '#e2e8f0'}`,
                      cursor: 'pointer',
                      transition: 'all 0.15s ease',
                    }}
                  >
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={() => {}} // Handled by label click
                      style={{
                        accentColor: '#c60016',
                        width: '16px',
                        height: '16px',
                        cursor: 'pointer',
                      }}
                    />
                    <div
                      style={{
                        width: '32px',
                        height: '32px',
                        borderRadius: '50%',
                        background: isSelected ? 'linear-gradient(135deg, #c60016 0%, #80000e 100%)' : '#e2e8f0',
                        color: isSelected ? '#ffffff' : '#475569',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '0.8rem',
                        fontWeight: '800',
                        flexShrink: 0,
                      }}
                    >
                      {u.name.charAt(0).toUpperCase()}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontWeight: '700', fontSize: '0.84rem', color: '#1e293b' }}>
                        {u.name}
                      </div>
                      <div style={{ fontSize: '0.72rem', color: '#64748b' }}>
                        {u.email}
                      </div>
                    </div>
                  </label>
                )
              })
            )}
          </div>
        </div>
      </Modal>

      {/* New Project Modal */}
      <Modal
        isOpen={createModalOpen}
        onClose={() => setCreateModalOpen(false)}
        title="Create New Project"
        size="medium"
        footer={
          <>
            <button type="button" className="ap-modal-btn ap-modal-btn-secondary" onClick={() => setCreateModalOpen(false)}>
              Cancel
            </button>
            <button
              type="button"
              style={{
                background: 'linear-gradient(135deg, #c60016 0%, #80000e 100%)',
                color: '#ffffff',
                border: 'none',
                padding: '0.55rem 1.25rem',
                borderRadius: '8px',
                fontWeight: '700',
                fontSize: '0.84rem',
                cursor: 'pointer',
              }}
              onClick={handleCreateProject}
            >
              Create Project
            </button>
          </>
        }
      >
        <form onSubmit={handleCreateProject} style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
          {/* CRM Account & Deal Association Pickers */}
          {/* CRM Account & Deal Association Pickers */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }} ref={modalDropdownRef}>
            {/* 1. Account */}
            <div style={{ position: 'relative' }}>
              <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: '700', color: '#334155', marginBottom: '0.25rem' }}>
                Account
              </label>
              <input
                type="text"
                readOnly
                value={formData.accountName || (formData.accountId ? `Account ${formData.accountId}` : '')}
                onClick={() => {
                  setActiveProjectModalDropdown(activeProjectModalDropdown === 'account' ? null : 'account')
                  setProjectModalSearch('')
                }}
                placeholder="Click to select Account"
                style={{
                  width: '100%',
                  padding: '0.5rem 0.75rem',
                  borderRadius: '10px',
                  border: activeProjectModalDropdown === 'account' ? '1.5px solid #c60016' : '1px solid #cbd5e1',
                  fontSize: '0.84rem',
                  boxSizing: 'border-box',
                  cursor: 'pointer',
                  backgroundColor: '#ffffff',
                  fontWeight: formData.accountId ? '700' : '400',
                  color: formData.accountId ? '#1e293b' : '#64748b',
                }}
              />

              {activeProjectModalDropdown === 'account' && (
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
                    maxHeight: '230px',
                    overflow: 'hidden',
                  }}
                >
                  <div style={{ padding: '0.45rem 0.65rem', borderBottom: '1px solid #e2e8f0', background: '#f8fafc', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                    <FaSearch style={{ color: '#c60016', fontSize: '0.75rem', flexShrink: 0 }} />
                    <input
                      type="text"
                      value={projectModalSearch}
                      onChange={(e) => setProjectModalSearch(e.target.value)}
                      placeholder="Search Account..."
                      autoFocus
                      style={{ flex: 1, border: 'none', background: 'transparent', fontSize: '0.8rem', outline: 'none' }}
                    />
                  </div>
                  <div style={{ overflowY: 'auto', maxHeight: '180px', padding: '0.25rem' }}>
                    <div
                      onClick={() => {
                        setFormData({ ...formData, accountId: '', accountName: '' })
                        setActiveProjectModalDropdown(null)
                      }}
                      style={{ padding: '0.45rem 0.6rem', fontSize: '0.78rem', color: '#64748b', cursor: 'pointer', fontStyle: 'italic', borderBottom: '1px solid #f1f5f9' }}
                    >
                      None (No Account)
                    </div>
                    {accountsList
                      .filter((a) => {
                        if (!projectModalSearch.trim()) return true
                        const q = projectModalSearch.toLowerCase()
                        const name = a.accountName || a.companyName || a.name || ''
                        const id = a.accountNumber || a.id || a._id || ''
                        return String(name).toLowerCase().includes(q) || String(id).toLowerCase().includes(q)
                      })
                      .map((acc) => {
                        const id = acc.id || acc._id || acc.accountNumber
                        const name = acc.accountName || acc.companyName || acc.name || `Account ${id}`
                        return (
                          <div
                            key={id}
                            onClick={() => {
                              setFormData({
                                ...formData,
                                accountId: id,
                                accountName: name,
                              })
                              setActiveProjectModalDropdown(null)
                            }}
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
                            <span style={{ fontWeight: '700', color: '#c60016', marginRight: '0.35rem' }}>[{id}]</span>
                            <span style={{ fontWeight: '600', color: '#1e293b' }}>{name}</span>
                          </div>
                        )
                      })}
                  </div>
                </div>
              )}
            </div>

            {/* 2. Project/Deal */}
            <div style={{ position: 'relative' }}>
              <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: '700', color: '#334155', marginBottom: '0.25rem' }}>
                Project/Deal
              </label>
              <input
                type="text"
                readOnly
                value={formData.dealName || (formData.dealId ? `Deal ${formData.dealId}` : '')}
                onClick={() => {
                  setActiveProjectModalDropdown(activeProjectModalDropdown === 'deal' ? null : 'deal')
                  setProjectModalSearch('')
                }}
                placeholder="Click to select Project/Deal"
                style={{
                  width: '100%',
                  padding: '0.5rem 0.75rem',
                  borderRadius: '10px',
                  border: activeProjectModalDropdown === 'deal' ? '1.5px solid #c60016' : '1px solid #cbd5e1',
                  fontSize: '0.84rem',
                  boxSizing: 'border-box',
                  cursor: 'pointer',
                  backgroundColor: '#ffffff',
                  fontWeight: formData.dealId ? '700' : '400',
                  color: formData.dealId ? '#1e293b' : '#64748b',
                }}
              />

              {activeProjectModalDropdown === 'deal' && (
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
                    maxHeight: '230px',
                    overflow: 'hidden',
                  }}
                >
                  <div style={{ padding: '0.45rem 0.65rem', borderBottom: '1px solid #e2e8f0', background: '#f8fafc', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                    <FaSearch style={{ color: '#c60016', fontSize: '0.75rem', flexShrink: 0 }} />
                    <input
                      type="text"
                      value={projectModalSearch}
                      onChange={(e) => setProjectModalSearch(e.target.value)}
                      placeholder="Search Project/Deal..."
                      autoFocus
                      style={{ flex: 1, border: 'none', background: 'transparent', fontSize: '0.8rem', outline: 'none' }}
                    />
                  </div>
                  <div style={{ overflowY: 'auto', maxHeight: '180px', padding: '0.25rem' }}>
                    <div
                      onClick={() => {
                        setFormData({ ...formData, dealId: '', dealName: '' })
                        setActiveProjectModalDropdown(null)
                      }}
                      style={{ padding: '0.45rem 0.6rem', fontSize: '0.78rem', color: '#64748b', cursor: 'pointer', fontStyle: 'italic', borderBottom: '1px solid #f1f5f9' }}
                    >
                      None (No Deal/Project)
                    </div>
                    {dealsList
                      .filter((d) => {
                        if (!projectModalSearch.trim()) return true
                        const q = projectModalSearch.toLowerCase()
                        const title = d.dealName || d.title || d.name || ''
                        const id = d.id || d._id || d.dealNumber || ''
                        return String(title).toLowerCase().includes(q) || String(id).toLowerCase().includes(q)
                      })
                      .map((deal) => {
                        const id = deal.id || deal._id
                        const title = deal.dealName || deal.title || deal.name || `Deal ${id}`
                        return (
                          <div
                            key={id}
                            onClick={() => {
                              setFormData({
                                ...formData,
                                dealId: id,
                                dealName: title,
                                name: (!formData.name && title) ? title : formData.name,
                              })
                              setActiveProjectModalDropdown(null)
                            }}
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
                            <span style={{ fontWeight: '700', color: '#c60016', marginRight: '0.35rem' }}>[{id}]</span>
                            <span style={{ fontWeight: '600', color: '#1e293b' }}>{title}</span>
                          </div>
                        )
                      })}
                  </div>
                </div>
              )}
            </div>
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: '700', color: '#334155', marginBottom: '0.25rem' }}>
              Project Name *
            </label>
            <input
              type="text"
              required
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="e.g. Substation Panel Fabrication & Automation"
              style={{ width: '100%', padding: '0.5rem 0.75rem', borderRadius: '10px', border: '1px solid #cbd5e1', fontSize: '0.84rem', boxSizing: 'border-box' }}
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: '700', color: '#334155', marginBottom: '0.25rem' }}>
                Project Manager *
              </label>
              <select
                value={formData.projectManagerEmail}
                onChange={(e) => setFormData({ ...formData, projectManagerEmail: e.target.value })}
                style={{ width: '100%', padding: '0.5rem 0.75rem', borderRadius: '10px', border: '1px solid #cbd5e1', fontSize: '0.84rem', boxSizing: 'border-box' }}
              >
                <option value="">Select Manager</option>
                {userList.map((u) => {
                  const email = String(u.email || '').trim().toLowerCase()
                  const displayName = u.name || (email ? email.split('@')[0] : 'User')
                  return (
                    <option key={email} value={email}>
                      {displayName}
                    </option>
                  )
                })}
              </select>
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: '700', color: '#334155', marginBottom: '0.25rem' }}>
                Estimated Effort (Hours)
              </label>
              <input
                type="number"
                min="1"
                value={formData.estimatedHours}
                onChange={(e) => setFormData({ ...formData, estimatedHours: Number(e.target.value) || 1 })}
                style={{ width: '100%', padding: '0.5rem 0.75rem', borderRadius: '10px', border: '1px solid #cbd5e1', fontSize: '0.84rem', boxSizing: 'border-box' }}
              />
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: '700', color: '#334155', marginBottom: '0.25rem' }}>
                Start Date
              </label>
              <input
                type="date"
                value={formData.startDate}
                onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                style={{ width: '100%', padding: '0.5rem 0.75rem', borderRadius: '10px', border: '1px solid #cbd5e1', fontSize: '0.84rem', boxSizing: 'border-box' }}
              />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: '700', color: '#334155', marginBottom: '0.25rem' }}>
                Target Completion Date
              </label>
              <input
                type="date"
                value={formData.endDate}
                onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
                style={{ width: '100%', padding: '0.5rem 0.75rem', borderRadius: '10px', border: '1px solid #cbd5e1', fontSize: '0.84rem', boxSizing: 'border-box' }}
              />
            </div>
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: '700', color: '#334155', marginBottom: '0.25rem' }}>
              Description & Scope
            </label>
            <textarea
              rows={3}
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="Outline project deliverables, technical scope, and milestones..."
              style={{ width: '100%', padding: '0.5rem 0.75rem', borderRadius: '10px', border: '1px solid #cbd5e1', fontSize: '0.84rem', boxSizing: 'border-box' }}
            />
          </div>
        </form>
      </Modal>

      {/* Professional Task Modal bound to project (Changes-1) */}
      {createTaskForProject && (
        <ProfessionalTaskModal
          isOpen={Boolean(createTaskForProject)}
          onClose={() => setCreateTaskForProject(null)}
          initialProjectId={createTaskForProject.id}
          initialProjectTitle={createTaskForProject.name}
          onSuccess={() => {
            setCreateTaskForProject(null)
            fetchProjectsAndData()
          }}
        />
      )}
    </TaskWorkspaceLayout>
  )
}

export default ProjectsPortfolioPage
