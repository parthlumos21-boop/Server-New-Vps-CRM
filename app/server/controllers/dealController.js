const { createCrudController } = require('./crudControllerFactory')
const dealService = require('../services/dealService')

const controller = createCrudController(dealService)

const getConvertedFromAccount = async (req, res, next) => {
  try {
    const data = await dealService.getConvertedFromAccount(req.user, req.params.accountId)
    res.json({ success: true, data })
  } catch (error) {
    next(error)
  }
}

module.exports = {
  ...controller,
  getConvertedFromAccount,
}
