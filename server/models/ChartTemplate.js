const mongoose = require('mongoose')

const chartTemplateSchema = new mongoose.Schema(
  {
    companyId: { type: Number, required: false },
    templateKey: { type: String, required: true },
    name: { type: String, required: true },
    description: { type: String, default: '' },
    entity: { type: String, required: true, enum: ['Account', 'Customer', 'SR', 'Deal', 'Quotation'] },
    chartType: { type: String, required: true, enum: ['Pie', 'Donut', 'Funnel', 'Bar', 'Stack', 'Card'] },
    aggregation: { type: String, required: true, enum: ['Count', 'Sum'], default: 'Count' },
    classification: { type: mongoose.Schema.Types.Mixed, default: {} },
    defaultFilters: { type: mongoose.Schema.Types.Mixed, default: {} },
    defaultView: { type: mongoose.Schema.Types.Mixed, default: {} },
    isSystem: { type: Boolean, default: false },
    isActive: { type: Boolean, default: true },
    createdBy: { type: Number, default: null },
    createdByEmail: { type: String, default: '' },
    createdByName: { type: String, default: '' },
  },
  {
    timestamps: true,
    collection: 'chart_templates',
  }
)

module.exports = mongoose.models.ChartTemplate || mongoose.model('ChartTemplate', chartTemplateSchema)
