const express = require('express')
const { requireAuth } = require('../middleware/authMiddleware')
const controller = require('../controllers/attachmentController')
const storageService = require('../services/storageService')
const { validate } = require('../middleware/validate')
const { idParam } = require('../validation/schemas')

const tryRequire = (name) => { try { return require(name) } catch (_) { return null } }
const multer = tryRequire('multer')

const router = express.Router()
router.use(requireAuth)

if (multer) {
  const storage = multer.diskStorage({
    destination: (_req, _file, cb) => cb(null, storageService.getUploadsDir()),
    filename: (_req, file, cb) => {
      const safe = file.originalname.replace(/[^a-zA-Z0-9._-]/g, '_')
      cb(null, `${Date.now()}-${Math.random().toString(36).slice(2, 8)}-${safe}`)
    },
  })
  const upload = multer({
    storage,
    limits: { fileSize: Number(process.env.UPLOAD_MAX_BYTES || 25 * 1024 * 1024) },
  })

  router.post('/', upload.single('file'), controller.upload)
} else {
  router.post('/', (_req, res) => res.status(501).json({
    success: false,
    message: 'File upload not available — install multer.',
  }))
}

router.get('/', controller.list)
router.get('/:id/download', validate({ params: idParam }), controller.download)
router.delete('/:id', validate({ params: idParam }), controller.remove)

module.exports = router
