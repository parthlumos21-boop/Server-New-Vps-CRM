const { createCrudRepository } = require('./crudRepositoryFactory')
module.exports = createCrudRepository({
  table: 'job_plannings',
  defaultOrder: 'jobNo DESC',
})
