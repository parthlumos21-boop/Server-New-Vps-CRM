const express = require('express')
const messageController = require('../controllers/messageController')
const { requireAuth } = require('../middleware/authMiddleware')

const router = express.Router()

router.use(requireAuth)
router.get('/', messageController.listMessages)
router.post('/', messageController.sendMessage)

module.exports = router
