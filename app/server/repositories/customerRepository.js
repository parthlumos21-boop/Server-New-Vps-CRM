const { createCrudRepository } = require('./crudRepositoryFactory')
module.exports = createCrudRepository({ table: 'customers', jsonbColumns: ['data'] })
