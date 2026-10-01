const mongoose = require('mongoose');

const reportSchema = new mongoose.Schema({
  templateId: { type: String, required: true },
  reportName: { type: String, required: true },
  entityType: { type: String, required: true },
  selectedFields: { type: [String], default: [] },
  displayFields: { type: [String], default: [] },
  filters: { type: [mongoose.Schema.Types.Mixed], default: [] },
  totalRecords: { type: Number, default: 0 },
  createdBy: { type: String, required: true },
  creatorName: { type: String },
  visibility: { type: String, default: 'All' },
  createdAt: { type: Date, default: Date.now },
});

module.exports = mongoose.model('Report', reportSchema);
