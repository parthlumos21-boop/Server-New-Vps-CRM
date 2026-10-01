const express = require('express')
const { requireAuth } = require('../middleware/authMiddleware')
const { validate } = require('../middleware/validate')
const { idParam } = require('../validation/schemas')
const controller = require('../controllers/dashboardController')

const router = express.Router()
router.use(requireAuth)
router.get('/stats', controller.getStats)
router.get('/charts', controller.getCharts)
router.get('/tabs', controller.listTabs)
router.post('/tabs', controller.createTab)
router.put('/tabs/:id', validate({ params: idParam }), controller.updateTab)
router.delete('/tabs/:id', validate({ params: idParam }), controller.deleteTab)

module.exports = router
