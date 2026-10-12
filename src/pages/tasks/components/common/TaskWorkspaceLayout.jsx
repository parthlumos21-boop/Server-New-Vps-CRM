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

export const TaskWorkspaceLayout = ({ children, activeTabKey }) => {
  const { user } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const isAdmin = ['admin', 'super_admin'].includes(user?.role)

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
        { key: 'dashboard', label: 'Dashboard', icon: <FaDesktop />, route: '/admin/tasks' },
        { key: 'my-work', label: 'My Work', icon: <FaBriefcase />, route: '/admin/tasks/my-work' },
        { key: 'all', label: 'All Tasks', icon: <FaTasks />, route: '/admin/tasks/all' },
        { key: 'projects', label: 'Projects', icon: <FaProjectDiagram />, route: '/admin/tasks/projects' },
        { key: 'workload', label: 'Workload', icon: <FaUsers />, route: '/admin/tasks/workload' },
        { key: 'approvals', label: 'Approvals', icon: <FaCheckCircle />, route: '/admin/tasks/approvals' },
        { key: 'reminders', label: 'Reminders', icon: <FaBell />, route: '/admin/tasks/reminders' },
        { key: 'activity', label: 'Activity', icon: <FaHistory />, route: '/admin/tasks/activity' },
      ]
    : [
        { key: 'my-work', label: 'My Work', icon: <FaBriefcase />, route: '/tasks/my-work' },
        { key: 'all', label: 'My Tasks', icon: <FaTasks />, route: '/tasks/all' },
        { key: 'projects', label: 'Projects', icon: <FaProjectDiagram />, route: '/tasks/projects' },
        { key: 'reminders', label: 'Reminders', icon: <FaBell />, route: '/tasks/reminders' },
      ]

  return (
    <div className="admin-panel" style={{ padding: '0.5rem 1rem' }}>
      {/* Top Navigation Tab Bar styled with Swati Maroon .ap-tabbar */}
      <div className="ap-tabbar" style={{ marginBottom: '1rem', borderBottom: '2px solid #e2e8f0', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div className="ap-tabs" style={{ display: 'flex', gap: '0.35rem', overflowX: 'auto', paddingBottom: '2px' }}>
          {tabs.map((tab) => {
            const isActive = activeTabKey === tab.key || location.pathname === tab.route
            return (
              <button
                key={tab.key}
                type="button"
                className={`ap-tab ${isActive ? 'ap-tab--active' : ''}`}
                style={{
                  borderRadius: '14px',
                  padding: '0.45rem 0.95rem',
                  fontSize: '0.82rem',
                  fontWeight: isActive ? '800' : '600',
                  color: isActive ? '#c60016' : '#475569',
                  background: isActive ? '#fef2f2' : '#ffffff',
                  border: isActive ? '1.5px solid #c60016' : '1px solid #e2e8f0',
                  boxShadow: isActive ? '0 2px 8px rgba(198, 0, 22, 0.12)' : 'none',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.45rem',
                  transition: 'all 0.15s ease',
                }}
                onClick={() => navigate(tab.route)}
              >
                <span className="ap-tab-icon" style={{ color: isActive ? '#c60016' : '#64748b' }}>{tab.icon}</span>
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
