import React, { useEffect, useMemo, useState } from 'react'
import { FaChevronLeft, FaChevronRight, FaPencilAlt } from 'react-icons/fa'
import { useData } from '../../context/DataContext'
import { useAuth } from '../../context/AuthContext'
import { getAdminReminders } from '../../features/adminReminders/getAdminReminders'
import { getAdminReminderStates, subscribeAdminReminderStates } from '../../features/adminReminders/reminderStorage'
import { getStandaloneReminders, saveStandaloneReminder, subscribeStandaloneReminders } from '../../features/standaloneReminders/standaloneReminderStorage'
import { calendarApi } from '../../services/calendarApi'
import { customerService } from '../../services/customerService'
import { authService } from '../../services/authService'
import './AdminCalendarPage.css'

const WEEKDAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
const VIEW_OPTIONS = ['month']

const titleize = (value = '') =>
  String(value || '')
    .replace(/[_-]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/\b\w/g, (character) => character.toUpperCase())

const toDateKey = (value) => {
  if (!value) return ''
  const date = value instanceof Date ? value : new Date(value)
  if (Number.isNaN(date.getTime())) return ''
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
}

const fromDateKey = (key) => {
  const [year, month, day] = String(key || '').split('-').map(Number)
  if (!year || !month || !day) return new Date()
  return new Date(year, month - 1, day)
}

const addDays = (date, days) => {
  const nextDate = new Date(date)
  nextDate.setDate(nextDate.getDate() + days)
  return nextDate
}

const formatTitleDate = (date) => (
  new Intl.DateTimeFormat('en-US', {
    month: 'long',
    year: 'numeric',
  }).format(date)
)

const formatFullDate = (value) => {
  const date = value instanceof Date ? value : fromDateKey(value)
  return new Intl.DateTimeFormat('en-US', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(date)
}

const formatTime = (value, fallback = '') => {
  if (fallback) return fallback
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return ''
  return new Intl.DateTimeFormat('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  }).format(date)
}

const buildMonthDays = (visibleDate, todayKey) => {
  const startOfMonth = new Date(visibleDate.getFullYear(), visibleDate.getMonth(), 1)
  const endOfMonth = new Date(visibleDate.getFullYear(), visibleDate.getMonth() + 1, 0)
  const gridStart = addDays(startOfMonth, -startOfMonth.getDay())
  const totalDays = endOfMonth.getDate() + startOfMonth.getDay() + (6 - endOfMonth.getDay())

  return Array.from({ length: totalDays }, (_, index) => {
    const date = addDays(gridStart, index)
    const key = toDateKey(date)
    return {
      key,
      date,
      dayNumber: date.getDate(),
      isCurrentMonth: date.getMonth() === visibleDate.getMonth(),
      isToday: key === todayKey,
    }
  })
}

const getReminderDate = (reminder = {}) => (
  reminder.reminderDate || reminder.remindAt || reminder.startAt || reminder.start_at || reminder.data?.startAt || ''
)

const getReminderTime = (reminder = {}) => (
  reminder.reminderTime || String(reminder.remindAt || reminder.startAt || reminder.start_at || '').slice(11, 16)
)

const normalizeMongoReminder = (reminder = {}) => ({
  ...reminder,
  id: `mongo-${reminder.id || reminder._id || reminder.remindAt || reminder.title}`,
  sourceId: reminder.id || reminder._id || '',
  sourceType: 'mongo-reminder',
  sourceLabel: reminder.relatedEntityType ? titleize(reminder.relatedEntityType) : 'Reminder',
  sourceNumber: reminder.relatedEntityId || '',
  name: reminder.title || reminder.message || 'Reminder',
  ownerName: reminder.assignedToName || reminder.ownerName || reminder.createdByName || reminder.assignedTo || 'Unassigned',
  reminderDate: getReminderDate(reminder),
  reminderTime: getReminderTime(reminder),
  reminderMode: reminder.reminderMode || reminder.recurrence || 'Follow Up',
  note: reminder.note || reminder.message || '-',
  status: reminder.status || 'active',
})

const normalizeStandaloneReminder = (reminder = {}) => ({
  ...reminder,
  id: `standalone-${reminder.id || reminder.createdAt || reminder.title}`,
  sourceId: reminder.id || '',
  sourceType: 'standalone',
  sourceLabel: 'Reminder',
  sourceNumber: '',
  name: reminder.title || 'Reminder',
  ownerName: reminder.createdBy || 'Unassigned',
  reminderDate: reminder.reminderDate || reminder.date || reminder.createdAt || '',
  reminderTime: reminder.reminderTime || reminder.time || '',
  reminderMode: reminder.reminderMode || 'Follow Up',
  note: reminder.message || reminder.note || '-',
  status: reminder.status || 'active',
})

const normalizeCalendarEvent = (event = {}) => ({
  ...event,
  id: `calendar-${event.id || event._id || event.startAt || event.title}`,
  sourceId: event.id || event._id || '',
  sourceType: event.relatedEntityType || event.data?.relatedEntityType || 'calendar',
  sourceLabel: event.category || 'Calendar',
  sourceNumber: event.relatedEntityId || event.related_entity_id || event.data?.relatedEntityId || '',
  name: event.title || event.data?.title || 'Calendar event',
  ownerName: event.ownerName || event.createdByName || event.assignedToName || 'Unassigned',
  reminderDate: event.startAt || event.start_at || event.data?.startAt || '',
  reminderTime: String(event.startAt || event.start_at || event.data?.startAt || '').slice(11, 16),
  reminderMode: event.category || 'Calendar',
  note: event.description || event.data?.description || '-',
  status: 'active',
})

const CalendarReminderButton = ({ reminder, onClick }) => (
  <button
    type="button"
    className={`admin-calendar-reminder admin-calendar-reminder--${reminder.sourceType}`}
    onClick={() => onClick(reminder)}
    title={`${reminder.sourceLabel}: ${reminder.name}`}
  >
    <span className="admin-calendar-reminder-source">{reminder.sourceLabel}</span>
    <span className="admin-calendar-reminder-name">{reminder.name}</span>
  </button>
)

const EditableCalendarField = ({ label, value, displayValue, field, type = 'text', options = null, onSave }) => {
  const [isEditing, setIsEditing] = useState(false)
  const [draft, setDraft] = useState(value || '')

  useEffect(() => {
    setDraft(value || '')
  }, [value])

  const commit = () => {
    setIsEditing(false)
    if (String(draft || '') === String(value || '')) return
    onSave(field, draft)
  }

  return (
    <div className="admin-calendar-edit-field">
      <span className="admin-calendar-edit-label">
        {label}
        <button
          type="button"
          className="admin-calendar-edit-pencil"
          onClick={() => setIsEditing(true)}
          aria-label={`Edit ${label}`}
        >
          <FaPencilAlt />
        </button>
      </span>
      {isEditing && Array.isArray(options) ? (
        <select
          className="admin-calendar-edit-input"
          value={draft}
          autoFocus
          onChange={(event) => {
            setDraft(event.target.value)
            setIsEditing(false)
            if (String(event.target.value || '') !== String(value || '')) {
              onSave(field, event.target.value)
            }
          }}
          onBlur={() => setIsEditing(false)}
        >
          {value && !options.some((option) => option.value === value) ? (
            <option value={value}>{displayValue || value}</option>
          ) : null}
          {options.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      ) : isEditing ? (
        <input
          className="admin-calendar-edit-input"
          type={type}
          value={draft}
          autoFocus
          onChange={(event) => setDraft(event.target.value)}
          onBlur={commit}
          onKeyDown={(event) => {
            if (event.key === 'Enter') commit()
            if (event.key === 'Escape') {
              setDraft(value || '')
              setIsEditing(false)
            }
          }}
        />
      ) : (
        <strong
          className="admin-calendar-edit-value"
          role="button"
          tabIndex={0}
          onClick={() => setIsEditing(true)}
          onKeyDown={(event) => event.key === 'Enter' && setIsEditing(true)}
        >
          {displayValue || value || '-'}
        </strong>
      )}
    </div>
  )
}

const AdminCalendarPage = ({ isAdmin = true }) => {
  const {
    accounts,
    deals,
    supportRequests,
    reminders: mongoReminders,
    updateAccount,
    updateDeal,
    updateSupportRequest,
    updateReminder,
    addNotification,
  } = useData()
  const { user } = useAuth()
  const [reminderStatesById, setReminderStatesById] = useState(() => getAdminReminderStates())
  const [standaloneReminders, setStandaloneReminders] = useState(() => getStandaloneReminders())
  const [calendarEvents, setCalendarEvents] = useState([])
  const [viewMode, setViewMode] = useState('month')
  const [selectedDateKey, setSelectedDateKey] = useState(() => toDateKey(new Date()))
  const [visibleDate, setVisibleDate] = useState(() => new Date())
  const [selectedReminder, setSelectedReminder] = useState(null)
  const [localReminderEdits, setLocalReminderEdits] = useState({})
  const todayKey = toDateKey(new Date())

  const ownerOptions = useMemo(() => (
    authService.getAvailableUsers()
      .filter((entry) => entry.name && entry.name !== 'System Administrator')
      .map((entry) => ({
        value: entry.name,
        label: entry.name,
        userId: entry.id,
      }))
  ), [])

  useEffect(() => subscribeAdminReminderStates(setReminderStatesById), [])
  useEffect(() => subscribeStandaloneReminders(setStandaloneReminders), [])

  useEffect(() => {
    let isMounted = true

    calendarApi.listEvents()
      .then((events) => {
        if (isMounted) setCalendarEvents(Array.isArray(events) ? events : [])
      })
      .catch(() => {
        if (isMounted) setCalendarEvents([])
      })

    return () => {
      isMounted = false
    }
  }, [])

  const remindersByDate = useMemo(() => {
    const legacyReminders = getAdminReminders({
      accounts,
      deals,
      supportRequests,
      user,
      variantKey: 'active',
      reminderStatesById,
      isAdmin,
    })

    const mongoRows = (mongoReminders || [])
      .map(normalizeMongoReminder)
      .filter((reminder) => {
        if (String(reminder.status || '').toLowerCase() === 'closed') return false
        if (isAdmin) return true
        return String(reminder.assignedTo || reminder.createdBy || '') === String(user?.id || '')
      })

    const standaloneRows = isAdmin
      ? standaloneReminders.filter((reminder) => reminder.status === 'active').map(normalizeStandaloneReminder)
      : []

    const calendarRows = calendarEvents.map(normalizeCalendarEvent)
    const lookup = new Map()

    ;[...legacyReminders, ...mongoRows, ...standaloneRows, ...calendarRows].forEach((reminder) => {
      const editedReminder = {
        ...reminder,
        ...(localReminderEdits[reminder.id] || {}),
      }
      const key = toDateKey(getReminderDate(editedReminder))
      if (!key) return
      const list = lookup.get(key) || []
      list.push(editedReminder)
      lookup.set(key, list)
    })

    lookup.forEach((items) => {
      items.sort((left, right) => String(getReminderTime(left)).localeCompare(String(getReminderTime(right))))
    })

    return lookup
  }, [accounts, calendarEvents, deals, isAdmin, localReminderEdits, mongoReminders, reminderStatesById, standaloneReminders, supportRequests, user])

  const monthDays = useMemo(() => buildMonthDays(visibleDate, todayKey), [todayKey, visibleDate])
  const selectedDateReminders = remindersByDate.get(selectedDateKey) || []
  const rangeTitle = viewMode === 'day'
    ? formatFullDate(selectedDateKey)
    : formatTitleDate(visibleDate)

  const changeRange = (direction) => {
    if (viewMode === 'month') {
      setVisibleDate((current) => new Date(current.getFullYear(), current.getMonth() + direction, 1))
      return
    }

    const nextDate = addDays(fromDateKey(selectedDateKey), direction)
    setSelectedDateKey(toDateKey(nextDate))
    setVisibleDate(nextDate)
  }

  const handleSelectDate = (date) => {
    const key = toDateKey(date)
    setSelectedDateKey(key)
    setVisibleDate(date)
    setSelectedReminder(null)
    if (viewMode === 'month') setViewMode('day')
  }

  const handleToday = () => {
    const today = new Date()
    setVisibleDate(today)
    setSelectedDateKey(toDateKey(today))
  }

  const handleViewMode = (mode) => {
    setViewMode(mode)
    setVisibleDate(fromDateKey(selectedDateKey))
  }

  const handleSelectReminder = (reminder) => {
    const reminderDateKey = toDateKey(getReminderDate(reminder))
    if (reminderDateKey) {
      setSelectedDateKey(reminderDateKey)
      setVisibleDate(fromDateKey(reminderDateKey))
    }
    setViewMode('day')
    setSelectedReminder(reminder)
  }

  const buildUpdatedReminder = (reminder, field, value) => {
    const nextReminder = { ...reminder, [field]: value }
    if (field === 'date') nextReminder.reminderDate = value
    if (field === 'time') nextReminder.reminderTime = value
    if (field === 'mode') nextReminder.reminderMode = value
    if (field === 'source') nextReminder.sourceLabel = value
    if (field === 'owner') nextReminder.ownerName = value
    return nextReminder
  }

  const persistReminderEdit = async (field, value) => {
    if (!selectedReminder) return

    const nextReminder = buildUpdatedReminder(selectedReminder, field, value)
    setSelectedReminder(nextReminder)
    setLocalReminderEdits((current) => ({
      ...current,
      [selectedReminder.id]: nextReminder,
    }))

    const dateValue = field === 'date' ? value : (nextReminder.reminderDate || toDateKey(getReminderDate(nextReminder)))
    const timeValue = field === 'time' ? value : (nextReminder.reminderTime || getReminderTime(nextReminder) || '09:00')
    const baseReminderUpdates = {
      reminderDate: dateValue,
      reminderTime: timeValue,
      reminderMode: field === 'mode' ? value : nextReminder.reminderMode,
      reminderNote: field === 'note' ? value : nextReminder.note,
    }
    const selectedOwner = ownerOptions.find((option) => option.value === value)
    const accountOwnerUpdates = field === 'owner' ? { accountOwner: value, ownerName: value } : {}
    const dealOwnerUpdates = field === 'owner' ? { dealOwner: value, ownerName: value } : {}
    const customerOwnerUpdates = field === 'owner' ? { customerOwner: value, ownerName: value } : {}
    const requestOwnerUpdates = field === 'owner' ? { ownerName: value, assignedToName: value, assignedTo: selectedOwner?.userId || value } : {}

    let result = { success: true }

    if (nextReminder.sourceType === 'account') {
      result = await updateAccount(nextReminder.sourceId, { ...baseReminderUpdates, ...accountOwnerUpdates })
    } else if (nextReminder.sourceType === 'deal') {
      result = await updateDeal(nextReminder.sourceId, { ...baseReminderUpdates, ...dealOwnerUpdates })
    } else if (nextReminder.sourceType === 'sr') {
      result = await updateSupportRequest(nextReminder.sourceId, { ...baseReminderUpdates, ...requestOwnerUpdates })
    } else if (nextReminder.sourceType === 'customer') {
      const customer = customerService.getCustomerById(nextReminder.sourceId)
      if (customer) {
        await customerService.saveCustomer({ ...customer, ...baseReminderUpdates, ...customerOwnerUpdates })
      }
    } else if (nextReminder.sourceType === 'mongo-reminder') {
      result = await updateReminder(nextReminder.sourceId, {
        title: field === 'name' ? value : nextReminder.name,
        status: field === 'status' ? value : nextReminder.status,
        reminderDate: dateValue,
        reminderTime: timeValue,
        reminderMode: field === 'mode' ? value : nextReminder.reminderMode,
        message: field === 'note' ? value : nextReminder.note,
        note: field === 'note' ? value : nextReminder.note,
        assignedTo: field === 'owner' ? (selectedOwner?.userId || nextReminder.assignedTo || value) : nextReminder.assignedTo,
        assignedToName: field === 'owner' ? value : nextReminder.assignedToName,
        ownerName: field === 'owner' ? value : nextReminder.ownerName,
        remindAt: dateValue ? `${dateValue}T${timeValue || '09:00'}:00` : nextReminder.remindAt,
      })
    } else if (nextReminder.sourceType === 'standalone') {
      saveStandaloneReminder({
        ...nextReminder,
        id: nextReminder.sourceId,
        title: field === 'name' ? value : nextReminder.name,
        note: field === 'note' ? value : nextReminder.note,
        reminderDate: dateValue,
        reminderTime: timeValue,
        reminderMode: field === 'mode' ? value : nextReminder.reminderMode,
        status: field === 'status' ? value : nextReminder.status,
        createdBy: field === 'owner' ? value : nextReminder.createdBy,
        updatedAt: new Date().toISOString(),
      })
    }

    if (!result?.success) {
      addNotification?.('error', 'Calendar edit', result?.message || 'Unable to save this calendar field.')
      return
    }

    addNotification?.('success', 'Calendar edit', 'Saved.')
  }

  const renderDayCard = (day, compact = false) => {
    const dayReminders = remindersByDate.get(day.key) || []
    const visibleReminders = compact ? dayReminders.slice(0, 3) : dayReminders
    const overflow = dayReminders.length - visibleReminders.length

    return (
      <div
        key={day.key}
        className={[
          'admin-calendar-day',
          compact ? '' : 'admin-calendar-day--wide',
          day.isCurrentMonth ? '' : 'admin-calendar-day--muted',
          day.isToday ? 'admin-calendar-day--today' : '',
          dayReminders.length > 0 ? 'admin-calendar-day--has-reminders' : '',
        ].filter(Boolean).join(' ')}
      >
        <button
          type="button"
          className="admin-calendar-day-number"
          onClick={() => handleSelectDate(day.date)}
          aria-label={`Show calendar data for ${day.key}`}
        >
          {compact ? day.dayNumber : `${WEEKDAY_LABELS[day.date.getDay()]} ${day.dayNumber}`}
        </button>
        {day.isToday ? <div className="admin-calendar-day-pill">Today</div> : null}
        <div className="admin-calendar-day-reminders">
          {visibleReminders.map((reminder) => (
            <CalendarReminderButton key={reminder.id} reminder={reminder} onClick={handleSelectReminder} />
          ))}
          {overflow > 0 ? (
            <button type="button" className="admin-calendar-reminder-more" onClick={() => handleSelectDate(day.date)}>
              +{overflow} more
            </button>
          ) : null}
        </div>
      </div>
    )
  }

  return (
    <div className="admin-calendar-page">
      <div className="admin-calendar-header">
        <div className="admin-calendar-title-wrap">
          <div>
            <h1 className="admin-calendar-title">Calendar</h1>
            <p className="admin-calendar-subtitle">{isAdmin ? 'Admin reminders and events' : 'Your reminders and events'}</p>
          </div>
        </div>

        <div className="admin-calendar-view-actions" aria-label="Calendar view">
          {VIEW_OPTIONS.map((mode) => (
            <button
              key={mode}
              type="button"
              className={`admin-calendar-view-button${viewMode === mode ? ' admin-calendar-view-button--active' : ''}`}
              onClick={() => handleViewMode(mode)}
            >
              {titleize(mode)}
            </button>
          ))}
        </div>
      </div>

      <div className="admin-calendar-shell">
        <div className="admin-calendar-toolbar">
          <div className="admin-calendar-month-controls">
            <button type="button" className="admin-calendar-nav-button" onClick={() => changeRange(-1)} aria-label="Previous range">
              <FaChevronLeft />
            </button>
            <h2 className="admin-calendar-month-title">{rangeTitle}</h2>
            <button type="button" className="admin-calendar-nav-button" onClick={() => changeRange(1)} aria-label="Next range">
              <FaChevronRight />
            </button>
          </div>

          <button type="button" className="admin-calendar-today-button" onClick={handleToday}>
            Today
          </button>
        </div>

        {viewMode === 'month' && (
          <div className="admin-calendar-grid">
            {WEEKDAY_LABELS.map((label) => (
              <div key={label} className="admin-calendar-weekday">{label}</div>
            ))}
            {monthDays.map((day) => renderDayCard(day, true))}
          </div>
        )}

        {viewMode === 'day' && !selectedReminder && (
          <div className="admin-calendar-day-view">
            {selectedDateReminders.length > 0 ? selectedDateReminders.map((reminder) => (
              <button
                key={`day-${reminder.id}`}
                type="button"
                className="admin-calendar-day-view-item"
                onClick={() => handleSelectReminder(reminder)}
              >
                <span>{getReminderTime(reminder) || 'All day'}</span>
                <strong>{reminder.name}</strong>
                <small>{reminder.sourceLabel} | {reminder.ownerName || 'Unassigned'}</small>
              </button>
            )) : (
              <div className="admin-calendar-day-view-empty">No calendar data for this day.</div>
            )}
          </div>
        )}

        {selectedReminder && (
          <section className="admin-calendar-detail">
            <button type="button" className="admin-calendar-detail-close" onClick={() => setSelectedReminder(null)}>
              Clear
            </button>
            <div className="admin-calendar-detail-grid">
              <EditableCalendarField label="Name" field="name" value={selectedReminder.name || ''} onSave={persistReminderEdit} />
              <EditableCalendarField
                label="Date"
                field="date"
                type="date"
                value={toDateKey(getReminderDate(selectedReminder))}
                displayValue={formatFullDate(toDateKey(getReminderDate(selectedReminder)))}
                onSave={persistReminderEdit}
              />
              <EditableCalendarField
                label="Time"
                field="time"
                type="time"
                value={getReminderTime(selectedReminder) || ''}
                displayValue={formatTime(getReminderDate(selectedReminder), getReminderTime(selectedReminder)) || 'All day'}
                onSave={persistReminderEdit}
              />
              <EditableCalendarField label="Source" field="source" value={selectedReminder.sourceLabel || ''} onSave={persistReminderEdit} />
              <EditableCalendarField
                label="Owner"
                field="owner"
                value={selectedReminder.ownerName || ''}
                displayValue={selectedReminder.ownerName || 'Unassigned'}
                options={ownerOptions}
                onSave={persistReminderEdit}
              />
              <EditableCalendarField label="Status" field="status" value={titleize(selectedReminder.status || 'active')} onSave={persistReminderEdit} />
              <EditableCalendarField label="Mode" field="mode" value={selectedReminder.reminderMode || '-'} onSave={persistReminderEdit} />
            </div>
            <div className="admin-calendar-detail-note">
              <EditableCalendarField label="Note" field="note" value={selectedReminder.note || selectedReminder.message || '-'} onSave={persistReminderEdit} />
            </div>
          </section>
        )}
      </div>
    </div>
  )
}

export default AdminCalendarPage
