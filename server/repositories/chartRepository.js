const ChartTemplate = require('../models/ChartTemplate')
const ChartConfiguration = require('../models/ChartConfiguration')

const chartRepository = {
  // Template CRUD
  listTemplates: async (companyId = 1) => {
    return ChartTemplate.find({
      $or: [{ companyId }, { isSystem: true }],
      isActive: true,
    }).lean()
  },
  getTemplateById: async (id) => {
    return ChartTemplate.findById(id).lean()
  },
  createTemplate: async (data) => {
    const doc = new ChartTemplate(data)
    return doc.save()
  },

  // Chart Configuration CRUD
  listCharts: async (actor) => {
    const companyId = actor?.companyId || 1
    const userId = actor?.id
    return ChartConfiguration.find({
      companyId,
      $or: [
        { scope: 'company' },
        { scope: 'shared' },
        { createdBy: userId },
      ],
      active: true,
    }).sort({ createdAt: -1 }).lean()
  },
  getChartById: async (id) => {
    return ChartConfiguration.findById(id).lean()
  },
  createChart: async (data) => {
    const doc = new ChartConfiguration(data)
    return doc.save()
  },
  updateChart: async (id, data) => {
    return ChartConfiguration.findByIdAndUpdate(id, { $set: data }, { new: true }).lean()
  },
  deleteChart: async (id) => {
    return ChartConfiguration.findByIdAndDelete(id).lean()
  },
}

module.exports = chartRepository
