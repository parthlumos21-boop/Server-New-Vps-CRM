const { createCrudRepository } = require('./crudRepositoryFactory')
module.exports = createCrudRepository({
  table: 'departments',
  defaultOrder: 'name ASC',
})
