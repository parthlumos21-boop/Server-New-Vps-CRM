import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import BulkUploadReviewPanel from './BulkUploadReviewPanel'
import { buildDefaultMapping, readBulkUploadFile, saveBulkUploadAttempt } from './bulkUploadWorkflow'
import './BulkUploadProductsPage.css'

const STEPS = [
  { id: 'choose-file', label: 'Choose Data File' },
  { id: 'select-fields', label: 'Select Fields' },
  { id: 'verify', label: 'Verify' },
]

const PRODUCT_FIELDS = [
  { key: 'productId', label: 'Product ID', required: true },
  { key: 'productName', label: 'Product Name', required: true },
  { key: 'category', label: 'Category' },
  { key: 'brand', label: 'Brand' },
  { key: 'unit', label: 'Unit' },
  { key: 'price', label: 'Price' },
  { key: 'status', label: 'Status' },
]

const BulkUploadProductsPage = () => {
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
      setMappings(buildDefaultMapping(parsed.headers, PRODUCT_FIELDS))
    }

    if (currentStep < STEPS.length - 1) {
      setCurrentStep((step) => step + 1)
      return
    }

    saveBulkUploadAttempt({
      moduleName: 'Products',
      fileName: selectedFile?.name || '-',
      rowCount: records.length,
    })
    alert(`${records.length} product records verified for upload.`)
    navigate('/admin/bulk-uploads')
  }

  const handleMappingChange = (fieldKey, sourceColumn) => {
    setMappings((current) => ({ ...current, [fieldKey]: sourceColumn }))
  }

  const renderStepContent = () => {
    if (currentStep === 0) {
      return (
        <div className="bulk-products-form">
          <div className="bulk-products-form-row">
            <label className="bulk-products-label" htmlFor="bulk-products-file-input">
              Select data source file(CSV Format):
            </label>

            <div className="bulk-products-file-picker">
              <div className="bulk-products-file-display">
                {selectedFile ? selectedFile.name : ''}
              </div>

              <label className="bulk-products-file-button" htmlFor="bulk-products-file-input">
                Choose file
              </label>

              <input
                id="bulk-products-file-input"
                type="file"
                accept=".csv,.xlsx,.xls"
                onChange={handleFileChange}
                className="bulk-products-file-input"
              />
            </div>
          </div>

          <div className="bulk-products-form-row">
            <span className="bulk-products-label">Check Uniqueness for:</span>
            <span className="bulk-products-uniqueness-value">Product ID</span>
          </div>
        </div>
      )
    }

    if (currentStep === 1) {
      return (
        <BulkUploadReviewPanel
          headers={headers}
          records={records}
          fields={PRODUCT_FIELDS}
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
        fields={PRODUCT_FIELDS}
        mappings={mappings}
        onMappingChange={handleMappingChange}
      />
    )
  }

  const isLastStep = currentStep === STEPS.length - 1

  return (
    <div className="bulk-products-page">
      <div className="bulk-products-header">
        <h1 className="bulk-products-title">Products - Bulk Upload</h1>
      </div>

      <div className="bulk-products-shell">
        <div className="bulk-products-card">
          <div className="bulk-products-stepper">
            {STEPS.map((step, index) => {
              const isActive = index === currentStep
              const isCompleted = index < currentStep

              return (
                <div key={step.id} className="bulk-products-step-item">
                  <div className="bulk-products-step-top">
                    <span
                      className={[
                        'bulk-products-step-number',
                        isActive ? 'bulk-products-step-number--active' : '',
                        isCompleted ? 'bulk-products-step-number--completed' : '',
                      ].join(' ').trim()}
                    >
                      {index + 1}
                    </span>

                    <span
                      className={[
                        'bulk-products-step-label',
                        isActive ? 'bulk-products-step-label--active' : '',
                        isCompleted ? 'bulk-products-step-label--completed' : '',
                      ].join(' ').trim()}
                    >
                      {index < STEPS.length - 1 ? `-> ${step.label}` : step.label}
                    </span>
                  </div>
                </div>
              )
            })}
          </div>

          <div className="bulk-products-divider" />

          <div className="bulk-products-content">
            {renderStepContent()}
          </div>

          <div className="bulk-products-footer">
            <button
              type="button"
              className="bulk-products-btn bulk-products-btn--cancel"
              onClick={handleCancel}
            >
              Cancel
            </button>

            <div className="bulk-products-footer-actions">
              {currentStep > 0 ? (
                <button
                  type="button"
                  className="bulk-products-btn bulk-products-btn--secondary"
                  onClick={handlePrevious}
                >
                  Previous
                </button>
              ) : null}

              <button
                type="button"
                className="bulk-products-btn bulk-products-btn--primary"
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

export default BulkUploadProductsPage
