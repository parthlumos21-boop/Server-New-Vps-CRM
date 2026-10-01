import React, { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  FaEnvelope,
  FaExternalLinkAlt,
  FaPlug,
  FaRegFileAlt,
  FaTicketAlt,
} from 'react-icons/fa'
import { useAuth } from '../../context/AuthContext'
import { useData } from '../../context/DataContext'
import integrationApi from '../../services/integrationApi'
import './RightPanel.css'

const DEMO_ACTIVITY = [
  { id: 1, name: 'System Administrator', action: 'is online now', time: '01/06/2026, 04:31 pm' },
]

const normalizeActionLabel = (value = '') => {
  const cleaned = String(value)
    .replace(/[_-]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()

  if (!cleaned) {
    return 'updated the workspace'
  }

  return cleaned.charAt(0).toLowerCase() + cleaned.slice(1)
}

const buildSupportActions = (isAdmin, integrationStatus, isLoadingIntegrations) => {
  const outlook = integrationStatus?.outlook
  const outlookConnected = Boolean(outlook?.connected)
  const outlookConfigured = Boolean(outlook?.configured)
  const outlookShared = Boolean(outlook?.shared)
  const outlookActive = outlookConnected || outlookConfigured

  return [
    {
      key: 'outlook',
      label: 'Outlook Mail',
      status: isLoadingIntegrations ? 'Checking' : outlookConnected ? (outlookShared ? 'Shared' : 'Connected') : outlookActive ? 'Active' : 'Not ready',
      statusClass: outlookActive ? 'rp-integration-status--active' : 'rp-integration-status--warning',
      route: isAdmin ? '/admin/settings' : '/integrations/outlook',
      icon: FaEnvelope,
      cta: outlookConnected ? (outlookShared ? 'CRM Outlook' : 'Manage') : 'Connect Outlook',
    },
  ]
}

const formatDateTime = (value, fallback = '-') => {
  if (value === undefined || value === null || value === '') {
    return fallback
  }

  const parsedDate = new Date(value)

  if (Number.isNaN(parsedDate.getTime())) {
    return typeof value === 'string' ? value : fallback
  }

  return parsedDate.toLocaleString('en-IN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).replace(/\s?(am|pm)$/i, (match) => match.toLowerCase())
}

const buildLiveEntries = (onlineUsers = [], activities = [], nowLabel = '') => {
  const onlineEntries = onlineUsers.map((entry) => ({
    id: `online-${entry.id}`,
    name: entry.name,
    action: 'is online',
    time: formatDateTime(entry.connectedAt, nowLabel),
  }))

  const activityEntries = activities.slice(0, 8).map((entry) => ({
    id: entry.id,
    name: entry.userName || 'User',
    action: normalizeActionLabel(entry.type),
    time: formatDateTime(entry.timestamp, nowLabel),
  }))

  return [...onlineEntries, ...activityEntries].slice(0, 10)
}

const getActivityBadge = (action = '') => {
  const lowerAction = action.toLowerCase()

  if (lowerAction.includes('online') || lowerAction.includes('signed in')) {
    return { label: 'Live', cls: 'rp-badge--live' }
  }

  if (lowerAction.includes('message') || lowerAction.includes('mail')) {
    return { label: 'Message', cls: 'rp-badge--message' }
  }

  if (lowerAction.includes('support') || lowerAction.includes('ticket')) {
    return { label: 'Support', cls: 'rp-badge--support' }
  }

  return { label: 'Feed', cls: 'rp-badge--feed' }
}

const RightPanel = () => {
  const navigate = useNavigate()
  const { user, isAdmin } = useAuth()
  const { activities, onlineUsers, addNotification } = useData()
  const [now, setNow] = useState(() => new Date())
  const [integrationStatus, setIntegrationStatus] = useState(null)
  const [isLoadingIntegrations, setIsLoadingIntegrations] = useState(false)
  const [busyIntegration, setBusyIntegration] = useState('')

  useEffect(() => {
    const tick = () => setNow(new Date())
    const intervalId = window.setInterval(tick, 60 * 1000)
    return () => window.clearInterval(intervalId)
  }, [])

  useEffect(() => {
    let isMounted = true

    const loadIntegrationStatus = async () => {
      setIsLoadingIntegrations(true)
      try {
        const status = await integrationApi.getStatus()
        if (isMounted) setIntegrationStatus(status)
      } catch (_error) {
        if (isMounted) {
          setIntegrationStatus(null)
        addNotification?.('error', 'Integration status unavailable', 'Unable to load Outlook status.')
        }
      } finally {
        if (isMounted) setIsLoadingIntegrations(false)
      }
    }

    loadIntegrationStatus()

    return () => {
      isMounted = false
    }
  }, [addNotification])

  const isDemo = !user || user?.name?.toLowerCase().includes('demo')
  const nowLabel = formatDateTime(now)
  const liveActivityLog = buildLiveEntries(onlineUsers, activities, nowLabel)
  const activityLog = isDemo ? DEMO_ACTIVITY : (liveActivityLog.length > 0 ? liveActivityLog : DEMO_ACTIVITY)
  const supportActions = buildSupportActions(isAdmin, integrationStatus, isLoadingIntegrations)

  const handleActionClick = async (action) => {
    if (action.key === 'outlook') {
      navigate(action.route)
    }
  }

  return (
    <aside className="right-panel">
      <div className="right-panel-section right-panel-section--actions">
        <div className="right-panel-section-head right-panel-section-head--integrations">
          <span>INTEGRATIONS</span>
          <small>{isLoadingIntegrations ? 'SYNCING' : 'LIVE'}</small>
        </div>
        <div className="right-panel-actions">
          {supportActions.map((action) => {
            const ActionIcon = action.icon
            const isBusy = busyIntegration === action.key

            return (
              <button
                key={action.label}
                type="button"
                className={`rp-action-card rp-action-card--integration rp-action-card--${action.key}`}
                onClick={() => handleActionClick(action)}
                disabled={isBusy}
              >
                <span className="rp-action-card__icon">
                  <ActionIcon />
                </span>
                <span className="rp-action-card__body">
                  <span className="rp-action-card__label">{action.label}</span>
                  <span className="rp-action-card__cta">
                    {action.cta}
                    {action.key === 'outlook' && integrationStatus?.outlook?.connected ? <FaExternalLinkAlt /> : <FaPlug />}
                  </span>
                </span>
              </button>
            )
          })}
          <button
            type="button"
            className="rp-ticket-add-btn"
            onClick={() => navigate(isAdmin ? '/admin/tickets' : '/tickets')}
          >
            <span className="rp-ticket-add-btn__icon">
              <FaTicketAlt />
            </span>
            <span>
              <strong>CRM Support</strong>
              <small>Open support module</small>
            </span>
          </button>
        </div>
      </div>

      <div className="right-panel-section right-panel-section--activity">
        <div className="right-panel-section-head">
          <span>RECENT ACTIVITY</span>
          <small>{activityLog.length} UPDATES</small>
        </div>

        <div className="right-panel-activity">
          {activityLog.map((entry) => {
            const badge = getActivityBadge(entry.action)

            return (
              <div key={entry.id} className="rp-entry">
                <span className={`rp-badge ${badge.cls}`}>{badge.label}</span>
                <div className="rp-entry-main">
                  <div className="rp-entry-topline">
                    <div className="rp-entry-icon-wrap">
                      <FaRegFileAlt className="rp-entry-icon" />
                    </div>
                    <span className="rp-entry-time">{entry.time}</span>
                  </div>
                  <p className="rp-entry-text">
                    <span className="rp-entry-name">{entry.name}</span>
                    {' '}
                    <span className="rp-entry-action">{entry.action}</span>
                  </p>
                  {entry.loggedOut && (
                    <p className="rp-entry-meta">
                      Logged out at <span className="rp-entry-time">{entry.loggedOut}</span>
                    </p>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      </div>

    </aside>
  )
}

export default RightPanel
