const mongoose = require('mongoose');

const ReportTemplateSchema = new mongoose.Schema({
  name: { type: String, required: true },
  reportName: { type: String },
  description: String,
  entityType: { type: String, required: true },
  filters: [mongoose.Schema.Types.Mixed],
  displayFields: [{ type: String }],
  selectedFields: [{ type: String }],
  groupBy: { type: String },
  orderBy: { type: String },
  aggregate: { type: String },
  visibility: { type: String, default: 'All' },
  runtimePeriodEnabled: { type: Boolean, default: false },
  createdBy: { type: String },
  creatorName: { type: String },
  creatorEmail: { type: String },
}, { timestamps: true });

module.exports = mongoose.model('ReportTemplate', ReportTemplateSchema);

