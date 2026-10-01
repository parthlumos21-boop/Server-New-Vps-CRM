const express = require('express')
const { requireAuth } = require('../middleware/authMiddleware')
const projectController = require('../controllers/projectController')
const { validate } = require('../middleware/validate')
const { idParam, projectCreate, projectUpdate } = require('../validation/schemas')

const router = express.Router()

router.use(requireAuth)
router.get('/', projectController.listProjects)
router.post('/', validate({ body: projectCreate }), projectController.createProject)
router.get('/:id', validate({ params: idParam }), projectController.getProjectById)
router.put('/:id', validate({ params: idParam, body: projectUpdate }), projectController.updateProject)
router.patch('/:id', validate({ params: idParam, body: projectUpdate }), projectController.updateProject)
router.delete('/:id', validate({ params: idParam }), projectController.deleteProject)

module.exports = router
