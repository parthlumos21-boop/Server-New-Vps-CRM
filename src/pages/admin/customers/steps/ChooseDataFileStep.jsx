import React, { useRef } from 'react'
import { validateCustomerFile } from '../../../../features/adminCustomers/bulkUpload/validators'
import { validateDuplicateConfig } from '../../../../features/adminCustomers/bulkUpload/validators'
import {
  BULK_UPLOAD_CUSTOMER_DUPLICATE_OPTIONS,
  BULK_UPLOAD_CUSTOMER_DUPLICATE_ACTIONS,
} from '../../../../features/adminCustomers/bulkUpload/constants'
import { readFileAsText, parseCSV } from '../../../../features/adminAccounts/bulkUpload/csvParser'

const ChooseDataFileStep = ({
  onFileSelected,
  selectedFile,
  duplicateConfig,
  onDuplicateConfigChange,
  error,
  setError,
}) => {
  const fileInputRef = useRef(null)

  const handleFileInputChange = async (event) => {
    const file = event.target.files?.[0]

    if (!file) return

    const validation = validateCustomerFile(file)
    if (!validation.isValid) {
      setError(validation.error)
      return
    }

    try {
      setError(null)
      const csvContent = await readFileAsText(file)
      const { headers, records } = parseCSV(csvContent)

      onFileSelected({
        file,
        headers,
        records,
        fileName: file.name,
      })
    } catch (err) {
      setError(err.message || 'Failed to parse CSV file')
    }
  }

  const handleChooseClick = () => {
    fileInputRef.current?.click()
  }

  const handleDuplicateCheckChange = (option) => {
    const isChecked = duplicateConfig[option]
    const newConfig = {
      ...duplicateConfig,
      [option]: !isChecked,
    }

    // Validate
    const validation = validateDuplicateConfig(newConfig)
    if (!validation.isValid) {
      setError(validation.errors[0])
    } else {
      setError(null)
    }

    onDuplicateConfigChange(newConfig)
  }

  const handleActionChange = (e) => {
    const action = e.target.value
    const newConfig = { ...duplicateConfig, action }

    const validation = validateDuplicateConfig(newConfig)
    if (!validation.isValid) {
      setError(validation.errors[0])
    } else {
      setError(null)
    }

    onDuplicateConfigChange(newConfig)
  }

  return (
    <div className="bulk-upload-step bulk-upload-step-choose-file">
      <h2 className="bulk-upload-step-title">Select data source file(CSV Format):</h2>

      <div className="bulk-upload-file-input-container">
        <input
          ref={fileInputRef}
          type="file"
          accept=".csv"
          onChange={handleFileInputChange}
          style={{ display: 'none' }}
        />

        {selectedFile ? (
          <div className="bulk-upload-file-selected">
            <div className="bulk-upload-file-name">
              <svg className="bulk-upload-file-icon" viewBox="0 0 24 24">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8l-8-6z" />
              </svg>
              <span>{selectedFile.fileName}</span>
            </div>
            <button type="button" onClick={handleChooseClick} className="bulk-upload-change-btn">
              Change
            </button>
          </div>
        ) : (
          <button type="button" onClick={handleChooseClick} className="bulk-upload-choose-btn">
            Choose file
          </button>
        )}
      </div>

      <div className="bulk-upload-duplicate-config">
        <div className="bulk-upload-config-section">
          <label className="bulk-upload-config-label">Check Duplicate On:</label>
          <div className="bulk-upload-checkboxes">
            {BULK_UPLOAD_CUSTOMER_DUPLICATE_OPTIONS.map((option) => (
              <label key={option.value} className="bulk-upload-checkbox-label">
                <input
                  type="checkbox"
                  checked={duplicateConfig[option.value] || false}
                  onChange={() => handleDuplicateCheckChange(option.value)}
                  className="bulk-upload-checkbox"
                />
                <span>{option.label}</span>
              </label>
            ))}
            {(duplicateConfig.checkPhone || duplicateConfig.checkEmail) && (
              <span className="bulk-upload-or-logic">(OR)</span>
            )}
          </div>
        </div>

        <div className="bulk-upload-config-section">
          <label htmlFor="duplicate-action" className="bulk-upload-config-label">
            Duplicate check action:
          </label>
          <select
            id="duplicate-action"
            value={duplicateConfig.action || ''}
            onChange={handleActionChange}
            className="bulk-upload-config-select"
          >
            <option value="">Select</option>
            {BULK_UPLOAD_CUSTOMER_DUPLICATE_ACTIONS.map((action) => (
              <option key={action.value} value={action.value}>
                {action.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {error && <div className="bulk-upload-error">{error}</div>}

      {selectedFile && (
        <div className="bulk-upload-file-info">
          <p>
            <strong>Rows:</strong> {selectedFile.records.length}
          </p>
          <p>
            <strong>Columns:</strong> {selectedFile.headers.length}
          </p>
        </div>
      )}
    </div>
  )
}

export default ChooseDataFileStep
