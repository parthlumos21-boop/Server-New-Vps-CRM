const { createCrudRouter } = require('./crudRouteFactory')
const controller = require('../controllers/supportRequestController')

module.exports = createCrudRouter(controller, {
  extraRoutes: (router) => {
    router.post('/bulk/update', controller.bulkUpdate)
    router.post('/bulk/delete', controller.bulkDelete)
    router.get('/todo/replies', controller.getTodoReplies)
    router.post('/:id/reply', controller.addReply)
    router.get('/:id/replies', controller.getReplies)
    router.post('/:id/close', controller.closeTicket)
  },
})
