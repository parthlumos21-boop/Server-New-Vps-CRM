const express = require('express')
const { requireAuth } = require('../middleware/authMiddleware')
const { validate } = require('../middleware/validate')
const { customView, idParam } = require('../validation/schemas')
const controller = require('../controllers/customViewController')

const router = express.Router()
router.use(requireAuth)
router.get('/', controller.list)
router.get('/:id', validate({ params: idParam }), controller.getById)
router.post('/', validate({ body: customView }), controller.create)
router.put('/:id', validate({ params: idParam, body: customView }), controller.update)
router.patch('/:id', validate({ params: idParam, body: customView }), controller.update)
router.delete('/:id', validate({ params: idParam }), controller.remove)

module.exports = router
