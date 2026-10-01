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

module.exports = { ...base, bulkUpdate, bulkDelete }
