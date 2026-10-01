const { SOCKET_ROOMS } = require('./socketEvents')

const joinPrivateRooms = (socket) => {
  if (!socket.user?.id) {
    return
  }

  socket.join(SOCKET_ROOMS.user(socket.user.id))
  if (socket.user.companyId) {
    socket.join(SOCKET_ROOMS.company(socket.user.companyId))
  }

  if (socket.user.role === 'admin' || socket.user.role === 'super_admin') {
    socket.join(SOCKET_ROOMS.role('admin'))
  }

  if (socket.user.companyId && (socket.user.role === 'admin' || socket.user.role === 'super_admin')) {
    socket.join(SOCKET_ROOMS.companyRole(socket.user.companyId, 'admin'))
  }
}

const emitToUser = (io, userId, eventName, payload) => {
  if (!userId) {
    return
  }

  io.to(SOCKET_ROOMS.user(userId)).emit(eventName, payload)
}

const emitToUsers = (io, userIds = [], eventName, payload) => {
  Array.from(new Set(userIds.filter(Boolean))).forEach((userId) => {
    emitToUser(io, userId, eventName, payload)
  })
}

const emitToAdmins = (io, eventName, payload) => {
  const companyId = payload?.companyId || payload?.record?.companyId || payload?.actor?.companyId || payload?.data?.companyId
  if (companyId) {
    io.to(SOCKET_ROOMS.companyRole(companyId, 'admin')).emit(eventName, payload)
    return
  }

  io.to(SOCKET_ROOMS.role('admin')).emit(eventName, payload)
}

module.exports = {
  joinPrivateRooms,
  emitToUser,
  emitToUsers,
  emitToAdmins,
}
