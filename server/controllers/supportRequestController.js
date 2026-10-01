const { createCrudController } = require('./crudControllerFactory')
const supportRequestService = require('../services/supportRequestService')

const base = createCrudController(supportRequestService)

const bulkUpdate = async (req, res, next) => {
  try {
    const data = await supportRequestService.bulkUpdate(req.user, req.body || {})
    res.json({ success: true, data })
  } catch (error) { next(error) }
}

const bulkDelete = async (req, res, next) => {
  try {
    const data = await supportRequestService.bulkDelete(req.user, req.body || {})
    res.json({ success: true, data })
  } catch (error) { next(error) }
}

const addReply = async (req, res, next) => {
  try {
    const data = await supportRequestService.addReply(req.user, req.params.id, req.body?.message)
    res.json({ success: true, data })
  } catch (error) { next(error) }
}

const getReplies = async (req, res, next) => {
  try {
    const data = await supportRequestService.getReplies(req.user, req.params.id)
    res.json({ success: true, data })
  } catch (error) { next(error) }
}

const getTodoReplies = async (req, res, next) => {
  try {
    const data = await supportRequestService.getTodoReplies(req.user)
    res.json({ success: true, data })
  } catch (error) { next(error) }
}

const closeTicket = async (req, res, next) => {
  try {
    const data = await supportRequestService.closeTicket(req.user, req.params.id)
    res.json({ success: true, data })
  } catch (error) { next(error) }
}

module.exports = { ...base, bulkUpdate, bulkDelete, addReply, getReplies, getTodoReplies, closeTicket }
