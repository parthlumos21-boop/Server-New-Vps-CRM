const ADMIN_BOOKMARKS_STORAGE_KEY = 'crm_admin_bookmarks'
const ADMIN_BOOKMARKS_EVENT = 'crm:admin-bookmarks-changed'

const getStorageBucket = () => {
  try {
    const rawValue = localStorage.getItem(ADMIN_BOOKMARKS_STORAGE_KEY)
    return rawValue ? JSON.parse(rawValue) : {}
  } catch {
    return {}
  }
}

const saveStorageBucket = (value) => {
  localStorage.setItem(ADMIN_BOOKMARKS_STORAGE_KEY, JSON.stringify(value))
}

const getUserKey = (user) => user?.id || 'default-user'

const normalizeBookmarks = (bookmarks = []) => (
  bookmarks
    .filter(Boolean)
    .map((bookmark) => ({
      id: String(bookmark.id || bookmark.route || bookmark.label || Date.now()),
      label: String(bookmark.label || 'Untitled Bookmark'),
      route: String(bookmark.route || '/admin'),
      iconKey: String(bookmark.iconKey || 'profile'),
    }))
)

export const getAdminBookmarks = (user) => {
  const bucket = getStorageBucket()
  return normalizeBookmarks(bucket[getUserKey(user)] || [])
}

export const saveAdminBookmarks = (user, bookmarks) => {
  const bucket = getStorageBucket()
  bucket[getUserKey(user)] = normalizeBookmarks(bookmarks)
  saveStorageBucket(bucket)
  window.dispatchEvent(new CustomEvent(ADMIN_BOOKMARKS_EVENT, { detail: bucket[getUserKey(user)] }))
  return bucket[getUserKey(user)]
}

export const toggleAdminBookmark = (user, bookmark) => {
  const currentBookmarks = getAdminBookmarks(user)
  const exists = currentBookmarks.some((entry) => entry.route === bookmark.route)

  if (exists) {
    return saveAdminBookmarks(user, currentBookmarks.filter((entry) => entry.route !== bookmark.route))
  }

  return saveAdminBookmarks(user, [...currentBookmarks, bookmark])
}

export const subscribeAdminBookmarks = (user, callback) => {
  const handleCustomEvent = (event) => {
    callback(normalizeBookmarks(event.detail))
  }

  const handleStorageEvent = (event) => {
    if (event.key === ADMIN_BOOKMARKS_STORAGE_KEY) {
      callback(getAdminBookmarks(user))
    }
  }

  window.addEventListener(ADMIN_BOOKMARKS_EVENT, handleCustomEvent)
  window.addEventListener('storage', handleStorageEvent)

  return () => {
    window.removeEventListener(ADMIN_BOOKMARKS_EVENT, handleCustomEvent)
    window.removeEventListener('storage', handleStorageEvent)
  }
}
