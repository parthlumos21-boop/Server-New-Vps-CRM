const express = require('express')
const userTypeController = require('../controllers/userTypeController')
const { requireAuth } = require('../middleware/authMiddleware')
const { requireAdmin } = require('../middleware/roleMiddleware')
const { validate } = require('../middleware/validate')
const { idParam, userType } = require('../validation/schemas')

const router = express.Router()

router.use(requireAuth)
router.use(requireAdmin)

router.get('/permissions', userTypeController.getPermissionCatalog)
router.get('/', userTypeController.listUserTypes)
router.get('/:id', validate({ params: idParam }), userTypeController.getUserTypeById)
router.post('/', validate({ body: userType }), userTypeController.createUserType)
router.put('/:id', validate({ params: idParam, body: userType }), userTypeController.updateUserType)
router.delete('/:id', validate({ params: idParam }), userTypeController.deleteUserType)

module.exports = router
