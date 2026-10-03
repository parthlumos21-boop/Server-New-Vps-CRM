const fs = require('fs')
const path = require('path')
const { createCrudController } = require('./crudControllerFactory')
const quotationService = require('../services/quotationService')
const storageService = require('../services/storageService')
const crudController = createCrudController(quotationService)

module.exports = {
  ...crudController,
  getContextDetails: async (req, res, next) => {
    try {
      const result = await quotationService.getQuotationContextDetails(req.user, req.query)
      res.status(200).json({
        success: true,
        data: result,
      })
    } catch (error) {
      next(error)
    }
  },
  approve: async (req, res, next) => {
    try {
      const result = await quotationService.approveQuotation(req.user, req.params.id, req.body)
      res.status(200).json({
        success: true,
        data: result,
        message: 'Quotation approved successfully.',
      })
    } catch (error) {
      next(error)
    }
  },
  uploadAttachment: async (req, res, next) => {
    try {
      if (req.file?.path) {
        req.file.storagePath = path.relative(storageService.getUploadsDir(), req.file.path)
      }
      const result = await quotationService.saveQuotationAttachment(req.user, req.params.id, req.file, req.body || {})
      res.status(201).json({
        success: true,
        data: result,
        message: 'Quotation attachment uploaded successfully.',
      })
    } catch (error) {
      next(error)
    }
  },
  viewAttachment: async (req, res, next) => {
    try {
      const attachment = await quotationService.getQuotationAttachmentForView(req.user, req.params.id, req.params.revisionCode)
      const fullPath = storageService.resolveStoredPath(attachment.storagePath)
      if (!fullPath || !fs.existsSync(fullPath)) {
        const error = new Error('Quotation attachment file is missing on disk.')
        error.statusCode = 410
        throw error
      }

      const fileName = attachment.fileName || path.basename(fullPath)
      const contentType = attachment.fileType || (fileName.toLowerCase().endsWith('.pdf') ? 'application/pdf' : 'application/octet-stream')
      res.setHeader('Content-Type', contentType)
      res.setHeader('Content-Disposition', `inline; filename="${String(fileName).replace(/"/g, '')}"`)
      res.sendFile(fullPath)
    } catch (error) {
      next(error)
    }
  },
}
