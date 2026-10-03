import { ADMIN_CHART_CATEGORIES, ADMIN_CHART_DEFINITIONS } from './chartDefinitions'
import { chartApi } from '../../services/chartApi'

const STORAGE_KEY = 'crm.adminCharts.userCreated'

const CONTEXT_TO_CATEGORY = {
  Account: 'Accounts',
  Customer: 'Customers',
  SR: 'SR',
  Deal: 'Deals',
}

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

const safeParse = (raw) => {
  if (!raw) return {}
  try {
    const parsed = JSON.parse(raw)
    return parsed && typeof parsed === 'object' ? parsed : {}
  } catch {
    return {}
  }
}

export const readUserCharts = () => {
  if (typeof window === 'undefined') return {}
  return safeParse(window.localStorage.getItem(STORAGE_KEY))
}

export const writeUserCharts = (data) => {
  if (typeof window === 'undefined') return
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(data))
}

export const loadAllCharts = () => {
  const userCharts = readUserCharts()
  return Object.fromEntries(
    ADMIN_CHART_CATEGORIES.map((category) => [
      category,
      [
        ...(ADMIN_CHART_DEFINITIONS[category] || []).map((chart) => ({ ...chart })),
        ...((userCharts[category] || []).map((chart) => ({ ...chart }))),
      ],
    ])
  )
}

export const fetchAllChartsFromDb = async () => {
  try {
    const dbCharts = await chartApi.listCharts()
    const categorized = Object.fromEntries(ADMIN_CHART_CATEGORIES.map((c) => [c, []]))
    
    dbCharts.forEach((chart) => {
      const category = mapContextToCategory(chart.entity || chart.context)
      if (category && categorized[category]) {
        categorized[category].push({
          ...chart,
          id: chart._id || chart.id,
          title: chart.title || chart.name || 'Untitled Chart',
          chartType: chart.chartType || chart.type || 'Pie',
          type: chart.chartType || chart.type || 'Pie',
          active: chart.active !== false,
          mobileEnabled: chart.mobileEnabled !== false,
        })
      }
    })

    writeUserCharts(categorized)
    return Object.fromEntries(
      ADMIN_CHART_CATEGORIES.map((category) => [
        category,
        [
          ...(ADMIN_CHART_DEFINITIONS[category] || []).map((chart) => ({ ...chart })),
          ...((categorized[category] || []).map((chart) => ({ ...chart }))),
        ],
      ])
    )
  } catch (error) {
    console.warn('Unable to load charts from backend API, falling back to local storage:', error)
    return loadAllCharts()
  }
}

export const appendUserChart = (category, chart) => {
  if (!category || !chart) return
  const current = readUserCharts()
  const list = Array.isArray(current[category]) ? current[category] : []
  writeUserCharts({ ...current, [category]: [...list, chart] })
}

export const saveUserChartToDb = async (category, chart) => {
  appendUserChart(category, chart)
  try {
    const created = await chartApi.createChart(chart)
    return created
  } catch (error) {
    console.error('Failed to save chart to MongoDB backend:', error)
    return chart
  }
}

