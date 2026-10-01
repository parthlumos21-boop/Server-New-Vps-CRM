const { createCrudRepository } = require('./crudRepositoryFactory')

const base = createCrudRepository({ table: 'support_requests', jsonbColumns: ['data'] })

const bulkUpdate = async (actor, ids, updates = {}) => {
  if (!Array.isArray(ids) || ids.length === 0) return []
  const allowed = ['status', 'priority', 'assignedTo', 'category']
  const fields = Object.keys(updates).filter((key) => allowed.includes(key))
  if (fields.length === 0) return []

  const normalizedUpdates = fields.reduce((nextUpdates, field) => {
    nextUpdates[field] = updates[field]
    return nextUpdates
  }, {})

  const records = []
  for (const id of ids) {
    const existing = await base.findByIdForActor(id, actor, { companyWide: true })
    if (!existing || existing.companyId !== (actor.companyId || 1)) continue
    const updated = await base.update(id, normalizedUpdates)
    if (updated) records.push(updated)
  }
  return records
}

const bulkDelete = async (actor, ids) => {
  if (!Array.isArray(ids) || ids.length === 0) return []
  const removedIds = []
  for (const id of ids) {
    const existing = await base.findByIdForActor(id, actor, { companyWide: true })
    if (!existing || existing.companyId !== (actor.companyId || 1)) continue
    const removed = await base.remove(id)
    if (removed) removedIds.push(id)
  }
  return removedIds
}

module.exports = { ...base, bulkUpdate, bulkDelete }
