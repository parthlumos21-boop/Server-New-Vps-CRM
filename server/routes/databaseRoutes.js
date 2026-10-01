const express = require('express')
const databaseController = require('../controllers/databaseController')
const { requireAuth } = require('../middleware/authMiddleware')
const { requireAdmin } = require('../middleware/roleMiddleware')

const router = express.Router()

router.use(requireAuth)
router.use(requireAdmin)

router.get('/collections', databaseController.listCollections)
router.get('/collections/:collection', databaseController.getCollectionData)
router.delete('/collections/:collection/:id', databaseController.deleteDocument)

module.exports = router
