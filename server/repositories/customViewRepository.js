const { createCrudRepository } = require('./crudRepositoryFactory')
const { getMongoModel } = require('../models/mongoModels')
const { byLegacyId } = require('./mongoQueryHelpers')

const baseRepository = createCrudRepository({
  table: 'custom_views',
  ownerColumn: 'user_id',
})

const CustomView = getMongoModel('custom_views')

const listForUser = async (actor, entityType) => {
  const filter = {
    companyId: actor.companyId || 1,
    $or: [{ userId: actor.id }, { isShared: true }],
    ...(entityType ? { entityType } : {}),
  }
  const records = await CustomView.find(filter).sort({ isDefault: -1, name: 1 }).lean()
  return records.map(baseRepository.map)
}

const findById = async (id, actor = null) => {
  const filter = actor?.companyId
    ? { ...byLegacyId(id), companyId: actor.companyId }
    : byLegacyId(id)
  return baseRepository.map(await CustomView.findOne(filter).lean())
}

const create = async ({ userId, companyId, entityType, name, columns, filters, sort, isDefault, isShared }) => (
  baseRepository.create({
    userId,
    companyId: companyId || 1,
    entityType,
    name,
    columns: columns || [],
    filters: filters || {},
    sort: sort || {},
    isDefault: Boolean(isDefault),
    isShared: Boolean(isShared),
  })
)

const update = async (id, actor, { name, columns, filters, sort, isDefault, isShared }) => {
  const updates = {}
  if (name !== undefined) updates.name = name
  if (columns !== undefined) updates.columns = columns
  if (filters !== undefined) updates.filters = filters
  if (sort !== undefined) updates.sort = sort
  if (isDefault !== undefined) updates.isDefault = isDefault
  if (isShared !== undefined) updates.isShared = isShared

  const record = await CustomView.findOneAndUpdate(
    { ...byLegacyId(id), companyId: actor.companyId || 1 },
    { $set: updates },
    { new: true }
  ).lean()

  return baseRepository.map(record)
}

const remove = async (id, actor) => {
  const record = await CustomView.findOneAndDelete({ ...byLegacyId(id), companyId: actor.companyId || 1 }).lean()
  return record ? { id: record.legacyId ?? record.id } : null
}

module.exports = { listForUser, findById, create, update, remove }
