const express = require('express')
const remarkController = require('../controllers/remarkController')
const { requireAuth } = require('../middleware/authMiddleware')

const router = express.Router()

// Middleware to require authentication
router.use(requireAuth)

// Remark endpoints
router.post('/remarks', remarkController.createRemark)
router.get('/remarks/account/:accountId', remarkController.getRemarksByAccount)
router.put('/remarks/:remarkId', remarkController.updateRemark)
router.delete('/remarks/:remarkId', remarkController.deleteRemark)

// Reminder endpoints
router.get('/remark-reminders', remarkController.listRemarkReminders)
router.put('/remark-reminders/:reminderId', remarkController.updateReminder)
router.put('/reminders/:reminderId', remarkController.updateReminder)

module.exports = router
