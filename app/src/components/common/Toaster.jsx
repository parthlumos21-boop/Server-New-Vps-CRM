import React, { useEffect, useRef, useState } from 'react'
import { FiAlertCircle, FiCheckCircle, FiInfo, FiX, FiXCircle } from 'react-icons/fi'
import { useAuth } from '../../context/AuthContext'
import { useData } from '../../context/DataContext'
import './Toaster.css'

const TOAST_DURATION_MS = 4000
const MAX_VISIBLE = 4
const MAX_STORED_SEEN = 300
const SEEN_STORAGE_PREFIX = 'crm_seen_toast_notifications'

const ICON_BY_TYPE = {
  success: FiCheckCircle,
  error: FiXCircle,
  warning: FiAlertCircle,
  info: FiInfo,
}

const getToastKey = (entry = {}) => String(
  entry.id
  || `${entry.title || ''}:${entry.message || ''}:${entry.timestamp || entry.createdAt || ''}`
)

const getSeenStorageKey = (user) => {
  const userKey = user?.id || user?.email || user?.username || 'guest'
  return `${SEEN_STORAGE_PREFIX}_${userKey}`
}

const readSeenNotifications = (storageKey) => {
  try {
    const rawValue = window.localStorage.getItem(storageKey)
    const parsedValue = JSON.parse(rawValue || '[]')
    return new Set(Array.isArray(parsedValue) ? parsedValue.map(String) : [])
  } catch {
    return new Set()
  }
}

const saveSeenNotifications = (storageKey, seenSet) => {
  try {
    const values = Array.from(seenSet).slice(-MAX_STORED_SEEN)
    window.localStorage.setItem(storageKey, JSON.stringify(values))
  } catch {
    // Toast dedupe is helpful, but storage failures should never break the UI.
  }
}

const Toaster = () => {
  const { notifications, clearNotification } = useData()
  const { user } = useAuth()
  const [visible, setVisible] = useState([])
  const seenStorageKey = getSeenStorageKey(user)
  const seenIdsRef = useRef(null)
  const activeStorageKeyRef = useRef('')
  const timersRef = useRef(new Map())

  if (activeStorageKeyRef.current !== seenStorageKey) {
    activeStorageKeyRef.current = seenStorageKey
    seenIdsRef.current = readSeenNotifications(seenStorageKey)
  }

  useEffect(() => {
    if (!notifications || notifications.length === 0) return

    const incoming = []
    for (const entry of notifications) {
      const toastKey = getToastKey(entry)
      if (!seenIdsRef.current.has(toastKey)) {
        seenIdsRef.current.add(toastKey)
        incoming.push(entry)
      }
    }

    if (incoming.length === 0) return

    saveSeenNotifications(seenStorageKey, seenIdsRef.current)
    setVisible((prev) => [...incoming, ...prev].slice(0, MAX_VISIBLE))

    incoming.forEach((entry) => {
      const toastKey = getToastKey(entry)
      const timerId = setTimeout(() => {
        setVisible((prev) => prev.filter((item) => getToastKey(item) !== toastKey))
        timersRef.current.delete(toastKey)
      }, TOAST_DURATION_MS)
      timersRef.current.set(toastKey, timerId)
    })
  }, [notifications, seenStorageKey])

  useEffect(() => () => {
    timersRef.current.forEach((timerId) => clearTimeout(timerId))
    timersRef.current.clear()
  }, [])

  const dismiss = (entry) => {
    const toastKey = getToastKey(entry)
    const timerId = timersRef.current.get(toastKey)
    if (timerId) {
      clearTimeout(timerId)
      timersRef.current.delete(toastKey)
    }
    setVisible((prev) => prev.filter((item) => getToastKey(item) !== toastKey))
    if (typeof clearNotification === 'function' && entry.id) {
      clearNotification(entry.id)
    }
  }

  if (visible.length === 0) return null

  return (
    <div className="toaster-root" role="status" aria-live="polite">
      {visible.map((entry) => {
        const type = entry.type || 'info'
        const Icon = ICON_BY_TYPE[type] || ICON_BY_TYPE.info
        return (
          <div key={getToastKey(entry)} className={`toaster-item toaster-item--${type}`}>
            <span className={`toaster-icon toaster-icon--${type}`}>
              <Icon aria-hidden="true" />
            </span>
            <div className="toaster-body">
              {entry.title ? <div className="toaster-title">{entry.title}</div> : null}
              {entry.message ? <div className="toaster-message">{entry.message}</div> : null}
            </div>
            <button
              type="button"
              className="toaster-close"
              onClick={() => dismiss(entry)}
              aria-label="Dismiss notification"
            >
              <FiX aria-hidden="true" />
            </button>
          </div>
        )
      })}
    </div>
  )
}

export default Toaster
