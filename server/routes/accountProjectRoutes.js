const express = require('express')
const accountProjectController = require('../controllers/accountProjectController')
const { requireAuth } = require('../middleware/authMiddleware')

const router = express.Router()

router.use(requireAuth)
router.get('/sources/search', accountProjectController.searchSources)
router.post('/existing-source-project', accountProjectController.createExistingSourceProject)

module.exports = router
