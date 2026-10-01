import React from 'react'
import { BULK_UPLOAD_CONSTRAINTS } from '../../../../features/adminAccounts/bulkUpload/constants'
import { validateRecords } from '../../../../features/adminAccounts/bulkUpload/validators'

const VerifyStep = ({ records, headers, mappings, fileName, error, setError }) => {
  const previewRecords = records.slice(0, BULK_UPLOAD_CONSTRAINTS.PREVIEW_ROWS)
  const mappedFields = Object.keys(mappings).map((csvHeader) => ({
    csvHeader,
    field: mappings[csvHeader],
  }))

  React.useEffect(() => {
    // Validate records
    const validation = validateRecords(records, mappings)
    if (!validation.isValid) {
      setError(validation.errors[0])
    } else {
      setError(null)
    }
  }, [records, mappings, setError])

  // Build columns for preview table
  const tableColumns = mappedFields.map((mapping) => ({
    key: mapping.csvHeader,
    label: mapping.field,
  }))

  // Transform records for table display
  const tableData = previewRecords.map((record) => {
    const row = {}
    mappedFields.forEach((mapping) => {
      row[mapping.csvHeader] = record[mapping.csvHeader] || ''
    })
    return row
  })

  return (
    <div className="bulk-upload-step bulk-upload-step-verify">
      <h2 className="bulk-upload-step-title">Review and verify data</h2>

      <div className="bulk-upload-verify-summary">
        <div className="bulk-upload-verify-info">
          <p>
            <strong>File:</strong> {fileName}
          </p>
          <p>
            <strong>Total Records:</strong> {records.length}
          </p>
          <p>
            <strong>Preview Rows:</strong> Showing first {previewRecords.length} records
          </p>
        </div>

        <div className="bulk-upload-verify-mappings">
          <h3>Field Mappings</h3>
          <div className="bulk-upload-verify-mapping-list">
            {mappedFields.map((mapping) => (
              <div key={mapping.csvHeader} className="bulk-upload-verify-mapping-item">
                <span className="mapping-csv-header">{mapping.csvHeader}</span>
                <span className="mapping-arrow">→</span>
                <span className="mapping-field">{mapping.field}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="bulk-upload-verify-preview">
        <h3>Data Preview</h3>
        <div className="bulk-upload-preview-table-container">
          <table className="bulk-upload-preview-table">
            <thead>
              <tr>
                {tableColumns.map((col) => (
                  <th key={col.key}>{col.label}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {tableData.map((row, index) => (
                <tr key={index}>
                  {tableColumns.map((col) => (
                    <td key={col.key}>{row[col.key]}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {error && <div className="bulk-upload-error">{error}</div>}
    </div>
  )
}

export default VerifyStep
