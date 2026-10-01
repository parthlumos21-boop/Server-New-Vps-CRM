const { createCrudRepository } = require('./crudRepositoryFactory')
module.exports = createCrudRepository({ table: 'reminders', jsonbColumns: ['data'], defaultOrder: 'remind_at ASC, id DESC' })
