const express = require('express')
const router = express.Router()
const productController = require('../controllers/productController')
const { requireAuth } = require('../middleware/authMiddleware')
const { requireAdmin } = require('../middleware/roleMiddleware')

router.use(requireAuth)

// Settings routes
router.get('/settings', productController.getSettings)
router.put('/settings', requireAdmin, productController.updateSettings)

// Product routes
router.get('/', productController.getProducts)
router.post('/', requireAdmin, productController.createProduct)
router.get('/:id', productController.getProductById)
router.put('/:id', requireAdmin, productController.updateProduct)
router.delete('/:id', requireAdmin, productController.deleteProduct)

module.exports = router
