import React, { useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useData } from '../../../context/DataContext'
import { buildAdminAccountsBoardUrl, getAdminAccountsBoardViewByQuery } from '../../../features/adminAccounts/config/accountBoardViews'
import { buildAdminCustomViewUrl, getAdminCustomViewById } from '../../../features/adminAccounts/customViews/customViewStorage'
import { BULK_UPLOAD_CUSTOMER_STEPS } from '../../../features/adminCustomers/bulkUpload/constants'
import Button from '../../../components/common/Button'
import WizardStepper from '../../../components/accounts/WizardStepper'
import ChooseDataFileStep from './steps/ChooseDataFileStep'
import SelectFieldsStep from './steps/SelectFieldsStep'
import VerifyStep from './steps/VerifyStep'
import './BulkUploadCustomersPage.css'

const BulkUploadCustomersPage = () => {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const { accounts } = useData()

  const [currentStep, setCurrentStep] = useState(0)
  const [selectedFile, setSelectedFile] = useState(null)
  const [mappings, setMappings] = useState({})
  const [duplicateConfig, setDuplicateConfig] = useState({
    checkPhone: false,
    checkEmail: false,
    action: '',
  })
  const [error, setError] = useState(null)
  const [isProcessing, setIsProcessing] = useState(false)

  // Get navigation context
  const view = getAdminAccountsBoardViewByQuery(searchParams.get('view'))
  const customViewId = searchParams.get('customViewId')
  const customView = customViewId ? getAdminCustomViewById(customViewId) : null
  const stage = searchParams.get('stage') || ''
  const page = searchParams.get('page') || ''
  const group = searchParams.get('group') || ''

  // Build return URL
  const buildReturnUrl = () => {
    // For customers, return to a generic customers page
    // Adjust this based on your actual customer routes
    return '/admin/customers'
  }

  const handleFileSelected = (fileData) => {
    setSelectedFile(fileData)
    setMappings({})
    setCurrentStep(1)
  }

  const handleMappingsChange = (newMappings) => {
    setMappings(newMappings)
  }

  const handleDuplicateConfigChange = (newConfig) => {
    setDuplicateConfig(newConfig)
  }

  const handleStepChange = (stepIndex) => {
    if (stepIndex < currentStep) {
      setCurrentStep(stepIndex)
      setError(null)
      return
    }

    if (currentStep === 0) {
      // Validate file selected and duplicate config
      if (!selectedFile) {
        setError('Please select a file')
        return
      }
      if (!duplicateConfig.checkPhone && !duplicateConfig.checkEmail) {
        setError('Please select at least one duplicate check method')
        return
      }
      if (!duplicateConfig.action) {
        setError('Please select a duplicate check action')
        return
      }
    }

    if (currentStep === 1 && Object.keys(mappings).length === 0) {
      setError('Please map at least one field')
      return
    }

    setCurrentStep(stepIndex)
    setError(null)
  }

  const handleNext = () => {
    if (currentStep < BULK_UPLOAD_CUSTOMER_STEPS.length - 1) {
      handleStepChange(currentStep + 1)
    }
  }

  const handlePrevious = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1)
      setError(null)
    }
  }

  const handleConfirm = async () => {
    if (!selectedFile || !Object.keys(mappings).length) {
      setError('Please complete all steps')
      return
    }

    setIsProcessing(true)
    try {
      // TODO: Implement actual file upload/processing
      await new Promise((resolve) => setTimeout(resolve, 500))
      navigate(buildReturnUrl())
    } catch (err) {
      setError(err.message || 'Failed to upload data')
    } finally {
      setIsProcessing(false)
    }
  }

  const canProceed = () => {
    if (currentStep === 0) {
      return (
        !!selectedFile &&
        (duplicateConfig.checkPhone || duplicateConfig.checkEmail) &&
        duplicateConfig.action
      )
    }
    if (currentStep === 1) return Object.keys(mappings).length > 0
    return true
  }

  const isLastStep = currentStep === BULK_UPLOAD_CUSTOMER_STEPS.length - 1

  return (
    <div className="bulk-upload-page bulk-upload-page-customers">
      <div className="bulk-upload-container">
        <div className="bulk-upload-header">
          <div className="bulk-upload-header-top">
            <h1 className="bulk-upload-title">Customers - Bulk Upload</h1>
            <a href="#" className="bulk-upload-help-link">
            </a>
          </div>
          <p className="bulk-upload-subtitle">
            Upload multiple customer records from a CSV file with field mapping and duplicate
            detection
          </p>
        </div>

        <div className="bulk-upload-stepper-container">
          <WizardStepper
            steps={BULK_UPLOAD_CUSTOMER_STEPS}
            currentStep={currentStep}
            onStepChange={handleStepChange}
          />
        </div>

        <div className="bulk-upload-content">
          {currentStep === 0 && (
            <ChooseDataFileStep
              onFileSelected={handleFileSelected}
              selectedFile={selectedFile}
              duplicateConfig={duplicateConfig}
              onDuplicateConfigChange={handleDuplicateConfigChange}
              error={error}
              setError={setError}
            />
          )}

          {currentStep === 1 && selectedFile && (
            <SelectFieldsStep
              csvHeaders={selectedFile.headers}
              onMappingsChange={handleMappingsChange}
              initialMappings={mappings}
              error={error}
              setError={setError}
            />
          )}

          {currentStep === 2 && selectedFile && (
            <VerifyStep
              records={selectedFile.records}
              headers={selectedFile.headers}
              mappings={mappings}
              fileName={selectedFile.fileName}
              duplicateConfig={duplicateConfig}
              error={error}
              setError={setError}
            />
          )}
        </div>

        <div className="bulk-upload-actions">
          <Button onClick={() => navigate(buildReturnUrl())} className="bulk-upload-btn-cancel">
            Cancel
          </Button>

          <div className="bulk-upload-actions-right">
            {currentStep > 0 && (
              <Button onClick={handlePrevious} className="bulk-upload-btn-secondary">
                Previous
              </Button>
            )}

            {!isLastStep && (
              <Button
                onClick={handleNext}
                disabled={!canProceed() || isProcessing}
                className="bulk-upload-btn-primary"
              >
                Next
              </Button>
            )}

            {isLastStep && (
              <Button
                onClick={handleConfirm}
                disabled={!canProceed() || isProcessing}
                className="bulk-upload-btn-primary"
              >
                {isProcessing ? 'Uploading...' : 'Upload'}
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

export default BulkUploadCustomersPage
