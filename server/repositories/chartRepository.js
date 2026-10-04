const ChartTemplate = require('../models/ChartTemplate')
const ChartConfiguration = require('../models/ChartConfiguration')

const normalizeEmail = (value) => String(value || '').trim().toLowerCase()
const toNumberOrNull = (value) => {
  const numberValue = Number(value)
  return Number.isFinite(numberValue) ? numberValue : null
}

const chartRepository = {
  // Template CRUD
  listTemplates: async (actor = {}) => {
    const query = { isActive: { $ne: false } }
    return ChartTemplate.find(query).sort({ createdAt: -1, _id: -1 }).lean()
  },
  getTemplateById: async (id) => {
    return ChartTemplate.findById(id).lean()
  },
  createTemplate: async (data) => {
    const doc = new ChartTemplate(data)
    return doc.save()
  },
  updateTemplate: async (id, data) => {
    return ChartTemplate.findByIdAndUpdate(id, { $set: data }, { new: true }).lean()
  },
  deleteTemplate: async (id) => {
    const deleted = await ChartTemplate.findByIdAndDelete(id).lean()
    if (deleted?._id) {
      await ChartConfiguration.deleteMany({ templateId: { $in: [deleted._id, String(deleted._id)] } })
    }
    return deleted
  },

  // Chart Configuration CRUD
  listCharts: async (actor = {}) => {
    const userEmail = normalizeEmail(actor?.email)
    const userId = actor?.id
    const query = { active: { $ne: false } }

    if (userEmail || userId) {
      query.$or = [
        { scope: 'company' },
        { scope: 'shared' },
        ...(userEmail ? [{ createdByEmail: { $regex: `^${userEmail.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, $options: 'i' } }] : []),
        ...(userId ? [{ createdBy: userId }] : []),
        { createdByEmail: { $exists: false } },
        { scope: { $exists: false } },
      ]
    }

    return ChartConfiguration.find(query).sort({ createdAt: -1 }).lean()
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
