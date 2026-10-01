const express = require('express')
const { requireAuth } = require('../middleware/authMiddleware')
const { requireAdmin } = require('../middleware/roleMiddleware')
const { validate } = require('../middleware/validate')
const { settingValue } = require('../validation/schemas')
const controller = require('../controllers/settingsController')

const router = express.Router()
router.use(requireAuth)
router.get('/setup-status', requireAdmin, controller.getSetupStatus)
router.get('/global', controller.listGlobal)
router.put('/global/:key', validate({ body: settingValue }), controller.setGlobalSetting)
router.delete('/global/:key', controller.removeGlobalSetting)
router.get('/user', controller.listUser)
router.get('/user/:key', controller.getUserSetting)
router.put('/user/:key', validate({ body: settingValue }), controller.setUserSetting)
router.delete('/user/:key', controller.removeUserSetting)

module.exports = router
