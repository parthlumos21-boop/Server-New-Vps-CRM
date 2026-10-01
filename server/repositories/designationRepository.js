const { createCrudRepository } = require('./crudRepositoryFactory')
module.exports = createCrudRepository({
  table: 'designations',
  defaultOrder: 'name ASC',
})
