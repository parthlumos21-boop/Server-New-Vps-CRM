const express = require('express')
const { requireAuth } = require('../middleware/authMiddleware')
const chartController = require('../controllers/chartController')

const router = express.Router()
router.use(requireAuth)

// Chart Templates
router.get('/templates', chartController.listTemplates)
router.post('/templates', chartController.createTemplate)
router.put('/templates/:id', chartController.updateTemplate)
router.delete('/templates/:id', chartController.deleteTemplate)

// Dashboard aggregated charts
router.get('/dashboard/charts', chartController.listDashboardCharts)

// Chart Configurations
router.get('/', chartController.listCharts)
router.post('/', chartController.createChart)
router.get('/:id', chartController.getChartById)
router.put('/:id', chartController.updateChart)
router.delete('/:id', chartController.deleteChart)
router.patch('/:id/dashboard', chartController.patchDashboard)
router.patch('/:id/active', chartController.patchActive)
router.get('/:id/data', chartController.getChartData)

module.exports = router
