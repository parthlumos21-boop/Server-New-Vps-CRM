const createCrudController = (service) => {
  const list = async (req, res, next) => {
    try {
      const data = await service.list(req.user, req.query || {})
      res.json({ success: true, data })
    } catch (error) { next(error) }
  }

  const getById = async (req, res, next) => {
    try {
      const data = await service.get(req.user, req.params.id)
      res.json({ success: true, data })
    } catch (error) { next(error) }
  }

  const create = async (req, res, next) => {
    try {
      const data = await service.create(req.user, req.body || {})
      res.status(201).json({ success: true, data })
    } catch (error) { next(error) }
  }

  const update = async (req, res, next) => {
    try {
      const data = await service.update(req.user, req.params.id, req.body || {})
      res.json({ success: true, data })
    } catch (error) { next(error) }
  }

  const remove = async (req, res, next) => {
    try {
      const data = await service.remove(req.user, req.params.id)
      res.json({ success: true, data })
    } catch (error) { next(error) }
  }

  return {
    list,
    getById,
    create,
    update,
    remove,
    validation: service.validation || {},
  }
}

module.exports = { createCrudController }
