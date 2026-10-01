const dashboardRepository = require('../repositories/dashboardRepository')
const { AppError } = require('../utils/appError')
const { getSocketServer } = require('../socket/socketServer')
const { SOCKET_EVENTS } = require('../socket/socketEvents')

const getStats = (actor) => dashboardRepository.getStats(actor)
const getCharts = async (actor) => {
  const [dealsByStage, leadsByStatus] = await Promise.all([
    dashboardRepository.getDealsByStage(actor),
    dashboardRepository.getLeadsByStatus(actor),
  ])
  return { dealsByStage, leadsByStatus }
}

const listTabs = (actor) => dashboardRepository.listTabs(actor)

const createTab = async (actor, body) => {
  if (!body?.name) throw new AppError('Tab name is required.', 400)
  const tab = await dashboardRepository.createTab({
    userId: actor.id,
    companyId: actor.companyId,
    name: body.name,
    layout: body.layout || {},
    position: body.position || 0,
    isShared: !!body.isShared,
  })
  getSocketServer()?.emitToUser(actor.id, SOCKET_EVENTS.DASHBOARD_TABS_UPDATE, { action: 'created', tab })
  return tab
}

const updateTab = async (actor, id, body) => {
  const tab = await dashboardRepository.updateTab(Number(id), actor, {
    name: body.name,
    layout: body.layout,
    position: body.position,
    isShared: body.isShared,
  })
  if (!tab) throw new AppError('Tab not found.', 404)
  getSocketServer()?.emitToUser(actor.id, SOCKET_EVENTS.DASHBOARD_TABS_UPDATE, { action: 'updated', tab })
  return tab
}

const removeTab = async (actor, id) => {
  const result = await dashboardRepository.deleteTab(Number(id), actor)
  if (!result) throw new AppError('Tab not found.', 404)
  getSocketServer()?.emitToUser(actor.id, SOCKET_EVENTS.DASHBOARD_TABS_UPDATE, { action: 'deleted', id: result.id })
  return result
}

// Sales Dashboard Metrics Functions
const getSalesOverviewMetrics = async (actor) => {
  try {
    const stats = await dashboardRepository.getStats(actor)
    return stats || { totalLeads: 0, wonLeads: 0, lostLeads: 0 }
  } catch (error) {
    throw new AppError('Failed to fetch sales overview metrics', 500)
  }
}

const getTeamPerformanceMetrics = async () => {
  // Returns empty array - can be extended with real team data
  return { metrics: [] }
}

const getPipelineAnalysisMetrics = async (actor) => {
  try {
    const dealsByStage = await dashboardRepository.getDealsByStage(actor)
    const stages = {
      pending: { label: 'Pending', count: 0, value: 0 },
      qualified: { label: 'Qualified', count: 0, value: 0 },
      proposal: { label: 'Proposal', count: 0, value: 0 },
      negotiation: { label: 'Negotiation', count: 0, value: 0 },
      won: { label: 'Won', count: 0, value: 0 },
      lost: { label: 'Lost', count: 0, value: 0 },
    }
    
    const total = dealsByStage?.length || 0
    const totalValue = dealsByStage?.reduce((sum, d) => sum + (d.value || 0), 0) || 0

    return {
      stages: Object.values(stages),
      total,
      totalValue,
    }
  } catch (error) {
    throw new AppError('Failed to fetch pipeline analysis metrics', 500)
  }
}

const getRevenueTrackingMetrics = async () => {
  const monthlyData = []
  for (let i = 0; i < 12; i++) {
    monthlyData.push({ month: i, revenue: 0, won: 0 })
  }

  return {
    monthlyData,
    totalYearlyRevenue: 0,
    totalYearlyWon: 0,
    avgMonthlyRevenue: 0,
    currentMonth: new Date().getMonth(),
  }
}

const getTargetProgressMetrics = async () => ({
  userTargets: [],
  monthlyTarget: 500000,
  teamAchieved: 0,
  teamPercentage: 0,
  currentMonth: new Date().getMonth(),
})

const getForecastMetrics = async () => {
  const monthlyData = []
  for (let i = 0; i < 12; i++) {
    monthlyData.push({ month: i, total: 0, count: 0, won: 0 })
  }

  return {
    monthlyData,
    currentMonth: new Date().getMonth(),
    completedMonths: new Date().getMonth() + 1,
    avgMonthlyRevenue: 0,
    avgMonthlyWon: 0,
    avgDealsPerMonth: 0,
    totalYearRevenue: 0,
    totalYearWon: 0,
    forecastedRevenue: 0,
    forecastedWon: 0,
    forecastedDeals: 0,
    projectedYearlyRevenue: 0,
    projectedYearlyWon: 0,
    projectedWinRate: 0,
    recentTrend: 0,
  }
}

module.exports = { 
  getStats, 
  getCharts, 
  listTabs, 
  createTab, 
  updateTab, 
  removeTab,
  getSalesOverviewMetrics,
  getTeamPerformanceMetrics,
  getPipelineAnalysisMetrics,
  getRevenueTrackingMetrics,
  getTargetProgressMetrics,
  getForecastMetrics,
}
