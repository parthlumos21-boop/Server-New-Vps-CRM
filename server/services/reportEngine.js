const mongoose = require('mongoose');
const reportFieldDefinitions = require('../config/reportFieldDefinitions');

const buildMongoQuery = (filters, fieldDefs) => {
  const query = {};
  if (!filters || !filters.length) return query;

  filters.forEach(f => {
    const fieldDef = fieldDefs.find(def => def.id === f.fieldId);
    if (!fieldDef) return;

    const dbField = fieldDef.dbField;
    switch(f.operator) {
      case 'eq': 
      case 'is':
        query[dbField] = f.value; 
        break;
      case 'contains': 
        query[dbField] = { $regex: f.value, $options: 'i' }; 
        break;
      case 'not_eq':
      case 'is_not':
        query[dbField] = { $ne: f.value };
        break;
      case 'is_empty':
        query[dbField] = { $in: [null, ''] };
        break;
      case 'is_not_empty':
        query[dbField] = { $nin: [null, ''] };
        break;
    }
  });
  return query;
};

const executeReport = async (templateId) => {
  const template = await mongoose.model('ReportTemplate').findById(templateId);
  if (!template) throw new Error('Template not found');

  if (template.entityType === 'account') {
    const fieldDefs = reportFieldDefinitions.account;
    const query = buildMongoQuery(template.filters, fieldDefs);
    
    const results = await mongoose.model('Lead').find(query)
      .populate('ownerUserId', 'name email')
      .lean();

    return results.map(row => {
      const formatted = {};
      template.displayFields.forEach(fieldId => {
        const def = fieldDefs.find(d => d.id === fieldId);
        if (def) {
          formatted[fieldId] = def.dbField.split('.').reduce((o, i) => (o ? o[i] : null), row);
        }
      });
      return formatted;
    });
  }

  throw new Error('Unsupported entity type');
};

module.exports = { executeReport, buildMongoQuery };
