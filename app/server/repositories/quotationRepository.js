const { createCrudRepository } = require('./crudRepositoryFactory')
module.exports = createCrudRepository({ table: 'quotations', jsonbColumns: ['line_items', 'data'] })
