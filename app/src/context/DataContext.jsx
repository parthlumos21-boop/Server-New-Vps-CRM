import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react'
import { useAuth } from './AuthContext'
import Toaster from '../components/common/Toaster'
import { messageService } from '../services/messageService'
import { leadApi } from '../services/leadApi'
import { dealApi } from '../services/dealApi'
import { supportRequestApi } from '../services/supportRequestApi'
import { taskApi } from '../services/taskApi'
import { reminderApi } from '../services/reminderApi'
import { notificationApi } from '../services/notificationApi'
import { messageApi } from '../services/messageApi'
import { projectApi } from '../services/projectApi'
import { convertedDealApi, normalizeConvertedDealRecord } from '../services/convertedDealApi'
import { quotationApi } from '../services/quotationApi'
import { setupApi } from '../services/setupApi'
import { SOCKET_ENTITY_TYPES, SOCKET_EVENTS } from '../constants/socketEvents'
import { getCanonicalCrmUserName, getCrmOwnerCode } from '../features/users/crmUserDirectory'
import {
  buildRealtimePayload,
  canUserAccessEntity,
  enrichRealtimeRecord,
  matchesUserScope,
} from '../services/realtimeSync'

const DataContext = createContext(null)

const upsertToTop = (items, record) => [
  record,
  ...items.filter((entry) => entry.id !== record.id),
]

const replaceById = (items, record) => {
  const exists = items.some((entry) => entry.id === record.id)
  if (!exists) {
    return upsertToTop(items, record)
  }

  return items.map((entry) => (entry.id === record.id ? record : entry))
}

const ACCOUNT_FRONTEND_CACHE_PREFIX = 'crm_frontend_accounts'
const DISMISSED_NOTIFICATIONS_KEY = 'crm_dismissed_notifications'

const readDismissedNotificationIds = () => {
  if (typeof window === 'undefined') return []
  try {
    const parsed = JSON.parse(window.localStorage.getItem(DISMISSED_NOTIFICATIONS_KEY) || '[]')
    return Array.isArray(parsed) ? parsed.map(String) : []
  } catch {
    return []
  }
}

const rememberDismissedNotificationId = (id) => {
  if (!id || typeof window === 'undefined') return
  const nextIds = Array.from(new Set([String(id), ...readDismissedNotificationIds()])).slice(0, 300)
  window.localStorage.setItem(DISMISSED_NOTIFICATIONS_KEY, JSON.stringify(nextIds))
}

const isNotificationDismissed = (notification) => (
  notification?.id && readDismissedNotificationIds().includes(String(notification.id))
)

const filterDismissedNotifications = (notifications = []) => (
  notifications.filter((notification) => !notification?.isRead && !isNotificationDismissed(notification))
)

const getAccountFrontendCacheKey = (user) => (
  user ? `${ACCOUNT_FRONTEND_CACHE_PREFIX}_${user.role || 'user'}_${user.id || 'anonymous'}` : ''
)

const readAccountFrontendCache = (user) => {
  const cacheKey = getAccountFrontendCacheKey(user)
  if (!cacheKey || typeof window === 'undefined') return []

  try {
    const cachedValue = window.localStorage.getItem(cacheKey)
    const cachedAccounts = cachedValue ? JSON.parse(cachedValue) : []
    return Array.isArray(cachedAccounts) ? cachedAccounts : []
  } catch {
    return []
  }
}

const writeAccountFrontendCache = (user, records = []) => {
  const cacheKey = getAccountFrontendCacheKey(user)
  if (!cacheKey || typeof window === 'undefined') return

  try {
    window.localStorage.setItem(cacheKey, JSON.stringify(records))
  } catch {
    // Frontend cache is best-effort; MongoDB remains the source of truth.
  }
}

export const useData = () => {
  const context = useContext(DataContext)
  if (!context) {
    throw new Error('useData must be used within DataProvider')
  }
  return context
}

export const DataProvider = ({ children }) => {
  const { user, socket } = useAuth()
  const [accounts, setAccounts] = useState([])
  const [deals, setDeals] = useState([])
  const [convertedDeals, setConvertedDeals] = useState([])
  const [supportRequests, setSupportRequests] = useState([])
  const [tasks, setTasks] = useState([])
  const [reminders, setReminders] = useState([])
  const [quotations, setQuotations] = useState([])
  const [projects, setProjects] = useState([])
  const [notifications, setNotifications] = useState([])
  const [activities, setActivities] = useState([])
  const [onlineUsers, setOnlineUsers] = useState([])
  const [messages, setMessages] = useState([])
  const [loading, setLoading] = useState(false)
  const [quotationsLoading, setQuotationsLoading] = useState(false)
  const [quotationsError, setQuotationsError] = useState('')
  const [accountStorageStatus, setAccountStorageStatus] = useState({
    loading: true,
    ready: false,
    storage: 'MongoDB',
    message: 'Checking MongoDB account storage.',
  })
  const [lastDashboardUpdate, setLastDashboardUpdate] = useState(null)

  const initialLoadKeyRef = useRef('')

  const addNotification = useCallback((type, title, message) => {
    const notification = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      type,
      title,
      message,
      timestamp: new Date().toISOString(),
    }

    setNotifications((prev) => [notification, ...prev].slice(0, 50))
  }, [])

  const clearNotification = useCallback((id) => {
    rememberDismissedNotificationId(id)
    setNotifications((prev) => prev.filter((entry) => entry.id !== id))

    if (/^\d+$/.test(String(id || ''))) {
      notificationApi.markAsRead(id).catch(() => {})
    }
  }, [])

  const getErrorMessage = useCallback((error, fallbackMessage = 'Something went wrong.') => (
    error?.response?.data?.message
    || error?.message
    || fallbackMessage
  ), [])

  const getVisibleRecords = useCallback((records = []) => {
    if (!user) return []
    if (user.role === 'admin') return records
    return records.filter((record) => matchesUserScope(record, user))
  }, [user])

  const setFrontendAccounts = useCallback((nextValue) => {
    setAccounts((currentAccounts) => {
      const nextAccounts = typeof nextValue === 'function'
        ? nextValue(currentAccounts)
        : nextValue
      writeAccountFrontendCache(user, nextAccounts)
      return nextAccounts
    })
  }, [user])

  const refreshAccountStorageStatus = useCallback(async () => {
    setAccountStorageStatus((currentStatus) => ({
      ...currentStatus,
      loading: true,
    }))

    try {
      const status = await setupApi.getPublicSetupStatus()
      const ready = Boolean(status?.ready && status?.databaseReady)

      setAccountStorageStatus({
        loading: false,
        ready,
        storage: status?.storage || 'MongoDB',
        message: ready
          ? 'All account records are loading from MongoDB and are shared with admin views.'
          : 'MongoDB account storage is not ready. Start MongoDB before adding or reviewing account data.',
      })

      return status
    } catch (error) {
      setAccountStorageStatus({
        loading: false,
        ready: false,
        storage: 'MongoDB',
        message: error?.response?.data?.message || error?.message || 'Unable to confirm MongoDB account storage.',
      })
      return null
    }
  }, [])

  const refreshQuotations = useCallback(async () => {
    if (!user) {
      setQuotations([])
      setQuotationsError('')
      return []
    }

    setQuotationsLoading(true)

    try {
      const records = await quotationApi.getQuotations()
      setQuotations(getVisibleRecords(records))
      setQuotationsError('')
      return records
    } catch (error) {
      const message = getErrorMessage(error, 'Unable to load quotations.')
      setQuotations([])
      setQuotationsError(message)
      throw error
    } finally {
      setQuotationsLoading(false)
    }
  }, [getErrorMessage, getVisibleRecords, user])

  const refreshAccounts = useCallback(async (params = {}) => {
    if (!user) {
      setFrontendAccounts([])
      return []
    }

    const records = await leadApi.getLeads(params)
    const enrichedRecords = records.map((entry) => enrichRealtimeRecord(SOCKET_ENTITY_TYPES.ACCOUNT, entry))
    const visibleRecords = getVisibleRecords(enrichedRecords)
    setFrontendAccounts(visibleRecords)
    return visibleRecords
  }, [getVisibleRecords, setFrontendAccounts, user])

  const loadAllData = useCallback(async () => {
    if (!user) {
      setFrontendAccounts([])
      setDeals([])
      setConvertedDeals([])
      setSupportRequests([])
      setTasks([])
      setReminders([])
      setQuotations([])
      setProjects([])
      setNotifications([])
      setMessages([])
      setLoading(false)
      setQuotationsLoading(false)
      setQuotationsError('')
      return
    }

    setLoading(true)
    setQuotationsLoading(true)
    setQuotationsError('')

    try {
      const results = await Promise.allSettled([
        leadApi.getLeads(),
        dealApi.getDeals(),
        supportRequestApi.getSupportRequests(),
        taskApi.getTasks(),
        reminderApi.getReminders(),
        quotationApi.getQuotations(),
        projectApi.getProjects(),
        notificationApi.getNotifications(),
        messageApi.getMessages(),
        convertedDealApi.getConvertedDeals(),
      ])

      const [
        accountsResult,
        dealsResult,
        supportRequestsResult,
        tasksResult,
        remindersResult,
        quotationsResult,
        projectsResult,
        notificationsResult,
        messagesResult,
        convertedDealsResult,
      ] = results

      if (accountsResult.status === 'fulfilled') {
        const accountRecords = accountsResult.value.map((entry) => enrichRealtimeRecord(SOCKET_ENTITY_TYPES.ACCOUNT, entry))
        setFrontendAccounts(getVisibleRecords(accountRecords))
      } else {
        const cachedAccounts = readAccountFrontendCache(user)
        setFrontendAccounts(cachedAccounts)
      }

      if (dealsResult.status === 'fulfilled') {
        setDeals(dealsResult.value.map((entry) => enrichRealtimeRecord(SOCKET_ENTITY_TYPES.DEAL, entry)))
      } else {
        setDeals([])
      }

      if (supportRequestsResult.status === 'fulfilled') {
        setSupportRequests(supportRequestsResult.value.map((entry) => enrichRealtimeRecord(SOCKET_ENTITY_TYPES.SUPPORT_REQUEST, entry)))
      } else {
        setSupportRequests([])
      }

      if (tasksResult.status === 'fulfilled') {
        setTasks(tasksResult.value.map((entry) => enrichRealtimeRecord(SOCKET_ENTITY_TYPES.TASK, entry)))
      } else {
        setTasks([])
      }

      if (remindersResult.status === 'fulfilled') {
        setReminders(remindersResult.value.map((entry) => enrichRealtimeRecord(SOCKET_ENTITY_TYPES.REMINDER, entry)))
      } else {
        setReminders([])
      }

      if (quotationsResult.status === 'fulfilled') {
        setQuotations(getVisibleRecords(quotationsResult.value))
        setQuotationsError('')
      } else {
        const message = getErrorMessage(quotationsResult.reason, 'Unable to load quotations.')
        setQuotations([])
        setQuotationsError(message)
        addNotification('error', 'Failed to load quotations', message)
      }

      if (projectsResult.status === 'fulfilled') {
        setProjects(getVisibleRecords(projectsResult.value))
      } else {
        setProjects([])
      }

      if (notificationsResult.status === 'fulfilled') {
        setNotifications(filterDismissedNotifications(notificationsResult.value))
      } else {
        setNotifications([])
      }

      if (messagesResult.status === 'fulfilled') {
        setMessages(messagesResult.value.filter((entry) => canUserAccessEntity(user, SOCKET_ENTITY_TYPES.MESSAGE, entry)))
      } else {
        setMessages([])
      }

      if (convertedDealsResult.status === 'fulfilled') {
        setConvertedDeals(getVisibleRecords(convertedDealsResult.value))
      } else {
        setConvertedDeals([])
      }

      const firstFailedResult = results.find((result, index) => result.status === 'rejected' && index !== 5)
      if (firstFailedResult?.status === 'rejected') {
        addNotification('error', 'Failed to load data', getErrorMessage(firstFailedResult.reason))
      }
    } finally {
      setQuotationsLoading(false)
      setLoading(false)
    }
  }, [addNotification, getErrorMessage, getVisibleRecords, setFrontendAccounts, user])

  useEffect(() => {
    const loadKey = user ? `${user.id}:${user.role}:${user.companyId || ''}` : 'signed-out'
    if (initialLoadKeyRef.current === loadKey) return
    initialLoadKeyRef.current = loadKey
    const cachedAccounts = readAccountFrontendCache(user)
    if (cachedAccounts.length > 0) {
      setFrontendAccounts(cachedAccounts)
    }
    refreshAccountStorageStatus()
    loadAllData()
  }, [loadAllData, refreshAccountStorageStatus, setFrontendAccounts, user])

  const handleAccountRealtime = useCallback((payload) => {
    if (!canUserAccessEntity(user, SOCKET_ENTITY_TYPES.ACCOUNT, payload)) {
      return
    }

    if (payload?.action === 'deleted') {
      setFrontendAccounts((prev) => prev.filter((entry) => entry.id !== payload.recordId))
      return
    }

    const account = enrichRealtimeRecord(SOCKET_ENTITY_TYPES.ACCOUNT, payload?.record || payload)

    setFrontendAccounts((prev) => (
      payload?.action === 'created'
        ? upsertToTop(prev, account)
        : replaceById(prev, account)
    ))
  }, [setFrontendAccounts, user])

  const handleDealCreated = useCallback((record) => {
    if (!canUserAccessEntity(user, SOCKET_ENTITY_TYPES.DEAL, record)) {
      return
    }

    const deal = enrichRealtimeRecord(SOCKET_ENTITY_TYPES.DEAL, record)

    setDeals((prev) => upsertToTop(prev, deal))
  }, [user])

  const handleDealUpdated = useCallback((record) => {
    if (!canUserAccessEntity(user, SOCKET_ENTITY_TYPES.DEAL, record)) {
      return
    }

    const deal = enrichRealtimeRecord(SOCKET_ENTITY_TYPES.DEAL, record)

    setDeals((prev) => replaceById(prev, deal))
  }, [user])

  const handleDealDeleted = useCallback((id) => {
    setDeals((prev) => prev.filter((entry) => entry.id !== id))
  }, [])

  const handleConvertedDealRealtime = useCallback((payload) => {
    if (payload?.action === 'deleted') {
      setConvertedDeals((prev) => prev.filter((entry) => String(entry.id) !== String(payload.recordId)))
      return
    }

    const convertedDeal = normalizeConvertedDealRecord(payload?.record || payload)
    if (!convertedDeal || !canUserAccessEntity(user, SOCKET_ENTITY_TYPES.CONVERTED_DEAL, convertedDeal)) {
      return
    }

    setConvertedDeals((prev) => (
      payload?.action === 'created'
        ? upsertToTop(prev, convertedDeal)
        : replaceById(prev, convertedDeal)
    ))
  }, [user])

  const handleTaskCreated = useCallback((record) => {
    if (!canUserAccessEntity(user, SOCKET_ENTITY_TYPES.TASK, record)) {
      return
    }

    const task = enrichRealtimeRecord(SOCKET_ENTITY_TYPES.TASK, record)

    setTasks((prev) => upsertToTop(prev, task))
  }, [user])

  const handleTaskUpdated = useCallback((record) => {
    if (!canUserAccessEntity(user, SOCKET_ENTITY_TYPES.TASK, record)) {
      return
    }

    const task = enrichRealtimeRecord(SOCKET_ENTITY_TYPES.TASK, record)

    setTasks((prev) => replaceById(prev, task))
  }, [user])

  const handleTaskDeleted = useCallback((id) => {
    setTasks((prev) => prev.filter((entry) => entry.id !== id))
  }, [])

  const handleReminderCreated = useCallback((payload) => {
    if (!canUserAccessEntity(user, SOCKET_ENTITY_TYPES.REMINDER, payload)) {
      return
    }

    const reminder = enrichRealtimeRecord(SOCKET_ENTITY_TYPES.REMINDER, payload?.record || payload)
    setReminders((prev) => upsertToTop(prev, reminder))
  }, [user])

  const handleReminderUpdated = useCallback((payload) => {
    if (!canUserAccessEntity(user, SOCKET_ENTITY_TYPES.REMINDER, payload)) {
      return
    }

    const reminder = enrichRealtimeRecord(SOCKET_ENTITY_TYPES.REMINDER, payload?.record || payload)
    setReminders((prev) => replaceById(prev, reminder))
  }, [user])

  const handleReminderDeleted = useCallback((payload) => {
    const id = payload?.recordId || payload?.id || payload
    setReminders((prev) => prev.filter((entry) => String(entry.id) !== String(id)))
  }, [])

  const handleSupportRequestCreated = useCallback((record) => {
    if (!canUserAccessEntity(user, SOCKET_ENTITY_TYPES.SUPPORT_REQUEST, record)) {
      return
    }

    const supportRequest = enrichRealtimeRecord(SOCKET_ENTITY_TYPES.SUPPORT_REQUEST, record)

    setSupportRequests((prev) => upsertToTop(prev, supportRequest))

    if (user?.role === 'admin' && supportRequest.userId !== user.id) {
      addNotification(
        'info',
        'New support request',
        `${supportRequest.customerName || 'A customer'} submitted a support request.`
      )
    }
  }, [addNotification, user])

  const handleSupportRequestUpdated = useCallback((record) => {
    if (record?.action === 'deleted') {
      setSupportRequests((prev) => prev.filter((entry) => entry.id !== record.recordId))
      return
    }

    if (!canUserAccessEntity(user, SOCKET_ENTITY_TYPES.SUPPORT_REQUEST, record)) {
      return
    }

    const supportRequest = enrichRealtimeRecord(SOCKET_ENTITY_TYPES.SUPPORT_REQUEST, record)

    setSupportRequests((prev) => replaceById(prev, supportRequest))
  }, [user])

  const handleMessageCreated = useCallback((message) => {
    if (!canUserAccessEntity(user, SOCKET_ENTITY_TYPES.MESSAGE, message)) {
      return
    }

    const normalizedMessage = Array.isArray(message)
      ? message[0]
      : message

    setMessages((prev) => upsertToTop(prev, normalizedMessage))

    if (normalizedMessage.senderId !== user?.id) {
      addNotification('info', 'New message', `${normalizedMessage.senderName || 'User'} sent a new message.`)
    }
  }, [addNotification, user])

  const handleNotification = useCallback((notification) => {
    if (notification?.actorUserId && notification.actorUserId === user?.id) {
      return
    }

    const normalizedNotification = notificationApi.normalizeNotification(notification)
    if (normalizedNotification.isRead) {
      return
    }
    if (isNotificationDismissed(normalizedNotification)) {
      return
    }

    setNotifications((prev) => [normalizedNotification, ...prev].slice(0, 50))
  }, [user?.id])

  const handleActivity = useCallback((activity) => {
    setActivities((prev) => [activity, ...prev].slice(0, 100))
  }, [])

  const handleUserOnline = useCallback((onlineUser) => {
    setOnlineUsers((prev) => {
      const next = [
        onlineUser,
        ...prev.filter((entry) => entry.id !== onlineUser.id),
      ]
      return next.sort((left, right) => left.name.localeCompare(right.name))
    })
  }, [])

  const handleUserOffline = useCallback((offlineUser) => {
    setOnlineUsers((prev) => prev.filter((entry) => entry.id !== offlineUser.id))
  }, [])

  const handleDashboardUpdate = useCallback((payload) => {
    setLastDashboardUpdate(payload)
  }, [])

  useEffect(() => {
    if (!socket) return undefined

    socket.on(SOCKET_EVENTS.CREATE_LEAD, handleAccountRealtime)
    socket.on(SOCKET_EVENTS.UPDATE_LEAD, handleAccountRealtime)
    socket.on(SOCKET_EVENTS.LEAD_ASSIGNED, handleAccountRealtime)
    socket.on(SOCKET_EVENTS.NEW_LEAD, handleAccountRealtime)
    socket.on(SOCKET_EVENTS.LEAD_UPDATED, handleAccountRealtime)
    socket.on(SOCKET_EVENTS.FORM_UPDATED, handleAccountRealtime)
    socket.on(SOCKET_EVENTS.DEAL_CREATED, handleDealCreated)
    socket.on(SOCKET_EVENTS.DEAL_UPDATED, handleDealUpdated)
    socket.on(SOCKET_EVENTS.DEAL_DELETED, handleDealDeleted)
    socket.on(SOCKET_EVENTS.CONVERTED_DEAL_CREATED, handleConvertedDealRealtime)
    socket.on(SOCKET_EVENTS.CONVERTED_DEAL_UPDATED, handleConvertedDealRealtime)
    socket.on(SOCKET_EVENTS.CONVERTED_DEAL_DELETED, handleConvertedDealRealtime)
    socket.on(SOCKET_EVENTS.TASK_CREATED, handleTaskCreated)
    socket.on(SOCKET_EVENTS.TASK_UPDATED, handleTaskUpdated)
    socket.on(SOCKET_EVENTS.TASK_DELETED, handleTaskDeleted)
    socket.on(SOCKET_EVENTS.REMINDER_CREATED, handleReminderCreated)
    socket.on(SOCKET_EVENTS.REMINDER_UPDATED, handleReminderUpdated)
    socket.on(SOCKET_EVENTS.REMINDER_DELETED, handleReminderDeleted)
    socket.on(SOCKET_EVENTS.SUPPORT_REQUEST_CREATED, handleSupportRequestCreated)
    socket.on(SOCKET_EVENTS.SUPPORT_REQUEST_UPDATED, handleSupportRequestUpdated)
    socket.on(SOCKET_EVENTS.RECEIVE_MESSAGE, handleMessageCreated)
    socket.on(SOCKET_EVENTS.USERS_ONLINE, setOnlineUsers)
    socket.on(SOCKET_EVENTS.USER_ONLINE, handleUserOnline)
    socket.on(SOCKET_EVENTS.USER_OFFLINE, handleUserOffline)
    socket.on(SOCKET_EVENTS.PRIVATE_NOTIFICATION, handleNotification)
    socket.on(SOCKET_EVENTS.NOTIFICATION, handleNotification)
    socket.on(SOCKET_EVENTS.ACTIVITY, handleActivity)
    socket.on(SOCKET_EVENTS.DASHBOARD_UPDATE, handleDashboardUpdate)

    return () => {
      socket.off(SOCKET_EVENTS.CREATE_LEAD, handleAccountRealtime)
      socket.off(SOCKET_EVENTS.UPDATE_LEAD, handleAccountRealtime)
      socket.off(SOCKET_EVENTS.LEAD_ASSIGNED, handleAccountRealtime)
      socket.off(SOCKET_EVENTS.NEW_LEAD, handleAccountRealtime)
      socket.off(SOCKET_EVENTS.LEAD_UPDATED, handleAccountRealtime)
      socket.off(SOCKET_EVENTS.FORM_UPDATED, handleAccountRealtime)
      socket.off(SOCKET_EVENTS.DEAL_CREATED, handleDealCreated)
      socket.off(SOCKET_EVENTS.DEAL_UPDATED, handleDealUpdated)
      socket.off(SOCKET_EVENTS.DEAL_DELETED, handleDealDeleted)
      socket.off(SOCKET_EVENTS.CONVERTED_DEAL_CREATED, handleConvertedDealRealtime)
      socket.off(SOCKET_EVENTS.CONVERTED_DEAL_UPDATED, handleConvertedDealRealtime)
      socket.off(SOCKET_EVENTS.CONVERTED_DEAL_DELETED, handleConvertedDealRealtime)
      socket.off(SOCKET_EVENTS.TASK_CREATED, handleTaskCreated)
      socket.off(SOCKET_EVENTS.TASK_UPDATED, handleTaskUpdated)
      socket.off(SOCKET_EVENTS.TASK_DELETED, handleTaskDeleted)
      socket.off(SOCKET_EVENTS.REMINDER_CREATED, handleReminderCreated)
      socket.off(SOCKET_EVENTS.REMINDER_UPDATED, handleReminderUpdated)
      socket.off(SOCKET_EVENTS.REMINDER_DELETED, handleReminderDeleted)
      socket.off(SOCKET_EVENTS.SUPPORT_REQUEST_CREATED, handleSupportRequestCreated)
      socket.off(SOCKET_EVENTS.SUPPORT_REQUEST_UPDATED, handleSupportRequestUpdated)
      socket.off(SOCKET_EVENTS.RECEIVE_MESSAGE, handleMessageCreated)
      socket.off(SOCKET_EVENTS.USERS_ONLINE, setOnlineUsers)
      socket.off(SOCKET_EVENTS.USER_ONLINE, handleUserOnline)
      socket.off(SOCKET_EVENTS.USER_OFFLINE, handleUserOffline)
      socket.off(SOCKET_EVENTS.PRIVATE_NOTIFICATION, handleNotification)
      socket.off(SOCKET_EVENTS.NOTIFICATION, handleNotification)
      socket.off(SOCKET_EVENTS.ACTIVITY, handleActivity)
      socket.off(SOCKET_EVENTS.DASHBOARD_UPDATE, handleDashboardUpdate)
    }
  }, [
    handleAccountRealtime,
    handleActivity,
    handleDashboardUpdate,
    handleDealCreated,
    handleDealDeleted,
    handleDealUpdated,
    handleConvertedDealRealtime,
    handleMessageCreated,
    handleNotification,
    handleSupportRequestCreated,
    handleSupportRequestUpdated,
    handleTaskCreated,
    handleTaskDeleted,
    handleTaskUpdated,
    handleReminderCreated,
    handleReminderDeleted,
    handleReminderUpdated,
    handleUserOffline,
    handleUserOnline,
    socket,
  ])

  const createAccount = async (accountData) => {
    try {
      await refreshAccountStorageStatus()
      const requestedOwnerName = (
        getCanonicalCrmUserName(accountData.accountOwner || accountData.ownerName)
        || accountData.accountOwner
        || accountData.ownerName
        || user?.name
        || ''
      )
      const requestedOwnerCode = (
        accountData.accountOwnerCode
        || getCrmOwnerCode(requestedOwnerName)
        || user?.ownerCode
        || ''
      )
      const created = await leadApi.createLead({
        ...accountData,
        userId: user.id,
        createdBy: accountData.createdBy || user.id,
        assignedTo: accountData.assignedTo || accountData.ownerUserId || user.id,
        ownerUserId: accountData.ownerUserId || accountData.assignedTo || user.id,
        accountOwner: requestedOwnerName,
        ownerName: requestedOwnerName,
        accountOwnerCode: requestedOwnerCode,
      })
      const account = enrichRealtimeRecord(SOCKET_ENTITY_TYPES.ACCOUNT, created)
      const accountProjects = Array.isArray(accountData.projects) ? accountData.projects : []
      const createdProjects = []

      for (const project of accountProjects) {
        if (!String(project.projectName || '').trim()) continue
        const createdProject = await projectApi.createProject({
          ...project,
          accountId: account.id,
          accountName: account.accountName || account.customerName || account.name,
        })
        createdProjects.push(createdProject)
      }

      setFrontendAccounts((prev) => upsertToTop(prev, account))

      if (createdProjects.length > 0) {
        setProjects((prev) => [
          ...createdProjects,
          ...prev.filter((entry) => !createdProjects.some((project) => String(project.id) === String(entry.id))),
        ])
      }

      let syncedAccount = account

      try {
        const refreshedAccounts = await refreshAccounts()
        syncedAccount = refreshedAccounts.find((entry) => String(entry.id) === String(account.id)) || account
      } catch {
        syncedAccount = account
      }

      return { success: true, data: syncedAccount }
    } catch (error) {
      await refreshAccountStorageStatus()
      return { success: false, message: error.response?.data?.message || error.message }
    }
  }

  const updateAccount = async (id, updates) => {
    try {
      await refreshAccountStorageStatus()
      const updated = await leadApi.updateLead(id, updates)
      const account = enrichRealtimeRecord(SOCKET_ENTITY_TYPES.ACCOUNT, updated)

      setFrontendAccounts((prev) => replaceById(prev, account))

      return { success: true, data: account }
    } catch (error) {
      await refreshAccountStorageStatus()
      return { success: false, message: error.response?.data?.message || error.message }
    }
  }

  const deleteAccount = async (id) => {
    try {
      await refreshAccountStorageStatus()
      const previousRecord = accounts.find((entry) => entry.id === id) || null
      await leadApi.deleteLead(id)

      setFrontendAccounts((prev) => prev.filter((entry) => entry.id !== id))

      if (socket) {
        socket.emit(SOCKET_EVENTS.ACCOUNT_DELETE, buildRealtimePayload({
          entityType: SOCKET_ENTITY_TYPES.ACCOUNT,
          action: 'deleted',
          previousRecord,
          actor: user,
        }))
      }

      return { success: true }
    } catch (error) {
      await refreshAccountStorageStatus()
      return { success: false, message: error.response?.data?.message || error.message }
    }
  }

  const convertAccountToDeal = async (id) => {
    try {
      const result = await leadApi.convertToDeal(id)

      if (result.account) {
        const account = enrichRealtimeRecord(SOCKET_ENTITY_TYPES.ACCOUNT, result.account)
        setFrontendAccounts((prev) => replaceById(prev, account))
      }

      if (result.deal) {
        const deal = enrichRealtimeRecord(SOCKET_ENTITY_TYPES.DEAL, result.deal)
        setDeals((prev) => upsertToTop(prev, deal))
      }

      if (result.convertedDeal) {
        setConvertedDeals((prev) => replaceById(prev, result.convertedDeal))
      }

      return { success: true, data: result }
    } catch (error) {
      return { success: false, message: getErrorMessage(error, 'Unable to convert account to deal.') }
    }
  }

  const createProject = async (projectData) => {
    try {
      const project = await projectApi.createProject({ ...projectData, userId: user.id })
      setProjects((prev) => upsertToTop(prev, project))
      return { success: true, data: project }
    } catch (error) {
      return { success: false, message: error.response?.data?.message || error.message }
    }
  }

  const updateProject = async (id, updates) => {
    try {
      const project = await projectApi.updateProject(id, updates)
      setProjects((prev) => replaceById(prev, project))
      return { success: true, data: project }
    } catch (error) {
      return { success: false, message: error.response?.data?.message || error.message }
    }
  }

  const deleteProject = async (id) => {
    try {
      await projectApi.deleteProject(id)
      setProjects((prev) => prev.filter((entry) => String(entry.id) !== String(id) && String(entry.projectId) !== String(id)))
      return { success: true }
    } catch (error) {
      return { success: false, message: error.response?.data?.message || error.message }
    }
  }

  const createDeal = async (dealData) => {
    try {
      const resolvedOwnerUserId = String(
        dealData.ownerUserId
        || dealData.ownerId
        || dealData.assignedTo
        || dealData.assignedUserId
        || dealData.userId
        || user.id
      )
      const created = await dealApi.createDeal({
        ...dealData,
        userId: dealData.userId || resolvedOwnerUserId,
        ownerUserId: resolvedOwnerUserId,
        ownerId: resolvedOwnerUserId,
        assignedTo: dealData.assignedTo || resolvedOwnerUserId,
        assignedUserId: dealData.assignedUserId || resolvedOwnerUserId,
      })
      const deal = enrichRealtimeRecord(SOCKET_ENTITY_TYPES.DEAL, created)

      setDeals((prev) => upsertToTop(prev, deal))

      return { success: true, data: deal }
    } catch (error) {
      return { success: false, message: getErrorMessage(error) }
    }
  }

  const updateDeal = async (id, updates) => {
    try {
      const updated = await dealApi.updateDeal(id, updates)
      const deal = enrichRealtimeRecord(SOCKET_ENTITY_TYPES.DEAL, updated)

      setDeals((prev) => replaceById(prev, deal))

      return { success: true, data: deal }
    } catch (error) {
      return { success: false, message: getErrorMessage(error) }
    }
  }

  const deleteDeal = async (id) => {
    try {
      await dealApi.deleteDeal(id)
      setDeals((prev) => prev.filter((entry) => String(entry.id) !== String(id)))

      return { success: true }
    } catch (error) {
      return { success: false, message: getErrorMessage(error) }
    }
  }

  const findConvertedDealForAccount = async (accountId) => {
    try {
      const existing = await dealApi.getConvertedDealForAccount(accountId)
      if (existing?.id) {
        const deal = enrichRealtimeRecord(SOCKET_ENTITY_TYPES.DEAL, existing)
        setDeals((prev) => upsertToTop(prev, deal))
        return { success: true, data: deal }
      }

      return { success: true, data: null }
    } catch (error) {
      return { success: false, message: getErrorMessage(error) }
    }
  }

  const createConvertedDeal = async (convertedDealData) => {
    try {
      const created = await convertedDealApi.createConvertedDeal(convertedDealData)

      setConvertedDeals((prev) => {
        const exists = prev.some((entry) => entry.id === created.id)
        return exists
          ? prev.map((entry) => (entry.id === created.id ? created : entry))
          : [created, ...prev]
      })

      return { success: true, data: created }
    } catch (error) {
      return { success: false, message: error.response?.data?.message || error.message }
    }
  }

  const refreshConvertedDeals = async (params = {}) => {
    try {
      const records = await convertedDealApi.getConvertedDeals(params)
      const visibleRecords = getVisibleRecords(records)
      setConvertedDeals(visibleRecords)
      return { success: true, data: visibleRecords }
    } catch (error) {
      return { success: false, message: error.response?.data?.message || error.message }
    }
  }

  const createSupportRequest = async (supportRequestData) => {
    try {
      const created = await supportRequestApi.createSupportRequest({
        ...supportRequestData,
        userId: user.id,
        addedByName: user?.name || '',
      })

      const supportRequest = enrichRealtimeRecord(SOCKET_ENTITY_TYPES.SUPPORT_REQUEST, created)

      setSupportRequests((prev) => upsertToTop(prev, supportRequest))

      return { success: true, data: supportRequest }
    } catch (error) {
      return { success: false, message: getErrorMessage(error) }
    }
  }

  const updateSupportRequest = async (id, updates) => {
    try {
      const updated = await supportRequestApi.updateSupportRequest(id, updates)
      const supportRequest = enrichRealtimeRecord(SOCKET_ENTITY_TYPES.SUPPORT_REQUEST, updated)

      setSupportRequests((prev) => replaceById(prev, supportRequest))

      return { success: true, data: supportRequest }
    } catch (error) {
      return { success: false, message: getErrorMessage(error) }
    }
  }

  const deleteSupportRequest = async (id) => {
    try {
      await supportRequestApi.deleteSupportRequest(id)
      setSupportRequests((prev) => prev.filter((entry) => String(entry.id) !== String(id)))

      return { success: true }
    } catch (error) {
      return { success: false, message: getErrorMessage(error) }
    }
  }

  const createTask = async (taskData) => {
    try {
      const created = await taskApi.createTask({ ...taskData, userId: user.id })
      const task = enrichRealtimeRecord(SOCKET_ENTITY_TYPES.TASK, created)

      setTasks((prev) => upsertToTop(prev, task))

      return { success: true, data: task }
    } catch (error) {
      return { success: false, message: getErrorMessage(error) }
    }
  }

  const updateTask = async (id, updates) => {
    try {
      const updated = await taskApi.updateTask(id, updates)
      const task = enrichRealtimeRecord(SOCKET_ENTITY_TYPES.TASK, updated)

      setTasks((prev) => replaceById(prev, task))

      return { success: true, data: task }
    } catch (error) {
      return { success: false, message: getErrorMessage(error) }
    }
  }

  const deleteTask = async (id) => {
    try {
      await taskApi.deleteTask(id)
      setTasks((prev) => prev.filter((entry) => String(entry.id) !== String(id)))

      return { success: true }
    } catch (error) {
      return { success: false, message: getErrorMessage(error) }
    }
  }

  const createReminder = async (reminderData) => {
    try {
      const created = await reminderApi.createReminder({
        ...reminderData,
        assignedTo: reminderData.assignedTo || user?.id,
      })
      const reminder = enrichRealtimeRecord(SOCKET_ENTITY_TYPES.REMINDER, created)

      setReminders((prev) => upsertToTop(prev, reminder))

      return { success: true, data: reminder }
    } catch (error) {
      return { success: false, message: getErrorMessage(error) }
    }
  }

  const updateReminder = async (id, updates) => {
    try {
      const updated = await reminderApi.updateReminder(id, updates)
      const reminder = enrichRealtimeRecord(SOCKET_ENTITY_TYPES.REMINDER, updated)

      setReminders((prev) => replaceById(prev, reminder))

      return { success: true, data: reminder }
    } catch (error) {
      return { success: false, message: getErrorMessage(error) }
    }
  }

  const deleteReminder = async (id) => {
    try {
      await reminderApi.deleteReminder(id)
      setReminders((prev) => prev.filter((entry) => String(entry.id) !== String(id)))

      return { success: true }
    } catch (error) {
      return { success: false, message: getErrorMessage(error) }
    }
  }

  const createQuotation = async (quotationData) => {
    try {
      const quotation = await quotationApi.createQuotation({ ...quotationData, userId: user.id })
      setQuotations((prev) => upsertToTop(prev, quotation))
      setQuotationsError('')
      refreshQuotations().catch(() => {})
      return { success: true, data: quotation }
    } catch (error) {
      const message = getErrorMessage(error, 'Unable to create quotation.')
      const responseData = error?.response?.data || {}
      const code = responseData.code || responseData.details?.code || ''
      const details = responseData.details || null
      const status = error?.response?.status || 0
      setQuotationsError(message)
      return { success: false, message, code, details, status }
    }
  }

  const updateQuotation = async (id, updates) => {
    try {
      const quotation = await quotationApi.updateQuotation(id, updates)
      setQuotations((prev) => replaceById(prev, quotation))
      setQuotationsError('')
      refreshQuotations().catch(() => {})
      return { success: true, data: quotation }
    } catch (error) {
      const message = getErrorMessage(error, 'Unable to update quotation.')
      setQuotationsError(message)
      return { success: false, message }
    }
  }

  const sendMessage = (payload) => {
    const preparedMessage = messageService.buildMessage({
      ...payload,
      sender: user,
    })

    if (!preparedMessage.success) {
      return preparedMessage
    }

    return messageApi.sendMessage(preparedMessage.data)
      .then((createdMessages) => {
        setMessages((prev) => {
          const nextMessages = [...prev]
          createdMessages.forEach((entry) => {
            const existingIndex = nextMessages.findIndex((message) => message.id === entry.id)
            if (existingIndex >= 0) {
              nextMessages[existingIndex] = entry
            } else {
              nextMessages.unshift(entry)
            }
          })
          return nextMessages
        })

        return { success: true, data: createdMessages }
      })
      .catch((error) => ({
        success: false,
        message: error.response?.data?.message || error.message,
      }))
  }

  const refreshMessages = () => {
    messageApi
      .getMessages()
      .then((records) => setMessages(records.filter((entry) => canUserAccessEntity(user, SOCKET_ENTITY_TYPES.MESSAGE, entry))))
      .catch(() => {})
  }

  const refreshData = useCallback(async () => {
    await refreshAccountStorageStatus()
    return loadAllData()
  }, [loadAllData, refreshAccountStorageStatus])

  const value = {
    accounts,
    deals,
    convertedDeals,
    supportRequests,
    tasks,
    reminders,
    quotations,
    projects,
    notifications,
    activities,
    onlineUsers,
    messages,
    loading,
    quotationsLoading,
    quotationsError,
    accountStorageStatus,
    lastDashboardUpdate,
    createAccount,
    updateAccount,
    deleteAccount,
    convertAccountToDeal,
    createProject,
    updateProject,
    deleteProject,
    createDeal,
    updateDeal,
    deleteDeal,
    findConvertedDealForAccount,
    createConvertedDeal,
    refreshConvertedDeals,
    createSupportRequest,
    updateSupportRequest,
    deleteSupportRequest,
    createTask,
    updateTask,
    deleteTask,
    createReminder,
    updateReminder,
    deleteReminder,
    createQuotation,
    updateQuotation,
    sendMessage,
    addNotification,
    clearNotification,
    refreshData,
    refreshAccounts,
    refreshQuotations,
    refreshMessages,
    refreshAccountStorageStatus,
  }

  return (
    <DataContext.Provider value={value}>
      {children}
      <Toaster />
    </DataContext.Provider>
  )
}
