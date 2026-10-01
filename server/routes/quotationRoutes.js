const express = require('express')
const quotationController = require('../controllers/quotationController')
const { requireAuth } = require('../middleware/authMiddleware')
const { validate } = require('../middleware/validate')
const { idParam, quotation } = require('../validation/schemas')

const router = express.Router()

router.use(requireAuth)
router.get('/', quotationController.list)
router.patch('/:id/frontend-delete', validate({ params: idParam }), quotationController.frontendDelete)
router.get('/:id', validate({ params: idParam }), quotationController.getById)
router.post('/', validate({ body: quotation }), quotationController.create)
router.post('/:id/approve', validate({ params: idParam }), quotationController.approve)
router.patch('/:id/approve', validate({ params: idParam }), quotationController.approve)
router.put('/:id', validate({ params: idParam, body: quotation }), quotationController.update)
router.patch('/:id', validate({ params: idParam, body: quotation }), quotationController.update)
router.delete('/:id', validate({ params: idParam }), quotationController.remove)

module.exports = router
