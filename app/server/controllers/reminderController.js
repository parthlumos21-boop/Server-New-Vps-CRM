const { createCrudController } = require('./crudControllerFactory')
module.exports = createCrudController(require('../services/reminderService'))
