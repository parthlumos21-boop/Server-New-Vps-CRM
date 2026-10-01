const { createCrudRouter } = require('./crudRouteFactory')
const controller = require('../controllers/supportRequestController')

module.exports = createCrudRouter(controller, {
  extraRoutes: (router) => {
    router.post('/bulk/update', controller.bulkUpdate)
    router.post('/bulk/delete', controller.bulkDelete)
  },
})
