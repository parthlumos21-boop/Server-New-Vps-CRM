import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import BulkUploadReviewPanel from './BulkUploadReviewPanel'
import { buildDefaultMapping, readBulkUploadFile, saveBulkUploadAttempt } from './bulkUploadWorkflow'
import './BulkUploadCustomersPage.css'

const STEPS = [
  { id: 'choose-file', label: 'Choose Data File' },
  { id: 'select-fields', label: 'Select Fields' },
  { id: 'verify', label: 'Verify' },
]

const DUPLICATE_ACTIONS = [
  { value: '', label: 'Select' },
  { value: 'reject', label: 'Reject Duplicate' },
  { value: 'reminder', label: 'Add Reminder to current owner' },
  { value: 'follow', label: 'Follow system configured actions' },
]

const CUSTOMER_FIELDS = [
  { key: 'customerNumber', label: 'Customer No.' },
  { key: 'customerName', label: 'Customer Name', required: true },
  { key: 'contactPerson', label: 'Contact Person' },
  { key: 'phone', label: 'Phone' },
  { key: 'email', label: 'Email' },
  { key: 'customerOwner', label: 'Customer Owner' },
  { key: 'customerStatus', label: 'Customer Status' },
  { key: 'remark', label: 'Remark' },
]

const BulkUploadCustomersPage = () => {
  const navigate = useNavigate()
  const [currentStep, setCurrentStep] = useState(0)
  const [selectedFile, setSelectedFile] = useState(null)
  const [duplicateConfig, setDuplicateConfig] = useState({
    checkPhone: false,
    checkEmail: false,
    action: '',
  })
  const [headers, setHeaders] = useState([])
  const [records, setRecords] = useState([])
  const [mappings, setMappings] = useState({})

  const handleFileChange = (event) => {
    const file = event.target.files?.[0] || null
    setSelectedFile(file)
  }

  const handleDuplicateToggle = (field) => {
    setDuplicateConfig((current) => ({
      ...current,
      [field]: !current[field],
    }))
  }

  const handleDuplicateActionChange = (event) => {
    const { value } = event.target
    setDuplicateConfig((current) => ({
      ...current,
      action: value,
    }))
  }

  const canProceedFromStepOne = (
    !!selectedFile
    && (duplicateConfig.checkPhone || duplicateConfig.checkEmail)
    && !!duplicateConfig.action
  )

  const handleCancel = () => {
    navigate('/admin/bulk-uploads')
  }

  const handlePrevious = () => {
    if (currentStep > 0) {
      setCurrentStep((step) => step - 1)
    }
  }

  const handlePrimaryAction = async () => {
    if (currentStep === 0 && !canProceedFromStepOne) {
      return
    }

    if (currentStep === 0) {
      const parsed = await readBulkUploadFile(selectedFile)
      setHeaders(parsed.headers)
      setRecords(parsed.records)
      setMappings(buildDefaultMapping(parsed.headers, CUSTOMER_FIELDS))
    }

    if (currentStep < STEPS.length - 1) {
      setCurrentStep((step) => step + 1)
      return
    }

    saveBulkUploadAttempt({
      moduleName: 'Customers',
      fileName: selectedFile?.name || '-',
      rowCount: records.length,
    })
    alert(`${records.length} customer records verified for upload.`)
    navigate('/admin/bulk-uploads')
  }

  const handleMappingChange = (fieldKey, sourceColumn) => {
    setMappings((current) => ({ ...current, [fieldKey]: sourceColumn }))
  }

  const renderStepContent = () => {
    if (currentStep === 0) {
      return (
        <div className="bulk-customers-form">
          <div className="bulk-customers-form-row">
            <label className="bulk-customers-label" htmlFor="bulk-customers-file-input">
              Select data source file(CSV Format):
            </label>

            <div className="bulk-customers-file-picker">
              <div className="bulk-customers-file-display">
                {selectedFile ? selectedFile.name : ''}
              </div>

              <label className="bulk-customers-file-button" htmlFor="bulk-customers-file-input">
                Choose file
              </label>

              <input
                id="bulk-customers-file-input"
                type="file"
                accept=".csv,.xlsx,.xls"
                onChange={handleFileChange}
                className="bulk-customers-file-input"
              />
            </div>
          </div>

          <div className="bulk-customers-form-row">
            <span className="bulk-customers-label">Check Duplicate On:</span>

            <div className="bulk-customers-duplicate-options">
              <label className="bulk-customers-checkbox-line">
                <input
                  type="checkbox"
                  checked={duplicateConfig.checkPhone}
                  onChange={() => handleDuplicateToggle('checkPhone')}
                  className="bulk-customers-checkbox"
                />
                <span>If Phone exist</span>
              </label>

              <span className="bulk-customers-or">(OR)</span>

              <label className="bulk-customers-checkbox-line">
                <input
                  type="checkbox"
                  checked={duplicateConfig.checkEmail}
                  onChange={() => handleDuplicateToggle('checkEmail')}
                  className="bulk-customers-checkbox"
                />
                <span>If Email exist</span>
              </label>
            </div>
          </div>

          <div className="bulk-customers-form-row">
            <label className="bulk-customers-label" htmlFor="bulk-customers-duplicate-action">
              Duplicate check action:
            </label>

            <select
              id="bulk-customers-duplicate-action"
              value={duplicateConfig.action}
              onChange={handleDuplicateActionChange}
              className="bulk-customers-select"
            >
              {DUPLICATE_ACTIONS.map((option) => (
                <option key={option.value || 'empty'} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>
        </div>
      )
    }

    if (currentStep === 1) {
      return (
        <BulkUploadReviewPanel
          headers={headers}
          records={records}
          fields={CUSTOMER_FIELDS}
          mappings={mappings}
          onMappingChange={handleMappingChange}
        />
      )
    }

    return (
      <BulkUploadReviewPanel
        type="preview"
        headers={headers}
        records={records}
        fields={CUSTOMER_FIELDS}
        mappings={mappings}
        onMappingChange={handleMappingChange}
      />
    )
  }

  const isLastStep = currentStep === STEPS.length - 1
  const primaryDisabled = currentStep === 0 ? !canProceedFromStepOne : false

  return (
    <div className="bulk-customers-page">
      <div className="bulk-customers-header">
        <div className="bulk-customers-header-row">
          <h1 className="bulk-customers-title">Customers - Bulk Upload</h1>
          <a href="#help" className="bulk-customers-help-link">
          </a>
        </div>
      </div>

      <div className="bulk-customers-shell">
        <div className="bulk-customers-card">
          <div className="bulk-customers-stepper">
            {STEPS.map((step, index) => {
              const isActive = index === currentStep
              const isCompleted = index < currentStep

              return (
                <div key={step.id} className="bulk-customers-step-item">
                  <div className="bulk-customers-step-top">
                    <span
                      className={[
                        'bulk-customers-step-number',
                        isActive ? 'bulk-customers-step-number--active' : '',
                        isCompleted ? 'bulk-customers-step-number--completed' : '',
                      ].join(' ').trim()}
                    >
                      {index + 1}
                    </span>

                    <span
                      className={[
                        'bulk-customers-step-label',
                        isActive ? 'bulk-customers-step-label--active' : '',
                        isCompleted ? 'bulk-customers-step-label--completed' : '',
                      ].join(' ').trim()}
                    >
                      {index < STEPS.length - 1 ? `-> ${step.label}` : step.label}
                    </span>
                  </div>
                </div>
              )
            })}
          </div>

          <div className="bulk-customers-divider" />

          <div className="bulk-customers-content">
            {renderStepContent()}
          </div>

          <div className="bulk-customers-footer">
            <button
              type="button"
              className="bulk-customers-btn bulk-customers-btn--cancel"
              onClick={handleCancel}
            >
              Cancel
            </button>

            <div className="bulk-customers-footer-actions">
              {currentStep > 0 ? (
                <button
                  type="button"
                  className="bulk-customers-btn bulk-customers-btn--secondary"
                  onClick={handlePrevious}
                >
                  Previous
                </button>
              ) : null}

              <button
                type="button"
                className="bulk-customers-btn bulk-customers-btn--primary"
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

export default BulkUploadCustomersPage
