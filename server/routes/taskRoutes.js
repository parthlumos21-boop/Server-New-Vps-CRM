const { createCrudRouter } = require('./crudRouteFactory')
const taskController = require('../controllers/taskController')
const workController = require('../controllers/workManagementController')

const router = createCrudRouter(taskController)

// Enterprise Work & Task Management API Endpoints
router.get('/work/overview', workController.getOverview)
router.get('/work/projects', workController.listProjects)
router.post('/work/projects', workController.createProject)
router.put('/work/projects/:id', workController.updateProject)
router.patch('/work/projects/:id', workController.updateProject)
router.get('/work/workload', workController.getWorkload)
router.get('/work/approvals', workController.listApprovals)
router.post('/work/approvals/:id/decide', workController.decideApproval)
router.get('/work/workflows', workController.listWorkflows)
router.post('/work/workflows', workController.createWorkflow)

module.exports = router
