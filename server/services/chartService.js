const chartRepository = require('../repositories/chartRepository')
const { computeChartAggregation } = require('./chartAggregationEngine')
const { AppError } = require('../utils/appError')

const chartService = {
  listTemplates: async (actor) => {
    return chartRepository.listTemplates(actor)
  },
  createTemplate: async (actor, payload) => {
    if (!payload.templateKey || !payload.name || !payload.entity) {
      throw new AppError('templateKey, name, and entity are required.', 400)
    }
    if (!actor?.id) {
      throw new AppError('Authenticated user is required to create chart templates.', 401)
    }
    const templateData = {
      ...payload,
      createdBy: actor.id,
      createdByEmail: String(actor.email || '').trim().toLowerCase(),
      createdByName: actor.name || actor.username || '',
    }
    if (actor?.companyId) {
      templateData.companyId = actor.companyId
    }
    return chartRepository.createTemplate(templateData)
  },
  updateTemplate: async (actor, id, payload) => {
    const updated = await chartRepository.updateTemplate(id, payload)
    if (!updated) {
      throw new AppError('Chart template not found.', 404)
    }
    return updated
  },
  deleteTemplate: async (actor, id) => {
    const deleted = await chartRepository.deleteTemplate(id)
    if (!deleted) {
      throw new AppError('Chart template not found.', 404)
    }
    return deleted
  },
  listCharts: async (actor) => {
    return chartRepository.listCharts(actor)
  },
  getChartById: async (actor, id) => {
    const chart = await chartRepository.getChartById(id)
    if (!chart) {
      throw new AppError('Chart not found.', 404)
    }
    return chart
  },
  createChart: async (actor, payload) => {
    if (!payload.title || !payload.entity) {
      throw new AppError('Chart title and entity context are required.', 400)
    }
    if (!actor?.id) {
      throw new AppError('Authenticated user is required to create charts.', 401)
    }

    const createdBy = actor.id
    const createdByEmail = String(actor.email || '').trim().toLowerCase()
    const createdByName = actor.name || actor.username || ''

    // 1. Save template definition into chart_templates MongoDB collection
    const templateKey = `${String(payload.entity).toLowerCase()}-${String(payload.title).toLowerCase().replace(/[^a-z0-9]+/g, '-')}-${Date.now()}`
    const templatePayload = {
      templateKey,
      name: payload.title,
      description: payload.description || `${payload.title} template`,
      entity: payload.entity,
      chartType: payload.chartType || payload.type || 'Pie',
      aggregation: payload.aggregation || 'Count',
      classification: {
        field: payload.classificationField,
        options: payload.classificationOptions,
        orderBy: payload.chartOrderBy,
      },
      defaultFilters: {
        timeFilter: {
          enabled: payload.timeFilterEnabled,
          field: payload.timeFilterField,
          period: payload.timeFilterPeriod,
        },
        criteria: payload.filterRows || [],
      },
      defaultView: {
        selectedFieldKeys: payload.selectedFieldKeys || [],
        orderByEnabled: payload.orderByEnabled,
        orderByField: payload.orderByField,
      },
      isSystem: false,
      isActive: true,
      createdBy,
      createdByEmail,
      createdByName,
    }

    if (actor?.companyId) {
      templatePayload.companyId = actor.companyId
    }

    const template = await chartRepository.createTemplate(templatePayload)

    // 2. Save chart configuration into chart_configurations MongoDB collection
    const chartConfigPayload = {
      ...payload,
      templateId: template._id,
      chartType: payload.chartType || payload.type || 'Pie',
      classification: {
        field: payload.classificationField,
        options: payload.classificationOptions,
        orderBy: payload.chartOrderBy,
      },
      filters: {
        timeFilter: {
          enabled: payload.timeFilterEnabled,
          field: payload.timeFilterField,
          period: payload.timeFilterPeriod,
        },
        criteria: payload.filterRows || [],
      },
      view: {
        selectedFieldKeys: payload.selectedFieldKeys || [],
        orderByEnabled: payload.orderByEnabled,
        orderByField: payload.orderByField,
      },
      actions: payload.selectedActionKeys || [],
      createdBy,
      createdByEmail,
      createdByName,
    }

    if (actor?.companyId) {
      chartConfigPayload.companyId = actor.companyId
    }

    const chartConfig = await chartRepository.createChart(chartConfigPayload)

    return chartConfig
  },
  updateChart: async (actor, id, payload) => {
    const updated = await chartRepository.updateChart(id, payload)
    if (!updated) {
      throw new AppError('Chart not found.', 404)
    }
    return updated
  },
  deleteChart: async (actor, id) => {
    const deleted = await chartRepository.deleteChart(id)
    if (!deleted) {
      throw new AppError('Chart not found.', 404)
    }
    return deleted
  },
  getChartData: async (actor, id, options = {}) => {
    const chart = await chartRepository.getChartById(id)
    if (!chart) {
      throw new AppError('Chart configuration not found.', 404)
    }
    return computeChartAggregation(chart, options)
  },
  listDashboardCharts: async (actor, options = {}) => {
    const charts = await chartRepository.listCharts(actor)
    const activeDashboardCharts = charts.filter((c) => c.active !== false && c.dashboard?.enabled !== false)
    const results = await Promise.all(
      activeDashboardCharts.map(async (chart) => {
        try {
          const data = await computeChartAggregation(chart, options)
          return { config: chart, data }
        } catch (err) {
          console.error(`Failed to aggregate dashboard chart ${chart._id}:`, err)
          return { config: chart, data: null }
        }
      })
    )
    return results
  },
}

module.exports = chartService
