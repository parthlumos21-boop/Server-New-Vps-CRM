const express = require('express')
const passwordResetController = require('../controllers/passwordResetController')
const { requireAuth } = require('../middleware/authMiddleware')
const { requireAdmin } = require('../middleware/roleMiddleware')

const router = express.Router()

router.get('/', requireAuth, requireAdmin, passwordResetController.listRequests)
router.post('/:id/approve', requireAuth, requireAdmin, passwordResetController.approveRequest)
router.post('/:id/reject', requireAuth, requireAdmin, passwordResetController.rejectRequest)

module.exports = router
