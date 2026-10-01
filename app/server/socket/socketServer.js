const { Server } = require('socket.io')
const { env } = require('../config/env')
const userRepository = require('../repositories/userRepository')
const { socketAuth } = require('./socketAuth')
const { joinPrivateRooms, emitToAdmins, emitToUser, emitToUsers } = require('./socketRooms')
const { SOCKET_EVENTS, SOCKET_ROOMS } = require('./socketEvents')
const { hasCompanyAccess, isPrivilegedRole } = require('../security/accessScope')

let socketServer = null

const defaultOrigins = [
  env.clientUrl,
  'http://localhost:3000',
  'http://localhost:5173',
  'http://127.0.0.1:3000',
  'http://127.0.0.1:5173',
]

const allowedOrigins = Array.from(new Set([
  ...defaultOrigins,
  ...env.corsOrigins,
].filter(Boolean)))

// helper utilities are provided in socketRealtime.js where needed

const createSocketServer = (httpServer) => {
  const io = new Server(httpServer, {
    cors: {
      origin: allowedOrigins,
      methods: ['GET', 'POST', 'PUT', 'DELETE'],
      credentials: true,
    },
  })

  const activities = []
  const connectedUsers = new Map()
  const presenceBroadcastTimers = new Map()

  const getOnlineUsers = async (companyId = null) => userRepository.listOnlineUsers(companyId)
  const getOnlineUsersCount = async () => (await getOnlineUsers()).length
  const getActivities = (actor = null) => {
    if (!actor) return activities

    return activities.filter((entry) => {
      if (!hasCompanyAccess(actor, entry.companyId)) return false
      if (isPrivilegedRole(actor.role)) return true
      return entry.userId === actor.id
    })
  }

  const pushActivity = (type, user, payload = {}) => {
    activities.unshift({
      id: `act-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      type,
      userId: user?.id || null,
      userName: user?.name || '',
      role: user?.role || '',
      companyId: user?.companyId || null,
      payload,
      createdAt: new Date().toISOString(),
    })

    if (activities.length > 100) {
      activities.length = 100
    }
  }

  const broadcastPresence = async (companyId = null) => {
    const onlineUsers = await getOnlineUsers(companyId)
    if (companyId) {
      io.to(SOCKET_ROOMS.company(companyId)).emit(SOCKET_EVENTS.USERS_ONLINE, onlineUsers)
      return
    }

    io.emit(SOCKET_EVENTS.USERS_ONLINE, onlineUsers)
  }

  const schedulePresenceBroadcast = (companyId = null) => {
    const timerKey = companyId || 'global'
    if (presenceBroadcastTimers.has(timerKey)) return

    const timer = setTimeout(async () => {
      presenceBroadcastTimers.delete(timerKey)
      try {
        await broadcastPresence(companyId)
      } catch (error) {
        console.error('Unable to broadcast online user presence:', error.message)
      }
    }, 250)

    presenceBroadcastTimers.set(timerKey, timer)
  }

  io.use(socketAuth)

  io.on('connection', async (socket) => {
    const currentUser = socket.user
    const existingSocketIds = connectedUsers.get(currentUser.id) || new Set()
    existingSocketIds.add(socket.id)
    connectedUsers.set(currentUser.id, existingSocketIds)

    joinPrivateRooms(socket)
    await userRepository.updateUserOnlineStatus(currentUser.id, true)
    pushActivity('user-online', currentUser)
    schedulePresenceBroadcast(currentUser.companyId)
    io.to(SOCKET_ROOMS.company(currentUser.companyId)).emit(SOCKET_EVENTS.USER_ONLINE, {
      id: currentUser.id,
      name: currentUser.name,
      role: currentUser.role,
      isOnline: true,
    })

    socket.on(SOCKET_EVENTS.JOIN_ROOM, (roomName) => {
      if (roomName && typeof roomName === 'string') {
        socket.join(roomName)
      }
    })

    const ignoreClientMutationEvent = () => {
      // All entity mutations must come from authenticated REST APIs so
      // ownership, company scope, and audit trails are enforced server-side.
    }

    socket.on(SOCKET_EVENTS.ACCOUNT_CREATE, ignoreClientMutationEvent)
    socket.on(SOCKET_EVENTS.ACCOUNT_UPDATE, ignoreClientMutationEvent)
    socket.on(SOCKET_EVENTS.ACCOUNT_DELETE, ignoreClientMutationEvent)
    socket.on(SOCKET_EVENTS.DEAL_CREATE, ignoreClientMutationEvent)
    socket.on(SOCKET_EVENTS.DEAL_UPDATE, ignoreClientMutationEvent)
    socket.on(SOCKET_EVENTS.DEAL_DELETE, ignoreClientMutationEvent)
    socket.on(SOCKET_EVENTS.TASK_CREATE, ignoreClientMutationEvent)
    socket.on(SOCKET_EVENTS.TASK_UPDATE, ignoreClientMutationEvent)
    socket.on(SOCKET_EVENTS.TASK_DELETE, ignoreClientMutationEvent)
    socket.on(SOCKET_EVENTS.SUPPORT_REQUEST_CREATE, ignoreClientMutationEvent)
    socket.on(SOCKET_EVENTS.SUPPORT_REQUEST_UPDATE, ignoreClientMutationEvent)

    const handleLegacyMessageSend = ignoreClientMutationEvent

    socket.on(SOCKET_EVENTS.SEND_MESSAGE, handleLegacyMessageSend)
    socket.on(SOCKET_EVENTS.SEND_MESSAGE_LEGACY, handleLegacyMessageSend)

    socket.on(SOCKET_EVENTS.DASHBOARD_TABS_UPDATE, (payload) => {
      socketServer.emitToAdmins(SOCKET_EVENTS.DASHBOARD_TABS_UPDATE, { ...payload, companyId: currentUser.companyId })
    })

    socket.on('disconnect', async () => {
      try {
        const nextSocketIds = connectedUsers.get(currentUser.id) || new Set()
        nextSocketIds.delete(socket.id)

        if (nextSocketIds.size === 0) {
          connectedUsers.delete(currentUser.id)
          await userRepository.updateUserOnlineStatus(currentUser.id, false)
          pushActivity('user-offline', currentUser)
          io.to(SOCKET_ROOMS.company(currentUser.companyId)).emit(SOCKET_EVENTS.USER_OFFLINE, {
            id: currentUser.id,
            name: currentUser.name,
            role: currentUser.role,
            isOnline: false,
          })
        } else {
          connectedUsers.set(currentUser.id, nextSocketIds)
        }

        schedulePresenceBroadcast(currentUser.companyId)
      } catch (error) {
        console.error('Unable to update socket disconnect state:', error.message)
      }
    })
  })

  socketServer = {
    io,
    getActivities,
    getOnlineUsers,
    getOnlineUsersCount,
    emitToUser: (userId, eventName, payload) => emitToUser(io, userId, eventName, payload),
    emitToUsers: (userIds, eventName, payload) => emitToUsers(io, userIds, eventName, payload),
    emitToAdmins: (eventName, payload) => emitToAdmins(io, eventName, payload),
    pushActivity,
    broadcastPresence,
    schedulePresenceBroadcast,
  }

  return socketServer
}

const getSocketServer = () => socketServer

module.exports = {
  createSocketServer,
  getSocketServer,
}
