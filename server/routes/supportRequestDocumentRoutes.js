const express = require('express')
const { requireAuth } = require('../middleware/authMiddleware')
const controller = require('../controllers/supportRequestDocumentController')
const storageService = require('../services/storageService')
const { validate } = require('../middleware/validate')
const { idParam } = require('../validation/schemas')

const tryRequire = (name) => { try { return require(name) } catch (_) { return null } }
const multer = tryRequire('multer')

const router = express.Router()
router.use(requireAuth)

if (multer) {
  const upload = multer({ dest: storageService.getUploadsDir() })
  router.post('/upload', upload.single('file'), controller.upload)
} else {
  router.post('/upload', (_req, res) => res.status(501).json({
    success: false,
    message: 'File upload not available — install multer.',
  }))
}

router.get('/', controller.list)
router.get('/:id/download', validate({ params: idParam }), controller.download)
router.delete('/:id', validate({ params: idParam }), controller.remove)

module.exports = router
