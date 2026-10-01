class SocketPresenceStore {
  constructor() {
    this.socketToUser = new Map()
    this.userToSockets = new Map()
  }

  register(socketId, user) {
    if (!socketId || !user?.id) {
      return { becameOnline: false, user: null }
    }

    const snapshot = {
      id: user.id,
      role: user.role || 'user',
      name: user.name || 'Unknown User',
      connectedAt: new Date().toISOString(),
    }

    const activeSockets = this.userToSockets.get(user.id) || new Set()
    const becameOnline = activeSockets.size === 0
    activeSockets.add(socketId)

    this.userToSockets.set(user.id, activeSockets)
    this.socketToUser.set(socketId, snapshot)

    return {
      becameOnline,
      user: this.getUser(user.id),
    }
  }

  unregister(socketId) {
    const user = this.socketToUser.get(socketId)

    if (!user) {
      return { becameOffline: false, user: null }
    }

    this.socketToUser.delete(socketId)

    const activeSockets = this.userToSockets.get(user.id) || new Set()
    activeSockets.delete(socketId)

    let becameOffline = false

    if (activeSockets.size === 0) {
      this.userToSockets.delete(user.id)
      becameOffline = true
    } else {
      this.userToSockets.set(user.id, activeSockets)
    }

    return {
      becameOffline,
      user: this.getUser(user.id) || {
        ...user,
        socketIds: [],
        connectedSockets: 0,
      },
    }
  }

  getUser(userId) {
    const socketIds = Array.from(this.userToSockets.get(userId) || [])
    if (socketIds.length === 0) {
      return null
    }

    const snapshot = this.socketToUser.get(socketIds[0])
    if (!snapshot) {
      return null
    }

    return {
      ...snapshot,
      socketIds,
      connectedSockets: socketIds.length,
    }
  }

  listUsers() {
    return Array.from(this.userToSockets.keys())
      .map((userId) => this.getUser(userId))
      .filter(Boolean)
      .sort((left, right) => left.name.localeCompare(right.name))
  }

  count() {
    return this.userToSockets.size
  }
}

module.exports = {
  SocketPresenceStore,
}
