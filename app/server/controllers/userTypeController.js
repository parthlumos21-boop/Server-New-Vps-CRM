const userTypeService = require('../services/userTypeService')
const { getSocketServer } = require('../socket/socketServer')
const { SOCKET_EVENTS } = require('../socket/socketEvents')

const broadcastUserTypeEvent = (eventName, payload) => {
  try {
    const server = getSocketServer()
    if (server?.io) {
      server.io.emit(eventName, payload)
    }
  } catch (error) {
    console.error(`Unable to broadcast ${eventName}:`, error.message)
  }
}

const listUserTypes = async (req, res, next) => {
  try {
    const data = await userTypeService.listUserTypes(req.user, req.query || {})
    res.json({ success: true, data })
  } catch (error) {
    next(error)
  }
}

const getUserTypeById = async (req, res, next) => {
  try {
    const data = await userTypeService.getUserTypeById(req.user, req.params.id)
    res.json({ success: true, data })
  } catch (error) {
    next(error)
  }
}

const getPermissionCatalog = async (_req, res, next) => {
  try {
    const data = await userTypeService.getPermissionCatalog()
    res.json({ success: true, data })
  } catch (error) {
    next(error)
  }
}

const createUserType = async (req, res, next) => {
  try {
    const data = await userTypeService.createUserType(req.user, req.body || {})
    broadcastUserTypeEvent(SOCKET_EVENTS.USER_TYPE_CREATED, { userType: data })
    res.status(201).json({ success: true, data })
  } catch (error) {
    next(error)
  }
}

const updateUserType = async (req, res, next) => {
  try {
    const data = await userTypeService.updateUserType(req.user, req.params.id, req.body || {})
    broadcastUserTypeEvent(SOCKET_EVENTS.USER_TYPE_UPDATED, { userType: data })
    res.json({ success: true, data })
  } catch (error) {
    next(error)
  }
}

const deleteUserType = async (req, res, next) => {
  try {
    const data = await userTypeService.deleteUserType(req.user, req.params.id)
    broadcastUserTypeEvent(SOCKET_EVENTS.USER_TYPE_DELETED, { userType: data })
    res.json({ success: true, data })
  } catch (error) {
    next(error)
  }
}

module.exports = {
  listUserTypes,
  getUserTypeById,
  getPermissionCatalog,
  createUserType,
  updateUserType,
  deleteUserType,
}
