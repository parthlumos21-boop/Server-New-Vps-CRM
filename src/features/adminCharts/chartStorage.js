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

export const fetchAllChartsFromDb = async () => {
  try {
    const dbTemplates = await chartApi.listTemplates()
    const categorized = createEmptyChartBuckets()

    const addChartToCategory = (chart) => {
      const category = mapContextToCategory(chart.entity || chart.context)
      if (category && categorized[category]) {
        const id = chart._id || chart.id
        if (categorized[category].some((entry) => String(entry.id) === String(id))) return
        categorized[category].push({
          ...chart,
          id,
          source: 'template',
          title: chart.title || chart.name || 'Untitled Chart',
          chartType: chart.chartType || chart.type || 'Pie',
          type: chart.chartType || chart.type || 'Pie',
          active: chart.isActive !== false,
          mobileEnabled: false,
        })
      }
    }

    dbTemplates.forEach((template) => {
      const templateId = template._id || template.id
      addChartToCategory({
        ...template,
        id: templateId,
        title: template.name || template.title,
        type: template.chartType || template.type,
        active: template.isActive !== false,
        mobileEnabled: false,
        classificationField: template.classification?.field,
        classificationOptions: template.classification?.options,
        chartOrderBy: template.classification?.orderBy,
        timeFilterEnabled: template.defaultFilters?.timeFilter?.enabled,
        timeFilterField: template.defaultFilters?.timeFilter?.field,
        timeFilterPeriod: template.defaultFilters?.timeFilter?.period,
        filterRows: template.defaultFilters?.criteria || [],
        selectedFieldKeys: template.defaultView?.selectedFieldKeys || [],
        orderByEnabled: template.defaultView?.orderByEnabled,
        orderByField: template.defaultView?.orderByField,
      })
    })

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

