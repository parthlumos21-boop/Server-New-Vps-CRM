const { createCrudRouter } = require('./crudRouteFactory')
module.exports = createCrudRouter(require('../controllers/reminderController'))
