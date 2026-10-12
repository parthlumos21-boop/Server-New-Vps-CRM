const emailTemplateService = require('../services/emailTemplateService')

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
}

module.exports = new EmailTemplateController()
