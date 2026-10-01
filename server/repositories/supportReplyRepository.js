const { createCrudRepository } = require('./crudRepositoryFactory')

const base = createCrudRepository({ table: 'support_replies' })

module.exports = { ...base }
