const emailTemplateService = require('../services/emailTemplateService')
const { DEFAULT_COMPANY_SIGNATURE } = require('../constants/defaultSignature')

class EmailTemplateController {
  async list(req, res, next) {
    try {
      res.json({ success: true, data: await emailTemplateService.list(req.user, req.query) })
    } catch (error) {
      next(error)
    }
  }

  async available(req, res, next) {
    try {
      res.json({ success: true, data: await emailTemplateService.listAvailable(req.user, req.query) })
    } catch (error) {
      next(error)
    }
  }

  async get(req, res, next) {
    try {
      res.json({ success: true, data: await emailTemplateService.get(req.user, req.params.id) })
    } catch (error) {
      next(error)
    }
  }

  async create(req, res, next) {
    try {
      res.status(201).json({ success: true, data: await emailTemplateService.create(req.user, req.body) })
    } catch (error) {
      next(error)
    }
  }

  async update(req, res, next) {
    try {
      res.json({ success: true, data: await emailTemplateService.update(req.user, req.params.id, req.body) })
    } catch (error) {
      next(error)
    }
  }

  async updateStatus(req, res, next) {
    try {
      res.json({ success: true, data: await emailTemplateService.updateStatus(req.user, req.params.id, req.body) })
    } catch (error) {
      next(error)
    }
  }

  async remove(req, res, next) {
    try {
      res.json({ success: true, data: await emailTemplateService.remove(req.user, req.params.id) })
    } catch (error) {
      next(error)
    }
  }

  async variables(req, res, next) {
    try {
      res.json({ success: true, data: await emailTemplateService.variables() })
    } catch (error) {
      next(error)
    }
  }

  async settings(req, res, next) {
    try {
      res.json({ success: true, data: await emailTemplateService.getSettings(req.user) })
    } catch (error) {
      next(error)
    }
  }

  async uploadSignature(req, res, next) {
    try {
      res.json({ success: true, data: await emailTemplateService.saveSignatureImage(req.user, req.body) })
    } catch (error) {
      next(error)
    }
  }

  async resolve(req, res, next) {
    try {
      res.json({ success: true, data: await emailTemplateService.resolve(req.user, req.body) })
    } catch (error) {
      next(error)
    }
  }

  async getPublicSignatureImage(req, res, next) {
    try {
      const { getMongoModel } = require('../models/mongoModels')
      const EmailSetting = getMongoModel('email_settings')
      const EmailTemplate = getMongoModel('email_templates')

      let signatureImage = null
      const templateId = req.params.id
      if (templateId) {
        try {
          const mongoose = require('mongoose')
          if (mongoose.Types.ObjectId.isValid(templateId)) {
            const template = await EmailTemplate.findOne({ _id: new mongoose.Types.ObjectId(templateId), deletedAt: null }).lean()
            signatureImage = template?.signatureImage
          }
        } catch (_) {}
      }

      if (!signatureImage) {
        const settings = await EmailSetting.findOne().lean()
        signatureImage = settings?.signature?.images?.[0]
      }

      if (!signatureImage || !signatureImage.contentBytes) {
        signatureImage = DEFAULT_COMPANY_SIGNATURE
      }

      if (!signatureImage || !signatureImage.contentBytes) {
        return res.status(404).send('Signature image not found')
      }

      const cleanBase64 = String(signatureImage.contentBytes).replace(/^data:[^;]+;base64,/, '')
      const imgBuffer = Buffer.from(cleanBase64, 'base64')

      res.set('Content-Type', signatureImage.contentType || 'image/png')
      res.set('Cache-Control', 'public, max-age=31536000, immutable')
      res.set('Access-Control-Allow-Origin', '*')
      return res.send(imgBuffer)
    } catch (error) {
      next(error)
    }
  }
}

module.exports = new EmailTemplateController()

