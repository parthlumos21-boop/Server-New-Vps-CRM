import { storage } from '../../utils/helpers'

const STANDALONE_REMINDERS_KEY = 'crm_standalone_reminders'
const STANDALONE_REMINDERS_EVENT = 'crm-standalone-reminders:changed'

const generateId = () => `sr-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`

const normalizeReminder = (reminder = {}) => ({
  id: String(reminder.id || generateId()),
  title: String(reminder.title || '').trim(),
  note: String(reminder.note || '').trim(),
  reminderDate: reminder.reminderDate || '',
  reminderTime: reminder.reminderTime || '09:00',
  reminderMode: reminder.reminderMode || 'Call',
  status: reminder.status === 'closed' ? 'closed' : 'active',
  createdBy: String(reminder.createdBy || '').trim(),
  createdAt: reminder.createdAt || new Date().toISOString(),
  closedOn: reminder.closedOn || '',
  closedByName: reminder.closedByName || '',
  updatedAt: reminder.updatedAt || new Date().toISOString(),
  linkedTaskId: reminder.linkedTaskId || '',
})

const broadcastChanged = () => {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent(STANDALONE_REMINDERS_EVENT))
  }
}

export const getStandaloneReminders = () => {
  const stored = storage.get(STANDALONE_REMINDERS_KEY, [])
  return Array.isArray(stored) ? stored.map(normalizeReminder) : []
}

export const saveStandaloneReminder = (reminderData) => {
  const normalized = normalizeReminder(reminderData)
  const existing = getStandaloneReminders()
  const idx = existing.findIndex((r) => r.id === normalized.id)
  const next = idx >= 0
    ? existing.map((r) => (r.id === normalized.id ? normalized : r))
    : [normalized, ...existing]

  storage.set(STANDALONE_REMINDERS_KEY, next)
  broadcastChanged()
  return normalized
}

export const addStandaloneReminder = (data) => {
  const reminder = normalizeReminder({
    ...data,
    id: generateId(),
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  })
  const existing = getStandaloneReminders()
  storage.set(STANDALONE_REMINDERS_KEY, [reminder, ...existing])
  broadcastChanged()
  return reminder
}

export const closeStandaloneReminder = (id, closedByName = '') => {
  const existing = getStandaloneReminders()
  const next = existing.map((r) =>
    r.id === id
      ? { ...r, status: 'closed', closedOn: new Date().toISOString(), closedByName, updatedAt: new Date().toISOString() }
      : r
  )
  storage.set(STANDALONE_REMINDERS_KEY, next)
  broadcastChanged()
}

export const reopenStandaloneReminder = (id) => {
  const existing = getStandaloneReminders()
  const next = existing.map((r) =>
    r.id === id
      ? { ...r, status: 'active', closedOn: '', closedByName: '', updatedAt: new Date().toISOString() }
      : r
  )
  storage.set(STANDALONE_REMINDERS_KEY, next)
  broadcastChanged()
}

export const deleteStandaloneReminder = (id) => {
  const existing = getStandaloneReminders()
  storage.set(STANDALONE_REMINDERS_KEY, existing.filter((r) => r.id !== id))
  broadcastChanged()
}

export const subscribeStandaloneReminders = (callback) => {
  if (typeof window === 'undefined') return () => {}

  const handleStorage = (event) => {
    if (event.key && event.key !== STANDALONE_REMINDERS_KEY) return
    callback(getStandaloneReminders())
  }

  const handleLocal = () => callback(getStandaloneReminders())

  window.addEventListener('storage', handleStorage)
  window.addEventListener(STANDALONE_REMINDERS_EVENT, handleLocal)

  return () => {
    window.removeEventListener('storage', handleStorage)
    window.removeEventListener(STANDALONE_REMINDERS_EVENT, handleLocal)
  }
}
