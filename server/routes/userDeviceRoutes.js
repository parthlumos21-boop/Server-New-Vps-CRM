const express = require('express')
const router = express.Router()
const userDeviceController = require('../controllers/userDeviceController')
const { requireAuth } = require('../middleware/authMiddleware')

router.use(requireAuth)
router.post('/register', userDeviceController.registerDevice)
router.post('/unregister', userDeviceController.unregisterDevice)

module.exports = router
