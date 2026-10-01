const ADMIN_LAUNCHPAD_STORAGE_KEY = 'crm_admin_launchpad'

const defaultLaunchpadState = {
  defaultModuleRoute: null,
  preferences: {
    showTips: true,
    compactCards: false
  }
}

const getStorageBucket = () => {
  try {
    const rawValue = localStorage.getItem(ADMIN_LAUNCHPAD_STORAGE_KEY)
    return rawValue ? JSON.parse(rawValue) : {}
  } catch {
    return {}
  }
}

const saveStorageBucket = (value) => {
  localStorage.setItem(ADMIN_LAUNCHPAD_STORAGE_KEY, JSON.stringify(value))
}

const getAdminStorageKey = (user) => user?.id || 'default-admin'

export const getAdminLaunchpadState = (user) => {
  const bucket = getStorageBucket()
  const savedState = bucket[getAdminStorageKey(user)]

  if (!savedState) {
    return defaultLaunchpadState
  }

  return {
    defaultModuleRoute: savedState.defaultModuleRoute || null,
    preferences: {
      ...defaultLaunchpadState.preferences,
      ...(savedState.preferences || {})
    }
  }
}

export const setAdminDefaultModuleRoute = (user, route) => {
  const bucket = getStorageBucket()
  const storageKey = getAdminStorageKey(user)
  const currentState = getAdminLaunchpadState(user)

  bucket[storageKey] = {
    ...currentState,
    defaultModuleRoute: route || null
  }

  saveStorageBucket(bucket)
  return bucket[storageKey]
}

export const getAdminDefaultModuleRoute = (user) => {
  const state = getAdminLaunchpadState(user)
  return state.defaultModuleRoute || '/admin/sales-dashboard'
}

export const saveAdminLaunchpadPreferences = (user, preferences) => {
  const bucket = getStorageBucket()
  const storageKey = getAdminStorageKey(user)
  const currentState = getAdminLaunchpadState(user)

  bucket[storageKey] = {
    ...currentState,
    preferences: {
      ...currentState.preferences,
      ...preferences
    }
  }

  saveStorageBucket(bucket)
  return bucket[storageKey]
}

export const getAdminLaunchpadPreferences = (user) => (
  getAdminLaunchpadState(user).preferences
)
