const userRepository = require('../repositories/userRepository')
const { AppError } = require('../utils/appError')
const authService = require('../services/authService')
const { getSocketServer } = require('../socket/socketServer')
const { SOCKET_EVENTS } = require('../socket/socketEvents')
const { isPrivilegedRole } = require('../security/accessScope')

const broadcastUserEvent = (eventName, payload) => {
  try {
    const server = getSocketServer()
    if (server?.io) {
      server.io.emit(eventName, payload)
    }
  } catch (error) {
    console.error(`Unable to broadcast ${eventName}:`, error.message)
  }
}

const createUser = async (req, res, next) => {
  try {
    const { name, email, password, role } = req.body || {}
    const result = await authService.createAdminManagedUser({
      name,
      email,
      password,
      role,
      companyId: req.user.companyId,
    })
    broadcastUserEvent(SOCKET_EVENTS.USER_CREATED, { user: result.user })
    res.status(201).json({
      success: true,
      message: 'User created. Approve this user before login.',
      data: result.user,
    })
  } catch (error) {
    next(error)
  }
}

const updateUser = async (req, res, next) => {
  try {
    const userId = Number(req.params.id)
    if (!Number.isFinite(userId)) {
      throw new AppError('Invalid user id.', 400)
    }

    const { name, email, password } = req.body || {}
    const result = await authService.updateAdminManagedUser(userId, { name, email, password })
    broadcastUserEvent(SOCKET_EVENTS.USER_UPDATED, { user: result.user })

    res.json({
      success: true,
      message: 'User updated successfully.',
      data: result.user,
    })
  } catch (error) {
    next(error)
  }
}

const deleteUser = async (req, res, next) => {
  try {
    const userId = Number(req.params.id)
    if (!Number.isFinite(userId)) {
      throw new AppError('Invalid user id.', 400)
    }

    const target = await userRepository.findUserById(userId)
    if (!target || target.companyId !== req.user.companyId) {
      throw new AppError('User not found.', 404)
    }

    if (isPrivilegedRole(target.role)) {
      throw new AppError('Privileged accounts cannot be deleted through this API.', 403)
    }

    if (target.id === req.user.id) {
      throw new AppError('You cannot delete your own account.', 400)
    }

    const deleted = await userRepository.deleteUser(userId)
    broadcastUserEvent(SOCKET_EVENTS.USER_DELETED, { userId, user: deleted })

    res.json({
      success: true,
      message: 'User deleted successfully.',
      data: deleted,
    })
  } catch (error) {
    next(error)
  }
}

const listUsers = async (req, res, next) => {
  try {
    const { status } = req.query || {}
    const users = status
      ? await userRepository.listUsersByStatus(status, req.user.companyId)
      : await userRepository.listAllUsers(req.user.companyId)
    res.json({
      success: true,
      data: users,
    })
  } catch (error) {
    next(error)
  }
}

const listPendingUsers = async (req, res, next) => {
  try {
    const users = await userRepository.listUsersByStatus('pending', req.user.companyId)
    res.json({
      success: true,
      data: users,
    })
  } catch (error) {
    next(error)
  }
}

const listOnlineUsers = async (req, res, next) => {
  try {
    const users = await userRepository.listOnlineUsers(req.user.companyId)
    res.json({
      success: true,
      data: users,
    })
  } catch (error) {
    next(error)
  }
}

const listUserDirectory = async (req, res, next) => {
  try {
    const users = await userRepository.listUserDirectory(req.user.companyId)
    res.json({
      success: true,
      data: users,
    })
  } catch (error) {
    next(error)
  }
}

const changeUserStatus = (nextStatus) => async (req, res, next) => {
  try {
    const userId = Number(req.params.id)
    if (!Number.isFinite(userId)) {
      throw new AppError('Invalid user id.', 400)
    }

    const target = await userRepository.findUserById(userId)
    if (!target || target.companyId !== req.user.companyId) {
      throw new AppError('User not found.', 404)
    }

    if (target.id === req.user.id && nextStatus !== 'approved') {
      throw new AppError('You cannot deny or disable your own account.', 400)
    }

    const updated = await userRepository.updateUserStatus(userId, nextStatus)
    broadcastUserEvent(SOCKET_EVENTS.USER_STATUS_CHANGED, { user: updated, status: nextStatus })
    res.json({
      success: true,
      data: updated,
    })
  } catch (error) {
    next(error)
  }
}

module.exports = {
  createUser,
  updateUser,
  deleteUser,
  listUsers,
  listPendingUsers,
  listOnlineUsers,
  listUserDirectory,
  approveUser: changeUserStatus('approved'),
  rejectUser: changeUserStatus('rejected'),
  disableUser: changeUserStatus('disabled'),
  enableUser: changeUserStatus('approved'),
}
