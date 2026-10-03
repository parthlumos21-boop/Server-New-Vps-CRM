const mongoose = require('mongoose')

const chartConfigurationSchema = new mongoose.Schema(
  {
    companyId: { type: Number, default: 1 },
    title: { type: String, required: true },
    description: { type: String, default: '' },
    entity: { type: String, required: true, enum: ['Account', 'Customer', 'SR', 'Deal'] },
    chartType: { type: String, required: true, enum: ['Pie', 'Donut', 'Funnel', 'Bar', 'Stack', 'Card'] },
    aggregation: { type: String, required: true, enum: ['Count', 'Sum'], default: 'Count' },
    templateId: { type: mongoose.Schema.Types.Mixed, default: null },
    scope: { type: String, enum: ['private', 'company', 'shared'], default: 'company' },
    mobileEnabled: { type: Boolean, default: false },
    active: { type: Boolean, default: true },
    classification: { type: mongoose.Schema.Types.Mixed, default: {} },
    filters: { type: mongoose.Schema.Types.Mixed, default: {} },
    view: { type: mongoose.Schema.Types.Mixed, default: {} },
    actions: { type: [String], default: [] },
    createdBy: { type: Number, required: true },
    createdByEmail: { type: String, default: '' },
    createdByName: { type: String, default: '' },
  },
  {
    timestamps: true,
    collection: 'chart_configurations',
  }
)

module.exports = mongoose.models.ChartConfiguration || mongoose.model('ChartConfiguration', chartConfigurationSchema)
