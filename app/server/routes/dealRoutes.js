const { createCrudRouter } = require('./crudRouteFactory')
const controller = require('../controllers/dealController')

module.exports = createCrudRouter(controller, {
  extraRoutes: (router) => {
    router.get('/converted-from-account/:accountId', controller.getConvertedFromAccount)
  },
})
