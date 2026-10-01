import { storage } from '../../utils/helpers'

export const ADMIN_REMINDER_STATES_STORAGE_KEY = 'crm_admin_reminder_states'
const ADMIN_REMINDER_STATES_EVENT = 'crm-admin-reminder-states:changed'

const normalizeReminderState = (reminderState = {}) => ({
  id: String(reminderState.id || ''),
  status: reminderState.status === 'closed' ? 'closed' : 'active',
  closedOn: reminderState.closedOn || '',
  closedByName: reminderState.closedByName || '',
  updatedAt: reminderState.updatedAt || new Date().toISOString(),
})

const broadcastReminderStatesChanged = () => {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent(ADMIN_REMINDER_STATES_EVENT))
  }
}

export const buildReminderStateId = (sourceType, sourceId) =>
  `${String(sourceType || '').trim()}:${String(sourceId || '').trim()}`

export const getAdminReminderStates = () => {
  const storedStates = storage.get(ADMIN_REMINDER_STATES_STORAGE_KEY, [])
  const normalizedStates = Array.isArray(storedStates) ? storedStates.map(normalizeReminderState) : []

  return normalizedStates.reduce((lookup, reminderState) => {
    lookup[reminderState.id] = reminderState
    return lookup
  }, {})
}

export const saveAdminReminderState = (reminderStateDefinition) => {
  const normalizedReminderState = normalizeReminderState(reminderStateDefinition)
  const existingStates = Object.values(getAdminReminderStates())
  const nextStates = [
    normalizedReminderState,
    ...existingStates.filter((entry) => entry.id !== normalizedReminderState.id),
  ]

  storage.set(ADMIN_REMINDER_STATES_STORAGE_KEY, nextStates)
  broadcastReminderStatesChanged()
  return normalizedReminderState
}

export const closeAdminReminder = ({ sourceType, sourceId, userName = '' }) =>
  saveAdminReminderState({
    id: buildReminderStateId(sourceType, sourceId),
    status: 'closed',
    closedOn: new Date().toISOString(),
    closedByName: userName,
    updatedAt: new Date().toISOString(),
  })

export const reopenAdminReminder = ({ sourceType, sourceId }) =>
  saveAdminReminderState({
    id: buildReminderStateId(sourceType, sourceId),
    status: 'active',
    closedOn: '',
    closedByName: '',
    updatedAt: new Date().toISOString(),
  })

export const subscribeAdminReminderStates = (callback) => {
  if (typeof window === 'undefined') {
    return () => {}
  }

  const handleStorage = (event) => {
    if (event.key && event.key !== ADMIN_REMINDER_STATES_STORAGE_KEY) {
      return
    }

    callback(getAdminReminderStates())
  }

  const handleLocalEvent = () => {
    callback(getAdminReminderStates())
  }

  window.addEventListener('storage', handleStorage)
  window.addEventListener(ADMIN_REMINDER_STATES_EVENT, handleLocalEvent)

  return () => {
    window.removeEventListener('storage', handleStorage)
    window.removeEventListener(ADMIN_REMINDER_STATES_EVENT, handleLocalEvent)
  }
}
