import React from 'react'

const BulkUploadReviewPanel = ({
  type = 'mapping',
  headers = [],
  records = [],
  fields = [],
  mappings = {},
  onMappingChange,
}) => {
  if (type === 'mapping') {
    return (
      <div className="bulk-upload-review-panel">
        <div className="bulk-upload-review-summary">
          {headers.length} file columns detected. Map them with CRM fields before verification.
        </div>
        <div className="bulk-upload-review-grid">
          {fields.map((field) => (
            <label key={field.key} className="bulk-upload-review-field">
              <span>{field.label}{field.required ? ' *' : ''}</span>
              <select
                value={mappings[field.key] || ''}
                onChange={(event) => onMappingChange(field.key, event.target.value)}
              >
                <option value="">Do not import</option>
                {headers.map((header) => (
                  <option key={header} value={header}>{header}</option>
                ))}
              </select>
            </label>
          ))}
        </div>
      </div>
    )
  }

  const visibleRecords = records.slice(0, 10)
  const mappedFields = fields.filter((field) => mappings[field.key])

  return (
    <div className="bulk-upload-review-panel">
      <div className="bulk-upload-review-summary">
        {records.length} records ready. Showing first {visibleRecords.length} for verification.
      </div>
      <div className="bulk-upload-review-table-wrap">
        <table className="bulk-upload-review-table">
          <thead>
            <tr>
              {mappedFields.map((field) => <th key={field.key}>{field.label}</th>)}
            </tr>
          </thead>
          <tbody>
            {visibleRecords.map((record) => (
              <tr key={record.id}>
                {mappedFields.map((field) => (
                  <td key={field.key}>{record.values[mappings[field.key]] || '-'}</td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {mappedFields.length === 0 ? (
        <div className="bulk-upload-review-summary bulk-upload-review-summary-warning">
          Select at least one CRM field before upload.
        </div>
      ) : null}
    </div>
  )
}

export default BulkUploadReviewPanel
