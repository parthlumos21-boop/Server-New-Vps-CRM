const { createCrudController } = require('./crudControllerFactory')
const quotationService = require('../services/quotationService')
const crudController = createCrudController(quotationService)

module.exports = {
  ...crudController,
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
}
