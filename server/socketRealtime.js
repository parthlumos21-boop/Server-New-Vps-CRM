const { SocketPresenceStore } = require('./socketPresence')
const { SOCKET_EVENTS, SOCKET_ROOMS } = require('./socketEvents')

const toArray = (value) => Array.isArray(value) ? value : (value ? [value] : [])

const unique = (values) => Array.from(new Set(values.filter(Boolean)))

const getUserRoom = (userId) => `${SOCKET_ROOMS.USER_PREFIX}${userId}`

const getRoleRoom = (role) => `${SOCKET_ROOMS.ROLE_PREFIX}${role}`

const normalizeEntityPacket = (entityType, action, payload, actor) => {
  const record = payload?.record || payload?.data || payload
  const previousRecord = payload?.previousRecord || null
  const recordId = payload?.recordId || record?.id || previousRecord?.id || null
  const assignedUserIds = unique([
    ...toArray(payload?.assignedUserIds),
    ...toArray(record?.assignedUserIds),
    ...toArray(previousRecord?.assignedUserIds),
    record?.userId,
    record?.ownerId,
    previousRecord?.userId,
    previousRecord?.ownerId,
  ])

  return {
    entityType,
    action,
    record,
    previousRecord,
    recordId,
    assignedUserIds,
    actor,
    timestamp: payload?.timestamp || new Date().toISOString(),
  }
}

const buildActivity = (type, data, actor) => ({
  id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
  type,
  data,
  userId: actor?.userId || '',
  userName: actor?.name || 'Unknown User',
  timestamp: new Date().toISOString(),
})

const buildNotification = (title, message, meta = {}) => ({
  id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
  type: meta.type || 'info',
  title,
  message,
  timestamp: new Date().toISOString(),
  ...meta,
})

const buildDashboardPayload = (packet) => ({
  entityType: packet.entityType,
  action: packet.action,
  recordId: packet.recordId,
  actor: packet.actor,
  timestamp: packet.timestamp,
})

const buildLeadNotification = (packet) => {
  const leadName = packet.record?.name || packet.record?.accountName || 'Lead'
  const meta = { actorUserId: packet.actor?.userId || '' }

  if (packet.action === 'created') {
    return buildNotification(
      'New lead assigned',
      `${packet.actor?.name || 'A user'} created ${leadName}.`,
      meta
    )
  }

  if (packet.action === 'deleted') {
    return buildNotification(
      'Lead removed',
      `${packet.actor?.name || 'A user'} removed ${leadName}.`,
      meta
    )
  }

  return buildNotification(
    'Lead updated',
    `${packet.actor?.name || 'A user'} updated ${leadName}.`,
    meta
  )
}

const buildMessageNotification = (message, actor) => buildNotification(
  'New message',
  `${message.senderName || 'User'} sent a new message.`,
  { actorUserId: actor?.userId || '' }
)

const emitToRooms = (io, rooms, eventName, payload) => {
  rooms.forEach((room) => {
    io.to(room).emit(eventName, payload)
  })
}

const getTargetRooms = (packet, options = {}) => {
  const {
    includeAdmins = true,
    includeActor = true,
    includeAssignedUsers = true,
  } = options

  const rooms = new Set()

  if (includeAdmins) {
    rooms.add(getRoleRoom('admin'))
  }

  if (includeAssignedUsers) {
    packet.assignedUserIds.forEach((userId) => rooms.add(getUserRoom(userId)))
  }

  if (includeActor && packet.actor?.userId) {
    rooms.add(getUserRoom(packet.actor.userId))
  }

  return Array.from(rooms)
}

const attachRealtimeHandlers = (io) => {
  const presence = new SocketPresenceStore()
  const activities = []

  const emitPresenceSnapshot = () => {
    io.emit(SOCKET_EVENTS.USERS_ONLINE, presence.listUsers())
  }

  const logActivity = (type, data, actor, rooms = [getRoleRoom('admin')]) => {
    const activity = buildActivity(type, data, actor)
    activities.unshift(activity)

    if (activities.length > 100) {
      activities.pop()
    }

    emitToRooms(io, rooms, SOCKET_EVENTS.ACTIVITY, activity)
  }

  const emitLeadLifecycle = (packet) => {
    const rooms = getTargetRooms(packet)
    const eventName = packet.action === 'created' ? SOCKET_EVENTS.NEW_LEAD : SOCKET_EVENTS.LEAD_UPDATED

    emitToRooms(io, rooms, eventName, packet)
    emitToRooms(io, rooms, SOCKET_EVENTS.DASHBOARD_UPDATE, buildDashboardPayload(packet))
    emitToRooms(io, rooms, SOCKET_EVENTS.NOTIFICATION, buildLeadNotification(packet))
    logActivity(`lead-${packet.action}`, packet.record || { id: packet.recordId }, packet.actor)
  }

  const emitLegacyEntityLifecycle = (packet, eventName, activityType) => {
    const rooms = getTargetRooms(packet)
    emitToRooms(io, rooms, eventName, packet.action === 'deleted' ? packet.recordId : packet.record)
    emitToRooms(io, rooms, SOCKET_EVENTS.DASHBOARD_UPDATE, buildDashboardPayload(packet))
    logActivity(activityType, packet.record || { id: packet.recordId }, packet.actor)
  }

  const emitMessage = (message, actor) => {
    const targetRooms = unique([
      ...toArray(message.recipientUserIds).map((userId) => getUserRoom(userId)),
      actor?.userId ? getUserRoom(actor.userId) : null,
    ])

    emitToRooms(io, targetRooms, SOCKET_EVENTS.RECEIVE_MESSAGE, message)
    emitToRooms(io, targetRooms, SOCKET_EVENTS.NOTIFICATION, buildMessageNotification(message, actor))
    logActivity(
      'message-sent',
      { id: message?.id, recipientCount: message?.recipientCount || 0 },
      actor
    )
  }

  io.on(SOCKET_EVENTS.CONNECT, (socket) => {
    const actor = {
      userId: socket.handshake.query.userId || '',
      role: socket.handshake.query.role || 'user',
      name: socket.handshake.query.name || 'Unknown User',
      socketId: socket.id,
    }

    if (actor.userId) {
      socket.join(getUserRoom(actor.userId))
      socket.join(getRoleRoom(actor.role))

      const presenceResult = presence.register(socket.id, {
        id: actor.userId,
        role: actor.role,
        name: actor.name,
      })

      emitPresenceSnapshot()

      if (presenceResult.becameOnline && presenceResult.user) {
        io.emit(SOCKET_EVENTS.USER_ONLINE, presenceResult.user)
        logActivity('user-online', { id: actor.userId }, actor)
      }
    }

    socket.on(SOCKET_EVENTS.ACCOUNT_CREATE, (payload) => {
      emitLeadLifecycle(normalizeEntityPacket('account', 'created', payload, actor))
    })

    socket.on(SOCKET_EVENTS.ACCOUNT_UPDATE, (payload) => {
      emitLeadLifecycle(normalizeEntityPacket('account', 'updated', payload, actor))
    })

    socket.on(SOCKET_EVENTS.ACCOUNT_DELETE, (payload) => {
      emitLeadLifecycle(normalizeEntityPacket('account', 'deleted', payload, actor))
    })

    socket.on(SOCKET_EVENTS.DEAL_CREATE, (payload) => {
      emitLegacyEntityLifecycle(
        normalizeEntityPacket('deal', 'created', payload, actor),
        SOCKET_EVENTS.DEAL_CREATED,
        'deal-created'
      )
    })

    socket.on(SOCKET_EVENTS.DEAL_UPDATE, (payload) => {
      emitLegacyEntityLifecycle(
        normalizeEntityPacket('deal', 'updated', payload, actor),
        SOCKET_EVENTS.DEAL_UPDATED,
        'deal-updated'
      )
    })

    socket.on(SOCKET_EVENTS.DEAL_DELETE, (payload) => {
      emitLegacyEntityLifecycle(
        normalizeEntityPacket('deal', 'deleted', payload, actor),
        SOCKET_EVENTS.DEAL_DELETED,
        'deal-deleted'
      )
    })

    socket.on(SOCKET_EVENTS.TASK_CREATE, (payload) => {
      emitLegacyEntityLifecycle(
        normalizeEntityPacket('task', 'created', payload, actor),
        SOCKET_EVENTS.TASK_CREATED,
        'task-created'
      )
    })

    socket.on(SOCKET_EVENTS.TASK_UPDATE, (payload) => {
      emitLegacyEntityLifecycle(
        normalizeEntityPacket('task', 'updated', payload, actor),
        SOCKET_EVENTS.TASK_UPDATED,
        'task-updated'
      )
    })

    socket.on(SOCKET_EVENTS.TASK_DELETE, (payload) => {
      emitLegacyEntityLifecycle(
        normalizeEntityPacket('task', 'deleted', payload, actor),
        SOCKET_EVENTS.TASK_DELETED,
        'task-deleted'
      )
    })

    socket.on(SOCKET_EVENTS.SUPPORT_REQUEST_CREATE, (payload) => {
      emitLegacyEntityLifecycle(
        normalizeEntityPacket('support-request', 'created', payload, actor),
        SOCKET_EVENTS.SUPPORT_REQUEST_CREATED,
        'support-request-created'
      )
    })

    socket.on(SOCKET_EVENTS.SUPPORT_REQUEST_UPDATE, (payload) => {
      emitLegacyEntityLifecycle(
        normalizeEntityPacket('support-request', 'updated', payload, actor),
        SOCKET_EVENTS.SUPPORT_REQUEST_UPDATED,
        'support-request-updated'
      )
    })

    const handleMessageSend = (payload) => {
      emitMessage(payload?.record || payload, actor)
    }

    socket.on(SOCKET_EVENTS.SEND_MESSAGE, handleMessageSend)
    socket.on(SOCKET_EVENTS.SEND_MESSAGE_LEGACY, handleMessageSend)

    socket.on(SOCKET_EVENTS.DASHBOARD_TABS_UPDATE, (payload) => {
      io.to(getRoleRoom('admin')).emit(SOCKET_EVENTS.DASHBOARD_TABS_UPDATE, payload)
    })

    socket.on(SOCKET_EVENTS.DISCONNECT, () => {
      const presenceResult = presence.unregister(socket.id)
      emitPresenceSnapshot()

      if (presenceResult.becameOffline && presenceResult.user) {
        io.emit(SOCKET_EVENTS.USER_OFFLINE, presenceResult.user)
        logActivity('user-offline', { id: actor.userId }, actor)
      }
    })
  })

  return {
    getActivities: () => activities,
    getOnlineUsers: () => presence.listUsers(),
    getOnlineUsersCount: () => presence.count(),
  }
}

module.exports = {
  attachRealtimeHandlers,
}
