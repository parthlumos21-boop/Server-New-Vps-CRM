const { createCrudRepository } = require('./crudRepositoryFactory')
module.exports = createCrudRepository({ table: 'tasks', jsonbColumns: ['data'] })
