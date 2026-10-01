const { getMongoModel, getNextLegacyId } = require('../models/mongoModels')
const { mapMongoDocument, mapSqlLikeRow, normalizeMongoValue, camelToSnake, snakeToCamel } = require('../utils/mongoRecordMapper')
const { byLegacyId, buildScopedMongoFilter, mergeFilters, sortFromOrder } = require('./mongoQueryHelpers')

const mapRow = (row, jsonbColumns = []) => mapSqlLikeRow(row, jsonbColumns)

const preparePayload = async (collectionName, payload = {}) => {
  const normalizedPayload = normalizeMongoValue(payload)
  delete normalizedPayload.id
  delete normalizedPayload._id

  if (normalizedPayload.legacyId === undefined || normalizedPayload.legacyId === null) {
    normalizedPayload.legacyId = await getNextLegacyId(collectionName)
  }

  return normalizedPayload
}

const createCrudRepository = ({
  table,
  collection = table,
  ownerColumn = 'assigned_to',
  creatorColumn = 'created_by',
  companyColumn = 'company_id',
  defaultOrder = 'updated_at DESC, id DESC',
}) => {
  const collectionName = collection || table
  const Model = getMongoModel(collectionName)
  const defaultSort = sortFromOrder(defaultOrder)
  const scopedOwnerColumns = Array.from(new Set([
    'ownerUserId',
    'owner_user_id',
    ownerColumn,
    creatorColumn,
  ].filter(Boolean)))

  const map = (document) => mapMongoDocument(document)

  const listAll = async () => {
    const records = await Model.find({}).sort(defaultSort).lean()
    return records.map(map)
  }

  const listForUser = async (userId) => {
    const filter = buildScopedMongoFilter({
      actor: { id: userId, role: 'user' },
      ownerFields: scopedOwnerColumns,
      companyWide: false,
    })
    const records = await Model.find(filter).sort(defaultSort).lean()
    return records.map(map)
  }

  const findById = async (id) => {
    const record = await Model.findOne(byLegacyId(id)).lean()
    return map(record)
  }

  const listForActor = async (actor, { companyWide = false, scopeUserIds = null } = {}) => {
    const filter = buildScopedMongoFilter({
      actor,
      companyField: companyColumn,
      ownerFields: scopedOwnerColumns,
      companyWide,
      scopeUserIds,
    })
    const records = await Model.find(filter).sort(defaultSort).lean()
    return records.map(map)
  }

  const findByIdForActor = async (id, actor, { companyWide = false, scopeUserIds = null } = {}) => {
    const filter = mergeFilters(
      byLegacyId(id),
      buildScopedMongoFilter({
        actor,
        companyField: companyColumn,
        ownerFields: scopedOwnerColumns,
        companyWide,
        scopeUserIds,
      })
    )
    const record = await Model.findOne(filter).lean()
    return map(record)
  }

  const create = async (payload) => {
    const record = await Model.create(await preparePayload(collectionName, payload))
    return map(record)
  }

  const update = async (id, payload) => {
    const normalizedPayload = normalizeMongoValue({ ...payload })
    delete normalizedPayload.id
    delete normalizedPayload._id
    delete normalizedPayload.legacyId

    const record = await Model.findOneAndUpdate(
      byLegacyId(id),
      { $set: normalizedPayload },
      { new: true, runValidators: true }
    ).lean()
    return map(record)
  }

  const remove = async (id) => {
    const record = await Model.findOneAndDelete(byLegacyId(id)).lean()
    return record ? { id: record.legacyId ?? record.id } : null
  }

  return {
    listAll,
    listForUser,
    listForActor,
    findById,
    findByIdForActor,
    create,
    update,
    remove,
    map,
    table: collectionName,
    model: Model,
  }
}

module.exports = {
  createCrudRepository,
  mapRow,
  camelToSnake,
  snakeToCamel,
  serializeJsonbValue: (column, value) => {
    const fallback = ['line_items', 'lineItems'].includes(column) ? '[]' : '{}'
    if (value === null || value === undefined || value === '') return fallback
    if (typeof value === 'string') {
      try {
        JSON.parse(value)
        return value
      } catch (_error) {
        return fallback
      }
    }
    return JSON.stringify(value)
  },
}
