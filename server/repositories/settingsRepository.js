const { createCrudRepository } = require('./crudRepositoryFactory')
const { getMongoModel } = require('../models/mongoModels')

const baseRepository = createCrudRepository({
  table: 'settings',
  collection: 'app_settings',
})

const Setting = getMongoModel('app_settings')

const mapSetting = (record) => baseRepository.map(record)

const scopeFilter = (scope, scopeId, key = null) => ({
  scope,
  scopeId: scopeId || null,
  ...(key ? { key } : {}),
})

const list = async (scope, scopeId) => {
  const records = await Setting.find(scopeFilter(scope, scopeId)).sort({ key: 1 }).lean()
  return records.map(mapSetting)
}

const getOne = async (scope, scopeId, key) => {
  const record = await Setting.findOne(scopeFilter(scope, scopeId, key)).lean()
  return mapSetting(record)
}

const upsert = async (scope, scopeId, key, value) => {
  const existing = await Setting.findOne(scopeFilter(scope, scopeId, key)).lean()
  const record = existing
    ? await Setting.findOneAndUpdate(
        scopeFilter(scope, scopeId, key),
        { $set: { value, updatedAt: new Date() } },
        { new: true }
      ).lean()
    : await baseRepository.create({
        scope,
        scopeId: scopeId || null,
        key,
        value,
        updatedAt: new Date(),
      })

  return mapSetting(record)
}

const remove = async (scope, scopeId, key) => {
  const record = await Setting.findOneAndDelete(scopeFilter(scope, scopeId, key)).lean()
  return record ? { id: record.legacyId ?? record.id } : null
}

module.exports = { list, getOne, upsert, remove }
