const chartService = require('../services/chartService')

const wrap = (fn) => async (req, res, next) => {
  try {
    const data = await fn(req.user, req, res)
    res.json({ success: true, data })
  } catch (error) {
    next(error)
  }
}

const chartController = {
  listTemplates: wrap((user) => chartService.listTemplates(user)),
  createTemplate: wrap((user, req) => chartService.createTemplate(user, req.body)),
  updateTemplate: wrap((user, req) => chartService.updateTemplate(user, req.params.id, req.body)),
  deleteTemplate: wrap((user, req) => chartService.deleteTemplate(user, req.params.id)),
  listCharts: wrap((user) => chartService.listCharts(user)),
  getChartById: wrap((user, req) => chartService.getChartById(user, req.params.id)),
  createChart: wrap((user, req) => chartService.createChart(user, req.body)),
  updateChart: wrap((user, req) => chartService.updateChart(user, req.params.id, req.body)),
  deleteChart: wrap((user, req) => chartService.deleteChart(user, req.params.id)),
  getChartData: wrap((user, req) => chartService.getChartData(user, req.params.id, req.query)),
  listDashboardCharts: wrap((user, req) => chartService.listDashboardCharts(user, req.query)),
  patchDashboard: wrap((user, req) => chartService.updateChart(user, req.params.id, { dashboard: req.body })),
  patchActive: wrap((user, req) => chartService.updateChart(user, req.params.id, { active: req.body.active })),
}

module.exports = chartController
