const express = require('express')
const jobPlanningController = require('../controllers/jobPlanningController')
const { requireAuth } = require('../middleware/authMiddleware')
// const { requireAdmin } = require('../middleware/roleMiddleware')

const router = express.Router()

router.use(requireAuth)
router.get('/', jobPlanningController.listJobPlannings)
router.post('/', jobPlanningController.createJobPlanning)
router.patch('/:id', jobPlanningController.updateJobPlanning)
router.delete('/:id', jobPlanningController.deleteJobPlanning)

module.exports = router
