const express = require('express')
const controller = require('../controllers/emailTemplateController')
const { requireAuth } = require('../middleware/authMiddleware')

const router = express.Router()

router.get('/public/signature-image', controller.getPublicSignatureImage)
router.get('/public/signature-image/:id', controller.getPublicSignatureImage)

router.use(requireAuth)

router.get('/available', controller.available)
router.get('/variables', controller.variables)
router.get('/settings', controller.settings)
router.post('/settings/signature-image', controller.uploadSignature)
router.post('/resolve', controller.resolve)
router.get('/', controller.list)
router.post('/', controller.create)
router.get('/:id', controller.get)
router.put('/:id', controller.update)
router.patch('/:id/status', controller.updateStatus)
router.delete('/:id', controller.remove)

module.exports = router
