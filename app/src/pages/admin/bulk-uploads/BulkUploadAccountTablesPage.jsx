import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import BulkUploadReviewPanel from './BulkUploadReviewPanel'
import { buildDefaultMapping, readBulkUploadFile, saveBulkUploadAttempt } from './bulkUploadWorkflow'
import './BulkUploadAccountTablesPage.css'

const STEPS = [
  { id: 'choose-file', label: 'Choose Data File' },
  { id: 'select-fields', label: 'Select Fields' },
  { id: 'verify', label: 'Verify' },
]

const TABLE_FIELDS = [
  { key: 'accountNumber', label: 'Account No.', required: true },
  { key: 'tableName', label: 'Table Name', required: true },
  { key: 'fieldName', label: 'Field Name' },
  { key: 'fieldValue', label: 'Field Value' },
  { key: 'remark', label: 'Remark' },
]

const BulkUploadAccountTablesPage = () => {
  const navigate = useNavigate()
  const [currentStep, setCurrentStep] = useState(0)
  const [selectedFile, setSelectedFile] = useState(null)
  const [headers, setHeaders] = useState([])
  const [records, setRecords] = useState([])
  const [mappings, setMappings] = useState({})

  const handleFileChange = (event) => {
    const file = event.target.files?.[0] || null
    setSelectedFile(file)
  }

  const handleCancel = () => {
    navigate('/admin/bulk-uploads')
  }

  const handlePrimaryAction = async () => {
    if (currentStep === 0 && !selectedFile) {
      return
    }

    if (currentStep === 0) {
      const parsed = await readBulkUploadFile(selectedFile)
      setHeaders(parsed.headers)
      setRecords(parsed.records)
      setMappings(buildDefaultMapping(parsed.headers, TABLE_FIELDS))
    }

    if (currentStep < STEPS.length - 1) {
      setCurrentStep((step) => step + 1)
      return
    }

    saveBulkUploadAttempt({
      moduleName: 'Account Tables',
      fileName: selectedFile?.name || '-',
      rowCount: records.length,
    })
    alert(`${records.length} account table records verified for upload.`)
    navigate('/admin/bulk-uploads')
  }

  const handleMappingChange = (fieldKey, sourceColumn) => {
    setMappings((current) => ({ ...current, [fieldKey]: sourceColumn }))
  }

  const handlePrevious = () => {
    if (currentStep > 0) {
      setCurrentStep((step) => step - 1)
    }
  }

  const renderStepContent = () => {
    if (currentStep === 0) {
      return (
        <div className="bulk-account-tables-form-row">
          <label className="bulk-account-tables-label" htmlFor="account-tables-file-input">
            Select data source file(CSV Format):
          </label>

          <div className="bulk-account-tables-file-picker">
            <div className="bulk-account-tables-file-display">
              {selectedFile ? selectedFile.name : ''}
            </div>

            <label className="bulk-account-tables-file-button" htmlFor="account-tables-file-input">
              Choose file
            </label>

            <input
              id="account-tables-file-input"
              type="file"
              accept=".csv,.xlsx,.xls"
              onChange={handleFileChange}
              className="bulk-account-tables-file-input"
            />
          </div>
        </div>
      )
    }

    if (currentStep === 1) {
      return (
        <BulkUploadReviewPanel headers={headers} records={records} fields={TABLE_FIELDS} mappings={mappings} onMappingChange={handleMappingChange} />
      )
    }

    return (
      <BulkUploadReviewPanel type="preview" headers={headers} records={records} fields={TABLE_FIELDS} mappings={mappings} onMappingChange={handleMappingChange} />
    )
  }

  const isLastStep = currentStep === STEPS.length - 1
  const primaryDisabled = currentStep === 0 && !selectedFile

  return (
    <div className="bulk-account-tables-page">
      <div className="bulk-account-tables-header">
        <h1 className="bulk-account-tables-title">Account Custom Table - Bulk Upload</h1>
      </div>

      <div className="bulk-account-tables-shell">
        <div className="bulk-account-tables-card">
          <div className="bulk-account-tables-stepper">
            {STEPS.map((step, index) => {
              const isActive = index === currentStep
              const isCompleted = index < currentStep

              return (
                <div key={step.id} className="bulk-account-tables-step-item">
                  <div className="bulk-account-tables-step-top">
                    <span
                      className={[
                        'bulk-account-tables-step-number',
                        isActive ? 'bulk-account-tables-step-number--active' : '',
                        isCompleted ? 'bulk-account-tables-step-number--completed' : '',
                      ].join(' ').trim()}
                    >
                      {index + 1}
                    </span>

                    <span
                      className={[
                        'bulk-account-tables-step-label',
                        isActive ? 'bulk-account-tables-step-label--active' : '',
                        isCompleted ? 'bulk-account-tables-step-label--completed' : '',
                      ].join(' ').trim()}
                    >
                      {index < STEPS.length - 1 ? `-> ${step.label}` : step.label}
                    </span>
                  </div>
                </div>
              )
            })}
          </div>

          <div className="bulk-account-tables-divider" />

          <div className="bulk-account-tables-content">
            {renderStepContent()}
          </div>

          <div className="bulk-account-tables-footer">
            <button
              type="button"
              className="bulk-account-tables-btn bulk-account-tables-btn--cancel"
              onClick={handleCancel}
            >
              Cancel
            </button>

            <div className="bulk-account-tables-footer-actions">
              {currentStep > 0 ? (
                <button
                  type="button"
                  className="bulk-account-tables-btn bulk-account-tables-btn--secondary"
                  onClick={handlePrevious}
                >
                  Previous
                </button>
              ) : null}

              <button
                type="button"
                className="bulk-account-tables-btn bulk-account-tables-btn--primary"
                onClick={handlePrimaryAction}
                disabled={primaryDisabled}
              >
                {isLastStep ? 'Upload' : 'Next'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default BulkUploadAccountTablesPage
