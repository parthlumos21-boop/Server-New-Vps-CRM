import React, { useEffect } from 'react'
import { BULK_UPLOAD_CUSTOMER_CONSTRAINTS } from '../../../../features/adminCustomers/bulkUpload/constants'
import { validateCustomerRecords } from '../../../../features/adminCustomers/bulkUpload/validators'
import {
  detectDuplicates,
  getDuplicateReasonText,
  getActionDescriptionText,
} from '../../../../features/adminCustomers/bulkUpload/duplicateDetector'

const VerifyStep = ({
  records,
  headers,
  mappings,
  fileName,
  duplicateConfig,
  error,
  setError,
}) => {
  const previewRecords = records.slice(0, BULK_UPLOAD_CUSTOMER_CONSTRAINTS.PREVIEW_ROWS)
  const mappedFields = Object.keys(mappings).map((csvHeader) => ({
    csvHeader,
    field: mappings[csvHeader],
  }))

  // Detect duplicates
  const { duplicates, hasDuplicates } = detectDuplicates(records, mappings, duplicateConfig)

  useEffect(() => {
    const validation = validateCustomerRecords(records, mappings)
    if (!validation.isValid) {
      setError(validation.errors[0])
    } else {
      setError(null)
    }
  }, [records, mappings, setError])

  const tableColumns = mappedFields.map((mapping) => ({
    key: mapping.csvHeader,
    label: mapping.field,
  }))

  const tableData = previewRecords.map((record, idx) => {
    const row = {}
    const rowIndex = idx + 2
    const rowDuplicate = duplicates.find((d) => d.rowIndex === rowIndex)

    mappedFields.forEach((mapping) => {
      row[mapping.csvHeader] = record[mapping.csvHeader] || ''
    })

    row._isDuplicate = !!rowDuplicate
    row._duplicateReasons = rowDuplicate ? rowDuplicate.reasons : []

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

        <div className="bulk-upload-verify-duplicate-config">
          <h3>Duplicate Check Configuration</h3>
          <p className="verify-config-item">
            <strong>Check on:</strong>{' '}
            {[duplicateConfig.checkPhone && 'Phone', duplicateConfig.checkEmail && 'Email']
              .filter(Boolean)
              .join(' or ')}{' '}
            {duplicateConfig.checkPhone && duplicateConfig.checkEmail && '(OR logic)'}
          </p>
          <p className="verify-config-item">
            <strong>Action:</strong> {getActionDescriptionText(duplicateConfig.action)}
          </p>
          {hasDuplicates && (
            <p className="verify-config-warning">
              ⚠️ Found {duplicates.length} duplicate record(s)
            </p>
          )}
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
                <tr
                  key={index}
                  className={row._isDuplicate ? 'row-duplicate-warning' : ''}
                  title={
                    row._isDuplicate
                      ? `Duplicate detected: ${getDuplicateReasonText(row._duplicateReasons)}`
                      : ''
                  }
                >
                  {tableColumns.map((col) => (
                    <td key={col.key}>
                      <div className="cell-content">
                        {row._isDuplicate && <span className="duplicate-badge">⚠️</span>}
                        <span>{row[col.key]}</span>
                      </div>
                    </td>
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
