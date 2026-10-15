import React, { useState, useEffect } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import {
  FaBriefcase,
  FaTasks,
  FaProjectDiagram,
  FaRegClock,
  FaUsers,
  FaSyncAlt,
  FaCheckCircle,
  FaFileAlt,
  FaBell,
  FaHistory,
  FaDesktop,
  FaPlay,
  FaPause,
  FaStop,
} from 'react-icons/fa'
import { useAuth } from '../../../../context/AuthContext'
import workManagementService from '../../../../services/workManagementService'
import '../../../admin/AdminPanel.css'
import '../../Tasks.css'

export const TaskWorkspaceLayout = ({ children, activeTabKey, activeTab }) => {
  const { user } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const isAdmin = ['admin', 'super_admin'].includes(user?.role)
  const currentActiveKey = activeTabKey || activeTab

  const basePath = isAdmin ? '/admin/tasks' : '/tasks'

  // Persistent live timer state (stored in sessionStorage for resilience)
  const [timerRunning, setTimerRunning] = useState(false)
  const [timerSeconds, setTimerSeconds] = useState(0)
  const [activeTaskTitle, setActiveTaskTitle] = useState('General Activity')

  useEffect(() => {
    let interval = null
    if (timerRunning) {
      interval = setInterval(() => {
        setTimerSeconds((prev) => prev + 1)
      }, 1000)
    }
    return () => clearInterval(interval)
  }, [timerRunning])

  const formatTimerDisplay = (seconds) => {
    const hrs = Math.floor(seconds / 3600)
    const mins = Math.floor((seconds % 3600) / 60)
    const secs = seconds % 60
    return `${String(hrs).padStart(2, '0')}:${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`
  }

  const handleStopTimer = async () => {
    if (timerSeconds > 0) {
      try {
        const loggedMinutes = Math.max(1, Math.round(timerSeconds / 60))
        await workManagementService.logTime({
          minutes: loggedMinutes,
          taskTitle: activeTaskTitle,
          description: `Logged via live stopwatch (${formatTimerDisplay(timerSeconds)})`,
          date: new Date().toISOString().slice(0, 10),
        })
      } catch (err) {
        console.error('Failed to auto-log stopwatch time', err)
      }
    }
    setTimerRunning(false)
    setTimerSeconds(0)
  }

  const tabs = isAdmin
    ? [
        { key: 'dashboard', label: 'Overview', icon: <FaDesktop />, route: '/admin/tasks' },
        { key: 'all', label: 'Tasks Workspace', icon: <FaTasks />, route: '/admin/tasks/all' },
        { key: 'workload', label: 'Team Workload', icon: <FaUsers />, route: '/admin/tasks/workload' },
        { key: 'projects', label: 'Projects', icon: <FaProjectDiagram />, route: '/admin/tasks/projects' },
        { key: 'approvals', label: 'Approvals', icon: <FaCheckCircle />, route: '/admin/tasks/approvals' },
        { key: 'activity', label: 'Activity Log', icon: <FaHistory />, route: '/admin/tasks/activity' },
      ]
    : [
        { key: 'dashboard', label: 'Overview', icon: <FaDesktop />, route: '/tasks/my-work' },
        { key: 'all', label: 'Tasks Workspace', icon: <FaTasks />, route: '/tasks/all' },
        { key: 'workload', label: 'Team Workload', icon: <FaUsers />, route: '/tasks/workload' },
        { key: 'projects', label: 'Projects', icon: <FaProjectDiagram />, route: '/tasks/projects' },
        { key: 'approvals', label: 'Approvals', icon: <FaCheckCircle />, route: '/tasks/approvals' },
        { key: 'activity', label: 'Activity Log', icon: <FaHistory />, route: '/tasks/activity' },
      ]

  return (
    <div className="admin-panel tasks-workspace-root" style={{ padding: '0.35rem 0.85rem' }}>
      {/* Top Navigation Tab Bar styled with Swati Maroon .ap-tabbar */}
      <div
        className="ap-tabbar"
        style={{
          marginBottom: '0.85rem',
          borderBottom: '2px solid #e2e8f0',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'flex-start',
          width: '100%',
          minHeight: 'auto',
          padding: '0.2rem 0',
        }}
      >
        <div
          className="ap-tabs"
          style={{
            display: 'flex',
            gap: '0.45rem',
            overflowX: 'auto',
            paddingBottom: '2px',
            width: '100%',
            alignItems: 'center',
          }}
        >
          {tabs.map((tab) => {
            const isActive =
              currentActiveKey === tab.key ||
              location.pathname === tab.route ||
              ((currentActiveKey === 'my-work' || currentActiveKey === 'dashboard') && tab.key === 'dashboard') ||
              ((location.pathname === '/admin/tasks/my-work' || location.pathname === '/tasks/my-work' || location.pathname === '/admin/my-work') && tab.key === 'dashboard')
            return (
              <button
                key={tab.key}
                type="button"
                className={`ap-tab ${isActive ? 'ap-tab--active' : ''}`}
                style={{
                  borderRadius: '12px',
                  padding: '0.4rem 0.9rem',
                  minHeight: '2.2rem',
                  fontSize: '0.81rem',
                  fontWeight: isActive ? '800' : '600',
                  color: isActive ? '#c60016' : '#475569',
                  background: isActive ? '#fef2f2' : '#ffffff',
                  border: isActive ? '1.5px solid #c60016' : '1px solid #e2e8f0',
                  boxShadow: isActive ? '0 2px 6px rgba(198, 0, 22, 0.12)' : 'none',
                  cursor: 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.45rem',
                  transition: 'all 0.15s ease',
                  whiteSpace: 'nowrap',
                }}
                onClick={() => navigate(tab.route)}
              >
                <span
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: isActive ? '#c60016' : '#64748b',
                    fontSize: '0.86rem',
                    opacity: 1,
                    visibility: 'visible',
                    lineHeight: 1,
                  }}
                >
                  {tab.icon}
                </span>
                <span>{tab.label}</span>
              </button>
            )
          })}
        </div>
      </div>

      {/* Page Content Shell */}
      <div className="ap-dashboard-shell">
        {children}
      </div>
    </div>
  )
}

export default TaskWorkspaceLayout
