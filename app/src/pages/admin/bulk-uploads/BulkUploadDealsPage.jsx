import React, { useState } from 'react'
import { FaInfoCircle } from 'react-icons/fa'
import { useNavigate } from 'react-router-dom'
import BulkUploadReviewPanel from './BulkUploadReviewPanel'
import { buildDefaultMapping, readBulkUploadFile, saveBulkUploadAttempt } from './bulkUploadWorkflow'
import './BulkUploadDealsPage.css'

const STEPS = [
  { id: 'choose-file', label: 'Choose Data File' },
  { id: 'select-fields', label: 'Select Fields' },
  { id: 'verify', label: 'Verify' },
]

const DEAL_FIELDS = [
  { key: 'dealNumber', label: 'Deal No.' },
  { key: 'dealName', label: 'Deal Name', required: true },
  { key: 'customerName', label: 'Customer Name' },
  { key: 'dealOwner', label: 'Deal Owner' },
  { key: 'dealType', label: 'Deal Type' },
  { key: 'dealStatus', label: 'Deal Status' },
  { key: 'dealValue', label: 'Deal Value' },
  { key: 'projectName', label: 'Project Name' },
]

const BulkUploadDealsPage = () => {
  const navigate = useNavigate()
  const [currentStep, setCurrentStep] = useState(0)
  const [selectedFile, setSelectedFile] = useState(null)
  const [autofillFromCustomer, setAutofillFromCustomer] = useState(false)
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

  const handlePrevious = () => {
    if (currentStep > 0) {
      setCurrentStep((step) => step - 1)
    }
  }

  const handlePrimaryAction = async () => {
    if (currentStep === 0 && !selectedFile) {
      return
    }

    if (currentStep === 0) {
      const parsed = await readBulkUploadFile(selectedFile)
      setHeaders(parsed.headers)
      setRecords(parsed.records)
      setMappings(buildDefaultMapping(parsed.headers, DEAL_FIELDS))
    }

    if (currentStep < STEPS.length - 1) {
      setCurrentStep((step) => step + 1)
      return
    }

    saveBulkUploadAttempt({
      moduleName: 'Deals',
      fileName: selectedFile?.name || '-',
      rowCount: records.length,
    })
    alert(`${records.length} deal records verified for upload.`)
    navigate('/admin/bulk-uploads')
  }

  const handleMappingChange = (fieldKey, sourceColumn) => {
    setMappings((current) => ({ ...current, [fieldKey]: sourceColumn }))
  }

  const renderStepContent = () => {
    if (currentStep === 0) {
      return (
        <div className="bulk-deals-form">
          <div className="bulk-deals-form-row">
            <label className="bulk-deals-label" htmlFor="bulk-deals-file-input">
              Select data source file(CSV Format):
            </label>

            <div className="bulk-deals-file-picker">
              <div className="bulk-deals-file-display">
                {selectedFile ? selectedFile.name : ''}
              </div>

              <label className="bulk-deals-file-button" htmlFor="bulk-deals-file-input">
                Choose file
              </label>

              <input
                id="bulk-deals-file-input"
                type="file"
                accept=".csv,.xlsx,.xls"
                onChange={handleFileChange}
                className="bulk-deals-file-input"
              />
            </div>
          </div>

          <div className="bulk-deals-form-row">
            <span className="bulk-deals-label">Check Uniqueness for:</span>
            <span className="bulk-deals-uniqueness-value">Deal Name</span>
          </div>

          <div className="bulk-deals-checkbox-row">
            <label className="bulk-deals-checkbox-label">
              <input
                type="checkbox"
                checked={autofillFromCustomer}
                onChange={() => setAutofillFromCustomer((value) => !value)}
                className="bulk-deals-checkbox"
              />
              <span>Autofill Deal fields mapped from Customer?</span>
            </label>
            <FaInfoCircle className="bulk-deals-info-icon" />
          </div>
        </div>
      )
    }

    if (currentStep === 1) {
      return (
        <BulkUploadReviewPanel
          headers={headers}
          records={records}
          fields={DEAL_FIELDS}
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
        fields={DEAL_FIELDS}
        mappings={mappings}
        onMappingChange={handleMappingChange}
      />
    )
  }

  const isLastStep = currentStep === STEPS.length - 1

  return (
    <div className="bulk-deals-page">
      <div className="bulk-deals-header">
        <h1 className="bulk-deals-title">Deals - Bulk Upload</h1>
      </div>

      <div className="bulk-deals-shell">
        <div className="bulk-deals-card">
          <div className="bulk-deals-stepper">
            {STEPS.map((step, index) => {
              const isActive = index === currentStep
              const isCompleted = index < currentStep

              return (
                <div key={step.id} className="bulk-deals-step-item">
                  <div className="bulk-deals-step-top">
                    <span
                      className={[
                        'bulk-deals-step-number',
                        isActive ? 'bulk-deals-step-number--active' : '',
                        isCompleted ? 'bulk-deals-step-number--completed' : '',
                      ].join(' ').trim()}
                    >
                      {index + 1}
                    </span>

                    <span
                      className={[
                        'bulk-deals-step-label',
                        isActive ? 'bulk-deals-step-label--active' : '',
                        isCompleted ? 'bulk-deals-step-label--completed' : '',
                      ].join(' ').trim()}
                    >
                      {index < STEPS.length - 1 ? `-> ${step.label}` : step.label}
                    </span>
                  </div>
                </div>
              )
            })}
          </div>

          <div className="bulk-deals-divider" />

          <div className="bulk-deals-content">
            {renderStepContent()}
          </div>

          <div className="bulk-deals-footer">
            <button
              type="button"
              className="bulk-deals-btn bulk-deals-btn--cancel"
              onClick={handleCancel}
            >
              Cancel
            </button>

            <div className="bulk-deals-footer-actions">
              {currentStep > 0 ? (
                <button
                  type="button"
                  className="bulk-deals-btn bulk-deals-btn--secondary"
                  onClick={handlePrevious}
                >
                  Previous
                </button>
              ) : null}

              <button
                type="button"
                className="bulk-deals-btn bulk-deals-btn--primary"
                onClick={handlePrimaryAction}
                disabled={currentStep === 0 && !selectedFile}
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

export default BulkUploadDealsPage
