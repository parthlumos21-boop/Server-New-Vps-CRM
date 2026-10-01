const express = require('express')
const notificationController = require('../controllers/notificationController')
const { requireAuth } = require('../middleware/authMiddleware')
const { validate } = require('../middleware/validate')
const { idParam } = require('../validation/schemas')

const router = express.Router()

router.use(requireAuth)
router.get('/', notificationController.listNotifications)
router.put('/:id/read', validate({ params: idParam }), notificationController.markNotificationRead)

module.exports = router
