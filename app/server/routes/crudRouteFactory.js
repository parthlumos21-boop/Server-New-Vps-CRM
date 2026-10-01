const express = require('express')
const { requireAuth } = require('../middleware/authMiddleware')
const { validate } = require('../middleware/validate')
const { idParam } = require('../validation/schemas')

const createCrudRouter = (controller, { extraRoutes } = {}) => {
  const router = express.Router()
  const validation = controller.validation || {}
  router.use(requireAuth)
  router.get('/', validate({ query: validation.listQuery }), controller.list)
  if (typeof extraRoutes === 'function') {
    extraRoutes(router)
  }
  router.get('/:id', validate({ params: idParam }), controller.getById)
  router.post('/', validate({ body: validation.create }), controller.create)
  router.put('/:id', validate({ params: idParam, body: validation.update }), controller.update)
  router.patch('/:id', validate({ params: idParam, body: validation.update }), controller.update)
  router.delete('/:id', validate({ params: idParam }), controller.remove)
  return router
}

module.exports = { createCrudRouter }
