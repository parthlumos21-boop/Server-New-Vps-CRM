const dashboardService = require('../services/dashboardService')

const wrap = (fn) => async (req, res, next) => {
  try {
    const data = await fn(req.user, req.params?.id, req.body)
    res.json({ success: true, data })
  } catch (error) { next(error) }
}

module.exports = {
  getStats: wrap((user) => dashboardService.getStats(user)),
  getCharts: wrap((user) => dashboardService.getCharts(user)),
  listTabs: wrap((user) => dashboardService.listTabs(user)),
  createTab: wrap((user, _id, body) => dashboardService.createTab(user, body || {})),
  updateTab: wrap((user, id, body) => dashboardService.updateTab(user, id, body || {})),
  deleteTab: wrap((user, id) => dashboardService.removeTab(user, id)),
  
  // Sales Dashboard Metrics Endpoints
  getSalesOverview: wrap((user) => dashboardService.getSalesOverviewMetrics(user)),
  getTeamPerformance: wrap((user) => dashboardService.getTeamPerformanceMetrics(user)),
  getPipelineAnalysis: wrap((user) => dashboardService.getPipelineAnalysisMetrics(user)),
  getRevenueTracking: wrap((user) => dashboardService.getRevenueTrackingMetrics(user)),
  getTargetProgress: wrap((user) => dashboardService.getTargetProgressMetrics(user)),
  getForecast: wrap((user) => dashboardService.getForecastMetrics(user)),
}
