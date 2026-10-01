const fs = require('fs');
const file = 'src/pages/admin/deals/AdminManageDealPage.jsx';
let code = fs.readFileSync(file, 'utf8');
// 1. Update the layout for the main Data Fields
const oldDataField = `  const renderDataField = (field) => (
    <div key={field.key} className={\`admin-manage-deal-field \${field.wide ? 'admin-manage-deal-field-wide' : ''}\`}>
      <div className="admin-manage-deal-field-label">
        {field.icon ? <span className="admin-manage-deal-field-label-icon">{field.icon}</span> : null}
        <span>{field.label}</span>
        {!field.readOnly && !isEditing && editingFieldKey !== field.key ? (
          <button
            type="button"
            className="admin-manage-deal-field-edit"
            onClick={() => handleStartFieldEditing(field.key)}
            aria-label={\`Edit \${field.label}\`}
            title={\`Edit \${field.label}\`}
          >
            <FaEdit />
          </button>
        ) : null}
      </div>
      <div className="admin-manage-deal-field-control">
        {(isEditing || editingFieldKey === field.key) && !field.readOnly ? renderFieldInput(field) : renderFieldValue(field)}`;
const newDataField = `  const renderDataField = (field) => (
    <div key={field.key} className={\`admin-manage-deal-field \${field.wide ? 'admin-manage-deal-field-wide' : ''}\`}>
      <div className="admin-manage-deal-field-label">
        {field.icon ? <span className="admin-manage-deal-field-label-icon">{field.icon}</span> : null}
        <span>{field.label}</span>
      </div>
      <div className="admin-manage-deal-field-control">
        {(isEditing || editingFieldKey === field.key) && !field.readOnly ? (
          renderFieldInput(field)
        ) : (
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            {renderFieldValue(field)}
            {!field.readOnly && !isEditing && editingFieldKey !== field.key ? (
              <button
                type="button"
                className="admin-manage-deal-field-edit"
                onClick={() => handleStartFieldEditing(field.key)}
                aria-label={\`Edit \${field.label}\`}
                title={\`Edit \${field.label}\`}
                style={{ position: 'relative', display: 'inline-flex', padding: 0, margin: 0, color: 'var(--text-secondary)' }}
              >
                <FaEdit />
              </button>
            ) : null}
          </div>
        )}`;
code = code.replace(oldDataField, newDataField);
// 2. Update the layout for the Metric Cards (Top Section)
const oldMetricField = `            {metricFields.map((field) => (
              <div key={field.key} className="admin-manage-deal-metric-card">
                <div className="admin-manage-deal-metric-label">{field.label}</div>
                {!isEditing && editingFieldKey !== field.key ? (
                  <button
                    type="button"
                    className="admin-manage-deal-metric-edit"
                    onClick={() => handleStartFieldEditing(field.key)}
                    aria-label={\`Edit \${field.label}\`}
                    title={\`Edit \${field.label}\`}
                  >
                    <FaEdit />
                  </button>
                ) : null}
                <div className="admin-manage-deal-metric-value">
                  {isEditing || editingFieldKey === field.key ? renderFieldInput(field) : renderFieldValue(field)}`;
const newMetricField = `            {metricFields.map((field) => (
              <div key={field.key} className="admin-manage-deal-metric-card">
                <div className="admin-manage-deal-metric-label">{field.label}</div>
                <div className="admin-manage-deal-metric-value">
                  {isEditing || editingFieldKey === field.key ? (
                    renderFieldInput(field)
                  ) : (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      {renderFieldValue(field)}
                      {!isEditing && editingFieldKey !== field.key ? (
                        <button
                          type="button"
                          className="admin-manage-deal-metric-edit"
                          onClick={() => handleStartFieldEditing(field.key)}
                          aria-label={\`Edit \${field.label}\`}
                          title={\`Edit \${field.label}\`}
                          style={{ position: 'relative', display: 'inline-flex', padding: 0, margin: 0, color: 'var(--text-secondary)' }}
                        >
                          <FaEdit />
                        </button>
                      ) : null}
                    </div>
                  )}`;
code = code.replace(oldMetricField, newMetricField);
fs.writeFileSync(file, code);
console.log('Successfully moved the pencil icon next to the values for Manage Deals!');
