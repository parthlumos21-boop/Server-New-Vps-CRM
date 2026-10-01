const customViewService = require('../services/customViewService')

const wrap = (fn) => async (req, res, next) => {
  try {
    const data = await fn(req)
    res.json({ success: true, data })
  } catch (error) { next(error) }
}

module.exports = {
  list: wrap((req) => customViewService.list(req.user, req.query.entityType)),
  getById: wrap((req) => customViewService.get(req.user, req.params.id)),
  create: async (req, res, next) => {
    try {
      const data = await customViewService.create(req.user, req.body || {})
      res.status(201).json({ success: true, data })
    } catch (error) { next(error) }
  },
  update: wrap((req) => customViewService.update(req.user, req.params.id, req.body || {})),
  remove: wrap((req) => customViewService.remove(req.user, req.params.id)),
}
