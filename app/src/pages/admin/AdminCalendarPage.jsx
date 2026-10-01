import React, { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { FaCalendarAlt, FaChevronLeft, FaChevronRight, FaClock } from 'react-icons/fa'
import { useData } from '../../context/DataContext'
import { useAuth } from '../../context/AuthContext'
import { getAdminReminders } from '../../features/adminReminders/getAdminReminders'
import { getAdminReminderStates, subscribeAdminReminderStates } from '../../features/adminReminders/reminderStorage'
import { getStandaloneReminders, subscribeStandaloneReminders } from '../../features/standaloneReminders/standaloneReminderStorage'
import { calendarApi } from '../../services/calendarApi'
import './AdminCalendarPage.css'

const REMINDER_SOURCE_ROUTE = {
  account: '/admin/accounts',
  customer: '/admin/customers/search',
  deal: '/admin/deals/view',
}

const CALENDAR_SOURCE_ROUTE = {
  account: '/admin/accounts',
  customer: '/admin/customers/search',
  deal: '/admin/deals/view',
  supportRequest: '/admin/support-requests',
  'support-request': '/admin/support-requests',
}

const toDateKey = (value) => {
  if (!value) return ''
  const date = value instanceof Date ? value : new Date(value)
  if (Number.isNaN(date.getTime())) return ''
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

const WEEKDAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

const formatMonthTitle = (date) => {
  return new Intl.DateTimeFormat('en-US', {
    month: 'long',
    year: 'numeric',
  }).format(date)
}

const formatLiveDate = (date) => {
  return new Intl.DateTimeFormat('en-US', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(date)
}

const formatLiveTime = (date) => {
  return new Intl.DateTimeFormat('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    second: '2-digit',
    hour12: true,
  }).format(date)
}

const buildCalendarDays = (visibleMonth, now) => {
  const startOfMonth = new Date(visibleMonth.getFullYear(), visibleMonth.getMonth(), 1)
  const endOfMonth = new Date(visibleMonth.getFullYear(), visibleMonth.getMonth() + 1, 0)
  const leadingDays = startOfMonth.getDay()
  const trailingDays = 6 - endOfMonth.getDay()
  const gridStart = new Date(startOfMonth)
  gridStart.setDate(startOfMonth.getDate() - leadingDays)
  const totalDays = endOfMonth.getDate() + leadingDays + trailingDays

  return Array.from({ length: totalDays }, (_, index) => {
    const date = new Date(gridStart)
    date.setDate(gridStart.getDate() + index)

    const isCurrentMonth = date.getMonth() === visibleMonth.getMonth()
    const isToday =
      date.getFullYear() === now.getFullYear() &&
      date.getMonth() === now.getMonth() &&
      date.getDate() === now.getDate()

    return {
      key: date.toISOString(),
      dayNumber: date.getDate(),
      date,
      isCurrentMonth,
      isToday,
    }
  })
}

const AdminCalendarPage = () => {
  const navigate = useNavigate()
  const { accounts, deals } = useData()
  const { user } = useAuth()
  const [reminderStatesById, setReminderStatesById] = useState(() => getAdminReminderStates())
  const [standaloneReminders, setStandaloneReminders] = useState(() => getStandaloneReminders())
  const [calendarEvents, setCalendarEvents] = useState([])
  const [selectedDateKey, setSelectedDateKey] = useState(() => toDateKey(new Date()))
  const [now, setNow] = useState(() => new Date())
  const [todayKey, setTodayKey] = useState(() => toDateKey(new Date()))
  const [visibleMonth, setVisibleMonth] = useState(() => {
    const current = new Date()
    return new Date(current.getFullYear(), current.getMonth(), 1)
  })

  useEffect(() => {
    const timer = window.setInterval(() => {
      const next = new Date()
      setNow(next)
      const nextKey = toDateKey(next)
      setTodayKey((current) => (current === nextKey ? current : nextKey))
    }, 1000)

    return () => window.clearInterval(timer)
  }, [])

  useEffect(() => subscribeAdminReminderStates(setReminderStatesById), [])
  useEffect(() => subscribeStandaloneReminders(setStandaloneReminders), [])

  useEffect(() => {
    let isMounted = true

    calendarApi.listEvents()
      .then((events) => {
        if (!isMounted) return
        setCalendarEvents(Array.isArray(events) ? events : [])
      })
      .catch(() => {
        if (isMounted) setCalendarEvents([])
      })

    return () => {
      isMounted = false
    }
  }, [])

  const remindersByDate = useMemo(() => {
    const reminders = getAdminReminders({
      accounts,
      deals,
      user,
      variantKey: 'active',
      reminderStatesById,
    })

    // Include active standalone reminders
    const activeStandalone = standaloneReminders
      .filter((r) => r.status === 'active')
      .map((r) => ({
        ...r,
        id: r.id,
        sourceType: 'standalone',
        sourceLabel: 'Reminder',
        name: r.title || 'Reminder',
        ownerName: r.createdBy || '',
      }))

    const lookup = new Map()
    const apiCalendarReminders = calendarEvents.map((event) => ({
      id: `calendar-${event.id || event._id || event.startAt || event.title}`,
      sourceType: event.relatedEntityType || event.data?.relatedEntityType || 'calendar',
      sourceLabel: event.category || 'Calendar',
      name: event.title || event.data?.title || 'Calendar event',
      ownerName: event.ownerName || event.createdByName || event.assignedToName || '',
      reminderDate: event.startAt || event.start_at || event.data?.startAt || '',
      reminderTime: String(event.startAt || event.start_at || event.data?.startAt || '').slice(11, 16),
      calendarEvent: true,
      relatedEntityId: event.relatedEntityId || event.related_entity_id || event.data?.relatedEntityId || '',
    }))

    ;[...reminders, ...activeStandalone, ...apiCalendarReminders].forEach((reminder) => {
      const key = toDateKey(reminder.reminderDate)
      if (!key) return
      const list = lookup.get(key) || []
      list.push(reminder)
      lookup.set(key, list)
    })
    return lookup
  }, [accounts, calendarEvents, deals, reminderStatesById, standaloneReminders, user])

  const calendarDays = useMemo(() => (
    buildCalendarDays(visibleMonth, new Date(todayKey + 'T00:00:00'))
  ), [visibleMonth, todayKey])

  const selectedDateReminders = useMemo(
    () => remindersByDate.get(selectedDateKey) || [],
    [remindersByDate, selectedDateKey]
  )

  const handleReminderClick = (reminder) => {
    const route = REMINDER_SOURCE_ROUTE[reminder.sourceType]
      || CALENDAR_SOURCE_ROUTE[reminder.sourceType]
    if (!route) return
    navigate(route, { state: { fromCalendarReminderId: reminder.id, fromCalendarReminderName: reminder.name, relatedEntityId: reminder.relatedEntityId } })
  }

  const handlePreviousMonth = () => {
    setVisibleMonth((currentMonth) => (
      new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1)
    ))
  }

  const handleNextMonth = () => {
    setVisibleMonth((currentMonth) => (
      new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1)
    ))
  }

  const handleGoToToday = () => {
    setVisibleMonth(new Date(now.getFullYear(), now.getMonth(), 1))
  }

  return (
    <div className="admin-calendar-page">
      <div className="admin-calendar-header">
        <div className="admin-calendar-title-wrap">
          <div className="admin-calendar-badge">
            <FaCalendarAlt />
          </div>
          <div>
            <h1 className="admin-calendar-title">Calendar</h1>
            <p className="admin-calendar-subtitle">Real-time full screen calendar view</p>
          </div>
        </div>

        <div className="admin-calendar-live-panel">
          <div className="admin-calendar-live-label">
            <FaClock />
            <span>Live now</span>
          </div>
          <div className="admin-calendar-live-time">{formatLiveTime(now)}</div>
          <div className="admin-calendar-live-date">{formatLiveDate(now)}</div>
        </div>
      </div>

      <div className="admin-calendar-shell">
        <div className="admin-calendar-toolbar">
          <div className="admin-calendar-month-controls">
            <button type="button" className="admin-calendar-nav-button" onClick={handlePreviousMonth} aria-label="Previous month">
              <FaChevronLeft />
            </button>
            <h2 className="admin-calendar-month-title">{formatMonthTitle(visibleMonth)}</h2>
            <button type="button" className="admin-calendar-nav-button" onClick={handleNextMonth} aria-label="Next month">
              <FaChevronRight />
            </button>
          </div>

          <button type="button" className="admin-calendar-today-button" onClick={handleGoToToday}>
            Today
          </button>
        </div>

        <div className="admin-calendar-date-panel">
          <div className="admin-calendar-date-panel-title">
            <FaCalendarAlt />
            <span>{selectedDateKey || todayKey}</span>
          </div>
          <div className="admin-calendar-date-panel-list">
            {selectedDateReminders.length > 0 ? selectedDateReminders.map((reminder) => (
              <button
                key={`selected-${reminder.id}`}
                type="button"
                className={`admin-calendar-date-panel-item admin-calendar-reminder--${reminder.sourceType}`}
                onClick={() => handleReminderClick(reminder)}
              >
                <FaCalendarAlt aria-hidden="true" />
                <strong>{reminder.sourceLabel}</strong>
                <span>{reminder.name}</span>
              </button>
            )) : (
              <span className="admin-calendar-date-panel-empty">No reminders for this date.</span>
            )}
          </div>
        </div>

        <div className="admin-calendar-grid">
          {WEEKDAY_LABELS.map((label) => (
            <div key={label} className="admin-calendar-weekday">
              {label}
            </div>
          ))}

          {calendarDays.map((day) => {
            const dayReminders = remindersByDate.get(toDateKey(day.date)) || []
            const visibleReminders = dayReminders.slice(0, 3)
            const overflow = dayReminders.length - visibleReminders.length
            return (
              <div
                key={day.key}
                className={[
                  'admin-calendar-day',
                  day.isCurrentMonth ? '' : 'admin-calendar-day--muted',
                  day.isToday ? 'admin-calendar-day--today' : '',
                  dayReminders.length > 0 ? 'admin-calendar-day--has-reminders' : '',
                ].filter(Boolean).join(' ')}
              >
                <button
                  type="button"
                  className="admin-calendar-day-number"
                  onClick={() => setSelectedDateKey(toDateKey(day.date))}
                  aria-label={`Show reminders for ${toDateKey(day.date)}`}
                >
                  {day.dayNumber}
                </button>
                {day.isToday ? (
                  <div className="admin-calendar-day-pill">Current Day</div>
                ) : null}
                {visibleReminders.length > 0 ? (
                  <div className="admin-calendar-day-reminders">
                    {visibleReminders.map((reminder) => (
                      <button
                        key={reminder.id}
                        type="button"
                        className={`admin-calendar-reminder admin-calendar-reminder--${reminder.sourceType}`}
                        onClick={() => handleReminderClick(reminder)}
                        title={`${reminder.sourceLabel}: ${reminder.name} (${reminder.ownerName})`}
                      >
                        <FaCalendarAlt className="admin-calendar-reminder-icon" aria-hidden="true" />
                        <span className="admin-calendar-reminder-source">{reminder.sourceLabel}</span>
                        <span className="admin-calendar-reminder-name">{reminder.name}</span>
                      </button>
                    ))}
                    {overflow > 0 ? (
                      <span className="admin-calendar-reminder-more">+{overflow} more</span>
                    ) : null}
                  </div>
                ) : null}
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}

export default AdminCalendarPage
