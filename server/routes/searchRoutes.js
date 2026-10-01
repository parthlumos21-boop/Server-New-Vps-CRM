const express = require('express')
const { requireAuth } = require('../middleware/authMiddleware')
const controller = require('../controllers/searchController')

const router = express.Router()
router.use(requireAuth)
router.get('/', controller.search)

module.exports = router
