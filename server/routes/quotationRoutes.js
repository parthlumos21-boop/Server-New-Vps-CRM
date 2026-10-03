const express = require('express')
const fs = require('fs')
const path = require('path')
const quotationController = require('../controllers/quotationController')
const { requireAuth } = require('../middleware/authMiddleware')
const { validate } = require('../middleware/validate')
const { idParam, quotation } = require('../validation/schemas')
const storageService = require('../services/storageService')

const tryRequire = (name) => { try { return require(name) } catch (_) { return null } }
const multer = tryRequire('multer')

const router = express.Router()
let uploadQuotationAttachment = null

if (multer) {
  const storage = multer.diskStorage({
    destination: (_req, _file, cb) => {
      const targetDir = path.join(storageService.getUploadsDir(), 'quotations')
      fs.mkdirSync(targetDir, { recursive: true })
      cb(null, targetDir)
    },
    filename: (_req, file, cb) => {
      const safe = file.originalname.replace(/[^a-zA-Z0-9._-]/g, '_')
      cb(null, `${Date.now()}-${Math.random().toString(36).slice(2, 8)}-${safe}`)
    },
  })
  uploadQuotationAttachment = multer({
    storage,
    limits: { fileSize: Number(process.env.UPLOAD_MAX_BYTES || 25 * 1024 * 1024) },
  })
}

router.use(requireAuth)
router.get('/', quotationController.list)
router.patch('/:id/frontend-delete', validate({ params: idParam }), quotationController.frontendDelete)
router.get('/context-details', quotationController.getContextDetails)
router.get('/:id/attachment/view', validate({ params: idParam }), quotationController.viewAttachment)
router.get('/:id/revisions/:revisionCode/attachment/view', quotationController.viewAttachment)
if (uploadQuotationAttachment) {
  router.post('/:id/attachment', validate({ params: idParam }), uploadQuotationAttachment.single('file'), quotationController.uploadAttachment)
} else {
  router.post('/:id/attachment', validate({ params: idParam }), (_req, res) => res.status(501).json({
    success: false,
    message: 'File upload not available - install multer.',
  }))
}
router.get('/:id', validate({ params: idParam }), quotationController.getById)
router.post('/', validate({ body: quotation }), quotationController.create)
router.post('/:id/approve', validate({ params: idParam }), quotationController.approve)
router.patch('/:id/approve', validate({ params: idParam }), quotationController.approve)
router.put('/:id', validate({ params: idParam, body: quotation }), quotationController.update)
router.patch('/:id', validate({ params: idParam, body: quotation }), quotationController.update)
router.delete('/:id', validate({ params: idParam }), quotationController.remove)

module.exports = router
