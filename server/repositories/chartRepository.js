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
    const email = normalizeEmail(actor.email)
    const userId = toNumberOrNull(actor.id)
    const visibility = [{ isSystem: true }]
    if (email) {
      visibility.push({ createdByEmail: { $regex: `^${email.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, $options: 'i' } })
    }
    if (userId !== null) {
      visibility.push({ createdBy: userId })
    }

    return ChartTemplate.find({
      $or: visibility,
      isActive: true,
    }).sort({ createdAt: -1, _id: -1 }).lean()
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
