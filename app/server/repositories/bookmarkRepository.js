const { createCrudRepository } = require('./crudRepositoryFactory')
const { getMongoModel } = require('../models/mongoModels')
const { byLegacyId } = require('./mongoQueryHelpers')

const baseRepository = createCrudRepository({
  table: 'bookmarks',
  ownerColumn: 'user_id',
})

const Bookmark = getMongoModel('bookmarks')

const listForUser = async (userId) => {
  const records = await Bookmark.find({ userId }).sort({ position: 1, legacyId: 1 }).lean()
  return records.map(baseRepository.map)
}

const findById = async (id) => baseRepository.map(await Bookmark.findOne(byLegacyId(id)).lean())

const create = async ({ userId, label, targetPath, icon, position }) => (
  baseRepository.create({ userId, label, targetPath, icon: icon || null, position: position || 0 })
)

const update = async (id, { label, targetPath, icon, position }) => {
  const updates = {}
  if (label !== undefined) updates.label = label
  if (targetPath !== undefined) updates.targetPath = targetPath
  if (icon !== undefined) updates.icon = icon
  if (position !== undefined) updates.position = position

  return baseRepository.update(id, updates)
}

const remove = async (id) => baseRepository.remove(id)

module.exports = { listForUser, findById, create, update, remove }
