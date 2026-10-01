const { Types } = require('mongoose')

const camelToSnake = (value) => String(value || '').replace(/([A-Z])/g, '_$1').toLowerCase()

const snakeToCamel = (value) => String(value || '').replace(/_([a-z])/g, (_, char) => char.toUpperCase())

const isPlainObject = (value) => (
  value
  && typeof value === 'object'
  && !Array.isArray(value)
  && !(value instanceof Date)
  && !(value instanceof Types.ObjectId)
)

const normalizeMongoValue = (value) => {
  if (Array.isArray(value)) {
    return value.map(normalizeMongoValue)
  }

  if (isPlainObject(value)) {
    return Object.entries(value).reduce((nextValue, [key, entry]) => {
      if (entry === undefined) return nextValue
      nextValue[key] = normalizeMongoValue(entry)
      return nextValue
    }, {})
  }

  return value
}

const toPlainDocument = (document) => {
  if (!document) return null
  if (typeof document.toObject === 'function') {
    return document.toObject({ depopulate: true, versionKey: false })
  }
  return { ...document }
}

const mapMongoDocument = (document) => {
  const plainDocument = toPlainDocument(document)
  if (!plainDocument) return null

  const { _id, __v, ...rest } = plainDocument
  const legacyId = rest.legacyId ?? rest.id

  return {
    ...rest,
    id: legacyId ?? String(_id),
    legacyId,
    mongoId: String(_id),
  }
}

const mapSqlLikeRow = (row, jsonColumns = []) => {
  if (!row) return null
  const jsonColumnSet = new Set(jsonColumns)

  return Object.entries(row).reduce((result, [key, value]) => {
    const camelKey = snakeToCamel(key)
    result[camelKey] = jsonColumnSet.has(key) && value && typeof value === 'string'
      ? JSON.parse(value)
      : value
    return result
  }, {})
}

module.exports = {
  camelToSnake,
  snakeToCamel,
  normalizeMongoValue,
  mapMongoDocument,
  mapSqlLikeRow,
}
