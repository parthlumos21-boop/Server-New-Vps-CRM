const { createCrudRepository } = require('./crudRepositoryFactory')
module.exports = createCrudRepository({ table: 'calendar_events', jsonbColumns: ['data'], defaultOrder: 'start_at ASC, id ASC' })
