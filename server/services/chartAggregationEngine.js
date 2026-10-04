const mongoose = require('mongoose')

const getCollectionForEntity = (entity) => {
  const normalized = String(entity || '').toLowerCase().trim()
  switch (normalized) {
    case 'account':
      return 'leads'
    case 'customer':
      return 'customers'
    case 'sr':
    case 'supportrequest':
    case 'support_request':
      return 'support_requests'
    case 'deal':
      return 'deals'
    case 'quotation':
    case 'quotations':
      return 'quotations'
    default:
      return 'leads'
  }
}

const mapFieldKeyToDbPath = (entity, fieldKey) => {
  const key = String(fieldKey || '').toLowerCase().trim()

  if (entity.toLowerCase() === 'account') {
    if (key.includes('category')) return 'accountCategory'
    if (key.includes('owner')) return 'accountOwner'
    if (key.includes('status')) return 'status'
    if (key.includes('type')) return 'accountType'
    if (key.includes('industry')) return 'industryType'
    if (key.includes('added by') || key.includes('createdby')) return 'createdBy'
    if (key.includes('date')) return 'createdAt'
    return fieldKey
  }

  if (entity.toLowerCase() === 'customer') {
    if (key.includes('category')) return 'customerCategory'
    if (key.includes('owner')) return 'customerOwner'
    if (key.includes('status')) return 'status'
    if (key.includes('type')) return 'customerType'
    if (key.includes('product')) return 'productCategory'
    if (key.includes('industry')) return 'industryType'
    if (key.includes('added by') || key.includes('createdby')) return 'createdBy'
    if (key.includes('date')) return 'createdAt'
    return fieldKey
  }

  if (entity.toLowerCase() === 'sr' || entity.toLowerCase() === 'supportrequest') {
    if (key.includes('type')) return 'requestType'
    if (key.includes('owner')) return 'owner'
    if (key.includes('status')) return 'status'
    if (key.includes('warranty')) return 'underWarranty'
    if (key.includes('added by') || key.includes('createdby')) return 'createdBy'
    if (key.includes('date')) return 'createdAt'
    return fieldKey
  }

  if (entity.toLowerCase() === 'deal') {
    if (key.includes('status') || key.includes('stage')) return 'stage'
    if (key.includes('owner')) return 'dealOwner'
    if (key.includes('type')) return 'dealType'
    if (key.includes('consultant')) return 'consultantName'
    if (key.includes('added by') || key.includes('createdby')) return 'createdBy'
    if (key.includes('date')) return 'createdAt'
    return fieldKey
  }

  if (entity.toLowerCase() === 'quotation' || entity.toLowerCase() === 'quotations') {
    if (key.includes('status')) return 'status'
    if (key.includes('owner')) return 'quotationOwner'
    if (key.includes('type')) return 'quotationType'
    if (key.includes('added by') || key.includes('createdby')) return 'createdBy'
    if (key.includes('date')) return 'createdAt'
    return fieldKey
  }

  return fieldKey
}

const normalizeDateBoundary = (value, endOfDay = false) => {
  if (!value) return null
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return null
  if (endOfDay) {
    date.setHours(23, 59, 59, 999)
  } else {
    date.setHours(0, 0, 0, 0)
  }
  return date
}

const buildTimeFilterRange = (timeFilter = {}) => {
  if (!timeFilter?.enabled || !timeFilter?.period) return null

  const now = new Date()
  let startDate = null
  let endDate = new Date()

  switch (String(timeFilter.period).toLowerCase().trim()) {
    case 'today':
    case 'day':
      startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate())
      break
    case 'yesterday':
      startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1)
      endDate = new Date(now.getFullYear(), now.getMonth(), now.getDate())
      break
    case 'this week':
    case 'week': {
      const dayOfWeek = now.getDay()
      startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() - dayOfWeek)
      break
    }
    case 'last week': {
      const dayOfWeek = now.getDay()
      endDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() - dayOfWeek, 0, 0, 0, -1)
      startDate = new Date(endDate.getFullYear(), endDate.getMonth(), endDate.getDate() - 7)
      break
    }
    case 'this month':
    case 'month':
      startDate = new Date(now.getFullYear(), now.getMonth(), 1)
      break
    case 'last month':
      startDate = new Date(now.getFullYear(), now.getMonth() - 1, 1)
      endDate = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, -1)
      break
    case 'last 90 days':
      startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 90)
      break
    case 'this year':
      startDate = new Date(now.getFullYear(), 0, 1)
      break
    case 'last year':
      startDate = new Date(now.getFullYear() - 1, 0, 1)
      endDate = new Date(now.getFullYear(), 0, 1, 0, 0, 0, -1)
      break
    case 'between':
      startDate = normalizeDateBoundary(timeFilter.startDate || timeFilter.fromDate || timeFilter.from)
      endDate = normalizeDateBoundary(timeFilter.endDate || timeFilter.toDate || timeFilter.to, true)
      break
    default:
      return null
  }

  if (!startDate || !endDate) return null
  startDate.setHours(0, 0, 0, 0)

  return { startDate, endDate }
}

const buildDateRangeExpr = (fieldPath, range) => {
  if (!fieldPath || !range?.startDate || !range?.endDate) return null
  const dateValue = {
    $convert: {
      input: `$${fieldPath}`,
      to: 'date',
      onError: null,
      onNull: null,
    },
  }

  return {
    $and: [
      { $gte: [dateValue, range.startDate] },
      { $lte: [dateValue, range.endDate] },
    ],
  }
}

const computeChartAggregation = async (chartConfig, options = {}) => {
  const entity = chartConfig.entity || 'Account'
  const collectionName = getCollectionForEntity(entity)
  const db = mongoose.connection.db
  if (!db) {
    throw new Error('Database connection unavailable.')
  }

  const collection = db.collection(collectionName)

  // 1. Build $match stage
  const matchStage = {}

  // Override period from options if passed (e.g. from Dashboard period select)
  const effectivePeriod = options.period || chartConfig.filters?.timeFilter?.period
  if (options.period || chartConfig.filters?.timeFilter?.enabled) {
    const timeRange = buildTimeFilterRange({ ...chartConfig.filters?.timeFilter, enabled: true, period: effectivePeriod })
    if (timeRange) {
      const fieldPath = mapFieldKeyToDbPath(entity, chartConfig.filters?.timeFilter?.field || 'createdAt')
      const dateRangeExpr = buildDateRangeExpr(fieldPath, timeRange)
      if (dateRangeExpr) {
        matchStage.$expr = dateRangeExpr
      }
    }
  }

  const criteria = chartConfig.filters?.criteria || chartConfig.defaultFilters?.criteria
  if (Array.isArray(criteria)) {
    criteria.forEach((row) => {
      if (row && row.fieldKey && row.value !== null && row.value !== undefined && row.value !== '') {
        const fieldPath = mapFieldKeyToDbPath(entity, row.fieldKey)
        if (row.negated) {
          matchStage[fieldPath] = { $ne: row.value }
        } else {
          matchStage[fieldPath] = row.value
        }
      }
    })
  }

  // 2. Build $group stage
  const selectedFields = chartConfig.defaultView?.selectedFieldKeys || chartConfig.selectedFieldKeys
  const fallbackField = Array.isArray(selectedFields) && selectedFields.length > 0 ? selectedFields[0] : 'status'
  const rawClassificationField =
    chartConfig.classification?.field ||
    chartConfig.groupBy ||
    chartConfig.fieldKey ||
    fallbackField ||
    'status'
  const groupFieldPath = mapFieldKeyToDbPath(entity, rawClassificationField)
  const aggType = String(chartConfig.aggregation || 'Count').toLowerCase().trim()
  
  let numericField = '$grandTotal'
  if (entity.toLowerCase() === 'deal') numericField = '$amount'
  if (entity.toLowerCase() === 'quotation') numericField = '$grandTotal'

  let groupMetric = { $sum: 1 }
  if (aggType === 'sum') {
    groupMetric = { $sum: numericField }
  } else if (aggType === 'average' || aggType === 'avg') {
    groupMetric = { $avg: numericField }
  }

  const groupStage = {
    _id: `$${groupFieldPath}`,
    count: groupMetric,
  }

  // 3. Execute aggregation
  const pipeline = []
  if (Object.keys(matchStage).length > 0) {
    pipeline.push({ $match: matchStage })
  }
  pipeline.push({ $group: groupStage })

  const orderBy = String(chartConfig.classification?.orderBy || 'Count').toLowerCase()
  if (orderBy === 'count' || orderBy === 'value') {
    pipeline.push({ $sort: { count: -1 } })
  } else if (orderBy === 'alphabetical') {
    pipeline.push({ $sort: { _id: 1 } })
  } else {
    pipeline.push({ $sort: { count: -1 } })
  }

  const rawResults = await collection.aggregate(pipeline).toArray()

  const labels = rawResults.map((r) => String(r._id || 'Unspecified'))
  const values = rawResults.map((r) => Number(r.count || 0))

  return {
    chartId: chartConfig._id,
    title: chartConfig.title || chartConfig.name,
    chartType: chartConfig.chartType || 'Pie',
    entity,
    collectionName,
    labels,
    values,
    data: rawResults.map((r) => ({ label: String(r._id || 'Unspecified'), value: Number(r.count || 0) })),
  }
}

module.exports = {
  getCollectionForEntity,
  mapFieldKeyToDbPath,
  computeChartAggregation,
}
