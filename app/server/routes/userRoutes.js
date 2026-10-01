const express = require('express')
const userController = require('../controllers/userController')
const { requireAuth } = require('../middleware/authMiddleware')
const { requireAdmin } = require('../middleware/roleMiddleware')
const { validate } = require('../middleware/validate')
const { idParam } = require('../validation/schemas')

const router = express.Router()

router.use(requireAuth)
router.get('/directory', userController.listUserDirectory)
router.post('/', requireAdmin, userController.createUser)
router.get('/', requireAdmin, userController.listUsers)
router.get('/pending', requireAdmin, userController.listPendingUsers)
router.get('/online', requireAdmin, userController.listOnlineUsers)
router.patch('/:id', requireAdmin, validate({ params: idParam }), userController.updateUser)
router.delete('/:id', requireAdmin, validate({ params: idParam }), userController.deleteUser)
router.patch('/:id/approve', requireAdmin, validate({ params: idParam }), userController.approveUser)
router.patch('/:id/reject', requireAdmin, validate({ params: idParam }), userController.rejectUser)
router.patch('/:id/disable', requireAdmin, validate({ params: idParam }), userController.disableUser)
router.patch('/:id/enable', requireAdmin, validate({ params: idParam }), userController.enableUser)

module.exports = router
