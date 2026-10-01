const { createCrudController } = require('./crudControllerFactory')
const quotationService = require('../services/quotationService')
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
}
