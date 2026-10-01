import { ADMIN_CHART_CATEGORIES, ADMIN_CHART_DEFINITIONS } from './chartDefinitions'

const STORAGE_KEY = 'crm.adminCharts.userCreated'

const CONTEXT_TO_CATEGORY = {
  Account: 'Accounts',
  Customer: 'Customers',
  SR: 'SR',
  Deal: 'Deals',
}

export const mapContextToCategory = (context) => CONTEXT_TO_CATEGORY[context] || null

const safeParse = (raw) => {
  if (!raw) return {}
  try {
    const parsed = JSON.parse(raw)
    return parsed && typeof parsed === 'object' ? parsed : {}
  } catch {
    return {}
  }
}

const readUserCharts = () => {
  if (typeof window === 'undefined') return {}
  return safeParse(window.localStorage.getItem(STORAGE_KEY))
}

const writeUserCharts = (data) => {
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

export const appendUserChart = (category, chart) => {
  if (!category || !chart) return
  const current = readUserCharts()
  const list = Array.isArray(current[category]) ? current[category] : []
  writeUserCharts({ ...current, [category]: [...list, chart] })
}
