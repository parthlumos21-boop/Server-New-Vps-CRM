import { ADMIN_CHART_CATEGORIES } from './chartDefinitions'
import { chartApi } from '../../services/chartApi'

export const mapContextToCategory = (context) => {
  if (!context) return null
  const norm = String(context).toLowerCase().trim()
  if (norm === 'account' || norm === 'accounts' || norm === 'leads') return 'Accounts'
  if (norm === 'customer' || norm === 'customers') return 'Customers'
  if (norm === 'sr' || norm === 'supportrequest' || norm === 'support_request') return 'SR'
  if (norm === 'deal' || norm === 'deals') return 'Deals'
  if (norm === 'quotation' || norm === 'quotations') return 'Quotations'
  return null
}

const createEmptyChartBuckets = () => Object.fromEntries(ADMIN_CHART_CATEGORIES.map((category) => [category, []]))

export const loadAllCharts = () => {
  return createEmptyChartBuckets()
}

const getChartRecordId = (chart) => chart?._id || chart?.id || chart?.templateKey || ''

const normalizeChartRecord = (chart, source = 'chart') => {
  const id = getChartRecordId(chart)
  const templateId = chart?.templateId ? String(chart.templateId) : null
  const templateKey = chart?.templateKey ? String(chart.templateKey) : null
  const entityContext = chart?.entity || chart?.context || chart?.crmSection || chart?.section || chart?.entityType || chart?.module
  const classification = chart?.classification || {}
  const defaultFilters = chart?.defaultFilters || {}
  const defaultView = chart?.defaultView || {}
  const filters = chart?.filters || {}
  const view = chart?.view || {}

  return {
    ...chart,
    id,
    templateId,
    templateKey,
    source,
    title: chart?.title || chart?.name || 'Untitled Chart',
    name: chart?.name || chart?.title || 'Untitled Chart',
    chartType: chart?.chartType || chart?.type || 'Pie',
    type: chart?.type || chart?.chartType || 'Pie',
    entity: entityContext,
    context: entityContext,
    active: chart?.isActive !== false && chart?.active !== false,
    mobileEnabled: Boolean(chart?.mobileEnabled),
    classificationField: chart?.classificationField || classification.field,
    classificationOptions: chart?.classificationOptions || classification.options,
    chartOrderBy: chart?.chartOrderBy || classification.orderBy || 'Count',
    timeFilterEnabled: chart?.timeFilterEnabled ?? defaultFilters.timeFilter?.enabled ?? filters.timeFilter?.enabled,
    timeFilterField: chart?.timeFilterField || defaultFilters.timeFilter?.field || filters.timeFilter?.field,
    timeFilterPeriod: chart?.timeFilterPeriod || defaultFilters.timeFilter?.period || filters.timeFilter?.period,
    filterRows: chart?.filterRows || defaultFilters.criteria || filters.criteria || [],
    selectedFieldKeys: chart?.selectedFieldKeys || defaultView.selectedFieldKeys || view.selectedFieldKeys || [],
    orderByEnabled: chart?.orderByEnabled ?? defaultView.orderByEnabled ?? view.orderByEnabled,
    orderByField: chart?.orderByField || defaultView.orderByField || view.orderByField,
  }
}

const recordsMatch = (existing, item) => {
  const itemId = String(item.id || item._id || '')
  const existingId = String(existing.id || existing._id || '')
  const itemTemplateId = item.templateId ? String(item.templateId) : null
  const existingTemplateId = existing.templateId ? String(existing.templateId) : null
  const itemTemplateKey = item.templateKey ? String(item.templateKey) : null
  const existingTemplateKey = existing.templateKey ? String(existing.templateKey) : null

  return (
    (itemId && itemId === existingId) ||
    (itemTemplateId && (itemTemplateId === existingId || itemTemplateId === existingTemplateId)) ||
    (existingTemplateId && (existingTemplateId === itemId || existingTemplateId === itemTemplateId)) ||
    (itemTemplateKey && existingTemplateKey && itemTemplateKey === existingTemplateKey)
  )
}

export const fetchAllChartsFromDb = async () => {
  try {
    const [dbTemplates, dbCharts] = await Promise.all([
      chartApi.listTemplates().catch(() => []),
      chartApi.listCharts().catch(() => []),
    ])
    const categorized = createEmptyChartBuckets()

    const addChartToCategory = (chart, source) => {
      const normalizedItem = normalizeChartRecord(chart, source)
      const entityContext = normalizedItem.entity || normalizedItem.context
      const category = mapContextToCategory(entityContext)
      if (category && categorized[category]) {
        const existingIndex = categorized[category].findIndex((entry) => recordsMatch(entry, normalizedItem))

        if (existingIndex >= 0) {
          const existingItem = categorized[category][existingIndex]
          categorized[category][existingIndex] = {
            ...existingItem,
            ...normalizedItem,
            source: existingItem.source === 'template' ? 'template' : normalizedItem.source,
          }
        } else {
          categorized[category].push(normalizedItem)
        }
      }
    }

    ;(Array.isArray(dbTemplates) ? dbTemplates : []).forEach((template) => addChartToCategory(template, 'template'))
    ;(Array.isArray(dbCharts) ? dbCharts : []).forEach((chart) => addChartToCategory(chart, 'chart'))

    return categorized
  } catch (error) {
    console.warn('Unable to load chart templates from backend API:', error)
    return loadAllCharts()
  }
}

export const saveUserChartToDb = async (category, chart) => {
  try {
    const created = await chartApi.createChart(chart)
    return created
  } catch (error) {
    console.error('Failed to save chart to MongoDB backend:', error)
    return chart
  }
}

export const appendUserChart = () => {}

