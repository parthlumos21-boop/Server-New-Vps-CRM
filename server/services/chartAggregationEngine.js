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

const buildTimeFilterMatch = (timeFilter = {}) => {
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
    case 'this month':
    case 'month':
      startDate = new Date(now.getFullYear(), now.getMonth(), 1)
      break
    case 'last month':
      startDate = new Date(now.getFullYear(), now.getMonth() - 1, 1)
      endDate = new Date(now.getFullYear(), now.getMonth(), 0)
      break
    case 'this year':
      startDate = new Date(now.getFullYear(), 0, 1)
      break
    case 'last year':
      startDate = new Date(now.getFullYear() - 1, 0, 1)
      endDate = new Date(now.getFullYear() - 1, 11, 31)
      break
    default:
      return null
  }

  return { $gte: startDate, $lte: endDate }
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
    const timeMatch = buildTimeFilterMatch({ enabled: true, period: effectivePeriod })
    if (timeMatch) {
      const fieldPath = mapFieldKeyToDbPath(entity, chartConfig.filters?.timeFilter?.field || 'createdAt')
      matchStage[fieldPath] = timeMatch
    }
  }

  if (Array.isArray(chartConfig.filters?.criteria)) {
    chartConfig.filters.criteria.forEach((row) => {
      if (row.fieldKey && row.value) {
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
  const rawClassificationField = chartConfig.classification?.field || 'status'
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
